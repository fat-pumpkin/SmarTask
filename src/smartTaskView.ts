import { Modal, Notice } from 'obsidian';
import SmartTaskPlugin from './main';
import { Task, TaskPriority, TaskQuery, TaskGroup, ViewType } from './types';
import { QueryEngine } from './queryEngine';

export class SmartTaskViewController {
	private plugin: SmartTaskPlugin;
	private container: HTMLElement;
	private mainEl: HTMLElement | null = null;
	private tasks: Task[] = [];
	private allTags: string[] = [];
	
	private currentView: ViewType = 'list';
	private timelineGroupBy: 'day' | 'week' | 'month' = 'day';
	private timelineStyle: 'classic' | 'gantt' | 'zigzag' | 'cards' = 'classic';
	private showFilterPanel = false;
	private searchQuery = '';
	private filterStatus: 'all' | 'done' | 'not-done' = 'not-done';
	private filterPriorities: TaskPriority[] = [];
	private filterTags: string[] = [];
	private dateFilter: 'all' | 'overdue' | 'today' | 'week' | 'month' = 'all';
	private expandedTasks: Set<string> = new Set();
	
	private headerEl: HTMLElement | null = null;
	private quickCreateEl: HTMLElement | null = null;
	private searchRowEl: HTMLElement | null = null;
	private filterPanelEl: HTMLElement | null = null;
	private statsBarEl: HTMLElement | null = null;
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

	render(): void {
		this.mainEl = this.container.createDiv({ cls: 'smarttask-container' });
		this.renderHeader();
		this.renderQuickCreate();
		this.renderSearchRow();
		this.renderFilterPanel();
		this.renderStatsBar();
		this.renderContent();
	}

	refresh(): void {
		if (this.mainEl) {
			this.mainEl.remove();
		}
		this.render();
	}

	updateTasks(tasks: Task[], allTags: string[]): void {
		this.tasks = tasks;
		this.allTags = allTags;
		this.renderStatsBar();
		this.renderContent();
	}

	private get filteredTasks(): Task[] {
		return QueryEngine.query(this.tasks, this.buildQuery());
	}

	private get groupedTasks(): TaskGroup[] {
		return QueryEngine.groupTasks(this.filteredTasks, this.plugin.settings.groupBy);
	}

	private buildQuery(): TaskQuery {
		const query: TaskQuery = {
			status: this.filterStatus,
			sortBy: this.plugin.settings.sortBy,
			sortOrder: this.plugin.settings.sortOrder,
		};

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
			const nextWeek = new Date();
			nextWeek.setDate(nextWeek.getDate() + 7);
			query.dueDate = {
				after: today,
				before: nextWeek.toISOString().split('T')[0]
			};
		} else if (this.dateFilter === 'month') {
			const nextMonth = new Date();
			nextMonth.setMonth(nextMonth.getMonth() + 1);
			query.dueDate = {
				after: today,
				before: nextMonth.toISOString().split('T')[0]
			};
		}

		return query;
	}

	private get hasActiveFilters(): boolean {
		return this.filterPriorities.length > 0 || 
			this.filterTags.length > 0 || 
			this.dateFilter !== 'all' || 
			this.searchQuery.length > 0;
	}

	private renderHeader(): void {
		if (this.headerEl) {
			this.headerEl.remove();
			this.headerEl = null;
		}
		this.headerEl = this.mainEl!.createDiv({ cls: 'smarttask-header' });
		
		const titleEl = this.headerEl.createDiv({ cls: 'smarttask-title' });
		titleEl.createSpan({ cls: 'smarttask-icon', text: '✅' });
		titleEl.createEl('h2', { text: 'SmartTask' });

		const actionsEl = this.headerEl.createDiv({ cls: 'header-actions' });
		this.renderViewToggle(actionsEl);
	}

	private renderViewToggle(container: HTMLElement): void {
		const toggleEl = container.createDiv({ cls: 'view-toggle' });

		const views = [
			{ id: 'list', icon: '📋', title: '列表视图' },
			{ id: 'kanban', icon: '🗂️', title: '看板视图' },
			{ id: 'calendar', icon: '📅', title: '日历视图' },
			{ id: 'timeline', icon: '📊', title: '时间线视图' },
		];

		for (const view of views) {
			const btn = toggleEl.createEl('button', {
				cls: 'view-btn',
				text: view.icon,
				attr: { title: view.title }
			});
			if (this.currentView === view.id) btn.addClass('active');
			btn.addEventListener('click', () => {
				this.currentView = view.id as ViewType;
				this.renderHeader();
				this.renderContent();
			});
		}
	}

	private renderQuickCreate(): void {
		if (this.quickCreateEl) {
			this.quickCreateEl.remove();
			this.quickCreateEl = null;
		}
		this.quickCreateEl = this.mainEl!.createDiv({ cls: 'quick-create compact' });

		const inputWrap = this.quickCreateEl.createDiv({ cls: 'quick-create-input' });
		inputWrap.createSpan({ cls: 'quick-create-icon', text: '➕' });

		const chipContainer = inputWrap.createDiv({ cls: 'quick-chips' });
		
		const input = inputWrap.createEl('input', {
			type: 'text',
			attr: { placeholder: '快速创建任务... (按 Enter 提交)' }
		});

		let dueDate = '';
		let priority = '';

		const updateChips = () => {
			chipContainer.innerHTML = '';
			if (dueDate) {
				const chip = chipContainer.createSpan({ cls: 'quick-chip date-chip' });
				chip.createSpan({ text: `📅 ${dueDate}` });
				const removeBtn = chip.createEl('button', { text: '✕', cls: 'quick-chip-remove' });
				removeBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					dueDate = '';
					updateChips();
					input.focus();
				});
			}
			if (priority) {
				const priLabels: Record<string, string> = {
					'highest': '🔝',
					'high': '🔺',
					'medium': '🔼',
					'low': '🔽',
					'lowest': '⏬'
				};
				const chip = chipContainer.createSpan({ cls: `quick-chip priority-chip ${priority}` });
				chip.createSpan({ text: priLabels[priority] || priority });
				const removeBtn = chip.createEl('button', { text: '✕', cls: 'quick-chip-remove' });
				removeBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					priority = '';
					updateChips();
					input.focus();
				});
			}
		};

		const toolbar = this.quickCreateEl.createDiv({ cls: 'quick-toolbar' });
		
		const dateGroup = toolbar.createDiv({ cls: 'quick-tool-group' });
		dateGroup.createSpan({ cls: 'quick-tool-label', text: '📅' });
		const dateBtns = dateGroup.createDiv({ cls: 'quick-tool-btns' });
		const dateOptions = [
			{ value: 'today', label: '今天', title: '今天截止' },
			{ value: 'tomorrow', label: '明天', title: '明天截止' },
			{ value: 'week', label: '7天', title: '下周截止' },
		];
		for (const opt of dateOptions) {
			const btn = dateBtns.createEl('button', {
				cls: 'quick-tool-btn',
				text: opt.label,
				attr: { title: opt.title }
			});
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				let d = new Date();
				if (opt.value === 'tomorrow') d.setDate(d.getDate() + 1);
				if (opt.value === 'week') d.setDate(d.getDate() + 7);
				dueDate = d.toISOString().split('T')[0];
				updateChips();
				input.focus();
			});
		}
		const dateInputBtn = dateBtns.createEl('button', {
			cls: 'quick-tool-btn',
			text: '📅 自定义',
			attr: { title: '自定义截止日期' }
		});
		dateInputBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.showWheelDatePicker((date) => {
				dueDate = date;
				updateChips();
				input.focus();
			}, dueDate);
		});

		const priGroup = toolbar.createDiv({ cls: 'quick-tool-group' });
		priGroup.createSpan({ cls: 'quick-tool-label', text: '🎯' });
		const priBtns = priGroup.createDiv({ cls: 'quick-tool-btns' });
		const priorities = [
			{ value: 'highest', label: '🔝', title: '最高优先级' },
			{ value: 'high', label: '🔺', title: '高优先级' },
			{ value: 'medium', label: '🔼', title: '中优先级' },
			{ value: 'low', label: '🔽', title: '低优先级' },
		];
		for (const p of priorities) {
			const btn = priBtns.createEl('button', {
				cls: `quick-tool-btn priority-${p.value}`,
				text: p.label,
				attr: { title: p.title }
			});
			if (priority === p.value) btn.addClass('active');
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				priority = priority === p.value ? '' : p.value;
				updateChips();
				input.focus();
			});
		}

		input.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				const desc = input.value.trim();
				if (desc) {
					void this.plugin.createQuickTask(desc, dueDate || undefined, priority ? (priority as TaskPriority) : undefined);
					input.value = '';
					dueDate = '';
					priority = '';
					updateChips();
				}
			}
		});

		let submitBtn: HTMLElement | null = null;
		const checkSubmitBtn = () => {
			if (input.value.trim() && !submitBtn) {
				submitBtn = inputWrap.createEl('button', { cls: 'submit-btn', text: '添加' });
				submitBtn.addEventListener('click', () => {
					const desc = input.value.trim();
					if (desc) {
						void this.plugin.createQuickTask(desc, dueDate || undefined, priority ? (priority as TaskPriority) : undefined);
						input.value = '';
						dueDate = '';
						priority = '';
						updateChips();
						if (submitBtn) {
							submitBtn.remove();
							submitBtn = null;
						}
					}
				});
			} else if (!input.value.trim() && submitBtn) {
				submitBtn.remove();
				submitBtn = null;
			}
		};

		input.addEventListener('input', checkSubmitBtn);
	}

	private renderSearchRow(): void {
		if (this.searchRowEl) {
			this.searchRowEl.remove();
			this.searchRowEl = null;
		}
		this.searchRowEl = this.mainEl!.createDiv({ cls: 'search-row' });

		const searchWrap = this.searchRowEl.createDiv({ cls: 'search-input-wrapper' });
		searchWrap.createSpan({ cls: 'search-icon', text: '🔍' });
		
		const searchInput = searchWrap.createEl('input', {
			type: 'text',
			attr: { placeholder: '搜索任务...' }
		});
		searchInput.value = this.searchQuery;

		let clearBtn: HTMLElement | null = null;
		const updateClearBtn = () => {
			if (this.searchQuery && !clearBtn) {
				clearBtn = searchWrap.createEl('button', { cls: 'clear-btn', text: '✕' });
				clearBtn.addEventListener('click', () => {
					this.searchQuery = '';
					searchInput.value = '';
					if (clearBtn) {
						clearBtn.remove();
						clearBtn = null;
					}
					this.renderContent();
				});
			} else if (!this.searchQuery && clearBtn) {
				clearBtn.remove();
				clearBtn = null;
			}
		};
		updateClearBtn();

		searchInput.addEventListener('input', (e: Event) => {
			this.searchQuery = (e.target as HTMLInputElement).value;
			updateClearBtn();
			this.renderContent();
		});

		const tabsEl = this.searchRowEl.createDiv({ cls: 'filter-tabs' });

		const tabs = [
			{ id: 'not-done', label: '待办' },
			{ id: 'done', label: '已完成' },
			{ id: 'all', label: '全部' },
		];

		for (const tab of tabs) {
			const btn = tabsEl.createEl('button', {
				cls: 'filter-tab',
				text: tab.label
			});
			if (this.filterStatus === tab.id) btn.addClass('active');
			btn.addEventListener('click', () => {
				this.filterStatus = tab.id as 'all' | 'done' | 'not-done';
				this.renderSearchRow();
				this.renderContent();
			});
		}

		const hasActiveFilters = this.filterPriorities.length > 0 || 
			this.filterTags.length > 0 || 
			this.dateFilter !== 'all';
		
		if (hasActiveFilters) {
			const filterChipsEl = this.searchRowEl.createDiv({ cls: 'active-filter-chips' });

			if (this.dateFilter !== 'all') {
				const dateLabels: Record<string, string> = {
					'overdue': '已逾期',
					'today': '今天',
					'week': '本周内',
					'month': '本月内'
				};
				const chip = filterChipsEl.createSpan({ 
					cls: 'filter-chip date-filter-chip',
					text: `📅 ${dateLabels[this.dateFilter] || this.dateFilter}` 
				});
				chip.createSpan({ cls: 'filter-chip-remove', text: '✕' });
				chip.addEventListener('click', () => {
					this.dateFilter = 'all';
					this.renderSearchRow();
					this.renderContent();
				});
			}

			for (const p of this.filterPriorities) {
				const priorityLabels: Record<string, string> = {
					'highest': '🔝 最高',
					'high': '🔺 高',
					'medium': '🔼 中',
					'low': '🔽 低',
					'lowest': '⏬ 最低'
				};
				const chip = filterChipsEl.createSpan({ 
					cls: 'filter-chip priority-filter-chip',
					text: priorityLabels[p] || p 
				});
				chip.createSpan({ cls: 'filter-chip-remove', text: '✕' });
				chip.addEventListener('click', () => {
					this.filterPriorities = this.filterPriorities.filter(x => x !== p);
					this.renderSearchRow();
					this.renderContent();
				});
			}

			for (const tag of this.filterTags) {
				const chip = filterChipsEl.createSpan({ 
					cls: 'filter-chip tag-filter-chip',
					text: `#${tag}` 
				});
				chip.createSpan({ cls: 'filter-chip-remove', text: '✕' });
				chip.addEventListener('click', () => {
					this.filterTags = this.filterTags.filter(t => t !== tag);
					this.renderSearchRow();
					this.renderContent();
				});
			}

			if (hasActiveFilters) {
				const clearAll = filterChipsEl.createSpan({ 
					cls: 'filter-chip clear-all-chip',
					text: '清除全部' 
				});
				clearAll.addEventListener('click', () => {
					this.filterPriorities = [];
					this.filterTags = [];
					this.dateFilter = 'all';
					this.renderSearchRow();
					this.renderContent();
				});
			}
		}
	}

	private renderFilterPanel(): void {
		if (this.filterPanelEl) {
			this.filterPanelEl.remove();
			this.filterPanelEl = null;
		}

		if (!this.showFilterPanel) return;

		this.filterPanelEl = this.mainEl!.createDiv({ cls: 'filter-panel' });

		const dateSection = this.filterPanelEl.createDiv({ cls: 'filter-section' });
		const dateHeader = dateSection.createDiv({ cls: 'filter-header' });
		dateHeader.createSpan({ cls: 'filter-title', text: '📅 日期筛选' });
		
		const dateOptions = dateSection.createDiv({ cls: 'filter-options' });
		const dateFilters = [
			{ value: 'all', label: '全部' },
			{ value: 'overdue', label: '已逾期' },
			{ value: 'today', label: '今天' },
			{ value: 'week', label: '本周内' },
			{ value: 'month', label: '本月内' },
		];
		for (const df of dateFilters) {
			const btn = dateOptions.createEl('button', {
				cls: 'date-btn',
				text: df.label
			});
			if (this.dateFilter === df.value) btn.addClass('active');
			btn.addEventListener('click', () => {
				this.dateFilter = df.value as 'all' | 'overdue' | 'today' | 'week' | 'month';
				this.renderFilterPanel();
				this.renderHeader();
				this.renderContent();
			});
		}

		const priSection = this.filterPanelEl.createDiv({ cls: 'filter-section' });
		const priHeader = priSection.createDiv({ cls: 'filter-header' });
		priHeader.createSpan({ cls: 'filter-title', text: '🎯 优先级' });
		
		const priOptions = priSection.createDiv({ cls: 'filter-options' });
		const priorities = [
			{ value: 'highest', label: '🔝 最高', color: 'error' },
			{ value: 'high', label: '🔺 高', color: 'accent' },
			{ value: 'medium', label: '🔼 中', color: 'warning' },
			{ value: 'low', label: '🔽 低', color: 'muted' },
			{ value: 'lowest', label: '⏬ 最低', color: 'faint' },
		];
		for (const p of priorities) {
			const btn = priOptions.createEl('button', {
				cls: 'priority-chip',
				text: p.label,
				attr: { 'data-color': p.color }
			});
			const priorityValue = p.value as TaskPriority;
			if (this.filterPriorities.includes(priorityValue)) btn.addClass('active');
			btn.addEventListener('click', () => {
				if (this.filterPriorities.includes(priorityValue)) {
					this.filterPriorities = this.filterPriorities.filter(x => x !== priorityValue);
				} else {
					this.filterPriorities = [...this.filterPriorities, priorityValue];
				}
				this.renderFilterPanel();
				this.renderHeader();
				this.renderContent();
			});
		}

		const tagSection = this.filterPanelEl.createDiv({ cls: 'filter-section' });
		const tagHeader = tagSection.createDiv({ cls: 'filter-header' });
		tagHeader.createSpan({ cls: 'filter-title', text: '🏷️ 标签' });
		if (this.allTags.length === 0) {
			tagHeader.createSpan({ cls: 'filter-hint', text: '暂无标签' });
		}
		
		const tagCloud = tagSection.createDiv({ cls: 'tag-cloud' });
		for (const tag of this.allTags) {
			const btn = tagCloud.createEl('button', {
				cls: 'tag-chip',
				text: `#${tag}`
			});
			if (this.filterTags.includes(tag)) btn.addClass('active');
			btn.addEventListener('click', () => {
				if (this.filterTags.includes(tag)) {
					this.filterTags = this.filterTags.filter(t => t !== tag);
				} else {
					this.filterTags = [...this.filterTags, tag];
				}
				this.renderFilterPanel();
				this.renderHeader();
				this.renderContent();
			});
		}

		const actions = this.filterPanelEl.createDiv({ cls: 'filter-actions' });
		const resetBtn = actions.createEl('button', { cls: 'reset-btn', text: '🔄 重置筛选' });
		resetBtn.addEventListener('click', () => {
			this.filterPriorities = [];
			this.filterTags = [];
			this.dateFilter = 'all';
			this.searchQuery = '';
			this.renderFilterPanel();
			this.renderHeader();
			this.renderSearchRow();
			this.renderContent();
		});
	}

	private renderStatsBar(): void {
		if (this.statsBarEl) {
			this.statsBarEl.remove();
			this.statsBarEl = null;
		}

		this.statsBarEl = this.mainEl!.createDiv({ cls: 'stats-bar' });

		const total = this.tasks.length;
		const done = this.tasks.filter(t => t.completed).length;
		const notDone = total - done;
		const overdue = QueryEngine.getOverdueTasks(this.tasks).length;
		const today = QueryEngine.getTodayTasks(this.tasks).length;
		const upcoming = QueryEngine.getUpcomingTasks(this.tasks, 7).length;
		const progress = total > 0 ? Math.round((done / total) * 100) : 0;

		const stats = [
			{ value: notDone, label: '待办', cls: '' },
			{ value: overdue, label: '逾期', cls: 'overdue' },
			{ value: today, label: '今日', cls: 'today' },
			{ value: upcoming, label: '7天内', cls: 'upcoming' },
		];

		for (let i = 0; i < stats.length; i++) {
			const s = stats[i];
			const item = this.statsBarEl.createDiv({ cls: `stat-item ${s.cls}` });
			item.createSpan({ cls: 'stat-value', text: s.value.toString() });
			item.createSpan({ cls: 'stat-label', text: s.label });
			if (i < stats.length - 1) {
				this.statsBarEl.createDiv({ cls: 'stat-divider' });
			}
		}

		this.statsBarEl.createDiv({ cls: 'stat-divider' });

		const progressItem = this.statsBarEl.createDiv({ cls: 'stat-item progress-item' });
		const progressBar = progressItem.createDiv({ cls: 'progress-bar' });
		progressBar.createDiv({ cls: 'progress-fill', attr: { style: `width: ${progress}%` } });
		progressItem.createSpan({ cls: 'progress-text', text: `${progress}%` });
	}

	private renderContent(): void {
		if (this.contentEl) {
			this.contentEl.remove();
			this.contentEl = null;
		}

		this.contentEl = this.mainEl!.createDiv({ cls: 'smarttask-content' });

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

	private renderTaskList(container: HTMLElement, groups: TaskGroup[]): void {
		const listEl = container.createDiv({ cls: 'task-list' });

		const allEmpty = groups.length === 0 || groups.every(g => g.tasks.length === 0);
		
		if (allEmpty) {
			const empty = listEl.createDiv({ cls: 'empty-state' });
			empty.createDiv({ cls: 'empty-icon', text: '🎉' });
			empty.createEl('p', { text: '暂无任务' });
			empty.createEl('p', { cls: 'empty-hint', text: '在上方输入框创建你的第一个任务吧！' });
			return;
		}

		for (const group of groups) {
			if (group.name) {
				const groupEl = listEl.createDiv({ cls: 'task-group' });
				const header = groupEl.createDiv({ cls: 'group-header' });
				header.createSpan({ cls: 'group-name', text: group.name });
				header.createSpan({ cls: 'group-count', text: group.tasks.length.toString() });
				const tasksEl = groupEl.createDiv({ cls: 'group-tasks' });
				for (const task of group.tasks) {
					this.renderTaskItem(tasksEl, task);
				}
			} else {
				const flatEl = listEl.createDiv({ cls: 'flat-tasks' });
				for (const task of group.tasks) {
					this.renderTaskItem(flatEl, task);
				}
			}
		}
	}

	private renderKanbanView(container: HTMLElement): void {
		const kanbanEl = container.createDiv({ cls: 'kanban-view' });

		const todoTasks = this.filteredTasks.filter(t => !t.completed);
		const doneTasks = this.filteredTasks.filter(t => t.completed);

		const todoCol = kanbanEl.createDiv({ cls: 'kanban-column' });
		todoCol.createEl('h3', { text: `📋 待办 (${todoTasks.length})` });
		const todoList = todoCol.createDiv({ cls: 'kanban-task-list' });
		for (const task of todoTasks) {
			this.renderTaskItem(todoList, task);
		}
		if (todoTasks.length === 0) {
			const empty = todoList.createDiv({ cls: 'kanban-empty' });
			empty.setText('暂无待办任务');
		}

		const doneCol = kanbanEl.createDiv({ cls: 'kanban-column done' });
		doneCol.createEl('h3', { text: `✅ 已完成 (${doneTasks.length})` });
		const doneList = doneCol.createDiv({ cls: 'kanban-task-list' });
		for (const task of doneTasks) {
			this.renderTaskItem(doneList, task);
		}
		if (doneTasks.length === 0) {
			const empty = doneList.createDiv({ cls: 'kanban-empty' });
			empty.setText('暂无已完成任务');
		}
	}

	private renderTaskItem(container: HTMLElement, task: Task): void {
		const item = container.createDiv({ cls: 'task-item' });
		if (task.completed) item.addClass('completed');
		if (this.isOverdue(task)) item.addClass('overdue');
		if (this.isToday(task)) item.addClass('today');

		const hasSubtasks = task.subtasks.length > 0;
		const expanded = this.expandedTasks.has(task.id) || hasSubtasks;

		if (hasSubtasks) {
			const expandBtn = item.createEl('button', { cls: 'expand-btn', text: expanded ? '▼' : '▶' });
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
			type: 'checkbox',
		});
		checkbox.checked = task.completed;
		checkbox.addEventListener('change', (e) => {
			e.stopPropagation();
			void this.plugin.toggleTaskStatus(task, checkbox.checked);
		});

		const content = item.createDiv({ cls: 'task-content' });
		content.addEventListener('click', () => {
			this.plugin.openTaskFile(task.filePath, task.lineNumber);
		});

		const main = content.createDiv({ cls: 'task-main' });
		main.createSpan({
			cls: 'task-priority',
			text: this.getPriorityIcon(task.priority),
			attr: { style: `color: ${this.getPriorityColor(task.priority)}` }
		});
		const descSpan = main.createSpan({ cls: 'task-description' });
		this.renderDescriptionWithLinks(descSpan, task);

		const meta = content.createDiv({ cls: 'task-meta' });

		if (task.dueDate) {
			const dueSpan = meta.createSpan({ cls: 'task-due', text: `📅 ${this.formatDate(task.dueDate)}` });
			if (this.isOverdue(task)) dueSpan.addClass('overdue');
		}

		if (hasSubtasks) {
			const progress = this.getSubtaskProgress(task);
			meta.createSpan({ cls: 'subtask-progress', text: `📋 ${progress.done}/${progress.total}` });
		}

		if (task.tags.length > 0) {
			const tagsSpan = meta.createSpan({ cls: 'task-tags' });
			for (const tag of task.tags.slice(0, 2)) {
				const tagEl = tagsSpan.createSpan({ cls: 'tag tag-clickable', text: `#${tag}` });
				tagEl.addEventListener('click', (e) => {
					e.stopPropagation();
					if (!this.filterTags.includes(tag)) {
						this.filterTags = [...this.filterTags, tag];
					}
					this.showFilterPanel = true;
					this.renderFilterPanel();
					this.renderHeader();
					this.renderContent();
				});
			}
			if (task.tags.length > 2) {
				tagsSpan.createSpan({ cls: 'tag tag-more', text: `+${task.tags.length - 2}` });
			}
		}

		meta.createSpan({ cls: 'task-file', text: `📄 ${task.filePath.split('/').pop()}` });

		if (this.plugin.settings.showSubtasks && hasSubtasks && expanded) {
			const subtasksEl = content.createDiv({ cls: 'subtasks' });
			for (const subtask of task.subtasks) {
				const stItem = subtasksEl.createDiv({ cls: 'subtask-item' });
				if (subtask.completed) stItem.addClass('completed');
				const stCheckbox = stItem.createEl('input', {
					type: 'checkbox',
				});
				stCheckbox.checked = subtask.completed;
				stItem.createSpan({ cls: 'subtask-text', text: subtask.description });
				if (subtask.dueDate) {
					stItem.createSpan({ cls: 'subtask-due', text: this.formatDate(subtask.dueDate) });
				}
			}
		}

		let addSubtaskEl: HTMLElement | null = null;
		let showAddSubtask = false;

		const toggleAddSubtask = () => {
			showAddSubtask = !showAddSubtask;
			if (showAddSubtask && !addSubtaskEl) {
				addSubtaskEl = content.createDiv({ cls: 'add-subtask' });
				const input = addSubtaskEl.createEl('input', {
					type: 'text',
					attr: { placeholder: '子任务描述...' }
				});
				const addBtn = addSubtaskEl.createEl('button', {
					cls: 'add-subtask-btn',
					text: '添加'
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
				};
				
				addBtn.addEventListener('click', doAdd);
				input.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') doAdd();
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
		};

		const actions = item.createDiv({ cls: 'task-actions' });
		const editBtn = actions.createEl('button', {
			cls: 'action-btn',
			text: '✏️',
			attr: { title: '编辑任务' }
		});
		editBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.openTaskEditor(task);
		});
		const addSubBtn = actions.createEl('button', {
			cls: 'action-btn add-subtask-btn-icon',
			text: '➕',
			attr: { title: '添加子任务' }
		});
		addSubBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			toggleAddSubtask();
		});
	}

	private isOverdue(task: Task): boolean {
		if (!task.dueDate || task.completed) return false;
		const today = new Date().toISOString().split('T')[0];
		return task.dueDate < today;
	}

	private isToday(task: Task): boolean {
		if (!task.dueDate) return false;
		const today = new Date().toISOString().split('T')[0];
		return task.dueDate === today;
	}

	private formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const month = date.getMonth() + 1;
		const day = date.getDate();
		return `${month}/${day}`;
	}

	private getPriorityColor(priority: TaskPriority): string {
		switch (priority) {
			case TaskPriority.Highest: return 'var(--text-error)';
			case TaskPriority.High: return 'var(--text-accent)';
			case TaskPriority.Medium: return 'var(--text-warning)';
			case TaskPriority.Low: return 'var(--text-muted)';
			case TaskPriority.Lowest: return 'var(--text-faint)';
			default: return 'transparent';
		}
	}

	private getPriorityIcon(priority: TaskPriority): string {
		switch (priority) {
			case TaskPriority.Highest: return '🔝';
			case TaskPriority.High: return '🔺';
			case TaskPriority.Medium: return '🔼';
			case TaskPriority.Low: return '🔽';
			case TaskPriority.Lowest: return '⏬';
			default: return '';
		}
	}

	private getSubtaskProgress(task: Task): { done: number; total: number } {
		let done = 0;
		const total = task.subtasks.length;
		for (const st of task.subtasks) {
			if (st.completed) done++;
		}
		return { done, total };
	}

	private renderSubtasks(container: HTMLElement, task: Task): void {
		if (!this.plugin.settings.showSubtasks || task.subtasks.length === 0) return;
		
		const expanded = this.expandedTasks.has(task.id) || task.subtasks.length > 0;
		if (!expanded) return;

		const subtasksEl = container.createDiv({ cls: 'subtasks timeline-subtasks' });
		for (const subtask of task.subtasks) {
			const stItem = subtasksEl.createDiv({ cls: 'subtask-item' });
			if (subtask.completed) stItem.addClass('completed');
			const stCheckbox = stItem.createEl('input', {
				type: 'checkbox',
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

	private renderAddSubtaskInput(container: HTMLElement, task: Task): HTMLElement {
		const addSubtaskEl = container.createDiv({ cls: 'add-subtask' });
		const input = addSubtaskEl.createEl('input', {
			type: 'text',
			attr: { placeholder: '子任务描述...' }
		});
		const addBtn = addSubtaskEl.createEl('button', {
			cls: 'add-subtask-btn',
			text: '添加'
		});
		
		const doAdd = () => {
			const desc = input.value.trim();
			if (desc) {
				void this.plugin.addSubtask(task, desc);
			}
		};
		
		addBtn.addEventListener('click', doAdd);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') doAdd();
		});
		input.focus();
		
		return addSubtaskEl;
	}

	private renderDescriptionWithLinks(container: HTMLElement, task: Task): void {
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
				const tag = match[2];
				const tagEl = container.createSpan({
					cls: 'inline-tag tag-clickable',
					text: `#${tag}`
				});
				tagEl.addEventListener('click', (e) => {
					e.stopPropagation();
					if (!this.filterTags.includes(tag)) {
						this.filterTags = [...this.filterTags, tag];
					}
					this.showFilterPanel = true;
					this.renderFilterPanel();
					this.renderHeader();
					this.renderContent();
				});
			}

			lastIndex = match.index + match[0].length;
		}

		if (lastIndex < desc.length) {
			container.createSpan({ text: desc.substring(lastIndex) });
		}
	}

	private openWikiLink(target: string): void {
		const file = this.plugin.app.vault.getAbstractFileByPath(target);
		if (file) {
			void this.plugin.app.workspace.openLinkText(target, '', true);
		} else {
			const files = this.plugin.app.vault.getFiles();
			const targetName = target.split('/').pop()?.toLowerCase();
			const found = files.find(f => f.basename.toLowerCase() === targetName);
			if (found) {
				void this.plugin.app.workspace.openLinkText(found.path, '', true);
			} else {
				new Notice(`未找到笔记: ${target}`);
			}
		}
	}

	private renderTimelineView(container: HTMLElement): void {
		const timelineEl = container.createDiv({ cls: `timeline-view style-${this.timelineStyle}` });

		const toolbar = timelineEl.createDiv({ cls: 'timeline-toolbar' });
		
		const leftGroup = toolbar.createDiv({ cls: 'timeline-toolbar-left' });
		const navGroup = leftGroup.createDiv({ cls: 'timeline-nav-group' });
		const prevBtn = navGroup.createEl('button', {
			cls: 'timeline-nav-btn',
			text: '◀',
			attr: { title: '上一时间段' }
		});
		const todayBtn = navGroup.createEl('button', {
			cls: 'timeline-nav-btn today-btn',
			text: '今天',
			attr: { title: '滚动到今天' }
		});
		const nextBtn = navGroup.createEl('button', {
			cls: 'timeline-nav-btn',
			text: '▶',
			attr: { title: '下一时间段' }
		});

		const rightGroup = toolbar.createDiv({ cls: 'timeline-toolbar-right' });
		const groupOptions = [
			{ value: 'day', label: '按日' },
			{ value: 'week', label: '按周' },
			{ value: 'month', label: '按月' },
		];
		const groupToggle = rightGroup.createDiv({ cls: 'timeline-group-toggle' });
		for (const opt of groupOptions) {
			const btn = groupToggle.createEl('button', {
				cls: 'timeline-group-btn',
				text: opt.label
			});
			if (this.timelineGroupBy === opt.value) btn.addClass('active');
			btn.addEventListener('click', () => {
				this.timelineGroupBy = opt.value as 'day' | 'week' | 'month';
				this.renderContent();
			});
		}

		const styleOptions = [
			{ value: 'classic', icon: '📋', label: '经典' },
			{ value: 'gantt', icon: '📊', label: '甘特' },
			{ value: 'zigzag', icon: '⚡', label: '交错' },
			{ value: 'cards', icon: '🃏', label: '卡片' },
		];
		const styleToggle = rightGroup.createDiv({ cls: 'timeline-style-toggle' });
		for (const opt of styleOptions) {
			const btn = styleToggle.createEl('button', {
				cls: 'timeline-style-btn',
				text: opt.icon,
				attr: { title: opt.label + '样式' }
			});
			if (this.timelineStyle === opt.value) btn.addClass('active');
			btn.addEventListener('click', () => {
				this.timelineStyle = opt.value as 'classic' | 'gantt' | 'zigzag' | 'cards';
				this.plugin.settings.timelineStyle = opt.value as 'classic' | 'gantt' | 'zigzag' | 'cards';
				void this.plugin.saveSettings();
				this.renderContent();
			});
		}

		const groups = this.getTimelineGroups();

		if (groups.length === 0) {
			const empty = timelineEl.createDiv({ cls: 'empty-state' });
			empty.createDiv({ cls: 'empty-icon', text: '📅' });
			empty.createEl('p', { text: '暂无带日期的任务' });
			empty.createEl('p', { cls: 'empty-hint', text: '为任务添加截止日期即可在时间线中查看' });
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
	}

	private renderClassicTimeline(timelineEl: HTMLElement, groups: { key: string; name: string; tasks: Task[] }[], prevBtn: HTMLElement, todayBtn: HTMLElement, nextBtn: HTMLElement): void {
		const timelineContent = timelineEl.createDiv({ cls: 'timeline-content classic-content' });
		const groupEls: { key: string; el: HTMLElement }[] = [];

		for (let i = 0; i < groups.length; i++) {
			const group = groups[i];
			const groupEl = timelineContent.createDiv({
				cls: 'timeline-group classic-group',
				attr: { 'data-group-key': group.key, 'data-group-index': i.toString() }
			});
			groupEls.push({ key: group.key, el: groupEl });

			const groupHeader = groupEl.createDiv({ cls: 'timeline-group-header classic-group-header' });
			groupHeader.createSpan({ cls: 'timeline-dot classic-dot' });
			groupHeader.createSpan({ cls: 'timeline-group-title', text: group.name });
			groupHeader.createSpan({ cls: 'timeline-group-count', text: `${group.tasks.length} 个任务` });

			const tasksEl = groupEl.createDiv({ cls: 'timeline-tasks classic-tasks' });
			this.renderTimelineTaskList(tasksEl, group.tasks);
		}

		todayBtn.addEventListener('click', () => {
			const todayKey = this.getTimelineGroupKey(QueryEngine.getToday());
			const todayGroup = groupEls.find(g => g.key === todayKey);
			if (todayGroup) {
				todayGroup.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
				todayGroup.el.addClass('highlight');
				window.setTimeout(() => todayGroup.el.removeClass('highlight'), 2000);
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

	private renderGanttTimeline(timelineEl: HTMLElement, groups: { key: string; name: string; tasks: Task[] }[]): void {
		const ganttContainer = timelineEl.createDiv({ cls: 'gantt-timeline' });
		const ganttHeader = ganttContainer.createDiv({ cls: 'gantt-header' });
		const ganttBody = ganttContainer.createDiv({ cls: 'gantt-body' });

		const allTasks: Task[] = [];
		for (const group of groups) {
			allTasks.push(...group.tasks);
		}

		const sortedTasks = allTasks.sort((a, b) => {
			const aStart = a.startDate || a.dueDate || '';
			const bStart = b.startDate || b.dueDate || '';
			if (!aStart) return 1;
			if (!bStart) return -1;
			return aStart.localeCompare(bStart);
		});

		const timeUnits: string[] = [];
		const unitToIndex = new Map<string, number>();

		if (this.timelineGroupBy === 'day') {
			let minDate = '';
			let maxDate = '';
			for (const task of sortedTasks) {
				const start = task.startDate || task.dueDate;
				const end = task.dueDate || task.startDate;
				if (start && (!minDate || start < minDate)) minDate = start;
				if (end && (!maxDate || end > maxDate)) maxDate = end;
			}
			if (!minDate || !maxDate) {
				const today = new Date().toISOString().split('T')[0];
				minDate = today;
				maxDate = today;
			}
			const start = new Date(minDate);
			const end = new Date(maxDate);
			const current = new Date(start);
			while (current <= end) {
				const dateStr = current.toISOString().split('T')[0];
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
		} else {
			for (const group of groups) {
				if (!unitToIndex.has(group.key)) {
					timeUnits.push(group.key);
					unitToIndex.set(group.key, timeUnits.length - 1);
				}
			}
		}

		const totalUnits = timeUnits.length;

		for (const unit of timeUnits) {
			const headerCell = ganttHeader.createDiv({ cls: 'gantt-header-cell' });
			headerCell.style.width = `${100 / totalUnits}%`;
			headerCell.createSpan({ cls: 'gantt-date', text: this.formatDateShort(unit) });
		}

		const rowColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#a29bfe', '#fd79a8'];

		for (let i = 0; i < sortedTasks.length; i++) {
			const task = sortedTasks[i];
			const row = ganttBody.createDiv({ cls: 'gantt-row' });
			if (task.completed) row.addClass('completed');

			const labelCell = row.createDiv({ cls: 'gantt-label' });
			labelCell.createSpan({ 
				cls: 'gantt-task-label', 
				text: task.description.length > 20 ? task.description.substring(0, 20) + '...' : task.description 
			});

			const barsContainer = row.createDiv({ cls: 'gantt-bars' });
			
			let left = 0;
			let width = 0;
			
			if (this.timelineGroupBy === 'day') {
				const startDate = task.startDate || task.dueDate;
				const endDate = task.dueDate || task.startDate;
				if (startDate && endDate && unitToIndex.has(startDate) && unitToIndex.has(endDate)) {
					left = unitToIndex.get(startDate)!;
					width = unitToIndex.get(endDate)! - left + 1;
				}
			} else if (this.timelineGroupBy === 'week') {
				const startKey = task.startDate ? this.getTimelineGroupKey(task.startDate) : this.getTimelineGroupKey(task.dueDate!);
				const endKey = task.dueDate ? this.getTimelineGroupKey(task.dueDate) : startKey;
				if (unitToIndex.has(startKey) && unitToIndex.has(endKey)) {
					left = unitToIndex.get(startKey)!;
					width = unitToIndex.get(endKey)! - left + 1;
				}
			} else {
				const startKey = task.startDate ? task.startDate.substring(0, 7) : task.dueDate!.substring(0, 7);
				const endKey = task.dueDate ? task.dueDate.substring(0, 7) : startKey;
				if (unitToIndex.has(startKey) && unitToIndex.has(endKey)) {
					left = unitToIndex.get(startKey)!;
					width = unitToIndex.get(endKey)! - left + 1;
				}
			}
			
			if (width > 0) {
				const leftPct = (left / totalUnits) * 100;
				const widthPct = (width / totalUnits) * 100;
				
				const bar = barsContainer.createDiv({ cls: 'gantt-bar' });
				bar.setCssProps({
					'--gantt-left': `${leftPct}%`,
					'--gantt-width': `${widthPct}%`,
					'--gantt-color': rowColors[i % rowColors.length],
				});
				if (task.completed) bar.addClass('completed');
				if (this.isOverdue(task) && !task.completed) {
					bar.addClass('overdue');
				}
				const shortDesc = task.description.length > 12 ? task.description.substring(0, 12) + '...' : task.description;
				bar.createDiv({ cls: 'gantt-bar-label', text: shortDesc });
				bar.title = `${task.description}\n起始: ${task.startDate || '无'}\n截止: ${task.dueDate || '无'}`;
				bar.addEventListener('click', () => {
					this.plugin.openTaskFile(task.filePath, task.lineNumber);
				});
			}
		}
	}

	private renderZigzagTimeline(timelineEl: HTMLElement, groups: { key: string; name: string; tasks: Task[] }[]): void {
		const zigzagContainer = timelineEl.createDiv({ cls: 'zigzag-timeline' });
		zigzagContainer.createDiv({ cls: 'zigzag-center-line' });

		for (let i = 0; i < groups.length; i++) {
			const group = groups[i];
			const isLeft = i % 2 === 0;
			const groupEl = zigzagContainer.createDiv({ 
				cls: `zigzag-group ${isLeft ? 'left' : 'right'}` 
			});

			const node = groupEl.createDiv({ cls: 'zigzag-node' });
			const nodeInner = node.createDiv({ cls: 'zigzag-node-inner' });
			nodeInner.createSpan({ text: group.name.split(' ')[0] });

			const content = groupEl.createDiv({ cls: 'zigzag-content' });
			const contentCard = content.createDiv({ cls: 'zigzag-card' });
			
			const cardHeader = contentCard.createDiv({ cls: 'zigzag-card-header' });
			cardHeader.createSpan({ cls: 'zigzag-card-title', text: group.name });
			cardHeader.createSpan({ cls: 'zigzag-card-count', text: `${group.tasks.length} 个任务` });

			const taskList = contentCard.createDiv({ cls: 'zigzag-task-list' });
			for (const task of group.tasks) {
				const item = taskList.createDiv({ cls: 'zigzag-task-item' });
				if (task.completed) item.addClass('completed');
				if (this.isOverdue(task) && !task.completed) item.addClass('overdue');

				const taskMain = item.createDiv({ cls: 'zigzag-task-main' });
				
				const hasSubtasks = task.subtasks.length > 0;
				const expanded = this.expandedTasks.has(task.id) || hasSubtasks;
				
				if (hasSubtasks) {
					const expandBtn = taskMain.createEl('button', { cls: 'expand-btn', text: expanded ? '▼' : '▶' });
					expandBtn.addEventListener('click', (e) => {
						e.stopPropagation();
						if (this.expandedTasks.has(task.id)) {
							this.expandedTasks.delete(task.id);
						} else {
							this.expandedTasks.add(task.id);
						}
						this.refresh();
					});
				} else {
					taskMain.createSpan({ cls: 'expand-placeholder' });
				}

				const checkbox = taskMain.createEl('input', { 
					type: 'checkbox', 
				});
				checkbox.checked = task.completed;
				checkbox.addEventListener('change', (e) => {
					e.stopPropagation();
					void this.plugin.toggleTaskStatus(task, checkbox.checked);
				});

				const desc = taskMain.createSpan({ cls: 'zigzag-task-desc', text: task.description });
				desc.addEventListener('click', () => {
					void this.plugin.openTaskFile(task.filePath, task.lineNumber);
				});

				const taskContent = item.createDiv({ cls: 'zigzag-task-content' });
				this.renderSubtasks(taskContent, task);
				
				const addSubBtn = item.createEl('button', {
					cls: 'zigzag-add-subtask',
					text: '➕ 子任务',
					attr: { title: '添加子任务' }
				});
				let addSubtaskEl: HTMLElement | null = null;
				addSubBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					if (addSubtaskEl) {
						addSubtaskEl.remove();
						addSubtaskEl = null;
					} else {
						addSubtaskEl = this.renderAddSubtaskInput(taskContent, task);
					}
				});
			}
		}
	}

	private renderCardsTimeline(timelineEl: HTMLElement, groups: { key: string; name: string; tasks: Task[] }[]): void {
		const cardsContainer = timelineEl.createDiv({ cls: 'cards-timeline' });

		for (const group of groups) {
			const section = cardsContainer.createDiv({ cls: 'cards-section' });
			
			const sectionHeader = section.createDiv({ cls: 'cards-section-header' });
			sectionHeader.createSpan({ cls: 'cards-section-title', text: group.name });
			sectionHeader.createSpan({ cls: 'cards-section-count', text: `${group.tasks.length}` });

			const cardsGrid = section.createDiv({ cls: 'cards-grid' });
			for (const task of group.tasks) {
				const card = cardsGrid.createDiv({ cls: 'task-card' });
				if (task.completed) card.addClass('completed');
				if (this.isOverdue(task) && !task.completed) card.addClass('overdue');

				const cardTop = card.createDiv({ cls: 'task-card-top' });
				cardTop.createSpan({ 
					cls: 'task-card-priority',
					attr: { 'data-priority': task.priority }
				});
				cardTop.createSpan({ cls: 'task-card-date', text: task.dueDate || '' });

				const cardBody = card.createDiv({ cls: 'task-card-body' });
				const desc = cardBody.createSpan({ cls: 'task-card-desc', text: task.description });
				desc.addEventListener('click', () => {
					this.plugin.openTaskFile(task.filePath, task.lineNumber);
				});

				if (task.tags.length > 0) {
					const tags = cardBody.createDiv({ cls: 'task-card-tags' });
					for (const tag of task.tags.slice(0, 3)) {
						tags.createSpan({ cls: 'task-card-tag', text: `#${tag}` });
					}
				}

				const hasSubtasks = task.subtasks.length > 0;
				const expanded = this.expandedTasks.has(task.id) || hasSubtasks;
				
				if (hasSubtasks && this.plugin.settings.showSubtasks) {
					const subtaskToggle = cardBody.createEl('button', { 
						cls: 'card-subtask-toggle',
						text: `${expanded ? '▼' : '▶'} 子任务 (${this.getSubtaskProgress(task).done}/${this.getSubtaskProgress(task).total})`
					});
					subtaskToggle.addEventListener('click', (e) => {
						e.stopPropagation();
						if (this.expandedTasks.has(task.id)) {
							this.expandedTasks.delete(task.id);
						} else {
							this.expandedTasks.add(task.id);
						}
						this.refresh();
					});
				}
				
				const cardSubtasks = card.createDiv({ cls: 'card-subtasks' });
				this.renderSubtasks(cardSubtasks, task);
				
				let addSubtaskEl: HTMLElement | null = null;

				const cardFooter = card.createDiv({ cls: 'task-card-footer' });
				const checkbox = cardFooter.createEl('input', { 
					type: 'checkbox', 
				});
				checkbox.checked = task.completed;
				checkbox.addEventListener('change', (e) => {
					e.stopPropagation();
					void this.plugin.toggleTaskStatus(task, checkbox.checked);
				});
				
				const actions = cardFooter.createDiv({ cls: 'task-card-actions' });
				const editBtn = actions.createEl('button', { text: '✏️', attr: { title: '编辑' } });
				editBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.openTaskEditor(task);
				});
				const addSubBtn = actions.createEl('button', {
					cls: 'action-btn add-subtask-btn-icon',
					text: '➕',
					attr: { title: '添加子任务' }
				});
				addSubBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					if (addSubtaskEl) {
						addSubtaskEl.remove();
						addSubtaskEl = null;
					} else {
						addSubtaskEl = this.renderAddSubtaskInput(cardSubtasks, task);
					}
				});
			}
		}
	}

	private renderTimelineTaskList(container: HTMLElement, tasks: Task[]): void {
		for (const task of tasks) {
			const item = container.createDiv({ cls: 'timeline-task-item' });
			if (task.completed) item.addClass('completed');
			if (this.isOverdue(task)) item.addClass('overdue');

			const hasSubtasks = task.subtasks.length > 0;
			const expanded = this.expandedTasks.has(task.id) || hasSubtasks;

			const checkboxWrap = item.createDiv({ cls: 'task-checkbox' });
			const checkbox = checkboxWrap.createEl('input', {
				type: 'checkbox',
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
				const expandBtn = main.createEl('button', { cls: 'expand-btn', text: expanded ? '▼' : '▶' });
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
			
			main.createSpan({
				cls: 'task-priority',
				text: this.getPriorityIcon(task.priority),
				attr: { style: `color: ${this.getPriorityColor(task.priority)}` }
			});
			const descSpan = main.createSpan({ cls: 'task-description' });
			this.renderDescriptionWithLinks(descSpan, task);

			const meta = content.createDiv({ cls: 'task-meta' });
			if (task.tags.length > 0) {
				const tagsSpan = meta.createSpan({ cls: 'task-tags' });
				for (const tag of task.tags.slice(0, 2)) {
					const tagEl = tagsSpan.createSpan({ cls: 'tag tag-clickable', text: `#${tag}` });
					tagEl.addEventListener('click', (e) => {
						e.stopPropagation();
						if (!this.filterTags.includes(tag)) {
							this.filterTags = [...this.filterTags, tag];
						}
						this.showFilterPanel = true;
						this.renderFilterPanel();
						this.renderHeader();
						this.renderContent();
					});
				}
			}
			meta.createSpan({ cls: 'task-file', text: `📄 ${task.filePath.split('/').pop()}` });
			
			if (hasSubtasks) {
				const progress = this.getSubtaskProgress(task);
				meta.createSpan({ cls: 'subtask-progress', text: `📋 ${progress.done}/${progress.total}` });
			}

			const subtaskContent = item.createDiv({ cls: 'timeline-subtask-content' });
			this.renderSubtasks(subtaskContent, task);
			
			let addSubtaskEl: HTMLElement | null = null;

			const actions = item.createDiv({ cls: 'task-actions' });
			const editBtn = actions.createEl('button', {
				cls: 'action-btn',
				text: '✏️',
				attr: { title: '编辑任务' }
			});
			editBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.openTaskEditor(task);
			});
			const addSubBtn = actions.createEl('button', {
				cls: 'action-btn add-subtask-btn-icon',
				text: '➕',
				attr: { title: '添加子任务' }
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

	private formatDateShort(dateStr: string): string {
		if (this.timelineGroupBy === 'day') {
			const parts = dateStr.split('-');
			return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
		} else if (this.timelineGroupBy === 'week') {
			return dateStr.replace('-W', 'W');
		} else {
			const parts = dateStr.split('-');
			return `${parseInt(parts[1])}月`;
		}
	}

	private getTimelineGroups(): { key: string; name: string; tasks: Task[] }[] {
		const tasksWithDate = this.filteredTasks.filter(t => t.dueDate);
		const groups = new Map<string, Task[]>();

		for (const task of tasksWithDate) {
			const key = this.getTimelineGroupKey(task.dueDate!);
			if (!groups.has(key)) {
				groups.set(key, []);
			}
			groups.get(key)!.push(task);
		}

		const result: { key: string; name: string; tasks: Task[] }[] = [];
		const sortedKeys = Array.from(groups.keys()).sort();

		for (const key of sortedKeys) {
			result.push({
				key,
				name: this.formatTimelineGroupTitle(key),
				tasks: groups.get(key)!
			});
		}

		return result;
	}

	private getTimelineGroupKey(dateStr: string): string {
		if (this.timelineGroupBy === 'day') {
			return dateStr;
		} else if (this.timelineGroupBy === 'week') {
			const d = new Date(dateStr);
			const day = d.getDay() || 7;
			d.setDate(d.getDate() + 4 - day);
			const year = d.getFullYear();
			const firstDayOfYear = new Date(year, 0, 1);
			const weekNum = Math.ceil((((d.getTime() - firstDayOfYear.getTime()) / 86400000) + firstDayOfYear.getDay() + 1) / 7);
			return `${year}-W${weekNum.toString().padStart(2, '0')}`;
		} else {
			return dateStr.substring(0, 7);
		}
	}

	private formatTimelineGroupTitle(key: string): string {
		if (this.timelineGroupBy === 'day') {
			const date = new Date(key);
			const today = new Date();
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			const todayStr = today.toISOString().split('T')[0];
			const tomorrowStr = tomorrow.toISOString().split('T')[0];

			if (key === todayStr) return `今天 (${this.formatDate(key)})`;
			if (key === tomorrowStr) return `明天 (${this.formatDate(key)})`;

			const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
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
			return `${this.formatDate(d.toISOString().split('T')[0])} ~ ${this.formatDate(endDate.toISOString().split('T')[0])}`;
		} else {
			const [year, month] = key.split('-');
			return `${year}年${parseInt(month)}月`;
		}
	}

	private findFirstVisibleGroup(groupEls: { key: string; el: HTMLElement }[]): number {
		const container = this.contentEl;
		if (!container) return 0;
		for (let i = 0; i < groupEls.length; i++) {
			const rect = groupEls[i].el.getBoundingClientRect();
			const containerRect = container.getBoundingClientRect();
			if (rect.top >= containerRect.top - 50) {
				return i;
			}
		}
		return groupEls.length - 1;
	}

	private openTaskEditor(task: Task): void {
		const modal = activeDocument.createElement('div');
		modal.className = 'task-editor-modal-overlay';

		const modalInner = modal.createDiv({ cls: 'task-editor-modal' });

		const header = modalInner.createDiv({ cls: 'task-editor-header' });
		header.createEl('h3', { text: 'Edit Task' });
		const closeBtn = header.createEl('button', { cls: 'task-editor-close', title: 'Close', text: '✕' });

		const body = modalInner.createDiv({ cls: 'task-editor-body' });

		const descField = body.createDiv({ cls: 'task-editor-field' });
		descField.createEl('label', { text: 'Description' });
		const descInput = descField.createEl('input', { type: 'text', cls: 'task-editor-input' });
		descInput.value = task.description;

		const dateField = body.createDiv({ cls: 'task-editor-field' });
		dateField.createEl('label', { text: 'Due Date' });
		const dateInput = dateField.createEl('input', { type: 'date', cls: 'task-editor-date' });
		if (task.dueDate) dateInput.value = task.dueDate;

		const priorityField = body.createDiv({ cls: 'task-editor-field' });
		priorityField.createEl('label', { text: 'Priority' });
		const prioritySelect = priorityField.createEl('select', { cls: 'task-editor-priority' });
		const priorityOptions = [
			{ value: 'none', text: 'None' },
			{ value: 'highest', text: '🔝 Highest' },
			{ value: 'high', text: '🔺 High' },
			{ value: 'medium', text: '🔼 Medium' },
			{ value: 'low', text: '🔽 Low' },
			{ value: 'lowest', text: '⏬ Lowest' },
		];
		for (const opt of priorityOptions) {
			prioritySelect.createEl('option', { value: opt.value, text: opt.text });
		}
		prioritySelect.value = task.priority;

		const tagsField = body.createDiv({ cls: 'task-editor-field' });
		tagsField.createEl('label', { text: 'Tags (comma-separated)' });
		const tagsInput = tagsField.createEl('input', { type: 'text', cls: 'task-editor-tags' });
		tagsInput.value = task.tags.join(', ');

		const footer = modalInner.createDiv({ cls: 'task-editor-footer' });
		const deleteBtn = footer.createEl('button', { cls: 'task-editor-btn delete-btn', text: 'Delete Task' });

		const actions = footer.createDiv({ cls: 'task-editor-actions' });
		const cancelBtn = actions.createEl('button', { cls: 'task-editor-btn cancel-btn', text: 'Cancel' });
		const saveBtn = actions.createEl('button', { cls: 'task-editor-btn save-btn', text: 'Save' });

		activeDocument.body.appendChild(modal);

		const closeModal = () => {
			modal.remove();
		};

		closeBtn.addEventListener('click', closeModal);
		cancelBtn.addEventListener('click', closeModal);
		modal.addEventListener('click', (e) => {
			if (e.target === modal) closeModal();
		});

		saveBtn.addEventListener('click', () => {
			void (async () => {
				const newDesc = descInput.value.trim();
				const newDate = dateInput.value || undefined;
				const newPriority = prioritySelect.value;
				const newTags = tagsInput.value
					.split(',')
					.map(t => t.trim())
					.filter(t => t.length > 0);

				if (!newDesc) {
					new Notice('Description cannot be empty');
					return;
				}

				try {
					await this.plugin.updateTask(task, {
						description: newDesc,
						dueDate: newDate,
						priority: newPriority as TaskPriority,
						tags: newTags
					});
					closeModal();
					new Notice('Task updated ✅');
				} catch (e) {
					console.error('Failed to update task:', e);
					new Notice('Failed to update task');
				}
			})();
		});

		deleteBtn.addEventListener('click', () => {
			const confirmModal = new Modal(this.plugin.app);
			confirmModal.titleEl.setText('Confirm Delete');
			confirmModal.contentEl.createEl('p', { text: 'Are you sure you want to delete this task?' });
			
			const btnContainer = confirmModal.contentEl.createDiv({ cls: 'modal-button-container' });
			const cancelBtn = btnContainer.createEl('button', { cls: 'mod-cta', text: 'Cancel' });
			const deleteBtn2 = btnContainer.createEl('button', { cls: 'mod-danger', text: 'Delete' });
			
			cancelBtn.onclick = () => confirmModal.close();
			deleteBtn2.onclick = async () => {
				try {
					await this.plugin.deleteTask(task);
					closeModal();
					confirmModal.close();
					new Notice('Task deleted');
				} catch (e) {
					console.error('Failed to delete task:', e);
					new Notice('Failed to delete task');
				}
			};
			
			confirmModal.open();
		});

		descInput.focus();
		descInput.select();
	}

	private escapeHtml(text: string): string {
		const div = activeDocument.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	private calendarYear: number = new Date().getFullYear();
	private calendarMonth: number = new Date().getMonth();

	private renderCalendarView(container: HTMLElement): void {
		const calendarEl = container.createDiv({ cls: 'calendar-view' });

		const header = calendarEl.createDiv({ cls: 'calendar-header' });
		
		const navGroup = header.createDiv({ cls: 'calendar-nav' });
		const prevMonthBtn = navGroup.createEl('button', {
			cls: 'calendar-nav-btn',
			text: '◀',
			attr: { title: '上个月' }
		});
		navGroup.createSpan({
			cls: 'calendar-month-label',
			text: `${this.calendarYear}年${this.calendarMonth + 1}月`
		});
		const nextMonthBtn = navGroup.createEl('button', {
			cls: 'calendar-nav-btn',
			text: '▶',
			attr: { title: '下个月' }
		});

		const todayBtn = header.createEl('button', {
			cls: 'calendar-today-btn',
			text: '今天'
		});

		const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
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
			const now = new Date();
			this.calendarYear = now.getFullYear();
			this.calendarMonth = now.getMonth();
			this.renderContent();
		});
	}

	private renderCalendarGrid(grid: HTMLElement): void {
		const firstDay = new Date(this.calendarYear, this.calendarMonth, 1);
		const lastDay = new Date(this.calendarYear, this.calendarMonth + 1, 0);
		const startWeekday = firstDay.getDay();
		const daysInMonth = lastDay.getDate();

		const today = new Date();
		const todayStr = today.toISOString().split('T')[0];

		const tasksByDate = new Map<string, Task[]>();
		for (const task of this.filteredTasks) {
			if (task.dueDate) {
				if (!tasksByDate.has(task.dueDate)) {
					tasksByDate.set(task.dueDate, []);
				}
				tasksByDate.get(task.dueDate)!.push(task);
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
			const isOverdue = dayTasks.some(t => !t.completed) && dateStr < todayStr;

			const cell = grid.createDiv({ cls: 'calendar-day' });
			if (isToday) cell.addClass('today');
			if (isOverdue) cell.addClass('has-overdue');
			if (dayTasks.length > 0) cell.addClass('has-tasks');

			cell.createDiv({ cls: 'calendar-day-number', text: day.toString() });

			if (dayTasks.length > 0) {
				const tasksContainer = cell.createDiv({ cls: 'calendar-day-tasks' });
				const notDone = dayTasks.filter(t => !t.completed);
				const done = dayTasks.filter(t => t.completed);
				const displayTasks = [...notDone, ...done].slice(0, 3);
				
				for (const task of displayTasks) {
					const taskEl = tasksContainer.createDiv({ cls: 'calendar-task-dot' });
					if (task.completed) taskEl.addClass('completed');
					if (task.priority === TaskPriority.Highest || task.priority === TaskPriority.High) taskEl.addClass('high-priority');
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
		const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
		for (let i = 1; i <= remainingCells; i++) {
			const cell = grid.createDiv({ cls: 'calendar-day other-month' });
			cell.createDiv({ cls: 'calendar-day-number', text: i.toString() });
		}
	}

	private showDayTasks(dateStr: string, tasks: Task[]): void {
		const modal = activeDocument.createElement('div');
		modal.className = 'task-editor-modal-overlay';

		const modalInner = modal.createDiv({ cls: 'task-editor-modal' });

		const header = modalInner.createDiv({ cls: 'task-editor-header' });
		header.createEl('h3', { text: `${dateStr} Tasks` });
		const closeBtn = header.createEl('button', { cls: 'task-editor-close', title: 'Close', text: '✕' });

		const listEl = modalInner.createDiv({ cls: 'task-editor-body day-tasks-list' });

		for (const task of tasks) {
			const item = listEl.createDiv({ cls: 'day-task-item' });
			if (task.completed) item.addClass('completed');
			
			const checkbox = item.createEl('input', {
				type: 'checkbox',
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

		const closeModal = () => modal.remove();
		closeBtn.addEventListener('click', closeModal);
		modal.addEventListener('click', (e) => {
			if (e.target === modal) closeModal();
		});
	}

	private showWheelDatePicker(callback: (date: string) => void, initialDate?: string): void {
		const modal = activeDocument.createElement('div');
		modal.className = 'wheel-picker-overlay';
		
		const now = new Date();
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
		const cancelBtn = header.createEl('button', { cls: 'wheel-picker-cancel', text: 'Cancel' });
		header.createSpan({ cls: 'wheel-picker-title', text: 'Select Date' });
		const confirmBtn = header.createEl('button', { cls: 'wheel-picker-confirm', text: 'OK' });

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

		const years: number[] = [];
		for (let y = year - 5; y <= year + 10; y++) years.push(y);
		
		const months: number[] = [];
		for (let m = 1; m <= 12; m++) months.push(m);

		const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
		const ITEM_HEIGHT = 44;
		const VISIBLE_COUNT = 5;

		const setupColumn = (colEl: HTMLElement, values: number[], selected: number, format: (v: number) => string, onChange?: (v: number) => void) => {
			const wrapper = colEl.querySelector('.wheel-wrapper') as HTMLElement;
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
			};

			const onStart = (clientY: number) => {
				isDragging = true;
				startY = clientY;
				startOffset = currentOffset;
				wrapper.setCssProps({ '--wheel-transition': 'none' });
			};

			const onMove = (clientY: number) => {
				if (!isDragging) return;
				const delta = startY - clientY;
				currentOffset = startOffset + delta;
				const maxOffset = (values.length - 1) * ITEM_HEIGHT;
				currentOffset = Math.max(-ITEM_HEIGHT, Math.min(maxOffset + ITEM_HEIGHT, currentOffset));
				wrapper.setCssProps({ '--wheel-offset': `${currentOffset}px` });
			};

			const onEnd = () => {
				if (!isDragging) return;
				isDragging = false;
				wrapper.setCssProps({ '--wheel-transition': 'transform 0.15s ease-out' });
				const newValue = updateSelection();
				onChange?.(newValue);
				activeDocument.removeEventListener('mousemove', onDocMove);
				activeDocument.removeEventListener('mouseup', onDocUp);
			};

			const onDocMove = (e: MouseEvent) => onMove(e.clientY);
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
				setValue: (v: number) => {
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
			};
		};

		interface ColumnControl {
			destroy: () => void;
			getValue: () => number;
		}
		let yearCtrl: ColumnControl | null = null;
		let monthCtrl: ColumnControl | null = null;
		let dayCtrl: ColumnControl | null = null;

		const buildDayValues = () => {
			const days: number[] = [];
			const maxDay = getDaysInMonth(year, month);
			if (day > maxDay) day = maxDay;
			for (let d = 1; d <= maxDay; d++) days.push(d);
			return days;
		};

		const refreshDayColumn = () => {
			if (dayCtrl) dayCtrl.destroy?.();
			dayCtrl = setupColumn(dayCol, buildDayValues(), day, (v) => `${v}日`, (v) => {
				day = v;
			});
		};

		yearCtrl = setupColumn(yearCol, years, year, (v) => `${v}年`, (v) => {
			year = v;
			refreshDayColumn();
		});
		monthCtrl = setupColumn(monthCol, months, month, (v) => `${v}月`, (v) => {
			month = v;
			refreshDayColumn();
		});
		refreshDayColumn();

		const closeModal = () => {
			yearCtrl?.destroy?.();
			monthCtrl?.destroy?.();
			dayCtrl?.destroy?.();
			modal.remove();
		};
		cancelBtn.addEventListener('click', closeModal);
		modal.addEventListener('click', (e) => {
			if (e.target === modal) closeModal();
		});
		confirmBtn.addEventListener('click', () => {
			const y = yearCtrl?.getValue() || year;
			const m = monthCtrl?.getValue() || month;
			const d = dayCtrl?.getValue() || day;
			const dateStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
			callback(dateStr);
			closeModal();
		});
	}
}
