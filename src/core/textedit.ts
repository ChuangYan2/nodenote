/*---------------------------------------------------------------------------------------------
 *  Minimal text-edit helper (framework-agnostic). Used by the editor provider to write the
 *  smallest possible document change, so undo stays per-change and writes stay tiny.
 *--------------------------------------------------------------------------------------------*/

/**
 * Smallest single-range replacement turning `oldText` into `newText`: trims the common prefix and
 * suffix and replaces only the differing middle. Returns character offsets into `oldText`.
 */
export function minimalEdit(oldText: string, newText: string): { start: number; end: number; replacement: string } {
	let start = 0;
	const min = Math.min(oldText.length, newText.length);
	while (start < min && oldText.charCodeAt(start) === newText.charCodeAt(start)) {
		start++;
	}
	let endOld = oldText.length;
	let endNew = newText.length;
	while (endOld > start && endNew > start && oldText.charCodeAt(endOld - 1) === newText.charCodeAt(endNew - 1)) {
		endOld--;
		endNew--;
	}
	return { start, end: endOld, replacement: newText.slice(start, endNew) };
}
