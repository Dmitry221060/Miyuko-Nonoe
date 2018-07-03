const Discord = require('discord.js'); 
const client = new Discord.Client();
const logger = require("./logger");
const config = require("../config.json");

module.exports = async function setupClient() {
    const db = await require('./database')();
    logger.debug('База данных подключена');
    const app = require('./server');
    
    let groupNames = new Set();
    const commands = new Discord.Collection();
    let groups = {}
    const temp = require('require-all')({
        dirname: __dirname + '/commands',
        filter: function (fileName) {
            if (fileName == "TEMPLATE.js") return;
            return fileName;
        }
    });
    for (const commandClass in temp) {
        const command = new temp[commandClass](client)
        commands.set(command.name, command);
        groupNames.add(command.group);
    }
    groupNames = [...groupNames].sort((a, b) => a > b);
    for (const name of groupNames) {
        groups[name] = commands.filterArray(command => command.group == name);
    }
    
    Object.assign(client, {
        db,
        app,
        groups,
        commands
    });
    await client.login(config.token);
    logger.debug('Аккаунт авторизован');
    return client;
}
