const { findUser } = require("../util");
const logger = require("../logger");

module.exports = class AvatarCommand {
    constructor(client) {
        Object.assign(this, {
            name: "avatar",
            aliases: ["a", "av"],
            group: "Информация",
            description: "Выдаёт ссылку на аватар",
            args: [
                {
                    key: "user",
                    prompt: "Пользователь, аватар которого вы хотите получить",
                    type: "user",
                    optional: true,
                    default: msg => msg.author.id
                }
            ],
            client
        });
    }

    async run(msg, user) {
        try {
            await msg.channel.send(msg.guild.members.get(user.userID).user.displayAvatarURL);
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
