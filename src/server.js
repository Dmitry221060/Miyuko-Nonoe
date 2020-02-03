const logger = require("./logger");
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();
let db;
const allowedIP = ["::1", "::ffff:127.0.0.1"]; //TODO создать middleware для этого

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => { //Основное пространство
    try {
        if (!allowedIP.includes(req.ip)) return res.status(403).end("403 Forbidden");
        res.header("Content-Type", "text/html; charset=utf-8");
        let end = fs.readFileSync("site/admin.html");
        res.end(end);
    } catch(err) {
        res.status(500).end("Error 500 " + err);
        logger.error(err);
    }
});

app.get("/data", (req, res) => { //Логи сообщений
    try {
        if (!allowedIP.includes(req.ip)) return res.status(403).end("403 Forbidden");
        res.header({
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json; charset=utf-8"
        });
        let length = 50;
        if (req.query["length"])
            length = req.query["length"];
        fs.readFile("Logs/Messages.txt", "utf8", (err, data) => {
            if (err) {
                res.status(500).end("Error 500 " + err);
                return logger.error(err);
            }
            data = data.split("\n");
            if (length > data.length) length = data.length;
            res.end(JSON.stringify(data.slice(-length)));
        });
    } catch(err) {
        res.status(500).end("Error 500 " + err);
        logger.error(err);
    }
});

app.get("/errors", (req, res) => { //Логи ошибок
    try {
        if (!allowedIP.includes(req.ip)) return res.status(403).end("403 Forbidden");
        res.header({
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "text/*; charset=utf-8"
        });
        fs.readFile("Work logs/Errors.txt", "utf8", (err, data) => {
            if (err) {
                res.status(500).end("Error 500 " + err);
                return logger.error(err);
            }
            res.end(data);
        });
    } catch(err) {
        res.status(500).end("Error 500 " + err);
        logger.error(err);
    }
});

app.get("/database", (req, res) => { //Управление базой данных
    try {
        if (!allowedIP.includes(req.ip)) return res.status(403).end("403 Forbidden");
        res.header("Content-Type", "text/html; charset=utf-8");
        let end = fs.readFileSync("site/database.html");
        res.end(end);
    } catch(err) {
        res.status(500).end("Error 500 " + err);
        logger.error(err);
    }
});

app.post("/database_api", (req, res) => { //API
    try {
        if (!allowedIP.includes(req.ip)) return res.status(403).end("403 Forbidden");
        res.header("Content-Type", "text/*; charset=utf-8");
        if (req.body) {
            let method = req.body.method; //Записываем, что требуется от БД (find/insert/update)
            let collectionName = req.body.collectionName;
            let param = JSON.parse(req.body.param);
            let requestedDB;
            if (collectionName == "logs") requestedDB = db.collection("logs");
            else if (collectionName == "users") requestedDB = db.collection("users");
            else if (collectionName == "botData") requestedDB = db.collection("botData");
            else res.status(400).end("Error 400 - Bad Request (CollectionName)");
            if (method == "find") {
                let query = param;
                let opts = { "_id": 0 };
                if (Array.isArray(param)) { //Если параметров несколько
                    query = param[0];
                    Object.assign(opts, param[1]);
                }
                if (query.content && query.content.$regex) query.content.$regex = new RegExp(query.content.$regex.replace(/^\/|\/g?i?m?$/g, ""));
                requestedDB.find(query, opts).toArray((err, data) => { //Поиск в запрошеной коллекции по запрошеным критериям, не выводя _id
                    if (err) {
                        res.status(500).end("Error 500 - Can't get this data " + err);
                        return logger.error(err);
                    }
                    res.header("Content-Type", "application/json; charset=utf-8");
                    res.end(JSON.stringify(data));
                });
            } else if (method == "update") {
                let param1 = param[0];
                let param2 = param[1];
                let param3 = param[2];
                if (Object.keys(param1).length == 0) { //Если не передан селектор элемента для обновления
                    res.status(400).end("Error 400 - Bad Request (Query)");
                } else if (Object.keys(param2).length == 0) { //Если не переданы параметры для обновления
                    res.status(400).end("Error 400 - Bad Request (Data)");
                } else {
                    requestedDB.updateMany(param1, param2, param3)
                        .then(() => res.end("Success"))
                        .catch(err => { res.status(500).end("Error 500 - Can't update this entry " + err); logger.error(err); });
                }
            } else if (method == "insert") {
                requestedDB.insertOne(param)
                    .then(() => res.end("Success"))
                    .catch(err => { res.status(500).end("Error 500 - Can't insert this entry " + err); logger.error(err); });
            } else res.status(400).end("Error 400 - Bad Request (Method)");
        } else res.status(400).end("Error 400 - Bad Request (Body)");
    } catch(err) {
        res.status(500).end("Error 500 " + err);
        logger.error(err);
    }
});

module.exports = (_db, _config) => {
    db = _db;
    app.listen(_config.express.port, () => logger.debug("Сервер запущен")).unref();
    return app;
};
