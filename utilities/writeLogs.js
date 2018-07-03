///Устаревший функционал
const fs = require('fs');
const logger = require("../modules/logger");

const text = process.argv[2];
const event = process.argv[3];
const time = new Date();


if (event == "crash") {
	fs.writeFile('Work logs/Crash.txt', '\r\n' + text + time, {"flag": "a"}, err => { if (err) logger.error(err) });
} else if (event == "run") {
	fs.writeFile('Work logs/Runtime.txt', '\r\n' + text + time, {"flag": "a"}, err => { if (err) logger.error(err) });
}
