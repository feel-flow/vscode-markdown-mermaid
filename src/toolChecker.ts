/**
 * 外部ツールの存在チェックモジュール
 * エクスポート機能の依存ツール（mermaid-filter, Pandoc）検出。
 *
 * docs/03-implementation/PATTERNS.md および CONVENTIONS.md を参照。
 */
import * as childProcess from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

const execFile = promisify(childProcess.execFile);

/** コマンド存在チェックのタイムアウト（ms）。範囲: 3000-10000 */
const COMMAND_CHECK_TIMEOUT_MS = 5000;

export interface ToolCheckResult {
  available: boolean;
  version?: string;
  errorMessage?: string;
}

/**
 * mermaid-filter の存在と動作をチェックする
 */
export async function checkMermaidFilter(
  outputChannel: vscode.OutputChannel
): Promise<ToolCheckResult> {
  try {
    const { stdout } = await execFile('mermaid-filter', ['--version'], {
      timeout: COMMAND_CHECK_TIMEOUT_MS
    });
    const version = stdout.trim();
    outputChannel.appendLine(`[ToolCheck] mermaid-filter: ${version}`);
    return { available: true, version };
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    const errorCode = (err as { code?: string }).code;

    // ENOENT (コマンドが見つからない) と他のエラーを区別
    if (errorCode === 'ENOENT') {
      outputChannel.appendLine(`[ToolCheck] mermaid-filter が見つかりません。`);
      outputChannel.appendLine(`  詳細: ${errorDetail}`);
      return {
        available: false,
        errorMessage: 'mermaid-filter が見つかりません。\nインストール方法: npm install -g mermaid-filter'
      };
    }

    // その他のエラー（タイムアウト、権限エラー等）
    outputChannel.appendLine(`[ToolCheck] エラー: mermaid-filter の実行中に予期しないエラーが発生しました。`);
    outputChannel.appendLine(`  エラーコード: ${errorCode || 'unknown'}`);
    outputChannel.appendLine(`  詳細: ${errorDetail}`);
    return {
      available: false,
      errorMessage: `mermaid-filter の実行中にエラーが発生しました: ${errorDetail}`
    };
  }
}

/**
 * Pandoc の存在と動作をチェックする
 */
export async function checkPandoc(
  outputChannel: vscode.OutputChannel
): Promise<ToolCheckResult> {
  try {
    const { stdout } = await execFile('pandoc', ['--version'], {
      timeout: COMMAND_CHECK_TIMEOUT_MS
    });
    const version = stdout.split('\n')[0]?.trim() || 'unknown';
    outputChannel.appendLine(`[ToolCheck] Pandoc: ${version}`);
    return { available: true, version };
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    const errorCode = (err as { code?: string }).code;

    // ENOENT (コマンドが見つからない) と他のエラーを区別
    if (errorCode === 'ENOENT') {
      outputChannel.appendLine(`[ToolCheck] Pandoc が見つかりません。`);
      outputChannel.appendLine(`  詳細: ${errorDetail}`);
      return {
        available: false,
        errorMessage: 'Pandoc が見つかりません。\nインストール方法: https://pandoc.org/installing.html'
      };
    }

    // その他のエラー（タイムアウト、権限エラー等）
    outputChannel.appendLine(`[ToolCheck] エラー: Pandoc の実行中に予期しないエラーが発生しました。`);
    outputChannel.appendLine(`  エラーコード: ${errorCode || 'unknown'}`);
    outputChannel.appendLine(`  詳細: ${errorDetail}`);
    return {
      available: false,
      errorMessage: `Pandoc の実行中にエラーが発生しました: ${errorDetail}`
    };
  }
}

/**
 * エクスポートに必要なすべてのツールをチェックし、
 * 不足している場合はユーザーに通知する
 *
 * @returns すべてのツールが利用可能な場合は true
 */
export async function checkExportDependencies(
  outputChannel: vscode.OutputChannel
): Promise<boolean> {
  const [mermaidFilterResult, pandocResult] = await Promise.all([
    checkMermaidFilter(outputChannel),
    checkPandoc(outputChannel)
  ]);

  const missingTools: string[] = [];

  if (!mermaidFilterResult.available) {
    if (!mermaidFilterResult.errorMessage) {
      outputChannel.appendLine('[ToolCheck] エラー: mermaid-filter チェックが失敗しましたが、エラーメッセージがありません');
      missingTools.push('mermaid-filter のチェックに失敗しました（理由不明）');
    } else {
      missingTools.push(mermaidFilterResult.errorMessage);
    }
  }

  if (!pandocResult.available) {
    if (!pandocResult.errorMessage) {
      outputChannel.appendLine('[ToolCheck] エラー: Pandoc チェックが失敗しましたが、エラーメッセージがありません');
      missingTools.push('Pandoc のチェックに失敗しました（理由不明）');
    } else {
      missingTools.push(pandocResult.errorMessage);
    }
  }

  if (missingTools.length > 0) {
    const message = `エクスポートに必要なツールが見つかりません:\n\n${missingTools.join('\n\n')}`;
    vscode.window.showErrorMessage(message);
    outputChannel.appendLine('[ToolCheck] エクスポート依存ツールのチェック失敗');
    return false;
  }

  outputChannel.appendLine('[ToolCheck] すべての依存ツールが利用可能です');
  return true;
}
