import shared from '@fi-workers/lint/knip';
import type { KnipConfiguration } from 'knip';

const config: KnipConfiguration = { ...shared, entry: ['src/main.ts', 'esbuild.config.ts', 'version-bump.ts'] };
export default config;
