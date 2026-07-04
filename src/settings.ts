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

		new Setting(containerEl)
			.setName('SmartTask Settings')
			.setHeading();

		new Setting(containerEl)
			.setName('📥 Task Saving')
			.setHeading();

		new Setting(containerEl)
			.setName('Default Save Location')
			.setDesc('Where newly created tasks should be saved')
			.addDropdown(dropdown => dropdown
				.addOption('inbox', 'Inbox (specified file)')
				.addOption('currentFile', 'Current file')
				.addOption('dailyNote', 'Daily note')
				.setValue(this.plugin.settings.saveTarget)
				.onChange(async (value) => {
					this.plugin.settings.saveTarget = value as any;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Inbox File Path')
			.setDesc('File path for saving tasks in inbox mode')
			.addText(text => text
				.setPlaceholder('SmartTask-Inbox.md')
				.setValue(this.plugin.settings.inboxFilePath)
				.onChange(async (value) => {
					this.plugin.settings.inboxFilePath = value || 'SmartTask-Inbox.md';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto-add Tags')
			.setDesc('Tags to automatically add to new tasks (comma-separated)')
			.addText(text => text
				.setPlaceholder('e.g., task, work')
				.setValue(this.plugin.settings.autoAddTags.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.autoAddTags = value
						.split(',')
						.map(t => t.trim())
						.filter(t => t.length > 0);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('🎯 Task Display')
			.setHeading();

		new Setting(containerEl)
			.setName('Default View')
			.setDesc('Default view when opening the plugin')
			.addDropdown(dropdown => dropdown
				.addOption('list', 'List')
				.addOption('kanban', 'Kanban')
				.addOption('calendar', 'Calendar')
				.addOption('timeline', 'Timeline')
				.setValue(this.plugin.settings.defaultView)
				.onChange(async (value) => {
					this.plugin.settings.defaultView = value as ViewType;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Timeline Grouping')
			.setDesc('How tasks are grouped in timeline view')
			.addDropdown(dropdown => dropdown
				.addOption('day', 'By day')
				.addOption('week', 'By week')
				.addOption('month', 'By month')
				.setValue(this.plugin.settings.timelineGroupBy)
				.onChange(async (value) => {
					this.plugin.settings.timelineGroupBy = value as 'day' | 'week' | 'month';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default Priority')
			.setDesc('Default priority for new tasks')
			.addDropdown(dropdown => dropdown
				.addOption(TaskPriority.Highest, '🔝 Highest')
				.addOption(TaskPriority.High, '🔺 High')
				.addOption(TaskPriority.Medium, '🔼 Medium')
				.addOption(TaskPriority.Low, '🔽 Low')
				.addOption(TaskPriority.Lowest, '⏬ Lowest')
				.addOption(TaskPriority.None, '➖ None')
				.setValue(this.plugin.settings.defaultPriority)
				.onChange(async (value) => {
					this.plugin.settings.defaultPriority = value as TaskPriority;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Completed Tasks')
			.setDesc('Display completed tasks in task list')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showCompleted)
				.onChange(async (value) => {
					this.plugin.settings.showCompleted = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Subtasks')
			.setDesc('Expand and show subtasks in task list')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showSubtasks)
				.onChange(async (value) => {
					this.plugin.settings.showSubtasks = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('🔍 Sorting & Grouping')
			.setHeading();

		new Setting(containerEl)
			.setName('Group By')
			.setDesc('How tasks are grouped in task list')
			.addDropdown(dropdown => dropdown
				.addOption(GroupField.File, 'By file')
				.addOption(GroupField.Priority, 'By priority')
				.addOption(GroupField.DueDate, 'By due date')
				.addOption(GroupField.Tag, 'By tag')
				.addOption(GroupField.None, 'No grouping')
				.setValue(this.plugin.settings.groupBy)
				.onChange(async (value) => {
					this.plugin.settings.groupBy = value as GroupField;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Sort By')
			.setDesc('Field to sort tasks by')
			.addDropdown(dropdown => dropdown
				.addOption(SortField.DueDate, 'Due date')
				.addOption(SortField.Priority, 'Priority')
				.addOption(SortField.Description, 'Description')
				.addOption(SortField.CreatedDate, 'Created date')
				.setValue(this.plugin.settings.sortBy)
				.onChange(async (value) => {
					this.plugin.settings.sortBy = value as SortField;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Sort Order')
			.setDesc('Sort order for task list')
			.addDropdown(dropdown => dropdown
				.addOption('asc', 'Ascending')
				.addOption('desc', 'Descending')
				.setValue(this.plugin.settings.sortOrder)
				.onChange(async (value) => {
					this.plugin.settings.sortOrder = value as 'asc' | 'desc';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('⚡ Performance')
			.setHeading();

		new Setting(containerEl)
			.setName('Enable Indexing')
			.setDesc('Enable task indexing for better query performance (recommended)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.indexingEnabled)
				.onChange(async (value) => {
					this.plugin.settings.indexingEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('⌨️ Keyboard Shortcuts')
			.setHeading();

		const shortcuts = containerEl.createEl('div', { cls: 'shortcut-hint' });
		const shortcutItems = [
			{ keys: 'Ctrl+Shift+T', desc: 'Quick create task' },
			{ keys: 'Ctrl+Enter', desc: 'Toggle task status' },
			{ keys: 'Ctrl+Shift+Enter', desc: 'Add subtask' },
		];
		for (const item of shortcutItems) {
			const p = shortcuts.createEl('p');
			const code = p.createEl('code', { text: item.keys });
			p.appendText(` — ${item.desc}`);
		}

		new Setting(containerEl)
			.setName('About')
			.setHeading();

		containerEl.createEl('p', {
			text: `SmartTask v1.1.0 — High-performance task management plugin for Obsidian`,
		});
	}
}
