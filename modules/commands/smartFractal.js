const { random } = require('../util');
const logger = require("../logger");
const images = require("images");

module.exports = class SmartFractal {
	constructor(client) {
		Object.assign(this, {
			name: 'smartfractal',
			aliases: ['smartchaos', 'formulas'],
			group: 'Рандом',
			description: 'Команда рисующая фрактал методом хаоса, используя заданные формулы.' +
						 '\nПример команды: `:P: smartChaos 4000000, 300;600, 60, [(0 0);(0 0.16);1], [(0.85 0.04);(-0.04 0.85 1.6);85], [(0.2 -0.26);(0.23 0.22 1.6);7], [(-0.15 0.28);(0.26 0.24 0.44);7]`',
			allowedChannels: ['516227144167325706'],
			args: [
				{
					key: 'dotCount',
					prompt: 'Количество точек, которые будут построены(Число от 1 до 4000000)\nПример: `4000000`',
					type: 'number'
				},
				{
					key: 'startPoint',
					prompt: 'Начало координат\nПример: `300;600`',
					type: 'number[2]'
				},
				{
					key: 'zoom',
					prompt: 'Во сколько раз увеличить график\nПример: `60`',
					type: 'number'
				},
				{
					key: 'formulas',
					prompt: 'Массив формул, состоящих из трёх элементов, где первый - матрица Х, второй - матрица Y, третий - вероятность применения формулы. Матрицы состоят из трёх чисел, где первое - множитель X, второе - множитель Y, третье - множитель единицы.\nПример: `[(0 0);(0 0.16);1], [(0.85 0.04);(-0.04 0.85 1.6);85], [(0.2 -0.26);(0.23 0.22 1.6);7], [(-0.15 0.28);(0.26 0.24 0.44);7]`',
					type: 'number[][3](number[3]; number[3]; number)\nИли number[][3](number[2]; number[2]; number)'
				}
			],
			client
		});
	}
	
	async run(msg, dotCount, startPoint, zoom, formulas) {
		try {
			let img = images(600, 600).fill(0xFF, 0xFF, 0xFF);
			let coord = [0, 0];
			let summ = 0;
			formulas.filter(item => {summ += item[2]; return true;});
			for (let i = 0; i < dotCount; i++) {
				let randomN = Math.random();
				for (let j = 0; j < formulas.length; j++) {
					randomN -= formulas[j][2]/summ;
					if (randomN <= 0) {
						coord[0] = formulas[j][0][0]*coord[0] + formulas[j][0][1]*coord[1] + formulas[j][0][2];
						coord[1] = formulas[j][1][0]*coord[0] + formulas[j][1][1]*coord[1] + formulas[j][1][2];
						img.drawDot(Math.round(coord[0]*zoom+startPoint[0]), Math.round(Math.abs(coord[1]*zoom-startPoint[1])));
						break;
					}
				}
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
			if (param.length < 2) return msg.channel.send("Вы указали только " + param.length + " параметра");
			if (!(/\d+/g).test(param[0])) return msg.channel.send("dotCount не указан, либо указан неверно");
			if (!(/\d+;\d+/g).test(param[1])) return msg.channel.send("startPoint не указан, либо указан неверно");
			if (!(/\d+/g).test(param[2])) return msg.channel.send("zoom не указан, либо указан неверно");
			if (isNaN(parseFloat(param[0])) || !isFinite(param[0]) || param[0] % 1 !== 0 || param[0] < 1 || param[0] > 4000000) return msg.channel.send("dotCount должен быть целым числом в интервале от 1 до 4000000");
			let dotCount = +param[0];
			let startPoint = param[1].split(";");
			let zoom = +param[2];
			if (!startPoint[0]) startPoint[0] = 0;
			if (!startPoint[1]) startPoint[1] = 0;
			startPoint[0] = Number(startPoint[0]);
			startPoint[1] = Number(startPoint[1]);
			param.shift();
			param.shift();
			param.shift();
			for (let i = 0; i < param.length; i++) {
				if (!(/\[\(-?\d+(\.\d+)?\s-?\d+(\.\d+)?(\s-?\d+(\.\d+)?)?\);\s?\(-?\d+(\.\d+)?\s-?\d+(\.\d+)?(\s-?\d+(\.\d+)?)?\);\s?\d+(\.\d+)?\]/g).test(param[i])) return msg.channel.send("Вы ошиблись при вводе формул");
				param[i] = JSON.parse(param[i].replace(/\(/g, "[").replace(/\)/g, "]").replace(/\s/g, ",").replace(/;,|,;|;/g, ","));
				if (param[i].length != 3 || (param[i][0].length != 2 && param[i][0].length != 3) || (param[i][1].length != 2 && param[i][1].length != 3)) return msg.channel.send("Как минимум одна формула или матрица имеет недостаточно, либо слишком много элементов");
				if (!param[i][0][2]) param[i][0][2] = 0;
				if (!param[i][1][2]) param[i][1][2] = 0;
			}
			this.run(msg, dotCount, startPoint, zoom, param);
		} catch(err) {
			msg.channel.send("Во время обработки параметров произошла ошибка(Скорее всего вы неправильно записали матрицу)");
			logger.error("Произошла ошибка", err);
		}
	}
}