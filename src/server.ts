import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { App, Notice, TFile } from "obsidian";
import { NoteRenderer } from "./renderer";
import type { FoliosteadSettings } from "./settings";
import { mimeTypeFor, normalizeVaultPath, noteUrlPath } from "./utils";
import {
	renderErrorPage,
	renderIndexPage,
	renderNotFoundPage,
	renderPage,
} from "./template";

/** v0.1은 loopback 전용. 외부 인터페이스에는 절대 bind 하지 않는다. */
export const HOST = "127.0.0.1";

const ASSET_PREFIX = "/_assets/";

export class FoliosteadServer {
	private server: Server | null = null;
	private readonly sockets = new Set<Socket>();
	private readonly renderer: NoteRenderer;
	private activePort: number | null = null;

	constructor(
		private readonly app: App,
		private readonly getSettings: () => FoliosteadSettings
	) {
		this.renderer = new NoteRenderer(app);
	}

	isRunning(): boolean {
		return this.server !== null;
	}

	/** 실행 중일 때만 base URL을 돌려준다. */
	baseUrl(): string | null {
		return this.activePort === null ? null : `http://${HOST}:${this.activePort}`;
	}

	/**
	 * 서버 시작. 항상 기존 서버를 먼저 닫으므로 설정 변경 시에도 EADDRINUSE가 생기지 않는다.
	 * listen에 실패해도 예외를 던지지 않고 Notice로만 알린다 (플러그인/앱이 죽지 않도록).
	 */
	async start(): Promise<void> {
		await this.stop();

		const { enabled, port } = this.getSettings();
		if (!enabled) return;

		const server = createServer((req, res) => {
			this.handle(req, res).catch((error) => {
				console.error("[foliostead] unhandled request error", error);
				sendHtml(res, 500, renderErrorPage(String(error)));
			});
		});

		// keep-alive 소켓이 남아 있으면 close()가 끝나지 않으므로 직접 추적한다.
		server.on("connection", (socket) => {
			this.sockets.add(socket);
			socket.on("close", () => this.sockets.delete(socket));
		});

		await new Promise<void>((resolve) => {
			const onStartupError = (error: NodeJS.ErrnoException) => {
				this.server = null;
				this.activePort = null;
				if (error.code === "EADDRINUSE") {
					new Notice(
						`Foliostead: 포트 ${port}가 이미 사용 중입니다. 설정에서 다른 포트를 지정하세요.`,
						8000
					);
				} else {
					new Notice(`Foliostead: 서버 시작 실패 (${error.message})`, 8000);
				}
				console.error("[foliostead] listen failed", error);
				resolve();
			};

			server.once("error", onStartupError);
			server.listen(port, HOST, () => {
				server.off("error", onStartupError);
				// listen 이후의 런타임 에러는 로그만 남기고 서버를 유지한다.
				server.on("error", (error) =>
					console.error("[foliostead] server error", error)
				);
				this.server = server;
				this.activePort = port;
				console.log(`[foliostead] listening on http://${HOST}:${port}`);
				resolve();
			});
		});
	}

	async stop(): Promise<void> {
		const server = this.server;
		this.server = null;
		this.activePort = null;
		if (!server) return;

		for (const socket of this.sockets) socket.destroy();
		this.sockets.clear();

		await new Promise<void>((resolve) => server.close(() => resolve()));
	}

	/* ------------------------------ routing ------------------------------ */

	private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
		if (req.method !== "GET" && req.method !== "HEAD") {
			res.writeHead(405, { Allow: "GET, HEAD" }).end();
			return;
		}

		// DNS rebinding 방어: loopback 이름으로 온 요청만 처리한다.
		if (!isLoopbackHost(req.headers.host)) {
			res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" }).end("Forbidden");
			return;
		}

		const url = new URL(req.url ?? "/", `http://${HOST}`);

		let pathname: string;
		try {
			pathname = decodeURIComponent(url.pathname);
		} catch {
			sendHtml(res, 400, renderNotFoundPage(url.pathname));
			return;
		}

		if (pathname === "/favicon.ico") {
			res.writeHead(204).end();
			return;
		}

		if (pathname === "/") {
			sendHtml(res, 200, this.renderIndex());
			return;
		}

		if (pathname.startsWith(ASSET_PREFIX)) {
			await this.serveAsset(res, pathname.slice(ASSET_PREFIX.length));
			return;
		}

		await this.serveNote(res, pathname);
	}

	private renderIndex(): string {
		const files = this.app.vault
			.getMarkdownFiles()
			.map((file) => ({ path: file.path, url: noteUrlPath(file.path) }))
			.sort((a, b) => a.path.localeCompare(b.path));

		return renderIndexPage(this.app.vault.getName(), files);
	}

	private async serveNote(res: ServerResponse, pathname: string): Promise<void> {
		const vaultPath = normalizeVaultPath(pathname);
		if (vaultPath === null || vaultPath.length === 0) {
			sendHtml(res, 404, renderNotFoundPage(pathname));
			return;
		}

		const file = this.findMarkdownFile(vaultPath);
		if (!file) {
			sendHtml(res, 404, renderNotFoundPage(vaultPath));
			return;
		}

		try {
			const { title, html } = await this.renderer.render(file);
			sendHtml(res, 200, renderPage({ title, bodyHtml: html, subtitle: file.path }));
		} catch (error) {
			console.error("[foliostead] render failed", file.path, error);
			sendHtml(res, 500, renderErrorPage(error instanceof Error ? error.message : String(error)));
		}
	}

	/**
	 * URL path -> Markdown 파일.
	 * 1) 정확한 경로 + ".md"
	 * 2) 경로가 이미 .md로 끝나는 경우
	 * 3) metadataCache의 linkpath resolution (Obsidian이 [[...]]를 푸는 것과 동일한 규칙)
	 */
	private findMarkdownFile(vaultPath: string): TFile | null {
		const direct = this.app.vault.getAbstractFileByPath(`${vaultPath}.md`);
		if (direct instanceof TFile) return direct;

		if (/\.md$/i.test(vaultPath)) {
			const exact = this.app.vault.getAbstractFileByPath(vaultPath);
			if (exact instanceof TFile) return exact;
		}

		const resolved = this.app.metadataCache.getFirstLinkpathDest(vaultPath, "");
		if (resolved instanceof TFile && resolved.extension === "md") return resolved;

		return null;
	}

	private async serveAsset(res: ServerResponse, rawPath: string): Promise<void> {
		const vaultPath = normalizeVaultPath(rawPath);
		if (vaultPath === null || vaultPath.length === 0) {
			res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
			return;
		}

		// Vault API만 사용하므로 Vault 밖의 파일은 애초에 접근할 수 없다.
		const file = this.app.vault.getAbstractFileByPath(vaultPath);
		if (!(file instanceof TFile)) {
			res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
			return;
		}

		const data = await this.app.vault.readBinary(file);
		const body = Buffer.from(data);
		res.writeHead(200, {
			"Content-Type": mimeTypeFor(file.extension),
			"Content-Length": body.byteLength,
			"Cache-Control": "no-store",
		});
		res.end(body);
	}
}

function sendHtml(res: ServerResponse, status: number, html: string): void {
	if (res.headersSent) {
		res.end();
		return;
	}
	const body = Buffer.from(html, "utf-8");
	res.writeHead(status, {
		"Content-Type": "text/html; charset=utf-8",
		"Content-Length": body.byteLength,
		// 새로고침하면 항상 최신 내용이 보이도록 캐시하지 않는다.
		"Cache-Control": "no-store",
		"X-Content-Type-Options": "nosniff",
	});
	res.end(body);
}

function isLoopbackHost(host: string | undefined): boolean {
	if (!host) return false;
	const hostname = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
	return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}
