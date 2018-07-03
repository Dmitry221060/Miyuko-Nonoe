const logger = require("./logger");
const http = require('http');
const https = require('https');

class Util {
    static wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    static randomRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    static async findUser(client, param) {
        if (typeof param == "string") {
            if (!isNaN(parseFloat(param)) && isFinite(param)) { //Если параметр - число, преобразованое в строку
                const data = await client.db.collection('users').findOne({userID: param});
                if (data) {
                    if (data.userID == "326476628152811520")
                        data.userName = "Dmitry221060";
                    return data;
                } else {
                    return 0;
                }
            } else {
                const data = await client.db.collection('users').findOne({$or: [{userName: param}, {userLogin: param}]});
                if (data) {
                    if (data.userID == "326476628152811520")
                        data.userName = "Dmitry221060";
                    return data;
                } else {
                    return 0;
                }
            }
        } else {
            throw new TypeError('param is a ' + typeof param + ' but expected a string');
        }
    }
    
    static removePings(text) {
        return text.replace(/@/g, '\\@​').replace("<:Plan:334293257850978304>", "​<:Plan:334293257850978304>").replace(":Plan:", "​:Plan:").replace(":P:", "​:P:");
    }
    
    static download(link) {
        const prom = new Promise((resolve, reject) => {
            try {
                let protocol;
                if (link.indexOf("https") == 0) protocol = https;
                else if (link.indexOf("http") == 0) protocol = http;
                else throw new Error("Incorrect link");
                protocol.get(link, res => {
                    let content = [];
                    res.on('data', chunk => content.push(chunk));
                    res.on('end', () => { 
                        const data = Buffer.concat(content);
                        resolve(data);
                    });
                });
            } catch (err) {
                reject(err);
            }
        });
        return prom;
    }
}

module.exports = Util;
