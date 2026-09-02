import { Notice, Plugin, TFile } from "obsidian";
import { FoliosteadServer } from "./server";
import {
	DEFAULT_SETTINGS,
	FoliosteadSettingTab,
	type FoliosteadSettings,
} from "./settings";
import { noteUrlPath } from "./utils";

export default class FoliosteadPlugin extends Plugin {
	settings: FoliosteadSettings = { ...DEFAULT_SETTINGS };
	private server: FoliosteadServer | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.server = new FoliosteadServer(this.app, () => this.settings);
		this.addSettingTab(new FoliosteadSettingTab(this.app, this));

		this.addCommand({
			id: "open-current-note-in-browser",
			name: "Open current note in browser",
			callback: () => this.openCurrentNoteInBrowser(),
		});

		this.addRibbonIcon("globe", "Open current note in browser", () =>
			this.openCurrentNoteInBrowser()
		);

		// metadataCache가 준비된 뒤에 서버를 띄운다.
		// (link resolution과 파일 목록이 처음 요청부터 정확해야 하므로)
		this.app.workspace.onLayoutReady(() => {
			void this.server?.start();
		});
	}

	async onunload(): Promise<void> {
		// 플러그인 비활성화 / Obsidian 종료 시 포트를 반드시 닫는다.
		await this.server?.stop();
		this.server = null;
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async restartServer(): Promise<void> {
		await this.server?.start(); // start()가 내부에서 먼저 stop()을 호출한다.
	}

	serverUrl(): string | null {
		return this.server?.baseUrl() ?? null;
	}

	private openCurrentNoteInBrowser(): void {
		const baseUrl = this.server?.baseUrl();
		if (!baseUrl) {
			new Notice("Foliostead: 서버가 실행 중이 아닙니다. 설정에서 활성화하세요.");
			return;
		}

		const file = this.app.workspace.getActiveFile();
		if (!(file instanceof TFile) || file.extension !== "md") {
			new Notice("Foliostead: 열려 있는 Markdown 노트가 없습니다.");
			return;
		}

		// Obsidian desktop에서 window.open의 외부 URL은 시스템 기본 브라우저로 열린다.
		window.open(baseUrl + noteUrlPath(file.path), "_blank");
	}
}
