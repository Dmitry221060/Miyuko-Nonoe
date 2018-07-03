const { findUser } = require('../util');
const logger = require("../logger");
const levels = require("../../assets/json/levels");
const fs = require('fs');

module.exports = class InfoCommand {
    constructor(client) {
        Object.assign(this, {
            name: 'info',
            aliases: ['userinfo'],
            group: 'Информация',
            description: 'Выдаёт информацию о пользователе',
            args: [
                {
                    key: 'user',
                    prompt: 'Пользователь, о котором нужно выдать информацию',
                    type: 'user',
                    default: msg => msg.author.id
                },
                {
                    key: 'flags',
                    prompt: 'Дополнительные опции:\n```-fight - Уровень пользователя в игре \"battle\"```',
                    type: 'string',
                    optional: true
                }
            ],
            client
        });
    }
    
    async run(msg, user, flags) {
        try {
            if (flags == "-fight") return this.fightInfo(msg, user);
            if (user.userID == "326476628152811520") return this.botInfo(msg, user);
            
            const joinDate = new Date(msg.guild.members.get(user.userID).joinedTimestamp);
            await msg.channel.send({embed: {
                color: user.spamCount >= 3 ? (user.spamCount >= 5 ? 0xe01f14 : 0xfcbf43) : 0x369531,
                "thumbnail": {
                    "url": msg.guild.members.get(user.userID).user.displayAvatarURL
                },
                fields: [{
                    "name": "Предупреждений за спам:",
                    "value": user.spamCount,
                    "inline": true
                }, {
                    "name": "На сервере с",
                    "value": ('0' + joinDate.getDate()).slice(-2) + '.' + ('0' + (joinDate.getMonth() + 1)).slice(-2) + '.' + joinDate.getFullYear() + 
                             '(' + Math.floor((Date.now() - joinDate.getTime()) / 86400000) + ' дней назад)',
                    "inline": true
                }, {
                    "name": "Заметка:",
                    "value": this.client.user.notes.get(user.userID) || "None",
                    "inline": true
                }, {
                    "name": "ID",
                    "value": user.userID,
                    "inline": true
                }]
            }});
            logger.debug('Команда была успешно обработана');
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async parseParam(msg) {
        try {
            let param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '').split(/\s/);
            let flags;
            if (param[param.length - 1] == "-fight") {
                flags = "-fight";
                param.pop();
            }
            if (!param.join('')) param = [this.args[0].default(msg)];
            const user = await findUser(this.client, param.join(' '));
            if (!user) return msg.channel.send("Пользователь не найден");
            this.run(msg, user, flags);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async fightInfo(msg, user) {
        try {
            await msg.channel.send({embed: {
                color: 0x9132a9,
                "thumbnail": {
                    "url": msg.guild.members.get(user.userID).user.displayAvatarURL
                },
                "fields": [{
                    "name": "Ник:",
                    "value": user.userName || user.userLogin,
                    "inline": true
                }, {
                    "name": "ID",
                    "value": user.userID,
                    "inline": true
                }, {
                    "name": "Уровень",
                    "value": user.battle.lvl + "(" + user.battle.exp + "/" + levels[user.battle.lvl + 1] + ")",
                    "inline": true
                }, {
                    "name": "Характеристики",
                    "value": "Здоровье/Урон/Магия\n+" + user.battle.bonusHealth + "/+" + user.battle.bonusDamage + "/+" + user.battle.bonusMagic,
                    "inline": true
                }]
            }});
            logger.debug('Команда была успешно обработана');
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async botInfo(msg, user) {
        try {
            const lastError = fs.statSync('Work logs/Errors.txt').mtime.toString();
            const lastUpdate = fs.statSync('index.js').mtime.toString();
            const uptime = this.client.uptime;
            const hours = Math.floor(uptime / 3600000);
            const minutes = ('0' + Math.floor((uptime - hours * 3600000) / 60000)).slice(-2);
            const seconds = ('0' + Math.floor((uptime - hours * 3600000 - minutes * 60000) / 1000)).slice(-2);
            await msg.channel.send({embed: {
                color: 0x0080ff,
                "thumbnail": {
                    "url": msg.guild.members.get(user.userID).user.displayAvatarURL
                },
                fields: [{
                    "name": "Время работы:",
                    "value": hours + ":" + minutes + ":" + seconds,
                    "inline": true
                }, {
                    "name": "Дата последней ошибки:",
                    "value": lastError,
                    "inline": true
                }, {
                    "name": "Дата последнего обновления бота:",
                    "value": lastUpdate,
                    "inline": true
                }, {
                    "name": "Количество используемой памяти в МБ:",
                    "value": Math.floor(process.memoryUsage().heapTotal / 1024 / 1024) + " из 8192",
                    "inline": true
                }]
            }});
            logger.debug('Команда была успешно обработана');
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
}
