import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const targetVersion = process.env.npm_package_version;

let minAppVersion = "1.0.0";
if (process.argv[2]) minAppVersion = process.argv[2];

console.log("Updating manifest.json");
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const current = manifest.version;
manifest.version = targetVersion;
manifest.minAppVersion = minAppVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

console.log("Updating versions.json");
let versions: any = {};

try {
	versions = JSON.parse(readFileSync("versions.json", "utf8"));
} catch (e) {
	console.log("File not found, creating new...");
}

versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");
