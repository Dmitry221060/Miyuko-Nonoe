const config = require("../config.json");
const MongoClient = require('mongodb').MongoClient;
const logger = require("./logger");

async function runDB() {
    let db = await MongoClient.connect(config.mongodb.url);
    db.unref();
    return db;
};

module.exports = runDB;

////////////////////////////////// users /////////////////////////////////////
///userID               - ID пользователя                               str///
///userName             - Ник пользователя                              str///
///userLogin            - Логин пользователя                            str///
///lastMessageDate      - Дата последнего сообщения                     num///
///spamCount            - Количество предупреждений за спам             num///
///stat                 - Статистика использованных команд              obj///
/// * <%commandName%: num>                                                 ///
///battle               - Боевые характеристики                         obj///
/// * <lvl, exp, bonusHealth, bonusDamage, bonusMagic: num>                ///
//////////////////////////////////////////////////////////////////////////////

/////////////////////////////////// logs /////////////////////////////////////
///userID               - ID автора сообщения                           str///
///content              - Текст сообщения                               str///
//////////////////////////////////////////////////////////////////////////////
