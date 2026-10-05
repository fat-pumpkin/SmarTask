// A 方案布局重构补丁：smartTaskView.ts 功能模块 → 单行工具栏 + 面板容器
// 用法：node _patch_layout.js
const fs = require('fs');
const path = 'D:/study/SmartTask/src/smartTaskView.ts';
let s = fs.readFileSync(path, 'utf8');
const wasCrlf = s.includes('\r\n');
if (wasCrlf) s = s.split('\r\n').join('\n');

const missed = [];
const rep = (old, nw, label) => {
	if (s.indexOf(old) === -1) { missed.push(label); return; }
	s = s.split(old).join(nw);
};

// 1) 字段声明
rep(
	"\t// 新布局 DOM 元素\n\tprivate functionalModuleEl: HTMLElement | null = null;\n\tprivate row1El: HTMLElement | null = null;\n\tprivate row2El: HTMLElement | null = null;\n\tprivate quickCreatePanelEl: HTMLElement | null = null;\n\tprivate searchPanelEl: HTMLElement | null = null;\n\tprivate displayModuleEl: HTMLElement | null = null;\n\n\t// 旧布局 DOM 元素（兼容过渡）\n\tprivate headerEl: HTMLElement | null = null;\n\tprivate quickCreateEl: HTMLElement | null = null;\n\tprivate searchRowEl: HTMLElement | null = null;\n\tprivate filterPanelEl: HTMLElement | null = null;\n\tprivate contentEl: HTMLElement | null = null;",
	"\t// 布局 DOM 元素（A 方案：单行工具栏 + 面板容器）\n\tprivate functionalModuleEl: HTMLElement | null = null;\n\tprivate toolbarEl: HTMLElement | null = null;\n\tprivate filterBarEl: HTMLElement | null = null;\n\tprivate statsStripEl: HTMLElement | null = null;\n\tprivate statsBadgeEl: HTMLElement | null = null;\n\tprivate searchInputEl: HTMLInputElement | null = null;\n\tprivate panelContainerEl: HTMLElement | null = null;\n\tprivate displayModuleEl: HTMLElement | null = null;\n\tprivate contentEl: HTMLElement | null = null;\n\tprivate showStats = false;",
	'fields'
);

// 2) render()
rep(
	"\t\tthis.functionalModuleEl = this.mainEl.createDiv({ cls: 'functional-module' });\n\t\tthis.renderRow1();\n\t\tthis.renderRow2();\n\t\tthis.renderQuickCreatePanel();\n\t\tthis.renderSearchPanel();",
	"\t\tthis.functionalModuleEl = this.mainEl.createDiv({ cls: 'functional-module' });\n\t\tthis.renderToolbar();\n\t\tthis.renderFilterBar();\n\t\tthis.renderStatsStrip();\n\t\tthis.renderPanels();",
	'render'
);

// 3) updateTasks
rep(
	"\t\tthis.tasks = tasks;\n\t\tthis.allTags = allTags;\n\t\tthis.renderRow1();\n\t\tthis.renderRow2();\n\t\tthis.renderContent();",
	"\t\tthis.tasks = tasks;\n\t\tthis.allTags = allTags;\n\t\t// 只刷新统计徽章/统计条与内容，不重建工具栏（保持搜索框焦点）\n\t\tthis.updateStatsBadge();\n\t\tthis.renderStatsStrip();\n\t\tthis.renderContent();",
	'updateTasks'
);

// 4) 功能模块整段替换（分区注释 → renderContent 声明之前）
const startMark = '// ========== 新布局：功能模块 ==========';
const endMark = '\n\tprivate renderContent';
const startIdx = s.indexOf(startMark);
if (startIdx === -1) { missed.push('section-start'); }
else {
	const endIdx = s.indexOf(endMark, startIdx);
	if (endIdx === -1) { missed.push('section-end'); }
	else {
		let newSection = fs.readFileSync('D:/study/SmartTask/_functional_section_new.ts', 'utf8').replace(/\r\n/g, '\n');
		// 去掉文件末尾多余的换行，避免与 endMark 前导换行叠加成空行
		newSection = newSection.replace(/\n+$/, '');
		s = s.slice(0, startIdx) + newSection + endMark + s.slice(endIdx + endMark.length);
	}
}

// 5) 空状态引导按钮
const guideRe = /guideBtn\.addEventListener\('click', \(\) => \{[\s\S]*?\n(\t+)\}\);/;
if (!guideRe.test(s)) { missed.push('empty-guide'); }
else {
	s = s.replace(guideRe, (m, ind) => {
		return "guideBtn.addEventListener('click', () => {\n" + ind + "\tthis.showQuickCreate = true;\n" + ind + "\tthis.showSearch = false;\n" + ind + "\tthis.renderPanels();\n" + ind + "});";
	});
}

// 6) 标签点击切换筛选后的重渲染调用
const tagRe = /this\.showSearch = true;\n(\t+)this\.renderSearchPanel\(\);\n(\t+)this\.renderRow1\(\);\n(\t+)this\.renderContent\(\);/;
if (!tagRe.test(s)) { missed.push('tag-filter'); }
else {
	s = s.replace(tagRe, (m, a, b, c) => {
		return "this.showSearch = true;\n" + a + "this.renderPanels();\n" + c + "this.renderContent();";
	});
}

if (wasCrlf) s = s.split('\n').join('\r\n');
fs.writeFileSync(path, s, 'utf8');
if (missed.length > 0) {
	console.log('MISSED: ' + missed.join(', '));
	process.exit(1);
} else {
	console.log('OK: layout patch applied (CRLF=' + wasCrlf + ').');
}
