/**
 * Mermaid 設定読み込みモジュール
 *
 * docs/03-implementation/PATTERNS.md の「ワークスペース設定の優先」パターンを実装。
 * .mermaid-config.json を読み込み、MermaidConfig を返す。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type * as vscode from 'vscode';
import { DEFAULT_MERMAID_THEME, MERMAID_CONFIG_FILENAME } from './constants';
import type { MermaidConfig } from './types';

/**
 * デフォルトの Mermaid 設定を返す。
 */
function getDefaultConfig(): MermaidConfig {
  return {
    theme: DEFAULT_MERMAID_THEME,
    startOnLoad: false,
  };
}

/**
 * ワークスペースルートから .mermaid-config.json を読み込む。
 *
 * @param workspaceRoot ワークスペースのルートパス
 * @param outputChannel ログ出力用の OutputChannel
 * @returns 読み込んだ設定、または失敗時はデフォルト設定
 */
export function loadMermaidConfig(
  workspaceRoot: string,
  outputChannel: vscode.OutputChannel
): MermaidConfig {
  const configPath = path.join(workspaceRoot, MERMAID_CONFIG_FILENAME);

  // ファイル存在チェック
  if (!fs.existsSync(configPath)) {
    // ファイル不在は正常ケース（デフォルト設定を使用）
    return getDefaultConfig();
  }

  // ファイル読み込み
  let content: string;
  try {
    content = fs.readFileSync(configPath, 'utf-8');
  } catch (err) {
    outputChannel.appendLine(
      `[Config] ${MERMAID_CONFIG_FILENAME} の読み込みに失敗しました。デフォルト設定を使用します。`
    );
    if (err instanceof Error) {
      outputChannel.appendLine(`  詳細: ${err.message}`);
    }
    return getDefaultConfig();
  }

  // JSON パース
  try {
    const parsed = JSON.parse(content) as MermaidConfig;
    outputChannel.appendLine(`[Config] ${MERMAID_CONFIG_FILENAME} を読み込みました。`);
    return {
      ...getDefaultConfig(),
      ...parsed,
    };
  } catch (err) {
    outputChannel.appendLine(
      `[Config] ${MERMAID_CONFIG_FILENAME} のパースに失敗しました。デフォルト設定を使用します。`
    );
    if (err instanceof Error) {
      outputChannel.appendLine(`  詳細: ${err.message}`);
    }
    return getDefaultConfig();
  }
}
