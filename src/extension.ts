/*---------------------------------------------------------------------------------------------
 *  Idea Inbox — a webview custom editor for markdown files (status flags + question/answer cards).
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IdeaInboxEditorProvider } from './editor';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.window.registerCustomEditorProvider(
			IdeaInboxEditorProvider.viewType,
			new IdeaInboxEditorProvider(context),
			{
				webviewOptions: { retainContextWhenHidden: true },
				supportsMultipleEditorsPerDocument: false,
			}
		)
	);
}
