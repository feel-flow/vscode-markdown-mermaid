/**
 * Markdown Mermaid Viewer - 拡張エントリポイント
 *
 * docs/MASTER.md および docs/02-design/ARCHITECTURE.md を参照。
 */

import * as vscode from 'vscode';

/**
 * 拡張がアクティベートされたときに呼ばれる。
 * Phase 1: プレビュー連携と .mermaid-config.json 読み込みはここから実装する。
 */
export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('Markdown Mermaid Viewer');
  outputChannel.appendLine('Markdown Mermaid Viewer が有効になりました。');

  // 今後: Markdown プレビューへの Mermaid 描画注入、.mermaid-config.json の読み込みを登録する
  context.subscriptions.push(outputChannel);
}

/**
 * 拡張が非アクティベートされるときに呼ばれる。
 */
export function deactivate(): void {
  // クリーンアップが必要な場合はここに記述する
}
