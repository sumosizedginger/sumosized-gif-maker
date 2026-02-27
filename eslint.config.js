import js from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                FFmpeg: 'readonly',
                GIF: 'readonly',
                ColorThief: 'readonly',
                lucide: 'readonly',
                CONFIG: 'readonly',
                alert: 'readonly',
                document: 'readonly',
                console: 'readonly',
                window: 'readonly',
                fetch: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                FileReader: 'readonly',
                Uint8Array: 'readonly',
                Promise: 'readonly',
                navigator: 'readonly',
                Math: 'readonly',
                parseInt: 'readonly',
                parseFloat: 'readonly',
                GifReader: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off'
        }
    },
    eslintConfigPrettier
];
