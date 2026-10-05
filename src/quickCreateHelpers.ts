import { TaskPriority } from './types';
import { t } from './i18n';

/**
 * 共享的快速创建选项构造器。
 * 由侧边栏快速创建面板（smartTaskView.ts）与 QuickCreateModal（main.ts）共用，
 * 消除两处独立维护的重复实现。
 */

export interface PriorityOption {
	value: string;
	label: string;
}

export interface QuickDateOption {
	label: string;
	days: number;
}

/** 优先级下拉选项（含"无优先级"）。emoji 前缀保留为视觉标记。 */
export function buildPriorityOptions(): PriorityOption[] {
	return [
		{ value: '', label: `⭐ ${t('quickCreate').noPriority}` },
		{ value: TaskPriority.Highest, label: `🔝 ${t('priorities').highest}` },
		{ value: TaskPriority.High, label: `🔺 ${t('priorities').high}` },
		{ value: TaskPriority.Medium, label: `🔼 ${t('priorities').medium}` },
		{ value: TaskPriority.Low, label: `🔽 ${t('priorities').low}` },
		{ value: TaskPriority.Lowest, label: `⏬ ${t('priorities').lowest}` },
	];
}

/** Modal 中"今天/明天/下周"快捷日期按钮。 */
export function buildQuickDateButtons(): QuickDateOption[] {
	return [
		{ label: t('quickCreate').today, days: 0 },
		{ label: t('quickCreate').tomorrow, days: 1 },
		{ label: t('quickCreate').nextWeek, days: 7 },
	];
}
