import { Task, TaskPriority, RecurrenceRule, WikiLink } from './types';

export class TaskParser {
	private static readonly TASK_REGEX = /^\s*([-*+]|\d+\.)\s+\[([ xX])\]\s+(.+)$/;
	private static readonly DUE_DATE_REGEX = /[📅📆🗓]\s*(\d{4}-\d{2}-\d{2})/;
	private static readonly SCHEDULED_DATE_REGEX = /[⏳⌛]\s*(\d{4}-\d{2}-\d{2})/;
	private static readonly START_DATE_REGEX = /[🛫🚀]\s*(\d{4}-\d{2}-\d{2})/;
	private static readonly COMPLETED_DATE_REGEX = /✅\s*(\d{4}-\d{2}-\d{2})/;
	private static readonly PRIORITY_REGEX = /[🔝🔺⏫🔼🔽⏬🔻]\s*/g;
	private static readonly RECURRENCE_REGEX = /🔁\s+(.+)$/;
	private static readonly TAG_REGEX = /#([a-zA-Z0-9_\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5\/-]*)/g;
	private static readonly WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
	private static readonly PRIORITY_MAP: { [key: string]: TaskPriority } = {
		'🔝': TaskPriority.Highest,
		'🔺': TaskPriority.High,
		'⏫': TaskPriority.High,
		'🔼': TaskPriority.Medium,
		'🔽': TaskPriority.Low,
		'⏬': TaskPriority.Lowest,
		'🔻': TaskPriority.Lowest,
	};

	static parseLine(line: string, filePath: string, lineNumber: number): Task | null {
		const match = line.match(this.TASK_REGEX);
		if (!match) return null;

		const [, , status, description] = match;
		const completed = status.toLowerCase() === 'x';
		let cleanDescription = description.trim();

		const dueDate = this.extractDueDate(cleanDescription);
		const scheduledDate = this.extractScheduledDate(cleanDescription);
		const startDate = this.extractStartDate(cleanDescription);
		const completedDate = completed ? this.extractCompletedDate(cleanDescription) : undefined;
		const priority = this.extractPriority(cleanDescription);
		const recurrence = this.extractRecurrence(cleanDescription);
		const tags = this.extractTags(cleanDescription);
		const wikiLinks = this.extractWikiLinks(cleanDescription);

		cleanDescription = this.cleanDescription(cleanDescription);

		const id = this.generateId(filePath, lineNumber);

		return {
			id,
			description: cleanDescription,
			completed,
			completedDate,
			dueDate,
			scheduledDate,
			startDate,
			priority,
			tags,
			wikiLinks,
			recurrence,
			filePath,
			lineNumber,
			subtasks: [],
		};
	}

	private static extractDueDate(text: string): string | undefined {
		const match = text.match(this.DUE_DATE_REGEX);
		return match ? match[1] : undefined;
	}

	private static extractScheduledDate(text: string): string | undefined {
		const match = text.match(this.SCHEDULED_DATE_REGEX);
		return match ? match[1] : undefined;
	}

	private static extractStartDate(text: string): string | undefined {
		const match = text.match(this.START_DATE_REGEX);
		return match ? match[1] : undefined;
	}

	private static extractCompletedDate(text: string): string | undefined {
		const match = text.match(this.COMPLETED_DATE_REGEX);
		return match ? match[1] : undefined;
	}

	private static extractPriority(text: string): TaskPriority {
		const highest = text.includes('🔝');
		const high = text.includes('🔺') || text.includes('⏫');
		const medium = text.includes('🔼');
		const low = text.includes('🔽');
		const lowest = text.includes('⏬') || text.includes('🔻');

		if (highest) return TaskPriority.Highest;
		if (high) return TaskPriority.High;
		if (medium) return TaskPriority.Medium;
		if (low) return TaskPriority.Low;
		if (lowest) return TaskPriority.Lowest;
		return TaskPriority.None;
	}

	private static extractRecurrence(text: string): RecurrenceRule | undefined {
		const match = text.match(this.RECURRENCE_REGEX);
		if (!match) return undefined;

		const ruleText = match[1].trim().toLowerCase();

		if (ruleText.includes('every day') || ruleText === 'daily') {
			return { frequency: 'daily', interval: 1 };
		}
		if (ruleText.includes('every week') || ruleText === 'weekly') {
			return { frequency: 'weekly', interval: 1 };
		}
		if (ruleText.includes('every month') || ruleText === 'monthly') {
			return { frequency: 'monthly', interval: 1 };
		}
		if (ruleText.includes('every year') || ruleText === 'yearly') {
			return { frequency: 'yearly', interval: 1 };
		}

		return undefined;
	}

	private static extractTags(text: string): string[] {
		const tags: string[] = [];
		let match;
		const regex = new RegExp(this.TAG_REGEX.source, 'g');
		while ((match = regex.exec(text)) !== null) {
			tags.push(match[1]);
		}
		return [...new Set(tags)];
	}

	private static extractWikiLinks(text: string): WikiLink[] {
		const links: WikiLink[] = [];
		let match;
		const regex = new RegExp(this.WIKILINK_REGEX.source, 'g');
		while ((match = regex.exec(text)) !== null) {
			links.push({
				target: match[1].trim(),
				displayText: match[2] ? match[2].trim() : undefined
			});
		}
		return links;
	}

	private static cleanDescription(text: string): string {
		let clean = text;
		clean = clean.replace(this.DUE_DATE_REGEX, '');
		clean = clean.replace(this.SCHEDULED_DATE_REGEX, '');
		clean = clean.replace(this.START_DATE_REGEX, '');
		clean = clean.replace(this.COMPLETED_DATE_REGEX, '');
		clean = clean.replace(this.PRIORITY_REGEX, '');
		clean = clean.replace(this.RECURRENCE_REGEX, '');
		clean = clean.replace(/\s+/g, ' ').trim();
		return clean;
	}

	private static generateId(filePath: string, lineNumber: number): string {
		return `${filePath}:${lineNumber}`;
	}

	static parseFile(content: string, filePath: string): Task[] {
		const tasks: Task[] = [];
		const lines = content.split('\n');
		const stack: { indent: number; task: Task }[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const indentMatch = line.match(/^(\s*)/);
			const indent = indentMatch ? indentMatch[1].length : 0;

			const task = this.parseLine(line, filePath, i + 1);
			if (task) {
				while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
					stack.pop();
				}

				if (stack.length > 0) {
					const parent = stack[stack.length - 1].task;
					task.parentId = parent.id;
					parent.subtasks.push(task);
				} else {
					tasks.push(task);
				}

				stack.push({ indent, task });
			}
		}

		return tasks;
	}

	static taskToMarkdown(task: Task): string {
		let line = task.completed ? '- [x] ' : '- [ ] ';
		line += task.description;

		if (task.priority === TaskPriority.Highest) line += ' 🔝';
		else if (task.priority === TaskPriority.High) line += ' 🔺';
		else if (task.priority === TaskPriority.Medium) line += ' 🔼';
		else if (task.priority === TaskPriority.Low) line += ' 🔽';
		else if (task.priority === TaskPriority.Lowest) line += ' ⏬';

		if (task.dueDate) line += ` 📅 ${task.dueDate}`;
		if (task.scheduledDate) line += ` ⏳ ${task.scheduledDate}`;
		if (task.startDate) line += ` 🛫 ${task.startDate}`;
		if (task.completedDate) line += ` ✅ ${task.completedDate}`;
		if (task.recurrence) line += ` 🔁 every ${task.recurrence.frequency}`;

		if (task.tags.length > 0) {
			line += ' ' + task.tags.map(t => `#${t}`).join(' ');
		}

		return line;
	}
}
