const logger = require("../logger");
const shitposts = require("../../assets/json/shitposts");

module.exports = class ShitpostCommand {
    constructor(client) {
        Object.assign(this, {
            name: 'shitpost',
            aliases: ['shitposting'],
            group: 'Прочее',
            description: 'Выдаёт запрошенный щитпост',
            allowedChannels: ['368410234110345226'],
            args: [
                {
                    key: 'shitpostName', 
                    prompt: 'Название щитпоста', 
                    type: 'string',
                    optional: true
                }
            ],
            client
        });
    }
    
    async run(msg, param) {
        try {
            for (let i = 0; i < shitposts.length; i++) {
                if (shitposts[i][param]) {
                    await msg.channel.send(shitposts[i][param]);
                    return logger.debug('Команда была успешно обработана');
                }
            }
            await msg.channel.send("Запрошенный щитпост не найден");
            logger.debug('Команда была успешно обработана');
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async parseParam(msg) {
        try {
            const param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '').toLowerCase();
            if (!param) return this.shitpostsList(msg);
            this.run(msg, param);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async shitpostsList(msg) {
        try {
            let postfix = [];
            for (let i = 0; i < shitposts.length; i++) {
                postfix.push([]);
                for (const j in shitposts[i]) {
                    postfix[i].push(j); 
                }
            }
            await msg.channel.send({embed: {
                color: 0x1544ef,
                title: "Возможные постфиксы",
                description: "Использование - `<:Plan:334293257850978304> shitpost <postfix>`",
                fields: [{
                    "name": "❯ Картинки",
                    "value": postfix[0].join(", ")
                }, {
                    "name": "❯ Прочее",
                    "value": postfix[1].join(", ")
                }]
            }});
            logger.debug('Команда была обработана успешно');
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
}
