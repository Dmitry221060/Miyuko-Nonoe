const { escape } = require("../util");
const logger = require("../logger");

module.exports = class PlaylistCommand {
    constructor(client) {
        Object.assign(this, {
            name: "playlist",
            aliases: ["pl", "plist", "tracks"],
            group: "Аудио",
            description: "Выводит текущий плейлист для :M: play.",
            args: [
                {
                    key: "simple",
                    prompt: "Использовать упрощённый вариант отображения",
                    type: "bool|number",
                    optional: true,
                    default: false
                }
            ],
            client
        });
    }

    async run(msg, simple) {
        try {
            const playlist = this.client.commands.get("play").playlist;
            if (playlist.length == 0) return msg.channel.send("Плейлист пуст.");
            if (simple) return msg.channel.send(playlist.map(e => "<" + e[1] + ">" ).join("\n"));
            const fields = [];
            for (const track of playlist) {
                const guildMember = await msg.guild.fetchMember(track[0]);
                fields.push({
                    name: escape(guildMember.displayName, true),
                    value: "[" + track[4] + "](" + track[1] + ")"
                });
            }
            msg.channel.send({ "embed": {
                color: 12592140,
                fields
            }});
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            switch (param.toLowerCase()) {
                case "true":  case "1": param = true;  break;
                case "false": case "0": param = false; break;
                case "": param = this.args[0].default; break;
                default: return msg.channel.send("Параметр simple может принимать значение только true|1 или false|0");
            }
            this.run(msg, param);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }
};
