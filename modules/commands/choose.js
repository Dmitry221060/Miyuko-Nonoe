const { removePings } = require('../util');
const logger = require("../logger");

module.exports = class ChooseCommand {
	constructor(client) {
		Object.assign(this, {
			name: 'choose',
			aliases: ['chooseone'],
			group: 'Рандом',
			description: 'Выбирает один из предложенных вариантов',
			allowedChannels: ['368410234110345226'],
			args: [
				{
					key: 'options',
					prompt: 'Варианты, из которых нужно выбирать',
					type: 'array'
				}
			],
			client
		});
	}
	
	async run(msg, options) {
		try {
			await msg.channel.send("Я выбираю " + options[Math.floor(Math.random() * options.length)]);
			logger.debug('Команда была успешно обработана');
		} catch(err) {
			msg.channel.send("Во время обработки вашей команды произошла ошибка");
			logger.error("Произошла ошибка", err);
		}
	}
	
	async parseParam(msg) {
		try {
			const param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '').split(',');
			if (!param.join('')) return msg.channel.send('Вы не указали варианты');
			this.run(msg, param);
		} catch(err) {
			msg.channel.send("Во время обработки параметров произошла ошибка");
			logger.error("Произошла ошибка", err);
		}
	}
}