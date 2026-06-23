/*---------------------------------------------------------------------------------------------
 *  View model for the Idea Inbox webview editor. Groups the flat InboxCell[] into question/note
 *  items each holding their answer cells, and flattens back. Framework-agnostic (no `vscode`).
 *--------------------------------------------------------------------------------------------*/

import { effectiveType, parseInbox, serializeInbox, type InboxCell } from './inbox.ts';

/** A top-level card (question or note) plus the answer cells nested under it. */
export interface ViewItem {
	cell: InboxCell;
	answers: InboxCell[];
}
export type View = ViewItem[];

/** Group a flat cell list: each non-answer cell starts an item; following answers attach to it. */
export function inboxToView(cells: InboxCell[]): View {
	const view: View = [];
	let current: ViewItem | null = null;
	for (const cell of cells) {
		if (current && effectiveType(cell) === 'answer') {
			current.answers.push(cell);
		} else {
			current = { cell, answers: [] };
			view.push(current);
		}
	}
	return view;
}

/**
 * Flatten the view back to a cell list, normalizing structure: any item with answers becomes a
 * question with a stable id, and each answer gets type=answer, parent=<that id>, and a deeper
 * heading level. Existing ids are preserved; missing ones are assigned without collisions.
 */
export function viewToInbox(view: View): InboxCell[] {
	const used = new Set<string>();
	for (const item of view) {
		if (item.cell.meta.id) {
			used.add(item.cell.meta.id);
		}
		for (const a of item.answers) {
			if (a.meta.id) {
				used.add(a.meta.id);
			}
		}
	}
	const mkId = (prefix: string): string => {
		let n = 1;
		while (used.has(`${prefix}${n}`)) {
			n++;
		}
		const id = `${prefix}${n}`;
		used.add(id);
		return id;
	};

	// Clone so normalization never mutates the caller's live model (the webview reuses its view).
	const clone = (c: InboxCell): InboxCell => ({
		...c,
		meta: { ...c.meta, status: [...c.meta.status], flags: [...c.meta.flags], extra: { ...c.meta.extra } },
	});

	const out: InboxCell[] = [];
	for (const item of view) {
		const q = clone(item.cell);
		if (item.answers.length > 0) {
			if (!q.meta.type) {
				q.meta.type = 'question';
			}
			if (!q.meta.id) {
				q.meta.id = mkId('q');
			}
		}
		out.push(q);
		for (const ans of item.answers) {
			const a = clone(ans);
			a.meta.type = 'answer';
			a.meta.parent = q.meta.id;
			if (!a.meta.id) {
				a.meta.id = mkId('a');
			}
			if (!a.headingLevel || a.headingLevel <= q.headingLevel) {
				a.headingLevel = (q.headingLevel || 2) + 1;
			}
			out.push(a);
		}
	}
	return out;
}

/** Parse markdown straight into the view model. */
export function parseView(content: string): View {
	return inboxToView(parseInbox(content));
}

/** Serialize the view model back to markdown. */
export function serializeView(view: View): string {
	return serializeInbox(viewToInbox(view));
}
