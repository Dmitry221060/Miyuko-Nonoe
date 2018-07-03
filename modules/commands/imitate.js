const { findUser, removePings } = require('../util');
const logger = require("../logger");

module.exports = class ImitateComand {
    constructor(client) {
        Object.assign(this, {
            name: 'imitate',
            group: 'Рандом',
            description: 'Составляет предложение из случайных сообщений пользователя.',
            allowedChannels: ['368410234110345226'],
            args: [
                {
                    key: 'user',
                    prompt: 'Пользователь, которого нужно имитировать',
                    type: 'user',
                    default: msg => msg.author.id
                }
            ],
            client
        });
    }
    
    async run(msg, user) {
        try {
            if (!user) return msg.channel.send('Пользователь не найден.');
            const data = await this.client.db.collection('logs').aggregate([
                { "$match": { "userID": user.userID, "content": { "$regex" : /[0-9a-zA-Zа-яА-Я]/, "$options": "g" } } }, 
                { "$sample": { "size": 3 } }
            ]).toArray();
            if (!data.length) {
                await msg.channel.send("Не найдено сообщений от запрошенного пользователя");
                return logger.debug('Запрошенный пользователь не имел достаточное количество сообщений');
            }
            if (data.length < 3) {
                await msg.channel.send("У запрошенного пользователя недостаточно сообщений, для генерации фразы (Минимум - три сообщения в #chat)");
                return logger.debug('Запрошенный пользователь не имел достаточное количество сообщений');
            }
            let words = [];
            for (let i = 0; i < 3; i++) {
                data[i].content = data[i].content.replace(/\\\*|\*|`+|~{2,}|_{2,}/g, '').replace(/\s{2,}/g, ' '); //Вырезать лишние символы и убрать двойные пробелы
                words[i] = data[i].content.replace(/(.*?\s.*?)\s/g, "$1{SPLITMEPLS}").split("{SPLITMEPLS}"); //Разбить сообщение по двум словам
            }
            let endText = words[0][Math.floor(Math.random() * words[0].length)] + ' ' + 
                          words[1][Math.floor(Math.random() * words[1].length)] + ' ' + 
                          words[2][Math.floor(Math.random() * words[2].length)];
            await msg.channel.send(removePings(endText) + " - *" + (user.userName || user.userLogin) + '*');
            logger.debug('Команда была успешно обработана');
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async parseParam(msg) {
        try {
            let param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '');
            if (!param) param = this.args[0].default(msg);
            const user = await findUser(this.client, param);
            this.run(msg, user);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
}
