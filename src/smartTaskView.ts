// @ts-nocheck
// ============================================================================
// 本文件从 main.js（esbuild 产物）中的 SmartTaskViewController 类恢复重建，
// 内容与用户工作区版本（含阶段二全部修复）语义一致；字段与方法签名为脚本生成，
// 使用 @ts-nocheck 保证恢复原样可构建，后续可逐步补充类型标注。
// ============================================================================
import { Modal, Notice, setIcon, TFile, Folder, normalizePath } from 'obsidian';
import SmartTaskPlugin from './main';
import { Task, TaskPriority, TaskQuery, TaskGroup, ViewType } from './types';
import { QueryEngine } from './queryEngine';
import { t } from './i18n';
import { formatLocalDate, parseLocalDate } from './dateUtils';
import { buildPriorityOptions } from './quickCreateHelpers';

const HIGHLIGHT_DURATION_MS = 2000;
const SEARCH_DEBOUNCE_MS = 150;

export class SmartTaskViewController {
	private plugin: SmartTaskPlugin;
	private container: HTMLElement;
	private mainEl: HTMLElement | null = null;
	private tasks: Task[] = [];
	private allTags: string[] = [];
	private highlightTimer: number | null = null;
	
	private currentView: ViewType = 'list';
	private timelineGroupBy: 'day' | 'week' | 'month' = 'day';
	private timelineStyle: 'classic' | 'gantt' | 'zigzag' | 'cards' = 'classic';
	private showQuickCreate = false;
	private showSearch = false;
	private searchQuery = '';
	private filterStatus: 'all' | 'done' | 'not-done' = 'not-done';
	private filterPriorities: TaskPriority[] = [];
	private filterTags: string[] = [];
	private dateFilter: 'all' | 'overdue' | 'today' | 'week' | 'month' = 'all';
	private expandedTasks: Set<string> = new Set();
	private searchDebounceTimer: number | null = null;
	private calendarYear = new Date().getFullYear();
	private calendarMonth = new Date().getMonth();

	// 布局 DOM 元素（A 方案：单行工具栏 + 面板容器）
	private functionalModuleEl: HTMLElement | null = null;
	private toolbarEl: HTMLElement | null = null;
	private filterBarEl: HTMLElement | null = null;
	private statsStripEl: HTMLElement | null = null;
	private searchInputEl: HTMLInputElement | null = null;
	private panelContainerEl: HTMLElement | null = null;
	private displayModuleEl: HTMLElement | null = null;
	private contentEl: HTMLElement | null = null;

	constructor(plugin: SmartTaskPlugin, container: HTMLElement) {
		this.plugin = plugin;
		this.container = container;
		this.tasks = plugin.getTasks();
		this.allTags = plugin.getAllTags();
		this.currentView = plugin.settings.defaultView;
		this.timelineGroupBy = plugin.settings.timelineGroupBy;
		this.timelineStyle = plugin.settings.timelineStyle;
	}

	render() {
		this.mainEl = this.container.createDiv({ cls: 'smarttask-container' });
		this.functionalModuleEl = this.mainEl.createDiv({ cls: 'functional-module' });
		this.renderToolbar();
		this.renderFilterBar();
		this.renderStatsStrip();
		this.renderPanels();
		this.displayModuleEl = this.mainEl.createDiv({ cls: 'display-module' });
		this.renderContent();
	}
	refresh() {
		if (this.mainEl) {
			this.mainEl.remove();
		}
		this.render();
	}
	destroy() {
		if (this.highlightTimer !== null) {
			window.clearTimeout(this.highlightTimer);
			this.highlightTimer = null;
		}
		if (this.searchDebounceTimer !== null) {
			window.clearTimeout(this.searchDebounceTimer);
			this.searchDebounceTimer = null;
		}
	}
	updateTasks(tasks, allTags) {
		this.tasks = tasks;
		this.allTags = allTags;
		// 只刷新统计条与内容，不重建工具栏（保持搜索框焦点）
		this.renderStatsStrip();
		this.renderContent();
	}
	private get filteredTasks(): Task[] {
		return QueryEngine.query(this.tasks, this.buildQuery());
	}
	private get groupedTasks(): TaskGroup[] {
		return QueryEngine.groupTasks(this.filteredTasks, this.plugin.settings.groupBy);
	}
	private buildQuery() {
		const query = {
			status: this.filterStatus,
			sortBy: this.plugin.settings.sortBy,
			sortOrder: this.plugin.settings.sortOrder
}
		if (this.searchQuery) {
			query.searchText = this.searchQuery;
		}
		if (this.filterPriorities.length > 0) {
			query.priority = this.filterPriorities;
		}
		if (this.filterTags.length > 0) {
			query.tags = this.filterTags;
		}
		const today = QueryEngine.getToday();
		if (this.dateFilter === 'overdue') {
			query.dueDate = { before: today };
		} else if (this.dateFilter === 'today') {
			query.dueDate = { equals: today };
		} else if (this.dateFilter === 'week') {
			const nextWeek = /* @__PURE__ */ new Date();
			nextWeek.setDate(nextWeek.getDate() + 7);
			query.dueDate = {
				after: today,
				before: formatLocalDate(nextWeek)
}
		} else if (this.dateFilter === 'month') {
			const nextMonth = /* @__PURE__ */ new Date();
			nextMonth.setMonth(nextMonth.getMonth() + 1);
			query.dueDate = {
				after: today,
				before: formatLocalDate(nextMonth)
}
		}
		return query;
	}
	private get hasActiveFilters(): boolean {
		return this.filterPriorities.length > 0 || this.filterTags.length > 0 || this.dateFilter !== 'all' || this.searchQuery.length > 0;
	}
		// ========== 功能模块（A 方案）：单行工具栏 + 筛选条 + 可折叠统计 + 面板容器 ==========

	private renderToolbar(): void {
		if (!this.functionalModuleEl) return;
		if (this.toolbarEl) {
			this.toolbarEl.remove();
			this.toolbarEl = null;
		}
		this.toolbarEl = this.functionalModuleEl.createDiv({ cls: 'smarttask-toolbar' });

		// 标题
		const titleArea = this.toolbarEl.createDiv({ cls: 'title-area' });
		titleArea.createSpan({ cls: 'smarttask-icon', text: '✅' });
		titleArea.createEl('h2', { text: 'SmartTask' });


		// 视图切换图标组（仅局部切换 active，不重建工具栏）
		const viewSwitcher = this.toolbarEl.createDiv({ cls: 'toolbar-views' });
		const views: { id: ViewType; icon: string; title: string }[] = [
			{ id: 'list', icon: 'list', title: t('tooltips').listView },
			{ id: 'kanban', icon: 'kanban', title: t('tooltips').kanbanView },
			{ id: 'calendar', icon: 'calendar', title: t('tooltips').calendarView },
			{ id: 'timeline', icon: 'bar-chart-3', title: t('tooltips').timelineView },
		];
		for (const v of views) {
			const btn = viewSwitcher.createEl('button', {
				cls: 'toolbar-view-btn',
				attr: { 'data-view': v.id, 'aria-label': v.title, 'data-tooltip': v.title }
			});
			if (this.currentView === v.id) btn.addClass('active');
			setIcon(btn, v.icon);
			btn.createSpan({ cls: 'toolbar-view-btn-label', text: v.title });
			btn.addEventListener('click', () => {
				if (this.currentView === v.id) return;
				this.currentView = v.id;
				this.showQuickCreate = false;
				this.showSearch = false;
				const siblings = btn.parentElement;
				if (siblings) {
					for (const child of Array.from(siblings.children)) {
						child.removeClass('active');
					}
				}
				btn.addClass('active');
				this.renderPanels();
				this.renderContent();
			});
		}
	}

	private renderFilterBar(): void {
		if (!this.functionalModuleEl) return;
		if (this.filterBarEl) {
			this.filterBarEl.remove();
			this.filterBarEl = null;
		}
		this.filterBarEl = this.functionalModuleEl.createDiv({ cls: 'smarttask-filterbar' });
		const tabs = [
			{ id: 'not-done', label: t('filters').pending },
			{ id: 'done', label: t('filters').done },
			{ id: 'all', label: t('filters').all },
		];
		for (const tab of tabs) {
			const btn = this.filterBarEl.createEl('button', {
				cls: 'filter-tab',
				text: tab.label,
				attr: { 'data-status': tab.id }
			});
			if (this.filterStatus === tab.id) btn.addClass('active');
			btn.addEventListener('click', () => {
				if (this.filterStatus === tab.id) return;
				this.filterStatus = tab.id as 'all' | 'done' | 'not-done';
				const tabsEl = btn.parentElement;
				if (tabsEl) {
					for (const child of Array.from(tabsEl.children)) {
						child.removeClass('active');
					}
				}
				btn.addClass('active');
				this.renderContent();
			});
		}

		// 搜索输入（第二行，实时过滤；聚焦时展开搜索/筛选面板）
		const searchWrap = this.filterBarEl.createDiv({ cls: 'toolbar-search' });
		searchWrap.createSpan({ cls: 'toolbar-search-icon', text: '🔍' });
		const searchInput = searchWrap.createEl('input', {
			type: 'text',
			cls: 'toolbar-search-input',
			attr: { placeholder: t('messages').searchPlaceholder, 'aria-label': t('messages').searchPlaceholder }
		});
		searchInput.value = this.searchQuery;
		this.searchInputEl = searchInput;
		searchInput.addEventListener('input', (e: Event) => {
			this.searchQuery = (e.target as HTMLInputElement).value;
			if (this.searchDebounceTimer !== null) {
				window.clearTimeout(this.searchDebounceTimer);
			}
			this.searchDebounceTimer = window.setTimeout(() => {
				this.searchDebounceTimer = null;
				this.renderContent();
			}, SEARCH_DEBOUNCE_MS);
		});
		searchInput.addEventListener('focus', () => {
			if (!this.showSearch) {
				this.showSearch = true;
				this.renderPanels();
			}
		});
		searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				this.showSearch = false;
				this.renderPanels();
				searchInput.blur();
			}
		});

		// 快速添加按钮
		const addBtn = this.filterBarEl.createEl('button', {
			cls: 'toolbar-add',
			attr: { 'aria-label': t('tooltips').quickCreate, 'data-tooltip': t('tooltips').quickCreate }
		});
		setIcon(addBtn, 'plus');
		addBtn.addEventListener('click', () => {
			this.showQuickCreate = !this.showQuickCreate;
			if (this.showQuickCreate) this.showSearch = false;
			this.renderPanels();
		});
	}

	private renderStatsStrip(): void {
		if (!this.functionalModuleEl || !this.toolbarEl) return;
		if (this.statsStripEl) {
			this.statsStripEl.remove();
			this.statsStripEl = null;
		}
		// 统计条恒显于第一行（标题与视图切换之间）
		this.statsStripEl = this.toolbarEl.createDiv({ cls: 'stats-strip' });
		this.toolbarEl.insertBefore(this.statsStripEl, this.toolbarEl.lastChild);
		this.renderStatsCompact(this.statsStripEl);
	}

	private renderStatsCompact(container: HTMLElement): void {
		const total = this.tasks.length;
		const done = this.tasks.filter(t => t.completed).length;
		const notDone = total - done;
		const overdue = QueryEngine.getOverdueTasks(this.tasks).length;
		const today = QueryEngine.getTodayTasks(this.tasks).length;
		const upcoming = QueryEngine.getUpcomingTasks(this.tasks, 7).length;
		const progress = total > 0 ? Math.round((done / total) * 100) : 0;

		const stats = [
			{ value: notDone, label: t('stats').pending, cls: 'pending' },
			{ value: overdue, label: t('stats').overdue, cls: 'overdue' },
			{ value: today, label: t('stats').today, cls: 'today' },
			{ value: upcoming, label: t('stats').upcoming, cls: 'upcoming' },
		];

		for (const s of stats) {
			const item = container.createDiv({ cls: `stat-item ${s.cls}` });
			item.createSpan({ cls: 'stat-label', text: s.label });
			item.createSpan({ cls: 'stat-num', text: s.value.toString() });
		}

		// 迷你进度条
		const progressMini = container.createDiv({ cls: 'progress-mini' });
		const bar = progressMini.createDiv({ cls: 'bar' });
		const fill = bar.createDiv({ cls: 'fill' });
		fill.setCssStyles({ width: `${progress}%` });
		progressMini.createSpan({ cls: 'pct', text: `${progress}%` });
	}

	private renderPanels(): void {
		if (!this.functionalModuleEl) return;
		if (!this.panelContainerEl) {
			this.panelContainerEl = this.functionalModuleEl.createDiv({ cls: 'smarttask-panels' });
		} else {
			this.panelContainerEl.empty();
		}
		try {
			if (this.showQuickCreate) {
				this.panelContainerEl.addClass('open');
				this.renderQuickCreatePanel(this.panelContainerEl);
			} else if (this.showSearch) {
				this.panelContainerEl.addClass('open');
				this.renderSearchPanel(this.panelContainerEl);
			} else {
				this.panelContainerEl.removeClass('open');
			}
		} catch (e) {
			console.error('[SmartTask] renderPanels failed:', e);
			new Notice(`SmartTask 面板渲染失败: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	private renderQuickCreatePanel(container: HTMLElement): void {
		if (!container) return;
		const panel = container.createDiv({ cls: 'quick-create' });

		// 面板头部：标题 + 关闭
		const panelHeader = panel.createDiv({ cls: 'compact-search-header' });
		panelHeader.createSpan({ text: t('ui').add });
		const closeBtn = panelHeader.createEl('button', {
			cls: 'compact-search-close',
			text: '✕',
			attr: { 'aria-label': t('ui').close }
		});
		closeBtn.addEventListener('click', () => {
			this.showQuickCreate = false;
			this.renderPanels();
		});

		const inputRow = panel.createDiv({ cls: 'quick-create-input-row' });

		const textarea = inputRow.createEl('textarea', {
			cls: 'quick-create-textarea',
			attr: { placeholder: t('quickCreate').placeholder, rows: '1' }
		});

		const addBtn = inputRow.createEl('button', { cls: 'add-btn', text: t('ui').add });

		const optionsRow = panel.createDiv({ cls: 'quick-create-options' });

		const dateSelect = optionsRow.createEl('select', { cls: 'quick-create-date' });
		const dateOpts = [
			{ value: '', label: `📅 ${t('quickCreate').noDate}` },
			{ value: 'today', label: `📅 ${t('quickCreate').today}` },
			{ value: 'tomorrow', label: `📅 ${t('quickCreate').tomorrow}` },
			{ value: 'custom', label: `📅 ${t('quickCreate').custom}` },
		];
		for (const opt of dateOpts) {
			dateSelect.createEl('option', { text: opt.label, value: opt.value });
		}

		const customDateInput = optionsRow.createEl('input', {
			type: 'date',
			cls: 'quick-create-custom-date',
		});

		let customDate = '';
		const updateDateLabel = () => {
			if (customDate) {
				const d = new Date(customDate);
				const label = `${d.getMonth() + 1}/${d.getDate()}`;
				for (let i = 0; i < dateSelect.options.length; i++) {
					if (dateSelect.options[i].value === 'custom') {
						dateSelect.options[i].textContent = `📅 ${label}`;
						break;
					}
				}
			} else {
				for (let i = 0; i < dateSelect.options.length; i++) {
					if (dateSelect.options[i].value === 'custom') {
						dateSelect.options[i].textContent = `📅 ${t('quickCreate').custom}`;
						break;
					}
				}
			}
		};

		dateSelect.addEventListener('change', () => {
			if (dateSelect.value === 'custom') {
				customDateInput.setCssStyles({ position: '', width: '', height: '', opacity: '', pointerEvents: '' });
				customDateInput.focus();
				try {
					(customDateInput as HTMLInputElement).showPicker();
				} catch {
					// fallback: user clicks the date input manually
				}
			} else {
				customDate = '';
				updateDateLabel();
				customDateInput.setCssStyles({ position: 'absolute', width: '0', height: '0', opacity: '0', pointerEvents: 'none' });
			}
		});

		customDateInput.addEventListener('change', () => {
			customDate = customDateInput.value;
			updateDateLabel();
		});

		const priSelect = optionsRow.createEl('select', { cls: 'quick-create-priority' });
		const priOpts = buildPriorityOptions();
		for (const opt of priOpts) {
			priSelect.createEl('option', { text: opt.label, value: opt.value });
		}

		const doSubmit = () => {
			const desc = textarea.value.trim();
			if (desc) {
				let dueDate: string | undefined;
				const dateVal = dateSelect.value;
				if (dateVal === 'custom') {
					dueDate = customDate || undefined;
				} else if (dateVal) {
					const d = new Date();
					if (dateVal === 'tomorrow') d.setDate(d.getDate() + 1);
					dueDate = formatLocalDate(d);
				}
				const priVal = priSelect.value;
				const priority = priVal ? priVal as TaskPriority : undefined;
				void this.plugin.createQuickTask(desc, dueDate, priority).then(() => {
					this.updateTasks(this.plugin.getTasks(), this.plugin.getAllTags());
				});
				textarea.value = '';
				dateSelect.value = '';
				customDateInput.value = '';
				customDate = '';
				updateDateLabel();
				priSelect.value = '';
				autoResize();
				textarea.focus();
			}
		};

		addBtn.addEventListener('click', doSubmit);

		textarea.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				doSubmit();
			}
		});

		const autoResize = () => {
			textarea.setCssStyles({ height: 'auto' });
			textarea.setCssStyles({ height: textarea.scrollHeight + 'px' });
		};

		textarea.addEventListener('input', autoResize);
	}

	private renderSearchPanel(container: HTMLElement): void {
		if (!container) return;
		const panel = container.createDiv({ cls: 'compact-search' });

		// 面板头部：标题 + 关闭（搜索关键词由工具栏输入框实时过滤）
		const panelHeader = panel.createDiv({ cls: 'compact-search-header' });
		panelHeader.createSpan({ text: t('ui').search });
		const closeBtn = panelHeader.createEl('button', {
			cls: 'compact-search-close',
			text: '✕',
			attr: { 'aria-label': t('ui').close }
		});
		closeBtn.addEventListener('click', () => {
			this.showSearch = false;
			this.renderPanels();
			if (this.searchInputEl) this.searchInputEl.blur();
		});

		// 筛选条件行
		const filtersEl = panel.createDiv({ cls: 'filter-chips' });

		// 日期筛选
		const dateSelect = filtersEl.createEl('select');
		const dateOpts = [
			{ value: 'all', label: `📅 ${t('filters').all}` },
			{ value: 'overdue', label: t('dates').overdue },
			{ value: 'today', label: t('dates').today },
			{ value: 'week', label: t('dates').thisWeek },
			{ value: 'month', label: t('dates').thisMonth },
		];
		for (const opt of dateOpts) {
			const option = dateSelect.createEl('option', { text: opt.label, value: opt.value });
			if (this.dateFilter === opt.value) option.selected = true;
		}
		dateSelect.addEventListener('change', () => {
			this.dateFilter = dateSelect.value as 'all' | 'overdue' | 'today' | 'week' | 'month';
			this.renderPanels();
			this.renderContent();
		});

		// 优先级筛选
		const priSelect = filtersEl.createEl('select');
		const priOpts: { value: string; label: string }[] = [
			{ value: '', label: `🎯 ${t('filters').all}` },
			{ value: 'highest', label: `🔝 ${t('priorities').highest}` },
			{ value: 'high', label: `🔺 ${t('priorities').high}` },
			{ value: 'medium', label: `🔼 ${t('priorities').medium}` },
			{ value: 'low', label: `🔽 ${t('priorities').low}` },
			{ value: 'lowest', label: `⏬ ${t('priorities').lowest}` },
		];
		for (const opt of priOpts) {
			const option = priSelect.createEl('option', { text: opt.label, value: opt.value });
			if (opt.value && this.filterPriorities.includes(opt.value as TaskPriority)) {
				option.selected = true;
			}
		}
		priSelect.addEventListener('change', () => {
			const val = priSelect.value;
			if (val) {
				this.filterPriorities = [val as TaskPriority];
			} else {
				this.filterPriorities = [];
			}
			this.renderPanels();
			this.renderContent();
		});

		// 标签输入
		const tagInput = filtersEl.createEl('input', {
			type: 'text',
			attr: { placeholder: t('messages').tagPlaceholder }
		});
		tagInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				const val = (e.target as HTMLInputElement).value.trim().replace(/^#/, '');
				if (val && !this.filterTags.includes(val)) {
					this.filterTags = [...this.filterTags, val];
					(e.target as HTMLInputElement).value = '';
					this.renderPanels();
					this.renderContent();
				}
			}
		});

		// 已选 chips
		if (this.filterTags.length > 0 || this.dateFilter !== 'all' || this.filterPriorities.length > 0) {
			if (this.dateFilter !== 'all') {
				const dateLabels: Record<string, string> = {
					'overdue': t('dates').overdue,
					'today': t('dates').today,
					'week': t('dates').thisWeek,
					'month': t('dates').thisMonth
				};
				const chip = filtersEl.createSpan({ cls: 'compact-chip active' });
				chip.createSpan({ text: `📅 ${dateLabels[this.dateFilter] || this.dateFilter}` });
				const removeBtn = chip.createEl('span', { cls: 'remove', text: '✕' });
				removeBtn.addEventListener('click', () => {
					this.dateFilter = 'all';
					this.renderPanels();
					this.renderContent();
				});
			}

			for (const p of this.filterPriorities) {
				const priEmojiMap: Record<string, string> = {
					'highest': '🔝', 'high': '🔺', 'medium': '🔼', 'low': '🔽', 'lowest': '⏬'
				};
				const priLabelMap: Record<string, string> = {
					'highest': t('priorities').highest,
					'high': t('priorities').high,
					'medium': t('priorities').medium,
					'low': t('priorities').low,
					'lowest': t('priorities').lowest
				};
				const chip = filtersEl.createSpan({ cls: 'compact-chip active' });
				chip.createSpan({ text: `${priEmojiMap[p] || ''} ${priLabelMap[p] || p}` });
				const removeBtn = chip.createEl('span', { cls: 'remove', text: '✕' });
				removeBtn.addEventListener('click', () => {
					this.filterPriorities = this.filterPriorities.filter(x => x !== p);
					this.renderPanels();
					this.renderContent();
				});
			}

			for (const tag of this.filterTags) {
				const chip = filtersEl.createSpan({ cls: 'compact-chip active' });
				chip.createSpan({ text: `#${tag}` });
				const removeBtn = chip.createEl('span', { cls: 'remove', text: '✕' });
				removeBtn.addEventListener('click', () => {
					this.filterTags = this.filterTags.filter(t => t !== tag);
					this.renderPanels();
					this.renderContent();
				});
			}
		}
	}
	private renderContent() {
		if (this.contentEl) {
			this.contentEl.remove();
			this.contentEl = null;
		}
		if (!this.displayModuleEl)
			return;
		this.contentEl = this.displayModuleEl.createDiv({ cls: 'smarttask-content' });
		if (this.plugin.settings.indexingEnabled && !this.plugin.isIndexReady() && this.tasks.length === 0) {
			this.renderSkeleton(this.contentEl);
			return;
		}
		if (this.currentView === 'list') {
			this.renderTaskList(this.contentEl, this.groupedTasks);
		} else if (this.currentView === 'kanban') {
			this.renderKanbanView(this.contentEl);
		} else if (this.currentView === 'timeline') {
			this.renderTimelineView(this.contentEl);
		} else if (this.currentView === 'calendar') {
			this.renderCalendarView(this.contentEl);
		}
	}
	private renderSkeleton(container) {
		const sk = container.createDiv({ cls: 'skeleton-container' });
		for (let i = 0; i < 6; i++) {
			const block = sk.createDiv({ cls: 'skeleton-block' });
			block.createDiv({ cls: 'skeleton-checkbox' });
			const lines = block.createDiv({});
			lines.createDiv({ cls: `skeleton-line ${i % 2 === 0 ? 'long' : 'medium'}` });
			lines.createDiv({ cls: 'skeleton-line short' });
		}
	}
	private renderTaskList(container, groups) {
		const listEl = container.createDiv({ cls: 'task-list' });
		const allEmpty = groups.length === 0 || groups.every((g) => g.tasks.length === 0);
		if (allEmpty) {
			const empty = listEl.createDiv({ cls: 'empty-state' });
			empty.createDiv({ cls: 'empty-icon', text: t('messages').emptyIcon });
			empty.createEl('p', { text: t('messages').noTasks });
			empty.createEl('p', { cls: 'empty-hint', text: t('messages').addTask });
			const guideBtn = empty.createEl('button', { cls: 'empty-guide-btn', text: t('ui').add });
			guideBtn.addEventListener('click', () => {
				this.showQuickCreate = true;
				this.showSearch = false;
				this.renderPanels();
			});
			return;
		}
		const visibleIds = /* @__PURE__ */ new Set();
		for (const t2 of this.filteredTasks)
			visibleIds.add(t2.id);
		const nestedSubtaskIds = /* @__PURE__ */ new Set();
		for (const t2 of this.filteredTasks) {
			if (t2.parentId && visibleIds.has(t2.parentId))
				nestedSubtaskIds.add(t2.id);
		}
		for (const group of groups) {
			const displayTasks = group.tasks.filter((t2) => !(t2.parentId && nestedSubtaskIds.has(t2.parentId)));
			if (displayTasks.length === 0)
				continue;
			if (group.name) {
				const groupEl = listEl.createDiv({ cls: 'task-group' });
				const header = groupEl.createDiv({ cls: 'group-header' });
				header.createSpan({ cls: 'group-name', text: group.name });
				header.createSpan({ cls: 'group-count', text: displayTasks.length.toString() });
				const tasksEl = groupEl.createDiv({ cls: 'group-tasks' });
				for (const task of displayTasks) {
					this.renderTaskItem(tasksEl, task);
				}
			} else {
				const flatEl = listEl.createDiv({ cls: 'flat-tasks' });
				for (const task of displayTasks) {
					this.renderTaskItem(flatEl, task);
				}
			}
		}
	}
	private renderKanbanView(container) {
		const kanbanEl = container.createDiv({ cls: 'kanban-view' });
		const todoTasks = this.filteredTasks.filter((t2) => !t2.completed);
		const doneTasks = this.filteredTasks.filter((t2) => t2.completed);
		const priorityColumns = [
			{ priority: 'highest' /* Highest */, label: t('priorities').highest, icon: 'flame', color: 'var(--priority-highest)' },
			{ priority: 'high' /* High */, label: t('priorities').high, icon: 'arrow-up', color: 'var(--priority-high)' },
			{ priority: 'medium' /* Medium */, label: t('priorities').medium, icon: 'minus', color: 'var(--priority-medium)' },
			{ priority: 'low' /* Low */, label: t('priorities').low, icon: 'arrow-down', color: 'var(--priority-low)' },
			{ priority: 'lowest' /* Lowest */, label: t('priorities').lowest, icon: 'chevrons-down', color: 'var(--priority-lowest)' }
		];
		if (this.filterStatus !== 'done') {
			for (const col of priorityColumns) {
				const colTasks = todoTasks.filter((t2) => t2.priority === col.priority);
				const colEl = kanbanEl.createDiv({
					cls: 'kanban-column',
					attr: { 'data-priority': col.priority, 'aria-label': col.label }
				});
				const header = colEl.createDiv({ cls: 'kanban-column-header' });
				const titleWrap = header.createDiv({ cls: 'kanban-column-title' });
				const iconWrap = titleWrap.createSpan({ cls: 'kanban-column-icon' });
				iconWrap.setCssStyles({ color: col.color });
				setIcon(iconWrap, col.icon);
				titleWrap.createSpan({ cls: 'kanban-column-name', text: col.label });
				const badge = header.createSpan({ cls: 'kanban-column-badge' });
				badge.setCssStyles({ background: col.color });
				badge.setText(String(colTasks.length));
				const taskList = colEl.createDiv({ cls: 'kanban-task-list' });
				for (const task of colTasks) {
					this.renderKanbanCard(taskList, task);
				}
				if (colTasks.length === 0) {
					const empty = taskList.createDiv({ cls: 'kanban-empty' });
					empty.setText(t('kanban').emptyTodo);
				}
				this.attachPriorityColumnDropTarget(colEl, col.priority);
			}
		}
		if (this.filterStatus !== 'not-done') {
			const doneCol = kanbanEl.createDiv({ cls: 'kanban-column done', attr: { 'aria-label': t('kanban').done } });
			const header = doneCol.createDiv({ cls: 'kanban-column-header' });
			const titleWrap = header.createDiv({ cls: 'kanban-column-title' });
			setIcon(titleWrap.createSpan({ cls: 'kanban-column-icon' }), 'check-circle-2');
			titleWrap.createSpan({ cls: 'kanban-column-name', text: t('kanban').done });
			const badge = header.createSpan({ cls: 'kanban-column-badge done' });
			badge.setText(String(doneTasks.length));
			const doneList = doneCol.createDiv({ cls: 'kanban-task-list' });
			for (const task of doneTasks) {
				this.renderKanbanCard(doneList, task);
			}
			if (doneTasks.length === 0) {
				const empty = doneList.createDiv({ cls: 'kanban-empty' });
				empty.setText(t('kanban').emptyDone);
			}
			this.attachColumnDropTarget(doneCol, true);
		}
	}
	private renderKanbanCard(container, task) {
		const priAttr = this.getPriorityDataAttr(task.priority);
		const card = container.createDiv({
			cls: 'kanban-card',
			attr: {
				...priAttr ? { 'data-priority': priAttr } : {},
				draggable: 'true',
				role: 'button',
				tabindex: '0',
				'aria-label': `${task.description}${task.completed ? '' : ' \u2014 pending'}${task.dueDate ? ` \u2014 due ${task.dueDate}` : ''}`
			}
		});
		if (task.completed)
			card.addClass('completed');
		if (this.isOverdue(task))
			card.addClass('overdue');
		const body = card.createDiv({ cls: 'kanban-card-body' });
		const topRow = body.createDiv({ cls: 'kanban-card-top' });
		const checkbox = topRow.createEl('input', {
			type: 'checkbox',
			cls: 'kanban-card-checkbox',
			attr: { 'aria-label': task.completed ? 'Mark as not done' : 'Mark as done' }
		});
		checkbox.checked = task.completed;
		checkbox.addEventListener('change', (e) => {
			e.stopPropagation();
			void this.plugin.toggleTaskStatus(task, checkbox.checked);
		});
		const descEl = topRow.createEl('span', { cls: 'kanban-card-desc', text: task.description });
		const meta = body.createDiv({ cls: 'kanban-card-meta' });
		if (task.dueDate) {
			const due = meta.createSpan({ cls: 'kanban-card-due' });
			setIcon(due, 'calendar');
			due.appendText(` ${this.formatDateShort(task.dueDate)}`);
			if (this.isOverdue(task))
				due.addClass('overdue');
		}
		if (task.subtasks.length > 0) {
			const progress = this.getSubtaskProgress(task);
			const sub = meta.createSpan({ cls: 'kanban-card-subtasks' });
			setIcon(sub, 'list-checks');
			sub.appendText(` ${progress.done}/${progress.total}`);
		}
		if (task.tags.length > 0) {
			const tag = meta.createSpan({ cls: 'kanban-card-tag' });
			setIcon(tag, 'tag');
			tag.appendText(` ${task.tags[0]}`);
			if (task.tags.length > 1) {
				tag.appendText(` +${task.tags.length - 1}`);
			}
		}
		const actions = body.createDiv({ cls: 'kanban-card-actions' });
		const editBtn = actions.createEl('button', {
			cls: 'kanban-card-action-btn',
			attr: { 'data-tooltip': t('tooltips').editTask, 'aria-label': t('tooltips').editTask }
		});
		setIcon(editBtn, 'pencil');
		editBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.openTaskEditor(task);
		});
		const addBtn = actions.createEl('button', {
			cls: 'kanban-card-action-btn',
			attr: { 'data-tooltip': t('tooltips').addSubtask, 'aria-label': t('tooltips').addSubtask }
		});
		setIcon(addBtn, 'plus');
		addBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			let subtaskInput = card.querySelector('.kanban-card-subtask-input');
			if (subtaskInput) {
				subtaskInput.remove();
				return;
			}
			subtaskInput = body.createDiv({ cls: 'kanban-card-subtask-input' });
			const input = subtaskInput.createEl('input', {
				type: 'text',
				attr: { placeholder: t('messages').subtaskDescPlaceholder }
			});
			const doAdd = () => {
				const desc = input.value.trim();
				if (desc) {
					void this.plugin.addSubtask(task, desc);
				}
}
			const addSubtaskBtn = subtaskInput.createEl('button', {
				cls: 'kanban-card-subtask-add-btn',
				text: t('ui').add
			});
			addSubtaskBtn.addEventListener('click', doAdd);
			input.addEventListener('keydown', (ev) => {
				if (ev.key === 'Enter')
					doAdd();
				if (ev.key === 'Escape')
					subtaskInput == null ? void 0 : subtaskInput.remove();
			});
			input.focus();
		});
		card.addEventListener('dragstart', (e) => {
			e.dataTransfer?.setData('text/plain', task.id);
			card.addClass('dragging');
		});
		card.addEventListener('dragend', () => {
			card.removeClass('dragging');
		});
		card.addEventListener('click', () => {
			this.plugin.openTaskFile(task.filePath, task.lineNumber);
		});
		card.addEventListener('keydown', (e) => {
			if (e.key === ' ' || e.key === 'Enter') {
				e.preventDefault();
				checkbox.checked = !checkbox.checked;
				void this.plugin.toggleTaskStatus(task, checkbox.checked);
			} else if (e.key === 'e' || e.key === 'E') {
				e.preventDefault();
				this.openTaskEditor(task);
			}
		});
	}
	private attachColumnDropTarget(col, completed) {
		col.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (e.dataTransfer)
				e.dataTransfer.dropEffect = 'move';
			col.addClass('drag-over');
		});
		col.addEventListener('dragleave', (e) => {
			if (!col.contains(e.relatedTarget)) {
				col.removeClass('drag-over');
			}
		});
		col.addEventListener('drop', (e) => {
			e.preventDefault();
			col.removeClass('drag-over');
			const taskId = e.dataTransfer?.getData('text/plain');
			if (taskId)
				this.handleKanbanDrop(taskId, completed);
		});
	}
	private attachPriorityColumnDropTarget(col, priority) {
		col.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (e.dataTransfer)
				e.dataTransfer.dropEffect = 'move';
			col.addClass('drag-over');
		});
		col.addEventListener('dragleave', (e) => {
			if (!col.contains(e.relatedTarget)) {
				col.removeClass('drag-over');
			}
		});
		col.addEventListener('drop', (e) => {
			e.preventDefault();
			col.removeClass('drag-over');
			const taskId = e.dataTransfer?.getData('text/plain');
			if (taskId)
				this.handlePriorityDrop(taskId, priority);
		});
	}
	private handleKanbanDrop(taskId, completed) {
		const task = this.tasks.find((tk) => tk.id === taskId);
		if (task && task.completed !== completed) {
			void this.plugin.toggleTaskStatus(task, completed);
		}
	}
	private handlePriorityDrop(taskId, priority) {
		const task = this.tasks.find((tk) => tk.id === taskId);
		if (task && task.priority !== priority) {
			void this.plugin.updateTask(task, { priority });
		}
	}
	private renderTaskItem(container, task, draggable = false) {
		const priAttr = this.getPriorityDataAttr(task.priority);
		const item = container.createDiv({
			cls: 'task-item',
			attr: {
				...priAttr ? { 'data-priority': priAttr } : {},
				role: 'button',
				tabindex: '0',
				'aria-label': `${task.description}${task.completed ? '' : ' \u2014 pending'}${task.dueDate ? ` \u2014 due ${task.dueDate}` : ''}`
			}
		});
		if (priAttr) {
			item.createSpan({ cls: `pri-dot pri-${priAttr}` });
		}
		if (draggable) {
			item.draggable = true;
			item.addEventListener('dragstart', (e) => {
				e.dataTransfer?.setData('text/plain', task.id);
				item.addClass('dragging');
			});
			item.addEventListener('dragend', () => {
				item.removeClass('dragging');
			});
		}
		if (task.completed)
			item.addClass('completed');
		if (this.isOverdue(task))
			item.addClass('overdue');
		if (this.isToday(task))
			item.addClass('today');
		const hasSubtasks = task.subtasks.length > 0;
		const expanded = this.expandedTasks.has(task.id) || hasSubtasks;
		if (hasSubtasks) {
			const expandBtn = item.createEl('button', { cls: 'expand-btn', text: expanded ? '\u25BC' : '\u25B6' });
			expandBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				if (this.expandedTasks.has(task.id)) {
					this.expandedTasks.delete(task.id);
				} else {
					this.expandedTasks.add(task.id);
				}
				this.renderContent();
			});
		} else {
			item.createSpan({ cls: 'expand-spacer' });
		}
		const checkboxWrap = item.createDiv({ cls: 'task-checkbox' });
		const checkbox = checkboxWrap.createEl('input', {
			type: 'checkbox'
		});
		checkbox.checked = task.completed;
		checkbox.addEventListener('change', (e) => {
			e.stopPropagation();
			void this.plugin.toggleTaskStatus(task, checkbox.checked);
		});
		item.addEventListener('keydown', (e) => {
			if (e.key === ' ' || e.key === 'Enter') {
				e.preventDefault();
				checkbox.checked = !checkbox.checked;
				void this.plugin.toggleTaskStatus(task, checkbox.checked);
			} else if (e.key === 'e' || e.key === 'E') {
				e.preventDefault();
				this.openTaskEditor(task);
			} else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				const items = Array.from(((_a = item.parentElement) == null ? void 0 : _a.querySelectorAll('.task-item')) || []);
				const idx = items.indexOf(item);
				const nextIdx = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
				if (nextIdx >= 0 && nextIdx < items.length) {
					items[nextIdx].focus();
				}
			} else if (e.key === 'Escape') {
				item.blur();
			}
		});
		const content = item.createDiv({ cls: 'task-content' });
		content.addEventListener('click', () => {
			this.plugin.openTaskFile(task.filePath, task.lineNumber);
		});
		const main = content.createDiv({ cls: 'task-main' });
		const priSpan = main.createSpan({
			cls: 'task-priority',
			text: this.getPriorityIcon(task.priority)
		});
		priSpan.setCssStyles({ color: this.getPriorityColor(task.priority) });
		const descSpan = main.createSpan({ cls: 'task-description' });
		this.renderDescriptionWithLinks(descSpan, task);
		const meta = content.createDiv({ cls: 'task-meta' });
		if (task.dueDate) {
			const dueSpan = meta.createSpan({ cls: 'task-due', text: `\u{1F4C5} ${this.formatDate(task.dueDate)}` });
			if (this.isOverdue(task))
				dueSpan.addClass('overdue');
		}
		if (hasSubtasks) {
			const progress = this.getSubtaskProgress(task);
			meta.createSpan({ cls: 'subtask-progress', text: `\u{1F4CB} ${progress.done}/${progress.total}` });
		}
		meta.createSpan({ cls: 'task-file', text: `\u{1F4C4} ${task.filePath.split('/').pop()}` });
		const metaActions = meta.createDiv({ cls: 'task-meta-actions' });
		const editBtn = metaActions.createEl('button', {
			cls: 'meta-action-btn',
			text: '\u270F\uFE0F',
			attr: { 'data-tooltip': t('tooltips').editTask, 'aria-label': t('tooltips').editTask }
		});
		editBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.openTaskEditor(task);
		});
		const addSubBtn = metaActions.createEl('button', {
			cls: 'meta-action-btn',
			text: '\u2795',
			attr: { 'data-tooltip': t('tooltips').addSubtask, 'aria-label': t('tooltips').addSubtask }
		});
		addSubBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			toggleAddSubtask();
		});
		if (this.plugin.settings.showSubtasks && hasSubtasks && expanded) {
			const subtasksEl = content.createDiv({ cls: 'subtasks' });
			for (const subtask of task.subtasks) {
				const stPri = this.getPriorityDataAttr(subtask.priority);
				const stItem = subtasksEl.createDiv({ cls: 'subtask-item', attr: stPri ? { 'data-priority': stPri } : {} });
				if (subtask.completed)
					stItem.addClass('completed');
				const stCheckbox = stItem.createEl('input', {
					type: 'checkbox'
				});
				stCheckbox.checked = subtask.completed;
				stCheckbox.addEventListener('change', (e) => {
					e.stopPropagation();
					void this.plugin.toggleSubtaskStatus(task, subtask.id, stCheckbox.checked);
				});
				stItem.createSpan({ cls: 'subtask-text', text: subtask.description });
				if (subtask.dueDate) {
					stItem.createSpan({ cls: 'subtask-due', text: this.formatDate(subtask.dueDate) });
				}
			}
		}
		let addSubtaskEl = null;
		let showAddSubtask = false;
		const toggleAddSubtask = () => {
			showAddSubtask = !showAddSubtask;
			if (showAddSubtask && !addSubtaskEl) {
				addSubtaskEl = content.createDiv({ cls: 'add-subtask' });
				const input = addSubtaskEl.createEl('input', {
					type: 'text',
					attr: { placeholder: t('messages').subtaskDescPlaceholder }
				});
				const addBtn = addSubtaskEl.createEl('button', {
					cls: 'add-subtask-btn',
					text: t('ui').add
				});
				const doAdd = () => {
					const desc = input.value.trim();
					if (desc) {
						void this.plugin.addSubtask(task, desc);
						showAddSubtask = false;
						if (addSubtaskEl) {
							addSubtaskEl.remove();
							addSubtaskEl = null;
						}
					}
}
				addBtn.addEventListener('click', doAdd);
				input.addEventListener('keydown', (e) => {
					if (e.key === 'Enter')
						doAdd();
					if (e.key === 'Escape') {
						showAddSubtask = false;
						if (addSubtaskEl) {
							addSubtaskEl.remove();
							addSubtaskEl = null;
						}
					}
				});
				input.focus();
			} else if (!showAddSubtask && addSubtaskEl) {
				addSubtaskEl.remove();
				addSubtaskEl = null;
			}
}
	}
	private isOverdue(task) {
		if (!task.dueDate || task.completed)
			return false;
		const today = formatLocalDate(/* @__PURE__ */ new Date());
		return task.dueDate < today;
	}
	private isToday(task) {
		if (!task.dueDate)
			return false;
		const today = formatLocalDate(/* @__PURE__ */ new Date());
		return task.dueDate === today;
	}
	private formatDate(dateStr) {
		const date = parseLocalDate(dateStr);
		const month = date.getMonth() + 1;
		const day = date.getDate();
		return `${month}/${day}`;
	}
	private getPriorityColor(priority) {
		switch (priority) {
			case 'highest' /* Highest */:
				return 'var(--priority-highest)';
			case 'high' /* High */:
				return 'var(--priority-high)';
			case 'medium' /* Medium */:
				return 'var(--priority-medium)';
			case 'low' /* Low */:
				return 'var(--priority-low)';
			case 'lowest' /* Lowest */:
				return 'var(--priority-lowest)';
			default:
				return 'transparent';
		}
	}
	private getPriorityDataAttr(priority) {
		switch (priority) {
			case 'highest' /* Highest */:
				return 'highest';
			case 'high' /* High */:
				return 'high';
			case 'medium' /* Medium */:
				return 'medium';
			case 'low' /* Low */:
				return 'low';
			case 'lowest' /* Lowest */:
				return 'lowest';
			default:
				return '';
		}
	}
	private getPriorityIcon(priority) {
		switch (priority) {
			case 'highest' /* Highest */:
				return '\u{1F51D}';
			case 'high' /* High */:
				return '\u{1F53A}';
			case 'medium' /* Medium */:
				return '\u{1F53C}';
			case 'low' /* Low */:
				return '\u{1F53D}';
			case 'lowest' /* Lowest */:
				return '\u23EC';
			default:
				return '';
		}
	}
	private getSubtaskProgress(task) {
		let done = 0;
		const total = task.subtasks.length;
		for (const st of task.subtasks) {
			if (st.completed)
				done++;
		}
		return { done, total };
	}
	private renderSubtasks(container, task) {
		if (!this.plugin.settings.showSubtasks || task.subtasks.length === 0)
			return;
		const expanded = this.expandedTasks.has(task.id) || task.subtasks.length > 0;
		if (!expanded)
			return;
		const subtasksEl = container.createDiv({ cls: 'subtasks timeline-subtasks' });
		for (const subtask of task.subtasks) {
			const stPri = this.getPriorityDataAttr(subtask.priority);
				const stItem = subtasksEl.createDiv({ cls: 'subtask-item', attr: stPri ? { 'data-priority': stPri } : {} });
			if (subtask.completed)
				stItem.addClass('completed');
			const stCheckbox = stItem.createEl('input', {
				type: 'checkbox'
			});
			stCheckbox.checked = subtask.completed;
			stCheckbox.addEventListener('change', (e) => {
				e.stopPropagation();
				void this.plugin.toggleSubtaskStatus(task, subtask.id, stCheckbox.checked);
			});
			stItem.createSpan({ cls: 'subtask-text', text: subtask.description });
			if (subtask.dueDate) {
				stItem.createSpan({ cls: 'subtask-due', text: this.formatDate(subtask.dueDate) });
			}
		}
	}
	private renderAddSubtaskInput(container, task) {
		const addSubtaskEl = container.createDiv({ cls: 'add-subtask' });
		const input = addSubtaskEl.createEl('input', {
			type: 'text',
			attr: { placeholder: t('messages').subtaskDescPlaceholder }
		});
		const addBtn = addSubtaskEl.createEl('button', {
			cls: 'add-subtask-btn',
			text: t('ui').add
		});
		const doAdd = () => {
			const desc = input.value.trim();
			if (desc) {
				void this.plugin.addSubtask(task, desc);
			}
}
		addBtn.addEventListener('click', doAdd);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter')
				doAdd();
		});
		input.focus();
		return addSubtaskEl;
	}
	private renderDescriptionWithLinks(container, task) {
		const desc = task.description;
		const combinedRegex = /(\[\[[^\]|]+(?:\|[^\]]+)?\]\])|(#[a-zA-Z0-9_\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5/-]*)/g;
		let lastIndex = 0;
		let match;
		while ((match = combinedRegex.exec(desc)) !== null) {
			if (match.index > lastIndex) {
				container.createSpan({ text: desc.substring(lastIndex, match.index) });
			}
			if (match[1]) {
				const wikilinkMatch = match[1].match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
				if (wikilinkMatch) {
					const target = wikilinkMatch[1].trim();
					const displayText = wikilinkMatch[2] ? wikilinkMatch[2].trim() : target;
					const linkEl = container.createSpan({
						cls: 'wikilink',
						text: displayText
					});
					linkEl.addEventListener('click', (e) => {
						e.stopPropagation();
						this.openWikiLink(target);
					});
				}
			} else if (match[2]) {
				const tagName = match[2].substring(1);
				const tagEl = container.createSpan({
					cls: 'task-tag',
					text: match[2]
				});
				tagEl.addEventListener('click', (e) => {
					e.stopPropagation();
					if (!this.filterTags.includes(tagName)) {
						this.filterTags = [...this.filterTags, tagName];
					} else {
						this.filterTags = this.filterTags.filter((t2) => t2 !== tagName);
					}
					this.showSearch = true;
					this.renderPanels();
					this.renderContent();
				});
			}
			lastIndex = match.index + match[0].length;
		}
		if (lastIndex < desc.length) {
			container.createSpan({ text: desc.substring(lastIndex) });
		}
	}
	private getPlainDescription(desc) {
		return desc.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (_match, p1) => p1.split('|')[0].trim()).replace(/#[a-zA-Z0-9_\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5/-]*/g, '').replace(/\s+/g, ' ').trim();
	}
	private async openWikiLink(target) {
		const vault = this.plugin.app.vault;
		const file = vault.getAbstractFileByPath(target);
		if (file instanceof TFile) {
			void this.plugin.app.workspace.openLinkText(file.path, '', true);
			return;
		}
		// 按文件名解析（Obsidian 内部链接语义，无需遍历全库）
		const linkDest = this.plugin.app.metadataCache.getFirstLinkpathDest(target, '');
		if (linkDest instanceof TFile) {
			void this.plugin.app.workspace.openLinkText(linkDest.path, '', true);
			return;
		}
		// 目标文档不存在 → 自动创建同名文档并打开
		try {
			const cleaned = normalizePath(target);
			const slash = cleaned.lastIndexOf('/');
			let folder = null;
			let fname = cleaned;
			if (slash >= 0) {
				const folderPath = cleaned.substring(0, slash);
				folder = vault.getFolderByPath(folderPath);
				if (!folder) {
					await vault.createFolder(folderPath);
					folder = vault.getFolderByPath(folderPath);
				}
				fname = cleaned.substring(slash + 1);
			}
			const newFile = await this.plugin.app.fileManager.createNewMarkdownFile(folder ?? vault.getRoot(), fname || 'Untitled');
			if (newFile) {
				await this.plugin.app.workspace.openLinkText(newFile.path, '', true);
				new Notice(`${t('messages').noteCreated}${newFile.path}`);
			}
		} catch (err) {
			console.error('[SmartTask] create note failed:', err);
			new Notice(`${t('messages').noteNotFound}${target}`);
		}
	}
	private renderTimelineView(container) {
		const timelineEl = container.createDiv({ cls: `timeline-view style-${this.timelineStyle}` });
		const toolbar = timelineEl.createDiv({ cls: 'timeline-toolbar-compact' });
		const navGroup = toolbar.createDiv({ cls: 'timeline-nav-group' });
		const prevBtn = navGroup.createEl('button', {
			cls: 'timeline-nav-btn',
			text: '\u25C0'
		});
		navGroup.createSpan({ cls: 'timeline-nav-label', text: this.getTimelineNavLabel() });
		const nextBtn = navGroup.createEl('button', {
			cls: 'timeline-nav-btn',
			text: '\u25B6'
		});
		const todayBtn = navGroup.createEl('button', {
			cls: 'timeline-nav-btn today-btn',
			text: t('dates').today
		});
		const chipsGroup = toolbar.createDiv({ cls: 'timeline-chips-row' });
		const groupOptions = [
			{ value: 'day', label: t('timeline').groupByDay },
			{ value: 'week', label: t('timeline').groupByWeek },
			{ value: 'month', label: t('timeline').groupByMonth }
		];
		for (const opt of groupOptions) {
			const chip = chipsGroup.createEl('button', {
				cls: 'timeline-chip',
				text: opt.label
			});
			if (this.timelineGroupBy === opt.value)
				chip.addClass('active');
			chip.addEventListener('click', () => {
				this.timelineGroupBy = opt.value;
				this.renderContent();
			});
		}
		const styleOptions = [
			{ value: 'classic', label: t('timelineStyles').classic },
			{ value: 'gantt', label: t('timelineStyles').gantt },
			{ value: 'zigzag', label: t('timelineStyles').zigzag },
			{ value: 'cards', label: t('timelineStyles').card }
		];
		for (const opt of styleOptions) {
			const chip = chipsGroup.createEl('button', {
				cls: 'timeline-chip',
				text: opt.label
			});
			if (this.timelineStyle === opt.value)
				chip.addClass('active');
			chip.addEventListener('click', () => {
				this.timelineStyle = opt.value;
				this.plugin.settings.timelineStyle = opt.value;
				void this.plugin.saveSettings();
				this.renderContent();
			});
		}
		const groups = this.getTimelineGroups();
		if (groups.length === 0) {
			const empty = timelineEl.createDiv({ cls: 'empty-state' });
			empty.createDiv({ cls: 'empty-icon', text: '\u{1F4C5}' });
			empty.createEl('p', { text: t('messages').noDatedTasks });
			empty.createEl('p', { cls: 'empty-hint', text: t('messages').addDueDateHint });
			return;
		}
		if (this.timelineStyle === 'classic') {
			this.renderClassicTimeline(timelineEl, groups, prevBtn, todayBtn, nextBtn);
		} else if (this.timelineStyle === 'gantt') {
			this.renderGanttTimeline(timelineEl, groups);
		} else if (this.timelineStyle === 'zigzag') {
			this.renderZigzagTimeline(timelineEl, groups);
		} else {
			this.renderCardsTimeline(timelineEl, groups);
		}
		if (this.timelineStyle !== 'classic') {
			todayBtn.addEventListener('click', () => {
				if (this.timelineStyle === 'gantt') {
					const header = timelineEl.querySelector('.gantt-header') as HTMLElement | null;
					const body = timelineEl.querySelector('.gantt-body') as HTMLElement | null;
					const todayLine = timelineEl.querySelector('.gantt-today-line') as HTMLElement | null;
					if (header && body && todayLine) {
						const targetLeft = Math.max(0, todayLine.offsetLeft - header.clientWidth / 2);
						header.scrollLeft = targetLeft;
						body.scrollLeft = targetLeft;
						todayLine.addClass('today-highlight');
						if (this.highlightTimer !== null) window.clearTimeout(this.highlightTimer);
						this.highlightTimer = window.setTimeout(() => todayLine.removeClass('today-highlight'), HIGHLIGHT_DURATION_MS);
					}
				} else if (this.timelineStyle === 'zigzag') {
					const todayGroup = timelineEl.querySelector('.zigzag-group.today-group') as HTMLElement | null;
					if (todayGroup) {
						todayGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
						todayGroup.addClass('today-highlight');
						if (this.highlightTimer !== null) window.clearTimeout(this.highlightTimer);
						this.highlightTimer = window.setTimeout(() => todayGroup.removeClass('today-highlight'), HIGHLIGHT_DURATION_MS);
					}
				} else {
					const todayKey = QueryEngine.getToday();
					const todaySection = timelineEl.querySelector(`.cards-section[data-group-key="${todayKey}"]`) as HTMLElement | null;
					if (todaySection) {
						todaySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
						todaySection.addClass('today-highlight');
						if (this.highlightTimer !== null) window.clearTimeout(this.highlightTimer);
						this.highlightTimer = window.setTimeout(() => todaySection.removeClass('today-highlight'), HIGHLIGHT_DURATION_MS);
					}
				}
			});
		}
	}
	private getTimelineNavLabel() {
		const today = /* @__PURE__ */ new Date();
		const weekdays = [
			t('dates').sun,
			t('dates').mon,
			t('dates').tue,
			t('dates').wed,
			t('dates').thu,
			t('dates').fri,
			t('dates').sat
		];
		return `${today.getMonth() + 1}/${today.getDate()} ${weekdays[today.getDay()]}`;
	}
	private renderClassicTimeline(timelineEl, groups, prevBtn, todayBtn, nextBtn) {
		const timelineContent = timelineEl.createDiv({ cls: 'timeline-content classic-content' });
		const groupEls = [];
		for (let i = 0; i < groups.length; i++) {
			const group = groups[i];
			const isToday = group.key === QueryEngine.getToday();
			const isOverdueGroup = group.key < QueryEngine.getToday();
			const groupEl = timelineContent.createDiv({
				cls: `timeline-group classic-group ${isToday ? 'today-group' : ''} ${isOverdueGroup ? 'overdue-group' : ''}`,
				attr: { 'data-group-key': group.key, 'data-group-index': i.toString() }
			});
			groupEls.push({ key: group.key, el: groupEl });
			const groupHeader = groupEl.createDiv({ cls: 'timeline-group-header classic-group-header' });
			const dot = groupHeader.createSpan({ cls: 'timeline-dot classic-dot' });
			if (isToday)
				dot.addClass('today');
			if (isOverdueGroup)
				dot.addClass('overdue');
			const titleWrap = groupHeader.createDiv({ cls: 'classic-title-wrap' });
			if (isToday) {
				titleWrap.createSpan({ cls: 'timeline-group-title today-title', text: group.name });
			} else if (isOverdueGroup) {
				titleWrap.createSpan({ cls: 'timeline-group-title overdue-title', text: group.name });
			} else {
				titleWrap.createSpan({ cls: 'timeline-group-title', text: group.name });
			}
			titleWrap.createSpan({ cls: 'timeline-group-count', text: `${group.tasks.length}` });
			const tasksEl = groupEl.createDiv({ cls: 'timeline-tasks classic-tasks' });
			this.renderTimelineTaskList(tasksEl, group.tasks);
		}
		todayBtn.addEventListener('click', () => {
			const todayKey = this.getTimelineGroupKey(QueryEngine.getToday());
			const todayGroup = groupEls.find((g) => g.key === todayKey);
			if (todayGroup) {
				todayGroup.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
				todayGroup.el.addClass('highlight');
				this.highlightTimer = window.setTimeout(() => todayGroup.el.removeClass('highlight'), HIGHLIGHT_DURATION_MS);
			} else {
				const today = QueryEngine.getToday();
				let closestGroup = groupEls[0];
				let minDiff = Infinity;
				for (const g of groupEls) {
					const diff = Math.abs(new Date(g.key).getTime() - new Date(today).getTime());
					if (diff < minDiff) {
						minDiff = diff;
						closestGroup = g;
					}
				}
				if (closestGroup) {
					closestGroup.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}
			}
		});
		prevBtn.addEventListener('click', () => {
			const firstVisible = this.findFirstVisibleGroup(groupEls);
			if (firstVisible > 0) {
				groupEls[firstVisible - 1].el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		});
		nextBtn.addEventListener('click', () => {
			const firstVisible = this.findFirstVisibleGroup(groupEls);
			if (firstVisible < groupEls.length - 1) {
				groupEls[firstVisible + 1].el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		});
	}
	private renderGanttTimeline(timelineEl, groups) {
		const ganttContainer = timelineEl.createDiv({ cls: 'gantt-timeline' });
		const ganttHeader = ganttContainer.createDiv({ cls: 'gantt-header' });
		const ganttBody = ganttContainer.createDiv({ cls: 'gantt-body' });
		ganttHeader.addEventListener('scroll', () => {
			ganttBody.scrollLeft = ganttHeader.scrollLeft;
		});
		const allTasks = [];
		for (const group of groups) {
			allTasks.push(...group.tasks);
		}
		const sortedTasks = allTasks.sort((a, b) => {
			const aStart = a.startDate || a.dueDate || '';
			const bStart = b.startDate || b.dueDate || '';
			if (!aStart)
				return 1;
			if (!bStart)
				return -1;
			return aStart.localeCompare(bStart);
		});
		const timeUnits = [];
		const unitToIndex = /* @__PURE__ */ new Map();
		if (this.timelineGroupBy === 'day') {
			let minDate = '';
			let maxDate = '';
			for (const task of sortedTasks) {
				const start2 = task.startDate || task.dueDate;
				const end2 = task.dueDate || task.startDate;
				if (start2 && (!minDate || start2 < minDate))
					minDate = start2;
				if (end2 && (!maxDate || end2 > maxDate))
					maxDate = end2;
			}
			if (!minDate || !maxDate) {
				const today2 = formatLocalDate(/* @__PURE__ */ new Date());
				minDate = today2;
				maxDate = today2;
			}
			const todayStr2 = formatLocalDate(/* @__PURE__ */ new Date());
			if (todayStr2 < minDate) minDate = todayStr2;
			if (todayStr2 > maxDate) maxDate = todayStr2;
			const start = parseLocalDate(minDate);
			const end = parseLocalDate(maxDate);
			const current = new Date(start);
			while (current <= end) {
				const dateStr = formatLocalDate(current);
				timeUnits.push(dateStr);
				unitToIndex.set(dateStr, timeUnits.length - 1);
				current.setDate(current.getDate() + 1);
			}
		} else if (this.timelineGroupBy === 'week') {
			for (const group of groups) {
				if (!unitToIndex.has(group.key)) {
					timeUnits.push(group.key);
					unitToIndex.set(group.key, timeUnits.length - 1);
				}
			}
			const todayWeekKey = this.getTimelineGroupKey(QueryEngine.getToday());
			if (!unitToIndex.has(todayWeekKey)) {
				timeUnits.push(todayWeekKey);
				unitToIndex.set(todayWeekKey, timeUnits.length - 1);
			}
		} else {
			for (const group of groups) {
				if (!unitToIndex.has(group.key)) {
					timeUnits.push(group.key);
					unitToIndex.set(group.key, timeUnits.length - 1);
				}
			}
			const todayMonthKey = QueryEngine.getToday().substring(0, 7);
			if (!unitToIndex.has(todayMonthKey)) {
				timeUnits.push(todayMonthKey);
				unitToIndex.set(todayMonthKey, timeUnits.length - 1);
			}
		}
		timeUnits.sort();
		unitToIndex.clear();
		for (let i = 0; i < timeUnits.length; i++) {
			unitToIndex.set(timeUnits[i], i);
		}
		const totalUnits = timeUnits.length;
		const today = QueryEngine.getToday();
		const todayIndex = unitToIndex.get(today);
		for (let i = 0; i < timeUnits.length; i++) {
			const unit = timeUnits[i];
			const headerCell = ganttHeader.createDiv({ cls: 'gantt-header-cell' });
			headerCell.setCssStyles({ width: `${100 / totalUnits}%` });
			if (unit === today)
				headerCell.addClass('today');
			headerCell.createSpan({ cls: 'gantt-date', text: this.formatDateShort(unit) });
		}
		for (let i = 0; i < sortedTasks.length; i++) {
			const task = sortedTasks[i];
			const row = ganttBody.createDiv({ cls: 'gantt-row' });
			if (task.completed)
				row.addClass('completed');
			const labelCell = row.createDiv({ cls: 'gantt-label' });
			const priDot = labelCell.createSpan({ cls: 'gantt-priority-dot' });
			priDot.setCssStyles({ background: this.getPriorityColor(task.priority) });
			const plainDesc = this.getPlainDescription(task.description);
			labelCell.createSpan({
				cls: 'gantt-task-label',
				text: plainDesc.length > 18 ? plainDesc.substring(0, 18) + '...' : plainDesc
			});
			const barsContainer = row.createDiv({ cls: 'gantt-bars' });
			if (todayIndex !== void 0) {
				const todayLine = barsContainer.createDiv({ cls: 'gantt-today-line' });
				todayLine.setCssStyles({ left: `${(todayIndex + 0.5) * (100 / totalUnits)}%` });
			}
			let left = 0;
			let width = 0;
			if (this.timelineGroupBy === 'day') {
				const startDate = task.startDate || task.dueDate;
				const endDate = task.dueDate || task.startDate;
				if (startDate && endDate && unitToIndex.has(startDate) && unitToIndex.has(endDate)) {
					left = unitToIndex.get(startDate);
					width = unitToIndex.get(endDate) - left + 1;
				}
			} else if (this.timelineGroupBy === 'week') {
				const startKey = task.startDate ? this.getTimelineGroupKey(task.startDate) : this.getTimelineGroupKey(task.dueDate);
				const endKey = task.dueDate ? this.getTimelineGroupKey(task.dueDate) : startKey;
				if (unitToIndex.has(startKey) && unitToIndex.has(endKey)) {
					left = unitToIndex.get(startKey);
					width = unitToIndex.get(endKey) - left + 1;
				}
			} else {
				const startKey = task.startDate ? task.startDate.substring(0, 7) : task.dueDate.substring(0, 7);
				const endKey = task.dueDate ? task.dueDate.substring(0, 7) : startKey;
				if (unitToIndex.has(startKey) && unitToIndex.has(endKey)) {
					left = unitToIndex.get(startKey);
					width = unitToIndex.get(endKey) - left + 1;
				}
			}
			if (width > 0) {
				const leftPct = left / totalUnits * 100;
				const widthPct = width / totalUnits * 100;
				const bar = barsContainer.createDiv({
					cls: 'gantt-bar',
					attr: { 'data-priority': task.priority }
				});
				bar.setCssProps({
					'--gantt-left': `${leftPct}%`,
					'--gantt-width': `${widthPct}%`
				});
				if (task.completed)
					bar.addClass('completed');
				if (this.isOverdue(task) && !task.completed) {
					bar.addClass('overdue');
				}
				const progress = task.subtasks.length > 0 ? this.getSubtaskProgress(task) : null;
				if (progress && progress.total > 0) {
					const progressPct = progress.done / progress.total * 100;
					bar.createDiv({ cls: 'gantt-bar-progress' }).setCssStyles({ width: `${progressPct}%` });
				}
				const plainDesc2 = this.getPlainDescription(task.description);
				const shortDesc = plainDesc2.length > 10 ? plainDesc2.substring(0, 10) + '...' : plainDesc2;
				bar.createDiv({ cls: 'gantt-bar-label', text: shortDesc });
				bar.title = `${plainDesc2}
${t('timeline').startLabel}: ${task.startDate || t('timeline').none}
${t('timeline').dueLabel}: ${task.dueDate || t('timeline').none}`;
				bar.addEventListener('click', () => {
					this.plugin.openTaskFile(task.filePath, task.lineNumber);
				});
			}
		}
	}
	private renderZigzagTimeline(timelineEl, groups) {
		const zigzagContainer = timelineEl.createDiv({ cls: 'zigzag-timeline' });
		zigzagContainer.createDiv({ cls: 'zigzag-center-line' });
		for (let i = 0; i < groups.length; i++) {
			const group = groups[i];
			const isLeft = i % 2 === 0;
			const isToday = group.key === QueryEngine.getToday();
			const isOverdueGroup = group.key < QueryEngine.getToday();
			const groupEl = zigzagContainer.createDiv({
				cls: `zigzag-group ${isLeft ? 'left' : 'right'} ${isToday ? 'today-group' : ''} ${isOverdueGroup ? 'overdue-group' : ''}`
			});
			const node = groupEl.createDiv({ cls: 'zigzag-node' });
			const nodeInner = node.createDiv({ cls: 'zigzag-node-inner' });
			if (isToday)
				nodeInner.addClass('today');
			if (isOverdueGroup)
				nodeInner.addClass('overdue');
			nodeInner.createSpan({ text: group.name.split(' ')[0] });
			const content = groupEl.createDiv({ cls: 'zigzag-content' });
			const contentCard = content.createDiv({ cls: 'zigzag-card' });
			const cardHeader = contentCard.createDiv({ cls: 'zigzag-card-header' });
			const titleWrap = cardHeader.createDiv({ cls: 'zigzag-card-title-wrap' });
			titleWrap.createSpan({ cls: 'zigzag-card-title', text: group.name });
			cardHeader.createSpan({ cls: 'zigzag-card-count', text: `${group.tasks.length}` });
			const taskList = contentCard.createDiv({ cls: 'zigzag-task-list' });
			for (const task of group.tasks) {
				const item = taskList.createDiv({
					cls: 'zigzag-task-item',
					attr: { 'data-priority': task.priority }
				});
				if (task.completed)
					item.addClass('completed');
				if (this.isOverdue(task) && !task.completed)
					item.addClass('overdue');
				const taskMain = item.createDiv({ cls: 'zigzag-task-main' });
				const checkbox = taskMain.createEl('input', {
					type: 'checkbox',
					cls: 'zigzag-task-checkbox',
					attr: { 'aria-label': task.completed ? 'Mark as not done' : 'Mark as done' }
				});
				checkbox.checked = task.completed;
				checkbox.addEventListener('change', (e) => {
					e.stopPropagation();
					void this.plugin.toggleTaskStatus(task, checkbox.checked);
				});
				const desc = taskMain.createSpan({ cls: 'zigzag-task-desc' });
				this.renderDescriptionWithLinks(desc, task);
				desc.addEventListener('click', () => {
					void this.plugin.openTaskFile(task.filePath, task.lineNumber);
				});
				const zigzagMeta = item.createDiv({ cls: 'zigzag-task-meta' });
				if (task.dueDate) {
					const due = zigzagMeta.createSpan({ cls: 'zigzag-meta-item due' });
					setIcon(due, 'calendar');
					due.appendText(` ${this.formatDateShort(task.dueDate)}`);
					if (this.isOverdue(task))
						due.addClass('overdue');
				}
				if (task.subtasks.length > 0) {
					const progress = this.getSubtaskProgress(task);
					const sub = zigzagMeta.createSpan({ cls: 'zigzag-meta-item subtasks' });
					setIcon(sub, 'list-checks');
					sub.appendText(` ${progress.done}/${progress.total}`);
				}
				const zigzagMetaActions = zigzagMeta.createDiv({ cls: 'zigzag-meta-actions' });
				const editBtn = zigzagMetaActions.createEl('button', {
					cls: 'zigzag-meta-btn',
					attr: { 'data-tooltip': t('tooltips').editTask, 'aria-label': t('tooltips').editTask }
				});
				setIcon(editBtn, 'pencil');
				editBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.openTaskEditor(task);
				});
			}
		}
	}
	private renderCardsTimeline(timelineEl, groups) {
		const cardsContainer = timelineEl.createDiv({ cls: 'cards-timeline' });
		for (const group of groups) {
			const section = cardsContainer.createDiv({ cls: 'cards-section', attr: { 'data-group-key': group.key } });
			const sectionHeader = section.createDiv({ cls: 'cards-section-header' });
			const titleWrap = sectionHeader.createDiv({ cls: 'cards-section-title-wrap' });
			const priBar = titleWrap.createSpan({ cls: 'cards-section-pri-bar' });
			titleWrap.createSpan({ cls: 'cards-section-title', text: group.name });
			sectionHeader.createSpan({ cls: 'cards-section-count', text: `${group.tasks.length}` });
			const cardsGrid = section.createDiv({ cls: 'cards-grid' });
			for (const task of group.tasks) {
				const card = cardsGrid.createDiv({
					cls: 'task-card',
					attr: { 'data-priority': task.priority }
				});
				if (task.completed)
					card.addClass('completed');
				if (this.isOverdue(task) && !task.completed)
					card.addClass('overdue');
				const cardLeft = card.createDiv({ cls: 'task-card-left' });
				const checkbox = cardLeft.createEl('input', {
					type: 'checkbox',
					cls: 'task-card-checkbox',
					attr: { 'aria-label': task.completed ? 'Mark as not done' : 'Mark as done' }
				});
				checkbox.checked = task.completed;
				checkbox.addEventListener('change', (e) => {
					e.stopPropagation();
					void this.plugin.toggleTaskStatus(task, checkbox.checked);
				});
				const cardBody = card.createDiv({ cls: 'task-card-body' });
				const desc = cardBody.createSpan({ cls: 'task-card-desc' });
				this.renderDescriptionWithLinks(desc, task);
				desc.addEventListener('click', () => {
					this.plugin.openTaskFile(task.filePath, task.lineNumber);
				});
				const cardMeta = cardBody.createDiv({ cls: 'task-card-meta' });
				if (task.dueDate) {
					const due = cardMeta.createSpan({ cls: 'task-card-meta-item due' });
					setIcon(due, 'calendar');
					due.appendText(` ${this.formatDateShort(task.dueDate)}`);
					if (this.isOverdue(task))
						due.addClass('overdue');
				}
				if (task.subtasks.length > 0) {
					const progress = this.getSubtaskProgress(task);
					const sub = cardMeta.createSpan({ cls: 'task-card-meta-item subtasks' });
					setIcon(sub, 'list-checks');
					sub.appendText(` ${progress.done}/${progress.total}`);
				}
				if (task.tags.length > 0) {
					const tag = cardMeta.createSpan({ cls: 'task-card-meta-item tag' });
					setIcon(tag, 'tag');
					tag.appendText(` ${task.tags[0]}`);
				}
				const cardActions = card.createDiv({ cls: 'task-card-actions' });
				const editBtn = cardActions.createEl('button', {
					cls: 'task-card-action-btn',
					attr: { 'data-tooltip': t('tooltips').editTask, 'aria-label': t('tooltips').editTask }
				});
				setIcon(editBtn, 'pencil');
				editBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.openTaskEditor(task);
				});
				const addSubBtn = cardActions.createEl('button', {
					cls: 'task-card-action-btn',
					attr: { 'data-tooltip': t('tooltips').addSubtask, 'aria-label': t('tooltips').addSubtask }
				});
				setIcon(addSubBtn, 'plus');
			}
		}
	}
	private renderTimelineTaskList(container, tasks) {
		for (const task of tasks) {
			const tPri = this.getPriorityDataAttr(task.priority);
				const item = container.createDiv({ cls: 'timeline-task-item', attr: tPri ? { 'data-priority': tPri } : {} });
			if (task.completed)
				item.addClass('completed');
			if (this.isOverdue(task))
				item.addClass('overdue');
			const hasSubtasks = task.subtasks.length > 0;
			const expanded = this.expandedTasks.has(task.id) || hasSubtasks;
			const checkboxWrap = item.createDiv({ cls: 'task-checkbox' });
			const checkbox = checkboxWrap.createEl('input', {
				type: 'checkbox'
			});
			checkbox.checked = task.completed;
			checkbox.addEventListener('change', (e) => {
				e.stopPropagation();
				void this.plugin.toggleTaskStatus(task, checkbox.checked);
			});
			const content = item.createDiv({ cls: 'timeline-task-content' });
			content.addEventListener('click', () => {
				void this.plugin.openTaskFile(task.filePath, task.lineNumber);
			});
			const main = content.createDiv({ cls: 'task-main' });
			if (hasSubtasks) {
				const expandBtn = main.createEl('button', { cls: 'expand-btn', text: expanded ? '\u25BC' : '\u25B6' });
				expandBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					if (this.expandedTasks.has(task.id)) {
						this.expandedTasks.delete(task.id);
					} else {
						this.expandedTasks.add(task.id);
					}
					this.refresh();
				});
			}
			const priSpan = main.createSpan({
				cls: 'task-priority',
				text: this.getPriorityIcon(task.priority)
			});
			priSpan.setCssStyles({ color: this.getPriorityColor(task.priority) });
			const descSpan = main.createSpan({ cls: 'task-description' });
			this.renderDescriptionWithLinks(descSpan, task);
			const meta = content.createDiv({ cls: 'task-meta' });
			meta.createSpan({ cls: 'task-file', text: `\u{1F4C4} ${task.filePath.split('/').pop()}` });
			if (hasSubtasks) {
				const progress = this.getSubtaskProgress(task);
				meta.createSpan({ cls: 'subtask-progress', text: `\u{1F4CB} ${progress.done}/${progress.total}` });
			}
			if (task.dueDate) {
				const dueSpan = meta.createSpan({ cls: 'task-due', text: `\u{1F4C5} ${this.formatDate(task.dueDate)}` });
				if (this.isOverdue(task))
					dueSpan.addClass('overdue');
			}
			const subtaskContent = item.createDiv({ cls: 'timeline-subtask-content' });
			this.renderSubtasks(subtaskContent, task);
			let addSubtaskEl = null;
			const metaActions = meta.createDiv({ cls: 'task-meta-actions' });
			const editBtn = metaActions.createEl('button', {
				cls: 'meta-action-btn',
				text: '\u270F\uFE0F',
				attr: { 'data-tooltip': t('tooltips').editTask, 'aria-label': t('tooltips').editTask }
			});
			editBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.openTaskEditor(task);
			});
			const addSubBtn = metaActions.createEl('button', {
				cls: 'meta-action-btn',
				text: '\u2795',
				attr: { 'data-tooltip': t('tooltips').addSubtask, 'aria-label': t('tooltips').addSubtask }
			});
			addSubBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				if (addSubtaskEl) {
					addSubtaskEl.remove();
					addSubtaskEl = null;
				} else {
					addSubtaskEl = this.renderAddSubtaskInput(subtaskContent, task);
				}
			});
		}
	}
	private formatDateShort(dateStr) {
		if (this.timelineGroupBy === 'day') {
			const parts = dateStr.split('-');
			return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
		} else if (this.timelineGroupBy === 'week') {
			return dateStr.replace('-W', 'W');
		} else {
			const parts = dateStr.split('-');
			return t('timeline').monthFormat.replace('{n}', String(parseInt(parts[1])));
		}
	}
	private getTimelineGroups() {
		const tasksWithDate = this.filteredTasks.filter((t2) => t2.dueDate);
		const groups = /* @__PURE__ */ new Map();
		for (const task of tasksWithDate) {
			const key = this.getTimelineGroupKey(task.dueDate);
			if (!groups.has(key)) {
				groups.set(key, []);
			}
			groups.get(key).push(task);
		}
		const result = [];
		const sortedKeys = Array.from(groups.keys()).sort();
		for (const key of sortedKeys) {
			result.push({
				key,
				name: this.formatTimelineGroupTitle(key),
				tasks: groups.get(key)
			});
		}
		return result;
	}
	private getTimelineGroupKey(dateStr) {
		if (this.timelineGroupBy === 'day') {
			return dateStr;
		} else if (this.timelineGroupBy === 'week') {
			const d = parseLocalDate(dateStr);
			const day = d.getDay() || 7;
			d.setDate(d.getDate() + 4 - day);
			const year = d.getFullYear();
			const firstDayOfYear = new Date(year, 0, 1);
			const weekNum = Math.ceil(((d.getTime() - firstDayOfYear.getTime()) / 864e5 + firstDayOfYear.getDay() + 1) / 7);
			return `${year}-W${weekNum.toString().padStart(2, '0')}`;
		} else {
			return dateStr.substring(0, 7);
		}
	}
	private formatTimelineGroupTitle(key) {
		if (this.timelineGroupBy === 'day') {
			const date = parseLocalDate(key);
			const today = /* @__PURE__ */ new Date();
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);
			const todayStr = formatLocalDate(today);
			const tomorrowStr = formatLocalDate(tomorrow);
			if (key === todayStr)
				return `${t('dates').today} (${this.formatDate(key)})`;
			if (key === tomorrowStr)
				return `${t('dates').tomorrow} (${this.formatDate(key)})`;
			const weekdays = [
				t('dates').sun,
				t('dates').mon,
				t('dates').tue,
				t('dates').wed,
				t('dates').thu,
				t('dates').fri,
				t('dates').sat
			];
			const weekday = weekdays[date.getDay()];
			return `${this.formatDate(key)} ${weekday}`;
		} else if (this.timelineGroupBy === 'week') {
			const [year, weekStr] = key.split('-W');
			const weekNum = parseInt(weekStr);
			const d = new Date(parseInt(year), 0, 1 + (weekNum - 1) * 7);
			const day = d.getDay() || 7;
			d.setDate(d.getDate() + 1 - day);
			const endDate = new Date(d);
			endDate.setDate(endDate.getDate() + 6);
			return `${this.formatDate(formatLocalDate(d))} ~ ${this.formatDate(formatLocalDate(endDate))}`;
		} else {
			const [year, month] = key.split('-');
			return t('calendar').yearMonthFormat.replace('{year}', year).replace('{month}', String(parseInt(month)));
		}
	}
	private findFirstVisibleGroup(groupEls) {
		const container = this.contentEl;
		if (!container)
			return 0;
		for (let i = 0; i < groupEls.length; i++) {
			const rect = groupEls[i].el.getBoundingClientRect();
			const containerRect = container.getBoundingClientRect();
			if (rect.top >= containerRect.top - 50) {
				return i;
			}
		}
		return groupEls.length - 1;
	}
	private openTaskEditor(task) {
		const modal = activeDocument.createElement('div');
		modal.className = 'task-editor-modal-overlay';
		const modalInner = modal.createDiv({ cls: 'task-editor-modal' });
		const header = modalInner.createDiv({ cls: 'task-editor-header' });
		header.createEl('h3', { text: t('editor').title });
		const closeBtn = header.createEl('button', { cls: 'task-editor-close', text: '\u2715', attr: { 'data-tooltip': t('ui').close, 'aria-label': t('ui').close } });
		const body = modalInner.createDiv({ cls: 'task-editor-body' });
		const descField = body.createDiv({ cls: 'task-editor-field' });
		descField.createEl('label', { text: t('editor').description });
		const descInput = descField.createEl('input', { type: 'text', cls: 'task-editor-input' });
		descInput.value = task.description;
		const dateField = body.createDiv({ cls: 'task-editor-field' });
		dateField.createEl('label', { text: t('editor').dueDate });
		const dateInput = dateField.createEl('input', { type: 'date', cls: 'task-editor-date' });
		if (task.dueDate)
			dateInput.value = task.dueDate;
		const priorityField = body.createDiv({ cls: 'task-editor-field' });
		priorityField.createEl('label', { text: t('editor').priority });
		const prioritySelect = priorityField.createEl('select', { cls: 'task-editor-priority' });
		const priorityOptions = [
			{ value: 'none', text: t('settings').none },
			{ value: 'highest', text: '\u{1F51D} ' + t('priorities').highest },
			{ value: 'high', text: '\u{1F53A} ' + t('priorities').high },
			{ value: 'medium', text: '\u{1F53C} ' + t('priorities').medium },
			{ value: 'low', text: '\u{1F53D} ' + t('priorities').low },
			{ value: 'lowest', text: '\u23EC ' + t('priorities').lowest }
		];
		for (const opt of priorityOptions) {
			prioritySelect.createEl('option', { value: opt.value, text: opt.text });
		}
		prioritySelect.value = task.priority;
		const tagsField = body.createDiv({ cls: 'task-editor-field' });
		tagsField.createEl('label', { text: t('editor').tags });
		const tagsInput = tagsField.createEl('input', { type: 'text', cls: 'task-editor-tags' });
		tagsInput.value = task.tags.join(', ');
		const footer = modalInner.createDiv({ cls: 'task-editor-footer' });
		const deleteBtn = footer.createEl('button', { cls: 'task-editor-btn delete-btn', text: t('editor').deleteTask });
		const actions = footer.createDiv({ cls: 'task-editor-actions' });
		const cancelBtn = actions.createEl('button', { cls: 'task-editor-btn cancel-btn', text: t('ui').cancel });
		const saveBtn = actions.createEl('button', { cls: 'task-editor-btn save-btn', text: t('ui').save });
		activeDocument.body.appendChild(modal);
		let onKeydown = null;
		const closeModal = () => {
			if (onKeydown)
				document.removeEventListener('keydown', onKeydown);
			modal.remove();
}
		onKeydown = (e) => {
			if (e.key === 'Escape')
				closeModal();
}
		document.addEventListener('keydown', onKeydown);
		closeBtn.addEventListener('click', closeModal);
		cancelBtn.addEventListener('click', closeModal);
		modal.addEventListener('click', (e) => {
			if (e.target === modal)
				closeModal();
		});
		saveBtn.addEventListener('click', () => {
			void (async () => {
				const newDesc = descInput.value.trim();
				const newDate = dateInput.value || void 0;
				const newPriority = prioritySelect.value;
				const newTags = tagsInput.value.split(',').map((t2) => t2.trim()).filter((t2) => t2.length > 0);
				if (!newDesc) {
					new Notice(t('editor').descEmpty);
					return;
				}
				try {
					await this.plugin.updateTask(task, {
						description: newDesc,
						dueDate: newDate,
						priority: newPriority,
						tags: newTags
					});
					closeModal();
					new Notice(t('editor').updated);
				} catch (e) {
					console.error('Failed to update task:', e);
					new Notice(t('editor').updateFailed);
				}
			})();
		});
		deleteBtn.addEventListener('click', () => {
			const confirmModal = new Modal(this.plugin.app);
			confirmModal.titleEl.setText(t('editor').confirmDeleteTitle);
			confirmModal.contentEl.createEl('p', { text: t('editor').confirmDeleteMessage });
			const btnContainer = confirmModal.contentEl.createDiv({ cls: 'modal-button-container' });
			const cancelBtn2 = btnContainer.createEl('button', { cls: 'mod-cta', text: t('ui').cancel });
			const deleteBtn2 = btnContainer.createEl('button', { cls: 'mod-danger', text: t('ui').delete });
			cancelBtn2.onclick = () => confirmModal.close();
			deleteBtn2.onclick = async () => {
				try {
					await this.plugin.deleteTask(task);
					closeModal();
					confirmModal.close();
					new Notice(t('editor').deleted);
				} catch (e) {
					console.error('Failed to delete task:', e);
					new Notice(t('editor').deleteFailed);
				}
}
			confirmModal.open();
		});
		descInput.focus();
		descInput.select();
	}
	private escapeHtml(text) {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
	private renderCalendarView(container) {
		const calendarEl = container.createDiv({ cls: 'calendar-view' });
		const header = calendarEl.createDiv({ cls: 'calendar-header' });
		const navGroup = header.createDiv({ cls: 'calendar-nav' });
		const prevMonthBtn = navGroup.createEl('button', {
			cls: 'calendar-nav-btn',
			text: '\u25C0',
			attr: { 'data-tooltip': t('calendar').prevMonth, 'aria-label': t('calendar').prevMonth }
		});
		navGroup.createSpan({
			cls: 'calendar-month-label',
			text: t('calendar').yearMonthFormat.replace('{year}', String(this.calendarYear)).replace('{month}', String(this.calendarMonth + 1))
		});
		const nextMonthBtn = navGroup.createEl('button', {
			cls: 'calendar-nav-btn',
			text: '\u25B6',
			attr: { 'data-tooltip': t('calendar').nextMonth, 'aria-label': t('calendar').nextMonth }
		});
		const todayBtn = header.createEl('button', {
			cls: 'calendar-today-btn',
			text: t('dates').today
		});
		const weekdays = t('calendar').weekdayShort;
		const weekdayRow = calendarEl.createDiv({ cls: 'calendar-weekdays' });
		for (const day of weekdays) {
			weekdayRow.createDiv({ cls: 'calendar-weekday', text: day });
		}
		const grid = calendarEl.createDiv({ cls: 'calendar-grid' });
		this.renderCalendarGrid(grid);
		prevMonthBtn.addEventListener('click', () => {
			this.calendarMonth--;
			if (this.calendarMonth < 0) {
				this.calendarMonth = 11;
				this.calendarYear--;
			}
			this.renderContent();
		});
		nextMonthBtn.addEventListener('click', () => {
			this.calendarMonth++;
			if (this.calendarMonth > 11) {
				this.calendarMonth = 0;
				this.calendarYear++;
			}
			this.renderContent();
		});
		todayBtn.addEventListener('click', () => {
			const now = /* @__PURE__ */ new Date();
			this.calendarYear = now.getFullYear();
			this.calendarMonth = now.getMonth();
			this.renderContent();
		});
	}
	private renderCalendarGrid(grid) {
		const firstDay = new Date(this.calendarYear, this.calendarMonth, 1);
		const lastDay = new Date(this.calendarYear, this.calendarMonth + 1, 0);
		const startWeekday = firstDay.getDay();
		const daysInMonth = lastDay.getDate();
		const today = /* @__PURE__ */ new Date();
		const todayStr = formatLocalDate(today);
		const tasksByDate = /* @__PURE__ */ new Map();
		for (const task of this.filteredTasks) {
			if (task.dueDate) {
				if (!tasksByDate.has(task.dueDate)) {
					tasksByDate.set(task.dueDate, []);
				}
				tasksByDate.get(task.dueDate).push(task);
			}
		}
		const prevMonth = this.calendarMonth === 0 ? 11 : this.calendarMonth - 1;
		const prevYear = this.calendarMonth === 0 ? this.calendarYear - 1 : this.calendarYear;
		const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
		for (let i = startWeekday - 1; i >= 0; i--) {
			const day = daysInPrevMonth - i;
			const cell = grid.createDiv({ cls: 'calendar-day other-month' });
			cell.createDiv({ cls: 'calendar-day-number', text: day.toString() });
		}
		for (let day = 1; day <= daysInMonth; day++) {
			const dateStr = `${this.calendarYear}-${String(this.calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			const dayTasks = tasksByDate.get(dateStr) || [];
			const isToday = dateStr === todayStr;
			const isOverdue = dayTasks.some((t2) => !t2.completed) && dateStr < todayStr;
			const cell = grid.createDiv({ cls: 'calendar-day' });
			if (isToday)
				cell.addClass('today');
			if (isOverdue)
				cell.addClass('has-overdue');
			if (dayTasks.length > 0)
				cell.addClass('has-tasks');
			cell.createDiv({ cls: 'calendar-day-number', text: day.toString() });
			if (dayTasks.length > 0) {
				const tasksContainer = cell.createDiv({ cls: 'calendar-day-tasks' });
				const notDone = dayTasks.filter((t2) => !t2.completed);
				const done = dayTasks.filter((t2) => t2.completed);
				const displayTasks = [...notDone, ...done].slice(0, 3);
				for (const task of displayTasks) {
					const cPri = this.getPriorityDataAttr(task.priority);
					const taskEl = tasksContainer.createDiv({ cls: 'calendar-task-item', attr: cPri ? { 'data-priority': cPri } : {} });
					if (task.completed)
						taskEl.addClass('completed');
					taskEl.addClass(`priority-${task.priority || 'none'}`);
					const priorityIcons = {
						'highest': '\u{1F51D}',
						'high': '\u{1F53A}',
						'medium': '\u{1F53C}',
						'low': '\u{1F53D}',
						'lowest': '\u23EC',
						'none': '\u2022'
}
					const icon = priorityIcons[task.priority || 'none'] || '\u2022';
					taskEl.createSpan({ cls: 'task-priority-icon', text: icon });
					taskEl.createSpan({
						cls: 'task-desc',
						text: task.description
					});
					taskEl.title = task.description;
					taskEl.addEventListener('click', (e) => {
						e.stopPropagation();
						this.plugin.openTaskFile(task.filePath, task.lineNumber);
					});
				}
				if (dayTasks.length > 3) {
					tasksContainer.createDiv({
						cls: 'calendar-more',
						text: `+${dayTasks.length - 3}`
					});
				}
			}
			cell.addEventListener('click', () => {
				if (dayTasks.length > 0) {
					this.showDayTasks(dateStr, dayTasks);
				}
			});
		}
		const totalCells = startWeekday + daysInMonth;
		const remainingCells = totalCells % 7 === 0 ? 0 : 7 - totalCells % 7;
		for (let i = 1; i <= remainingCells; i++) {
			const cell = grid.createDiv({ cls: 'calendar-day other-month' });
			cell.createDiv({ cls: 'calendar-day-number', text: i.toString() });
		}
	}
	private showDayTasks(dateStr, tasks) {
		const modal = activeDocument.createElement('div');
		modal.className = 'task-editor-modal-overlay';
		const modalInner = modal.createDiv({ cls: 'task-editor-modal' });
		const header = modalInner.createDiv({ cls: 'task-editor-header' });
		header.createEl('h3', { text: t('editor').dayTasks.replace('{date}', dateStr) });
		const closeBtn = header.createEl('button', { cls: 'task-editor-close', text: '\u2715', attr: { 'data-tooltip': t('ui').close, 'aria-label': t('ui').close } });
		const listEl = modalInner.createDiv({ cls: 'task-editor-body day-tasks-list' });
		for (const task of tasks) {
			const dPri = this.getPriorityDataAttr(task.priority);
				const item = listEl.createDiv({ cls: 'day-task-item', attr: dPri ? { 'data-priority': dPri } : {} });
			if (task.completed)
				item.addClass('completed');
			const checkbox = item.createEl('input', {
				type: 'checkbox'
			});
			checkbox.checked = task.completed;
			checkbox.addEventListener('change', (e) => {
				e.stopPropagation();
				void this.plugin.toggleTaskStatus(task, checkbox.checked);
			});
			const desc = item.createSpan({ cls: 'day-task-desc', text: task.description });
			desc.addEventListener('click', () => {
				this.plugin.openTaskFile(task.filePath, task.lineNumber);
				modal.remove();
			});
			item.createSpan({
				cls: 'day-task-priority',
				text: this.getPriorityIcon(task.priority)
			});
		}
		activeDocument.body.appendChild(modal);
		let onKeydown = null;
		const closeModal = () => {
			if (onKeydown)
				document.removeEventListener('keydown', onKeydown);
			modal.remove();
}
		onKeydown = (e) => {
			if (e.key === 'Escape')
				closeModal();
}
		document.addEventListener('keydown', onKeydown);
		closeBtn.addEventListener('click', closeModal);
		modal.addEventListener('click', (e) => {
			if (e.target === modal)
				closeModal();
		});
	}
	private showWheelDatePicker(callback, initialDate) {
		const modal = activeDocument.createElement('div');
		modal.className = 'wheel-picker-overlay';
		const now = /* @__PURE__ */ new Date();
		let year = now.getFullYear();
		let month = now.getMonth() + 1;
		let day = now.getDate();
		if (initialDate) {
			const parts = initialDate.split('-');
			if (parts.length === 3) {
				year = parseInt(parts[0]);
				month = parseInt(parts[1]);
				day = parseInt(parts[2]);
			}
		}
		const modalInner = modal.createDiv({ cls: 'wheel-picker-modal' });
		const header = modalInner.createDiv({ cls: 'wheel-picker-header' });
		const cancelBtn = header.createEl('button', { cls: 'wheel-picker-cancel', text: t('ui').cancel });
		header.createSpan({ cls: 'wheel-picker-title', text: t('editor').selectDate });
		const confirmBtn = header.createEl('button', { cls: 'wheel-picker-confirm', text: t('ui').ok });
		const body = modalInner.createDiv({ cls: 'wheel-picker-body' });
		const yearCol = body.createDiv({ cls: 'wheel-column', attr: { 'data-col': 'year' } });
		yearCol.createDiv({ cls: 'wheel-wrapper' });
		yearCol.createDiv({ cls: 'wheel-highlight' });
		const monthCol = body.createDiv({ cls: 'wheel-column', attr: { 'data-col': 'month' } });
		monthCol.createDiv({ cls: 'wheel-wrapper' });
		monthCol.createDiv({ cls: 'wheel-highlight' });
		const dayCol = body.createDiv({ cls: 'wheel-column', attr: { 'data-col': 'day' } });
		dayCol.createDiv({ cls: 'wheel-wrapper' });
		dayCol.createDiv({ cls: 'wheel-highlight' });
		activeDocument.body.appendChild(modal);
		const years = [];
		for (let y = year - 5; y <= year + 10; y++)
			years.push(y);
		const months = [];
		for (let m = 1; m <= 12; m++)
			months.push(m);
		const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();
		const ITEM_HEIGHT = 44;
		const VISIBLE_COUNT = 5;
		const setupColumn = (colEl, values, selected, format, onChange) => {
			const wrapper = colEl.querySelector('.wheel-wrapper');
			wrapper.empty();
			wrapper.setCssProps({ '--wheel-transition': 'transform 0.15s ease-out' });
			const padding = Math.floor(VISIBLE_COUNT / 2);
			for (let i = 0; i < padding; i++) {
				wrapper.createDiv({ cls: 'wheel-item wheel-empty' });
			}
			for (const v of values) {
				const item = wrapper.createDiv({ cls: 'wheel-item', text: format(v) });
				item.dataset.value = v.toString();
			}
			for (let i = 0; i < padding; i++) {
				wrapper.createDiv({ cls: 'wheel-item wheel-empty' });
			}
			const selectedIndex = values.indexOf(selected);
			let currentOffset = selectedIndex * ITEM_HEIGHT;
			wrapper.setCssProps({ '--wheel-offset': `${currentOffset}px` });
			let isDragging = false;
			let startY = 0;
			let startOffset = 0;
			const updateSelection = () => {
				const index = Math.round(currentOffset / ITEM_HEIGHT);
				const clampedIndex = Math.max(0, Math.min(values.length - 1, index));
				currentOffset = clampedIndex * ITEM_HEIGHT;
				wrapper.setCssProps({ '--wheel-offset': `${currentOffset}px` });
				return values[clampedIndex];
}
			const onStart = (clientY) => {
				isDragging = true;
				startY = clientY;
				startOffset = currentOffset;
				wrapper.setCssProps({ '--wheel-transition': 'none' });
}
			const onMove = (clientY) => {
				if (!isDragging)
					return;
				const delta = startY - clientY;
				currentOffset = startOffset + delta;
				const maxOffset = (values.length - 1) * ITEM_HEIGHT;
				currentOffset = Math.max(-ITEM_HEIGHT, Math.min(maxOffset + ITEM_HEIGHT, currentOffset));
				wrapper.setCssProps({ '--wheel-offset': `${currentOffset}px` });
}
			const onEnd = () => {
				if (!isDragging)
					return;
				isDragging = false;
				wrapper.setCssProps({ '--wheel-transition': 'transform 0.15s ease-out' });
				const newValue = updateSelection();
				onChange == null ? void 0 : onChange(newValue);
				activeDocument.removeEventListener('mousemove', onDocMove);
				activeDocument.removeEventListener('mouseup', onDocUp);
}
			const onDocMove = (e) => onMove(e.clientY);
			const onDocUp = () => onEnd();
			wrapper.addEventListener('mousedown', (e) => {
				e.preventDefault();
				onStart(e.clientY);
				activeDocument.addEventListener('mousemove', onDocMove);
				activeDocument.addEventListener('mouseup', onDocUp);
			});
			wrapper.addEventListener('touchstart', (e) => {
				onStart(e.touches[0].clientY);
			}, { passive: true });
			wrapper.addEventListener('touchmove', (e) => {
				onMove(e.touches[0].clientY);
			}, { passive: true });
			wrapper.addEventListener('touchend', onEnd);
			return {
				getValue: () => values[Math.max(0, Math.min(values.length - 1, Math.round(currentOffset / ITEM_HEIGHT)))],
				setValue: (v) => {
					const idx = values.indexOf(v);
					if (idx >= 0) {
						currentOffset = idx * ITEM_HEIGHT;
						wrapper.setCssProps({
							'--wheel-transition': 'transform 0.15s ease-out',
							'--wheel-offset': `${currentOffset}px`
						});
					}
				},
				destroy: () => {
					activeDocument.removeEventListener('mousemove', onDocMove);
					activeDocument.removeEventListener('mouseup', onDocUp);
				}
}
}
		let yearCtrl = null;
		let monthCtrl = null;
		let dayCtrl = null;
		const buildDayValues = () => {
			const days = [];
			const maxDay = getDaysInMonth(year, month);
			if (day > maxDay)
				day = maxDay;
			for (let d = 1; d <= maxDay; d++)
				days.push(d);
			return days;
}
		const refreshDayColumn = () => {
			dayCtrl?.destroy?.();
			dayCtrl = setupColumn(dayCol, buildDayValues(), day, (v) => `${v}${t('wheelPicker').daySuffix}`, (v) => {
				day = v;
			});
}
		yearCtrl = setupColumn(yearCol, years, year, (v) => `${v}${t('wheelPicker').yearSuffix}`, (v) => {
			year = v;
			refreshDayColumn();
		});
		monthCtrl = setupColumn(monthCol, months, month, (v) => `${v}${t('wheelPicker').monthSuffix}`, (v) => {
			month = v;
			refreshDayColumn();
		});
		refreshDayColumn();
		let onKeydown = null;
		const closeModal = () => {
			if (onKeydown)
				document.removeEventListener('keydown', onKeydown);
			yearCtrl?.destroy?.();
			monthCtrl?.destroy?.();
			dayCtrl?.destroy?.();
			modal.remove();
}
		onKeydown = (e) => {
			if (e.key === 'Escape')
				closeModal();
}
		document.addEventListener('keydown', onKeydown);
		cancelBtn.addEventListener('click', closeModal);
		modal.addEventListener('click', (e) => {
			if (e.target === modal)
				closeModal();
		});
		confirmBtn.addEventListener('click', () => {
			const y = (yearCtrl == null ? void 0 : yearCtrl.getValue()) || year;
			const m = (monthCtrl == null ? void 0 : monthCtrl.getValue()) || month;
			const d = (dayCtrl == null ? void 0 : dayCtrl.getValue()) || day;
			const dateStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
			callback(dateStr);
			closeModal();
		});
	}
}

