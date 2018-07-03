const logger = require("../logger");

module.exports = class TemplateCommand {
    constructor(client) {
        Object.assign(this, {
            name: 'template',
            aliases: ['template', 'template'],
            group: 'template',
            description: 'Template',
            allowedChannels: ['368410234110345226'], //Каналы, в которых будет работать команда
            allowedUsers: ['368410234110345226'], //Пользователи, у которых будет работать команда
            args: [ //Передаваемые параметры
                {
                    key: 'TEMPLATE', //Имя передаваемой переменной
                    prompt: 'TEMPLATE', //Описание того, что должно быть в параметре
                    type: 'TEMPLATE', //Тип передаваемого параметра
                    optional: 'TEMPLATE', //Параметр необязательный
                    default: 'TEMPLATE' //Значение по умолчанию
                }
            ],
            client
        });
    }
    
    async run(msg, param) {
        try {
            //...  
            logger.debug('Команда была успешно обработана');
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async parseParam(msg) {
        try {
            const param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '');
            this.run(msg, param);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
}
