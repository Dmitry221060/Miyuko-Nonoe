const { findUser, escape, sendFull } = require("../util");
const logger = require("../logger");

module.exports = class GetShortcutCommand {
    constructor(client) {
        Object.assign(this, {
            name: "getshortcut",
            aliases: ["getsc", "gsc", "infoshortcut", "infosc", "isc", "shortcutinfo", "scinfo", "sci"],
            group: "Данные",
            description: "Выводит информацию о шорткате",
            args: [
                {
                    key: "name",
                    prompt: "Название шортката, информацию о котором нужно выдать",
                    type: "string"
                },
                {
                    key: "complex",
                    prompt: "Дополнительно указать источник видео",
                    type: "bool|number",
                    optional: true,
                    default: false
                }
            ],
            client
        });
    }

    async run(msg, name, complex, user) {
        try {
            let links;
            if (complex) links = user.shortcuts[name].map(e => "<" + e[0] + ">[" + e[2] + "]");
            else links = user.shortcuts[name].map(e => "<" + e[0] + ">");
            await sendFull(this.client, msg.channel.id, links.join("\n"), "\n");
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            param = param.split(", ");
            if (!param.length) return msg.channel.send("Вы не указали название шортката.");
            const name = escape(param[0], true);
            let complex;
            switch (param[1]) {
                case "true":  case "1": complex = true;  break;
                case "false": case "0": complex = false; break;
                case "": case undefined: complex = this.args[1].default; break;
                default: return msg.channel.send("Параметр complex может принимать значение только true|1 или false|0");
            }
            const user = await findUser(this.client, msg.author.id);
            if (!user.shortcuts[name]) return msg.channel.send("Указанный шорткат не существует. Проверьте регистр и не забудьте про запятую, если указываете complex");
            this.run(msg, name, complex, user);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }
};
