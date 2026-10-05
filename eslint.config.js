// Minimal ESLint flat config for this static, dependency-free site.
module.exports = [
    {
        files: ["eslint.config.js", "lib/matchParser.js"],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "commonjs",
            globals: {
                module: "writable",
                require: "readonly"
            }
        }
    },
    {
        files: ["**/*.js"],
        ignores: ["eslint.config.js", "lib/matchParser.js", "channel-icons.json"],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "script",
            globals: {
                window: "readonly",
                document: "readonly",
                fetch: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                // Declared in constants.js, used by script.js
                rssUrl: "readonly",
                channelIconsUrl: "readonly",
                // Declared in lib/matchParser.js, used by script.js
                MatchParser: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
            eqeqeq: "warn"
        }
    }
];
