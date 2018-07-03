const { findUser } = require('../util');
const logger = require("../logger");

module.exports = class StatisticCommand {
    constructor(client) {
        Object.assign(this, {
            name: 'statistic',
            aliases: ['stat'],
            group: 'Информация',
            description: 'Выдаёт статистику использования команд',
            args: [
                {
                    key: 'user',
                    prompt: 'Пользователь, статистику которого вы желаете посмотреть',
                    type: 'user',
                    default: msg => msg.author.id
                },
                {
                    key: 'flags',
                    prompt: 'Дополнительные опции:\n```-t - Топ 5 самых активных пользователей```',
                    type: 'string',
                    optional: true
                }
            ],
            client
        });
    }
    
    async run(msg, user, flags) {
        try {
            if (flags == "-t") return this.sendTop(msg);
            
            let temp = [];
            for (const i in user.stat) {
                temp.push([i, user.stat[i]]);
            }
            temp.sort((a, b) => { //Сортируем статистику по убыванию использованных команд
                return b[1] - a[1];
            });
            temp = [].concat.apply([], temp);
            let values = [];
            for (let i = 0; i < temp.length; i += 2) { //Собираем пары "команда - число использований"
                values.push(temp[i] + ' - ' + temp[i + 1]);
            }
            await msg.channel.send({embed: {
                color: 0x00b900,
                title: "Статистика использования комманд пользователя " + (user.userName || user.userLogin),
                description: values.join('\n')
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
            if (!param.join('')) param = [this.args[0].default(msg)]
            if (param[param.length - 1] == "-t") return this.run(msg, null, "-t");
            const user = await findUser(this.client, param.join(' '));
            if (!user) return msg.channel.send('Пользователь не найден');
            this.run(msg, user);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async sendTop(msg) {
        try {
            const users = await this.client.db.collection('users').aggregate([
                { "$project": { "statRaw": "$stat", "stat": {"$objectToArray": "$stat"}, "userID": 1, "userName": 1, "userLogin": 1 } },
                { "$unwind": "$stat" },
                { "$group": { "_id": { "userID": "$userID", "userName": "$userName", "userLogin": "$userLogin", "statRaw": "$statRaw" }, "sum": { "$sum": "$stat.v" } } }
            ]).sort({"sum": -1}).limit(5).toArray();
            let fields = [];
            for (let i = 0; i < users.length; i++) {
                let temp = [];
                for (let j in users[i]._id.statRaw) { 
                    temp.push([j, users[i]._id.statRaw[j]]);
                }
                temp.sort((a, b) => { //Сортируем по убыванию использованных команд
                    return b[1] - a[1];
                });
                temp = [].concat.apply([], temp);
                let values = [];
                for (let j = 0; j < temp.length; j += 2) {
                    values.push(temp[j] + ' - ' + temp[j + 1]);
                }
                if (users[i]._id.userID == "326476628152811520")
                    users[i]._id.userName = "Dmitry221060";
                fields.push({"name": (i + 1) + '. ' + (users[i]._id.userName || users[i]._id.userLogin) + ' (' + users[i].sum + ')', "value": values.join('\n')});
            }
            
            await msg.channel.send({embed: {
                color: 0x00b900,
                title: "Топ 5 самых активных пользователей",
                fields: fields
            }});
            logger.debug('Команда была успешно обработана');
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
}
