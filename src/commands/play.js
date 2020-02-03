const ytdl = require("ytdl-core-discord");
const ytpl = require("ytpl");
const { findUser, wait, escape, shuffle } = require("../util");
const logger = require("../logger");

module.exports = class PlayCommand {
    constructor(client) {
        Object.assign(this, {
            name: "play",
            aliases: ["p"],
            group: "Аудио",
            description: "Добавляет видео, плейлист или шорткат в очередь на проигрывание. Вы можете поставить в очередь на проигрывание только два видео, " +
						 "в случае заказа сверх лимита, они будут поставлены на удержание и автоматически попадут в очередь как только там освободится место. " +
						 "Вы должны находиться в голосовом канале, чтобы использовать команду.",
            args: [
                {
                    key: "url",
                    prompt: "Шорткат, ссылка на видео/плейлист на ютубе или их код",
                    type: "string"
                },
                {
                    key: "flags",
                    prompt: "Дополнительные опции:\n```-r - содержимое плейлиста/шортката будет перемешано перед добавлением в очередь```",
                    type: "flag"
                }
            ],
            client,
            playlist: [], //[userID, url, channelID, voiceID, videoTitle, source]
            queue: [],
            dispatcher: null
        });
    }

    async run(msg, links) {
        try {
            const playlistLength = this.playlist.length;
            let inPlaylist = this.playlist.filter(t => t[0] == msg.author.id).length; //Количество видео заказанных пользователем в плейлисте
            const location = ((inPlaylist + links.length) > 2 ? "очередь на добавление в " : "") + "плейлист";
            for (const link of links) {
                if (inPlaylist >= 2) this.queue.push([msg.author.id, link[0], msg.channel.id, msg.member.voiceChannelID, link[1], link[2]]);
                else this.playlist.push([msg.author.id, link[0], msg.channel.id, msg.member.voiceChannelID, link[1], link[2]]);
                inPlaylist++;
            }
            if (!playlistLength) this.playNext();
            const reply = await msg.channel.send(msg.member.displayName + ", " + links.length + " видео добавлено в " + location + ".");
            msg.delete();
            reply.delete(3500);
            logger.debug(msg.member.displayName + " добавил в " + location + " " + links.length + " треков");
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            param = param.replace(/<|>/g, "").split(/,\s?/);
            let randomizeInput = false;
            switch (param.length) {
                case 0: return msg.channel.send("Вы должны указать ссылку, id или шорткат.");
                case 1: param = param[0]; break;
                case 2: {
                    if (param[0] == "-r") param = param[1];
                    else if (param[1] == "-r") param = param[0];
                    else return msg.channel.send("Вы не можете указать больше одной ссылки/id/шортката. Если вы хотите поставить в очередь несколько видео - вызовете команду несколько раз с разными параметрами или создайте шорткат.");
                    randomizeInput = true;
                    break;
                }
                default: return msg.channel.send("Вы не можете указать больше одной ссылки/id/шортката. Если вы хотите поставить в очередь несколько видео - вызовете команду несколько раз с разными параметрами или создайте шорткат.");
            }
            let links = [];
            const voiceID = msg.member.voiceChannelID;
            if (!voiceID || !this.client.bot.voiceChannels.includes(voiceID)) return msg.channel.send("Вы должны быть подключены к голосовому каналу.");
            const user = await findUser(this.client, msg.author.id);
            if (!user) return msg.channel.send("Не удалось найти вас в базе данных.");
            if (ytpl.validateURL(param)) {
                const playlist = await ytpl(param);
                links = playlist.items.map(e => [e.url_simple, escape(e.title, true), playlist.id] );
            } else if (ytdl.validateID(param) || ytdl.validateURL(param)) {
                const video = await ytdl.getBasicInfo(param);
                links.push([param, escape(video.title, true), video.video_id]);
            } else if (user.shortcuts[param]) links = user.shortcuts[param].map(e => [e[0], e[1], param] );
            else return msg.channel.send("Значение переданное в url не является ни видео, ни плейлистом, ни шорткатом.");
            if (randomizeInput) shuffle(links);
            this.run(msg, links);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка.");
            logger.error("Произошла ошибка", err);
        }
    }

    async playNext() {
        if (this.playlist.length == 0) {
            this.client.user.setActivity();
            await wait(10000);
            if (this.playlist.length == 0) this.client.voiceConnections.first().disconnect();
            return;
        }
        const currentTrack = this.playlist[0];
        const channel = this.client.channels.get(currentTrack[2]);
        try {
            logger.debug("Начинаю проигрывать трек " + currentTrack[1] + " заказанный " + currentTrack[0]);
            let voiceConnection = this.client.voiceConnections.first();
            if (!voiceConnection || voiceConnection.channel.id != currentTrack[3]) {
                const voiceChannel = this.client.channels.get(currentTrack[3]);
                if (voiceChannel.members.size == voiceChannel.userLimit) throw new Error("Channel is full");
                voiceConnection = await voiceChannel.join();
            }
            this.client.user.setActivity(currentTrack[4], { type: 2 });
            const ytStream = await ytdl(currentTrack[1], { filter : "audioonly", quality: "highestaudio", highWaterMark: 1<<20 });
            this.dispatcher = voiceConnection.playOpusStream(ytStream, { passes: 75 });
            this.dispatcher.on("end", async (reason, _channel = channel) => {
                let description;
                const link = (currentTrack[1].indexOf("http")+1) ? currentTrack[1] : "https://www.youtube.com/watch?v=" + currentTrack[1];
                if (reason == "skip") description = "пропущен по результатам голосования.";
                else if (reason == "cancel") description = "пропущен по запросу заказчика.";
                if (description) _channel.send("Трек <" + link + "> " + " был " + description);
                else description = reason == "silentCancel" ? "пропущен по source" : "успешно сыгран.";
                logger.debug("Трек " + currentTrack[1] + " был " + description + " (" + reason + ")");
                for (let i = 0; i < this.queue.length; i++) { //Перенести один трек от того же пользователя из очереди в плейлист
                    if (this.queue[i][0] != currentTrack[0]) continue;
                    this.playlist.push(this.queue[i]);
                    this.queue.splice(i, 1);
                    break;
                }
                this.playlist.shift(); //Убрать текущий трек из плейлиста
                const skipCommandLink = this.client.commands.get("skip");
                if (skipCommandLink.voteMsg) {
                    await skipCommandLink.voteMsg.delete();
                    skipCommandLink.voteMsg = null;
                    skipCommandLink.voted = [];
                }
                this.playNext();
            });
            ytStream.on("error", e => { throw new Error(e); });
            this.dispatcher.on("error", e => { throw new Error(e); });
        } catch(err) {
            const reason = err.message == "Channel is full" ? ", т.к. канал переполнен." : ", возможно вы указали неверную ссылку.";
            channel.send("Не удалось проиграть трек <" + currentTrack[1] + ">" + reason);
            logger.error("Произошла ошибка", err);
            if (this.dispatcher) return this.dispatcher.end("error");
            for (let i = 0; i < this.queue.length; i++) { //Перенести один трек от того же пользователя из очереди в плейлист
                if (this.queue[i][0] != currentTrack[0]) continue;
                this.playlist.push(this.queue[i]);
                this.queue.splice(i, 1);
                break;
            }
            this.playlist.shift(); //Убрать текущий трек из плейлиста
            const skipCommandLink = this.client.commands.get("skip");
            if (skipCommandLink.voteMsg) {
                await skipCommandLink.voteMsg.delete();
                skipCommandLink.voteMsg = null;
                skipCommandLink.voted = [];
            }
            this.playNext();
        }
    }
};
