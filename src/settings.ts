import { App, PluginSettingTab, Setting } from 'obsidian';
import SmartTaskPlugin from './main';
import { TaskPriority, GroupField, SortField, ViewType } from './types';
import { t } from './i18n';

export class SmartTaskSettingTab extends PluginSettingTab {
	plugin: SmartTaskPlugin;

	constructor(app: App, plugin: SmartTaskPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		const s = t('settings');

		containerEl.empty();

		new Setting(containerEl)
			.setName(s.headingTaskConfiguration)
			.setHeading();

		new Setting(containerEl)
			.setName(s.headingTaskSaving)
			.setHeading();

		new Setting(containerEl)
			.setName(s.defaultSaveLocation)
			.setDesc(s.saveLocationDesc)
			.addDropdown(dropdown => dropdown
				.addOption('inbox', t('saveTargets').inbox)
				.addOption('currentFile', t('saveTargets').currentFile)
				.addOption('dailyNote', t('saveTargets').dailyNote)
				.setValue(this.plugin.settings.saveTarget)
				.onChange(async (value) => {
					this.plugin.settings.saveTarget = value as 'inbox' | 'currentFile' | 'dailyNote';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(s.inboxFilePath)
			.setDesc(s.inboxFilePathDesc)
			.addText(text => text
				.setPlaceholder(s.inboxFilePlaceholder)
				.setValue(this.plugin.settings.inboxFilePath)
				.onChange(async (value) => {
					this.plugin.settings.inboxFilePath = value || 'SmartTask-Inbox.md';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(s.autoAddTags)
			.setDesc(s.autoAddTagsDesc)
			.addText(text => text
				.setPlaceholder(s.autoAddTagsPlaceholder)
				.setValue(this.plugin.settings.autoAddTags.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.autoAddTags = value
						.split(',')
						.map(tag => tag.trim())
						.filter(tag => tag.length > 0);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(s.headingTaskDisplay)
			.setHeading();

		new Setting(containerEl)
			.setName(s.defaultView)
			.setDesc(s.defaultViewDesc)
			.addDropdown(dropdown => dropdown
				.addOption('list', t('tabs').list)
				.addOption('kanban', t('tabs').kanban)
				.addOption('calendar', t('tabs').calendar)
				.addOption('timeline', t('tabs').timeline)
				.setValue(this.plugin.settings.defaultView)
				.onChange(async (value) => {
					this.plugin.settings.defaultView = value as ViewType;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(s.timelineGrouping)
			.setDesc(s.timelineGroupingDesc)
			.addDropdown(dropdown => dropdown
				.addOption('day', t('dates').day)
				.addOption('week', t('dates').week)
				.addOption('month', t('dates').month)
				.setValue(this.plugin.settings.timelineGroupBy)
				.onChange(async (value) => {
					this.plugin.settings.timelineGroupBy = value as 'day' | 'week' | 'month';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(s.defaultPriority)
			.setDesc(s.defaultPriorityDesc)
			.addDropdown(dropdown => dropdown
				.addOption(TaskPriority.Highest, `🔝 ${t('priorities').highest}`)
				.addOption(TaskPriority.High, `🔺 ${t('priorities').high}`)
				.addOption(TaskPriority.Medium, `🔼 ${t('priorities').medium}`)
				.addOption(TaskPriority.Low, `🔽 ${t('priorities').low}`)
				.addOption(TaskPriority.Lowest, `⏬ ${t('priorities').lowest}`)
				.addOption(TaskPriority.None, `➖ ${s.none}`)
				.setValue(this.plugin.settings.defaultPriority)
				.onChange(async (value) => {
					this.plugin.settings.defaultPriority = value as TaskPriority;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(s.showCompleted)
			.setDesc(s.showCompletedDesc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showCompleted)
				.onChange(async (value) => {
					this.plugin.settings.showCompleted = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(s.showSubtasks)
			.setDesc(s.showSubtasksDesc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showSubtasks)
				.onChange(async (value) => {
					this.plugin.settings.showSubtasks = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(s.headingSortingGrouping)
			.setHeading();

		new Setting(containerEl)
			.setName(s.groupBy)
			.setDesc(s.groupByDesc)
			.addDropdown(dropdown => dropdown
				.addOption(GroupField.File, s.byFile)
				.addOption(GroupField.Priority, s.byPriority)
				.addOption(GroupField.DueDate, s.byDueDate)
				.addOption(GroupField.Tag, s.byTag)
				.addOption(GroupField.None, s.noGrouping)
				.setValue(this.plugin.settings.groupBy)
				.onChange(async (value) => {
					this.plugin.settings.groupBy = value as GroupField;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(s.sortBy)
			.setDesc(s.sortByDesc)
			.addDropdown(dropdown => dropdown
				.addOption(SortField.DueDate, s.dueDate)
				.addOption(SortField.Priority, s.priority)
				.addOption(SortField.Description, s.description)
				.addOption(SortField.CreatedDate, s.createdDate)
				.setValue(this.plugin.settings.sortBy)
				.onChange(async (value) => {
					this.plugin.settings.sortBy = value as SortField;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(s.sortOrder)
			.setDesc(s.sortOrderDesc)
			.addDropdown(dropdown => dropdown
				.addOption('asc', s.ascending)
				.addOption('desc', s.descending)
				.setValue(this.plugin.settings.sortOrder)
				.onChange(async (value) => {
					this.plugin.settings.sortOrder = value as 'asc' | 'desc';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName(s.headingPerformance)
			.setHeading();

		new Setting(containerEl)
			.setName(s.enableIndexing)
			.setDesc(s.enableIndexingDesc)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.indexingEnabled)
				.onChange(async (value) => {
					this.plugin.settings.indexingEnabled = value;
					await this.plugin.saveSettings();
					await this.plugin.setIndexingEnabled(value);
				}));

		new Setting(containerEl)
			.setName(s.headingKeyboardShortcuts)
			.setHeading();

		const shortcuts = containerEl.createEl('div', { cls: 'shortcut-hint' });
		const shortcutItems = [
			{ keys: 'Ctrl+Shift+T', desc: s.shortcutQuickCreate },
			{ keys: 'Ctrl+Enter', desc: s.shortcutToggleStatus },
			{ keys: 'Ctrl+Shift+Enter', desc: s.shortcutAddSubtask },
		];
		for (const item of shortcutItems) {
			const p = shortcuts.createEl('p');
			p.createEl('code', { text: item.keys });
			p.appendText(` — ${item.desc}`);
		}

		new Setting(containerEl)
			.setName(s.headingAbout)
			.setHeading();

		containerEl.createEl('p', {
			text: `SmartTask v${this.plugin.manifest.version} — ${s.aboutDescription}`,
		});
	}
}
