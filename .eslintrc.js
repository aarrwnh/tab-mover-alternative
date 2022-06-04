module.exports = {
	root: true,
	env: {
		node: true,
		browser: true,
		webextensions: true
	},
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		allowImportExportEverywhere: true,
		tsconfigRootDir: __dirname,
		project: [
			"tsconfig.json"
		]
	},
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@typescript-eslint/recommended-requiring-type-checking",
		"plugin:@typescript-eslint/recommended"
	],
	rules: {
		"arrow-parens": 2,
		"no-empty": 0,
		"quotes": 0,
		"@typescript-eslint/no-unsafe-member-access": 0,
		"@typescript-eslint/no-floating-promises": 0,
		"@typescript-eslint/no-misused-promises": 0,
		"brace-style": [
			1,
			"stroustrup"
		],
		"no-use-before-define": 0,
		"strict": [
			"warn",
			"function"
		],
		"no-fallthrough": 0,
		"no-prototype-builtins": 0,
		"no-useless-escape": 0,
		"no-extra-boolean-cast": 0,
		"no-control-regex": 0,
		"no-undef": 0,
		"semi": [
			"error",
			"always"
		],
		"no-case-declarations": "warn",
		"no-unused-expressions": [
			"warn",
			{
				"allowTernary": true,
				"allowShortCircuit": true
			}
		],
		"no-dupe-args": "error",
		"no-dupe-keys": "error",
		"no-extra-semi": "warn",
		"no-func-assign": "error",
		"no-inner-declarations": "error",
		"prefer-const": [
			"warn",
			{
				"destructuring": "all",
				"ignoreReadBeforeAssign": false
			}
		],
		"use-isnan": "error",
		"array-bracket-newline": [
			"error",
			"consistent"
		],
		"array-bracket-spacing": [
			"error",
			"never",
			{
				"singleValue": false,
				"arraysInArrays": true
			}
		],
		"no-extra-bind": "warn",
		"no-unused-vars": 2,
		"@typescript-eslint/no-unused-vars": [
			"warn",
			{
				"argsIgnorePattern": "^_",
				"varsIgnorePattern": "^_"
			}
		],
		"@typescript-eslint/explicit-module-boundary-types": 0,
		"@typescript-eslint/no-non-null-assertion": "warn",
		"@typescript-eslint/no-this-alias": "warn",
		"@typescript-eslint/no-empty-function": 0,
		"@typescript-eslint/no-var-requires": 0,
		"@typescript-eslint/ban-ts-comment": 0,
		"@typescript-eslint/ban-ts-ignore": 0,
		"@typescript-eslint/interface-name-prefix": 0,
		"@typescript-eslint/no-explicit-any": 0,
		"@typescript-eslint/prefer-as-const": "warn",
		"@typescript-eslint/explicit-function-return-type": 0,
		"@typescript-eslint/member-delimiter-style": 2,
		"@typescript-eslint/no-extra-semi": 2,
		"@typescript-eslint/quotes": [
			"error",
			"double",
			{
				"avoidEscape": true
			}
		],
		"@typescript-eslint/no-use-before-define": [
			1,
			{
				"functions": false,
				"classes": true,
				"variables": false
			}
		],
		"indent": [
			"error",
			"tab",
			{
				"SwitchCase": 1
			}
		],
		"linebreak-style": [
			"error",
			"unix"
		],
		"object-property-newline": [
			1,
			{
				"allowAllPropertiesOnSameLine": true
			}
		]
	}
}
