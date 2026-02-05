/**
 * Mermaid 設定読み込みモジュール
 *
 * docs/03-implementation/PATTERNS.md の「ワークスペース設定の優先」パターンを実装。
 * .mermaid-config.json を読み込み、MermaidConfig を返す。
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
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
import { formatValidationResult, validateCss } from './kindleChecker/cssValidator';
import type { ExportOptions, MermaidConfig } from './types';

/**
 * 設定読み込みの結果を表す型（Phase 3 追加）
 *
 * success: true の場合、設定の読み込みに成功（ファイル不在を含む）
 * success: false の場合、エラーが発生（権限エラー、パースエラーなど）
 */
export type ConfigLoadResult =
  | { success: true; config: MermaidConfig; timestamp: number }
  | { success: false; config: MermaidConfig; error: string };

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

  // themeCSS の検証（セキュリティチェック + Kindle 互換性チェック）
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
        // Kindle CSS 互換性チェック（Phase 3 追加）
        // VS Code 設定から読み取る
        const vscodeConfig = vscode.workspace.getConfiguration('markdownMermaidViewer');
        const enableKindleCssChecker = vscodeConfig.get<boolean>('enableKindleCssChecker', true);
        const autoDisableOnCritical = vscodeConfig.get<boolean>('autoDisableThemeCssOnCritical', false);

        // フラグ変数でロジックをシンプル化
        let disableThemeCss = false;

        if (enableKindleCssChecker) {
          try {
            const validationResult = validateCss(config.themeCSS);
            if (validationResult.issues.length > 0) {
              outputChannel.appendLine('[Kindle CSS] themeCSS の互換性チェック結果:');
              outputChannel.appendLine(formatValidationResult(validationResult));
            }

            // Critical な問題がある場合の処理
            if (!validationResult.isValid) {
              if (autoDisableOnCritical) {
                outputChannel.appendLine(
                  '[Kindle CSS] Critical な問題が検出されたため、themeCSS を無効化しました。'
                );
                vscode.window.showWarningMessage(
                  `Kindle CSS チェック: Critical な問題が ${validationResult.criticalCount} 件検出されたため、themeCSS を無効化しました。詳細は Output パネルを確認してください。`
                );
                disableThemeCss = true;
              } else {
                outputChannel.appendLine(
                  '[Kindle CSS] Critical な問題がありますが、themeCSS は有効なままです。'
                );
              }
            }
          } catch (err) {
            // CSS 検証中に予期しないエラーが発生した場合
            const errorDetail = err instanceof Error ? err.message : String(err);
            outputChannel.appendLine(
              `[Kindle CSS] CSS 検証中に予期しないエラーが発生しました: ${errorDetail}`
            );
            outputChannel.appendLine('[Kindle CSS] themeCSS は検証をスキップして適用されます。');
          }
        }

        // themeCSS を無効化しない場合のみ設定
        if (!disableThemeCss) {
          validated.themeCSS = config.themeCSS;
        }
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

/**
 * ワークスペースルートから .mermaid-config.json を非同期で読み込む（Phase 3 追加）。
 *
 * キャッシングと組み合わせて使用することで、設定読み込みを高速化する。
 * 実装は同期版 loadMermaidConfig() と同じロジックを使用。
 *
 * Phase 3 修正: Result 型を返すように変更。エラー時は success: false を返し、
 * キャッシュに保存されないようにする。
 *
 * @param workspaceRoot ワークスペースのルートパス
 * @param outputChannel ログ出力用の OutputChannel
 * @returns 設定読み込みの結果。success: true の場合は成功、false の場合はエラー。
 */
export async function loadMermaidConfigAsync(
  workspaceRoot: string,
  outputChannel: vscode.OutputChannel
): Promise<ConfigLoadResult> {
  const configPath = path.join(workspaceRoot, MERMAID_CONFIG_FILENAME);

  // ファイル存在チェック（非同期）
  try {
    await fsPromises.access(configPath, fs.constants.F_OK);
  } catch (err) {
    // ファイルが存在しない場合は正常ケース（デフォルト設定を使用）
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { success: true, config: getDefaultConfig(), timestamp: 0 };
    }

    // その他のエラー（権限エラーなど）はログに記録してデフォルト設定を返す
    const errorDetail = err instanceof Error ? err.message : String(err);
    const errorCode =
      err instanceof Error && 'code' in err ? (err as NodeJS.ErrnoException).code : 'UNKNOWN';
    outputChannel.appendLine(
      `[Config] 警告: ${MERMAID_CONFIG_FILENAME} へのアクセスに失敗しました。デフォルト設定を使用します。`
    );
    outputChannel.appendLine(`  エラーコード: ${errorCode}, 詳細: ${errorDetail}`);
    vscode.window.showWarningMessage(
      `${MERMAID_CONFIG_FILENAME} へのアクセスに失敗しました。詳細は Output パネルを確認してください。`
    );
    return { success: false, config: getDefaultConfig(), error: errorDetail };
  }

  // ファイル読み込み（非同期）
  let content: string;
  try {
    content = await fsPromises.readFile(configPath, 'utf-8');
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(
      `[Config] ${MERMAID_CONFIG_FILENAME} の読み込みに失敗しました。デフォルト設定を使用します。`
    );
    outputChannel.appendLine(`  詳細: ${errorDetail}`);
    vscode.window.showWarningMessage(
      `${MERMAID_CONFIG_FILENAME} の読み込みに失敗しました。詳細は Output パネルを確認してください。`
    );
    return { success: false, config: getDefaultConfig(), error: errorDetail };
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
    return { success: false, config: getDefaultConfig(), error: errorDetail };
  }

  // 型検証
  if (typeof parsed !== 'object' || parsed === null) {
    const error = '設定ファイルがオブジェクトではありません';
    outputChannel.appendLine(
      `[Config] ${MERMAID_CONFIG_FILENAME} はオブジェクトである必要があります。デフォルト設定を使用します。`
    );
    vscode.window.showWarningMessage(
      `${MERMAID_CONFIG_FILENAME} の形式が不正です。オブジェクトである必要があります。`
    );
    return { success: false, config: getDefaultConfig(), error };
  }

  // 設定検証
  const validated = validateConfig(parsed as Record<string, unknown>, outputChannel);
  outputChannel.appendLine(`[Config] ${MERMAID_CONFIG_FILENAME} を読み込みました。`);

  // ファイルの mtime を取得して返す
  const stats = await fsPromises.stat(configPath);
  return {
    success: true,
    config: {
      ...getDefaultConfig(),
      ...validated,
    },
    timestamp: stats.mtimeMs,
  };
}

/**
 * ファイルの最終更新時刻（mtime）を取得する（Phase 3 追加）。
 *
 * キャッシュエントリに記録するために使用。実際の無効化は FileSystemWatcher で行われる。
 *
 * Phase 3 修正: エラーの種類を区別し、ENOENT のみを正常ケースとして扱う。
 *
 * @param filePath ファイルパス
 * @param outputChannel ログ出力用の OutputChannel（オプション）
 * @returns 最終更新時刻（ms）。ファイルが存在しない場合は 0。
 */
export async function getFileTimestamp(
  filePath: string,
  outputChannel?: vscode.OutputChannel
): Promise<number> {
  try {
    const stats = await fsPromises.stat(filePath);
    return stats.mtimeMs;
  } catch (err) {
    // ファイルが存在しない場合は 0 を返す（正常ケース）
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }

    // その他のエラーはログに記録
    const errorDetail = err instanceof Error ? err.message : String(err);
    const errorCode =
      err instanceof Error && 'code' in err ? (err as NodeJS.ErrnoException).code : 'UNKNOWN';
    outputChannel?.appendLine(
      `[Config] 警告: ファイルの stat 取得に失敗しました: ${filePath}`
    );
    outputChannel?.appendLine(`  エラーコード: ${errorCode}, 詳細: ${errorDetail}`);

    // エラー時も 0 を返すが、ログで状況を記録
    return 0;
  }
}
