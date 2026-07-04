import { ItemView, WorkspaceLeaf } from 'obsidian';
import type SmartTaskPlugin from './main';
import { SmartTaskViewController } from './smartTaskView';

export const SMARTTASK_VIEW_TYPE = 'smarttask-view';

export class SmartTaskView extends ItemView {
	plugin: SmartTaskPlugin;
	private controller: SmartTaskViewController | null = null;
	private unsubscribe: (() => void) | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: SmartTaskPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return SMARTTASK_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'SmartTask';
	}

	getIcon(): string {
		return 'check-square';
	}

	async onOpen(): Promise<void> {
		this.render();
		
		this.unsubscribe = this.plugin.onTasksChange(() => {
			if (this.controller) {
				this.controller.updateTasks(this.plugin.getTasks(), this.plugin.getAllTags());
			}
		});
	}

	async onClose(): Promise<void> {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
		this.controller = null;
	}

	private render(): void {
		const container = this.contentEl;
		
		const oldWrapper = container.querySelector('.smarttask-wrapper');
		if (oldWrapper) oldWrapper.remove();

		const wrapper = container.createDiv({ cls: 'smarttask-wrapper' });
		
		this.controller = new SmartTaskViewController(this.plugin, wrapper);
		this.controller.render();
	}
}
