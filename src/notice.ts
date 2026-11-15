import { Notice } from 'obsidian';

/** Obsidian Notice는 생성자에서 토스트를 띄운다. 호출부가 `new`를 부수 효과로만 쓰지 않도록 감싼다. */
export function notify(message: string, durationMs?: number): Notice {
	return new Notice(message, durationMs);
}
