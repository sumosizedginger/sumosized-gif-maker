import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        exclude: ['.dev_artifacts/**', 'node_modules/**']
    }
});
