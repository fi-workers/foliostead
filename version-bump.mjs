import { readFileSync, writeFileSync } from "fs";

// npm version <patch|minor|major> 실행 시 호출된다.
// manifest.json / versions.json을 package.json 버전에 맞춰 갱신한다.
const targetVersion = process.env.npm_package_version;

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
if (!(targetVersion in versions)) {
	versions[targetVersion] = minAppVersion;
	writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");
}
