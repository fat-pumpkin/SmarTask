/**
 * 本地时区日期工具。
 * 全插件原先大量使用 `new Date().toISOString().split('T')[0]` 取日期，
 * 而 toISOString() 返回的是 UTC 日期，UTC+8 用户在本地上午 0-8 点之间
 * 会把"今天"错算成"昨天"。统一改用本地时区格式化。
 */

/** 将 Date 格式化为本地时区下的 YYYY-MM-DD。 */
export function formatLocalDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/** 今天的本地日期字符串 YYYY-MM-DD。 */
export function todayLocal(): string {
	return formatLocalDate(new Date());
}

/**
 * 将 YYYY-MM-DD 解析为"本地时区"的 Date。
 * 直接 `new Date('YYYY-MM-DD')` 会按 UTC 解析，跨时区可能偏移一天。
 */
export function parseLocalDate(dateStr: string): Date {
	const parts = dateStr.split('-').map(Number);
	if (parts.length === 3 && parts.every((p) => Number.isFinite(p))) {
		return new Date(parts[0], parts[1] - 1, parts[2]);
	}
	return new Date(dateStr);
}
