/**
 * Markdown Mermaid Viewer - 拡張エントリポイント
 *
 * docs/MASTER.md および docs/02-design/ARCHITECTURE.md を参照。
 */

import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import { getViewerHtml } from './viewerHtml';

/** Webview 用 CSP nonce のバイト数。 */
const NONCE_BYTES = 16;

/**
 * Webview 用の nonce を生成する（CSP 用）。
 */
function getNonce(): string {
  return crypto.randomBytes(NONCE_BYTES).toString('base64');
}

/** Viewer の HTML 生成に失敗したときにユーザーに表示するメッセージ。 */
const VIEWER_OPEN_ERROR_MESSAGE = 'Viewer の表示に失敗しました。';

/**
 * 「Viewer を開く」コマンドを実行する。
 * アクティブな .md の内容を Webview で Markdown + Mermaid として表示する。
 */
function openViewer(): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    vscode.window.showWarningMessage(
      'Markdown ファイルを開いてから「Viewer を開く」を実行してください。'
    );
    return;
  }
  const doc = editor.document;
  const markdown = doc.getText();
  const panel = vscode.window.createWebviewPanel(
    'markdownMermaidViewer',
    `${doc.fileName} - Viewer`,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );
  const nonce = getNonce();
  try {
    panel.webview.html = getViewerHtml(markdown, panel.webview.cspSource, nonce);
  } catch (err) {
    const outputChannel = vscode.window.createOutputChannel('Markdown Mermaid Viewer');
    outputChannel.appendLine(`[Viewer] ${VIEWER_OPEN_ERROR_MESSAGE}`);
    if (err instanceof Error) {
      outputChannel.appendLine(err.message);
    }
    vscode.window.showErrorMessage(VIEWER_OPEN_ERROR_MESSAGE);
  }
}

/**
 * 拡張がアクティベートされたときに呼ばれる。
 * Phase 1: Viewer コマンド登録。.mermaid-config.json 読み込みは #5/#6 で実装する。
 */
export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('Markdown Mermaid Viewer');
  outputChannel.appendLine('Markdown Mermaid Viewer が有効になりました。');

  context.subscriptions.push(outputChannel);
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownMermaidViewer.openViewer', openViewer)
  );
}

/**
 * 拡張が非アクティベートされるときに呼ばれる。
 */
export function deactivate(): void {
  // クリーンアップが必要な場合はここに記述する
}
