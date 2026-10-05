// 检查 main.js 中 import_obsidianN 命名空间：定义与引用必须一致
const fs = require('fs');
const raw = fs.readFileSync('D:/study/SmartTask/main.js', 'utf8');
const defined = new Set();
const used = new Set();
for (const m of raw.matchAll(/\bvar (import_obsidian\d*) = require\("obsidian"\)/g)) defined.add(m[1]);
for (const m of raw.matchAll(/\b(import_obsidian\d*)[\s.]/g)) {
	// 排除定义语句自身的标识符
	const lineEnd = raw.indexOf('\n', m.index);
	const line = raw.slice(m.index, lineEnd < 0 ? raw.length : lineEnd);
	if (/^var import_obsidian\d* = require/.test(line.trim())) continue;
	used.add(m[1]);
}
console.log('defined:', [...defined].sort().join(', '));
console.log('used:   ', [...used].sort().join(', '));
const missing = [...used].filter(u => !defined.has(u));
const unused = [...defined].filter(d => !used.has(d));
console.log('MISSING DEFINITIONS (runtime ReferenceError):', missing.length ? missing.join(', ') : 'NONE');
console.log('defined-but-unused (harmless):', unused.length ? unused.join(', ') : 'NONE');
process.exit(missing.length ? 1 : 0);
