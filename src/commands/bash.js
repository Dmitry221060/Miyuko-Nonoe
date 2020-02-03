const { download } = require("../util");
const logger = require("../logger");

module.exports = class BashCommand {
    constructor(client) {
        Object.assign(this, {
            name: "bash",
            aliases: ["quote", "bashquote", "b", "bq"],
            group: "Рандом",
            description: "Выводит случайную цитату с bash.im\n:warning: Осторожно! Содержание цитат не фильтруется!",
            client
        });
    }

    async run(msg) {
        try {
            let quote = await download("https://bash.im/forweb/?u");
            quote = quote.toString().replace(/\n/g, "");
            const link = "https://bash.im" + quote.replace(/.*?(href=")/, "").replace(/".*/g, "");
            quote = quote.replace(/.*21201e">/g, "")
						 .replace(/(<' \+ 'br>)/g, "\n")
						 .replace(/(<' \+ 'br \/>)/g, "\n")
						 .replace(/(<' \+ '\/div>.*)/g, "");
            await msg.channel.send("```\n" + quote + "```\n<" + link + ">");
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg) {
        this.run(msg);
    }
};
