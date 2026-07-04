<script>
	import TaskItem from './TaskItem.svelte';

	export let groups = [];
	export let showSubtasks = true;
	export let onToggle;
	export let onClick;
	export let onAddSubtask;
</script>

<div class="task-list">
	{#if groups.length === 0 || groups.every(g => g.tasks.length === 0)}
		<div class="empty-state">
			<div class="empty-icon">🎉</div>
			<p>暂无任务</p>
			<p class="empty-hint">在上方输入框创建你的第一个任务吧！</p>
		</div>
	{:else}
		{#each groups as group (group.name)}
			{#if group.name}
				<div class="task-group">
					<div class="group-header">
						<span class="group-name">{group.name}</span>
						<span class="group-count">{group.tasks.length}</span>
					</div>
					<div class="group-tasks">
						{#each group.tasks as task (task.id)}
							<TaskItem
								task={task}
								{showSubtasks}
								onToggle={(c) => onToggle(task, c)}
								onClick={() => onClick(task)}
								onAddSubtask={(d) => onAddSubtask(task, d)}
							/>
						{/each}
					</div>
				</div>
			{:else}
				<div class="flat-tasks">
					{#each group.tasks as task (task.id)}
						<TaskItem
							task={task}
							{showSubtasks}
							onToggle={(c) => onToggle(task, c)}
							onClick={() => onClick(task)}
							onAddSubtask={(d) => onAddSubtask(task, d)}
						/>
					{/each}
				</div>
			{/if}
		{/each}
	{/if}
</div>

<style>
	.task-list {
		padding: 4px 0;
	}

	.task-group {
		margin-bottom: 16px;
	}

	.group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		background: var(--background-secondary);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.group-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.group-count {
		font-size: 12px;
		color: var(--text-faint);
		background: var(--background-modifier-border);
		padding: 2px 8px;
		border-radius: 10px;
	}

	.group-tasks {
		padding: 4px 0;
	}

	.flat-tasks {
		padding: 0 8px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 20px;
		color: var(--text-muted);
	}

	.empty-icon {
		font-size: 48px;
		margin-bottom: 12px;
	}

	.empty-state p {
		margin: 4px 0;
	}

	.empty-hint {
		font-size: 13px;
		opacity: 0.7;
	}
</style>
