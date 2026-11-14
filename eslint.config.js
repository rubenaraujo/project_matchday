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
        files: ["sw.js"],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "script",
            globals: { self: "readonly", caches: "readonly", fetch: "readonly", URL: "readonly" }
        },
        rules: { "no-undef": "error" }
    },
    {
        files: ["**/*.test.js"],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "module",
            globals: {
                describe: "readonly",
                it: "readonly",
                expect: "readonly"
            }
        }
    },
    {
        files: ["**/*.js"],
        ignores: ["eslint.config.js", "lib/matchParser.js", "sw.js", "**/*.test.js", "channel-icons.json"],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "script",
            globals: {
                window: "readonly",
                document: "readonly",
                fetch: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                setInterval: "readonly",
                navigator: "readonly",
                localStorage: "readonly",
                // Declared in constants.js, used by script.js
                rssUrl: "readonly",
                channelIconsUrl: "readonly",
                teamLogosUrl: "readonly",
                nationalTeamFlagsUrl: "readonly",
                // Declared in lib/matchParser.js, used by script.js
                MatchParser: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
            eqeqeq: "warn"
        }
    },
    {
        files: ["constants.js"],
        rules: { "no-unused-vars": "off" }
    }
];
