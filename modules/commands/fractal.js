const logger = require("../logger");
const images = require("images");

module.exports = class FractalCommand {
	constructor(client) {
		Object.assign(this, {
			name: 'fractal',
			aliases: ['chaos', 'attractors'],
			group: 'Рандом',
			description: 'Вы задаёте три параметра: Количество точек, координаты начальной точки, массив координат аттракторов(вершин). ' +
						 'Бот рисует начальную точку, затем случайным образом выбирает одну из вершин и строит точку между начальной ' + 
						 'точкой и вершиной. Это повторяется до тех пор, пока не будет построено указанное количество точек. Затем бот ' +
						 'выводит получившееся изображение. Подробнее об этом: <https://www.youtube.com/watch?v=Nx3_nX8UoMo>' +
						 '\nПример команды: `:P: fractal 400000, 2, 300;0, 600;600, 0;600`',
			allowedChannels: ['368410234110345226'],
			args: [
				{
					key: 'dotCount',
					prompt: 'Количество точек, которые будут построены(Число от 1 до 400000)\nПример: `400000`',
					type: 'number'
				},
				{
					key: 'denominator',
					prompt: 'Делитель суммы координат последней точки и аттрактора(Число больше 1)\nПример: `2`',
					type: 'number'
				},
				{
					key: 'attractors',
					prompt: 'Координаты вершин через запятую.(Числа больше 0)\nПример: `300;0, 600;600, 0;600`',
					type: 'number[][2]'
				}
			],
			client
		});
	}
	
	async run(msg, dotCount, denominator, attractors) {
		try {
			let img = images(600, 600).fill(0xFF, 0xFF, 0xFF);
			let coord = [300, 300];
			for (let i = 0; i < dotCount; i++) {
				img.drawDot(coord[0], coord[1]);
				let index = Math.floor(Math.random() * attractors.length);
				coord[0] = (coord[0] + +attractors[index][0])/denominator;
				coord[1] = (coord[1] + +attractors[index][1])/denominator;
			}
			await msg.channel.send({file: img.encode("png")});
			logger.debug('Команда была успешно обработана');
		} catch(err) {
			msg.channel.send("Во время обработки вашей команды произошла ошибка");
			logger.error("Произошла ошибка", err);
		}
	}
	
	async parseParam(msg) {
		try {
			const param = msg.content.replace(/.*?\s/, '').replace(/.*?(\s|$)/, '').split(/,\s?/);
			if (param.length < 3) return msg.channel.send("Вы указали только " + param.length + " параметра");
			if (!(/\d+/g).test(param[0])) return msg.channel.send("dotCount не указан, либо указан неверно");
			if (!(/\d+/g).test(param[1])) return msg.channel.send("denominator не указан, либо указан неверно");
			if (msg.author.id != "326476628152811520" && (isNaN(parseFloat(param[0])) || !isFinite(param[0]) || param[0] % 1 !== 0 || param[0] < 1 || param[0] > 400000)) return msg.channel.send("dotCount должен быть целым числом в интервале от 1 до 400000");
			let dotCount = +param[0];
			if (!(/\d{1,}/g).test(param[1])) return msg.channel.send("Вы не указали denominator, либо сдалали это не верно");
			let denominator = +param[1];
			if (msg.author.id != "326476628152811520" && denominator == 0) return msg.channel.send("На ноль нельзя делить даже тебе");
			if (denominator <= 1) return msg.channel.send("denominator должен быть больше единицы");
			param.shift();
			param.shift();
			for (let i = 0; i < param.length; i++) {
				param[i] = param[i].split(/;\s?/);
				if (msg.author.id != "326476628152811520" && (+param[i][0] < 0 || +param[i][1] < 0)) return msg.channel.send("attractors должен содержать только числа больше 0");
			}
			this.run(msg, dotCount, denominator, param);
		} catch(err) {
			msg.channel.send("Во время обработки параметров произошла ошибка");
			logger.error("Произошла ошибка", err);
		}
	}
}
