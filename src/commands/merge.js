const { findUser, isNumber } = require("../util");
const logger = require("../logger");
const { createCanvas, loadImage } = require("canvas");

module.exports = class MergeCommand {
    constructor(client) {
        Object.assign(this, {
            name: "merge",
            aliases: ["m", "mrg"],
            group: "Манипуляции с изображениями",
            description: "Накладывает на аватар или изображение другое изображение" +
						 "\nПараметры url и user взаимоисключающие. Все параметры разделяются запятой." +
						 "\nПример команды: `:M: merge Miyuko Nonoe, https://www.biospectrumasia.com/uploads/articles/approved_1966719__340-11371.png, 1",
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
                    optional: true,
                    default: msg => msg.author.id
                },
                {
                    key: "url2",
                    prompt: "Ссылка на изображение, которое будет наложено",
                    type: "string"
                },
                {
                    key: "opacity",
                    prompt: "Число от 0 до 1 - прозрачность накладываемой картинки (0.5 по умолчанию)",
                    type: "double",
                    optional: true,
                    default: 0.5
                }
            ],
            client
        });
    }

    async run(msg, user, url2, opacity) {
        try {
            const userMember = msg.guild.members.get(user.userID);
            if (!userMember) return msg.channel.send("Пользователя нет на сервере");
            const avatarURL = userMember.user.displayAvatarURL;
            const avatar = await loadImage(avatarURL);
            const img2 = await loadImage(url2);
            const canvas = createCanvas(300, 300);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(avatar, 0, 0, 300, 300);
            ctx.globalAlpha = opacity;
            ctx.drawImage(img2, 0, 0, 300, 300);
            await msg.channel.send({ file: canvas.toBuffer() });
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }

    async runLink(msg, url, url2, opacity) {
        try {
            const img = await loadImage(url);
            const img2 = await loadImage(url2);
            const canvas = createCanvas(300, 300);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, 300, 300);
            ctx.globalAlpha = opacity;
            ctx.drawImage(img2, 0, 0, 300, 300);
            await msg.channel.send({ file: canvas.toBuffer() });
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            try {
                const user = await findUser(this.client, url);
                if (!user) {
                    msg.channel.send("Не удалось обработать указанное изображение и не был установлен пользователь с указанным ником.");
                    return logger.error("Не удалось обработать команду", err);
                }
                this.run(msg, user, url2, opacity);
            } catch (err2) {
                msg.channel.send("Во время обработки вашей команды произошла ошибка.");
                logger.error("Произошла ошибка", err2);
            }
        }
    }

    async parseParam(msg, param) {
        try {
            param = param.replace(/<|>/g, "").split(/,\s?/);
            if (param.length == 1) { //Если был передан один параметр - это ссылка на накладываемое изображение
                if (param[0] == "") return msg.channel.send("Вы должны указать ссылку на изображение, которое требуется наложить."); //Если параметры не переданы
                param.unshift(this.args[1].default(msg)); //Целью будет пользователь
                param.push(this.args[3].default); //Прозрачность по умолчанию
            } else if (param.length == 2) { //Если два параметра, то это цель и ссылка или ссылка и прозрачность
                if (isNumber(param[1])) param.unshift(this.args[1].default(msg)); //Если второй параметр - прозрачность, цель - пользователь
                else param.push(this.args[3].default); //Если второй параметр не число, то это ссылка
            }
            if (+param[2] < 0 || +param[2] > 1) return msg.channel.send("Прозрачность должна быть в интервале [0;1]");
            if (param[0].indexOf("http") == 0) return this.runLink(msg, encodeURI(param[0]), encodeURI(param[1]), param[2]);
            const user = await findUser(this.client, param[0]);
            if (!user) return msg.channel.send("Пользователь не найден, либо найдено несколько пользователей.");
            this.run(msg, user, encodeURI(param[1]), param[2]);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка. Проверьте правильность параметров и наличие запятых.");
            logger.error("Произошла ошибка", err);
        }
    }
};
