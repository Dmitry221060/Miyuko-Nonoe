const config = require("../config");
const { formatTimestamp } = require("./util");
const { inspect } = require("util");
const winston = require("winston");
const { combine, colorize, printf } = winston.format;
const path = require("path");


const leveling = winston.format((info, level) => info.level != level ? null : info); //Разделение сообщений по уровням
const timestamp = winston.format((info, short) => { //Удобное представление даты и времени
    info.timestamp = formatTimestamp();
    if (short) info.timestamp = "[" + info.timestamp.substring(12);
    return info;
});

const FileFormat = level => {
    return combine(
        leveling(level),
        timestamp(),
        printf(info => {
            let meta = "";
            for (const obj of info.meta) meta += "\r\n" + inspect(obj).replace(/\r?\n/g, "\r\n");
            return `${info.timestamp} ${info.level}: ${info.message}${meta}`;
        })
    );
};

const ConsoleFormat = level => {
    return combine(
        leveling(level),
        colorize(),
        timestamp(true),
        printf(info => {
            let meta = "";
            for (const obj of info.meta) meta += "\r\n" + inspect(obj, { colors: true });
            return `${info.timestamp} ${info.level}: ${info.message}${meta}`;
        })
    );
};

winston.addColors({
    error: "red",
    info:  "yellow",
    debug: "blue"
});

const logger = winston.createLogger({
    levels: {
        error: 0,
        info:  1,
        debug: 2
    },
    transports: [
        new winston.transports.File({
            filename: path.join(__dirname, "../Work logs/Errors.txt"),
            level: "error",
            format: FileFormat("error")
        }),
        new winston.transports.File({
            filename: path.join(__dirname, "../Work logs/Info.txt"),
            level: "info",
            format: FileFormat("info")
        }),
        new winston.transports.Console({
            silent: !config.logger.debug,
            level: "error",
            format: ConsoleFormat("error")
        }),
        new winston.transports.Console({
            silent: !config.logger.debug,
            level: "info",
            format: ConsoleFormat("info")
        }),
        new winston.transports.Console({
            silent: !config.logger.debug,
            level: "debug",
            format: ConsoleFormat("debug")
        })
    ]
});

module.exports = {
    error: (msg, ...splat) => module.exports.log("error", msg, splat),
    info:  (msg, ...splat) => module.exports.log("info",  msg, splat),
    debug: (msg, ...splat) => module.exports.log("debug", msg, splat),
    log: (level, msg, splat) => {
        if (typeof msg != "string") msg = inspect(msg);
        for (const meta of splat) if (meta instanceof Error && meta.message && meta.stack) meta.message = null;
        logger.log(level, msg, { meta: splat });
    }
};
