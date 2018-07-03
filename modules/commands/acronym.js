const { removePings } = require('../util');
const logger = require("../logger");

module.exports = class AcronymCommand {
	constructor(client) {
		Object.assign(this, {
			name: 'acronym',
			aliases: ['acr', 'acron'],
			group: 'Манипуляции с текстом',
			description: 'Расшифровывает акроним словами из ваших сообщений',
			allowedChannels: ['368410234110345226'],
			args: [
				{
					key: 'acronym',
					prompt: 'Акроним, длинной от 1 до 8 букв или цифр',
					type: 'string'
				}
			],
			client
		});
	}
	
	async run(msg, acronym) {
		try {
			let endText = '';
			let words = []; //Массив массивов со словами
			for (let i = 0; i < acronym.length; i++) {
				const regex = new RegExp("\\s" + acronym[i] + "|^" + acronym[i], "i"); //Фильтр для поиска сообщений, содержащих слова на указаную букву
				const data = await this.client.db.collection("logs").aggregate([
					{ "$match": { "userID": msg.author.id, "content": { "$regex": regex } } }, 
					{ "$sample": { "size": 1 } }
				]).toArray();
				if (!data.length) {
					endText = endText + " - ";
					continue;
				}
				/* Фильтр, вырезающий всё, кроме нужных нам слов */
				const regex2 = new RegExp("(\\s" + acronym[i] + ".*?\\s|^" + acronym[i] + ".*?\\s|\\s" + acronym[i] + ".*?$|^" + acronym[i] + ".*?$)|.", "gi");
				words[i] = data[0].content.replace(regex2, " $1").replace(/\s{2,}/g, " ").replace(/^\s|\s$/g, "").split(/\s/g);
				words[i] = words[i][Math.floor(Math.random() * words[i].length)].replace(/[^$А-Яа-яA-Za-z0-9\-ё]/g, '');
				endText += words[i] + " ";
			}
			endText = removePings(endText);
			if (endText.replace(/-/g, "").replace(/\s/g, "") == "") {
				await msg.channel.send('Не найдено ваших сообщений, со словами из указанного акронима');
				logger.debug('У пользователя недостаточно сообщений, чтобы расшифровать акроним ' + endText);
			} else {
				await msg.channel.send(endText);
				logger.debug('Команда была успешно обработана');
			}
		} catch(err) {
			msg.channel.send("Во время обработки вашей команды произошла ошибка");
			logger.error("Произошла ошибка", err);
		}
	}
	
	async parseParam(msg) {
		try {
			const param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '').replace(/\s/g, '');
			if (!param)	return msg.channel.send("Вы не указали акроним");
			if ((/[^a-zA-Zа-яА-Я0-9ё]/g).test(param)) {
				await msg.channel.send("Акроним может содержать только цифры и буквы русского/латинского алфавита.");
				return logger.debug('Пользователь указал некорректный акроним ' + param);
			} else if (param.length > 8) {
				await msg.channel.send('Длина акронима должна быть от 1 до 8 букв');
				return logger.debug('Пользователь указал слишком длинный акроним ' + param);
			}
			this.run(msg, param);
		} catch(err) {
			msg.channel.send("Во время обработки параметров произошла ошибка");
			logger.error("Произошла ошибка", err);
		}
	}
}