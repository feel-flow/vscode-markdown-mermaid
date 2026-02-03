/**
 * Mermaid 設定読み込みモジュール
 *
 * docs/03-implementation/PATTERNS.md の「ワークスペース設定の優先」パターンを実装。
 * .mermaid-config.json を読み込み、MermaidConfig を返す。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  DEFAULT_EPUB_FORMAT,
  DEFAULT_EXPORT_DPI,
  DEFAULT_EXPORT_WIDTH,
  DEFAULT_MERMAID_THEME,
  DEFAULT_PDF_FORMAT,
  MAX_EXPORT_DPI,
  MAX_EXPORT_WIDTH,
  MERMAID_CONFIG_FILENAME,
  MIN_EXPORT_DPI,
  MIN_EXPORT_WIDTH,
} from './constants';
import type { ExportOptions, MermaidConfig } from './types';

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
 * エクスポート設定のデフォルト値を返す。
 */
export function getDefaultExportOptions(): ExportOptions {
  return {
    dpi: DEFAULT_EXPORT_DPI,
    width: DEFAULT_EXPORT_WIDTH,
    epub: { format: DEFAULT_EPUB_FORMAT },
    pdf: { format: DEFAULT_PDF_FORMAT },
  };
}

/**
 * フォーマット設定（epub/pdf.format）を検証するヘルパー関数
 */
function validateFormat(
  formatOpts: unknown,
  target: 'epub' | 'pdf',
  outputChannel: vscode.OutputChannel
): { readonly format: 'png' | 'svg' } | undefined {
  if (formatOpts !== undefined && typeof formatOpts === 'object' && formatOpts !== null) {
    const formatContainer = formatOpts as Record<string, unknown>;
    if (formatContainer.format !== undefined) {
      if (formatContainer.format === 'png' || formatContainer.format === 'svg') {
        return { format: formatContainer.format };
      }
      outputChannel.appendLine(
        `[Config] 警告: export.${target}.format の値 "${String(formatContainer.format)}" は無効です。有効な値: png, svg`
      );
    }
  }
  return undefined;
}

/**
 * export フィールドの値を検証し、有効なフィールドのみを返す。
 * 無効な値（範囲外・型不一致）は警告を出力し、デフォルト値にフォールバックする。
 */
function validateExportOptions(
  exportOpts: unknown,
  outputChannel: vscode.OutputChannel
): Partial<ExportOptions> {
  if (typeof exportOpts !== 'object' || exportOpts === null) {
    return {};
  }

  const opts = exportOpts as Record<string, unknown>;
  // readonly プロパティを持つ ExportOptions を構築するため、一時的なオブジェクトとして扱う
  const validated: Record<string, unknown> = {};

  // DPI の検証
  if (opts.dpi !== undefined) {
    if (typeof opts.dpi === 'number' && opts.dpi >= MIN_EXPORT_DPI && opts.dpi <= MAX_EXPORT_DPI) {
      validated.dpi = opts.dpi;
    } else {
      outputChannel.appendLine(
        `[Config] 警告: export.dpi の値 "${String(opts.dpi)}" は無効です。有効範囲: ${MIN_EXPORT_DPI}-${MAX_EXPORT_DPI}`
      );
    }
  }

  // width の検証
  if (opts.width !== undefined) {
    if (typeof opts.width === 'number' && opts.width >= MIN_EXPORT_WIDTH && opts.width <= MAX_EXPORT_WIDTH) {
      validated.width = opts.width;
    } else {
      outputChannel.appendLine(
        `[Config] 警告: export.width の値 "${String(opts.width)}" は無効です。有効範囲: ${MIN_EXPORT_WIDTH}-${MAX_EXPORT_WIDTH}`
      );
    }
  }

  // epub.format の検証
  const epubFormat = validateFormat(opts.epub, 'epub', outputChannel);
  if (epubFormat) {
    validated.epub = epubFormat;
  }

  // pdf.format の検証
  const pdfFormat = validateFormat(opts.pdf, 'pdf', outputChannel);
  if (pdfFormat) {
    validated.pdf = pdfFormat;
  }

  return validated as Partial<ExportOptions>;
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

  // themeVariables の検証（オブジェクトであること + base テーマ時のみ有効）
  if (config.themeVariables !== undefined) {
    if (typeof config.themeVariables === 'object' && config.themeVariables !== null) {
      validated.themeVariables = config.themeVariables as MermaidConfig['themeVariables'];
      // base テーマ以外で themeVariables が指定されている場合は警告
      if (config.theme !== 'base') {
        outputChannel.appendLine(
          '[Config] 注意: themeVariables は theme: "base" のときのみ有効です。現在のテーマでは無視されます。'
        );
      }
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

  // export フィールドの検証
  if (config.export !== undefined) {
    const exportOpts = validateExportOptions(config.export, outputChannel);
    if (Object.keys(exportOpts).length > 0) {
      validated.export = exportOpts;
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
