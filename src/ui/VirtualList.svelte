<script lang="ts">
	import { onMount, onDestroy, afterUpdate } from 'svelte';

	export let items: any[] = [];
	export let itemHeight: number = 44;
	export let overscan: number = 5;
	export let renderItem: (item: any, index: number) => any;

	let container: HTMLElement;
	let scrollTop = 0;
	let containerHeight = 0;

	$: startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
	$: endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);
	$: visibleItems = items.slice(startIndex, endIndex);
	$: totalHeight = items.length * itemHeight;
	$: offsetY = startIndex * itemHeight;

	function onScroll(e: Event) {
		scrollTop = (e.target as HTMLElement).scrollTop;
	}

	function updateContainerHeight() {
		if (container) {
			containerHeight = container.clientHeight;
		}
	}

	onMount(() => {
		updateContainerHeight();
		window.addEventListener('resize', updateContainerHeight);
	});

	onDestroy(() => {
		window.removeEventListener('resize', updateContainerHeight);
	});
</script>

<div class="virtual-list" bind:this={container} on:scroll={onScroll}>
	<div class="virtual-spacer" style="height: {totalHeight}px;">
		<div class="virtual-content" style="transform: translateY({offsetY}px);">
			{#each visibleItems as item, i (item.id || startIndex + i)}
				<div class="virtual-item" style="height: {itemHeight}px;">
					<svelte:component this={renderItem} item={item} index={startIndex + i} />
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.virtual-list {
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.virtual-spacer {
		position: relative;
		width: 100%;
	}

	.virtual-content {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
	}

	.virtual-item {
		width: 100%;
		box-sizing: border-box;
	}
</style>
