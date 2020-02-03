const ytdl = require("ytdl-core-discord");
const ytpl = require("ytpl");
const { escape, isNumber, findUser, parseShortcutEntries, insertAt } = require("../util");
const logger = require("../logger");

module.exports = class EditShortcutCommand {
    constructor(client) {
        Object.assign(this, {
            name: "editshortcut",
            aliases: ["editsc", "esc", "changeshortcut", "changesc", "chsc", "csc"],
            group: "Данные",
            description: 'Позволяет редактировать шорткат. Использование: `:P: esc "%название шортката%" %операция% %параметры%`. ' +
						 "Если название состоит из одного слова, кавычки могут быть опущены.\nВозможные операции: ```css\n" +
						 "* INSERT/PUT/ADD [AT $] - вставляет видео в шорткат на позицию $. Если AT не указан - видео добавляется в конец шотката\n" +
						 "* REMOVE/DELETE [FIRST|LAST|AT $] - удаляет из шортката первое/последнее найденное видео, либо видео на позиции $. Если модификатор не указан - будут удалены все найденные вхождения\n" +
						 //"* REPLACE ... WITH ... - заменяет одно множество видео на другое\n" +
						 "* RESET/REMAKE/REWRITE - полностью перезаписывает содержимое шортката" +
						 "* RENAME - переименовывает шорткат" +
						 "```",
            args: [
                {
                    key: "name",
                    prompt: "Название шортката для редактирования.",
                    type: "string"
                },
                {
                    key: "action",
                    prompt: "Операция, которую нужно применить к шорткату.",
                    type: "string"
                },
                {
                    key: "modifier",
                    prompt: "Модификатор операции(at, first, last). Могут применяться к любой операции, но эффект оказывают только на те, " +
							"с которыми указаны в описании команды.\nЗапись ОПЕРАЦИЯ [МОДИФФИКАТОР], означает что модификатор необязательный, " +
							"использовать квадратные скобки НЕ нужно.",
                    type: "string",
                    optional: true
                },
                {
                    key: "arguments",
                    prompt: "Прочие параметры, зависящие от операции.",
                    type: "string[]",
                    optional: true
                }
            ],
            client,
            commands: [["insert", "put", "add"], ["remove", "delete"], /*["replace"],*/ ["reset", "remake", "rewrite"], ["rename"]],
            modifiers: ["at", "first", "last"]
        });
    }

    async run(msg, params, user) {
        try {
            let shortcut = user.shortcuts[params.SCName];
            const SCLength = shortcut.length;
            if (this.commands[0].includes(params.commandName)) { //insert
                if (!params.parsedParams.length) return msg.channel.send("Вы не указали ни одного видео для добавления в шорткат.");
                const entries = await parseShortcutEntries(ytpl, ytdl, user, params.parsedParams);
                if (!Array.isArray(entries)) return msg.channel.send("Значение " + entries + " не является корректной ссылкой на видео/плейлист, шорткатом или id.");
                let insertIndex = shortcut.length;
                if (Array.isArray(params.modifier)) insertIndex = Math.min(Math.max(params.modifier[1] - 1, 0), shortcut.length);
                shortcut = insertAt(shortcut, insertIndex, entries);
                await msg.channel.send(shortcut.length - SCLength + " видео было добавлено в шорткат.");
            } else if (this.commands[1].includes(params.commandName)) { //remove
                if (!params.parsedParams.length) return msg.channel.send("Вы не указали ни одного видео для удаления из шортката.");
                const modifier = Array.isArray(params.modifier) ? params.modifier[0] : params.modifier;
                switch (modifier) {
                    case "at": //Одиночную запись
                        shortcut.splice(params.modifier[1], 1);
                        break;
                    case "first": //Первые найденные записи
                        for (const source of params.parsedParams) {
                            const index = shortcut.findIndex(e => e[2] == source || e[0] == source);
                            shortcut.splice(index, 1);
                        }
                        break;
                    case "last": //Последние найденные записи
                        shortcut.reverse();
                        for (const source of params.parsedParams) {
                            const index = shortcut.findIndex(e => e[2] == source || e[0] == source);
                            shortcut.splice(index, 1);
                        }
                        shortcut.reverse();
                        break;
                    default: //Все найденные записи
                        shortcut = shortcut.filter(e => !params.parsedParams.includes(e[2]) && !params.parsedParams.includes(e[0]));
                }
                await msg.channel.send(SCLength - shortcut.length + " видео было удалено из шортката.");
                /*} else if (this.commands[2].includes(params.commandName)) { //replace
				return await msg.channel.send("501 Not Implemented");*/
            } else if (this.commands[2].includes(params.commandName)) { //reset
                if (!params.parsedParams.length) return msg.channel.send("Вы не указали ни одного видео для перезаписи шортката.");
                shortcut = await parseShortcutEntries(ytpl, ytdl, user, params.parsedParams);
                if (!Array.isArray(shortcut)) return msg.channel.send("Значение " + shortcut + " не является корректной ссылкой на видео/плейлист, шорткатом или id.");
                if (shortcut.length >= this.client.config.bot.maxShortcutSize) await msg.reply("Я многое могу понять, но зачем нужен плейлист на " + shortcut.length + " видео - мне не понятно. Размер был обрезан до " + this.client.config.bot.maxShortcutSize + ", надеюсь это не сильно огорчит вас.");
                shortcut.splice(this.client.config.bot.maxShortcutSize);
                await msg.channel.send("Шорткат " + params.SCName + " был успешно перезаписан. Новый размер шортката: " + shortcut.length + " видео");
            } else { //rename
                const newSCName = escape(params.parsedParams.join(" "), true);
                if (newSCName.replace(/\s*/g, "") == "") return msg.channel.send("Вы не указали новое название шортката.");
                if (user.shortcuts[newSCName]) return msg.channel.send("Шорткат с названием " + newSCName + " уже существует.");
                await this.client.db.collection("users").updateOne({ userID: msg.author.id }, { $unset: { ["shortcuts." + params.SCName]: null } });
                params.SCName = newSCName;
            }
            await this.client.db.collection("users").updateOne({ userID: msg.author.id }, { $set: { ["shortcuts." + params.SCName]: shortcut } });
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            let parsedParams, SCName, commandName, modifier;
            const user = await findUser(this.client, msg.author.id);
            if (param.indexOf('"') == 0) {
                SCName = param.substring(1, param.indexOf('"', 1)); //Вырезать название шортката из кавычек
                parsedParams = param.substr(SCName.length + 3).replace(/,\s?|\s/g, "\n").split(/\n/).filter(Boolean);
            } else {
                parsedParams = param.replace(/,\s?|\s/g, "\n").split(/\n/).filter(Boolean);
                SCName = parsedParams.shift();
            }
            SCName = escape(SCName, true);
            if (!user.shortcuts[SCName]) return msg.channel.send("Шорткат с названием " + SCName + " не существует.");
            commandName = parsedParams.shift().toLowerCase();
            if (!this.commands.flat().includes(commandName)) return msg.channel.send("Операции " + commandName + " не существует. Если название вашего шортката состоит из нескольких слов - поместите его в кавычках.");
modCheck:	if (this.modifiers.includes(parsedParams[0].toLowerCase())) { //eslint-disable-line
                modifier = parsedParams.shift().toLowerCase();
                if (modifier != "at") break modCheck;
                modifier = [modifier, parsedParams.shift().toLowerCase()];
                if (!isNumber(modifier[1])) return msg.channel.send("Указанный индекс \"" + modifier[1] + "\" не является числом");
            }
            this.run(msg, { SCName, commandName, modifier, parsedParams }, user);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }
};
