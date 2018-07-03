const { findUser } = require('../util');
const logger = require("../logger");
const levels = require("../../assets/json/levels");

module.exports = class BattleCommand {
    constructor(client) {
        Object.assign(this, {
            name: 'battle',
            aliases: ['fight'],
            group: 'Игры',
            description: 'Начинает сражение с запрошенным пользователем. Во время боя игроки ходят по очереди, выбирая одну из четырёх команд:\n' +
                         '1. **Ударить** - Вы наносите противнику от 0 до 100 единиц урона. Если вы вооружены - ваш урон в два раза больше, если' +
                         ' ваш соперник вооружён - он получит в 10 раз меньше урона.\n2. **Колдовать** - С вероятностью 25%, вы нанесёте от 100 ' +
                         'до 300 единиц урона. Если ваш противник вооружён - он получит в два раза меньше урона. Ваше вооружение не увеличивает ' +
                         'наносимый урон.\n3. **Вооружиться** - Вы вооружаетесь - ваши атаки наносят в два раза больше урона, вы получаете в 10 ' +
                         'раз меньше урона от атак оппонента и в два раза меньше урона от его колдовства. Если вы получаете урон или используете' +
                         ' обычную атаку - эффект вооружения пропадает.\n4. **Сдаться** - Вы складываете оружие и поднимаете белый флаг. Победа ' +
                         'достаётся вашему сопернику.\nПосле завершения боя оба игрока получают опыт, в зависимости от результатов боя. Накопив ' +
                         'достаточное количество опыта, вы получите новый уровень и сможете увеличить своё здоровье, урон или магический урон.  ',
            allowedChannels: ['368410234110345226'],
            args: [ 
                {
                    key: 'opponent',
                    prompt: 'Пользователь, с которым вы хотите сразиться',
                    type: 'user'
                },
                {
                    key: 'flags',
                    prompt: 'Дополнительные опции:\n```-find - начать поиск соперников. В течении двух минут любой участник сможет принять ваш вызов```',
                    type: 'string',
                    optional: true
                }
            ],
            client,
            counter: 0,
            active: false,
            finders: new Set()
        });
    }
    
    async run(msg, user, opponent, flags) {
        try {
            if (flags == "-find") return this.findMode(msg, user);
            if (user.userID == opponent.userID) return msg.channel.send("Вы не можете сражаться с самим собой");
            const oppMember = msg.guild.members.get(opponent.userID);
            if (!oppMember) return msg.channel.send("Пользователя нет на сервере");
            if (oppMember.bot) return msg.channel.send("Боты не могут участвовать в играх");
            
            const filter = m => {return m.member.id == opponent.userID && (m.content.toLowerCase() == "да" || m.content.toLowerCase() == "нет")}
            await msg.channel.send("<@!" + opponent.userID + ">, вы принимаете вызов? (Да/Нет)");
            const answer = await msg.channel.awaitMessages(filter, {maxMatches: 1, time: 30000});
            if (!answer.size) return msg.channel.send('<@!' + user.userID + '> Команда отменена');
            if (answer.first().content.toLowerCase() == "нет") 
                return msg.channel.send("<@!" + user.userID + "> " + oppMember.displayName + " отклонил ваш вызов");
            this.startFight(msg, user, opponent);
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async parseParam(msg) {
        try {
            let param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '').split(/\s/);
            const user = await findUser(this.client, msg.author.id);
            if (!user) return msg.channel.send("Вы не можете использовать команды, напишите Технику в ЛС");
            if (!param.join('')) return msg.channel.send("Вы не указали пользователя");
            if (param[param.length - 1] == "-find") return this.run(msg, user, null, "-find");
            const opponent = await findUser(this.client, param.join(' '));
            if (!opponent) return msg.channel.send("Пользователь не найден");
            this.run(msg, user, opponent);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async findMode(msg, user) {
        try {
            if (this.active) return msg.channel.send("Вы не можете искать противников, пока идёт бой");
            if (this.finders.has(user.userID)) return msg.channel.send("Вы уже начали поиск соперников");
            this.finders.add(user.userID);
            const filter = m => { return m.content.toLowerCase() == "принять вызов" && m.author.id != user.userID}
            await msg.channel.send((user.userName || user.userLogin) + " ищет противников! Чтобы ответить на его вызов напишите \"Принять вызов\"");
            const answer = await msg.channel.awaitMessages(filter, {maxMatches: 1, time: 120000});
            this.finders.delete(user.userID)
            if (!answer.size) return msg.channel.send("Никто не осмелился принять вызов " + (user.userName || user.userLogin) + "...");
            const opponent = await findUser(this.client, answer.first().author.id);
            if (!opponent) return msg.channel.send("Вы не можете использовать команды, напишите Технику в ЛС");
            await msg.channel.send("<@!" + user.userID + "> соперник найден!");
            this.startFight(msg, user, opponent);
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
            this.finders.clear();
        }
    }
    
    async startFight(msg, user, opponent) {
        try {
            if (this.active) return msg.channel.send("Нельзя начать бой, пока идёт другой");
            this.fight = true;
            user = {
                id: user.userID,
                user: msg.guild.members.get(user.userID),
                name: user.userName || user.userLogin,
                health: 500 + user.battle.bonusHealth,
                battle: user.battle,
                guard: false,
                userTurn: false,
                getedExp: 0
            }
            opponent = {
                id: opponent.userID,
                user: msg.guild.members.get(opponent.userID),
                name: opponent.userName || opponent.userLogin,
                health: 500 + opponent.battle.bonusHealth,
                battle: opponent.battle,
                guard: false,
                getedExp: 0
            }
            let winner;
            let loser;
            let noMsg = false;
            logger.debug('---Начался бой');
            while (user.health > 0 && opponent.health > 0) {
                const curentUser = user.userTurn ? user : opponent;
                const targetUser = !user.userTurn ? user : opponent;
                if (noMsg) {
                    noMsg = false;
                } else {
                    await msg.channel.send(
                        "<@!" + curentUser.id + ">, выберите действие: **ударить**, **вооружиться**, **колдовать**, или **сдаться**?\n" +
                        "**" + user.name + "**: " + user.health + "ХП\n" +
                        "**" + opponent.name + "**: " + opponent.health + "ХП"
                    );
                }
                const turn = await msg.channel.awaitMessages(data => data.member.id === curentUser.id, {max: 1, time: 30000});
                if (!turn.size) {
                    await msg.channel.send("Время вышло");
                    winner = targetUser;
                    loser = curentUser;
                    break;
                }
                const choose = turn.first().content.toLowerCase();
                if (choose == "ударить") {
                    let damage = Math.floor(Math.random() * 100) + 1;
                    damage = targetUser.guard ? Math.floor(damage / 10) : damage;
                    damage += curentUser.battle.bonusDamage;
                    damage = curentUser.guard ? Math.floor(damage * 2) : damage;
                    targetUser.health -= damage;
                    curentUser.guard = false;
                    targetUser.guard = false;
                    await msg.channel.send(curentUser.name + " наносит **" + damage + "** единиц урона!");
                    user.userTurn = !user.userTurn;
                } else if (choose == "вооружиться") {
                    curentUser.guard = true;
                    await msg.channel.send(curentUser.name + " вооружается!");
                    user.userTurn = !user.userTurn;
                } else if (choose == "колдовать") {
                    const miss = Math.floor(Math.random() * 4);
                    if (!miss) {
                        let damage = Math.floor(Math.random() * (300 - 100 + 1)) + 100 + curentUser.battle.bonusMagic;
                        damage = targetUser.guard ? Math.floor(damage / 2) : damage;
                        targetUser.health -= damage;
                        targetUser.guard = false;
                        await msg.channel.send(curentUser.name + " наносит **" + damage + "** единиц урона!");
                    } else {
                        await msg.channel.send(curentUser.name + " промахивается!");
                    }
                    user.userTurn = !user.userTurn;
                } else if (choose == "сдаться") {
                    await msg.channel.send(curentUser.name + " бежит с поля боя!");
                    winner = targetUser;
                    loser = curentUser;
                    break;
                } else if ((choose.indexOf("выберите действие: **ударить**, **вооружиться**, **колдовать**, или **сдаться**?" ) + 1)) {
                    noMsg = true;
                } else {
                    await msg.channel.send("Неправильное действие");
                }
            }
            logger.debug('---Бой закончился');
            if (!winner) {
                if (user.health > opponent.health) {
                    winner = user;
                    loser = opponent;
                } else {
                    winner = opponent;
                    loser = user;
                }
            }
            winner.getedExp = Math.floor((500 - loser.health) / 5) + Math.floor(Math.random() * 10) + (loser.health < 250 ? 50 : 0);
            loser.getedExp = Math.floor((500 - winner.health) / 5) + Math.floor(Math.random() * 10);
            await msg.channel.send(
                "Матч окончен!\n" +
                "**Победитель**: " + winner.name + " (" + winner.health + "ХП) +" + winner.getedExp + "exp\n" +
                "**Проигравший**: " + loser.name + " (" + loser.health + "ХП) +" + loser.getedExp + "exp"
            );
            if (winner.battle.exp + winner.getedExp >= levels[winner.battle.lvl + 1]) {
                winner.battle.lvl++;
                await msg.channel.send(
                    "<@!" + winner.id + "> вы получили " + winner.battle.lvl + " уровень!\n" +
                    "Выберите бонус: **здоровье**, **урон** или **магия** (Через минуту бонус будет выбран случайно)"
                );
                await this.levelUP(msg, winner);
                this.counter = 0;
            } else {
                await this.client.db.collection('users').update({"userID": winner.id}, {$inc: {"battle.exp": winner.getedExp}});
            }
            if (loser.battle.exp + loser.getedExp >= levels[loser.battle.lvl + 1]) {
                loser.battle.lvl++;
                await msg.channel.send(
                    "<@!" + loser.id + "> вы получили " + loser.battle.lvl + " уровень!\n" +
                    "Выберите бонус: **здоровье**, **урон** или **магия** (Через минуту бонус будет выбран случайно)"
                );
                await this.levelUP(msg, loser);
                this.counter = 0;
            } else {
                await this.client.db.collection('users').update({"userID": loser.id}, {$inc: {"battle.exp": loser.getedExp}});
            }
            logger.debug('Команда была обработана успешно');
            this.fight = false;
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
            this.fight = false;
        }
    }
    
    async levelUP(msg, user) {
        try {
            while (this.counter < 3) {
                let bonus = await msg.channel.awaitMessages(data => data.member.id == user.id, {max: 1, time: 60000});
                if (!bonus.size) {
                    let randChoose = ["здоровье", "урон", "магия"];
                    bonus = randChoose[Math.floor(Math.random() * randChoose.length)];
                } else {
                    bonus = bonus.first().content.toLowerCase();
                }
                if (bonus == "здоровье") {
                    await this.client.db.collection('users').update({"userID": user.id}, {
                        $inc: {
                            "battle.bonusHealth": 5, 
                            "battle.lvl": 1, 
                            "battle.exp": (user.battle.exp + user.getedExp - levels[user.battle.lvl]) - user.battle.exp
                        }
                    });
                    return await msg.channel.send("Здоровье было увеличено на 5");
                } else if (bonus == "урон") {
                    await this.client.db.collection('users').update({"userID": user.id}, {
                        $inc: {
                            "battle.bonusDamage": 1, 
                            "battle.lvl": 1, 
                            "battle.exp": (user.battle.exp + user.getedExp - levels[user.battle.lvl]) - user.battle.exp
                        }
                    });
                    return await msg.channel.send("Урон был увеличен на 1");
                } else if (bonus == "магия") {
                    await this.client.db.collection('users').update({"userID": user.id}, {
                        $inc: {
                            "battle.bonusMagic": 5, 
                            "battle.lvl": 1, 
                            "battle.exp": (user.battle.exp + user.getedExp - levels[user.battle.lvl]) - user.battle.exp
                        }
                    });
                    return await msg.channel.send("Магический урон был увеличен на 5");
                } else {
                    await msg.channel.send("Несуществующий бонус");
                    this.counter++;
                }
            }
            await channel.send("Вы три раза неверно выбрали бонус, поэтому он будет выбран случайно");
            let randChoose = [
                ["bonusHealth", 5, "Здоровье было увеличено на 5"], 
                ["bonusDamage", 1, "Урон был увеличен на 1"], 
                ["bonusMagic", 5, "Магический урон был увеличен на 5"]
            ];
            randChoose = randChoose[Math.floor(Math.random() * randChoose.length)];
            bonus = "battle." + randChoose[0];
            await this.client.db.collection('users').update({"userID": user.id}, {
                $inc: {
                    [bonus]: randChoose[1], 
                    "battle.lvl": 1, 
                    "battle.exp": (user.battle.exp + user.getedExp - levels[user.battle.lvl])
                }
            });
            await msg.channel.send(randChoose[2]);
        } catch(err) {
            msg.channel.send("Во время обработки вашего ответа произошла ошибка, сообщите Технику в ЛС");
            logger.error("Произошла ошибка", err);
        }
    }
}
