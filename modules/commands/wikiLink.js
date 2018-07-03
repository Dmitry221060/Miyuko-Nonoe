const { removePings } = require('../util');
const logger = require("../logger");

module.exports = class WikiLinkCommand {
	constructor(client) {
		Object.assign(this, {
			name: 'wiki',
			aliases: ['wikilink'],
			group: 'Информация',
			description: 'Выдаёт ссылки на запрошеную статью(DSW)',
			args: [
				{
					key: 'article',
					prompt: 'Название статьи', 
					type: 'string'
				}
			],
			client
		});
	}
	
	async run(msg, article) {
		try {
			article = removePings(article);
			await msg.channel.send("<http://ru.dont-starve.wikia.com/wiki/" + article + ">\n" + 
								   "<http://ru.dont-starve.wikia.com/wiki/" + article + "?action=edit>\n" + 
								   "<http://ru.dont-starve.wikia.com/wiki/" + article + "?action=history>\n");
			logger.debug('Команда была успешно обработана');
		} catch(err) {
			msg.channel.send("Во время обработки вашей команды произошла ошибка");
			logger.error("Произошла ошибка", err);
		}
	}
	
	async parseParam(msg) {
		try {
			const param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '').replace(/\s/, '_');
			if (!param) return msg.channel.send("Вы не указали название статьи");
			this.run(msg, param);
		} catch(err) {
			msg.channel.send("Во время обработки параметров произошла ошибка");
			logger.error("Произошла ошибка", err);
		}
	}
}