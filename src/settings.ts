import type { App } from 'obsidian';
import { PluginSettingTab, Setting } from 'obsidian';

import type FoliosteadPlugin from './main';
import { notify } from './notice';

export interface FoliosteadSettings {
	enabled: boolean;
	port: number;
}

export const DEFAULT_SETTINGS: FoliosteadSettings = {
	enabled: true,
	port: 27123,
};

export const MIN_PORT = 1024;
export const MAX_PORT = 65535;

export function isValidPort(port: number): boolean {
	return Number.isInteger(port) && port >= MIN_PORT && port <= MAX_PORT;
}

/** data.json은 사용자가 손댈 수 있으므로 필드마다 확인하고, 이상한 값은 기본값으로 둔다. */
export function parseSettings(data: unknown): FoliosteadSettings {
	if (typeof data !== 'object' || data === null) {
		return { ...DEFAULT_SETTINGS };
	}
	const enabled: unknown = Reflect.get(data, 'enabled');
	const port: unknown = Reflect.get(data, 'port');
	return {
		enabled: typeof enabled === 'boolean' ? enabled : DEFAULT_SETTINGS.enabled,
		port: typeof port === 'number' && isValidPort(port) ? port : DEFAULT_SETTINGS.port,
	};
}

export class FoliosteadSettingTab extends PluginSettingTab {
	private readonly plugin: FoliosteadPlugin;
	private statusEl: HTMLElement | null = null;
	private portDebounce: ReturnType<typeof setTimeout> | null = null;
	private pendingPortValue: string | null = null;

	constructor(app: App, plugin: FoliosteadPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	override display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable server')
			.setDesc('Obsidian이 실행되는 동안 localhost HTTP 서버를 띄웁니다.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
					// 설정 변경 시 항상 기존 서버를 먼저 닫고 다시 띄운다 (EADDRINUSE 방지).
					await this.plugin.restartServer();
					this.display();
				}),
			);

		new Setting(containerEl)
			.setName('Port')
			.setDesc(`127.0.0.1에서 listen할 포트 (${MIN_PORT}-${MAX_PORT}).`)
			.addText((text) =>
				text
					.setPlaceholder(String(DEFAULT_SETTINGS.port))
					.setValue(String(this.plugin.settings.port))
					// onChange는 키 입력마다 불린다. 입력 도중의 중간값("2712")으로
					// 서버를 재시작하지 않도록 디바운스한다.
					.onChange((value) => {
						this.schedulePortChange(value);
					}),
			);

		containerEl.createEl('h3', { text: 'Status' });
		this.statusEl = containerEl.createEl('p');
		this.renderStatus();
	}

	private schedulePortChange(rawValue: string): void {
		this.pendingPortValue = rawValue;
		if (this.portDebounce !== null) {
			clearTimeout(this.portDebounce);
		}
		this.portDebounce = setTimeout(() => {
			void this.flushPortChange();
		}, 700);
	}

	/** 설정 창을 닫을 때도 입력값이 유실되지 않도록 즉시 반영한다. */
	override hide(): void {
		void this.flushPortChange();
	}

	private async flushPortChange(): Promise<void> {
		if (this.portDebounce !== null) {
			clearTimeout(this.portDebounce);
			this.portDebounce = null;
		}

		const rawValue = this.pendingPortValue;
		this.pendingPortValue = null;
		if (rawValue === null) {
			return;
		}

		const port = Math.trunc(Number(rawValue.trim()));
		if (!isValidPort(port)) {
			notify(`Foliostead: 포트는 ${MIN_PORT}-${MAX_PORT} 범위여야 합니다.`);
			return;
		}
		if (port === this.plugin.settings.port) {
			return;
		}

		this.plugin.settings.port = port;
		await this.plugin.saveSettings();
		await this.plugin.restartServer();
		this.renderStatus();
	}

	private renderStatus(): void {
		if (!this.statusEl) {
			return;
		}
		this.statusEl.empty();

		const url = this.plugin.serverUrl();
		if (url === null) {
			this.statusEl.setText('Server is not running.');
		} else {
			this.statusEl.setText('Serving at ');
			this.statusEl.createEl('a', { text: url, href: url });
		}
	}
}
