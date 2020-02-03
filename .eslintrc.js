module.exports = {
	"env": {
		"commonjs": true,
		"es6": true,
		"node": true
	},
	"extends": "eslint:recommended",
	"globals": {
		"Atomics": "readonly",
		"SharedArrayBuffer": "readonly"
	},
	"parserOptions": {
		"ecmaVersion": 2018
	},
	"reportUnusedDisableDirectives": true,
	"rules": {
		"indent": [
			"error",
			4,
			{ "SwitchCase": 1 }
		],
		"linebreak-style": [
			"error",
			"windows"
		],
		"quotes": [
			"error",
			"double",
			{ "avoidEscape": true }
		],
		"semi": [
			"error",
			"always"
		],
		"no-mixed-spaces-and-tabs": [
			"error", 
			"smart-tabs"
		],
		"no-trailing-spaces": [
			"error"
		],
		"eol-last": [
			"error"
		],
		"no-case-declarations": [
			"off"
		],
		"no-constant-condition": [
			"error", 
			{ "checkLoops": false }
		],
		"comma-dangle": [
			"error"
		]
	}
};