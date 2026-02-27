import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                FFmpeg: "readonly",
                GIF: "readonly",
                ColorThief: "readonly",
                lucide: "readonly",
                CONFIG: "readonly",
                alert: "readonly"
            }
        },
        rules: {
            "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "no-console": "off",
        }
    },
    eslintConfigPrettier
];
