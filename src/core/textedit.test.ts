import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { minimalEdit } from './textedit.ts';

const apply = (s: string, e: { start: number; end: number; replacement: string }) =>
	s.slice(0, e.start) + e.replacement + s.slice(e.end);

test('produces an edit that reconstructs the new text', () => {
	const a = 'line1\nline2\nline3\n';
	const b = 'line1\nLINE-TWO\nline3\n';
	const e = minimalEdit(a, b);
	assert.equal(apply(a, e), b);
});

test('touches only the changed middle (tiny replacement)', () => {
	const a = 'the quick brown fox';
	const b = 'the slow brown fox';
	const e = minimalEdit(a, b);
	assert.equal(e.replacement, 'slow');
	assert.equal(a.slice(e.start, e.end), 'quick');
});

test('identical text yields an empty no-op edit', () => {
	const e = minimalEdit('same', 'same');
	assert.equal(e.start, e.end);
	assert.equal(e.replacement, '');
});

test('pure insertion at the end', () => {
	const a = 'abc';
	const e = minimalEdit(a, 'abcdef');
	assert.equal(apply(a, e), 'abcdef');
	assert.equal(e.replacement, 'def');
});

test('pure deletion from the front', () => {
	const a = 'xxabc';
	const e = minimalEdit(a, 'abc');
	assert.equal(apply(a, e), 'abc');
	assert.equal(e.start, 0);
});
