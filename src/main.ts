import { App, Modal, Notice, Plugin, TFile } from 'obsidian';
import { TaskIndex } from './taskIndex';
import { TaskParser } from './taskParser';
import { Task, SmartTaskSettings, DEFAULT_SETTINGS, TaskPriority, TaskQuery } from './types';
import { SmartTaskSettingTab } from './settings';
import { SmartTaskView, SMARTTASK_VIEW_TYPE } from './view';
import { t, setLocale, detectLocale } from './i18n';
import { QueryEngine } from './queryEngine';

export default class SmartTaskPlugin extends Plugin {
	settings: SmartTaskSettings = DEFAULT_SETTINGS;
	private taskIndex: TaskIndex | null = null;
	private tasksChangeListeners: Set<() => void> = new Set();
	private statusBarItem: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();

		setLocale(detectLocale());

		if (this.settings.indexingEnabled) {
			await this.initTaskIndex();
		} else {
			this.taskIndex = null;
		}

		this.registerView(
			SMARTTASK_VIEW_TYPE,
			(leaf) => new SmartTaskView(leaf, this)
		);

		this.addRibbonIcon('check-circle', 'SmartTask', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-view',
			name: t('commands').openView,
			callback: () => {
				void this.activateView();
			},
		});

		this.addCommand({
			id: 'quick-create',
			name: t('commands').quickCreate,
			callback: () => {
				new QuickCreateModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: 'toggle-status',
			name: t('commands').toggleStatus,
			editorCallback: (editor, view) => {
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				const task = TaskParser.parseLine(line, view.file?.path || '', cursor.line + 1);
				if (task) {
					const newStatus = !task.completed;
					const newLine = line.replace(
						/^\s*([-*+]|\d+\.)\s+\[([ xX])\]/,
						(match, prefix) => `${prefix} [${newStatus ? 'x' : ' '}]`
					);
					editor.setLine(cursor.line, newLine);
					new Notice(newStatus ? 'Task completed 🎉' : 'Task restored');
				}
			},
		});

		this.addCommand({
			id: 'add-subtask',
			name: t('commands').addSubtask,
			editorCallback: (editor, view) => {
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				const task = TaskParser.parseLine(line, view.file?.path || '', cursor.line + 1);
				if (task) {
					const indentMatch = line.match(/^(\s*)/);
					const indent = (indentMatch ? indentMatch[1] : '') + '  ';
					const newLine = `${indent}- [ ] Subtask`;
					editor.replaceRange(
						`\n${newLine}`,
						{ line: cursor.line, ch: line.length }
					);
					editor.setCursor({ line: cursor.line + 1, ch: indent.length + 6 });
				}
			},
		});

		this.addSettingTab(new SmartTaskSettingTab(this.app, this));

		this.statusBarItem = this.addStatusBarItem();
		this.updateStatusBar();

	}

	onunload() {
		if (this.taskIndex) {
			this.taskIndex.destroy();
			this.taskIndex = null;
		}
		this.tasksChangeListeners.clear();

	}

	async loadSettings() {
		const saved = await this.loadData() as Partial<SmartTaskSettings>;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateAllViews();
	}

	private async initTaskIndex(): Promise<void> {
		this.taskIndex = new TaskIndex(this.app);
		await this.taskIndex.initialize();
		this.taskIndex.onChange(() => {
			this.notifyTasksChange();
			this.updateStatusBar();
		});
	}

	async setIndexingEnabled(enabled: boolean): Promise<void> {
		if (enabled && !this.taskIndex) {
			await this.initTaskIndex();
			this.notifyTasksChange();
			this.updateStatusBar();
		} else if (!enabled && this.taskIndex) {
			this.taskIndex.destroy();
			this.taskIndex = null;
			this.notifyTasksChange();
			this.updateStatusBar();
		}
	}

	private async activateView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(SMARTTASK_VIEW_TYPE)[0];

		if (!leaf) {
			leaf = workspace.getLeaf(false);
			await leaf.setViewState({
				type: SMARTTASK_VIEW_TYPE,
				active: true,
			});
		}

		workspace.setActiveLeaf(leaf);
	}

	private updateStatusBar(): void {
		const tasks = this.getTasks();
		const notDone = tasks.filter(t => !t.completed).length;
		if (this.statusBarItem) {
			this.statusBarItem.setText(`📋 ${notDone} 待办`);
		}
	}

	getTasks(): Task[] {
		if (!this.taskIndex) return [];
		return this.taskIndex.getAllTasks();
	}

	queryTasks(query: TaskQuery): Task[] {
		return QueryEngine.query(this.getTasks(), query);
	}

	async toggleTaskStatus(task: Task, completed: boolean): Promise<void> {
		if (!this.taskIndex) return;

		try {
			await this.taskIndex.updateTaskStatus(task, completed);
			new Notice(completed ? '任务已完成 🎉' : '任务已恢复');
		} catch (e: unknown) {
			console.error('Failed to toggle task:', e);
			new Notice('更新任务失败');
		}
	}

	async toggleSubtaskStatus(parentTask: Task, subtaskId: string, completed: boolean): Promise<void> {
		const subtask = parentTask.subtasks.find(st => st.id === subtaskId);
		if (subtask) {
			await this.toggleTaskStatus(subtask, completed);
		}
	}

	async createQuickTask(description: string, dueDate?: string, priority?: TaskPriority, parentTask?: Task): Promise<void> {
		try {
			const targetFile = await this.getTargetFile();
			if (!targetFile) {
				new Notice('无法确定保存位置');
				return;
			}

			const content = await this.app.vault.read(targetFile);
			const lines = content.split('\n');

			let baseIndent = '';
			let parentIndent = '';
			if (parentTask) {
				const parentLineIdx = parentTask.lineNumber - 1;
				const parentLine = parentLineIdx >= 0 && parentLineIdx < lines.length ? lines[parentLineIdx] : '';
				const parentIndentMatch = parentLine.match(/^(\s*)/);
				parentIndent = parentIndentMatch ? parentIndentMatch[1] : '';
				baseIndent = parentIndent + '  ';
			}

			let taskLine = `${baseIndent}- [ ] ${description}`;

			const effectivePriority = priority ?? (this.settings.defaultPriority !== TaskPriority.None ? this.settings.defaultPriority : undefined);
			if (effectivePriority) {
				switch (effectivePriority) {
					case TaskPriority.Highest:
						taskLine += ' 🔝';
						break;
					case TaskPriority.High:
						taskLine += ' 🔺';
						break;
					case TaskPriority.Medium:
						taskLine += ' 🔼';
						break;
					case TaskPriority.Low:
						taskLine += ' 🔽';
						break;
					case TaskPriority.Lowest:
						taskLine += ' ⏬';
						break;
				}
			}

			if (dueDate) {
				taskLine += ` 📅 ${dueDate}`;
			}

			const startDate = new Date().toISOString().split('T')[0];
			taskLine += ` 🛫 ${startDate}`;

			if (this.settings.autoAddTags && this.settings.autoAddTags.length > 0) {
				const tagsStr = this.settings.autoAddTags.map(tag => `#${tag}`).join(' ');
				taskLine += ` ${tagsStr}`;
			}

			if (parentTask) {
				// 插入到父任务子树末尾：跳过缩进更深或空行的连续行
				let insertIndex = parentTask.lineNumber;
				while (insertIndex < lines.length) {
					const line = lines[insertIndex];
					const lineIndentMatch = line.match(/^(\s*)/);
					const lineIndent = lineIndentMatch ? lineIndentMatch[1] : '';
					if (line.trim() === '' || lineIndent.length > parentIndent.length) {
						insertIndex++;
					} else {
						break;
					}
				}
				lines.splice(insertIndex, 0, taskLine);
			} else {
				while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
					lines.pop();
				}
				lines.push('');
				lines.push(taskLine);
			}

			const newContent = lines.join('\n');
			await this.app.vault.modify(targetFile, newContent);

			new Notice(parentTask ? '子任务已添加 ✅' : '任务已创建 ✅');
		} catch (e: unknown) {
			console.error('Failed to create task:', e);
			new Notice('创建任务失败: ' + (e instanceof Error ? e.message : String(e)));
		}
	}

	private async getTargetFile(): Promise<TFile | null> {
		const saveTarget = this.settings.saveTarget;

		switch (saveTarget) {
			case 'currentFile':
				return this.getCurrentFile();
			case 'dailyNote':
				return this.getDailyNoteFile();
			case 'inbox':
			default:
				return this.getInboxFile();
		}
	}

	private async getCurrentFile(): Promise<TFile | null> {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile && activeFile.extension === 'md') {
			return activeFile;
		}
		return await this.getInboxFile();
	}

	private async getDailyNoteFile(): Promise<TFile | null> {
		try {
			const dailyNoteApi = (this.app as unknown as { plugins: { dailyNotes?: { getDailyNote: (date: Date) => TFile | null; createDailyNote: (date: Date) => Promise<TFile> } } }).plugins.dailyNotes;
			if (dailyNoteApi) {
				const today = new Date();
				let file = dailyNoteApi.getDailyNote(today);
				if (!file) {
					file = await dailyNoteApi.createDailyNote(today);
				}
				return file;
			}
		} catch (e: unknown) {
			console.warn('Daily note access failed, falling back to inbox', e);
		}

		return this.getInboxFile();
	}

	private async getInboxFile(): Promise<TFile | null> {
		let inboxPath = this.settings.inboxFilePath?.trim() || 'SmartTask-Inbox.md';
		
		if (!inboxPath.endsWith('.md')) {
			inboxPath += '.md';
		}

		const existing = this.app.vault.getAbstractFileByPath(inboxPath);
		if (existing instanceof TFile) {
			return existing;
		}

		const fileName = inboxPath.split('/').pop() || inboxPath;
		const allFiles = this.app.vault.getFiles();
		const matchingFiles = allFiles.filter(f => 
			f.extension === 'md' && f.basename === fileName.replace('.md', '')
		);
		
		if (matchingFiles.length === 1) {
			return matchingFiles[0];
		}
		
		if (matchingFiles.length > 1) {
			const sameName = matchingFiles.find(f => f.path === inboxPath);
			if (sameName) return sameName;
			return matchingFiles[0];
		}

		return await this.app.vault.create(inboxPath, '');
	}

	private formatDate(date: Date, format: string): string {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return format
			.replace('YYYY', String(y))
			.replace('MM', m)
			.replace('DD', d);
	}

	async addSubtask(parentTask: Task, description: string): Promise<void> {
		await this.createQuickTask(description, undefined, undefined, parentTask);
	}

	openTaskFile(filePath: string, lineNumber: number): void {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			void this.app.workspace.openLinkText(filePath, '', true);
		}
	}

	async updateTask(task: Task, updates: Partial<Task>): Promise<void> {
		if (!this.taskIndex) return;
		await this.taskIndex.updateTask(task, updates);
	}

	async deleteTask(task: Task): Promise<void> {
		if (!this.taskIndex) return;
		await this.taskIndex.deleteTask(task);
	}

	onTasksChange(callback: () => void): () => void {
		this.tasksChangeListeners.add(callback);
		return () => this.tasksChangeListeners.delete(callback);
	}

	private notifyTasksChange(): void {
		for (const listener of this.tasksChangeListeners) {
			try {
				listener();
			} catch (e: unknown) {
				console.error('SmartTask: Listener error', e);
			}
		}
	}

	private updateAllViews(): void {
		const leaves = this.app.workspace.getLeavesOfType(SMARTTASK_VIEW_TYPE);
		for (const leaf of leaves) {
			if (leaf.view instanceof SmartTaskView) {
				// 视图会通过事件订阅自动更新
			}
		}
	}

	getAllTags(): string[] {
		const tagSet = new Set<string>();
		for (const task of this.getTasks()) {
			for (const tag of task.tags) {
				tagSet.add(tag);
			}
		}
		return Array.from(tagSet).sort();
	}
}

class QuickCreateModal extends Modal {
	plugin: SmartTaskPlugin;

	constructor(app: App, plugin: SmartTaskPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h3', { text: 'Quick Create Task' });

		const form = contentEl.createDiv({ cls: 'smarttask-quick-form' });

		const descInput = form.createEl('input', {
			type: 'text',
			placeholder: 'Task description...',
			cls: 'smarttask-input',
		});

		const dateRow = form.createDiv({ cls: 'smarttask-row' });

		dateRow.createSpan({ text: 'Due Date:' });
		const dateInput = dateRow.createEl('input', { type: 'date', cls: 'smarttask-date-input' });

		const quickDates = [
			{ label: 'Today', days: 0 },
			{ label: 'Tomorrow', days: 1 },
			{ label: 'Next Week', days: 7 },
		];
		for (const qd of quickDates) {
			const btn = dateRow.createEl('button', { text: qd.label, cls: 'smarttask-btn' });
			btn.onclick = () => {
				const d = new Date();
				d.setDate(d.getDate() + qd.days);
				dateInput.value = d.toISOString().split('T')[0];
			};
		}

		const priorityRow = form.createDiv({ cls: 'smarttask-row small-gap' });

		priorityRow.createSpan({ text: 'Priority:' });
		const prioritySelect = form.createEl('select', { cls: 'smarttask-select' });
		const options = [
			{ value: '', text: 'None' },
			{ value: TaskPriority.Highest, text: '🔝 Highest' },
			{ value: TaskPriority.High, text: '🔺 High' },
			{ value: TaskPriority.Medium, text: '🔼 Medium' },
			{ value: TaskPriority.Low, text: '🔽 Low' },
			{ value: TaskPriority.Lowest, text: '⏬ Lowest' },
		];
		for (const opt of options) {
			prioritySelect.createEl('option', { value: opt.value, text: opt.text });
		}

		const targetRow = form.createDiv({ cls: 'smarttask-row small-gap' });

		targetRow.createSpan({ text: 'Save to:' });
		const targetSelect = form.createEl('select', { cls: 'smarttask-select' });
		targetSelect.createEl('option', { value: 'inbox', text: t('saveTargets').inbox });
		targetSelect.createEl('option', { value: 'currentFile', text: t('saveTargets').currentFile });
		targetSelect.createEl('option', { value: 'dailyNote', text: t('saveTargets').dailyNote });
		targetSelect.value = this.plugin.settings.saveTarget;
		targetSelect.onchange = async () => {
			const value = targetSelect.value;
			if (value === 'inbox' || value === 'currentFile' || value === 'dailyNote') {
				this.plugin.settings.saveTarget = value;
				await this.plugin.saveSettings();
			}
		};

		const btnRow = form.createDiv({ cls: 'smarttask-btn-row' });

		const cancelBtn = btnRow.createEl('button', { text: 'Cancel', cls: 'smarttask-btn-cancel' });
		cancelBtn.onclick = () => this.close();

		const createBtn = btnRow.createEl('button', { text: 'Create', cls: 'smarttask-btn-create' });
		createBtn.onclick = async () => {
			const desc = descInput.value.trim();
			if (desc) {
				const priValue = prioritySelect.value;
				const effectivePriority = ['highest', 'high', 'medium', 'low', 'lowest'].includes(priValue)
					? priValue as TaskPriority
					: undefined;
				await this.plugin.createQuickTask(
					desc,
					dateInput.value || undefined,
					effectivePriority
				);
				this.close();
			}
		};

		window.setTimeout(() => descInput.focus(), 100);

		descInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				createBtn.click();
			}
			if (e.key === 'Escape') {
				this.close();
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
