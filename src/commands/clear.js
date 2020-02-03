const { isNumber } = require("../util");
const logger = require("../logger");

module.exports = class ClearCommand {
    constructor(client) {
        Object.assign(this, {
            name: "clear",
            aliases: ["clr", "cl"],
            group: "Служебные",
            description: "Удаляет сообщения в текущем канале",
            allowedChannels: [],
            allowedUsers: [],
            args: [
                {
                    key: "count",
                    prompt: "Количество сообщений для удаления. Может быть любым целым числом от 1 до 2000",
                    type: "number",
                    default: 1
                }
            ],
            client
        });
    }

    async run(msg, count) {
        try {
            let deletedMsgs = 0;
            while (count > deletedMsgs) {
                const data = await msg.channel.bulkDelete(Math.min(count, 100), true);
                if (data.size == 0) break;
                deletedMsgs += data.size;
            }
            await msg.channel.send(deletedMsgs + " сообщений было удалено");
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            if (!param) param = this.args[0].default;
            if (!isNumber(param) || param % 1 != 0 || param < 1 || param > 2000)
                return msg.channel.send("Количество сообщений должно быть целым числом в интервале от 1 до 2000");
            this.run(msg, param);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
};
