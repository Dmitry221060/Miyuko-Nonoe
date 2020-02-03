const http = require("http");
const https = require("https");
const colors = require("../assets/json/colors");

class Util {
    static wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async findUser(client, param) {
        const userID = _getIdByName(client, param);
        if (!userID) return null;
        const data = await client.db.collection("users").findOne({ userID });
        return data || null;
    }

    static isSelf(client, param) {
        const userID = _getIdByName(client, param);
        return userID == client.user.id;
    }

    static removePings(text) {
        return text.replace(/@/g, "\\@​").replace(/^(:Miyu:|:M:)/, "​$1");
    }

    static escape(text, disablePings) { //Превращает всю текстовую разметку в текст
        text = text.replace(/\*|_|`|~{2,}/g, "\\$&");
        return disablePings ? Util.removePings(text) : text;
    }

    static isNumber(text) {
        return !isNaN(parseFloat(text)) && isFinite(text);
    }

    static formatTimestamp(date = new Date()) { //Возвращает форматированную дату [DD.MM.YYYY HH.MM.SS]
        return "[" + Util.twoNum(date.getDate())  + "." + Util.twoNum(date.getMonth()+1) + "." +             date.getFullYear() + " "
				   + Util.twoNum(date.getHours()) + ":" + Util.twoNum(date.getMinutes()) + ":" + Util.twoNum(date.getSeconds()) + "]";
    }

    static twoNum(str) { //Добавляет к строке 0 и возвращает последние два символа
        return ("0" + str).slice(-2);
    }

    static download(link) { //TODO review
        return new Promise((resolve, reject) => {
            try {
                let protocol;
                if (link.indexOf("https") == 0) protocol = https;
                else if (link.indexOf("http") == 0) protocol = http;
                else throw new Error("Incorrect link: " + link);
                protocol.get(link, res => {
                    let content = [];
                    res.on("data", chunk => content.push(chunk));
                    res.on("end", () => {
                        const data = Buffer.concat(content);
                        resolve(data);
                    });
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    static randomRange(min, max) { //Возвращает число в интервале [min; max]
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static random(chance) { //Возвращает true с шансом в chance процентов
        chance = Math.round(chance, 2) * 100;
        return Util.randomRange(0, 10000 - 1) + 1 <= chance;
    }

    static randomOf(arr) { //Возвращает случайный элемент массива
        return arr[Math.floor(Math.random() * arr.length)];
    }

    static shuffle(arr) { //Перемешивание массива по алгоритму Фишера — Йетса
        for (var i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const x = arr[i];
            arr[i] = arr[j];
            arr[j] = x;
        }
        return arr;
    }

    static insertAt(arr1, index, arr2) { //Возвращает массив, представляющий из себя arr1, в который начиная с index вставленны элементы arr2
        if (!Array.isArray(arr2)) arr2 = [arr2];
        var i, j, k, temp = [];
        for (i = 0; i < index; i++) temp[i] = arr1[i];
        for (j = 0; j < arr2.length; j++) temp[index + j] = arr2[j];
        for (k = index; k < arr1.length; k++) temp[k + arr2.length] = arr1[k];
        return temp;
    }

    static hex2rgb(hex) {
        if (hex.indexOf("#") == 0) {
            hex = hex.slice(1);
            if (hex.length == 3) hex = hex.replace(/./g, "$&$&");
            if (hex.length != 6 || (/[^a-f0-9]/).test(hex)) throw new Error("Incorrect hex-code: " + hex);
            let rgb = [];
            for (let i = 0; i < 3; i++) rgb[i] = parseInt(hex.substr(i*2, 2), 16);
            return rgb;
        } else if (colors[hex]) return colors[hex];
        throw new Error("Incorrect hex-code: " + hex);
    }

    static async fetchMessages(client, channelID, count, startID, upToDown = true) { //Возвращает массив сообщений
        if (!client || client.status != 0 || !channelID || !count || !startID) {
            const falsyParams = [((client && client.status == 0) ? "" : "client"), (channelID ? "" : "channelID"), (count ? "" : "count"), (startID ? "" : "startID")];
            throw Error("Parameters " + falsyParams.join(", ").replace(/(, ){2,}/g, ", ") + "required but not passed(passed incorrect)");
        }
        if (upToDown) {
            let fetchedMessages = [];
            const channel = client.channels.get(channelID);
            if (!channel || (channel.type != "text" && channel.type != "dm")) throw Error("Incorrect channelID has passed");
            let lastID = startID;
            while (fetchedMessages.length < count) {
                const limit = Math.min(100, count - fetchedMessages.length);
                const messages = await channel.fetchMessages({ limit, after: lastID });
                if (messages.size == 0) break;
                lastID = messages.first().id;
                _normalize(messages.values(), fetchedMessages);
            }
            return fetchedMessages;
        }
        else throw new Error("Reverse direction fetch is not implemented"); //TODO
    }

    static async sendFull(client, channelID, text, separator) { //Отправляет сообщение любой длины в указанный канал
        const channel = client.channels.get(channelID);
        if (text.length <= 2000) return await channel.send(text);
        const chunks = _splitOnChunks(text, 2000, separator);
        for (const chunk of chunks) await channel.send(chunk);
    }

    static async parseShortcutEntries(ytpl, ytdl, user, links) {
        let entries = [];
        for (const url of links) {
            if (ytpl.validateURL(url)) {
                const playlist = await ytpl(url);
                entries = entries.concat(playlist.items.map(e => [e.url_simple, Util.escape(e.title, true), playlist.id] ));
            } else if (ytdl.validateID(url) || ytdl.validateURL(url)) {
                const video = await ytdl.getBasicInfo(url);
                entries.push([video.video_url, Util.escape(video.title, true), video.video_id]);
            } else if (user.shortcuts[url]) entries = entries.concat(user.shortcuts[url].map(e => [e[0], e[1], url] ));
            else return url;
        }
        return entries;
    }
}

module.exports = Util;

function _getIdByName(client, param) { //Возвращает id пользователя с указанным ником/логином
    if (typeof param != "string") throw new TypeError("param is a " + typeof param + " but expected a string");
    if (Util.isNumber(param)) return param; //Если param это число - вернуть его как id
    const users = client.guilds.get(client.config.bot.serverID).members.filter(member => //Пользователи, ник или логин которых начинается с переданной строки
					  member.nickname &&
					  member.nickname.toLowerCase().indexOf(param.toLowerCase()) == 0 ||
					  member.user.username.toLowerCase().indexOf(param.toLowerCase()) == 0
				  );
    if (users.size != 1) return null;
    return users.first().id;
}

function _normalize(arr1, arr2) { //Восстанавливает корректный порядок сообщений
    var i;
    if (Array.isArray(arr1)) for (i = arr1.length - 1; i >= 0; i--) arr2.push(arr1[i]);
    else {
        const newArr1 = [];
        while (true) {
            const next = arr1.next();
            if (next.done) break;
            newArr1.push(next.value);
        }
        for (i = newArr1.length-1; i >= 0; i--) arr2.push(newArr1[i]); //arr2.push(...newArr1.reverse())
    }
}

function _splitOnChunks(text, chunkSize, separator) { //Разбивает текст на блоки длиной chunkSize
    const chunks = [];
    for (var i = 0; i < text.length;) {
        let chunk = text.substr(i, chunkSize);
        if (chunk.length < chunkSize) {
            chunks.push(chunk);
            break;
        }
        const splitIndex = chunk.lastIndexOf(separator);
        if (splitIndex + 1) { //Если разделитель найден
            chunk = chunk.substr(0, splitIndex);
            i += separator.length;
        }
        chunks.push(chunk);
        i += chunk.length;
    }
    return chunks;
}
