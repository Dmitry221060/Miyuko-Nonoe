const config = require("../../config.json");
const logger = require("../logger");

module.exports = class ClearCommand {
    constructor(client) {
        Object.assign(this, {
            name: 'clear',
            group: 'Служебные',
            description: 'Удаляет сообщения',
            allowedChannels: ['368410234110345226', '351749515885412352', '326386008709005313'],
            allowedUsers: ['247221210436468736'],
            args: [
                {
                    key: 'count',
                    prompt: 'Количество сообщений для удаления. Может быть любым целым числом от 1 до 2000',
                    type: 'number',
                    default: 1
                }
            ],
            client
        });
    }
    
    async run(msg, count) {
        try {
            const Discord = require('discord.js');
            const bot = new Discord.Client(); 
            await bot.login(config.botToken);
            let deletedMessagesCount = 0;
            while (count > 0) {
                const forDel = count > 100 ? 100 : count;
                const data = await bot.channels.get(msg.channel.id).bulkDelete(forDel, true)
                deletedMessagesCount += data.size;
                count -= forDel;
            }
            await bot.channels.get(msg.channel.id).send(deletedMessagesCount + " сообщений было удалено");
            await bot.destroy();
            logger.debug('Команда была успешно обработана');
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async parseParam(msg) {
        try {
            let param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '');
            if (!param) param = this.args[0].default;
            if (isNaN(parseFloat(param)) || !isFinite(param) || param % 1 !== 0 || param <= 0 || param > 2000) return msg.channel.send("Невалидный параметр");
            this.run(msg, param);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
}
