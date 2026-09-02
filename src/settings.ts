import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type FoliosteadPlugin from "./main";

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

export class FoliosteadSettingTab extends PluginSettingTab {
	private statusEl: HTMLElement | null = null;
	private portDebounce: number | null = null;
	private pendingPortValue: string | null = null;

	constructor(app: App, private readonly plugin: FoliosteadPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Enable server")
			.setDesc("Obsidian이 실행되는 동안 localhost HTTP 서버를 띄웁니다.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
					// 설정 변경 시 항상 기존 서버를 먼저 닫고 다시 띄운다 (EADDRINUSE 방지).
					await this.plugin.restartServer();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName("Port")
			.setDesc(`127.0.0.1에서 listen할 포트 (${MIN_PORT}-${MAX_PORT}).`)
			.addText((text) =>
				text
					.setPlaceholder(String(DEFAULT_SETTINGS.port))
					.setValue(String(this.plugin.settings.port))
					// onChange는 키 입력마다 불린다. 입력 도중의 중간값("2712")으로
					// 서버를 재시작하지 않도록 디바운스한다.
					.onChange((value) => this.schedulePortChange(value))
			);

		containerEl.createEl("h3", { text: "Status" });
		this.statusEl = containerEl.createEl("p");
		this.renderStatus();
	}

	private schedulePortChange(rawValue: string): void {
		this.pendingPortValue = rawValue;
		if (this.portDebounce !== null) window.clearTimeout(this.portDebounce);
		this.portDebounce = window.setTimeout(() => void this.flushPortChange(), 700);
	}

	/** 설정 창을 닫을 때도 입력값이 유실되지 않도록 즉시 반영한다. */
	hide(): void {
		void this.flushPortChange();
	}

	private async flushPortChange(): Promise<void> {
		if (this.portDebounce !== null) {
			window.clearTimeout(this.portDebounce);
			this.portDebounce = null;
		}

		const rawValue = this.pendingPortValue;
		this.pendingPortValue = null;
		if (rawValue === null) return;

		const port = Number.parseInt(rawValue.trim(), 10);
		if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
			new Notice(`Foliostead: 포트는 ${MIN_PORT}-${MAX_PORT} 범위여야 합니다.`);
			return;
		}
		if (port === this.plugin.settings.port) return;

		this.plugin.settings.port = port;
		await this.plugin.saveSettings();
		await this.plugin.restartServer();
		this.renderStatus();
	}

	private renderStatus(): void {
		if (!this.statusEl) return;
		this.statusEl.empty();

		const url = this.plugin.serverUrl();
		if (url) {
			this.statusEl.setText("Serving at ");
			this.statusEl.createEl("a", { text: url, href: url });
		} else {
			this.statusEl.setText("Server is not running.");
		}
	}
}
