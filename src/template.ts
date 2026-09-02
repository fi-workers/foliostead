import { escapeHtml } from "./utils";

/**
 * 외부 CSS 프레임워크 없이 직접 작성한 읽기용 스타일.
 * 색상은 전부 CSS 변수로 두고 prefers-color-scheme으로 dark 값만 덮어쓴다.
 */
const STYLES = `
:root {
	color-scheme: light dark;
	--bg: #ffffff;
	--bg-subtle: #f7f7f5;
	--fg: #23211d;
	--fg-muted: #6b6862;
	--fg-faint: #9a9691;
	--border: #e6e4e0;
	--accent: #3d6fe0;
	--code-bg: #f5f5f3;
	--quote-border: #dcdad5;
	--mark: #fdf3c7;
}

@media (prefers-color-scheme: dark) {
	:root {
		--bg: #191919;
		--bg-subtle: #202020;
		--fg: #e4e2df;
		--fg-muted: #a2a09c;
		--fg-faint: #75726e;
		--border: #2f2f2e;
		--accent: #7ea2ff;
		--code-bg: #232322;
		--quote-border: #3a3a38;
		--mark: #4a4224;
	}
}

* { box-sizing: border-box; }

html {
	-webkit-text-size-adjust: 100%;
}

body {
	margin: 0;
	background: var(--bg);
	color: var(--fg);
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Pretendard",
		"Apple SD Gothic Neo", "Noto Sans KR", Roboto, Helvetica, Arial, sans-serif;
	font-size: 17px;
	line-height: 1.75;
	-webkit-font-smoothing: antialiased;
	text-rendering: optimizeLegibility;
}

main {
	max-width: 760px;
	margin: 0 auto;
	padding: 88px 28px 160px;
}

@media (max-width: 640px) {
	body { font-size: 16px; }
	main { padding: 48px 20px 96px; }
}

main > h1 {
	font-size: 2.1em;
	line-height: 1.25;
	letter-spacing: -0.02em;
	font-weight: 700;
	margin: 0 0 0.15em;
}

.doc-meta {
	color: var(--fg-faint);
	font-size: 0.82em;
	margin: 0 0 2.4em;
	letter-spacing: 0.01em;
}

.site-footer {
	margin-top: 5em;
	padding-top: 1.6em;
	border-top: 1px solid var(--border);
	color: var(--fg-faint);
	font-size: 0.78em;
	letter-spacing: 0.01em;
}

.site-footer a {
	color: inherit;
	text-decoration: none;
	border-bottom: 1px solid var(--border);
}

.site-footer a:hover { color: var(--fg-muted); }

article > *:first-child { margin-top: 0; }
article > *:last-child { margin-bottom: 0; }

article h1, article h2, article h3, article h4, article h5, article h6 {
	line-height: 1.3;
	letter-spacing: -0.01em;
	font-weight: 650;
	margin: 2em 0 0.6em;
	scroll-margin-top: 24px;
}

article h1 { font-size: 1.7em; }
article h2 { font-size: 1.4em; }
article h3 { font-size: 1.18em; }
article h4 { font-size: 1.02em; }
article h5, article h6 { font-size: 0.95em; color: var(--fg-muted); }

article p { margin: 0 0 1.1em; }

article a {
	color: var(--accent);
	text-decoration: none;
	border-bottom: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
}
article a:hover { border-bottom-color: var(--accent); }

article a.unresolved {
	color: var(--fg-faint);
	border-bottom: 1px dashed var(--border);
	cursor: not-allowed;
}

article ul, article ol { margin: 0 0 1.1em; padding-left: 1.5em; }
article li { margin: 0.25em 0; }
article li > ul, article li > ol { margin-bottom: 0; }

article blockquote {
	margin: 1.4em 0;
	padding: 0.1em 0 0.1em 1.1em;
	border-left: 3px solid var(--quote-border);
	color: var(--fg-muted);
}

article hr {
	border: none;
	border-top: 1px solid var(--border);
	margin: 2.6em 0;
}

article img {
	max-width: 100%;
	height: auto;
	border-radius: 6px;
	display: block;
	margin: 1.4em 0;
}

article code {
	font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
	font-size: 0.86em;
	background: var(--code-bg);
	border-radius: 4px;
	padding: 0.15em 0.36em;
}

article pre {
	background: var(--code-bg);
	border: 1px solid var(--border);
	border-radius: 8px;
	padding: 14px 16px;
	overflow-x: auto;
	margin: 1.4em 0;
	line-height: 1.6;
}

article pre code {
	background: none;
	padding: 0;
	font-size: 0.85em;
}

.table-wrap { overflow-x: auto; margin: 1.5em 0; }

article table {
	border-collapse: collapse;
	width: 100%;
	font-size: 0.94em;
}

article th, article td {
	border-bottom: 1px solid var(--border);
	padding: 8px 12px;
	text-align: left;
	vertical-align: top;
}

article thead th {
	color: var(--fg-muted);
	font-weight: 600;
	font-size: 0.86em;
	letter-spacing: 0.03em;
	text-transform: uppercase;
	border-bottom: 1px solid var(--fg-faint);
}

article mark { background: var(--mark); color: inherit; border-radius: 3px; padding: 0 2px; }

/* Obsidian callout */
.callout {
	margin: 1.5em 0;
	padding: 14px 16px;
	border-radius: 8px;
	border: 1px solid var(--border);
	border-left: 3px solid var(--callout-color, var(--fg-faint));
	background: var(--bg-subtle);
}
.callout > *:first-child { margin-top: 0; }
.callout > *:last-child { margin-bottom: 0; }
.callout-title {
	font-weight: 650;
	color: var(--callout-color, var(--fg));
	margin-bottom: 0.4em;
	font-size: 0.95em;
	letter-spacing: 0.01em;
}
.callout-note, .callout-info { --callout-color: #3d6fe0; }
.callout-tip, .callout-hint, .callout-success, .callout-check, .callout-done { --callout-color: #2f9e6f; }
.callout-warning, .callout-caution, .callout-attention { --callout-color: #cc8a1a; }
.callout-danger, .callout-error, .callout-bug, .callout-failure { --callout-color: #d1503f; }
.callout-quote, .callout-cite, .callout-abstract, .callout-summary { --callout-color: #8a8782; }

/* index / 404 */
.file-list { list-style: none; margin: 0; padding: 0; }
.file-list li { margin: 0; border-bottom: 1px solid var(--border); }
.file-list a {
	display: block;
	padding: 10px 2px;
	color: var(--fg);
	text-decoration: none;
	border: none;
}
.file-list a:hover { color: var(--accent); }
.file-list .dir { color: var(--fg-faint); }

.notice {
	color: var(--fg-muted);
	margin: 0 0 2em;
}
.notice code {
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	background: var(--code-bg);
	border-radius: 4px;
	padding: 0.15em 0.4em;
	font-size: 0.88em;
	word-break: break-all;
}
`;

export interface PageOptions {
	title: string;
	/** 이미 안전하게 만들어진 HTML. */
	bodyHtml: string;
	/** 제목 아래 회색 보조 텍스트 (파일 경로 등). */
	subtitle?: string;
}

/** AGPL-3.0 제13조: 네트워크 이용자에게 소스 코드 취득 경로를 제공해야 한다. */
const SOURCE_URL = "https://github.com/w0nder-official/foliostead";

export function renderPage({ title, bodyHtml, subtitle }: PageOptions): string {
	const subtitleHtml = subtitle ? `<p class="doc-meta">${escapeHtml(subtitle)}</p>` : "";
	return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
${subtitleHtml}
<article>
${bodyHtml}
</article>
<footer class="site-footer">
Served by <a href="${SOURCE_URL}" rel="noreferrer">Foliostead</a>
</footer>
</main>
</body>
</html>
`;
}

export function renderNotFoundPage(requestedPath: string): string {
	return renderPage({
		title: "Not found",
		bodyHtml: `<p class="notice">이 Vault에서 <code>${escapeHtml(requestedPath)}</code> 에 해당하는 노트를 찾지 못했습니다.</p>
<p><a href="/">전체 노트 목록</a></p>`,
	});
}

export function renderErrorPage(message: string): string {
	return renderPage({
		title: "Error",
		bodyHtml: `<p class="notice">노트를 렌더링하는 중 오류가 발생했습니다.</p>
<pre><code>${escapeHtml(message)}</code></pre>
<p><a href="/">전체 노트 목록</a></p>`,
	});
}

export function renderIndexPage(vaultName: string, files: { path: string; url: string }[]): string {
	if (files.length === 0) {
		return renderPage({
			title: vaultName,
			bodyHtml: `<p class="notice">이 Vault에는 아직 Markdown 노트가 없습니다.</p>`,
		});
	}

	const items = files
		.map((file) => {
			const lastSlash = file.path.lastIndexOf("/");
			const dir = lastSlash === -1 ? "" : file.path.slice(0, lastSlash + 1);
			const name = file.path.slice(lastSlash + 1).replace(/\.md$/i, "");
			return `<li><a href="${escapeHtml(file.url)}"><span class="dir">${escapeHtml(dir)}</span>${escapeHtml(name)}</a></li>`;
		})
		.join("\n");

	return renderPage({
		title: vaultName,
		subtitle: `${files.length} notes`,
		bodyHtml: `<ul class="file-list">\n${items}\n</ul>`,
	});
}
