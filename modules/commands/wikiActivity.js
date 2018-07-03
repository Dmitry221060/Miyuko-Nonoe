const { download } = require('../util');
const logger = require("../logger");

module.exports = class WikiActivityCommand {
    constructor(client) {
        Object.assign(this, {
            name: 'wikiact',
            aliases: ['wikiactivity'],
            group: 'Информация',
            description: 'Отображает последние 5 правок на вики',
            allowedChannels: ['368410234110345226'],
            args: [
                {
                    key: 'flags',
                    prompt: 'Дополнительные опции:\n```-f - Развёрнутый вид команды```',
                    type: 'string',
                    optional: true
                }
            ],
            client
        });
    }
    
    async run(msg, flags) {
        try {
            let edits = await download("http://ru.dont-starve.wikia.com/api.php?action=query&list=recentchanges&rclimit=100&rcprop=user|title|timestamp|ids|comment|sizes&format=json");
            edits = JSON.parse(edits.toString()).query.recentchanges;
            const regex = new RegExp("@comment|Участник:|Файл:|Блог участника:"); //RegExp для исключения правок не статей
            edits = edits.filter(edit => !regex.test(edit.title));
            if (flags == "-f") return this.bigWikiActivity(msg, edits);
            await msg.channel.send({embed: {
                color: 0xf0e68c,
                title: "Недавняя вики-деятельность",
                url: "http://ru.dont-starve.wikia.com/wiki/%D0%A1%D0%BB%D1%83%D0%B6%D0%B5%D0%B1%D0%BD%D0%B0%D1%8F:WikiActivity",
                fields: [{ 
                    "name": "**" + edits[0].title + "**",
                    "value": "Отредактировано участником " + edits[0].user + (edits[0].comment ? "\n***Описание изменений: ***" + edits[0].comment : ''),
                    "inline": false
                }, {
                    "name": "**" + edits[1].title + "**",
                    "value": "Отредактировано участником " + edits[1].user + (edits[1].comment ? "\n***Описание изменений: ***" + edits[1].comment : ''),
                    "inline": false
                }, {
                    "name": "**" + edits[2].title + "**",
                    "value": "Отредактировано участником " + edits[2].user + (edits[2].comment ? "\n***Описание изменений: ***" + edits[2].comment : ''),
                    "inline": false
                }, {
                    "name": "**" + edits[3].title + "**",
                    "value": "Отредактировано участником " + edits[3].user + (edits[3].comment ? "\n***Описание изменений: ***" + edits[3].comment : ''),
                    "inline": false
                }, {
                    "name": "**" + edits[4].title + "**",
                    "value": "Отредактировано участником " + edits[4].user + (edits[4].comment ? "\n***Описание изменений: ***" + edits[4].comment : ''),
                    "inline": false
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
            const param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '').split(/\s/);
            let flags;
            if (param[param.length - 1] == "-f") flags = "-f";
            this.run(msg, flags);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async bigWikiActivity(msg, edits) {
        try {
            let pageURL;
            for (let i = 0; i < 5; i++) {
                const len = edits[i].newlen - edits[i].oldlen;
                if (edits[i].old_revid != "0") //Если правка - редактирование статьи
                    pageURL = "http://ru.dont-starve.wikia.com/wiki/" + edits[i].title + "?diff=" + edits[i].revid + "&oldid=" + edits[i].old_revid;
                else //Если правка - создание статьи
                    pageURL = "http://ru.dont-starve.wikia.com/wiki/" + edits[i].title;
                pageURL = pageURL.replace(/\s/g, "_");
                await msg.channel.send({embed: {
                    color: 0xf0e68c,
                    title: edits[i].title,
                    description: "Отредактировано участником " + edits[i].user + (edits[i].comment ? "\n***Описание изменений: ***" + edits[i].comment : '') +
                                 "\nРазмер статьи стал на " + (len > 0 ? len : -len) + " символов " + (len > 0 ? "больше" : "меньше"),
                    url: pageURL,
                    timestamp: edits[i].timestamp
                }});
            }
            logger.debug('Команда была успешно обработана');
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
}
