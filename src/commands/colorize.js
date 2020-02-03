const { findUser, hex2rgb } = require("../util");
const logger = require("../logger");
const { createCanvas, loadImage } = require("canvas");

module.exports = class ColorizeCommand {
    constructor(client) {
        Object.assign(this, {
            name: "colorize",
            aliases: ["col", "color"],
            group: "Манипуляции с изображениями",
            description: "Приводит аватар или изображение к указаному цвету." +
						 "\nПараметры url и user взаимоисключающие. Все параметры разделяются запятой." +
						 "\nПример команды: `:M: colorize Miyuko Nonoe, magenta",
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
                    key: "color",
                    prompt: "Цвет в формате #639, #663399 или RebeccaPurple",
                    type: "string"
                }
            ],
            client
        });
    }

    async run(msg, user, color) {
        try {
            const userMember = msg.guild.members.get(user.userID);
            if (!userMember) return msg.channel.send("Пользователя нет на сервере");
            const avatarURL = userMember.user.displayAvatarURL;
            const avatar = await loadImage(avatarURL);
            const canvas = createCanvas(300, 300);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(avatar, 0, 0, 300, 300);
            const imageData = ctx.getImageData(0, 0, 300, 300);
            for (let i = 0; i < 300; i++) {
                for (let j = 0; j < 300; j++) {
                    const index = (i + j * imageData.width) * 4;
                    imageData.data[index] *= color[0]/255;
                    imageData.data[index + 1] *= color[1]/255;
                    imageData.data[index + 2] *= color[2]/255;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            await msg.channel.send({file: canvas.toBuffer()});
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }

    async runLink(msg, url, color) {
        try {
            const img = await loadImage(url);
            const canvas = createCanvas(300, 300);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, 300, 300);
            const imageData = ctx.getImageData(0, 0, 300, 300);
            for (let i = 0; i < 300; i++) {
                for (let j = 0; j < 300; j++) {
                    const index = (i + j * imageData.width) * 4;
                    imageData.data[index] *= color[0]/255;
                    imageData.data[index + 1] *= color[1]/255;
                    imageData.data[index + 2] *= color[2]/255;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            await msg.channel.send({file: canvas.toBuffer()});
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            try {
                const user = await findUser(this.client, url);
                if (!user) {
                    msg.channel.send("Не удалось обработать указанное изображение и не был установлен пользователь с указанным ником.");
                    return logger.error("Не удалось обработать команду", err);
                }
                this.run(msg, user, color);
            } catch (err2) {
                msg.channel.send("Во время обработки вашей команды произошла ошибка.");
                logger.error("Произошла ошибка", err2);
            }
        }
    }

    async parseParam(msg, param) {
        try {
            param = param.replace(/<|>/g, "").split(/,\s?/);
            if (param.length == 1) {
                if (param[0] == "") return msg.channel.send("Вы должны указать цвет.");
                param.unshift(this.args[1].default(msg));
            }
            param[1] = param[1].toLowerCase();
            if (param[0].indexOf("http") == 0) return this.runLink(msg, encodeURI(param[0]), hex2rgb(param[1]));
            const user = await findUser(this.client, param[0]);
            if (!user) return msg.channel.send("Пользователь не найден, либо найдено несколько пользователей.");
            this.run(msg, user, hex2rgb(param[1]));
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка. Проверьте правильность параметров и наличие запятых.");
            logger.error("Произошла ошибка", err);
        }
    }
};
