import shared from '@fi-workers/lint/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({ ...shared, ignorePatterns: ['package-lock.json', 'main.js'] });
