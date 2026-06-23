# Idea Inbox — Specification

> Completes the intent in [ideal_inbox.md](ideal_inbox.md). One markdown file, two plugins
> (VS Code + Obsidian). The on-disk format is the contract; both plugins only render it.
> UI design: see the published design artifact.

## 1. Concept

A triage notebook for open research questions. Each cell carries a **status flag**. Most cells
are **question cells** that grow one or more **answer cells** layered beneath them. A question
moves as a unit (its answers travel with it). A graph view colors questions by status.

## 2. On-disk format (decided)

Heading hierarchy carries the question→answer structure; one invisible HTML-comment line per
cell is the source of truth for metadata, optionally mirrored to Obsidian `#tags`. Degrades to a
normal, readable markdown doc for any reader that ignores the comments.

```markdown
<!-- inbox: type=question; status=today,important; flags=open; id=q1 -->
## ❓ How does FMCW range resolution depend on chirp bandwidth? ^q1
#today #important #q/open

Want the clean derivation plus the practical limit set by our ADC sample rate.

<!-- inbox: type=answer; parent=q1; id=a1 -->
### 💡 Answer — bandwidth ^a1
Range resolution `Δr = c / (2·B)` — independent of chirp time.

<!-- inbox: type=answer; parent=q1; id=a2 -->
### 💡 Answer — ADC limit ^a2
In practice capped by ADC sample rate / max beat frequency.
```

### Metadata grammar
`<!-- inbox: key=value; key=value; ... -->` immediately preceding the cell's heading.

| key | values | notes |
|-----|--------|-------|
| `type` | `question` \| `answer` \| `note` | inferred when absent (heading with `?` → question) |
| `status` | comma list from taxonomy (§4) | multiple allowed |
| `flags` | comma list, e.g. `open`, `blocked` | free-form, lower priority than status |
| `id` | short slug | stable; used by `parent` and the graph |
| `parent` | an `id` | answers only; binds answer→question |

- **Move semantics:** moving a question = moving its heading block plus every following block
  whose `parent` resolves (transitively) to it. Answer ordering = document order.
- **No-question cells:** `type=note` — status flag, no answer tabs.
- **Round-trip:** lossless. Comment + `^anchor` + `#tags` all survive a plain markdown editor.

## 3. Repo structure

Monorepo; shared parser is the single source of truth.

```
packages/
  core/            # parse/serialize the format above; framework-agnostic
  vscode/          # this extension — notebook renderer + cell status bar
  obsidian/        # Obsidian plugin — Live Preview decorations + post-processor
```

The current [src/markdownParser.ts](../src/markdownParser.ts) becomes the seed of `packages/core`.

## 4. Status taxonomy

Fixed core set (fixed colors); user-defined extras via settings. Color is the primary signal.

| status | color | meaning |
|--------|-------|---------|
| `important` | `#D6453D` | needs attention |
| `today` | `#E0951B` | working on it now |
| `open` (question) | `#2F6DB5` | unanswered |
| `answered` | `#3F8A4E` | resolved |
| `parked` | `#8A7CA8` | deferred |
| custom… | settings | user-defined name + hex |

Multiple statuses per cell allowed. Left-edge color spine = dominant status for scannability.

## 5. Rendering per plugin

- **VS Code:** flags render top-right of each cell (custom cell renderer — the native status bar
  is bottom-only). "+ add answer" button creates an `answer` cell with `parent` set. Drag grip
  moves the question subtree.
- **Obsidian:** same file via Live Preview decorations + markdown post-processor; statuses shown
  as native `#tags`, question/answer as callouts. Native graph consumes `#tags` + `^anchors`.

## 6. Open research item (#7 from original notes)

Color encoding for the graph view: prototype and compare (a) status→hue legend vs (b) heat by
age/priority. Decide by scan-speed.

## 7. Build order

1. ~~Pin the markdown spec~~ ✅ (this doc).
2. ~~Shared, framework-agnostic core (parse/serialize + metadata) with tests~~ ✅
   — [src/core/inbox.ts](../src/core/inbox.ts), [src/core/statuses.ts](../src/core/statuses.ts),
   19 unit tests in [src/core/inbox.test.ts](../src/core/inbox.test.ts) (`npm run test:core`).
   Lives under `src/core/` for now; extract to `packages/core` when the Obsidian plugin lands
   (deferred to avoid churning the build before there's a second consumer).
3. **VS Code (in progress):** serializer wired to the core; native cell status bar showing
   status + an **+ answer** button; `setStatus` / `addAnswer` commands.
   *Next:* custom cell renderer for top-right colored flags + answer tabs; move-as-subtree command.
4. Obsidian plugin reading the same files.
5. Graph view + color experiment (§6).
6. Excalidraw embed — standard `![[sketch.excalidraw]]` works in both ecosystems.

### Verification status
Core (`npm run test:core`) is green in this environment. The `vscode`-facing code
([extension.ts](../src/extension.ts)) is written against the documented API but **not yet
compiled here** (this machine has no `npm`/`node_modules`). To verify:
`npm install && npm run compile && npm run test:core`, then F5 to launch the Extension Host and
open [feature/example_inbox.md](example_inbox.md).
