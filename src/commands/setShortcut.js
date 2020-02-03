const ytdl = require("ytdl-core-discord");
const ytpl = require("ytpl");
const { findUser, escape, parseShortcutEntries } = require("../util");
const logger = require("../logger");

module.exports = class SetShortcutCommand {
    constructor(client) {
        Object.assign(this, {
            name: "setshortcut",
            aliases: ["setsc", "ssc", "addshortcut", "addsc", "asc"],
            group: "Данные",
            description: "Создаёт список из видео, который в дальнейшем можно ставить на проигрывание при помощи :M: play %shortcutName%\n" +
						 "Пример команды: ```:M: ssc рандомныеВидео,\n" +
						 "<https://www.youtube.com/watch?v=yPYZpwSpKmA>\n" +
						 "dQw4w9WgXcQ,\n" +
						 "https://www.youtube.com/watch?v=MEEVGqvvXbI someShortcutName\n" +
						 "https://www.youtube.com/playlist?list=PLe_T7W4345O81TGD3Pf_u-75z673d3w6u" +
						 "```",
            args: [
                {
                    key: "name",
                    prompt: "Название шортката используемое для его дальнейшего вызова. Может содержать любое количество любых символов, " +
							"но должно содержать минимум 1 символ и всегда быть отделено запятой. Не может содержать \"http\" чтобы сэкономить " +
							"ваше время и нервы, если вы забыли указать название.\n:warning: Хотя шорткаты из нескольких слов реализованы, они " +
							"имеют статус deprecated. Поддержка подобных шорткатов осуществляться не будет и в будущем они могут быть удалены.",
                    type: "string"
                },
                {
                    key: "entries",
                    prompt: "Набор id/шорткатов/ссылок на видео/плейлисты, разделённых запятой, пробелом или переводом строки(в любой их комбинации).",
                    type: "string[]"
                }
            ],
            client
        });
    }

    async run(msg, name, entries) {
        try {
            await this.client.db.collection("users").updateOne({ userID: msg.author.id }, { $set: { ["shortcuts." + name]: entries } });
            msg.channel.send("Успешно создан шорткат " + name + " содержащий " + entries.length + " видео.");
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            const commaIndex = param.indexOf(",");
            const name = escape(param.substring(0, commaIndex), true);
            if (!name) return msg.channel.send("Не удалось распознать название шортката, скорее всего вы пропустили запятую.");
            if (name.indexOf("http") + 1) return msg.channel.send("В названии шортката используется http. Скорее всего вы забыли его указать или пропустили запятую. Попробуйте ещё раз :*");
            const urls = param.substring(commaIndex).replace(/,\s?|\s/g, "\n").split(/\n/).filter(Boolean);
            if (!urls.length) return msg.channel.send("Вы не указали ни одной ссылки");
            const user = await findUser(this.client, msg.author.id);
            if (!user) return msg.channel.send("Не удалось найти вас в базе данных.");
            const entries = await parseShortcutEntries(ytpl, ytdl, user, urls);
            if (!Array.isArray(entries)) return msg.channel.send("Значение " + entries + " не является корректной ссылкой на видео/плейлист, шорткатом или id.");
            if (entries.length >= this.client.config.bot.maxShortcutSize) await msg.reply("Я многое могу понять, но зачем нужен плейлист на " + entries.length + " видео - мне не понятно. Размер был обрезан до " + this.client.config.bot.maxShortcutSize + ", надеюсь это не сильно огорчит вас.");
            entries.splice(this.client.config.bot.maxShortcutSize);
            this.run(msg, name, entries);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }
};
