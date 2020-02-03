const logger = require("./logger");
const { inspect } = require("util");

module.exports = class BotData {
	#cache = {};
	constructor(client) {
		Object.assign(this, {
			client
		});
	}

	async get(field) {
		logger.debug("Запрос данных поля " + field);
		if (this.#cache[field]) {
			logger.debug("Ответ на запрос поля " + field + ", возвращено кэшированное значение " + inspect(this.#cache[field]));
			return this.#cache[field];
		}
		let data = await this.client.db.collection("botData").findOne({ field });
		data = data.value;
		logger.debug("Ответ на запрос поля " + field + ": " + inspect(data) + "\nКэшированное значение: " + this.#cache[field]);
		//if (this.#cache[field]) return this.#cache[field];
		this.#cache[field] = data;
		return data;
	}

	set(field, value) {
		try {
			this.#cache[field] = value;
			this.client.db.collection("botData").updateOne({ field }, { $set: { value } }, { upsert: true });
			logger.debug("Запись значения " + inspect(value) + " в поле " + field);
		} catch(err) {
			logger.error(err);
		}
	}
};