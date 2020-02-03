const { findUser, removePings, randomOf } = require("../util");
const logger = require("../logger");

module.exports = class ImitateComand {
    constructor(client) {
        Object.assign(this, {
            name: "imitate",
            aliases: ["im", "i"],
            group: "Рандом",
            description: "Составляет предложение из случайных сообщений пользователя.",
            args: [
                {
                    key: "user",
                    prompt: "Пользователь, которого нужно имитировать",
                    type: "user",
                    optional: true,
                    default: msg => msg.author.id
                }
            ],
            client,
            wordPairs: 3 //Количество словосочетаний в имитейте
        });
    }

    async run(msg, user) {
        try {
            const data = await this.client.db.collection("logs").aggregate([
                { "$match": { "userID": user.userID, "content": { "$regex" : /[0-9a-zа-я]/, "$options": "gi" } } },
                { "$sample": { "size": this.wordPairs } }
            ]).toArray();
            if (data.length < this.wordPairs) {
                await msg.channel.send("У запрошенного пользователя недостаточно сообщений, для генерации фразы (Минимум - " + this.wordPairs + ")");
                return logger.debug("Запрошенный пользователь не имел достаточное количество сообщений");
            }
            let result = "";
            for (let i = 0; i < data.length; i++) {
                data[i].content = data[i].content.replace(/\\\*|\*|`+|~{2,}|_{2,}/g, "").replace(/\s?\n\s?/g, " "); //Вырезать лишние символы и убрать переводы строки
                const wordPair = data[i].content.split(/(\S+\s\S+)\s/).filter(Boolean); //Разбить сообщение по двум словам
                result += randomOf(wordPair) + " ";
            }
            await msg.channel.send(removePings(result) + " - *" + user.userLogin + "*");
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            if (!param) param = this.args[0].default(msg);
            const user = await findUser(this.client, param);
            if (!user) return msg.channel.send("Пользователь не найден, либо найдено несколько пользователей.");
            this.run(msg, user);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
};
