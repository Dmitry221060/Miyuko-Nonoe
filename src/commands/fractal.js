const { isNumber } = require("../util");
const logger = require("../logger");
const { createCanvas } = require("canvas");

module.exports = class FractalCommand {
    constructor(client) {
        Object.assign(this, {
            name: "fractal",
            aliases: ["chaos", "attractors", "f"],
            group: "Рандом",
            description: "Вы задаёте три параметра: Количество точек, координаты начальной точки и массив координат аттракторов(вершин). " +
						 "Миюко нарисует начальную точку, затем случайным образом выберет одну из вершин и поставит точку между начальной " +
						 "точкой и вершиной. Это повторится столько раз, сколько было указано точек. Затем Миюко выведет получившееся " +
						 "изображение. Подробнее об этом: <https://www.youtube.com/watch?v=Nx3_nX8UoMo>\nВы также можете воспользоваться " +
						 "онлайн-инструментом для этой команды: <https://dmitry221060.github.io/>" +
						 "\nПример команды: `:M: fractal 400000, 2, 300;0, 600;600, 0;600`",
            args: [
                {
                    key: "dotCount",
                    prompt: "Количество точек, которые будут построены(Число от 1 до 400000)\nПример: `400000`",
                    type: "number"
                },
                {
                    key: "divider",
                    prompt: "Делитель суммы координат последней точки и аттрактора(Число больше 1)\nПример: `2`",
                    type: "number"
                },
                {
                    key: "attractors",
                    prompt: "Координаты вершин через запятую.(Числа больше 0)\nПример: `300;0, 600;600, 0;600`",
                    type: "number[][2]"
                }
            ],
            client
        });
    }

    async run(msg, dotCount, divider, attractors) {
        try {
            const canvas = createCanvas(600, 600);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const coord = [300, 300];
            for (let i = 0; i < dotCount; i++) {
                const pixel = (coord[0] + coord[1] * 600) * 4; //4 т.к. один пиксель занимает 4 элемента в массиве
                canvasData.data[pixel + 1] = 0; //G
                canvasData.data[pixel + 2] = 0; //B
                const index = Math.floor(Math.random() * attractors.length);
                coord[0] = Math.round((coord[0] + +attractors[index][0])/divider);
                coord[1] = Math.round((coord[1] + +attractors[index][1])/divider);
            }
            ctx.putImageData(canvasData, 0, 0);
            await msg.channel.send({file: canvas.toBuffer()});
            logger.debug("Команда была успешно обработана");
        } catch(err) {
            msg.channel.send("Во время обработки вашей команды произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }

    async parseParam(msg, param) {
        try {
            param = param.split(/,\s?/);
            if (param.length < 3) return msg.channel.send("Вы указали только " + param.length + " параметр(а)");
            if (!/^\d+$/.test(param[0])) return msg.channel.send("dotCount не указан, либо указан неверно");
            if (!/^\d+$/.test(param[1])) return msg.channel.send("divider не указан, либо указан неверно");
            if (!isNumber(param[0]) || param[0] % 1 !== 0 || param[0] < 1 || param[0] > 400000)
                return msg.channel.send("dotCount должен быть целым числом в интервале от 1 до 400000");
            let dotCount = +param[0];
            let divider = +param[1];
            if (divider <= 1) return msg.channel.send("divider должен быть больше единицы");
            param.shift();
            param.shift();
            for (let i = 0; i < param.length; i++) {
                param[i] = param[i].split(/;\s?/);
                if (+param[i][0] < 0 || +param[i][1] < 0) return msg.channel.send("attractors должен содержать только положительные числа");
            }
            this.run(msg, dotCount, divider, param);
        } catch(err) {
            msg.channel.send("Во время обработки параметров произошла ошибка");
            logger.error("Произошла ошибка", err);
        }
    }
};
