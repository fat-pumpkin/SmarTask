export interface Task {
	id: string;
	description: string;
	completed: boolean;
	completedDate?: string;
	dueDate?: string;
	scheduledDate?: string;
	startDate?: string;
	priority: TaskPriority;
	tags: string[];
	wikiLinks: WikiLink[];
	recurrence?: RecurrenceRule;
	filePath: string;
	lineNumber: number;
	createdDate?: string;
	subtasks: Task[];
	parentId?: string;
}

export interface WikiLink {
	target: string;
	displayText?: string;
}

export enum TaskPriority {
	Highest = 'highest',
	High = 'high',
	Medium = 'medium',
	Low = 'low',
	Lowest = 'lowest',
	None = 'none',
}

export interface RecurrenceRule {
	frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
	interval: number;
	daysOfWeek?: number[];
	dayOfMonth?: number;
	count?: number;
	endDate?: string;
}

export interface TaskQuery {
	status?: 'all' | 'done' | 'not-done';
	dueDate?: {
		before?: string;
		after?: string;
		equals?: string;
	};
	priority?: TaskPriority[];
	tags?: string[];
	searchText?: string;
	limit?: number;
	sortBy?: SortField;
	sortOrder?: 'asc' | 'desc';
	groupBy?: GroupField;
}

export type SortField = 'dueDate' | 'priority' | 'description' | 'createdDate' | 'completedDate';
export type GroupField = 'file' | 'priority' | 'dueDate' | 'tag' | 'none';

export interface TaskGroup {
	name: string;
	tasks: Task[];
}

export interface SmartTaskSettings {
	tagFilter: string;
	showCompleted: boolean;
	defaultView: ViewType;
	defaultPriority: TaskPriority;
	indexingEnabled: boolean;
	indexInterval: number;
	showSubtasks: boolean;
	groupBy: GroupField;
	sortBy: SortField;
	sortOrder: 'asc' | 'desc';
	inboxFilePath: string;
	saveTarget: 'inbox' | 'currentFile' | 'dailyNote';
	autoAddTags: string[];
	dateFormat: string;
	timelineGroupBy: 'day' | 'week' | 'month';
	timelineStyle: 'classic' | 'gantt' | 'zigzag' | 'cards';
}

export type ViewType = 'list' | 'kanban' | 'calendar' | 'timeline';
export type SaveTarget = 'inbox' | 'currentFile' | 'dailyNote';

export const DEFAULT_SETTINGS: SmartTaskSettings = {
	tagFilter: '',
	showCompleted: false,
	defaultView: 'list',
	defaultPriority: TaskPriority.Medium,
	indexingEnabled: true,
	indexInterval: 5000,
	showSubtasks: true,
	groupBy: 'file',
	sortBy: 'dueDate',
	sortOrder: 'asc',
	inboxFilePath: 'SmartTask-Inbox.md',
	saveTarget: 'inbox',
	autoAddTags: [],
	dateFormat: 'YYYY-MM-DD',
	timelineGroupBy: 'day',
	timelineStyle: 'classic',
};
