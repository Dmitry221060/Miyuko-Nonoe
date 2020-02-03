const logger = require("../logger");
const { findUser, wait, randomRange } = require("../util");
const words = ["огонь", "пли", "выстрел", "бам", "бах", "ба-бах", "пиу", "пиф-паф", "omae wa mou shindeiru"];

module.exports = class DuelCommand {
    constructor(client) {
        Object.assign(this, {
            name: "duel",
            aliases: ["shotduel", "sd", "d"],
            group: "Игры",
            description: "Вызывает пользователя на дуэль. После принятия вызова, через случайный промежуток времени, Миюко отправит " +
						 "сообщение с дальнейшими инструкциями.",
            args: [
                {
                    key: "opponent",
                    prompt: "Пользователь которого вы вызываете на дуэль",
                    type: "user"
                }
            ],
            client
        });
    }

    async run(msg, user, opponent) {
        try {
            if (user.userID == opponent.userID) return msg.channel.send("<@!" + user.userID + "> успешно застрелился.");
            const filterReady = m => {return m.member.id == opponent.userID && (m.content.toLowerCase() == "да" || m.content.toLowerCase() == "нет");};
            await msg.channel.send("<@!" + opponent.userID + ">, вы принимаете вызов? (Да/Нет)");
            const answer = await msg.channel.awaitMessages(filterReady, {maxMatches: 1, time: 30000});
            if (!answer.size) return msg.channel.send("Команда отменена");
            if (answer.first().content.toLowerCase() == "нет")
                return msg.channel.send("<@!" + user.userID + "> " + msg.guild.members.get(opponent.userID).displayName + " отклонил ваш вызов");
            await msg.channel.send("<@!" + user.userID + "> вызов принят. Приготовтесь...");
            await wait(randomRange(1000, 30000));
            const word = words[Math.floor(Math.random() * words.length)];
            await msg.channel.send('НАПИШИТЕ "' + word.toUpperCase().replace(/./g, "$&​") + '"!');
            const filterShoot = res => [opponent.userID, user.userID].includes(res.author.id) && res.content.toLowerCase() === word;
            const winner = await msg.channel.awaitMessages(filterShoot, {max: 1, time: 30000});
            if (!winner.size) return msg.channel.send("Похоже, победила дружба...");
            msg.channel.send("Победил: " + winner.first().author + "!");
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            if (!param) return msg.channel.send("Вы должны указать оппонента.");
            const user = await findUser(this.client, msg.author.id);
            const opponent = await findUser(this.client, param);
            if (!opponent) return msg.channel.send("Пользователь не найден или найдено несколько пользователей");
            this.run(msg, user, opponent);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
};
