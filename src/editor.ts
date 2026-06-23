/*---------------------------------------------------------------------------------------------
 *  NodeNote custom editor: a webview-backed editor for markdown files. The document text is the
 *  source of truth; the webview shows the view model (parseView) and posts edits back, which are
 *  serialized (serializeView) and written to the document with a minimal scoped edit.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { parseView, serializeView, type View } from './core/view';
import { minimalEdit } from './core/textedit';

export class NodeNoteEditorProvider implements vscode.CustomTextEditorProvider {
	public static readonly viewType = 'nodenote.editor';

	constructor(private readonly context: vscode.ExtensionContext) {}

	async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		const webview = webviewPanel.webview;
		// The document's own folder is a resource root so locally-saved images (assets/…) can load.
		const folder = vscode.Uri.joinPath(document.uri, '..');
		webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media'), folder],
		};
		webview.html = await this.getHtml(webview);
		// Webview-safe base for the document folder, so relative image paths resolve.
		const base = webview.asWebviewUri(folder).toString().replace(/\/?$/, '/');

		// Number of edits we've applied but not yet seen echo back, so we can tell our own change
		// events from genuinely external ones (robust to whitespace/EOL normalization differences).
		let pendingWrites = 0;

		const title = document.uri.path.split('/').pop() || 'Untitled';
		const pushToWebview = () => webview.postMessage({ type: 'load', title, base, view: parseView(document.getText()) });

		const writeDocument = async (markdown: string): Promise<void> => {
			const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
			const next = eol === '\n' ? markdown : markdown.replace(/\n/g, '\r\n');
			const current = document.getText();
			if (next === current) {
				return;
			}
			const { start, end, replacement } = minimalEdit(current, next);
			const edit = new vscode.WorkspaceEdit();
			edit.replace(document.uri, new vscode.Range(document.positionAt(start), document.positionAt(end)), replacement);
			pendingWrites++;
			await vscode.workspace.applyEdit(edit);
		};

		const messageSub = webview.onDidReceiveMessage(async (msg: { type: string; view?: View; mime?: string; dataBase64?: string; target?: string }) => {
			if (msg.type === 'ready') {
				pushToWebview();
				return;
			}
			if (msg.type === 'edit' && msg.view) {
				webview.postMessage({ type: 'saving' });
				await writeDocument(serializeView(msg.view));
				webview.postMessage({ type: 'saved' });
				return;
			}
			if (msg.type === 'saveImage' && msg.dataBase64) {
				const path = await saveImage(folder, msg.mime || 'image/png', msg.dataBase64);
				if (path) {
					webview.postMessage({ type: 'imageSaved', target: msg.target, path });
				}
			}
		});

		const changeSub = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() !== document.uri.toString() || e.contentChanges.length === 0) {
				return;
			}
			if (pendingWrites > 0) {
				pendingWrites--; // our own edit echoing back — don't reload (keeps caret/scroll)
				return;
			}
			pushToWebview(); // genuine external change (git, format-on-save, raw text edit)
		});

		webviewPanel.onDidDispose(() => {
			messageSub.dispose();
			changeSub.dispose();
		});
	}

	private async getHtml(webview: vscode.Webview): Promise<string> {
		const uri = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'editor.html');
		const bytes = await vscode.workspace.fs.readFile(uri);
		const html = new TextDecoder().decode(bytes);
		return html
			.replace(/{{cspSource}}/g, webview.cspSource)
			.replace(/{{nonce}}/g, getNonce());
	}
}

const IMG_EXT: Record<string, string> = {
	'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif',
	'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp',
};

/** Write a pasted image into an `assets/` folder next to the document; returns the relative path. */
async function saveImage(folder: vscode.Uri, mime: string, base64: string): Promise<string | null> {
	try {
		const assets = vscode.Uri.joinPath(folder, 'assets');
		try { await vscode.workspace.fs.createDirectory(assets); } catch { /* already exists */ }
		const ext = IMG_EXT[mime] || 'png';
		const name = `img-${Date.now()}.${ext}`;
		const bytes = Uint8Array.from(Buffer.from(base64, 'base64'));
		await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(assets, name), bytes);
		return `assets/${name}`;
	} catch {
		return null;
	}
}

function getNonce(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let text = '';
	for (let i = 0; i < 32; i++) {
		text += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return text;
}
