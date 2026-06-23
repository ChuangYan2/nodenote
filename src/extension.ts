/*---------------------------------------------------------------------------------------------
 *  NodeNote — a webview custom editor for markdown files (status flags + question/answer cards).
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { NodeNoteEditorProvider } from './editor';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.window.registerCustomEditorProvider(
			NodeNoteEditorProvider.viewType,
			new NodeNoteEditorProvider(context),
			{
				webviewOptions: { retainContextWhenHidden: true },
				supportsMultipleEditorsPerDocument: false,
			}
		)
	);
}
