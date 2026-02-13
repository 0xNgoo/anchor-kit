
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.{test,spec}.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
    },
});
