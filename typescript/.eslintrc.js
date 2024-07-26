module.exports = {
    root: true,
    overrides: [
        {
            files: ['src/**/*.ts', 'test/**/*.ts'],
            parser: '@typescript-eslint/parser',
            plugins: ['@typescript-eslint', 'prettier'],
            extends: [
                'eslint:recommended',
                'plugin:@typescript-eslint/recommended',
                'prettier',
            ],
        },
    ],
};
