const { removePings } = require("../util");
const logger = require("../logger");

module.exports = class AcronymCommand {
    constructor(client) {
        Object.assign(this, {
            name: "acronym",
            aliases: ["acr", "acron", "ac"],
            group: "Манипуляции с текстом",
            description: "Расшифровывает акроним словами из ваших сообщений",
            args: [
                {
                    key: "acronym",
                    prompt: "Акроним, длинной от 1 до 8 букв или цифр",
                    type: "string"
                }
            ],
            client
        });
    }

    async run(msg, acronym) {
        try {
            let result = "";
            let words = []; //Массив содержащий варианты расшифровки каждой буквы
            for (let i = 0; i < acronym.length; i++) {
                const regex = new RegExp("(^|\\s)" + acronym[i], "i"); //Фильтр для поиска сообщений, содержащих слова на указаную букву
                const data = await this.client.db.collection("logs").aggregate([
                    { "$match": { "userID": msg.author.id, "content": { "$regex": regex } } },
                    { "$sample": { "size": 1 } }
                ]).toArray();
                if (!data.length) {
                    result += " - ";
                    continue;
                }
                /* Фильтр, вырезающий всё, кроме нужных нам слов */
                const regex2 = new RegExp("(^|\\s)(" + acronym[i] + ".*?(\\s|$))|.", "gi");
                words[i] = data[0].content.replace(regex2, "$2").split(/\s/).filter(Boolean); //Находим все варианты расшифровки буквы
                words[i] = words[i][Math.floor(Math.random() * words[i].length)].replace(/[^а-яa-z0-9\-ё#№$%]/gi, ""); //Выбираем один, форматируем его
                result += words[i] + " ";
            }
            result = removePings(result);
            if (/^(-|\s)*$/.test(result)) {
                await msg.channel.send("Не найдено ваших сообщений, со словами из указанного акронима");
                logger.debug("У пользователя недостаточно сообщений, чтобы расшифровать акроним", acronym);
            } else {
                if (result.length > 2000) await msg.reply("Получившийся акроним длиннее 2000 символов. Я могла бы его отправить, но ты ведь это специально.");
                else await msg.channel.send(result);
                logger.debug("Команда была успешно обработана");
            }
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            param = param.replace(/\s/g, "");
            if (!param)	return msg.channel.send("Вы не указали акроним");
            if ((/[^a-zа-я0-9ё]/gi).test(param)) {
                await msg.channel.send("Акроним может содержать только цифры и буквы русского/латинского алфавита.");
                return logger.debug("Пользователь указал некорректный акроним " + param);
            } else if (param.length > 8) {
                await msg.channel.send("Длина акронима должна быть от 1 до 8 букв");
                return logger.debug("Пользователь указал слишком длинный акроним " + param);
            }
            this.run(msg, param);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
};
