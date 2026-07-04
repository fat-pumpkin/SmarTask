<script>
	export let task;
	export let showSubtasks = true;
	export let onToggle;
	export let onClick;
	export let onAddSubtask;

	let expanded = true;
	let showAddSubtask = false;
	let newSubtaskDesc = '';

	const PRIORITY_HIGHEST = 'highest';
	const PRIORITY_HIGH = 'high';
	const PRIORITY_MEDIUM = 'medium';
	const PRIORITY_LOW = 'low';
	const PRIORITY_LOWEST = 'lowest';

	function toggleExpand() {
		expanded = !expanded;
	}

	function handleAddSubtask() {
		if (newSubtaskDesc.trim()) {
			onAddSubtask(newSubtaskDesc.trim());
			newSubtaskDesc = '';
			showAddSubtask = false;
			expanded = true;
		}
	}

	function handleKeyDown(e) {
		if (e.key === 'Enter') {
			handleAddSubtask();
		}
		if (e.key === 'Escape') {
			showAddSubtask = false;
			newSubtaskDesc = '';
		}
	}

	function getPriorityColor(priority) {
		switch (priority) {
			case PRIORITY_HIGHEST: return 'var(--text-error)';
			case PRIORITY_HIGH: return 'var(--text-accent)';
			case PRIORITY_MEDIUM: return 'var(--text-warning)';
			case PRIORITY_LOW: return 'var(--text-muted)';
			case PRIORITY_LOWEST: return 'var(--text-faint)';
			default: return 'transparent';
		}
	}

	function isOverdue() {
		if (!task.dueDate || task.completed) return false;
		const today = new Date().toISOString().split('T')[0];
		return task.dueDate < today;
	}

	function isToday() {
		if (!task.dueDate) return false;
		const today = new Date().toISOString().split('T')[0];
		return task.dueDate === today;
	}

	function formatDate(dateStr) {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		const month = date.getMonth() + 1;
		const day = date.getDate();
		return `${month}/${day}`;
	}

	function getPriorityIcon() {
		switch (task.priority) {
			case PRIORITY_HIGHEST: return '🔝';
			case PRIORITY_HIGH: return '🔺';
			case PRIORITY_MEDIUM: return '🔼';
			case PRIORITY_LOW: return '🔽';
			case PRIORITY_LOWEST: return '⏬';
			default: return '';
		}
	}

	function getSubtaskProgress() {
		let done = 0;
		let total = task.subtasks.length;
		for (const st of task.subtasks) {
			if (st.completed) done++;
		}
		return { done, total };
	}

	$: subtaskProgress = getSubtaskProgress();
</script>

<div
	class="task-item"
	class:completed={task.completed}
	class:overdue={isOverdue()}
	class:today={isToday()}
>
	{#if task.subtasks.length > 0}
		<button class="expand-btn" on:click|stopPropagation={toggleExpand}>
			{expanded ? '▼' : '▶'}
		</button>
	{:else}
		<span class="expand-spacer"></span>
	{/if}

	<div class="task-checkbox" on:click|stopPropagation={() => onToggle(!task.completed)}>
		<input type="checkbox" checked={task.completed} />
	</div>

	<div class="task-content" on:click={onClick}>
		<div class="task-main">
			<span class="task-priority" style="color: {getPriorityColor(task.priority)}">
				{getPriorityIcon()}
			</span>
			<span class="task-description">{task.description}</span>
		</div>

		<div class="task-meta">
			{#if task.dueDate}
				<span class="task-due" class:overdue={isOverdue()}>
					📅 {formatDate(task.dueDate)}
				</span>
			{/if}

			{#if task.subtasks.length > 0}
				<span class="subtask-progress">
					📋 {subtaskProgress.done}/{subtaskProgress.total}
				</span>
			{/if}

			{#if task.tags.length > 0}
				<span class="task-tags">
					{#each task.tags.slice(0, 2) as tag}
						<span class="tag">#{tag}</span>
					{/each}
					{#if task.tags.length > 2}
						<span class="tag tag-more">+{task.tags.length - 2}</span>
					{/if}
				</span>
			{/if}

			<span class="task-file">
				📄 {task.filePath.split('/').pop()}
			</span>
		</div>

		{#if showSubtasks && task.subtasks.length > 0 && expanded}
			<div class="subtasks">
				{#each task.subtasks as subtask (subtask.id)}
					<div class="subtask-item" class:completed={subtask.completed}>
						<input
							type="checkbox"
							checked={subtask.completed}
							on:click|stopPropagation
						/>
						<span class="subtask-text">{subtask.description}</span>
						{#if subtask.dueDate}
							<span class="subtask-due">{formatDate(subtask.dueDate)}</span>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		{#if showAddSubtask}
			<div class="add-subtask" on:click|stopPropagation>
				<input
					type="text"
					bind:value={newSubtaskDesc}
					placeholder="子任务描述..."
					on:keydown={handleKeyDown}
					autofocus
				/>
				<button class="add-subtask-btn" on:click={handleAddSubtask}>添加</button>
			</div>
		{/if}
	</div>

	<div class="task-actions" on:click|stopPropagation>
		<button class="action-btn add-subtask-btn-icon" on:click={() => showAddSubtask = !showAddSubtask} title="添加子任务">
			➕
		</button>
	</div>
</div>

<style>
	.task-item {
		display: flex;
		align-items: flex-start;
		padding: 8px 12px;
		margin: 2px 8px;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.15s;
		gap: 6px;
		position: relative;
	}

	.task-item:hover {
		background: var(--background-modifier-hover);
	}

	.task-item:hover .task-actions {
		opacity: 1;
	}

	.task-item.completed {
		opacity: 0.6;
	}

	.task-item.completed .task-description {
		text-decoration: line-through;
	}

	.task-item.overdue {
		background: rgba(255, 0, 0, 0.08);
	}

	.task-item.today {
		border-left: 3px solid var(--interactive-accent);
	}

	.expand-btn {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 10px;
		color: var(--text-muted);
		padding: 4px 2px;
		min-width: 16px;
		text-align: center;
	}

	.expand-btn:hover {
		color: var(--text-normal);
	}

	.expand-spacer {
		display: inline-block;
		width: 16px;
		flex-shrink: 0;
	}

	.task-checkbox {
		display: flex;
		align-items: center;
		padding-top: 2px;
		flex-shrink: 0;
	}

	.task-checkbox input {
		cursor: pointer;
		width: 16px;
		height: 16px;
	}

	.task-content {
		flex: 1;
		min-width: 0;
	}

	.task-main {
		display: flex;
		align-items: flex-start;
		gap: 6px;
	}

	.task-priority {
		flex-shrink: 0;
		font-size: 12px;
	}

	.task-description {
		flex: 1;
		font-size: 14px;
		line-height: 1.4;
		word-break: break-word;
	}

	.task-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 4px;
		font-size: 12px;
		color: var(--text-muted);
	}

	.task-due.overdue {
		color: var(--text-error);
		font-weight: 500;
	}

	.subtask-progress {
		color: var(--text-accent);
		font-weight: 500;
	}

	.task-tags {
		display: flex;
		gap: 4px;
	}

	.tag {
		background: var(--background-modifier-border);
		padding: 1px 6px;
		border-radius: 4px;
		font-size: 11px;
	}

	.tag-more {
		opacity: 0.7;
	}

	.task-file {
		opacity: 0.7;
	}

	.task-actions {
		display: flex;
		align-items: center;
		opacity: 0;
		transition: opacity 0.15s;
		flex-shrink: 0;
	}

	.action-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px 6px;
		border-radius: 4px;
		font-size: 14px;
	}

	.action-btn:hover {
		background: var(--background-modifier-hover);
	}

	.subtasks {
		margin-top: 6px;
		padding-left: 24px;
		border-left: 2px solid var(--background-modifier-border);
	}

	.subtask-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
		font-size: 13px;
	}

	.subtask-item.completed .subtask-text {
		text-decoration: line-through;
		opacity: 0.6;
	}

	.subtask-item input {
		width: 14px;
		height: 14px;
		cursor: pointer;
		flex-shrink: 0;
	}

	.subtask-text {
		color: var(--text-muted);
		flex: 1;
	}

	.subtask-due {
		font-size: 11px;
		color: var(--text-faint);
		flex-shrink: 0;
	}

	.add-subtask {
		display: flex;
		gap: 6px;
		margin-top: 8px;
		padding-left: 24px;
	}

	.add-subtask input {
		flex: 1;
		padding: 6px 10px;
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
		font-size: 13px;
		background: var(--background-primary);
		color: var(--text-normal);
		outline: none;
	}

	.add-subtask input:focus {
		border-color: var(--interactive-accent);
	}

	.add-subtask-btn {
		padding: 6px 12px;
		background: var(--interactive-accent);
		color: var(--text-on-accent);
		border: none;
		border-radius: 4px;
		font-size: 12px;
		cursor: pointer;
	}

	.add-subtask-btn-icon {
		font-size: 12px;
	}
</style>
