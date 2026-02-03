/**
 * Markdown Mermaid Viewer - 拡張エントリポイント
 *
 * docs/MASTER.md および docs/02-design/ARCHITECTURE.md を参照。
 */

import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { configCache } from './configCache';
import { getDefaultConfig, getFileTimestamp, loadMermaidConfigAsync } from './configLoader';
import { MERMAID_CONFIG_FILENAME } from './constants';
import { runExportPipeline } from './exportPipeline';
import { checkExportDependencies } from './toolChecker';
import { getViewerHtml } from './viewerHtml';
import type { MermaidConfig } from './types';

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
 * キャッシュを利用して Mermaid 設定を読み込む（Phase 3 追加）。
 *
 * キャッシュヒット時はキャッシュから返す。ミス時は非同期で読み込み、キャッシュに保存する。
 *
 * @param workspaceRoot ワークスペースのルートパス
 * @returns Mermaid 設定
 */
async function loadConfigWithCache(workspaceRoot: string): Promise<MermaidConfig> {
  // キャッシュチェック
  const cachedConfig = configCache.get(workspaceRoot);
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  // キャッシュミス: 非同期で読み込む
  const config = await loadMermaidConfigAsync(workspaceRoot, outputChannel);
  const configPath = path.join(workspaceRoot, MERMAID_CONFIG_FILENAME);
  const timestamp = await getFileTimestamp(configPath);

  // キャッシュに保存
  configCache.set(workspaceRoot, config, timestamp);

  return config;
}

/**
 * 「Viewer を開く」コマンドを実行する。
 * アクティブな .md の内容を Webview で Markdown + Mermaid として表示する。
 */
async function openViewer(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    vscode.window.showWarningMessage(
      'Markdown ファイルを開いてから「Viewer を開く」を実行してください。'
    );
    return;
  }
  const doc = editor.document;
  const markdown = doc.getText();

  // ワークスペースルートから Mermaid 設定を読み込む（Phase 3: キャッシング対応）
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  let mermaidConfig: MermaidConfig;

  if (workspaceFolder) {
    mermaidConfig = await loadConfigWithCache(workspaceFolder.uri.fsPath);
  } else {
    mermaidConfig = getDefaultConfig();
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
 * ドキュメントをエクスポートする共通関数
 */
async function exportDocument(target: 'epub' | 'pdf'): Promise<void> {
  const formatLabel = target.toUpperCase();
  const extension = target;

  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    vscode.window.showWarningMessage(
      `Markdown ファイルを開いてから「${formatLabel} にエクスポート」を実行してください。`
    );
    return;
  }

  const depsAvailable = await checkExportDependencies(outputChannel);
  if (!depsAvailable) {
    outputChannel.appendLine(`[Export] ${formatLabel} エクスポートを中止しました: 依存ツールが不足しています`);
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
  const defaultOutputPath = path.join(parsedPath.dir, `${parsedPath.name}.${extension}`);

  const outputUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(defaultOutputPath),
    filters: { [formatLabel]: [extension] },
  });

  if (!outputUri) {
    return;
  }

  // Phase 3: キャッシング対応
  const mermaidConfig = await loadConfigWithCache(workspaceFolder.uri.fsPath);

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `${formatLabel} にエクスポート中...`,
        cancellable: false,
      },
      async () => {
        await runExportPipeline(
          {
            inputPath,
            outputPath: outputUri.fsPath,
            target,
            mermaidConfig,
            workingDirectory: workspaceFolder.uri.fsPath,
          },
          outputChannel
        );
      }
    );
    vscode.window.showInformationMessage(`${formatLabel} エクスポートが完了しました: ${outputUri.fsPath}`);
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`[Export] ${formatLabel} エクスポートに失敗しました。`);
    outputChannel.appendLine(`  詳細: ${errorDetail}`);
    vscode.window.showErrorMessage(`${formatLabel} エクスポートに失敗しました。詳細は Output パネルを確認してください。`);
  }
}

/**
 * 「EPUB にエクスポート」コマンドを実行する
 */
async function exportToEpub(): Promise<void> {
  return exportDocument('epub');
}

/**
 * 「PDF にエクスポート」コマンドを実行する
 */
async function exportToPdf(): Promise<void> {
  return exportDocument('pdf');
}

/**
 * 拡張がアクティベートされたときに呼ばれる。
 * OutputChannel 初期化、Viewer コマンド登録、エクスポートコマンド登録。
 * Phase 3: 設定キャッシュの初期化とワークスペース監視を追加。
 */
export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel('Markdown Mermaid Viewer');
  outputChannel.appendLine('Markdown Mermaid Viewer が有効になりました。');

  // Phase 3: キャッシュに OutputChannel を設定
  configCache.setOutputChannel(outputChannel);

  context.subscriptions.push(outputChannel);

  // Phase 3: キャッシュの破棄を subscriptions に追加
  context.subscriptions.push({
    dispose: () => {
      configCache.dispose();
    },
  });

  // Phase 3: ワークスペースフォルダーの変更を監視し、キャッシュをクリア
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      outputChannel.appendLine('[Config] ワークスペースが変更されました。キャッシュをクリアします。');
      configCache.clear();
    })
  );

  // Phase 3: VS Code 設定の変更を監視し、キャッシュをクリア
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('markdownMermaidViewer')) {
        outputChannel.appendLine(
          '[Config] VS Code 設定が変更されました。キャッシュをクリアします。'
        );
        configCache.clear();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('markdownMermaidViewer.openViewer', openViewer)
  );

  // エクスポートコマンド
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
