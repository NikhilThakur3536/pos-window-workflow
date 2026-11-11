import { FlatCompat } from '@eslint/eslintrc';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        rules: {
            '@typescript-eslint/ban-ts-comment': 'off',
            'react-hooks/exhaustive-deps': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        plugins: {
            unicorn: eslintPluginUnicorn,
        },
        rules: {
            'unicorn/filename-case': [
                'error',
                {
                    cases: {
                        kebabCase: true,
                    },
                },
            ],
        },
    },
];

export default eslintConfig;
