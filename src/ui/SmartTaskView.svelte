<script>
	import { onMount } from 'svelte';
	import { QueryEngine } from '../queryEngine';
	import TaskList from './TaskList.svelte';
	import QuickCreate from './QuickCreate.svelte';
	import ViewToggle from './ViewToggle.svelte';
	import FilterPanel from './FilterPanel.svelte';
	import StatsBar from './StatsBar.svelte';

	export let tasks = [];
	export let settings;
	export let onToggleTask;
	export let onCreateTask;
	export let onAddSubtask;
	export let onOpenFile;
	export let allTags = [];

	let currentView = settings.defaultView;
	let showFilterPanel = false;
	let searchQuery = '';
	let filterStatus = 'not-done';
	let filterPriorities = [];
	let filterTags = [];
	let dateFilter = 'all';

	let testCount = 0;
	let containerEl = null;

	onMount(() => {
		console.log('[SmartTask] Svelte onMount 触发了！');
		console.log('[SmartTask] containerEl:', containerEl);
		
		if (containerEl) {
			const testBtn = containerEl.querySelector('.svelte-test-btn');
			console.log('[SmartTask] 找到测试按钮:', testBtn);
			if (testBtn) {
				testBtn.addEventListener('click', () => {
					console.log('[SmartTask] 手动绑定的按钮被点击了！');
					testCount++;
					alert('手动绑定的按钮工作正常！点击次数: ' + testCount);
				});
			}
		}
	});

	function handleSvelteClick() {
		console.log('[SmartTask] Svelte on:click 触发了！');
		testCount++;
		alert('Svelte 事件绑定工作正常！点击次数: ' + testCount);
	}

	$: filteredTasks = QueryEngine.query(tasks, buildQuery());

	$: groupedTasks = QueryEngine.groupTasks(filteredTasks, settings.groupBy);

	$: overdueTasks = QueryEngine.getOverdueTasks(tasks);
	$: todayTasks = QueryEngine.getTodayTasks(tasks);
	$: upcomingTasks = QueryEngine.getUpcomingTasks(tasks, 7);

	function buildQuery() {
		const query = {
			status: filterStatus,
			sortBy: settings.sortBy,
			sortOrder: settings.sortOrder,
		};

		if (searchQuery) {
			query.searchText = searchQuery;
		}

		if (filterPriorities.length > 0) {
			query.priority = filterPriorities;
		}

		if (filterTags.length > 0) {
			query.tags = filterTags;
		}

		const today = QueryEngine.getToday();
		if (dateFilter === 'overdue') {
			query.dueDate = { before: today };
		} else if (dateFilter === 'today') {
			query.dueDate = { equals: today };
		} else if (dateFilter === 'week') {
			const nextWeek = new Date();
			nextWeek.setDate(nextWeek.getDate() + 7);
			query.dueDate = {
				after: today,
				before: nextWeek.toISOString().split('T')[0]
			};
		} else if (dateFilter === 'month') {
			const nextMonth = new Date();
			nextMonth.setMonth(nextMonth.getMonth() + 1);
			query.dueDate = {
				after: today,
				before: nextMonth.toISOString().split('T')[0]
			};
		}

		return query;
	}

	function handleViewChange(view) {
		currentView = view;
	}

	function handleSearch(text) {
		searchQuery = text;
	}

	function handleFilterChange(status) {
		filterStatus = status;
	}

	function handleCreateTask(description, dueDate, priority) {
		onCreateTask(description, dueDate, priority);
	}

	function handleToggleTask(task, completed) {
		onToggleTask(task, completed);
	}

	function handleClickTask(task) {
		onOpenFile(task.filePath, task.lineNumber);
	}

	function handleAddSubtask(parentTask, description) {
		onAddSubtask(parentTask, description);
	}

	function toggleFilterPanel() {
		showFilterPanel = !showFilterPanel;
	}

	function handlePriorityFilterChange(priorities) {
		filterPriorities = priorities;
	}

	function handleTagFilterChange(tags) {
		filterTags = tags;
	}

	function handleDateFilterChange(filter) {
		dateFilter = filter;
	}

	function resetFilters() {
		filterPriorities = [];
		filterTags = [];
		dateFilter = 'all';
		searchQuery = '';
	}

	$: hasActiveFilters = filterPriorities.length > 0 || filterTags.length > 0 || dateFilter !== 'all' || searchQuery.length > 0;
</script>

<div class="smarttask-container" bind:this={containerEl}>
	<div class="smarttask-header">
		<div class="smarttask-title">
			<span class="smarttask-icon">✅</span>
			<h2>SmartTask</h2>
		</div>
		<div class="header-actions">
			<button class="svelte-test-btn" on:click={handleSvelteClick}>
				🧪 Svelte测试
			</button>
			<button class="filter-btn {showFilterPanel ? 'active' : ''} {hasActiveFilters ? 'has-filters' : ''}" on:click={toggleFilterPanel} title="筛选">
				🔍
				{#if hasActiveFilters}
					<span class="filter-badge">●</span>
				{/if}
			</button>
			<ViewToggle currentView={currentView} onChange={handleViewChange} />
		</div>
	</div>

	<QuickCreate onCreate={handleCreateTask} />

	<div class="search-row">
		<div class="search-input-wrapper">
			<span class="search-icon">🔍</span>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="搜索任务..."
			/>
			{#if searchQuery}
				<button class="clear-btn" on:click={() => searchQuery = ''}>✕</button>
			{/if}
		</div>

		<div class="filter-tabs">
			<button
				class="filter-tab"
				class:active={filterStatus === 'not-done'}
				on:click={() => handleFilterChange('not-done')}
			>
				待办
			</button>
			<button
				class="filter-tab"
				class:active={filterStatus === 'done'}
				on:click={() => handleFilterChange('done')}
			>
				已完成
			</button>
			<button
				class="filter-tab"
				class:active={filterStatus === 'all'}
				on:click={() => handleFilterChange('all')}
			>
				全部
			</button>
		</div>
	</div>

	{#if showFilterPanel}
		<FilterPanel
			{allTags}
			selectedPriorities={filterPriorities}
			selectedTags={filterTags}
			dateFilter={dateFilter}
			onPriorityChange={handlePriorityFilterChange}
			onTagChange={handleTagFilterChange}
			onDateChange={handleDateFilterChange}
			onReset={resetFilters}
		/>
	{/if}

	<StatsBar
		total={tasks.length}
		done={tasks.filter(t => t.completed).length}
		overdue={overdueTasks.length}
		today={todayTasks.length}
		upcoming={upcomingTasks.length}
	/>

	<div class="smarttask-content">
		{#if currentView === 'list'}
			<TaskList
				groups={groupedTasks}
				showSubtasks={settings.showSubtasks}
				onToggle={handleToggleTask}
				onClick={handleClickTask}
				onAddSubtask={handleAddSubtask}
			/>
		{:else if currentView === 'kanban'}
			<div class="kanban-view">
				<div class="kanban-column">
					<h3>📋 待办 ({filteredTasks.filter(t => !t.completed).length})</h3>
					<TaskList
						groups={[{ name: '', tasks: filteredTasks.filter(t => !t.completed) }]}
						showSubtasks={settings.showSubtasks}
						onToggle={handleToggleTask}
						onClick={handleClickTask}
						onAddSubtask={handleAddSubtask}
					/>
				</div>
				<div class="kanban-column done">
					<h3>✅ 已完成 ({filteredTasks.filter(t => t.completed).length})</h3>
					<TaskList
						groups={[{ name: '', tasks: filteredTasks.filter(t => t.completed) }]}
						showSubtasks={settings.showSubtasks}
						onToggle={handleToggleTask}
						onClick={handleClickTask}
						onAddSubtask={handleAddSubtask}
					/>
				</div>
			</div>
		{:else}
			<div class="calendar-view-placeholder">
				<p>📅 日历视图开发中...</p>
				<p class="hint">当前可用列表视图和看板视图</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.smarttask-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
		font-family: var(--font-interface);
		color: var(--text-normal);
	}

	.smarttask-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 16px 8px;
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.smarttask-title {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.smarttask-title h2 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
	}

	.smarttask-icon {
		font-size: 20px;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.svelte-test-btn {
		background: var(--text-success);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 8px 12px;
		font-size: 12px;
		cursor: pointer;
		font-weight: 600;
	}

	.svelte-test-btn:hover {
		opacity: 0.9;
	}

	.filter-btn {
		position: relative;
		background: var(--background-secondary);
		border: none;
		border-radius: 8px;
		padding: 8px 12px;
		font-size: 16px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.filter-btn:hover {
		background: var(--background-modifier-hover);
	}

	.filter-btn.active {
		background: var(--interactive-accent);
	}

	.filter-btn.has-filters .filter-badge {
		position: absolute;
		top: 4px;
		right: 4px;
		font-size: 8px;
		color: var(--text-error);
	}

	.filter-btn.active.has-filters .filter-badge {
		color: white;
	}

	.search-row {
		padding: 12px 16px;
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.search-input-wrapper {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--background-secondary);
		border-radius: 8px;
		padding: 8px 12px;
		margin-bottom: 10px;
	}

	.search-icon {
		font-size: 14px;
		opacity: 0.5;
	}

	.search-input-wrapper input {
		flex: 1;
		border: none;
		background: transparent;
		outline: none;
		font-size: 13px;
		color: var(--text-normal);
	}

	.search-input-wrapper input::placeholder {
		color: var(--text-faint);
	}

	.clear-btn {
		background: none;
		border: none;
		color: var(--text-faint);
		cursor: pointer;
		font-size: 12px;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.clear-btn:hover {
		background: var(--background-modifier-hover);
		color: var(--text-normal);
	}

	.filter-tabs {
		display: flex;
		gap: 4px;
	}

	.filter-tab {
		flex: 1;
		background: transparent;
		border: none;
		border-radius: 6px;
		padding: 6px 12px;
		font-size: 13px;
		cursor: pointer;
		color: var(--text-muted);
		transition: all 0.15s;
	}

	.filter-tab:hover {
		background: var(--background-modifier-hover);
	}

	.filter-tab.active {
		background: var(--interactive-accent);
		color: var(--text-on-accent);
		font-weight: 500;
	}

	.smarttask-content {
		flex: 1;
		overflow-y: auto;
		padding: 8px 0;
	}

	.kanban-view {
		display: flex;
		gap: 16px;
		padding: 16px;
		height: 100%;
		overflow-x: auto;
	}

	.kanban-column {
		flex: 1;
		min-width: 250px;
		background: var(--background-secondary);
		border-radius: 8px;
		padding: 12px;
		overflow-y: auto;
	}

	.kanban-column h3 {
		margin: 0 0 12px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.kanban-column.done {
		opacity: 0.7;
	}

	.calendar-view-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--text-muted);
	}

	.calendar-view-placeholder p {
		margin: 4px 0;
	}

	.calendar-view-placeholder .hint {
		font-size: 12px;
		opacity: 0.7;
	}
</style>
