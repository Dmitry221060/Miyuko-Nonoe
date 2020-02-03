const { removePings, randomOf } = require("../util");
const logger = require("../logger");

module.exports = class ChooseCommand {
    constructor(client) {
        Object.assign(this, {
            name: "choose",
            aliases: ["chooseone", "c"],
            group: "Рандом",
            description: "Миюко выбирает один из предложенных вариантов",
            args: [
                {
                    key: "options",
                    prompt: "Варианты, из которых нужно выбирать",
                    type: "array"
                }
            ],
            client,
            phrases: ["Я выбираю", "Хммм... Пусть будет", "Пожалуй,", "Думаю,", "Определённо", "Все варианты хороши, но больше всего мне нравится",
					  "По правде говоря, мне не очень нравятся варианты, но если и выбирать, то это будет", "Я предпочту"]
        });
    }

    async run(msg, options) {
        try {
            await msg.channel.send(randomOf(this.phrases) + " " + removePings(randomOf(options)) );
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            param = param.split(/,\s?/);
            if (!param.join("")) return msg.channel.send("Вы не указали варианты");
            this.run(msg, param);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
};
