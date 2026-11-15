import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

// npm version <patch|minor|major> 실행 시 호출된다.
// manifest.json / versions.json을 package.json 버전에 맞춰 갱신한다.

interface Manifest {
	version: string;
	minAppVersion: string;
	[key: string]: unknown;
}

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function isManifest(value: unknown): value is Manifest {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof Reflect.get(value, 'version') === 'string' &&
		typeof Reflect.get(value, 'minAppVersion') === 'string'
	);
}

function isVersionMap(value: unknown): value is Record<string, string> {
	return (
		typeof value === 'object' && value !== null && Object.values(value).every((entry) => typeof entry === 'string')
	);
}

const targetVersion = process.env['npm_package_version'];
if (targetVersion === undefined || targetVersion.length === 0) {
	throw new Error('npm_package_version이 없습니다. `npm version`으로 실행하세요.');
}

const manifest = readJson('manifest.json');
if (!isManifest(manifest)) {
	throw new Error('manifest.json에 version/minAppVersion이 없습니다.');
}
const { minAppVersion } = manifest;
writeFileSync('manifest.json', `${JSON.stringify({ ...manifest, version: targetVersion }, null, '\t')}\n`);

const versions = readJson('versions.json');
if (!isVersionMap(versions)) {
	throw new Error('versions.json은 버전 → 최소 앱 버전 문자열 객체여야 합니다.');
}
if (!Object.hasOwn(versions, targetVersion)) {
	writeFileSync('versions.json', `${JSON.stringify({ ...versions, [targetVersion]: minAppVersion }, null, '\t')}\n`);
}
