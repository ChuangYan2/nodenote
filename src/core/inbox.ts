/*---------------------------------------------------------------------------------------------
 *  Idea Inbox core — framework-agnostic parsing/serialization of the inbox markdown format.
 *  No `vscode` dependency: this module is the shared contract both plugins (VS Code, Obsidian)
 *  build on, and is intended to be extracted to `packages/core`. See feature/idea_inbox_spec.md.
 *--------------------------------------------------------------------------------------------*/

export type CellType = 'question' | 'answer' | 'note';

const CELL_TYPES: ReadonlySet<string> = new Set<CellType>(['question', 'answer', 'note']);

/** Parsed `<!-- inbox: ... -->` metadata for one cell. */
export interface InboxMeta {
	/** Literal `type=` value if present (not inferred — see {@link effectiveType}). */
	type?: CellType;
	status: string[];
	flags: string[];
	id?: string;
	/** `parent` id — set on answer cells, binding them to their question. */
	parent?: string;
	/** ISO-8601 creation timestamp (e.g. `2026-06-22T14:03Z`). */
	created?: string;
	/** ISO-8601 last-updated timestamp. */
	updated?: string;
	/** Unrecognized `key=value` pairs, preserved verbatim for lossless round-trip. */
	extra: Record<string, string>;
}

export interface InboxCell {
	meta: InboxMeta;
	/** 1–6 for `#`..`######`; 0 for a preamble cell with no heading. */
	headingLevel: number;
	/** Heading text without the leading `#`s and without the trailing `^anchor`. */
	headingText: string;
	/** Block anchor without the leading `^`, e.g. `q1`. */
	anchor?: string;
	/** Raw `#tag #tag` line directly under the heading, preserved verbatim. */
	tagLine?: string;
	/** Body text after the heading/tag line, trimmed of surrounding blank lines. */
	body: string;
}

export function emptyMeta(): InboxMeta {
	return { status: [], flags: [], extra: {} };
}

/** Coerce a loosely-typed value (e.g. metadata restored from a notebook cell) into InboxMeta. */
export function normalizeMeta(raw: unknown): InboxMeta {
	const meta = emptyMeta();
	if (!raw || typeof raw !== 'object') {
		return meta;
	}
	const r = raw as Record<string, unknown>;
	if (typeof r.type === 'string' && CELL_TYPES.has(r.type)) {
		meta.type = r.type as CellType;
	}
	if (Array.isArray(r.status)) {
		meta.status = r.status.filter((s): s is string => typeof s === 'string');
	}
	if (Array.isArray(r.flags)) {
		meta.flags = r.flags.filter((s): s is string => typeof s === 'string');
	}
	if (typeof r.id === 'string') {
		meta.id = r.id;
	}
	if (typeof r.parent === 'string') {
		meta.parent = r.parent;
	}
	if (typeof r.created === 'string') {
		meta.created = r.created;
	}
	if (typeof r.updated === 'string') {
		meta.updated = r.updated;
	}
	if (r.extra && typeof r.extra === 'object') {
		for (const [k, v] of Object.entries(r.extra as Record<string, unknown>)) {
			if (typeof v === 'string') {
				meta.extra[k] = v;
			}
		}
	}
	return meta;
}

const META_RE = /^<!--\s*inbox:\s*(.*?)\s*-->\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const ANCHOR_RE = /\s+\^(\S+)\s*$/;
const FENCE_RE = /^\s*(`{3,}|~{3,})/;

/** A line made only of `#tag` tokens (no `# heading` — those need a space after the hashes). */
function isTagLine(line: string): boolean {
	const t = line.trim();
	if (t === '') {
		return false;
	}
	return t.split(/\s+/).every(tok => /^#[^\s#]+$/.test(tok));
}

function parseMeta(inner: string): InboxMeta {
	const meta = emptyMeta();
	for (const part of inner.split(';')) {
		const eq = part.indexOf('=');
		if (eq < 0) {
			continue;
		}
		const key = part.slice(0, eq).trim();
		const value = part.slice(eq + 1).trim();
		if (!key) {
			continue;
		}
		switch (key) {
			case 'type':
				if (CELL_TYPES.has(value)) {
					meta.type = value as CellType;
				} else {
					meta.extra[key] = value;
				}
				break;
			case 'status':
				meta.status = splitList(value);
				break;
			case 'flags':
				meta.flags = splitList(value);
				break;
			case 'id':
				meta.id = value;
				break;
			case 'parent':
				meta.parent = value;
				break;
			case 'created':
				meta.created = value;
				break;
			case 'updated':
				meta.updated = value;
				break;
			default:
				meta.extra[key] = value;
		}
	}
	return meta;
}

function splitList(value: string): string[] {
	return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

/** Serialize metadata to a `<!-- inbox: ... -->` line, or `null` when there's nothing to write. */
export function serializeMeta(meta: InboxMeta): string | null {
	const parts: string[] = [];
	if (meta.type) {
		parts.push(`type=${meta.type}`);
	}
	if (meta.status.length) {
		parts.push(`status=${meta.status.join(',')}`);
	}
	if (meta.flags.length) {
		parts.push(`flags=${meta.flags.join(',')}`);
	}
	if (meta.parent) {
		parts.push(`parent=${meta.parent}`);
	}
	if (meta.id) {
		parts.push(`id=${meta.id}`);
	}
	if (meta.created) {
		parts.push(`created=${meta.created}`);
	}
	if (meta.updated) {
		parts.push(`updated=${meta.updated}`);
	}
	for (const [k, v] of Object.entries(meta.extra)) {
		parts.push(`${k}=${v}`);
	}
	if (!parts.length) {
		return null;
	}
	return `<!-- inbox: ${parts.join('; ')} -->`;
}

function hasMeta(meta: InboxMeta): boolean {
	return !!(meta.type || meta.status.length || meta.flags.length || meta.id || meta.parent || meta.created || meta.updated || Object.keys(meta.extra).length);
}

/** Effective type, inferring `question` from a `?` in the heading when not stated explicitly. */
export function effectiveType(cell: InboxCell): CellType {
	if (cell.meta.type) {
		return cell.meta.type;
	}
	if (cell.meta.parent) {
		return 'answer';
	}
	if (cell.headingLevel > 0 && cell.headingText.includes('?')) {
		return 'question';
	}
	return 'note';
}

/** Parse an inbox markdown document into cells, split on headings. */
export function parseInbox(content: string): InboxCell[] {
	const lines = content.split(/\r?\n/g);

	// Pass 1: find cell-start line indices (each heading; a preceding inbox comment joins it).
	// Headings inside fenced code blocks (``` or ~~~) are ignored, so a `# comment` line in a
	// code block does not split the cell.
	const starts: number[] = [];
	let fenceChar: string | null = null;
	for (let i = 0; i < lines.length; i++) {
		const fence = lines[i].match(FENCE_RE);
		if (fenceChar) {
			if (fence && fence[1][0] === fenceChar) {
				fenceChar = null; // closing fence
			}
			continue; // never treat lines inside/closing a fence as headings
		} else if (fence) {
			fenceChar = fence[1][0]; // opening fence
			continue;
		}
		if (HEADING_RE.test(lines[i])) {
			const prev = i - 1;
			const start = prev >= 0 && META_RE.test(lines[prev]) ? prev : i;
			// Avoid double-counting a comment line already at a previous start.
			if (starts.length === 0 || starts[starts.length - 1] < start) {
				starts.push(start);
			}
		}
	}

	const cells: InboxCell[] = [];
	const firstStart = starts.length ? starts[0] : lines.length;

	// Preamble: content before the first heading (kept only if non-blank).
	const preamble = lines.slice(0, firstStart).join('\n').trim();
	if (preamble !== '') {
		cells.push({ meta: emptyMeta(), headingLevel: 0, headingText: '', body: preamble });
	}

	for (let s = 0; s < starts.length; s++) {
		const begin = starts[s];
		const end = s + 1 < starts.length ? starts[s + 1] : lines.length;
		cells.push(parseCell(lines.slice(begin, end)));
	}

	return cells;
}

function parseCell(block: string[]): InboxCell {
	let idx = 0;
	let meta = emptyMeta();

	const metaMatch = block[idx] !== undefined ? block[idx].match(META_RE) : null;
	if (metaMatch) {
		meta = parseMeta(metaMatch[1]);
		idx++;
	}

	const headingMatch = block[idx] !== undefined ? block[idx].match(HEADING_RE) : null;
	let headingLevel = 0;
	let headingText = '';
	let anchor: string | undefined;
	if (headingMatch) {
		headingLevel = headingMatch[1].length;
		let rest = headingMatch[2];
		const anchorMatch = rest.match(ANCHOR_RE);
		if (anchorMatch) {
			anchor = anchorMatch[1];
			rest = rest.slice(0, anchorMatch.index).trimEnd();
		}
		headingText = rest;
		idx++;
	}

	let tagLine: string | undefined;
	if (block[idx] !== undefined && isTagLine(block[idx])) {
		tagLine = block[idx].trim();
		idx++;
	}

	const body = block.slice(idx).join('\n').trim();

	return { meta, headingLevel, headingText, anchor, tagLine, body };
}

/** Serialize cells back to canonical inbox markdown (idempotent round-trip). */
export function serializeInbox(cells: InboxCell[]): string {
	const blocks = cells.map(serializeCell);
	return blocks.join('\n\n') + '\n';
}

function serializeCell(cell: InboxCell): string {
	const head: string[] = [];
	if (hasMeta(cell.meta)) {
		const metaLine = serializeMeta(cell.meta);
		if (metaLine) {
			head.push(metaLine);
		}
	}
	if (cell.headingLevel > 0) {
		const anchor = cell.anchor ? ` ^${cell.anchor}` : '';
		head.push(`${'#'.repeat(cell.headingLevel)} ${cell.headingText}${anchor}`);
	}
	if (cell.tagLine) {
		head.push(cell.tagLine);
	}

	const header = head.join('\n');
	if (cell.body === '') {
		return header;
	}
	return header === '' ? cell.body : `${header}\n\n${cell.body}`;
}

/**
 * The clean markdown shown in a notebook cell: just the heading and body. The `<!-- inbox -->`
 * comment, the `^anchor`, and the `#tag` line are all hidden from the view (they're carried in
 * notebook cell metadata and reattached on save). No trailing newline.
 */
export function renderCellValue(cell: InboxCell): string {
	const head: string[] = [];
	if (cell.headingLevel > 0) {
		head.push(`${'#'.repeat(cell.headingLevel)} ${cell.headingText}`);
	}
	const header = head.join('\n');
	if (cell.body === '') {
		return header;
	}
	return header === '' ? cell.body : `${header}\n\n${cell.body}`;
}

/** Hidden-from-view bits of a cell, stashed in metadata so they survive an edit round-trip. */
export interface PreservedCellBits {
	anchor?: string;
	tagLine?: string;
}

/**
 * Rebuild inbox cells from an edited notebook-cell value plus its metadata. Normally yields one
 * cell; if the user typed extra headings into a single cell, it splits — `meta` applies to the
 * first, the rest get empty metadata. `preserved` reattaches the hidden anchor/tag line unless
 * the user has typed their own into the cell text.
 */
export function cellsFromValue(value: string, meta: InboxMeta, preserved?: PreservedCellBits): InboxCell[] {
	const parsed = parseInbox(value);
	if (parsed.length === 0) {
		return [{ meta, headingLevel: 0, headingText: '', body: value.trim(), anchor: preserved?.anchor, tagLine: preserved?.tagLine }];
	}
	const first: InboxCell = { ...parsed[0], meta };
	if (preserved?.anchor && !first.anchor) {
		first.anchor = preserved.anchor;
	}
	if (preserved?.tagLine && !first.tagLine) {
		first.tagLine = preserved.tagLine;
	}
	parsed[0] = first;
	return parsed;
}

/**
 * Indices of a question cell and all cells belonging to it (answers whose `parent` is the
 * question id, plus contiguous deeper-heading cells with no explicit parent). Used to move a
 * question together with its answers.
 */
export function subtreeIndices(cells: InboxCell[], questionIndex: number): number[] {
	const question = cells[questionIndex];
	const indices = [questionIndex];
	const id = question.meta.id;
	for (let i = questionIndex + 1; i < cells.length; i++) {
		const cell = cells[i];
		const ownedByParent = id !== undefined && cell.meta.parent === id;
		const isDeeperChild = cell.headingLevel > question.headingLevel && !cell.meta.parent && effectiveType(cell) !== 'question';
		if (ownedByParent || isDeeperChild) {
			indices.push(i);
		} else {
			break;
		}
	}
	return indices;
}
