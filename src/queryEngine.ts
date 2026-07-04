import { Task, TaskQuery, TaskGroup, GroupField, SortField, TaskPriority } from './types';

export class QueryEngine {
	static query(tasks: Task[], query: TaskQuery): Task[] {
		let results = [...tasks];

		if (query.status === 'done') {
			results = results.filter(t => t.completed);
		} else if (query.status === 'not-done') {
			results = results.filter(t => !t.completed);
		}

		if (query.dueDate) {
			results = results.filter(t => {
				if (!t.dueDate) return false;
				const due = t.dueDate;
				if (query.dueDate!.before && due >= query.dueDate!.before) return false;
				if (query.dueDate!.after && due <= query.dueDate!.after) return false;
				if (query.dueDate!.equals && due !== query.dueDate!.equals) return false;
				return true;
			});
		}

		if (query.priority && query.priority.length > 0) {
			results = results.filter(t => query.priority!.includes(t.priority));
		}

		if (query.tags && query.tags.length > 0) {
			results = results.filter(t =>
				query.tags!.some(tag => t.tags.includes(tag))
			);
		}

		if (query.searchText) {
			const searchLower = query.searchText.toLowerCase();
			results = results.filter(t =>
				t.description.toLowerCase().includes(searchLower)
			);
		}

		if (query.sortBy) {
			results = this.sortTasks(results, query.sortBy, query.sortOrder || 'asc');
		}

		if (query.limit && query.limit > 0) {
			results = results.slice(0, query.limit);
		}

		return results;
	}

	static groupTasks(tasks: Task[], groupBy: GroupField): TaskGroup[] {
		const groups = new Map<string, Task[]>();

		switch (groupBy) {
			case 'file':
				for (const task of tasks) {
					const fileName = task.filePath.split('/').pop() || task.filePath;
					if (!groups.has(fileName)) {
						groups.set(fileName, []);
					}
					groups.get(fileName)!.push(task);
				}
				break;

			case 'priority':
				const priorityOrder = [
					TaskPriority.Highest,
					TaskPriority.High,
					TaskPriority.Medium,
					TaskPriority.Low,
					TaskPriority.Lowest,
					TaskPriority.None,
				];
				for (const p of priorityOrder) {
					groups.set(this.priorityLabel(p), []);
				}
				for (const task of tasks) {
					const label = this.priorityLabel(task.priority);
					groups.get(label)!.push(task);
				}
				break;

			case 'dueDate':
				for (const task of tasks) {
					const key = task.dueDate || '无截止日期';
					if (!groups.has(key)) {
						groups.set(key, []);
					}
					groups.get(key)!.push(task);
				}
				break;

			case 'tag':
				for (const task of tasks) {
					if (task.tags.length === 0) {
						const key = '无标签';
						if (!groups.has(key)) groups.set(key, []);
						groups.get(key)!.push(task);
					} else {
						for (const tag of task.tags) {
							const key = `#${tag}`;
							if (!groups.has(key)) groups.set(key, []);
							groups.get(key)!.push(task);
						}
					}
				}
				break;

			default:
				groups.set('全部任务', tasks);
		}

		const result: TaskGroup[] = [];
		for (const [name, groupTasks] of groups) {
			if (groupTasks.length > 0 || groupBy === 'priority') {
				result.push({ name, tasks: groupTasks });
			}
		}

		if (groupBy === 'dueDate') {
			result.sort((a, b) => {
				if (a.name === '无截止日期') return 1;
				if (b.name === '无截止日期') return -1;
				return a.name.localeCompare(b.name);
			});
		}

		return result;
	}

	private static sortTasks(tasks: Task[], sortBy: SortField, order: 'asc' | 'desc'): Task[] {
		const sorted = [...tasks];

		const multiplier = order === 'asc' ? 1 : -1;

		sorted.sort((a, b) => {
			switch (sortBy) {
				case 'dueDate':
					if (!a.dueDate && !b.dueDate) return 0;
					if (!a.dueDate) return 1;
					if (!b.dueDate) return -1;
					return a.dueDate.localeCompare(b.dueDate) * multiplier;

				case 'priority':
					return (this.priorityValue(a.priority) - this.priorityValue(b.priority)) * multiplier;

				case 'description':
					return a.description.localeCompare(b.description) * multiplier;

				case 'createdDate':
					const aCreated = a.createdDate || '';
					const bCreated = b.createdDate || '';
					return aCreated.localeCompare(bCreated) * multiplier;

				case 'completedDate':
					const aCompleted = a.completedDate || '';
					const bCompleted = b.completedDate || '';
					return aCompleted.localeCompare(bCompleted) * multiplier;

				default:
					return 0;
			}
		});

		return sorted;
	}

	private static priorityValue(priority: TaskPriority): number {
		switch (priority) {
			case TaskPriority.Highest: return 5;
			case TaskPriority.High: return 4;
			case TaskPriority.Medium: return 3;
			case TaskPriority.Low: return 2;
			case TaskPriority.Lowest: return 1;
			case TaskPriority.None: return 0;
			default: return 0;
		}
	}

	private static priorityLabel(priority: TaskPriority): string {
		switch (priority) {
			case TaskPriority.Highest: return '🔝 最高';
			case TaskPriority.High: return '🔺 高';
			case TaskPriority.Medium: return '🔼 中';
			case TaskPriority.Low: return '🔽 低';
			case TaskPriority.Lowest: return '⏬ 最低';
			case TaskPriority.None: return '➖ 无优先级';
			default: return '➖ 无优先级';
		}
	}

	static getToday(): string {
		return new Date().toISOString().split('T')[0];
	}

	static getTomorrow(): string {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return tomorrow.toISOString().split('T')[0];
	}

	static getOverdueTasks(tasks: Task[]): Task[] {
		const today = this.getToday();
		return tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
	}

	static getTodayTasks(tasks: Task[]): Task[] {
		const today = this.getToday();
		return tasks.filter(t => !t.completed && t.dueDate === today);
	}

	static getUpcomingTasks(tasks: Task[], days: number = 7): Task[] {
		const today = this.getToday();
		const future = new Date();
		future.setDate(future.getDate() + days);
		const futureStr = future.toISOString().split('T')[0];

		return tasks.filter(t =>
			!t.completed &&
			t.dueDate &&
			t.dueDate >= today &&
			t.dueDate <= futureStr
		);
	}
}
