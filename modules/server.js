const config = require("../config.json");
const logger = require("./logger");
const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser'); 
const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

let db;
require("./database")().then(data => db = data);

app.use(bodyParser.urlencoded({extended: true}));
app.use(fileUpload());

app.get('/', (req, res) => { //Основное пространство
    try {
        res.header('Content-Type', 'text/html; charset=utf-8');
        if (req.ip == config.ownerIP) {
            let end = fs.readFileSync('site/admin.html');
            res.end(end);
        } else { 
            let end = fs.readFileSync('site/user.html');
            res.end(end);
        }
    } catch(err) {
        logger.error(err);
    }
});

app.get('/data', (req, res) => { //Логи сообщений
    try {
        res.header({
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json; charset=utf-8'
        });
        let length = 50;
        if (req.query["length"]) length = req.query["length"];
        fs.readFile('Logs/Messages.txt', 'utf8', (err, data) => {
            if (err) {
                res.status(500).end('Error 500 ' + err);
                return logger.error(err);
            }
            data = data.split('\n');
            if (length > data.length) length = data.length;
            res.end(JSON.stringify(data.slice(-length)));
        });
    } catch(err) {
        logger.error(err);
    }
});

app.get('/monitor', (req, res) => { //Мониторинг процессов
    try {
        exec('"utilities/getProcess.bat"', (err, data) => {  
            if (err) {
                res.status(500).end('Error 500 ' + err);
                return logger.error(err);
            }
            res.header({
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json; charset=utf-8'
            });
            let answer = data.replace(/\s{2,}/g, '", "').replace(/^\s/, '["').replace(/\,\ \"$/, "]"); 
            res.end('{"dat": ' + answer + '}');
        });
    } catch(err) {
        logger.error(err);
    }
});

app.post('/kill', (req, res) => { //Завершение процессов
    try {
        let processName = req.body["name"];
        if (req.ip != config.ownerIP && processName != "node.exe" && processName != "cmd.exe") return res.status(403).end('Error 403 - Forbidden');
        res.header('Access-Control-Allow-Origin', '*');
        if (!req.body["name"]) {
            return res.status(400).end('Error 400 - Bad Request(name)');
        }
        exec('"utilities/killProcess.bat" ' + processName, (err, data) => {  
            if (err) {
                res.status(500).end('Error 500 ' + err);
                return logger.error(err);
            }
            res.end('OK');
        });
    } catch(err) {
        logger.error(err);
    }
});

///Устаревший функционал, "/explore" включает больше возможностей
app.get('/errors', (req, res) => { //Логи ошибок
    try {
        res.header({
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/*; charset=utf-8'
        });
        fs.readFile('Work logs/Errors.txt', 'utf8', (err, data) => {
            if (err) {
                res.status(500).end('Error 500 ' + err);
                return logger.error(err);
            }
            res.end(data);
        });
    } catch(err) {
        logger.error(err);
    }
});

app.get('/database', (req, res) => { //Управление базой данных
    try {
        if (req.ip != config.ownerIP) return res.status(403).end('Error 403 - Forbidden');
        res.header('Content-Type', 'text/html; charset=utf-8');
        let end = fs.readFileSync('site/database.html');
        res.end(end);
    } catch(err) {
        logger.error(err);
    }
});

app.post('/database_api', (req, res) => { //API
    try {
        if (req.ip != config.ownerIP) return res.status(403).end('Error 403 - Forbidden'); //Доступ только для хоста
        res.header({
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/*; charset=utf-8'
        });
        if (!req.body) return res.status(400).end('Error 400 - Bad Request (No param)');
        let method = req.body.method;
        let collectionName = req.body.collectionName;
        let param = JSON.parse(req.body.param);
        if (collectionName != "logs" && collectionName != "users" ) return res.status(400).end("Error 400 - Bad Request (CollectionName)");
        let requestedDB = db.collection(collectionName);

        if (method == "find") {
            if (Array.isArray(param)) { //Если параметров несколько
                let param1 = param[0];
                let param2 = param[1];
                param2["_id"] = 0; //Не выводить _id
                if (param1.content && param1.content.$regex) {
                    param1.content.$regex = new RegExp(param1.content.$regex.replace(/^\/|\/g?i?m?$/g, '')); //Поддержка RegExp
                }
                requestedDB.find(param1, param2).toArray((err, data) => {
                    if (err) {
                        res.status(500).end("Error 500 - Can't get this data " + err);
                        return logger.error(err);
                    }
                    res.header('Content-Type', 'application/json; charset=utf-8');
                    res.end(JSON.stringify(data));
                });
            } else { //Если параметр один
                if (param.content && param.content.$regex) param.content.$regex = new RegExp(param.content.$regex.replace(/^\/|\/g?i?m?$/g, ''));
                requestedDB.find(param, {"_id": 0}).toArray((err, data) => {
                    if (err) {
                        res.status(500).end("Error 500 - Can't get this data " + err);
                        return logger.error(err);
                    }
                    res.header('Content-Type', 'application/json; charset=utf-8');
                    res.end(JSON.stringify(data));
                });
            }
        } else if (method == "update") {
            let param1 = param[0];
            let param2 = param[1];
            let param3 = param[2];
            if (Object.keys(param1).length == 0) { //Если не передан селектор элемента для обновления
                res.status(400).end("Error 400 - Bad Request (Entry to update)");
            } else if (Object.keys(param2).length == 0) { //Если не переданы параметры для обновления
                res.status(400).end("Error 400 - Bad Request (Data to update)");
            } else {
                requestedDB.update(param1, param2, param3).then(() => { res.end("Success") })
                .catch(err => {
                    res.status(500).end("Error 500 - Can't update this entry. " + err);
                    logger.error(err);
                });
            }
        } else if (method == "insert") {
            requestedDB.insert(param).then(() => { res.end("Success") })
            .catch(err => {
                res.status(500).end("Error 500 - Can't add this entry. " + err);
                logger.error(err);
            });
        } else {
            res.status(400).end("Error 400 - Bad Request (Method)");
        }
    } catch(err) {
        logger.error(err);
    }
});

///Устаревший функционал, "/explore" включает больше возможностей
app.get('/download', (req, res) => { //Скачивание файлов
    try {
        if (req.ip != config.ownerIP) return res.status(403).end('Error 403 - Forbidden');
        res.header('Content-Type', 'text/html; charset=utf-8');
        if (req.query["logs"] != undefined) {
            res.download('Logs/Messages.txt', 'Messages.txt', err => {
                if (err) {
                    res.status(500).end("Error 500 - " + err);
                    return logger.error(err);
                }
            });
        } else if (req.query["script"] != undefined) {
            res.download('index.js', 'index.js', err => {
                if (err) {
                    res.status(500).end("Error 500 - " + err);
                    return logger.error(err);
                }
            });
        } else if (req.query["path"] != undefined) {
            fs.open(path.join(__dirname, "..", req.query["path"]), "r", err => {
                if (err) {
                    if (err.code == "ENOENT") return res.status(404).end('Error 404 - File Not Found');
                    res.status(500).end("Error 500 - " + err);
                    return logger.error(err);
                }
                
                res.download(path.join(__dirname, "..", req.query["path"]), err => {
                    if (err) {
                        res.status(500).end("Error 500 - " + err);
                        return logger.error(err);
                    }
                });
            });
        } else {
            res.end();
        }
    } catch(err) {
        logger.error(err);
    }
});

app.get('/update', (req, res) => { //Загрузка файлов
    try {
        if (req.ip != config.ownerIP) return res.status(403).end('Error 403 - Forbidden');
        res.header('Content-Type', 'text/html');
        fs.readFile('site/update.html', (err, data) => { 
            if (err) {
                logger.error(err);
                return res.status(500).end('Error 500 - ' + err);
            }
            res.end(data);
        });
    } catch(err) {
        logger.error(err);
    }
});

app.post('/update', (req, res) => { //API
    try {
        if (req.ip != config.ownerIP) return res.status(403).end('Error 403 - Forbidden');
        let fileName = path.parse(req.files.file.name).name;
        let filePath = path.join(__dirname, "..");
        let fileExtens = path.extname(req.files.file.name);
        if (req.body.name) fileName = req.body.name;
        if (req.body.path) filePath = path.join(filePath, req.body.path);
        filePath = path.join(filePath, fileName + fileExtens);
        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code == "ENOENT") { //Если файла с таким именем не существует - добавить его
                    fs.writeFile(filePath, req.files.file.data, 'utf8', err => {
                        if (err) {
                            logger.error(err);
                            return res.status(500).end('Error 500 ' + err);
                        }
                        res.end('OK');
                    });
                    return;
                } else {
                    logger.error(err);
                    return res.status(500).end('Error 500 ' + err);
                }
            } //Если файл с таким именем существует - сделать его бэкап и заменить на загруженный
            const leng = fs.readdirSync(path.join(__dirname, "..", "uploadBackups")).filter(f => f.indexOf(fileName) == 0).length;
            fs.writeFile(path.join(__dirname, "..", "uploadBackups", 
                                   path.join(req.body.path, fileName + "[" + leng + "]" + fileExtens).replace(/\//g, '-')
                                  ), content, 'utf8', err => {
                if (err) {
                    logger.error(err);
                    logger.info('Не удалось создать бэкап файла ' + filePath);
                    return res.status(500).end('Error 500 ' + err);
                }
                logger.info("Был создан бэкап файла " + filePath);
                fs.writeFile(filePath, req.files.file.data, 'utf8', err => {
                    if (err) {
                        logger.error(err);
                        return res.status(500).end('Error 500 ' + err);
                    }
                    res.end('OK');
                });
            });
        });
    } catch(err) {
        logger.error(err);
    }
});

app.get('/explore', async (req, res) => { //Динамичесский просмотр файлов и директорий
    try {
        res.header('Content-Type', 'text/html');
        let resData = [];
        const reqPath = req.query.path; 
        if (!reqPath) return res.end(fs.readFileSync("site/explore.html", "utf8"));
        if (fs.lstatSync(reqPath).isDirectory()) {
            res.header('Content-Type', 'application/json');
            const fileNames = fs.readdirSync(reqPath);
            for (const name of fileNames) {
                if (fs.lstatSync(path.join(reqPath, name)).isDirectory()) resData.push({ [name]: { "type": "dir" } });
                else resData.push({ [name]: { "type": "file", "extension": path.extname(name) } });
            }
            res.json({type: 'dir', files: resData});
        } else {
            res.header('Content-Type', 'text/plain');
            const ext = path.extname(reqPath);
            if (ext.match(/.(ico|png|jpg|jpeg|bmp|gif)/)) {
                res.json({ type: 'img', ext: ext.substr(1), content: Buffer.from(fs.readFileSync(reqPath)).toString('base64') });
            } else {
                res.json({ type: 'other', content: fs.readFileSync(reqPath, "utf8") });
            }
        }
    } catch(err) {
        if (err.code == "ENOENT") return res.status(404).end('Error 404, File Not Found');
        logger.error(err);
        res.status(500).end('Error 500 ' + err);
    }
});

app.use('/images', express.static('site/images', { dotfiles: "allow" }));

app.listen(config.express.port, () => logger.debug('Сервер запущен')).unref();

module.exports = app;
