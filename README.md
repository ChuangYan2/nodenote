# NodeNote

NodeNote turns a plain Markdown file into a **board of question/note cards** inside VS Code — each
card carries a status, holds tabbed answers, can be pinned to the top, links to other cards, and
accepts pasted images. It's still ordinary Markdown underneath, so the same file stays readable in
any editor (Obsidian included) and round-trips losslessly.

> Made for capturing and triaging a stream of open questions: jot fast, mark *today / important /
> parked*, attach several answers, pin what matters, and link related cards.

---

## Install

Search **NodeNote** in the Extensions view (`Ctrl/Cmd+Shift+X`) and click **Install** — or from a
terminal:

```bash
code --install-extension Chuang.nodenote
```

Then right-click any `.md` → **Open With…** → **NodeNote**.

> Prefer not to use the Marketplace? Build a `.vsix` from source (see [Build & test](#build--test))
> and run `code --install-extension nodenote-<version>.vsix`.

---

## Use it

| Do this | How |
| --- | --- |
| **Add a card** | `+ New question` / `+ New note` (bottom bar), or **Shift+Enter** in a cell to commit and start the next |
| **Switch type** | the **Q / N** button on a card |
| **Set status** | the 🏷 button → *important · today · open · answered · parked* |
| **Add answers** | the **+** on a question; answers are **tabs with editable labels** (`pro`, `con`, …) |
| **Pin** | the pin button — the card sticks, expanded, to the top while you scroll |
| **Link cards** | type `[[heading-or-id]]` → clickable chip; the target shows a **"Referenced by"** backlink |
| **Paste an image** | paste into a body → saved to an `assets/` folder, inserted as `![](assets/…)` |
| **Navigate** | **↑/↓** between cards, **←/→** between a card's answer tabs |

Bodies render Markdown (bold, lists, `code`, links, images); click a body to edit the raw source,
click away to render. Non-image pastes are inserted as **plain text** (formatting stripped; LaTeX/math
kept verbatim).

---

## It's just Markdown

A card is a heading; an invisible `<!-- inbox: … -->` comment carries its metadata; answers are
sub-headings linked by `parent`:

```markdown
<!-- inbox: type=question; status=today,important; id=q1 -->
## How does FMCW range resolution depend on chirp bandwidth?

Want the clean derivation plus the practical ADC-rate limit.

<!-- inbox: type=answer; parent=q1 -->
### bandwidth

Range resolution `Δr = c / (2·B)` — set only by sweep bandwidth `B`.

<!-- inbox: type=answer; parent=q1 -->
### ADC limit

In practice capped by the ADC sample rate.
```

Open that with the plain text editor and it's clean Markdown; open it with NodeNote and it's a
question card with two answer tabs. See [`examples/sample.md`](examples/sample.md) for a fuller file,
and [`APPLICATION_NOTES.md`](APPLICATION_NOTES.md) for the format and workflows.

---

## Features

- Question / note cards with a 5-color **status** system (uses your theme's chart colors)
- **Tabbed answers** with editable labels
- **Pin** cards — sticky, always-expanded, at the top
- Markdown **read/edit** bodies — bold, lists, code, links, **images**
- **`[[wikilinks]]`** between cards + **backlinks**
- **Image paste** → `assets/`; **plain-text paste** otherwise (LaTeX/math preserved)
- `created` / `updated` **timestamps**
- **Theme-adaptive** — derives its own contrast from any VS Code theme
- Keyboard: **Shift+Enter** next card, **↑/↓**, **←/→**
- **Lossless** plain-Markdown storage; Obsidian-friendly

---

## Build & test

```bash
npm install
npm run compile     # tsc → out/
npm run bundle      # esbuild web bundle
npm run lint
npm run test:core   # fast unit tests for the core (no VS Code needed)
```

The parser / serializer / view-model is a framework-agnostic core in [`src/core/`](src/core/)
(tested with Node's built-in runner); the UI is a webview custom editor in
[`src/editor.ts`](src/editor.ts) + [`media/editor.html`](media/editor.html).

---

## Credits & license

A fork of Microsoft's
[vscode-markdown-notebook](https://github.com/microsoft/vscode-markdown-notebook), re-imagined as a
question-triage editor. MIT licensed — see [LICENSE](LICENSE).
