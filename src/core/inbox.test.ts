/*---------------------------------------------------------------------------------------------
 *  Tests for the NodeNote core. Run with Node's built-in runner (no vscode, no deps):
 *    node --experimental-strip-types --test src/core/inbox.test.ts
 *--------------------------------------------------------------------------------------------*/

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
	parseInbox,
	serializeInbox,
	effectiveType,
	serializeMeta,
	subtreeIndices,
	renderCellValue,
	cellsFromValue,
	normalizeMeta,
} from './inbox.ts';

const SAMPLE = `<!-- inbox: type=question; status=today,important; flags=open; id=q1 -->
## ❓ How does FMCW range resolution depend on chirp bandwidth? ^q1
#today #important #q/open

Want the clean derivation plus the practical limit set by our ADC sample rate.

<!-- inbox: type=answer; parent=q1; id=a1 -->
### 💡 Answer — bandwidth ^a1

Range resolution \`Δr = c / (2·B)\` — independent of chirp time.

<!-- inbox: type=answer; parent=q1; id=a2 -->
### 💡 Answer — ADC limit ^a2

In practice capped by ADC sample rate / max beat frequency.
`;

test('parses cell count and structure', () => {
	const cells = parseInbox(SAMPLE);
	assert.equal(cells.length, 3);
	assert.equal(cells[0].headingLevel, 2);
	assert.equal(cells[0].anchor, 'q1');
	assert.equal(cells[1].headingLevel, 3);
});

test('parses metadata fields', () => {
	const [q, a1] = parseInbox(SAMPLE);
	assert.equal(q.meta.type, 'question');
	assert.deepEqual(q.meta.status, ['today', 'important']);
	assert.deepEqual(q.meta.flags, ['open']);
	assert.equal(q.meta.id, 'q1');
	assert.equal(a1.meta.type, 'answer');
	assert.equal(a1.meta.parent, 'q1');
});

test('strips anchor from heading text', () => {
	const [q] = parseInbox(SAMPLE);
	assert.ok(!q.headingText.includes('^q1'));
	assert.ok(q.headingText.startsWith('❓'));
});

test('captures tag line and body separately', () => {
	const [q] = parseInbox(SAMPLE);
	assert.equal(q.tagLine, '#today #important #q/open');
	assert.ok(q.body.startsWith('Want the clean derivation'));
	assert.ok(!q.body.includes('#today'));
});

test('round-trips canonical form losslessly', () => {
	assert.equal(serializeInbox(parseInbox(SAMPLE)), SAMPLE);
});

test('serialize is idempotent', () => {
	const once = serializeInbox(parseInbox(SAMPLE));
	const twice = serializeInbox(parseInbox(once));
	assert.equal(once, twice);
});

test('round-trips created/updated timestamps', () => {
	const md = `<!-- inbox: type=question; id=q1; created=2026-06-22T14:03Z; updated=2026-06-22T15:10Z -->\n## Why? ^q1\n\nbody\n`;
	const [cell] = parseInbox(md);
	assert.equal(cell.meta.created, '2026-06-22T14:03Z');
	assert.equal(cell.meta.updated, '2026-06-22T15:10Z');
	assert.equal(serializeInbox([cell]), md);
});

test('preserves unknown metadata keys', () => {
	// Known keys serialize before unknown ones (canonical order), value preserved.
	const md = `<!-- inbox: type=note; color=#ff0000; id=n1 -->\n## A note ^n1\n\nbody\n`;
	const canonical = `<!-- inbox: type=note; id=n1; color=#ff0000 -->\n## A note ^n1\n\nbody\n`;
	const [cell] = parseInbox(md);
	assert.equal(cell.meta.extra.color, '#ff0000');
	assert.equal(serializeInbox([cell]), canonical);
});

test('does not split on "#" lines inside fenced code blocks', () => {
	const md = [
		'## How do I list files? ^q1',
		'',
		'```bash',
		'# a shell comment, not a heading',
		'ls -la',
		'```',
		'',
		'Some trailing prose.',
		'',
		'## Next question ^q2',
		'',
	].join('\n');
	const cells = parseInbox(md);
	assert.equal(cells.length, 2);
	assert.ok(cells[0].body.includes('# a shell comment'));
	assert.ok(cells[0].body.includes('Some trailing prose.'));
	assert.equal(cells[1].headingText, 'Next question');
});

test('round-trips a cell containing a fenced code block', () => {
	const md = '## Title ^q1\n\n```python\n# comment\nprint(1)\n```\n';
	assert.equal(serializeInbox(parseInbox(md)), md);
});

test('keeps preamble before the first heading', () => {
	const md = `Some intro text.\n\n## Heading\n\nbody\n`;
	const cells = parseInbox(md);
	assert.equal(cells.length, 2);
	assert.equal(cells[0].headingLevel, 0);
	assert.equal(cells[0].body, 'Some intro text.');
});

test('effectiveType infers question from "?" heading', () => {
	const [cell] = parseInbox(`## Why is the sky blue?\n\nbody\n`);
	assert.equal(effectiveType(cell), 'question');
});

test('effectiveType infers note for plain heading', () => {
	const [cell] = parseInbox(`## Meeting notes\n\nbody\n`);
	assert.equal(effectiveType(cell), 'note');
});

test('effectiveType infers answer from parent', () => {
	const [cell] = parseInbox(`<!-- inbox: parent=q1 -->\n### Some answer\n\nbody\n`);
	assert.equal(effectiveType(cell), 'answer');
});

test('serializeMeta returns null for empty meta', () => {
	assert.equal(serializeMeta({ status: [], flags: [], extra: {} }), null);
});

test('normalizeMeta coerces loose/partial metadata and drops junk', () => {
	const meta = normalizeMeta({ type: 'answer', status: ['today', 7], flags: 'nope', parent: 'q1', extra: { color: '#abc', n: 5 } });
	assert.equal(meta.type, 'answer');
	assert.deepEqual(meta.status, ['today']);
	assert.deepEqual(meta.flags, []);
	assert.equal(meta.parent, 'q1');
	assert.deepEqual(meta.extra, { color: '#abc' });
});

test('normalizeMeta on undefined yields empty meta', () => {
	assert.deepEqual(normalizeMeta(undefined), { status: [], flags: [], extra: {} });
});

test('subtreeIndices groups a question with its parent-linked answers', () => {
	const cells = parseInbox(SAMPLE);
	assert.deepEqual(subtreeIndices(cells, 0), [0, 1, 2]);
});

test('renderCellValue keeps heading + body but hides comment, anchor, and tags', () => {
	const [q] = parseInbox(SAMPLE);
	const value = renderCellValue(q);
	assert.ok(!value.includes('<!-- inbox'));
	assert.ok(value.startsWith('## ❓'));
	assert.ok(!value.includes('^q1'));                 // anchor hidden
	assert.ok(!value.includes('#today'));              // tag line hidden
	assert.ok(value.includes('Want the clean derivation'));
	assert.ok(!value.endsWith('\n'));
});

test('cellsFromValue reattaches preserved anchor + tag line on save', () => {
	const [q] = parseInbox(SAMPLE);
	const rebuilt = cellsFromValue(renderCellValue(q), q.meta, { anchor: q.anchor, tagLine: q.tagLine });
	assert.equal(rebuilt.length, 1);
	assert.equal(serializeInbox(rebuilt), serializeInbox([q]));
});

test('user-typed anchor/tags in the cell text win over preserved bits', () => {
	const value = '## New title ^mine\n#custom\n\nbody';
	const [cell] = cellsFromValue(value, { status: [], flags: [], extra: {} }, { anchor: 'old', tagLine: '#old' });
	assert.equal(cell.anchor, 'mine');
	assert.equal(cell.tagLine, '#custom');
});

test('cellsFromValue applies metadata to a value with no heading', () => {
	const cells = cellsFromValue('just a note body', { status: ['parked'], flags: [], extra: {} });
	assert.equal(cells.length, 1);
	assert.equal(cells[0].headingLevel, 0);
	assert.deepEqual(cells[0].meta.status, ['parked']);
});

test('subtreeIndices stops at the next question', () => {
	const md = [
		'<!-- inbox: type=question; id=q1 -->',
		'## First? ^q1',
		'',
		'<!-- inbox: type=answer; parent=q1; id=a1 -->',
		'### ans ^a1',
		'',
		'<!-- inbox: type=question; id=q2 -->',
		'## Second? ^q2',
		'',
	].join('\n');
	const cells = parseInbox(md);
	assert.deepEqual(subtreeIndices(cells, 0), [0, 1]);
});
