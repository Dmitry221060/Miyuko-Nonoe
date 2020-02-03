const { findUser, escape } = require("../util");
const logger = require("../logger");

module.exports = class UnsetShortcutCommand {
    constructor(client) {
        Object.assign(this, {
            name: "unsetshortcut",
            aliases: ["unsetsc", "usc", "unsc", "ussc", "unssc", "deleteshortcut", "delsc", "dsc"],
            group: "Данные",
            description: "Удаляет существующий шорткат",
            args: [
                {
                    key: "name",
                    prompt: "Название шортката для удаления.",
                    type: "string"
                }
            ],
            client
        });
    }

    async run(msg, name) {
        try {
            await this.client.db.collection("users").updateOne({ userID: msg.author.id }, { $unset: { ["shortcuts." + name]: null } });
            msg.channel.send("Шорткат `" + name + "` был успешно удалён.");
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            param = escape(param, true);
            if (!param) return msg.channel.send("Вы не указали название шортката.");
            const user = await findUser(this.client, msg.author.id);
            if (!user) return msg.channel.send("Не удалось найти вас в базе данных.");
            if (!user.shortcuts[param]) return msg.channel.send("Указанный шорткат не существует.");
            this.run(msg, param);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }
};
