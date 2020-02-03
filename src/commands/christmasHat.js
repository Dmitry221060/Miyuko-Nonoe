const { findUser } = require("../util");
const logger = require("../logger");
const { createCanvas, loadImage } = require("canvas");

module.exports = class ChristmasHatCommand {
    constructor(client) {
        Object.assign(this, {
            name: "christmashat",
            aliases: ["chrhat", "chrmashat", "ch"],
            group: "Манипуляции с изображениями",
            description: "Накладывает на аватар или изображение рождественскую шапку",
            args: [
                {
                    key: "url",
                    prompt: "Ссылка на изображение, которое нужно изменить",
                    type: "string",
                    optional: true
                },
                {
                    key: "user",
                    prompt: "Пользователь, аватар которого нужно изменить",
                    type: "user",
                    default: msg => msg.author.id
                }
            ],
            client,
            months: ["Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь"]
        });
    }

    async run(msg, user) {
        try {
            const userMember = msg.guild.members.get(user.userID);
            if (!userMember) return msg.channel.send("Пользователя нет на сервере");
            const avatarURL = userMember.user.displayAvatarURL;
            const avatar = await loadImage(avatarURL);
            const hat = await loadImage("assets/images/christmasHat.png");
            const canvas = createCanvas(320, 320);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(avatar, 0, 0, 320, 320);
            ctx.drawImage(hat, 0, 0);
            const month = new Date().getMonth() - 1;
            let outOfSeason;
            if (month != -1 && month != 10) outOfSeason = "\nПогоди-ка, сейчас только " + this.months[month] + "!";
            await msg.channel.send("С новым годом! :snowflake:" + outOfSeason, { file: canvas.toBuffer() });
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }

    async runLink(msg, url) {
        try {
            const img = await loadImage(url);
            const hat = await loadImage("assets/images/christmasHat.png");
            const canvas = createCanvas(320, 320);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, 320, 320);
            ctx.drawImage(hat, 0, 0);
            const month = new Date().getMonth() - 1;
            let outOfSeason;
            if (month != -1 && month != 10) outOfSeason = "\nПогоди-ка, сейчас только " + this.months[month] + "!";
            await msg.channel.send("С новым годом! :snowflake:" + outOfSeason, { file: canvas.toBuffer() });
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            try {
                const user = await findUser(this.client, url);
                if (!user) {
                    msg.channel.send("Не удалось обработать указанное изображение и не был установлен пользователь с указанным ником.");
                    return logger.error("Не удалось обработать команду", err);
                }
                this.run(msg, user);
            } catch (err2) {
                msg.channel.send("Во время обработки вашей команды произошла ошибка");
                logger.error("Произошла ошибка", err2);
            }
        }
    }

    async parseParam(msg, param) {
        try {
            param = param.replace(/<|>/g, "");
            if (!param) param = this.args[1].default(msg);
            if (param.indexOf("http") == 0) return this.runLink(msg, param);
            const user = await findUser(this.client, param);
            if (!user) return msg.channel.send("Пользователь не найден, либо найдено несколько пользователей.");
            this.run(msg, user);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
};
