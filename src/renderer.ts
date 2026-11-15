import MarkdownItCtor from 'markdown-it';
import type { Env, MarkdownIt, StateCore, StateInline, Token } from 'markdown-it';
import type { App, TFile } from 'obsidian';

import { assetUrlPath, escapeHtml, isImageExtension, noteUrlPath, slugify } from './utils';

export interface RenderedNote {
	title: string;
	html: string;
}

interface RenderEnv extends Env {
	/** 링크 resolution의 기준이 되는 노트 경로 (metadataCache가 요구). */
	sourcePath: string;
}

/* ------------------------------------------------------------------ *
 * Obsidian wikilink: [[Note]] / [[Note|Alias]] / [[Note#Heading]] / ![[img.png]]
 * ------------------------------------------------------------------ */

function renderWikilink(app: App, raw: string, isEmbed: boolean, sourcePath: string): string {
	const pipeIndex = raw.indexOf('|');
	const target = (pipeIndex === -1 ? raw : raw.slice(0, pipeIndex)).trim();
	const alias = pipeIndex === -1 ? null : raw.slice(pipeIndex + 1).trim();

	// "Note#Heading" / "Note#^blockid" 분리
	const hashIndex = target.indexOf('#');
	const linkpath = (hashIndex === -1 ? target : target.slice(0, hashIndex)).trim();
	const subpath = hashIndex === -1 ? '' : target.slice(hashIndex + 1).trim();

	const displayText = alias ?? (isEmbed ? linkpath : target);

	// 단순히 같은 폴더에 .md를 붙이는 대신 Obsidian의 실제 link resolution을 사용한다.
	const dest = linkpath.length > 0 ? app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath) : null;

	if (!dest) {
		// 존재하지 않는 노트 링크: Obsidian처럼 죽은 링크로 표시만 한다.
		return `<a class="unresolved" title="Unresolved link">${escapeHtml(displayText)}</a>`;
	}

	if (isEmbed) {
		if (isImageExtension(dest.extension)) {
			return `<img src="${escapeHtml(assetUrlPath(dest.path))}" alt="${escapeHtml(displayText)}">`;
		}
		// 이미지 이외의 embed(노트 embed, PDF 등)는 v0.1에서 링크로 대체한다. (TODO)
		const href = dest.extension === 'md' ? noteUrlPath(dest.path) : assetUrlPath(dest.path);
		return `<a href="${escapeHtml(href)}">${escapeHtml(displayText)}</a>`;
	}

	if (dest.extension !== 'md') {
		return `<a href="${escapeHtml(assetUrlPath(dest.path))}">${escapeHtml(displayText)}</a>`;
	}

	const anchor = subpath.length > 0 && !subpath.startsWith('^') ? `#${slugify(subpath)}` : '';
	return `<a href="${escapeHtml(noteUrlPath(dest.path) + anchor)}">${escapeHtml(displayText)}</a>`;
}

function sourcePathOf(env: Env): string {
	const value = env['sourcePath'];
	return typeof value === 'string' ? value : '';
}

function wikilinkPlugin(md: MarkdownIt, app: App): void {
	// 'link' 앞에 끼워 넣는다. backticks 규칙이 이보다 먼저 돌기 때문에
	// 인라인 코드(`[[foo]]`) 안의 wikilink는 건드리지 않는다.
	md.inline.ruler.before('link', 'wikilink', (state: StateInline, silent: boolean): boolean => {
		const { src } = state;
		const isEmbed = src.startsWith('!', state.pos);
		const pos = isEmbed ? state.pos + 1 : state.pos;

		if (!src.startsWith('[[', pos)) {
			return false;
		}

		const contentStart = pos + 2;
		const end = src.indexOf(']]', contentStart);
		if (end === -1) {
			return false;
		}

		const raw = src.slice(contentStart, end);
		if (raw.length === 0 || raw.includes('\n') || raw.includes('[')) {
			return false;
		}

		if (!silent) {
			const token = state.push('html_inline', '', 0);
			token.content = renderWikilink(app, raw, isEmbed, sourcePathOf(state.env));
		}

		// markdown-it 인라인 규칙은 state.pos를 옮기는 것으로 소비한 길이를 알린다.
		// oxlint-disable-next-line no-param-reassign -- markdown-it 규칙 API가 state 변경을 요구한다.
		state.pos = end + 2;
		return true;
	});
}

/* ------------------------------------------------------------------ *
 * Obsidian callout: > [!note] Title
 * ------------------------------------------------------------------ */

const CALLOUT_HEAD = /^\[!([A-Za-z][\w-]*)\][+-]?[ \t]*(.*)$/u;

function findMatchingBlockquoteClose(tokens: readonly Token[], openIndex: number): Token | undefined {
	const level = tokens[openIndex]?.level;
	return tokens.slice(openIndex + 1).find((token) => token.type === 'blockquote_close' && token.level === level);
}

/** blockquote_open 위치에서 callout을 변환한다. 변환했으면 true. */
function convertCallout(state: StateCore, index: number): boolean {
	const { tokens } = state;
	const open = tokens[index];
	const paragraphOpen = tokens[index + 1];
	const inline = tokens[index + 2];
	if (open?.type !== 'blockquote_open' || paragraphOpen?.type !== 'paragraph_open' || inline?.type !== 'inline') {
		return false;
	}

	const newlineIndex = inline.content.indexOf('\n');
	const firstLine = newlineIndex === -1 ? inline.content : inline.content.slice(0, newlineIndex);
	const match = CALLOUT_HEAD.exec(firstLine);
	const rawType = match?.[1];
	if (match === null || rawType === undefined) {
		return false;
	}

	const type = rawType.toLowerCase();
	const explicitTitle = (match[2] ?? '').trim();
	const title = explicitTitle.length > 0 ? explicitTitle : type.charAt(0).toUpperCase() + type.slice(1);
	const typeSlug = slugify(type);

	open.tag = 'div';
	open.attrSet('class', `callout callout-${typeSlug.length > 0 ? typeSlug : 'note'}`);

	const close = findMatchingBlockquoteClose(tokens, index);
	if (close) {
		close.tag = 'div';
	}

	const titleToken = new state.Token('html_block', '', 0);
	titleToken.content = `<div class="callout-title">${escapeHtml(title)}</div>\n`;

	const rest = newlineIndex === -1 ? '' : inline.content.slice(newlineIndex + 1);
	if (rest.trim().length === 0) {
		// 본문이 없으면 제목 문단 자체를 제목 블록으로 교체
		tokens.splice(index + 1, 3, titleToken);
	} else {
		inline.content = rest;
		tokens.splice(index + 1, 0, titleToken);
	}
	return true;
}

function calloutPlugin(md: MarkdownIt): void {
	// inline 파싱 전에 돌려야 첫 줄(제목)을 떼어낸 나머지가 정상적으로 인라인 파싱된다.
	md.core.ruler.before('inline', 'obsidian_callout', (state: StateCore): void => {
		// 변환하면서 tokens 길이가 바뀌므로 매 반복마다 길이를 다시 읽는다.
		for (let i = 0; i < state.tokens.length; i += 1) {
			convertCallout(state, i);
		}
	});
}

/* ------------------------------------------------------------------ *
 * heading id (wikilink의 #Heading 앵커가 실제로 동작하도록)
 * ------------------------------------------------------------------ */

function uniqueId(base: string, used: Set<string>): string {
	let id = base;
	let n = 1;
	while (used.has(id)) {
		id = `${base}-${n}`;
		n += 1;
	}
	used.add(id);
	return id;
}

function headingIdPlugin(md: MarkdownIt): void {
	md.core.ruler.push('heading_ids', (state: StateCore): void => {
		const { tokens } = state;
		const used = new Set<string>();

		tokens.forEach((token, i) => {
			const inline = tokens[i + 1];
			if (token.type !== 'heading_open' || inline?.type !== 'inline') {
				return;
			}
			const base = slugify(inline.content);
			if (base.length > 0) {
				token.attrSet('id', uniqueId(base, used));
			}
		});
	});
}

/**
 * markdown-it 인스턴스는 한 번만 만들고 재사용한다.
 * 문서마다 달라지는 값(sourcePath)은 render()의 env로 전달한다.
 */
function createMarkdownIt(app: App): MarkdownIt {
	const md = new MarkdownItCtor({
		// 보안 기본값: Vault 안의 raw HTML을 그대로 브라우저에 흘리지 않는다.
		// (localhost 전용이라도 노트에 붙여넣은 <script>가 그대로 실행되는 건 피한다.)
		html: false,
		linkify: true,
		breaks: false,
		typographer: false,
	});

	md.use(wikilinkPlugin, app);
	md.use(calloutPlugin);
	md.use(headingIdPlugin);

	// 넓은 표가 페이지 가로 스크롤을 만들지 않도록 감싼다.
	md.renderer.rules['table_open'] = () => '<div class="table-wrap"><table>';
	md.renderer.rules['table_close'] = () => '</table></div>';

	return md;
}

/** frontmatter는 본문에 렌더링하지 않는다. metadataCache 위치를 우선 쓰고, 없으면 정규식으로 fallback. */
function stripFrontmatter(raw: string, endOffset?: number): string {
	if (typeof endOffset === 'number' && endOffset > 0 && endOffset <= raw.length) {
		return raw.slice(endOffset).replace(/^\r?\n/u, '');
	}
	return raw.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/u, '');
}

/* ------------------------------------------------------------------ *
 * Renderer
 * ------------------------------------------------------------------ */

export class NoteRenderer {
	private readonly app: App;
	private readonly md: MarkdownIt;

	constructor(app: App) {
		this.app = app;
		this.md = createMarkdownIt(app);
	}

	async render(file: TFile): Promise<RenderedNote> {
		// cachedRead: 저장 즉시 최신 내용이 보이면서 반복 요청은 캐시를 탄다.
		const raw = await this.app.vault.cachedRead(file);
		const cache = this.app.metadataCache.getFileCache(file);

		const body = stripFrontmatter(raw, cache?.frontmatterPosition?.end.offset);
		const frontmatterTitle: unknown = cache?.frontmatter?.['title'];
		const title =
			typeof frontmatterTitle === 'string' && frontmatterTitle.trim().length > 0
				? frontmatterTitle.trim()
				: file.basename;

		const env: RenderEnv = { sourcePath: file.path };
		return { title, html: this.md.render(body, env) };
	}
}
