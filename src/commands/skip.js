const ytdl = require("ytdl-core-discord");
const ytpl = require("ytpl");
const { findUser } = require("../util");
const logger = require("../logger");

module.exports = class SkipCommand {
    constructor(client) {
        Object.assign(this, {
            name: "skip",
            aliases: ["s", "skiptrack", "cancel"],
            group: "Аудио",
            description: "Голосовать за пропуск текущего трека или отмена своего заказа. Для использования вы должны находиться в одном голосовом канале с Миюко.",
            args: [
                {
                    key: "url",
                    prompt: "Ссылка или код заказанного видео/плейлиста",
                    type: "string",
                    optional: true
                }
            ],
            client,
            voted: [],
            voteMsg: null
        });
    }

    async run(msg, playCommand) {
        try {
            const userID = msg.author.id;
            this.voted.push(userID);
            if (!this.voteMsg) this.startVote(msg);
            else if (this.voted.length < Math.round(this.voteMsg.VCID/3))
                this.voteMsg.edit(this.voteMsg.content.replace(/\n(Прогресс: ).*/g, "$1") + this.voted.length + "/" + Math.round(this.voteMsg.VCID/3));
            else playCommand.dispatcher.end("skip");
            msg.delete();
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            param = param.replace(/<|>/g, "");
            const playCommand = this.client.commands.get("play");
            if (param) {
                let source;
                const user = await findUser(this.client, msg.author.id);
                if (!user) return msg.channel.send("Не удалось найти вас в базе данных.");
                if (ytpl.validateURL(param)) source = await ytpl.getPlaylistID(param);
                else if (ytdl.validateID(param) || ytdl.validateURL(param)) source = ytdl.getVideoID(param);
                else if (user.shortcuts[param]) source = param;
                else return msg.channel.send("Значение переданное в url не является ни видео, ни плейлистом, ни шорткатом.");
                const beforeSkip = playCommand.playlist.length + playCommand.queue.length;
                playCommand.queue = playCommand.queue.filter(e => e[0] != msg.author.id || e[5] != source);
                const cleanQueue = []; //Переменная содержащая очищенную очередь
                cleanQueue.push(playCommand.playlist[0]);
                for (let i = 1; i < playCommand.playlist.length; i++)
                    if (playCommand.playlist[i][0] != msg.author.id || playCommand.playlist[i][5] != source) cleanQueue.push(playCommand.playlist[i]);
                playCommand.playlist = [].concat(cleanQueue);
                if (playCommand.playlist[0][0] == msg.author.id && playCommand.playlist[0][5] == source) playCommand.dispatcher.end("silentCancel");
                const reply = await msg.channel.send(msg.member.displayName + ", отменено " + (beforeSkip - playCommand.playlist.length - playCommand.queue.length) + " видео.");
                msg.delete();
                return reply.delete(3500);
            }
            if (this.voted.includes(msg.author.id)) return msg.channel.send("Вы уже проголосовали.");
            if (!playCommand.playlist.length) return msg.channel.send("В настоящий момент не проигрывается ни один трек.");
            if (this.client.voiceConnections.first().channel.id != msg.member.voiceChannelID) return msg.channel.send("Вы должны находится в одном канале с Миюко.");
            if (playCommand.playlist[0][0] == msg.author.id) return playCommand.dispatcher.end("cancel", msg.channel);
            this.run(msg, playCommand);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }

    async startVote(msg) {
        try {
            const requiredVotes = Math.round(msg.member.voiceChannel.members.size/3);
            if (requiredVotes <= 3) return this.client.commands.get("play").dispatcher.end("skip");
            this.voteMsg = msg.channel.send(msg.member.displayName + " начинает голосование за пропуск текущего трека. \nПрогресс: 1/" + requiredVotes);
            this.voteMsg.VCID = msg.member.voiceChannelID;
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }
};
