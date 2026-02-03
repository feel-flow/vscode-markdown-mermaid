/**
 * Mermaid 設定読み込みモジュール
 *
 * docs/03-implementation/PATTERNS.md の「ワークスペース設定の優先」パターンを実装。
 * .mermaid-config.json を読み込み、MermaidConfig を返す。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { DEFAULT_MERMAID_THEME, MERMAID_CONFIG_FILENAME } from './constants';
import type { MermaidConfig } from './types';

/** 有効な Mermaid テーマ名 */
const VALID_THEMES = ['default', 'neutral', 'dark', 'forest', 'base'] as const;

/** themeCSS で禁止するパターン（セキュリティ対策） */
const DANGEROUS_CSS_PATTERNS = [
  /url\s*\(/i,        // url() - 外部リソース読み込み防止
  /expression\s*\(/i, // expression() - IE の CSS 式
  /javascript:/i,     // javascript: スキーム
  /@import/i,         // @import - 外部 CSS 読み込み防止
] as const;

/**
 * デフォルトの Mermaid 設定を返す。
 */
export function getDefaultConfig(): MermaidConfig {
  return {
    theme: DEFAULT_MERMAID_THEME,
    startOnLoad: false,
  };
}

/**
 * 読み込んだ設定オブジェクトを検証し、不正な値を除外する。
 */
function validateConfig(
  config: Record<string, unknown>,
  outputChannel: vscode.OutputChannel
): Partial<MermaidConfig> {
  const validated: Partial<MermaidConfig> = {};

  // theme の検証
  if (config.theme !== undefined) {
    if (typeof config.theme === 'string' && VALID_THEMES.includes(config.theme as typeof VALID_THEMES[number])) {
      validated.theme = config.theme as MermaidConfig['theme'];
    } else {
      outputChannel.appendLine(
        `[Config] 警告: theme の値 "${String(config.theme)}" は無効です。有効な値: ${VALID_THEMES.join(', ')}`
      );
    }
  }

  // themeVariables の検証（オブジェクトであること）
  if (config.themeVariables !== undefined) {
    if (typeof config.themeVariables === 'object' && config.themeVariables !== null) {
      validated.themeVariables = config.themeVariables as MermaidConfig['themeVariables'];
    } else {
      outputChannel.appendLine('[Config] 警告: themeVariables はオブジェクトである必要があります。');
    }
  }

  // themeCSS の検証（セキュリティチェック付き）
  if (config.themeCSS !== undefined) {
    if (typeof config.themeCSS === 'string') {
      const hasDangerousPattern = DANGEROUS_CSS_PATTERNS.some((pattern) =>
        pattern.test(config.themeCSS as string)
      );
      if (hasDangerousPattern) {
        outputChannel.appendLine(
          '[Config] 警告: themeCSS に禁止パターン（url, expression, javascript, @import）が含まれています。この値は無視されます。'
        );
      } else {
        validated.themeCSS = config.themeCSS;
      }
    } else {
      outputChannel.appendLine('[Config] 警告: themeCSS は文字列である必要があります。');
    }
  }

  // startOnLoad の検証
  if (config.startOnLoad !== undefined) {
    if (typeof config.startOnLoad === 'boolean') {
      validated.startOnLoad = config.startOnLoad;
    }
  }

  return validated;
}

/**
 * ワークスペースルートから .mermaid-config.json を読み込む。
 *
 * @param workspaceRoot ワークスペースのルートパス
 * @param outputChannel ログ出力用の OutputChannel
 * @returns 読み込んだ設定（デフォルト値とマージ済み）。
 *          ファイル不在・読み込みエラー・パースエラー時はデフォルト設定を返す。
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
    const errorDetail = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(
      `[Config] ${MERMAID_CONFIG_FILENAME} の読み込みに失敗しました。デフォルト設定を使用します。`
    );
    outputChannel.appendLine(`  詳細: ${errorDetail}`);
    vscode.window.showWarningMessage(
      `${MERMAID_CONFIG_FILENAME} の読み込みに失敗しました。詳細は Output パネルを確認してください。`
    );
    return getDefaultConfig();
  }

  // JSON パース
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(
      `[Config] ${MERMAID_CONFIG_FILENAME} のパースに失敗しました。デフォルト設定を使用します。`
    );
    outputChannel.appendLine(`  詳細: ${errorDetail}`);
    vscode.window.showWarningMessage(
      `${MERMAID_CONFIG_FILENAME} の JSON 形式が不正です。詳細は Output パネルを確認してください。`
    );
    return getDefaultConfig();
  }

  // 型検証
  if (typeof parsed !== 'object' || parsed === null) {
    outputChannel.appendLine(
      `[Config] ${MERMAID_CONFIG_FILENAME} はオブジェクトである必要があります。デフォルト設定を使用します。`
    );
    vscode.window.showWarningMessage(
      `${MERMAID_CONFIG_FILENAME} の形式が不正です。オブジェクトである必要があります。`
    );
    return getDefaultConfig();
  }

  // 設定検証
  const validated = validateConfig(parsed as Record<string, unknown>, outputChannel);
  outputChannel.appendLine(`[Config] ${MERMAID_CONFIG_FILENAME} を読み込みました。`);

  return {
    ...getDefaultConfig(),
    ...validated,
  };
}
