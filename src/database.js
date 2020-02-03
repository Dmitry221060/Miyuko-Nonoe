const MongoClient = require("mongodb").MongoClient;

module.exports = async config => {
    const client = await MongoClient.connect(config.mongodb.url, { useUnifiedTopology: true });
    return { mongoClient: client, db: client.db(config.mongodb.dbName) };
};

////////////////////////////////// users /////////////////////////////////////
///userID 				- ID пользователя								str///
///userLogin 			- Логин пользователя							str///
///lastMessageDate      - Дата последнего сообщения                     num///
///spamCount            - Количество предупреждений за спам             num///
///shortcuts 			- Список шорткатов								obj///
/// * <%shortcutName%: arr[][3]>										   ///
/// ** arr[][0]			- Ссылка на видео 								str///
/// ** arr[][1]			- Название видео 								str///
/// ** arr[][2]			- Источник добавления видео						str///
//////////////////////////////////////////////////////////////////////////////

/////////////////////////////////// logs /////////////////////////////////////
///userID 				- ID автора сообщения 							str///
///content 				- Текст сообщения 								str///
//////////////////////////////////////////////////////////////////////////////
