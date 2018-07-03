const logger = require("../logger");

module.exports = class DeleteEmojiCommand {
	constructor(client) {
		Object.assign(this, {
			name: 'deleteemoji',
			aliases: ['delemoji', 'clearmessage', 'clearmsg'],
			group: 'Служебные',
			description: 'Убирает все реакции под сообщением',
			allowedUsers: ['326476628152811520', '326553699717480462', '297241566500618240', '281075310890582017', '326501276047114241', '276331529418964992'],
			args: [
				{
					key: 'msgIDs',
					prompt: 'ID сообщений, с которых нужно убрать реакции',
					type: 'array',
				}
			],
			client
		});
	}
	
	async run(msg, msgIDs) {
		try {
			for (let i = 0; i < msgIDs.length; i++) {
				const message = await msg.channel.fetchMessage(msgIDs[i]);
				await message.clearReactions();
			}
			await msg.channel.send("Все реакции были удалены");
			logger.debug('Команда была успешно обработана');
		} catch(err) {
			msg.channel.send("Во время обработки вашей команды произошла ошибка, скорее всего вы указали неверный(-е) ID");
			logger.error("Произошла ошибка", err);
		}
	}
	
	async parseParam(msg) {
		try {
			const param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '').replace(/\s/g, '').split(',');
			if (!param.join('')) return msg.channel.send('Вы не выбрали сообщения');
			this.run(msg, param);
		} catch(err) {
			msg.channel.send("Во время обработки параметров произошла ошибка");
			logger.error("Произошла ошибка", err);
		}
	}
}