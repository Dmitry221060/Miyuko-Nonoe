const { fetchMessages, formatTimestamp } = require("./src/util");
const logger = require("./src/logger");
require("./src/client")().then(onInit).catch(fatalError);
const fs = require("fs");
let client;
const commandsUsage = {};

console.log("Скрипт запущен");
async function onInit(discordClient) {
    if (!discordClient) return fatalError("Дискорд не подключен");
    client = discordClient;
    await processNewMessages();
    setHandlers();
}

function setHandlers() {
    process.on("exit", clearBeforeExit);
    process.on("uncaughtException", fatalError);
    process.on("warning", fatalError);
    client.on("disconnect", fatalError);
    client.on("error", logger.error);
    client.on("message", onMessageCommands);
    client.on("message", onMessageOther);
    client.on("messageUpdate", onMessageUpdate);
    client.on("messageDelete", onMessageDelete);
}

async function processNewMessages() {
    try {
        //Добавить в логи пропущенные сообщения
        for (const channelID of client.config.bot.loggedChannels) {
            let LMID = await client.data.get(channelID + ".LMID");
            const toInsert = [];
            const messages = await fetchMessages(client, channelID, Infinity, LMID);
            if (!messages.length) continue;
            for (const msg of messages) {
                let content = msg.content.replace(/ {2,}/g, " ");
                if (msg.attachments.size && msg.attachments.first().url) {
                    if (content) content += "\n";
                    msg.content += msg.attachments.first().url;
                }
                if (content != "") toInsert.push({ "userID": msg.author.id, content });
            }
            LMID = messages[messages.length - 1].id;
            const actualLMID = await client.data.get(channelID + ".LMID");
            if (BigInt(LMID) > BigInt(actualLMID)) client.data.set(channelID + ".LMID", LMID);
            if (toInsert.length) await client.db.collection("logs").insertMany(toInsert);
        }
    } catch(err) {
        logger.error("При обработке пропущенных сообщений произошла ошибка", err);
    }
}

async function fatalError(err) {
    console.log(err);
    fs.appendFileSync("Work logs/Errors.txt", "\r\n" + formatTimestamp() + " " + (err.stack || err));
    await clearBeforeExit();
    if (!client || !client.destroy) return process.exit(1);
    client.destroy().catch(() => process.exit(1));
    setTimeout(() => process.exit(1), 5000).unref();
}

async function clearBeforeExit() {
    if (!client || !client.db || !client.db.close) return;
    await client.db.close();
}

//Обработчики
async function onMessageCommands(msg) {
    try {
        let MC = msg.content.replace(/ {2,}/g, " ");
        logger.debug("Guild: " + (msg.guild && msg.guild.name || "DM") + " | Channel: " + msg.channel.name +
					 " | Author: " + msg.author.username + " | Content: " + MC);
        if (msg.channel.type == "dm" || msg.channel.type == "group" || (MC.indexOf(":M:") != 0 && MC.indexOf(":Miyu:") != 0)) return;
        const user = await client.db.collection("users").findOne({ userID: msg.author.id });
        if (!user) await addUserInDB(msg);
        if (user.spamCount >= 5) return;
        if (checkForSpam(user)) return spamWarning(msg, user);
        const userCommand = MC.split(/\s/)[1].toLowerCase();
        const command = client.commands.filter(cmd => cmd.name == userCommand || (cmd.aliases && cmd.aliases.includes(userCommand))).first();
        if (!command) return;
        if (command.allowedChannels && !command.allowedChannels.includes(msg.channel.id)) return;
        if (command.allowedUsers && !command.allowedUsers.includes(msg.author.id.userID)) return;
        command.parseParam(msg, MC.replace(/(\S*\s?){2}/, ""));
    } catch(err) {
        logger.error("Не удалось обработать сообщение-команду", err);
    }
}

async function onMessageOther(msg) {
    try {
        msg.content = msg.content.replace(/ {2,}/g, " "); //Форматирование контента
        if (msg.attachments.size && msg.attachments.first().url) {
            if (msg.content) msg.content += "\n";
            msg.content += msg.attachments.first().url;
        }

        if (client.config.bot.loggedChannels.includes(msg.channel.id)) { //Дополнение БД
            client.data.set(msg.channel.id + ".LMID", msg.id);
            if (msg.content != "") client.db.collection("logs").insert({ "userID": msg.member.id, "content": msg.content }).catch(logger.error);
        }

        const username = msg.member && msg.member.displayName || msg.author.username; //Запись в логи
        let content = msg.content.replace(/\n/g, "\r\n#" + msg.channel.name + "\t" + username + ": ");
        fs.appendFileSync("Logs/Messages.txt", "\r\n#" + msg.channel.name + "\t" + username + ": " + content);
    } catch(err) {
        logger.error("Не удалось обработать сообщение", err);
    }
}

function onMessageUpdate (oldMsg, newMsg) {
    try {
        if (oldMsg.guild && oldMsg.guild.id == client.config.bot.serverID && oldMsg.content != newMsg.content) {
            let oldContent = oldMsg.content;
            let newContent = newMsg.content;
            if (oldMsg.attachments.size && oldMsg.attachments.first().url) {
                if (oldMsg.content != "") oldContent += "\r\n" + oldMsg.attachments.first().url;
                else oldContent = oldMsg.attachments.first().url;
            }
            if (newMsg.attachments.size && newMsg.attachments.first().url) {
                if (newMsg.content != "") newContent += "\r\n" + newMsg.attachments.first().url;
                else newContent = newMsg.attachments.first().url;
            }
            const txt = "\r\n" + formatTimestamp() + "  #" + oldMsg.channel.name + " " + oldMsg.member.displayName + ' "' + oldContent + '"  >  "' + newContent + '"';
            fs.appendFileSync("Logs/Edited messages.txt", txt);
        }
    } catch(err) {
        logger.error("Не удалось обработать обновление сообщения", err);
    }
}

function onMessageDelete (delMsg) {
    try {
        if (delMsg.guild && delMsg.guild.id == client.config.bot.serverID) {
            let delContent = delMsg.content;
            if (delMsg.attachments.size && delMsg.attachments.first().url) {
                if (delContent != "") delContent += "\r\n" + delMsg.attachments.first().url;
                else delContent = delMsg.attachments.first().url;
            }
            const txt = "\r\n" + formatTimestamp() + "  #" + delMsg.channel.name + " " + delMsg.member.displayName + ' "' + delContent + '"';
            fs.appendFileSync("Logs/Deleted messages.txt", txt);
        }
    } catch(err) {
        logger.error("Не удалось обработать удаление сообщения", err);
    }
}

//Прочее
function checkForSpam(user) {
    const now = Date.now();
    const lastUsage = commandsUsage[user.userID];
    commandsUsage[user.userID] = now;
    if (!lastUsage) return false;
    const ratelimit = 1 + 2*(user.spamCount >= 3);
    return ~~((now - lastUsage)/1000) < ratelimit;
}

function spamWarning(msg, user) {
    user.spamCount++;
    const ratelimit = 1 + 2*(user.spamCount >= 3);
    let reply = "Вы слишком часто используете команды(Ваш интервал между командами - " + ratelimit + " секунд).\n";
    if (user.spamCount < 3) reply += "После получения 3-х предупреждений этот интервал будет увеличен на 2 секунды.";
    else if (user.spamCount < 5) reply += "После получения 5-ти предупреждений бот перестанет реагировать на вас.";
    else reply = "Вы слишком часто использовали команды, бот больше не будет реагировать на вас.";
    msg.reply(reply);
    client.db.collection("users").update({ "userID": user.userID }, { $inc: { "spamCount": 1 } }).catch(logger.error);
}

function addUserInDB(msg) {
    return new Promise((resolve, reject) => {
        client.db.collection("users").insert({
            userID: msg.author.id,
            userLogin: msg.author.username,
            lastMessageDate: Date.now(),
            spamCount: 0,
            shortcuts: {}
        }).then(resolve).catch(reject);
    });
}

const AFKInterval = setInterval(async () => { //Выдача роли АФК раз в час
    if (client.config.bot.AFKRoleID === null) return clearInterval(AFKInterval);
    try {
        const twoWeeksAgo = Date.now() - 2*7*24*60*60*1000;
        const users = await client.db.collection("users").find({ "lastMessageDate": { $lt: twoWeeksAgo } }).toArray();
        if (!users.length) return;
        for (let i = 0; i < users.length; i++) {
            const member = client.guilds.get(client.config.bot.serverID).members.get(users[i].userID);
            if (member) await member.addRole(client.config.bot.AFKRoleID);
        }
    } catch(err) {
        logger.error("Не удалось выдать роли АФК", err);
    }
}, 1*60*60*1000).unref();
