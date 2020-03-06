export default {
    "env": {
        "node": true,
        "es6": true
    },
    "extends": "airbnb-base",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "script"
    },
    "rules": {
      "camelcase" : "off",
      "no-restricted-syntax" : "off",
      "no-console" : "off",
      "max-len": ['error', 120, 2, {
        ignoreUrls: true,
        ignoreComments: true,
        ignoreRegExpLiterals: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      }],
      "strict" : ["error","global"]
    }
};