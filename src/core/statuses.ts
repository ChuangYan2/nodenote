/*---------------------------------------------------------------------------------------------
 *  Status taxonomy for the NodeNote. Framework-agnostic (no `vscode`): the `icon` strings use
 *  VS Code's `$(codicon)` syntax but are inert text elsewhere. Colors match the UI design.
 *  See feature/idea_inbox_spec.md §4.
 *--------------------------------------------------------------------------------------------*/

export interface StatusDef {
	/** Stored value, e.g. in `status=today`. */
	id: string;
	/** Human label shown in pickers. */
	label: string;
	/** Hex color used by the renderer / graph view. */
	color: string;
	/** VS Code codicon, e.g. `$(flame)`. */
	icon: string;
	/** Colored emoji used for the always-visible inline badge in a cell. */
	badge: string;
}

export const CORE_STATUSES: ReadonlyArray<StatusDef> = [
	{ id: 'important', label: 'important', color: '#D6453D', icon: '$(flame)', badge: '🔴' },
	{ id: 'today', label: 'today', color: '#E0951B', icon: '$(circle-filled)', badge: '🟠' },
	{ id: 'open', label: 'open question', color: '#2F6DB5', icon: '$(question)', badge: '🔵' },
	{ id: 'answered', label: 'answered', color: '#3F8A4E', icon: '$(check)', badge: '🟢' },
	{ id: 'parked', label: 'parked', color: '#8A7CA8', icon: '$(debug-pause)', badge: '🟣' },
];

export function statusIcon(id: string): string {
	const def = CORE_STATUSES.find(s => s.id === id);
	return def ? def.icon : '$(circle-filled)';
}

export function statusBadgeEmoji(id: string): string {
	const def = CORE_STATUSES.find(s => s.id === id);
	return def ? def.badge : '⚪';
}
