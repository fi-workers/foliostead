# Foliostead

**Self-hosted reading and publishing for your Obsidian vault.**

Foliostead는 Obsidian의 유료 기능(Sync·Publish)을 **자기 서버에서 직접 굴리기 위한** 오픈소스
스택입니다. 지금은 그 첫 조각 — Obsidian이 켜져 있는 동안 로컬 HTTP 서버를 띄워 Vault의
Markdown을 브라우저에서 읽기 좋은 웹페이지로 보여주는 데스크톱 플러그인입니다.

별도 Node 설치도, 백그라운드 daemon도 필요 없습니다. Obsidian(Electron)의 Node API로
`node:http` 서버를 플러그인 안에서 직접 띄웁니다.

```
Vault                            브라우저
개발/MQTT.md            ->  http://127.0.0.1:27123/개발/MQTT
개발/WebSocket.md       ->  http://127.0.0.1:27123/개발/WebSocket
일기/2026-08-31.md      ->  http://127.0.0.1:27123/일기/2026-08-31
```

## 로드맵

| Phase | 내용 | 상태 |
| --- | --- | --- |
| 0 | 로컬 읽기 뷰어 — localhost, 타이포그래피, wikilink 정확 해석 | ✅ v0.1 |
| 1 | 배포 인프라 — 멀티 PC 설치, 릴리스 자동화, 자동 업데이트 | 진행 중 |
| 2 | **원격 공개 (Publish 대체)** — 프록시/터널, 도메인, TLS, 접근 제어 | 예정 |
| 3 | **동기화 (Sync 대체)** — 기기 간 동기화, 충돌 해결, 버전 이력 | 예정 |
| 4 | 관리형 호스팅 — 자체 구축이 어려운 사용자를 위한 대행 | 예정 |

원칙: **로컬 Vault가 언제나 원본입니다.** 서버가 죽어도 노트는 그대로 남습니다.

## 무엇을 하나 (v0.1)

- 플러그인이 로드되면 `127.0.0.1:27123`에 HTTP 서버가 자동으로 뜹니다.
- 플러그인을 끄거나 Obsidian을 종료하면 서버가 닫히고 포트가 해제됩니다.
- URL path를 `decodeURIComponent` 한 뒤 `<path>.md`를 Vault에서 찾아 렌더링합니다.
- `/` 로 접속하면 Vault의 노트 목록이 나옵니다.
- 저장 후 브라우저를 새로고침하면 바로 최신 내용이 보입니다. (`no-store`, `vault.cachedRead`)

### 지원하는 Markdown

headings / paragraphs / lists / blockquote / links / inline code / fenced code block /
table / horizontal rule / images

### 지원하는 Obsidian 문법

| 문법 | 동작 |
| --- | --- |
| `[[Note]]` | 해당 노트의 웹 URL로 링크 |
| `[[Note\|Alias]]` | anchor text를 `Alias`로 |
| `[[Note#Heading]]` | 노트 URL + heading 앵커 |
| `![[image.png]]` | `<img>`로 렌더링 (`/_assets/...`에서 서빙) |
| `> [!warning] 제목` | callout 블록 |

링크 해석은 폴더 규칙을 흉내내지 않고 Obsidian의 `metadataCache.getFirstLinkpathDest()`를
그대로 사용합니다. 즉 Obsidian 안에서 링크가 걸리는 문서와 웹에서 열리는 문서가 같습니다.
해석되지 않는 링크는 Obsidian처럼 흐린 "죽은 링크"로 표시됩니다.

### 문서 제목

frontmatter에 `title`이 있으면 그 값을, 없으면 파일 basename을 씁니다.
frontmatter 자체는 본문에 렌더링하지 않습니다.

## 설치

### 방법 1 — BRAT (여러 PC에 쓸 때 권장)

커뮤니티 스토어 등록 전까지는 [BRAT](https://github.com/TfTHacker/obsidian42-brat)으로
설치하는 것이 가장 편합니다. **PC마다 한 번만** 등록해두면 이후 릴리스는 자동으로 따라옵니다.

1. Community plugins에서 **BRAT** 설치 후 활성화
2. `BRAT: Add a beta plugin for testing` 실행
3. `w0nder-official/foliostead` 입력 → Add plugin
4. BRAT 설정에서 **Auto-update plugins at startup** 켜기

이렇게 하면 새 버전을 릴리스할 때마다 각 PC의 Obsidian이 시작하면서 알아서 업데이트합니다.

### 방법 2 — 수동 설치

[Releases](https://github.com/w0nder-official/foliostead/releases)에서 `main.js`와
`manifest.json`을 받아 Vault의 `.obsidian/plugins/foliostead/` 안에 넣습니다.

```bash
VAULT="$HOME/Documents/MyVault"
mkdir -p "$VAULT/.obsidian/plugins/foliostead"
cp main.js manifest.json "$VAULT/.obsidian/plugins/foliostead/"
```

그 다음 Obsidian에서 Settings → Community plugins → **Foliostead** 활성화 →
브라우저에서 <http://127.0.0.1:27123> 접속.

## 개발

```bash
npm install
npm run dev        # esbuild watch (main.js를 계속 다시 만듦)
npm run build      # 타입체크 + production 번들
npm run typecheck  # 타입체크만
```

개발 PC에서는 복사 대신 심볼릭 링크가 편합니다.

```bash
ln -s "$(pwd)" "$VAULT/.obsidian/plugins/foliostead"
```

코드를 고친 뒤에는 Obsidian에서 플러그인을 껐다 켜거나 커맨드 팔레트의
`Reload app without saving`으로 반영합니다.

### 릴리스

`manifest.json`의 버전과 git 태그가 **정확히 일치**해야 하고, 태그에 `v` 접두사를 붙이면
안 됩니다 (Obsidian 규칙). 아래 한 줄이 `manifest.json`·`versions.json` 갱신과 커밋·태그를
전부 처리하고, push하면 GitHub Actions가 빌드해서 릴리스를 만듭니다.

```bash
npm version patch   # 또는 minor / major
git push --follow-tags
```

## 설정

| 항목 | 기본값 | 설명 |
| --- | --- | --- |
| Enable server | on | 끄면 서버를 닫습니다. |
| Port | 27123 | 1024–65535. 바꾸면 기존 서버를 닫고 새 포트로 다시 띄웁니다. |

포트가 이미 사용 중이면 Obsidian Notice로 알려주고, 앱은 그대로 동작합니다.

## 명령어

- **Open current note in browser** — 현재 열려 있는 Markdown 노트를 기본 브라우저에서 엽니다.
  (커맨드 팔레트 또는 좌측 리본의 지구본 아이콘)

## 보안

이 플러그인은 Vault 내용을 HTTP로 노출하므로 아래 원칙을 지킵니다.

- **`127.0.0.1`에만 bind합니다.** 같은 네트워크의 다른 기기에서는 접근할 수 없습니다.
- `Host` 헤더가 loopback이 아닌 요청은 `403`으로 거부합니다. (DNS rebinding 방어)
- URL path에 `..` 세그먼트가 있으면 거부합니다. 파일 접근은 전부 Obsidian Vault API로만
  하므로 Vault 밖의 파일은 애초에 읽을 수 없습니다.
- **Markdown 안의 raw HTML은 렌더링하지 않고 escape합니다** (`markdown-it`의 `html: false`).
  노트에 붙여넣은 `<script>`가 그대로 실행되는 상황을 막기 위한 기본값입니다.
- 플러그인이 직접 만드는 HTML 조각(wikilink, callout 제목 등)은 모두 escape합니다.
- 응답에 `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`,
  `<meta name="robots" content="noindex">`를 붙입니다.

인증은 없습니다. 로컬 머신에서 실행 중인 다른 프로세스는 이 서버에 접근할 수 있습니다.
원격 공개와 인증은 Phase 2의 주제입니다.

## 현재 제한사항 / TODO

- **모바일 미지원.** `node:http`를 쓰기 때문에 `isDesktopOnly: true`입니다.
  Phase 3(동기화)에서는 서버를 플러그인 밖으로 빼고 플러그인은 클라이언트가 되어야 합니다.
- **KaTeX 수식 미지원.** CSS와 폰트까지 번들해야 해서 v0.1 범위에서 제외했습니다.
- **노트 embed(`![[Note]]`) 미지원.** 이미지 이외의 embed는 링크로 대체됩니다.
- **live reload 없음.** 노트를 수정하면 브라우저를 직접 새로고침해야 합니다.
- **검색/태그/그래프 없음.** v0.1의 목표는 "Markdown을 예쁘게 HTTP로 읽기" 하나입니다.
- **코드 문법 하이라이팅 없음.** 코드 블록은 단색으로 렌더링됩니다.
- `[[Note#^blockid]]`의 블록 참조는 앵커 없이 문서 링크로만 처리됩니다.
- heading 앵커 슬러그는 Obsidian 내부 규칙과 정확히 같지 않을 수 있습니다.

## 프로젝트 구조

```
src/
  main.ts       플러그인 진입점 (load/unload, command, ribbon)
  server.ts     node:http 서버, 라우팅, 정적 asset 서빙
  renderer.ts   markdown-it 설정, wikilink/callout/heading-id 플러그인
  template.ts   HTML 셸과 CSS
  settings.ts   설정 정의와 설정 탭
  utils.ts      path 정규화, escape, MIME 등
```

## License

GNU Affero General Public License v3.0 or later — [LICENSE](LICENSE) 참조.

자체 호스팅은 완전히 자유입니다. 다만 이 코드를 **네트워크 서비스로 제공**하는 경우
AGPL 제13조에 따라 이용자에게 소스 코드를 제공해야 합니다.

```
Copyright (C) 2026 w0nder

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
```
