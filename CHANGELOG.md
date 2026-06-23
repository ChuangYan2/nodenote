# Changelog

All notable changes to **NodeNote** are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/).

## [0.1.1] — 2026-06-23

### Changed
- README install instructions now point to the VS Code Marketplace (build-from-source kept as a
  fallback). No functional changes to the extension.

## [0.1.0] — 2026-06-23

First public release. A webview custom editor (`nodenote.editor`) for `.md` files.

### Added
- Question / note **cards** rendered from a plain Markdown file (heading = card; `<!-- inbox: … -->`
  comment = metadata), with lossless round-trip.
- **Status** system: important / today / open / answered / parked (theme-native colors), shown on the
  card and its left rail.
- **Tabbed answers** with editable labels; pick a tab to view, `+` to add, `×` to remove.
- **Pin** a card → it sticks, expanded, to the top while the rest scrolls.
- Markdown **read/edit** bodies — bold, italic, lists, `code`, links, and **images**.
- **`[[wikilinks]]`** between cards + **"Referenced by"** backlinks.
- **Image paste** → saved to an `assets/` folder next to the file as `![](assets/…)`; all other pastes
  are inserted as plain text (LaTeX/math kept verbatim).
- `created` / `updated` **timestamps** in the metadata.
- **Theme-adaptive** styling that derives its own contrast from any VS Code theme.
- Keyboard: **Shift+Enter** (next card), **↑/↓** (between cards), **←/→** (between answer tabs).
- Framework-agnostic **core** (`src/core/`) with Node-based unit tests (`npm run test:core`).

### Notes
- Forked from Microsoft's `vscode-markdown-notebook`; the original paragraph/code-block notebook
  serializer was replaced by the card model and webview editor.
