module.exports = {
    extends: ['plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        emcaVersion: 2018,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint/eslint-plugin', 'eslint-plugin-tsdoc'],
    root: true,
    rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/member-delimiter-style': [
            'warn',
            {
                multiline: {
                    delimiter: 'comma',
                    requireLast: true,
                },
                singleline: {
                    delimiter: 'comma',
                    requireLast: false,
                },
            },
        ],
        'tsdoc/syntax': 'warn',
        'require-jsdoc': 'warn',
        'jsdoc/check-tag-names': 'off',
        'jsdoc/require-param-type': 'off',
        'jsdoc/require-returns-type': 'off',
        'jsdoc/empty-tags': 'off',
    },
}
