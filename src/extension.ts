/**
 * Markdown Mermaid Viewer - 拡張エントリポイント
 *
 * docs/MASTER.md および docs/02-design/ARCHITECTURE.md を参照。
 */

import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getDefaultConfig, loadMermaidConfig } from './configLoader';
import { runExportPipeline } from './exportPipeline';
import { checkExportDependencies } from './toolChecker';
import { getViewerHtml } from './viewerHtml';

/** Webview 用 CSP nonce のバイト数。 */
const NONCE_BYTES = 16;

/** 拡張全体で使用する OutputChannel。activate() で初期化される。 */
let outputChannel!: vscode.OutputChannel;

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

  // ワークスペースルートから Mermaid 設定を読み込む
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const mermaidConfig = workspaceFolder
    ? loadMermaidConfig(workspaceFolder.uri.fsPath, outputChannel)
    : getDefaultConfig();

  if (!workspaceFolder) {
    outputChannel.appendLine(
      '[Config] ワークスペースが開かれていないため、デフォルト設定を使用します。'
    );
  }

  outputChannel.appendLine(`[Viewer] Mermaid 設定: theme=${mermaidConfig.theme}`);

  const panel = vscode.window.createWebviewPanel(
    'markdownMermaidViewer',
    `${doc.fileName} - Viewer`,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );
  const nonce = getNonce();
  try {
    panel.webview.html = getViewerHtml(markdown, panel.webview.cspSource, nonce, mermaidConfig);
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`[Viewer] ${VIEWER_OPEN_ERROR_MESSAGE}`);
    outputChannel.appendLine(`  詳細: ${errorDetail}`);
    vscode.window.showErrorMessage(VIEWER_OPEN_ERROR_MESSAGE);
  }
}

/**
 * 「EPUB にエクスポート」コマンドを実行する（Phase 2）
 */
async function exportToEpub(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    vscode.window.showWarningMessage(
      'Markdown ファイルを開いてから「EPUB にエクスポート」を実行してください。'
    );
    return;
  }

  const depsAvailable = await checkExportDependencies(outputChannel);
  if (!depsAvailable) {
    return;
  }

  const doc = editor.document;
  const inputPath = doc.uri.fsPath;
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage('ワークスペースを開いてから実行してください。');
    return;
  }

  const parsedPath = path.parse(inputPath);
  const defaultOutputPath = path.join(parsedPath.dir, `${parsedPath.name}.epub`);

  const outputUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(defaultOutputPath),
    filters: { 'EPUB': ['epub'] },
  });

  if (!outputUri) {
    return;
  }

  const mermaidConfig = loadMermaidConfig(workspaceFolder.uri.fsPath, outputChannel);

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'EPUB にエクスポート中...',
        cancellable: false,
      },
      async () => {
        await runExportPipeline(
          {
            inputPath,
            outputPath: outputUri.fsPath,
            target: 'epub',
            mermaidConfig,
            workingDirectory: workspaceFolder.uri.fsPath,
          },
          outputChannel
        );
      }
    );
    vscode.window.showInformationMessage(`EPUB エクスポートが完了しました: ${outputUri.fsPath}`);
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`[Export] EPUB エクスポートに失敗しました。`);
    outputChannel.appendLine(`  詳細: ${errorDetail}`);
    vscode.window.showErrorMessage('EPUB エクスポートに失敗しました。詳細は Output パネルを確認してください。');
  }
}

/**
 * 「PDF にエクスポート」コマンドを実行する（Phase 2）
 */
async function exportToPdf(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    vscode.window.showWarningMessage(
      'Markdown ファイルを開いてから「PDF にエクスポート」を実行してください。'
    );
    return;
  }

  const depsAvailable = await checkExportDependencies(outputChannel);
  if (!depsAvailable) {
    return;
  }

  const doc = editor.document;
  const inputPath = doc.uri.fsPath;
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage('ワークスペースを開いてから実行してください。');
    return;
  }

  const parsedPath = path.parse(inputPath);
  const defaultOutputPath = path.join(parsedPath.dir, `${parsedPath.name}.pdf`);

  const outputUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(defaultOutputPath),
    filters: { 'PDF': ['pdf'] },
  });

  if (!outputUri) {
    return;
  }

  const mermaidConfig = loadMermaidConfig(workspaceFolder.uri.fsPath, outputChannel);

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'PDF にエクスポート中...',
        cancellable: false,
      },
      async () => {
        await runExportPipeline(
          {
            inputPath,
            outputPath: outputUri.fsPath,
            target: 'pdf',
            mermaidConfig,
            workingDirectory: workspaceFolder.uri.fsPath,
          },
          outputChannel
        );
      }
    );
    vscode.window.showInformationMessage(`PDF エクスポートが完了しました: ${outputUri.fsPath}`);
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`[Export] PDF エクスポートに失敗しました。`);
    outputChannel.appendLine(`  詳細: ${errorDetail}`);
    vscode.window.showErrorMessage('PDF エクスポートに失敗しました。詳細は Output パネルを確認してください。');
  }
}

/**
 * 拡張がアクティベートされたときに呼ばれる。
 * Phase 1: OutputChannel 初期化と Viewer コマンド登録。
 * Phase 2: エクスポートコマンド登録。
 * 設定読み込みは openViewer() 内で Viewer を開くたびに実行される。
 */
export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('Markdown Mermaid Viewer');
  outputChannel.appendLine('Markdown Mermaid Viewer が有効になりました。');

  context.subscriptions.push(outputChannel);
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownMermaidViewer.openViewer', openViewer)
  );

  // Phase 2: エクスポートコマンド
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownMermaidViewer.exportToEpub', exportToEpub)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownMermaidViewer.exportToPdf', exportToPdf)
  );
}

/**
 * 拡張が非アクティベートされるときに呼ばれる。
 */
export function deactivate(): void {
  // クリーンアップが必要な場合はここに記述する
}
