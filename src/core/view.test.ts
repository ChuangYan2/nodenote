/*---------------------------------------------------------------------------------------------
 *  Tests for the view model. Run: node --experimental-strip-types --test src/core/*.test.ts
 *--------------------------------------------------------------------------------------------*/

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { emptyMeta, type InboxCell } from './inbox.ts';
import { inboxToView, viewToInbox, parseView, serializeView } from './view.ts';

const SAMPLE = `<!-- inbox: type=question; status=today,important; id=q1 -->
## ❓ How does FMCW range resolution depend on chirp bandwidth? ^q1

Body.

<!-- inbox: type=answer; parent=q1; id=a1 -->
### 💡 Answer — bandwidth ^a1

Δr = c / (2·B).

<!-- inbox: type=answer; parent=q1; id=a2 -->
### 💡 Answer — ADC limit ^a2

Capped by ADC rate.

<!-- inbox: type=note -->
## A plain note

Just a note.
`;

test('groups questions with their answers', () => {
	const view = parseView(SAMPLE);
	assert.equal(view.length, 2);                 // question + note
	assert.equal(view[0].answers.length, 2);      // two answers under the question
	assert.equal(view[1].answers.length, 0);      // note has none
	assert.equal(view[0].cell.meta.id, 'q1');
});

test('view round-trips back to identical markdown', () => {
	assert.equal(serializeView(parseView(SAMPLE)), SAMPLE);
});

test('adding an answer to an id-less question assigns id, parent, type, level', () => {
	const view = parseView(`## Why is the sky blue?\n\nbody\n`);
	const answer: InboxCell = { meta: emptyMeta(), headingLevel: 2, headingText: 'Because Rayleigh', body: 'scattering' };
	view[0].answers.push(answer);
	const cells = viewToInbox(view);
	assert.equal(cells.length, 2);
	assert.equal(cells[0].meta.type, 'question');
	assert.ok(cells[0].meta.id);                       // got an id
	assert.equal(cells[1].meta.type, 'answer');
	assert.equal(cells[1].meta.parent, cells[0].meta.id);
	assert.equal(cells[1].headingLevel, 3);            // deeper than the question
});

test('assigned ids do not collide with existing ones', () => {
	const md = `<!-- inbox: type=question; id=q2 -->\n## First? ^q2\n\nb\n`;
	const view = parseView(md);
	view[0].answers.push({ meta: emptyMeta(), headingLevel: 3, headingText: 'a', body: '' });
	// add a brand-new question with answers, no id yet
	view.push({ cell: { meta: emptyMeta(), headingLevel: 2, headingText: 'Second?', body: '' },
		answers: [{ meta: emptyMeta(), headingLevel: 3, headingText: 'a', body: '' }] });
	const cells = viewToInbox(view);
	const ids = cells.map(c => c.meta.id).filter(Boolean);
	assert.equal(new Set(ids).size, ids.length);       // all unique
	assert.ok(ids.includes('q2'));                     // preserved
});

test('viewToInbox does not mutate the input view model', () => {
	const view = parseView(`## Why?\n\nbody\n`);
	view[0].answers.push({ meta: emptyMeta(), headingLevel: 2, headingText: 'A', body: '' });
	const before = JSON.stringify(view);
	viewToInbox(view);
	assert.equal(JSON.stringify(view), before); // unchanged: no id/parent/level mutation leaked back
});

test('a note with no answers stays a note (no forced id)', () => {
	const cells = viewToInbox(parseView(`## Meeting notes\n\nbody\n`));
	assert.equal(cells.length, 1);
	assert.equal(cells[0].meta.id, undefined);
	assert.equal(cells[0].meta.type, undefined);
});
