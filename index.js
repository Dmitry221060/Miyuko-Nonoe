try {
	const warning = require("./assets/json/spamWarnings");
	const { download } = require('./modules/util');
	const logger = require("./modules/logger");
	const config = require("./config");
	require("./modules/client")().then(setHandlers).catch(fatalError);
	const { JSDOM } = require("jsdom");
	const fs = require('fs');
	let client;
	let spamers2s = []; //Очередь пользователей использовавших команды
	let spamers10s = []; //Очередь пользователей с повышеной задержкой, использовавших команды
	
	console.log('Скрипт запущен');
	function setHandlers(discordClient) {
		if (!discordClient) return fatalError("Дискорд не подключен");
		client = discordClient;
		process.on('uncaughtException', fatalError);
		process.on('warning', fatalError);
		client.on('disconnect', fatalError);
		client.on('error', fatalError);
		client.on('message', onMessageCommands);
		client.on('message', onMessageOther);
		client.on("messageUpdate", onMessageUpdate);
		client.on("messageDelete", onMessageDelete);		
	}
	
	function fatalError(err) {
		if (err.message && err.message.indexOf("MongoError: connect ECONNREFUSED") + 1) return setTimeout(() => {process.exit(1)}, 5000);
		logger.error(err);
		logger.loggers.error.transports.errorFile.on('flush', () => { //Если возможно - очистить Event Loop
			if (client && client.destroy) { 
				client.destroy().catch(() => process.exit(1));
				setTimeout(() => {process.exit(1)}, 5000).unref();
			} else {
				process.exit(1);
			}
		});
	}
	
	//Обработчики
	async function onMessageCommands(msg) {
		try {
			const MC = msg.content;
			logger.debug("Guild: " + (msg.guild && msg.guild.name || "DM") + " | Channel: " + msg.channel.name + 
						 " | Author: " + msg.author.username + " | Content: " + MC);
			if (msg.channel.type == "dm" || msg.channel.type == "group" || !(MC.indexOf("<:Plan:334293257850978304>") == 0 || 
				MC.indexOf(":Plan:") == 0 || MC.indexOf(":P:") == 0)) return;
			const user = await client.db.collection('users').findOne({userID: msg.author.id});
			if (!user || user.spamCount >= 5) return;
			if (!MC.split(/\s/)[1]) return;
			const userCommand = MC.split(/\s/)[1].toLowerCase();
			const command = client.commands.filterArray(cmd => cmd.name == userCommand || (cmd.aliases && cmd.aliases.includes(userCommand)))[0];
			if (!command) return;
			if (command.allowedChannels && !command.allowedChannels.includes(msg.channel.id)) return;
			if (command.allowedUsers && !command.allowedUsers.includes(user.userID)) return;
			if (checkToSpam(msg, user)) return;
			const sel = "stat." + command.name;
			client.db.collection('users').update({"userID": user.userID}, {$inc: {[sel]: 1}}, {
				upsert: true, 
				setDefaultsOnInsert: {[sel]: 1}
			}).catch(logger.error);
			command.parseParam(msg);
		} catch(err) {
			logger.error(err);
		}
	}
	
	async function onMessageOther(msg) {
		try {
			if (msg.guild && msg.guild.id == "326326755822534656" && msg.channel.id != "326386008709005313") { //Снятие АФК
				client.db.collection('users').update({"userID": msg.member.id}, {$set: {"lastMessageDate": +new Date()}}).catch(logger.error);
				if (msg.member.roles.has("405650567394754561"))	msg.member.removeRole("405650567394754561");
			}
			
			if (msg.channel.id == '326327175680884749') { //Дополнение БД
				let content = msg.content.replace(/\{SPLITMEPLS\}/g, '');
				if (msg.attachments.size && msg.attachments.first().url) content += "\n" + msg.attachments.first().url;
				client.db.collection('logs').insert({"userID": msg.member.id, content}).catch(logger.error);
			}
			
			if ((msg.channel.id == '326386008709005313' || msg.channel.id == "328136926534041600") && msg.content.match('http')) { //Авторизация
				const link = decodeURI(msg.content.replace(/(http.*?\s|http.*?$)|./g, "$1").replace(/\?.*/g, ''));
				const isWikiLink = link.replace(/.*\//g, "").match(/Стена_обсуждения:|Участник:|Блог_участника:|User:|Message_Wall:|User_blog:/);
				if (isWikiLink && isWikiLink.index == 0) {
					let name = link.replace(/.*\//g, "").replace(/Стена_обсуждения:|Участник:|Блог_участника:|User:|Message_Wall:|User_blog:/g, "");
					if ((/[А-я]/).test(name)) name = encodeURI(name);
					const xml = await download("http://ru.community.wikia.com/wiki/%D0%A1%D0%BB%D1%83%D0%B6%D0%B5%D0%B1%D0%BD%D0%B0%D1%8F:Editcount/" + name);
					name = decodeURI(name).replace(/\_/g, ' ');
					let editCount = new JSDOM(xml.toString()).window.document.querySelector("#editcount .TablePager tbody tr:nth-child(2)");
					editCount = Number(editCount.childNodes[6].textContent.replace(/\s/g, '')) || 0;
					if (await client.db.collection('users').count({userID: msg.member.id}) == 0) addUserInDB(msg, name);
					if (editCount >= 150) authorizate(msg, editCount, link, name);
					else checkIntegration(msg, editCount, link, name);
				}
			}
			
			const username = msg.member && msg.member.displayName || msg.author.username; //Запись в логи
			let content = msg.content.replace(/\n/g, '\r\n#' +  msg.channel.name + '\t' + username + ': ');
			if (msg.attachments.size && msg.attachments.first().url) {
				if (content) content += '\r\n#' +  msg.channel.name + '\t' + username + ': ' + msg.attachments.first().url;
				else content = msg.attachments.first().url;
			}
			fs.writeFile('Logs/Messages.txt', 
						 '\r\n#' + msg.channel.name + '\t' + username + ': ' + content, 
						 { "flag": "a" }, 
						 err => err ? logger.error(err) : '');
		} catch(err) {
			fatalError(err);
		}
	}
	
	function onMessageUpdate (oldMsg, newMsg) {
		if (oldMsg.guild && oldMsg.guild.id == "326326755822534656" && oldMsg.channel.id != "351749515885412352" && oldMsg.content != newMsg.content) {
			const data = new Date();
			data.setHours(data.getHours() - 2); //Часовой пояс по МСК
			let oldContent = oldMsg.content;
			let newContent = newMsg.content;
			if (oldMsg.attachments.size && oldMsg.attachments.first().url) {
				if (oldMsg.content != '') oldContent += '\r\n' + oldMsg.attachments.first().url;
				else oldContent = oldMsg.attachments.first().url;
			}
			if (newMsg.attachments.size && newMsg.attachments.first().url) {
				if (newMsg.content != '') newContent += '\r\n' + newMsg.attachments.first().url;
				else newContent = newMsg.attachments.first().url;
			}
			const txt = "\r\n[" + ('0' + data.getDate()).slice(-2) + "." + ('0' + (data.getMonth() + 1)).slice(-2) + " " + 
						('0' + data.getHours()).slice(-2) + ":" + ('0' + data.getMinutes()).slice(-2) + ":" + ('0' + data.getSeconds()).slice(-2) +
						"]  #" + oldMsg.channel.name + " " + (oldMsg.member.nickname || oldMsg.author.username) + " \"" + oldContent + "\"  >  \"" + 
						newContent + "\"";
			fs.writeFile('Logs/Edited messages.txt', txt, {'encoding': 'utf8', 'flag': 'a'}, err => err ? logger.error(err) : '');
		}
	}
	
	function onMessageDelete (delMsg) {
		if ((delMsg.channel.id == "326327175680884749" || delMsg.channel.id == "368410234110345226") && delMsg.content != "") {
			const data = new Date();
			data.setHours(data.getHours() - 2); //Часовой пояс по МСК
			let delContent = delMsg.content;
			
			if (delMsg.attachments.size && delMsg.attachments.first().url) {
				if (delMsg.content != '')
					delContent += '\r\n' + delMsg.attachments.first().url;
				else
					delContent = delMsg.attachments.first().url;
			}
			
			const txt = "\r\n[" + ('0' + data.getDate()).slice(-2) + "." + ('0'+(data.getMonth() + 1)).slice(-2) + " " + 
						('0' + data.getHours()).slice(-2) + ":" + ('0' + data.getMinutes()).slice(-2) + ":" + ('0' + data.getSeconds()).slice(-2) + 
						"]  #" + delMsg.channel.name + " " + (delMsg.member.nickname || delMsg.author.username) + " \"" + delContent + "\"";
			fs.writeFile('Logs/Deleted messages.txt', txt, {'encoding': 'utf8', 'flag': 'a'}, err => err ? logger.error(err) : '');
		}
	}
	
	//Функции
	function checkToSpam(msg, user) {
		if (spamers2s.includes(user.userID) || spamers10s.includes(user.userID)) {
            spamWarn(msg, user);
            return true;
        }
		if (user.spamCount >= 3) {
			spamers10s.push(user.userID);
			setTimeout(() => { spamers10s.splice(0, 1) }, 10000);
		} else {
			spamers2s.push(user.userID);
			setTimeout(() => { spamers2s.splice(0, 1) }, 2000);
		}
		return false;
	}
	
	function spamWarn(msg, user) {
		msg.client.db.collection('users').update({"userID": user.userID}, {$inc: {"spamCount": 1}}).catch(logger.error);
		if (user.spamCount + 1 == 3) {
			msg.channel.send("<@!" + user.userID + "> Вы получили 3 предупреждения за спам. Теперь ваш интервал между использованием команд" +
							 " составляет 10 секунд. Если вы продолжите - бот перестанет реагировать на вас.");
			spamers10s.push(user.userID);
			setTimeout(() => { spamers10s.splice(0, 1) }, 10000);
		} else if (user.spamCount + 1 == 5) {
			msg.channel.send("<@!" + user.userID + "> Вы получили 5 предупреждений за спам, бот больше не реагирует на ваши команды.");
		} else {
			msg.channel.send("<@!" + user.userID + "> " + warning[Math.floor(Math.random() * warning.length)]);
		}
	}
	
	function addUserInDB(msg, name) {
		client.db.collection('users').insert({ 
			userID: msg.member.id,
			userName: name,
			userLogin: msg.author.username,
			lastMessageDate: Date.now(),
			spamCount: 0,
			stat: {},
			battle: {
				lvl: 0,
				exp: 0,
				bonusHealth: 0,
				bonusDamage: 0,
				bonusMagic: 0
			}
		});
	}
	
	async function authorizate(msg, editCount, link, name) {
		try {
			await msg.member.setNickname(name);
			await msg.member.addRole("326386245976719370");
			await msg.guild.channels.get("326327175680884749").send("<@!" + msg.member.id + "> авторизован");
			sendLogs(msg, 0x00b900, editCount, link, name);
			msg.delete();
		} catch(err) {
			fatalError(err);
		}
	}
	
	async function checkIntegration(msg, editCount, link, name) {
		try {
			const profile = await msg.member.user.fetchProfile();
			if (profile.connections.size === 0) {
				msg.channel.send("<@!" + msg.member.id + "> Здравствуйте, мы пока не можем Вас авторизовать. Привяжите к Дискорду какой-либо " + 
								 "из возможных аккаунтов (Стим/Ютуб/Твич/и т.п.) и киньте ссылку ещё раз");
			} else {
				msg.channel.send("<@!" + msg.member.id + "> Ваша заявка принята, ожидайте проверки модератором");
				sendLogs(msg, 0xd0bf00, editCount, link, name);
			}
		} catch(err) {
			fatalError(err);
		}
	}
	
	function sendLogs(msg, color, editCount, link, name) {
		const data = msg.author.createdAt;
		msg.guild.channels.get("412950263196942336").send({embed: {
			"color": color,
			"thumbnail": { "url": msg.author.displayAvatarURL },
			timestamp: msg.createdAt,
			fields: [{
				"name": "Логин:",
				"value": msg.author.username.replace(/\*/g, '\\*').replace(/\_/g, '\\_').replace(/\`/g, '\\`'),
				"inline": true
			},
			{
				"name": "Установленный ник:",
				"value": name.replace(/\*/g, '\\*').replace(/\_/g, '\\_').replace(/\`/g, '\\`'),
				"inline": true
			},
			{
				"name": "Дата регистрации аккаунта:",
				"value": ('0' + data.getDate()).slice(-2) + '.' + ('0' + (data.getMonth() + 1)).slice(-2) + '.' + data.getFullYear(),
				"inline": true
			},
			{
				"name": "Количество правок:",
				"value": editCount + '',
				"inline": true
			},
			{
				"name": "Ссылка, данная участником:",
				"value": link + ''
			}]
		}});
	}
	
	setInterval(async () => { //Выдача роли АФК раз в час
		try {
			const twoWeekAgo = Date.now() - 1209600000;
			const users = await client.db.collection('users').find({"lastMessageDate": {$lt: twoWeekAgo}}).toArray();
			if (!users.length) return;
			for (let i = 0; i < users.length; i++) {
				const user = client.guilds.get("326326755822534656").members.get(users[i].userID);
				if (user) await user.addRole("405650567394754561");
			}
		} catch(err) {
			logger.error(err);
		}
	}, 3600000).unref();
} catch (error) {
	require("./modules/logger").error("Критичесская ошибка", error);
}
