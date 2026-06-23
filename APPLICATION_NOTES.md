# NodeNote — Application Notes

Practical notes on what NodeNote is for, the file format it reads/writes, and how to work with it.

## 1. What it's for

NodeNote is a **capture-and-triage surface for open questions** (research questions, design
questions, "things to figure out"). The loop it optimizes:

1. **Capture** a question fast (don't break flow).
2. **Triage** it with a status — *today / important / open / answered / parked*.
3. **Answer** it — attach one or more answers as labelled tabs (`pro`, `con`, `v1`, …).
4. **Keep the important ones in view** — pin them to the top.
5. **Connect** related questions with `[[links]]`.

Everything is stored in a normal `.md` file, so it stays portable and works in other tools
(Obsidian, plain editors, git diffs).

## 2. The file format

A NodeNote file is Markdown. Each **card** is a heading, optionally preceded by a one-line HTML
comment that carries its metadata:

```markdown
<!-- inbox: type=question; status=today,important; id=q1; created=2026-06-23T09:00Z -->
## How does range resolution depend on bandwidth?

Body text (Markdown).

<!-- inbox: type=answer; parent=q1 -->
### bandwidth

Answer body (Markdown).
```

### Metadata grammar
`<!-- inbox: key=value; key=value; … -->` immediately above the heading.

| key | meaning |
| --- | --- |
| `type` | `question` \| `answer` \| `note` (inferred when absent: a `?` in the heading ⇒ question) |
| `status` | comma list from the taxonomy below |
| `id` | stable id; the target of `[[links]]` and of an answer's `parent` |
| `parent` | on an answer: the `id` of the question it belongs to |
| `created` / `updated` | ISO-8601 timestamps |
| anything else | preserved verbatim (e.g. a future `group=` or `stack=`) |

Rules:
- A **card** spans from its heading to the next heading. Answers are sub-headings whose `parent`
  points at their question.
- The marker keyword is `inbox:` (kept for backward compatibility with files made during development).
- The comment is **invisible** in rendered Markdown / Obsidian; the file reads cleanly without NodeNote.
- **Round-trip is lossless** and idempotent: unknown keys, timestamps, anchors (`^id`) and `#tags`
  lines are preserved; the only normalization is canonical key order and a single blank line after a
  heading.
- **EOL is preserved** (CRLF stays CRLF). Writes are minimal (only the changed range), so git diffs
  stay small.

### Status taxonomy
`important` · `today` · `open` · `answered` · `parked`. Colors come from your VS Code theme's chart
palette, so they fit any theme. A card can hold several statuses; the highest-priority one colors its
left rail.

## 3. Working with it

- **Open**: right-click a `.md` → *Open With… → NodeNote*.
- **Add**: bottom bar `+ New question` / `+ New note`; or **Shift+Enter** in a card to commit and
  start the next. New cards default to **Question** (toggle with the **Q/N** button).
- **Status**: 🏷 on the card.
- **Answers**: `+` on a question; tabs carry editable labels.
- **Pin**: the pin button — pinned cards are sticky at the top, always expanded.
- **Bodies**: render Markdown when not focused; click to edit the raw source, click away to render.
- **Links**: `[[id-or-heading]]` → clickable chip; the target shows a "Referenced by" backlink.
- **Images**: paste into a body → saved to an `assets/` folder beside the file as `![](assets/…)`.
  Other pastes insert as plain text (formatting stripped; LaTeX/Unicode math kept).
- **Keyboard**: Shift+Enter (next card), ↑/↓ (between cards), ←/→ (between answer tabs).

## 4. Interop

Because it's plain Markdown, the same file opens in Obsidian or any editor. Links use `[[…]]`
(Obsidian-native). Images are normal `![](assets/…)` links. The `<!-- inbox -->` comments are hidden
in reading views.

## 5. Known limitations

- A body line that *looks like a heading* (`# something` at column 0, outside a code fence) will split
  the card on reload — keep literal `#` lines inside fenced code blocks.
- Image paste needs a **saved** file (it writes `assets/` next to it) and a body in **edit mode**
  (click into it first). The image is inserted at the end of that field.
- Pasting from a source that only offers `text/html` (no `text/plain`) may keep some formatting.

## 6. Architecture

- **`src/core/`** — framework-agnostic (no `vscode`): `inbox.ts` (parse/serialize), `view.ts`
  (group cells into a question→answers view model), `statuses.ts`, `textedit.ts` (minimal diff).
  Tested with Node's built-in runner: `npm run test:core`.
- **`src/editor.ts`** — the `CustomTextEditorProvider`. The document is the source of truth; it sends
  the view model to the webview, applies minimal scoped edits on changes, preserves EOL, guards
  against echo loops, and saves pasted images.
- **`media/editor.html`** — the webview UI (cards, answers, pins, markdown render/edit, links,
  paste). Theme-adaptive via `--vscode-*` tokens with self-derived contrast.

See [`docs/format-spec.md`](docs/format-spec.md) and [`docs/design-notes.md`](docs/design-notes.md)
for deeper design history.
