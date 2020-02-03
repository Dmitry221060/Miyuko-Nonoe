const { findUser, isSelf, twoNum } = require("../util");
const logger = require("../logger");

module.exports = class InfoCommand {
    constructor(client) {
        Object.assign(this, {
            name: "info",
            aliases: ["userinfo", "in", "ui"],
            group: "Информация",
            description: "Выдаёт информацию о пользователе",
            args: [
                {
                    key: "user",
                    prompt: "Пользователь, о котором нужно выдать информацию",
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
            const joinDate = new Date(msg.guild.members.get(user.userID).joinedTimestamp);
            await msg.channel.send({embed: {
                color: 0x369531,
                thumbnail: {
                    url: msg.guild.members.get(user.userID).user.displayAvatarURL
                },
                fields: [{
                    name: "Предупреждений за спам:",
                    value: user.spamCount,
                    inline: true
                }, {
                    name: "ID",
                    value: user.userID,
                    inline: true
                }, {
                    name: "На сервере с",
                    value: twoNum(joinDate.getDate()) + "." + twoNum(joinDate.getMonth()+1) + "." + joinDate.getFullYear() +
                           "(" + Math.floor((Date.now() - joinDate)/24/60/60/1000) + " дней назад)",
                    inline: true
                }, {
                    name: "Шорткаты:",
                    value: Object.keys(user.shortcuts).join(", ") || "*Отсутствуют*"
                }]
            }});
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            if (!param) param = this.args[0].default(msg);
            if (isSelf(this.client, param)) return this.botInfo(msg);
            const user = await findUser(this.client, param);
            if (!user) return msg.channel.send("Пользователь не найден, либо найдено несколько пользователей.");
            this.run(msg, user);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }

    async botInfo(msg) {
        try {
            const joinDate = new Date(msg.guild.members.get(this.client.user.id).joinedTimestamp);
            const uptime = new Date(this.client.uptime);
            const hours = Math.floor(uptime/1000/60/60);
            const minutes = uptime.getMinutes();
            const seconds = uptime.getSeconds();
            await msg.channel.send({embed: {
                color: 0x369531,
                thumbnail: {
                    url: this.client.user.displayAvatarURL
                },
                fields: [{
                    name: "ID",
                    value: this.client.user.id,
                    inline: true
                }, {
                    name: "На сервере с",
                    value: twoNum(joinDate.getDate()) + "." + twoNum(joinDate.getMonth()+1) + "." + joinDate.getFullYear() +
                           "(" + Math.floor((Date.now() - joinDate)/24/60/60/1000) + " дней назад)",
                    inline: true
                }, {
                    name: "Продолжительность сеанса:",
                    value: hours + ":" + twoNum(minutes) + ":" + twoNum(seconds),
                    inline: true
                }]
            }});
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
};
