const config = require("../config.json");
const winston = require("winston");
const path = require("path");

const loggerDebug = new (winston.Logger)({
    transports: [
        new winston.transports.Console({ 
            name: "debug",
            level: "debug",
            colorize: true,
            prettyPrint: true,
            silent: !config.logger.debug
        })
    ],
    levels: {
        debug: 0
    },
    colors: {
        debug: 'blue'
    },
    level: 'debug'
});

const loggerInfo = new (winston.Logger)({
    transports: [
        new winston.transports.File({ 
            name: "infoFile",
            filename: path.join(config.logger.path, 'Work logs/Info.txt'),
            level: "info",
            json: false,
            prettyPrint: true,
            timestamp: function () {
                let time = new Date();
                return '[' + ('0' + time.getDate()).slice(-2) + '.' + ('0' + (time.getMonth() + 1)).slice(-2) + '.' + time.getFullYear() + ' ' + ('0' + time.getHours()).slice(-2) + ':' + ('0' + time.getMinutes()).slice(-2) + ':' + ('0' + time.getSeconds()).slice(-2) + ']';;
            }
        }),
        new winston.transports.Console({ 
            name: "infoConsole",
            level: "info",
            colorize: true,
            prettyPrint: true,
            silent: !config.logger.debug
        })
    ],
    levels: {
        info: 0
    },
    colors: {
        info: 'yellow'
    },
    level: 'info'
});

const loggerError = new (winston.Logger)({
    transports: [
        new winston.transports.File({ 
            name: "errorFile",
            filename: path.join(config.logger.path, 'Work logs/Errors.txt'),
            level: "error",
            json: false,
            prettyPrint: true,
            timestamp: function () {
                let time = new Date();
                return '[' + ('0' + time.getDate()).slice(-2) + '.' + ('0' + (time.getMonth() + 1)).slice(-2) + '.' + time.getFullYear() + ' ' + ('0' + time.getHours()).slice(-2) + ':' + ('0' + time.getMinutes()).slice(-2) + ':' + ('0' + time.getSeconds()).slice(-2) + ']';;
            }
        }),
        new winston.transports.Console({ 
            name: "errorConsole",
            level: "error",
            colorize: true,
            prettyPrint: true,
            silent: !config.logger.debug
        })
    ],
    levels: {
        error: 0
    },
    colors: {
        error: 'red'
    },
    level: 'error'
});


module.exports = {
    debug: loggerDebug.debug,
    info: loggerInfo.info,
    error: loggerError.error,
    loggers: {
        debug: loggerDebug,
        info: loggerInfo, 
        error: loggerError
    }
}
