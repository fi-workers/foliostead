/** HTML 텍스트 노드/속성값 escape. 렌더러가 직접 만드는 모든 HTML 조각에 반드시 사용한다. */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * URL path -> Vault path 정규화.
 *
 * Vault API 자체가 vault root 밖을 볼 수 없지만, "../" 같은 세그먼트를 그대로 넘기면
 * 예상치 못한 resolution이 일어날 수 있으므로 여기서 미리 잘라낸다.
 * 규칙에 어긋나면 null을 반환하고 호출부는 400/404로 처리한다.
 */
export function normalizeVaultPath(rawPath: string): string | null {
	if (rawPath.includes("\0")) return null;

	const segments = rawPath.split("/");
	const out: string[] = [];

	for (const segment of segments) {
		if (segment === "" || segment === ".") continue; // 중복 슬래시 / 현재 디렉터리는 무시
		if (segment === "..") return null; // 상위 디렉터리 탈출은 항상 거부
		if (segment.startsWith("/") || segment.includes("\\")) return null;
		out.push(segment);
	}

	return out.join("/");
}

/** Vault path를 URL로 만든다. 세그먼트 단위로 인코딩해서 "/"는 그대로 남긴다. */
export function encodeVaultPath(vaultPath: string): string {
	return vaultPath.split("/").map(encodeURIComponent).join("/");
}

/** "폴더/노트.md" -> "/폴더/노트" 형태의 브라우저 URL */
export function noteUrlPath(vaultPath: string): string {
	const withoutExt = vaultPath.replace(/\.md$/i, "");
	return "/" + encodeVaultPath(withoutExt);
}

/** 첨부파일(바이너리) URL */
export function assetUrlPath(vaultPath: string): string {
	return "/_assets/" + encodeVaultPath(vaultPath);
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "avif", "ico"]);

export function isImageExtension(extension: string): boolean {
	return IMAGE_EXTENSIONS.has(extension.toLowerCase());
}

const MIME_TYPES: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	svg: "image/svg+xml",
	webp: "image/webp",
	bmp: "image/bmp",
	avif: "image/avif",
	ico: "image/x-icon",
	pdf: "application/pdf",
	mp3: "audio/mpeg",
	wav: "audio/wav",
	m4a: "audio/mp4",
	ogg: "audio/ogg",
	mp4: "video/mp4",
	webm: "video/webm",
	mov: "video/quicktime",
	txt: "text/plain; charset=utf-8",
	json: "application/json; charset=utf-8",
	css: "text/css; charset=utf-8",
};

export function mimeTypeFor(extension: string): string {
	return MIME_TYPES[extension.toLowerCase()] ?? "application/octet-stream";
}

/** heading id / wikilink 앵커용 슬러그. 한글은 그대로 두고 공백만 하이픈으로 바꾼다. */
export function slugify(text: string): string {
	return text
		.trim()
		.toLowerCase()
		.replace(/[\s]+/g, "-")
		.replace(/[^\p{L}\p{N}\-_]/gu, "");
}
