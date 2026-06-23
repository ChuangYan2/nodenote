# Idea Inbox — Next-Generation Design

> Synthesis of a five-lens review (usability, visual, correctness, features, architecture) of the
> current webview custom editor. Analysis only — no implementation here.

## Verdict

The **triage data model** and the **single-question card editor** (status flags, tabbed answers,
drag-reorder, plain-markdown contract) are genuinely good and worth keeping. What holds the
product back is concentrated in four places, in priority order:

1. **One architectural choice** — "post the whole view → replace the whole document → re-parse →
   rebuild all HTML" — is the *root cause* of most correctness, performance, and UX defects at once.
2. **Data-integrity hazards** in parse/serialize that can corrupt a user's file.
3. **Zero VS Code theme integration** — a hardcoded light palette that is unusable in a dark theme.
4. **Missing daily-tool basics** (keyboard, delete, search/filter, save feedback) and the **missing
   visual half** of the original vision (graph, custom colors, Excalidraw).

---

## The root cause: the sync + render loop

**Today (every interaction):**
```
webview mutates whole `view`  ──post entire view──►  serializeView (all cells)
   ──replace ENTIRE document──►  onDidChangeTextDocument  ──parseView (whole file)──►
   ──post whole view──►  cardsEl.innerHTML = … (rebuild ALL cards)
```
This single loop produces, across the reviews:
- Caret / IME-composition / scroll **lost** on status toggle, reload, or undo (full `innerHTML` wipe).
- **O(document)** work per keystroke flush; large files lag; whole-view JSON sent each flush.
- **Coarse, wrong undo** — one Ctrl+Z reverts the entire document to the last debounce snapshot.
- A **fragile echo guard** (`lastWritten` compare-by-text) that drops legitimate external edits and
  can let the webview silently overwrite them.

**Target:** intent-based, scoped, id-keyed.
```
webview posts {op:'setBody'|'toggleStatus'|'addAnswer'|…, id, payload}  (tiny, O(1))
   provider edits ONLY that cell's line range (per-cell ranges from the parser)
   webview patches ONLY that card's DOM node (keyed by stable id); full render = first paint only
   external change → send a diff, not a full reload;  echo guard becomes unnecessary
```
This one change fixes caret/IME/scroll, makes undo per-edit, drops cost from O(document) to
O(edit), and retires the echo guard. **It is the highest-leverage work in the whole plan.**

---

## Global priorities

### P0 — Correctness & trust (do first)
- **Sync/render rewrite** (above): scoped `WorkspaceEdit` per cell range; keyed DOM reconciliation;
  give **every** card a stable `id` (today only questions-with-answers get one); persist transient
  UI state (active answer tab, scroll) via `vscode.setState()`; suppress flushes during IME
  `compositionstart/end`.
- **Stop re-parsing body text as structure.** A body line like `# Example`, a ```` ``` ```` fence,
  a `<!-- inbox … -->` comment, or a `#tag #tag` line gets reinterpreted on the next load and
  **tears a card in two / injects metadata into a sibling**. Body is free text and must never be
  re-derived into structure. (Highest data-loss risk.)
- **Preserve line endings** — CRLF files are silently rewritten to LF on the first edit (whole-file
  diff). Honor `document.eol` on serialize.
- **Stop positional re-parenting & heading-level bumping** — dragging a question above an unrelated
  answer rewrites that answer's `parent=`; answers' heading levels are force-bumped every save.
  Respect existing `parent` links; don't mutate levels silently. Make `viewToInbox` **pure** (it
  currently mutates the live in-memory model).
- **Theme-adaptive UI** — derive surfaces/text from `--vscode-editor-background` /
  `editorWidget-background` / `editor-foreground` / `panel-border` (sage palette as light-only
  fallback). Fix status-flag contrast (white-on-amber fails WCAG; use dark ink or darker fills).
  Make flags/tabs/buttons real focusable controls with `:focus-visible`.
- **Card delete + undo + save indicator** — there is currently *no way to delete a card* (only
  answers), deletes are silent/irreversible-feeling, and nothing signals saved/saving. Add card
  delete, wrap destructive actions in an undo toast, flush on blur/dispose/pre-save, show
  "Saved ✓ / Saving…".

### P1 — Make it a daily research tool
- **Keyboard model**: Enter→new card, Cmd/Ctrl+Enter→new answer, Alt+↑/↓ reorder, ←/→ switch
  answer tabs, a key to toggle status, Esc to close popover. Today everything is mouse/drag.
- **List-scale management** (the inbox collapses past ~30 cards without this): **search**,
  **filter by status** (make the legend clickable), **sort** (status priority / age), **collapse**
  cards, and a **"Today / Important" focus view**.
- **Fast-capture command** (palette + keybinding → append a question, cursor ready) — the defining
  loop of an "inbox" and currently click-heavy.
- **Single source of truth for the status taxonomy** — it's duplicated in `core/statuses.ts`, the
  CSS `:root` vars, and the JS `STATUSES` array; they will drift, and **custom statuses from
  Obsidian render as invisible unstyled flags today**. Centralize in core; surface a custom-status
  settings UI (delivers original intent #7 part 1).
- **Complete move-as-subtree** — `subtreeIndices()` exists in core but is unwired; add keyboard move
  and a clear insertion-bar drop indicator (not full-card highlight).
- **Visual polish**: open the type scale (24/18/14, 600 headings), reserve mono for metadata only,
  one consistent tab metaphor, Codicon functional icons instead of emoji glyphs, near-invisible grid,
  hover/active states, narrow-pane responsiveness.

### P2 — Complete the vision & scale out
- **Graph view + the color-encoding experiment** (original intent #2 & #7) — the marquee unbuilt
  feature; needs timestamps + linking first to have something to plot.
- **Obsidian plugin** — extract a real `packages/core` (today it's `src/core/` imported with `.ts`
  specifiers, not a packaged module); Live-Preview decorations + markdown post-processor; **decide
  and enforce the tag-mirroring direction** (comment ↔ `#tags`) so the two tools don't diverge.
- **Excalidraw embedding** (intent #5) — real work, since the webview renders body as escaped plain
  text; lowest daily frequency.
- **Question ↔ question linking** — research questions cluster; `^anchors` are already preserved, so
  surface `[[links]]`; bridges to the graph view.

---

## Concrete decisions for the next-gen spec

**Format additions (cheap to do now, before real data & the Obsidian plugin lock them in):**
- Add `created` / `updated` timestamps to `InboxMeta` → unblocks sort-by-age, review cadence, and
  the heat-by-age color experiment.
- Add a schema `version` key → migration anchor.
- Use collision-resistant ids (UUID-ish), not per-doc `q1/a1` counters → safe across devices/merges.
- **Metadata-comment fragility**: the model rides on an HTML comment on the line *directly* above
  the heading; a formatter inserting a blank line orphans it. Consider tolerating a blank line, or
  moving metadata onto the heading line / a fenced block.

**Architecture / module layout (the monorepo the spec already promises):**
```
packages/
  core/      # inbox.ts (parse/serialize + expose per-cell line ranges), view.ts (PURE),
             # statuses.ts (single taxonomy), diff.ts (keyed view diff). Zero deps. Tested.
  vscode/    # provider (scoped edits, no echo guard) + webview/ as a BUNDLED TS entry
             # that imports core (today the webview JS is an untested inline blob in editor.html
             # that can't share core — the biggest debt for the Obsidian goal).
  obsidian/  # Live-Preview decorations + post-processor, imports the same core.
```
- Keep `node --experimental-strip-types` for fast core tests, but add a `tsc --noEmit` CI gate
  (type-stripping does no type-checking) and document the "no enums/namespaces in core" constraint.

**Visual direction:** theme-adaptive surfaces with a *fixed accent identity*. Derive every surface
and text color from `--vscode-*` tokens so it feels native in light/dark/high-contrast; keep the
teal accent and five semantic status hues as the brand, shipping light- and dark-tuned variants of
each (selected via the `vscode-dark` body class) always paired with a contrast-checked foreground.
The "sage paper" look survives as an opt-in light flavor, not the only thing the editor knows.

---

## Suggested sequencing

1. **Phase 1 — Foundation rewrite (P0).** Sync/render architecture (scoped edits + keyed reconcile +
   stable ids + UI-state persistence) and the data-integrity fixes, plus theme adaptation and
   delete/undo/save-feedback. This makes it correct, fast, trustworthy, and usable in any theme.
2. **Phase 2 — Daily tool (P1).** Keyboard model, search/filter/sort/collapse/focus, fast-capture,
   taxonomy SSOT + custom statuses, finished move-as-subtree, visual polish.
3. **Phase 3 — Vision & scale (P2).** Format additions (timestamps/version/uuid), extract
   `packages/core`, Obsidian plugin, graph view + color experiment, linking, Excalidraw.

## Intent coverage (original 7 points)
| # | Intent | Status |
|---|--------|--------|
| 1 | Per-cell status bar/flags | ✅ done |
| 2 | See the graphic (graph view) | ❌ missing → P2 |
| 3 | Question → answer sub-tabs, multiple/layered | ✅ done |
| 4 | Move question with its answers | ◑ partial (drag carries answers; no keyboard move; `subtreeIndices` unwired) |
| 5 | Excalidraw embedding | ❌ missing → P2 |
| 6 | No-question (note) cells | ✅ done |
| 7 | Color settings + encoding experiment | ◑ partial (5 fixed colors; no settings, no experiment) → P1/P2 |
