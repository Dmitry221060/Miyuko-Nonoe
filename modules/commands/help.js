const logger = require("../logger");

module.exports = class HelpCommand {
	constructor(client) {
		Object.assign(this, {
			name: 'help',
			aliases: ['helpme', 'commands'],
			group: 'Информация',
			description: 'Выдаёт описание команд',
			allowedChannels: ['368410234110345226'],
			args: [
				{
					key: 'commandName',
					prompt: 'Название команды, описание которой вы хотите получить',
					type: 'string',
					optional: true,
				}
			],
			client
		});
	}
	
	async run(msg, commandName) {
		try {
			const command = this.client.commands.filterArray(cmd => cmd.name == commandName || (cmd.aliases && cmd.aliases.includes(commandName)))[0];
			if (!command) return msg.channel.send("Команда не найдена");
			let fields = [];
			if (command.args) {
				let argums = [];
				for (const i of command.args) {
					argums.push("**" + i.key + "** - " + i.prompt + "\nТип - " + i.type + '\nОбязательный - ' + (i.optional ? "Нет" : "Да"));
				}
				fields.push({name: "❯ Параметры", value: argums.join('\n\n')});
			
			}
			if (command.allowedChannels) fields.push({name: "❯ Каналы, на которых можно использовать команду", value: "<#" + command.allowedChannels.join('>, <#') + ">"});
			if (command.allowedUsers) {
				let users = [];
				for (const i of command.allowedUsers) {
					users.push(msg.guild.members.get(i) && msg.guild.members.get(i).displayName || "\*Пользователь с другого сервера\*");
				}
				fields.push({name: "❯ Пользователи, которым разрешено использовать команду", value: users.join(', ')});
			}
			if (command.aliases) fields.push({name: "❯ Псевдонимы", value: command.aliases.join(', ')});
			else fields.push({name: "❯ Псевдонимы", value: "None"});
			if (command.group) fields.push({name: "❯ Категория", value: command.group});
			await msg.channel.send({embed: {
				color: 0x00ae86,
				title: "Команда " + command.name,
				description: command.description,
				fields,
			}});
			logger.debug('Команда была успешно обработана');
		} catch(err) {
			msg.channel.send("Во время обработки вашей команды произошла ошибка");
			logger.error("Произошла ошибка", err);
		}
	}
	
	async parseParam(msg) {
		try {
			const param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '');
			if (!param) return this.commandList(msg);
			this.run(msg, param);
		} catch(err) {
			msg.channel.send("Во время обработки параметров произошла ошибка");
			logger.error("Произошла ошибка", err);
		}
	}
	
	async commandList(msg) {
		try {
			let fields = [];
			for (const i in this.client.groups) {
				let commands = [];
				for (const j of this.client.groups[i]) {
					commands.push(j.name);
				}
				fields.push({
					name: "❯ " + i,
					value: commands.join(", ")
				});
			}
			await msg.channel.send({embed: {
				color: 0x00ae86,
				title: "Список команд",
				description: "Чтобы получить информацию о конкретной команде используйте \n:P: help <commandName>",
				fields
			}});
			logger.debug('Команда была успешно обработана');
		} catch(err) {
			msg.channel.send("Во время обработки вашей команды произошла ошибка");
			logger.error("Произошла ошибка", err);
		}
	}
}