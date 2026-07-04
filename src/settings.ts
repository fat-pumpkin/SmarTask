import { App, PluginSettingTab, Setting } from 'obsidian';
import SmartTaskPlugin from './main';
import { SmartTaskSettings, DEFAULT_SETTINGS, TaskPriority, GroupField, SortField, ViewType } from './types';

export class SmartTaskSettingTab extends PluginSettingTab {
	plugin: SmartTaskPlugin;

	constructor(app: App, plugin: SmartTaskPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'SmartTask 设置' });

		containerEl.createEl('h3', { text: '📥 任务保存设置' });

		new Setting(containerEl)
			.setName('默认保存位置')
			.setDesc('新创建的任务保存到哪里')
			.addDropdown(dropdown => dropdown
				.addOption('inbox', '收件箱（指定文件）')
				.addOption('currentFile', '当前打开的文件')
				.addOption('dailyNote', '每日笔记')
				.setValue(this.plugin.settings.saveTarget)
				.onChange(async (value) => {
					this.plugin.settings.saveTarget = value as any;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('收件箱文件路径')
			.setDesc('收件箱模式下保存任务的文件路径')
			.addText(text => text
				.setPlaceholder('SmartTask-Inbox.md')
				.setValue(this.plugin.settings.inboxFilePath)
				.onChange(async (value) => {
					this.plugin.settings.inboxFilePath = value || 'SmartTask-Inbox.md';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('自动添加标签')
			.setDesc('新建任务时自动添加的标签（用逗号分隔）')
			.addText(text => text
				.setPlaceholder('例如: task, work')
				.setValue(this.plugin.settings.autoAddTags.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.autoAddTags = value
						.split(',')
						.map(t => t.trim())
						.filter(t => t.length > 0);
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: '🎯 任务显示设置' });

		new Setting(containerEl)
			.setName('默认视图')
			.setDesc('打开插件时默认显示的视图')
			.addDropdown(dropdown => dropdown
				.addOption('list', '列表视图')
				.addOption('kanban', '看板视图')
				.addOption('calendar', '日历视图')
				.addOption('timeline', '时间线视图')
				.setValue(this.plugin.settings.defaultView)
				.onChange(async (value) => {
					this.plugin.settings.defaultView = value as ViewType;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('时间线分组方式')
			.setDesc('时间线视图中任务的分组方式')
			.addDropdown(dropdown => dropdown
				.addOption('day', '按日')
				.addOption('week', '按周')
				.addOption('month', '按月')
				.setValue(this.plugin.settings.timelineGroupBy)
				.onChange(async (value) => {
					this.plugin.settings.timelineGroupBy = value as 'day' | 'week' | 'month';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('默认优先级')
			.setDesc('新建任务时的默认优先级')
			.addDropdown(dropdown => dropdown
				.addOption(TaskPriority.Highest, '🔝 最高')
				.addOption(TaskPriority.High, '🔺 高')
				.addOption(TaskPriority.Medium, '🔼 中')
				.addOption(TaskPriority.Low, '🔽 低')
				.addOption(TaskPriority.Lowest, '⏬ 最低')
				.addOption(TaskPriority.None, '➖ 无')
				.setValue(this.plugin.settings.defaultPriority)
				.onChange(async (value) => {
					this.plugin.settings.defaultPriority = value as TaskPriority;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('显示已完成任务')
			.setDesc('在任务列表中显示已完成的任务')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showCompleted)
				.onChange(async (value) => {
					this.plugin.settings.showCompleted = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('显示子任务')
			.setDesc('在任务列表中展开显示子任务')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showSubtasks)
				.onChange(async (value) => {
					this.plugin.settings.showSubtasks = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: '🔍 排序与分组' });

		new Setting(containerEl)
			.setName('分组方式')
			.setDesc('任务列表的分组方式')
			.addDropdown(dropdown => dropdown
				.addOption('file', '按文件')
				.addOption('priority', '按优先级')
				.addOption('dueDate', '按截止日期')
				.addOption('tag', '按标签')
				.addOption('none', '不分组')
				.setValue(this.plugin.settings.groupBy)
				.onChange(async (value) => {
					this.plugin.settings.groupBy = value as GroupField;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('排序字段')
			.setDesc('任务列表的排序依据')
			.addDropdown(dropdown => dropdown
				.addOption('dueDate', '截止日期')
				.addOption('priority', '优先级')
				.addOption('description', '描述')
				.addOption('createdDate', '创建日期')
				.setValue(this.plugin.settings.sortBy)
				.onChange(async (value) => {
					this.plugin.settings.sortBy = value as SortField;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('排序顺序')
			.setDesc('任务列表的排序顺序')
			.addDropdown(dropdown => dropdown
				.addOption('asc', '升序')
				.addOption('desc', '降序')
				.setValue(this.plugin.settings.sortOrder)
				.onChange(async (value) => {
					this.plugin.settings.sortOrder = value as 'asc' | 'desc';
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: '⚡ 性能设置' });

		new Setting(containerEl)
			.setName('启用索引')
			.setDesc('启用任务索引以提升查询性能（推荐开启）')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.indexingEnabled)
				.onChange(async (value) => {
					this.plugin.settings.indexingEnabled = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: '⌨️ 快捷键' });
		const shortcuts = containerEl.createEl('div', { cls: 'shortcut-hint' });
		shortcuts.style.cssText = 'font-size: 13px; color: var(--text-muted); line-height: 1.8;';
		shortcuts.innerHTML = `
			<p><code>Ctrl+Shift+T</code> — 快速创建任务</p>
			<p><code>Ctrl+Enter</code> — 切换当前行任务状态</p>
			<p><code>Ctrl+Shift+Enter</code> — 在当前任务下添加子任务</p>
		`;

		containerEl.createEl('h3', { text: '关于' });
		containerEl.createEl('p', {
			text: `SmartTask v1.1.0 — 高性能的 Obsidian 任务管理插件`,
		});
	}
}
