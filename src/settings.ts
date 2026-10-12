import { App, PluginSettingTab, Setting, type SettingDefinitionItem } from 'obsidian';
import SmartTaskPlugin from './main';
import { TaskPriority, GroupField, SortField, ViewType } from './types';
import { t } from './i18n';

export class SmartTaskSettingTab extends PluginSettingTab {
	plugin: SmartTaskPlugin;

	constructor(app: App, plugin: SmartTaskPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const s = t('settings');
		return [
			{ type: 'group', heading: s.headingTaskConfiguration, items: [] },
			{
				type: 'group',
				heading: s.headingTaskSaving,
				items: [
					{
						name: s.defaultSaveLocation,
						desc: s.saveLocationDesc,
						control: {
							type: 'dropdown',
							key: 'saveTarget',
							options: {
								inbox: t('saveTargets').inbox,
								currentFile: t('saveTargets').currentFile,
								dailyNote: t('saveTargets').dailyNote,
							},
						},
					},
					{
						name: s.inboxFilePath,
						desc: s.inboxFilePathDesc,
						control: { type: 'text', key: 'inboxFilePath', placeholder: s.inboxFilePlaceholder },
					},
					{
						name: s.autoAddTags,
						desc: s.autoAddTagsDesc,
						control: { type: 'text', key: 'autoAddTags', placeholder: s.autoAddTagsPlaceholder },
					},
				],
			},
			{
				type: 'group',
				heading: s.headingTaskDisplay,
				items: [
					{
						name: s.defaultView,
						desc: s.defaultViewDesc,
						control: {
							type: 'dropdown',
							key: 'defaultView',
							options: {
								list: t('tabs').list,
								kanban: t('tabs').kanban,
								calendar: t('tabs').calendar,
								timeline: t('tabs').timeline,
							},
						},
					},
					{
						name: s.timelineGrouping,
						desc: s.timelineGroupingDesc,
						control: {
							type: 'dropdown',
							key: 'timelineGroupBy',
							options: { day: t('dates').day, week: t('dates').week, month: t('dates').month },
						},
					},
					{
						name: s.defaultPriority,
						desc: s.defaultPriorityDesc,
						control: {
							type: 'dropdown',
							key: 'defaultPriority',
							options: {
								[TaskPriority.Highest]: `\u{1F51D} ${t('priorities').highest}`,
								[TaskPriority.High]: `\u{1F53A} ${t('priorities').high}`,
								[TaskPriority.Medium]: `\u{1F53C} ${t('priorities').medium}`,
								[TaskPriority.Low]: `\u{1F53D} ${t('priorities').low}`,
								[TaskPriority.Lowest]: `\u{23EC} ${t('priorities').lowest}`,
								[TaskPriority.None]: `\u{2796} ${s.none}`,
							},
						},
					},
					{
						name: s.showCompleted,
						desc: s.showCompletedDesc,
						control: { type: 'toggle', key: 'showCompleted' },
					},
					{
						name: s.showSubtasks,
						desc: s.showSubtasksDesc,
						control: { type: 'toggle', key: 'showSubtasks' },
					},
				],
			},
			{
				type: 'group',
				heading: s.headingSortingGrouping,
				items: [
					{
						name: s.groupBy,
						desc: s.groupByDesc,
						control: {
							type: 'dropdown',
							key: 'groupBy',
							options: {
								[GroupField.File]: s.byFile,
								[GroupField.Priority]: s.byPriority,
								[GroupField.DueDate]: s.byDueDate,
								[GroupField.Tag]: s.byTag,
								[GroupField.None]: s.noGrouping,
							},
						},
					},
					{
						name: s.sortBy,
						desc: s.sortByDesc,
						control: {
							type: 'dropdown',
							key: 'sortBy',
							options: {
								[SortField.DueDate]: s.dueDate,
								[SortField.Priority]: s.priority,
								[SortField.Description]: s.description,
								[SortField.CreatedDate]: s.createdDate,
							},
						},
					},
					{
						name: s.sortOrder,
						desc: s.sortOrderDesc,
						control: {
							type: 'dropdown',
							key: 'sortOrder',
							options: { asc: s.ascending, desc: s.descending },
						},
					},
				],
			},
			{
				type: 'group',
				heading: s.headingPerformance,
				items: [
					{
						name: s.enableIndexing,
						desc: s.enableIndexingDesc,
						control: { type: 'toggle', key: 'indexingEnabled' },
					},
				],
			},
			{
				type: 'group',
				heading: s.headingKeyboardShortcuts,
				items: [
					{ name: s.shortcutQuickCreate, desc: 'Ctrl+Shift+T' },
					{ name: s.shortcutToggleStatus, desc: 'Ctrl+Enter' },
					{ name: s.shortcutAddSubtask, desc: 'Ctrl+Shift+Enter' },
				],
			},
			{
				type: 'group',
				heading: s.headingAbout,
				items: [{ name: `SmartTask v${this.plugin.manifest.version}`, desc: s.aboutDescription }],
			},
		];
	}

	getControlValue(key: string): unknown {
		return (this.plugin.settings as unknown as Record<string, unknown>)[key];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === 'autoAddTags') {
			this.plugin.settings.autoAddTags = String(value)
				.split(',')
				.map(tag => tag.trim())
				.filter(tag => tag.length > 0);
		} else {
			(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		}
		await this.plugin.saveSettings();
		if (key === 'indexingEnabled') {
			await this.plugin.setIndexingEnabled(Boolean(value));
		}
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

		const shortcuts = containerEl.createDiv({ cls: 'shortcut-hint' });
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
