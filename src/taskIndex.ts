import { App, TFile, Vault } from 'obsidian';
import { Task } from './types';
import { TaskParser } from './taskParser';

const DEBOUNCE_DELAY_MS = 1000;
const YIELD_INTERVAL_MS = 10;

export class TaskIndex {
	private app: App;
	private vault: Vault;
	private taskCache: Map<string, Task[]> = new Map();
	private fileHashCache: Map<string, string> = new Map();
	private allTasks: Task[] = [];
	private isIndexing = false;
	private indexingPromise: Promise<void> | null = null;
	private debounceTimer: number | null = null;
	private listeners: Set<() => void> = new Set();

	constructor(app: App) {
		this.app = app;
		this.vault = app.vault;
	}

	async initialize(): Promise<void> {
		await this.fullReindex();
		this.registerEventHandlers();
	}

	private registerEventHandlers(): void {
		this.vault.on('create', (file) => {
			if (file instanceof TFile && file.extension === 'md') {
				this.scheduleReindex();
			}
		});

		this.vault.on('delete', (file) => {
			if (file instanceof TFile && file.extension === 'md') {
				this.removeFileFromCache(file.path);
				this.notifyListeners();
			}
		});

		this.vault.on('modify', (file) => {
			if (file instanceof TFile && file.extension === 'md') {
				this.scheduleReindex();
			}
		});

		this.vault.on('rename', (file, oldPath) => {
			if (file instanceof TFile && file.extension === 'md') {
				this.removeFileFromCache(oldPath);
				this.scheduleReindex();
			}
		});
	}

	private scheduleReindex(): void {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
		}
		this.debounceTimer = window.setTimeout(() => {
			void this.incrementalReindex();
		}, DEBOUNCE_DELAY_MS);
	}

	private async incrementalReindex(): Promise<void> {
		if (this.isIndexing) return;

		this.isIndexing = true;
		try {
			const files = this.vault.getMarkdownFiles();
			let changedCount = 0;

			for (const file of files) {
				const currentHash = `${file.stat.mtime}-${file.stat.size}`;
				const cachedHash = this.fileHashCache.get(file.path);

				if (currentHash !== cachedHash) {
					await this.indexFile(file);
					changedCount++;
				}
			}

			if (changedCount > 0) {
				this.rebuildAllTasks();
				this.notifyListeners();
			}
		} finally {
			this.isIndexing = false;
		}
	}

	async fullReindex(): Promise<void> {
		if (this.isIndexing && this.indexingPromise) {
			await this.indexingPromise;
			return;
		}

		this.isIndexing = true;
		this.indexingPromise = this.doFullReindex();

		try {
			await this.indexingPromise;
		} finally {
			this.isIndexing = false;
			this.indexingPromise = null;
		}
	}

	private async doFullReindex(): Promise<void> {
		const files = this.vault.getMarkdownFiles();
		this.taskCache.clear();
		this.fileHashCache.clear();

		const batchSize = 50;
		for (let i = 0; i < files.length; i += batchSize) {
			const batch = files.slice(i, i + batchSize);
			await Promise.all(batch.map(file => this.indexFile(file)));
			await new Promise(resolve => window.setTimeout(resolve, YIELD_INTERVAL_MS));
		}

		this.rebuildAllTasks();
		this.notifyListeners();
	}

	private async indexFile(file: TFile): Promise<void> {
		try {
			const content = await this.vault.read(file);
			const tasks = TaskParser.parseFile(content, file.path);

			if (tasks.length > 0) {
				this.taskCache.set(file.path, tasks);
			} else {
				this.taskCache.delete(file.path);
			}

			this.fileHashCache.set(file.path, `${file.stat.mtime}-${file.stat.size}`);
		} catch (e) {
			console.error(`SmartTask: Failed to index file ${file.path}`, e);
		}
	}

	private removeFileFromCache(filePath: string): void {
		this.taskCache.delete(filePath);
		this.fileHashCache.delete(filePath);
		this.rebuildAllTasks();
	}

	private rebuildAllTasks(): void {
		const allTasks: Task[] = [];
		for (const tasks of this.taskCache.values()) {
			const collectTasks = (taskList: Task[]) => {
				for (const task of taskList) {
					allTasks.push(task);
					if (task.subtasks.length > 0) {
						collectTasks(task.subtasks);
					}
				}
			};
			collectTasks(tasks);
		}
		this.allTasks = allTasks;
	}

	getAllTasks(): Task[] {
		return [...this.allTasks];
	}

	getTasksByFile(filePath: string): Task[] {
		return this.taskCache.get(filePath) || [];
	}

	getTaskCount(): number {
		return this.allTasks.length;
	}

	getIndexedFileCount(): number {
		return this.taskCache.size;
	}

	onChange(callback: () => void): () => void {
		this.listeners.add(callback);
		return () => this.listeners.delete(callback);
	}

	private notifyListeners(): void {
		for (const listener of this.listeners) {
			try {
				listener();
			} catch (e) {
				console.error('SmartTask: Listener error', e);
			}
		}
	}

	async updateTaskStatus(task: Task, completed: boolean): Promise<void> {
		const file = this.vault.getAbstractFileByPath(task.filePath);
		if (!(file instanceof TFile)) return;

		const content = await this.vault.read(file);
		const lines = content.split('\n');

		if (task.lineNumber > 0 && task.lineNumber <= lines.length) {
			const lineIndex = task.lineNumber - 1;
			const line = lines[lineIndex];

			const newStatus = completed ? 'x' : ' ';
			const newLine = line.replace(/^\s*([-*+]|\d+\.)\s+\[([ xX])\]/, (match, prefix) => {
				return `${prefix} [${newStatus}]`;
			});

			let updatedLine = newLine;
			if (completed) {
				const today = new Date().toISOString().split('T')[0];
				if (!/✅\s*\d{4}-\d{2}-\d{2}/.test(updatedLine)) {
					updatedLine += ` ✅ ${today}`;
				}
			} else {
				updatedLine = updatedLine.replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/, '');
			}

			lines[lineIndex] = updatedLine;
			await this.vault.modify(file, lines.join('\n'));
		}
	}

	async updateTask(task: Task, updates: Partial<Task>): Promise<void> {
		const file = this.vault.getAbstractFileByPath(task.filePath);
		if (!(file instanceof TFile)) return;

		const content = await this.vault.read(file);
		const lines = content.split('\n');

		if (task.lineNumber > 0 && task.lineNumber <= lines.length) {
			const updatedTask = { ...task, ...updates };
			lines[task.lineNumber - 1] = TaskParser.taskToMarkdown(updatedTask);
			await this.vault.modify(file, lines.join('\n'));
		}
	}

	async deleteTask(task: Task): Promise<void> {
		const file = this.vault.getAbstractFileByPath(task.filePath);
		if (!(file instanceof TFile)) return;

		const content = await this.vault.read(file);
		const lines = content.split('\n');

		if (task.lineNumber > 0 && task.lineNumber <= lines.length) {
			lines.splice(task.lineNumber - 1, 1);
			await this.vault.modify(file, lines.join('\n'));
		}
	}

	destroy(): void {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
		}
		this.listeners.clear();
		this.taskCache.clear();
		this.fileHashCache.clear();
	}
}
