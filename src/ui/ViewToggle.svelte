<script>
	export let currentView;
	export let onChange;
</script>

<div class="view-toggle">
	<button
		class="view-btn"
		class:active={currentView === 'list'}
		on:click={() => onChange('list')}
		title="列表视图"
	>
		📋
	</button>
	<button
		class="view-btn"
		class:active={currentView === 'kanban'}
		on:click={() => onChange('kanban')}
		title="看板视图"
	>
		🗂️
	</button>
	<button
		class="view-btn"
		class:active={currentView === 'calendar'}
		on:click={() => onChange('calendar')}
		title="日历视图"
	>
		📅
	</button>
</div>

<style>
	.view-toggle {
		display: flex;
		gap: 4px;
		background: var(--background-secondary);
		border-radius: 8px;
		padding: 4px;
	}

	.view-btn {
		background: transparent;
		border: none;
		border-radius: 6px;
		padding: 6px 10px;
		font-size: 16px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.view-btn:hover {
		background: var(--background-modifier-hover);
	}

	.view-btn.active {
		background: var(--interactive-accent);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
</style>
