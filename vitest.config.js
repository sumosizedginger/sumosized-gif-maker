import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        include: ['tests/**/*.test.js'],
        exclude: ['.dev_artifacts/**', 'node_modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json-summary'],
            include: ['js/modules/**/*.js'],
            exclude: ['js/vendor/**', 'js/worker/**']
        }
    }
});
