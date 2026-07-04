<script>
	export let total = 0;
	export let done = 0;
	export let overdue = 0;
	export let today = 0;
	export let upcoming = 0;

	$: notDone = total - done;
	$: progress = total > 0 ? Math.round((done / total) * 100) : 0;
</script>

<div class="stats-bar">
	<div class="stat-item">
		<span class="stat-value">{notDone}</span>
		<span class="stat-label">待办</span>
	</div>
	<div class="stat-divider"></div>
	<div class="stat-item overdue">
		<span class="stat-value">{overdue}</span>
		<span class="stat-label">逾期</span>
	</div>
	<div class="stat-divider"></div>
	<div class="stat-item today">
		<span class="stat-value">{today}</span>
		<span class="stat-label">今日</span>
	</div>
	<div class="stat-divider"></div>
	<div class="stat-item upcoming">
		<span class="stat-value">{upcoming}</span>
		<span class="stat-label">7天内</span>
	</div>
	<div class="stat-divider"></div>
	<div class="stat-item progress-item">
		<div class="progress-bar">
			<div class="progress-fill" style="width: {progress}%"></div>
		</div>
		<span class="progress-text">{progress}%</span>
	</div>
</div>

<style>
	.stats-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 16px;
		background: var(--background-secondary);
		margin: 0 16px 8px;
		border-radius: 8px;
		flex-wrap: wrap;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		min-width: 45px;
	}

	.stat-value {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-normal);
	}

	.stat-label {
		font-size: 11px;
		color: var(--text-muted);
	}

	.stat-item.overdue .stat-value {
		color: var(--text-error);
	}

	.stat-item.today .stat-value {
		color: var(--interactive-accent);
	}

	.stat-item.upcoming .stat-value {
		color: var(--text-success);
	}

	.stat-divider {
		width: 1px;
		height: 24px;
		background: var(--background-modifier-border);
	}

	.progress-item {
		flex: 1;
		min-width: 80px;
	}

	.progress-bar {
		width: 100%;
		height: 6px;
		background: var(--background-modifier-border);
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--interactive-accent), var(--text-success));
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 11px;
		color: var(--text-muted);
		text-align: center;
		margin-top: 2px;
	}
</style>
