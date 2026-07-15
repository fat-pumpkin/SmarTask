import { en } from './en';
import { zh } from './zh';

export type Locale = 'en' | 'zh';

export interface Translation {
	stats: {
		pending: string;
		overdue: string;
		today: string;
		upcoming: string;
	};
	dates: {
		today: string;
		tomorrow: string;
		week: string;
		day: string;
		month: string;
		overdue: string;
		thisWeek: string;
		thisMonth: string;
	};
	filters: {
		all: string;
		pending: string;
		done: string;
		searchPlaceholder: string;
		reset: string;
	};
	tabs: {
		list: string;
		kanban: string;
		calendar: string;
		timeline: string;
	};
	timelineStyles: {
		classic: string;
		zigzag: string;
		card: string;
		gantt: string;
	};
	priorities: {
		highest: string;
		high: string;
		medium: string;
		low: string;
		lowest: string;
	};
	saveTargets: {
		inbox: string;
		currentFile: string;
		dailyNote: string;
	};
	messages: {
		noTasks: string;
		addTask: string;
		quickCreatePlaceholder: string;
		searchPlaceholder: string;
		tagPlaceholder: string;
		subtask: string;
		subtasks: string;
	};
	commands: {
		openView: string;
		quickCreate: string;
		toggleStatus: string;
		addSubtask: string;
	};
	settings: {
		headingTaskConfiguration: string;
		headingTaskSaving: string;
		headingTaskDisplay: string;
		headingSortingGrouping: string;
		headingPerformance: string;
		headingKeyboardShortcuts: string;
		headingAbout: string;
		defaultSaveLocation: string;
		saveLocationDesc: string;
		inboxFilePath: string;
		inboxFilePathDesc: string;
		inboxFilePlaceholder: string;
		autoAddTags: string;
		autoAddTagsDesc: string;
		autoAddTagsPlaceholder: string;
		defaultView: string;
		defaultViewDesc: string;
		timelineGrouping: string;
		timelineGroupingDesc: string;
		defaultPriority: string;
		defaultPriorityDesc: string;
		showCompleted: string;
		showCompletedDesc: string;
		showSubtasks: string;
		showSubtasksDesc: string;
		timelineStyle: string;
		groupBy: string;
		groupByDesc: string;
		byFile: string;
		byPriority: string;
		byDueDate: string;
		byTag: string;
		noGrouping: string;
		sortBy: string;
		sortByDesc: string;
		dueDate: string;
		priority: string;
		description: string;
		createdDate: string;
		sortOrder: string;
		sortOrderDesc: string;
		ascending: string;
		descending: string;
		enableIndexing: string;
		enableIndexingDesc: string;
		none: string;
		aboutDescription: string;
		shortcutQuickCreate: string;
		shortcutToggleStatus: string;
		shortcutAddSubtask: string;
	};
}

export const translations: Record<Locale, Translation> = {
	en,
	zh
};

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale): void {
	currentLocale = locale;
}

export function getLocale(): Locale {
	return currentLocale;
}

export function t<K extends keyof Translation>(key: K): Translation[K] {
	return translations[currentLocale][key];
}

export function detectLocale(): Locale {
	const lang = window.navigator.language.toLowerCase();
	if (lang.startsWith('zh')) {
		return 'zh';
	}
	return 'en';
}
