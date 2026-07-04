<script>
	export let onCreate;

	let description = '';
	let showOptions = false;
	let dueDate = '';
	let priority = '';

	const PRIORITY_HIGHEST = 'highest';
	const PRIORITY_HIGH = 'high';
	const PRIORITY_MEDIUM = 'medium';
	const PRIORITY_LOW = 'low';

	function handleSubmit() {
		if (!description.trim()) return;
		onCreate(description.trim(), dueDate || undefined, priority || undefined);
		description = '';
		dueDate = '';
		priority = '';
		showOptions = false;
	}

	function handleKeyDown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function setQuickDate(days) {
		const date = new Date();
		date.setDate(date.getDate() + days);
		dueDate = date.toISOString().split('T')[0];
	}

	function setToday() {
		setQuickDate(0);
	}

	function setTomorrow() {
		setQuickDate(1);
	}

	function setNextWeek() {
		setQuickDate(7);
	}
</script>

<div class="quick-create">
	<div class="quick-create-input">
		<span class="quick-create-icon">➕</span>
		<input
			type="text"
			bind:value={description}
			placeholder="快速创建任务... (按 Enter 提交)"
			on:keydown={handleKeyDown}
			on:focus={() => showOptions = true}
		/>
		{#if description.trim()}
			<button class="submit-btn" on:click={handleSubmit}>添加</button>
		{/if}
	</div>

	{#if showOptions}
		<div class="quick-options">
			<div class="option-group">
				<span class="option-label">截止日期:</span>
				<div class="option-buttons">
					<button class="option-btn" on:click={setToday}>今天</button>
					<button class="option-btn" on:click={setTomorrow}>明天</button>
					<button class="option-btn" on:click={setNextWeek}>下周</button>
					<input
						type="date"
						bind:value={dueDate}
						class="date-input"
					/>
					{#if dueDate}
						<button class="clear-btn" on:click={() => dueDate = ''}>清除</button>
					{/if}
				</div>
			</div>

			<div class="option-group">
				<span class="option-label">优先级:</span>
				<div class="option-buttons">
					<button
						class="priority-btn highest"
						class:active={priority === PRIORITY_HIGHEST}
						on:click={() => priority = priority === PRIORITY_HIGHEST ? '' : PRIORITY_HIGHEST}
					>🔝 最高</button>
					<button
						class="priority-btn high"
						class:active={priority === PRIORITY_HIGH}
						on:click={() => priority = priority === PRIORITY_HIGH ? '' : PRIORITY_HIGH}
					>🔺 高</button>
					<button
						class="priority-btn medium"
						class:active={priority === PRIORITY_MEDIUM}
						on:click={() => priority = priority === PRIORITY_MEDIUM ? '' : PRIORITY_MEDIUM}
					>🔼 中</button>
					<button
						class="priority-btn low"
						class:active={priority === PRIORITY_LOW}
						on:click={() => priority = priority === PRIORITY_LOW ? '' : PRIORITY_LOW}
					>🔽 低</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.quick-create {
		padding: 12px 16px;
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.quick-create-input {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--background-secondary);
		border-radius: 8px;
		padding: 8px 12px;
		border: 2px solid transparent;
		transition: border-color 0.15s;
	}

	.quick-create-input:focus-within {
		border-color: var(--interactive-accent);
	}

	.quick-create-icon {
		font-size: 16px;
		opacity: 0.7;
	}

	.quick-create-input input {
		flex: 1;
		border: none;
		background: transparent;
		outline: none;
		font-size: 14px;
		color: var(--text-normal);
		padding: 4px 0;
	}

	.quick-create-input input::placeholder {
		color: var(--text-faint);
	}

	.submit-btn {
		background: var(--interactive-accent);
		color: var(--text-on-accent);
		border: none;
		border-radius: 6px;
		padding: 6px 12px;
		font-size: 13px;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.submit-btn:hover {
		opacity: 0.9;
	}

	.quick-options {
		margin-top: 12px;
		padding: 12px;
		background: var(--background-secondary);
		border-radius: 8px;
	}

	.option-group {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 10px;
	}

	.option-group:last-child {
		margin-bottom: 0;
	}

	.option-label {
		font-size: 13px;
		color: var(--text-muted);
		min-width: 70px;
		flex-shrink: 0;
	}

	.option-buttons {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		align-items: center;
	}

	.option-btn {
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
		padding: 4px 10px;
		font-size: 12px;
		cursor: pointer;
		color: var(--text-muted);
		transition: all 0.15s;
	}

	.option-btn:hover {
		background: var(--background-modifier-hover);
		color: var(--text-normal);
	}

	.date-input {
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
		padding: 3px 8px;
		font-size: 12px;
		color: var(--text-normal);
		cursor: pointer;
	}

	.clear-btn {
		background: transparent;
		border: none;
		color: var(--text-faint);
		font-size: 12px;
		cursor: pointer;
		padding: 4px 8px;
	}

	.clear-btn:hover {
		color: var(--text-error);
	}

	.priority-btn {
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
		padding: 4px 8px;
		font-size: 12px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.priority-btn:hover {
		background: var(--background-modifier-hover);
	}

	.priority-btn.active {
		border-color: var(--interactive-accent);
		background: rgba(var(--interactive-accent-rgb), 0.1);
	}

	.priority-btn.highest { color: var(--text-error); }
	.priority-btn.high { color: var(--text-accent); }
	.priority-btn.medium { color: var(--text-warning); }
	.priority-btn.low { color: var(--text-muted); }
</style>
