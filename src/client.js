const config = require("../config.json");
const Discord = require("discord.js");
const client = new Discord.Client();
const logger = require("./logger");
const BotData = require("./botData");

module.exports = async function setupClient() {
    const { db, mongoClient } = await require("./database")(config);
    logger.debug("База данных подключена");
    const app = require("./server")(db, config);
    config.bot.token = config.bot.token || process.argv[2];
    if (!config.bot.token) throw new Error("Токен не обнаружен. Следуйте инструкциям по настройке бота на главной странице GitHub репозитория");

    let groupNames = new Set();
    const commands = new Discord.Collection();
    let aliases = [];
    let groups = {};
    const commandClasses = require("require-all")({ //TODO избавиться от лишней зависимости
        dirname: __dirname + "/commands",
        filter: fileName => {
            if (fileName == "TEMPLATE.js") return;
            return fileName;
        },
        recursive: false
    });
    for (const commandClass in commandClasses) {
        const command = new commandClasses[commandClass](client);
        if (aliases.length) {
            for (const alias of command.aliases) {
                if (aliases.includes(alias)) throw "UnitTestError: Duplicated command alias \"" + alias + "\" for command " + command.name;
                if (alias != alias.toLowerCase()) throw "UnitTestError: camelCase alias \"" + alias + "\" for command " + command.name;
            }
        }
        aliases = aliases.concat(command.aliases);
        commands.set(command.name, command);
        groupNames.add(command.group);
    }
    groupNames = [...groupNames].sort((a, b) => a > b);
    for (const name of groupNames) groups[name] = commands.filter(command => command.group == name).array();

    Object.assign(client, {
        db,
        app,
        config,
        groups,
        commands,
        mongoClient,
        data: new BotData(client)
    });

    await client.login(config.bot.token);
    logger.debug("Аккаунт авторизован");
    return client;
};
