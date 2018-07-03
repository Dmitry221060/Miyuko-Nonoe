const { download, findUser } = require('../util');
const logger = require("../logger");
const images = require("images");

module.exports = class BirthdayHatCommand {
    constructor(client) {
        Object.assign(this, {
            name: 'birthdayhat',
            aliases: ['bthdayhat'],
            group: 'Манипуляции с аватаром',
            description: 'Накладывает на аватар праздничный колпак',
            args: [
                {
                    key: 'user',
                    prompt: 'Пользователь, аватар которого нужно изменить',
                    type: 'user',
                    default: msg => msg.author.id
                }
            ],
            client
        });
    }
    
    async run(msg, user) {
        try {
            const userMember = msg.guild.members.get(user.userID);
            if (!userMember) return msg.channel.send("Пользователя нет на сервере");
            const avatarURL = userMember.user.displayAvatarURL;
            let avatar = await download(avatarURL);
            avatar = new Buffer(avatar.toString('base64'), 'base64');
            const extension = avatarURL.replace(/\?.*/g, '').replace(/.*\./g, '');
            await msg.channel.send({file: images(320, 320).draw(images(avatar).resize(320, 320), 0, 0).draw(images("assets/images/birthdayHat.png"), 0, 0).encode(extension)});
            logger.debug('Команда была успешно обработана');
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
    
    async parseParam(msg) {
        try {
            let param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '');
            if (!param) param = this.args[0].default(msg);
            const user = await findUser(this.client, param);
            if (!user) return msg.channel.send("Пользователь не найден");
            this.run(msg, user);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
}
