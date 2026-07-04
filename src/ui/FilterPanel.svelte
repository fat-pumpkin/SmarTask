<script>
	export let allTags = [];
	export let selectedPriorities = [];
	export let selectedTags = [];
	export let dateFilter = 'all';
	export let onPriorityChange;
	export let onTagChange;
	export let onDateChange;
	export let onReset;

	let priorities = [
		{ value: 'highest', label: '🔝 最高', color: 'error' },
		{ value: 'high', label: '🔺 高', color: 'accent' },
		{ value: 'medium', label: '🔼 中', color: 'warning' },
		{ value: 'low', label: '🔽 低', color: 'muted' },
		{ value: 'lowest', label: '⏬ 最低', color: 'faint' },
	];

	let dateOptions = [
		{ value: 'all', label: '全部' },
		{ value: 'overdue', label: '已逾期' },
		{ value: 'today', label: '今天' },
		{ value: 'week', label: '本周内' },
		{ value: 'month', label: '本月内' },
	];

	function togglePriority(priority) {
		if (selectedPriorities.includes(priority)) {
			onPriorityChange(selectedPriorities.filter(p => p !== priority));
		} else {
			onPriorityChange([...selectedPriorities, priority]);
		}
	}

	function toggleTag(tag) {
		if (selectedTags.includes(tag)) {
			onTagChange(selectedTags.filter(t => t !== tag));
		} else {
			onTagChange([...selectedTags, tag]);
		}
	}
</script>

<div class="filter-panel">
	<div class="filter-section">
		<div class="filter-header">
			<span class="filter-title">📅 日期筛选</span>
		</div>
		<div class="filter-options">
			{#each dateOptions as opt (opt.value)}
				<button
					class="date-btn"
					class:active={dateFilter === opt.value}
					on:click={() => onDateChange(opt.value)}
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="filter-section">
		<div class="filter-header">
			<span class="filter-title">🎯 优先级</span>
		</div>
		<div class="filter-options">
			{#each priorities as p (p.value)}
				<button
					class="priority-chip"
					class:active={selectedPriorities.includes(p.value)}
					data-color={p.color}
					on:click={() => togglePriority(p.value)}
				>
					{p.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="filter-section">
		<div class="filter-header">
			<span class="filter-title">🏷️ 标签</span>
			{#if allTags.length === 0}
				<span class="filter-hint">暂无标签</span>
			{/if}
		</div>
		<div class="tag-cloud">
			{#each allTags as tag (tag)}
				<button
					class="tag-chip"
					class:active={selectedTags.includes(tag)}
					on:click={() => toggleTag(tag)}
				>
					#{tag}
				</button>
			{/each}
		</div>
	</div>

	<div class="filter-actions">
		<button class="reset-btn" on:click={onReset}>
			🔄 重置筛选
		</button>
	</div>
</div>

<style>
	.filter-panel {
		padding: 12px 16px;
		background: var(--background-secondary);
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.filter-section {
		margin-bottom: 14px;
	}

	.filter-section:last-of-type {
		margin-bottom: 12px;
	}

	.filter-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.filter-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-normal);
	}

	.filter-hint {
		font-size: 12px;
		color: var(--text-faint);
	}

	.filter-options {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.date-btn {
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 6px;
		padding: 5px 12px;
		font-size: 12px;
		cursor: pointer;
		color: var(--text-muted);
		transition: all 0.15s;
	}

	.date-btn:hover {
		background: var(--background-modifier-hover);
		color: var(--text-normal);
	}

	.date-btn.active {
		background: var(--interactive-accent);
		border-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.priority-chip {
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 6px;
		padding: 4px 10px;
		font-size: 12px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.priority-chip:hover {
		background: var(--background-modifier-hover);
	}

	.priority-chip.active {
		border-color: var(--interactive-accent);
		background: rgba(var(--interactive-accent-rgb), 0.15);
	}

	.priority-chip[data-color="error"] { color: var(--text-error); }
	.priority-chip[data-color="accent"] { color: var(--text-accent); }
	.priority-chip[data-color="warning"] { color: var(--text-warning); }
	.priority-chip[data-color="muted"] { color: var(--text-muted); }
	.priority-chip[data-color="faint"] { color: var(--text-faint); }

	.tag-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.tag-chip {
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
		padding: 3px 8px;
		font-size: 12px;
		cursor: pointer;
		color: var(--text-muted);
		transition: all 0.15s;
	}

	.tag-chip:hover {
		background: var(--background-modifier-hover);
		color: var(--text-normal);
	}

	.tag-chip.active {
		background: var(--interactive-accent);
		border-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}

	.filter-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 8px;
		border-top: 1px solid var(--background-modifier-border);
	}

	.reset-btn {
		background: transparent;
		border: 1px solid var(--background-modifier-border);
		border-radius: 6px;
		padding: 6px 14px;
		font-size: 12px;
		cursor: pointer;
		color: var(--text-muted);
		transition: all 0.15s;
	}

	.reset-btn:hover {
		background: var(--background-modifier-hover);
		color: var(--text-normal);
	}
</style>
