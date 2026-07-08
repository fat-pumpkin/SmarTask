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
		defaultSaveLocation: string;
		inboxFilePath: string;
		autoAddTags: string;
		defaultView: string;
		defaultPriority: string;
		showCompleted: string;
		timelineGrouping: string;
		timelineStyle: string;
		showSubtasks: string;
		groupBy: string;
		sortBy: string;
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
