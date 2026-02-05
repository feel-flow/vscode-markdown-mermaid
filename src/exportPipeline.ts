/**
 * エクスポートパイプライン
 * Pandoc + mermaid-filter による EPUB/PDF エクスポート実行。
 *
 * docs/02-design/ARCHITECTURE.md の Infrastructure 層に対応。
 */
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { EXPORT_COMMAND_TIMEOUT_MS } from './constants';
import type { ExportTarget, ImageFormat } from './exportFormatResolver';
import {
  buildMermaidFilterEnv,
  resolveDpi,
  resolveImageFormat,
  resolveWidth,
} from './exportFormatResolver';
import type { KindleTemplate, MermaidConfig } from './types';

const execFile = promisify(childProcess.execFile);

export interface ExportPipelineOptions {
  inputPath: string;
  outputPath: string;
  target: ExportTarget;
  mermaidConfig: MermaidConfig;
  workingDirectory: string;
  /** Kindle テンプレート（Phase 3 追加、EPUB エクスポート時に使用） */
  kindleTemplate?: KindleTemplate;
}

/**
 * Pandoc を実行して Markdown を EPUB/PDF に変換する
 */
async function runPandoc(
  options: ExportPipelineOptions,
  format: ImageFormat,
  dpi: number,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const { inputPath, outputPath, workingDirectory, kindleTemplate } = options;

  const args = [
    inputPath,
    '-F', 'mermaid-filter',
    '-o', outputPath,
    '--dpi', String(dpi),
  ];

  // Phase 3: Kindle テンプレートが指定されている場合、--template と --css を追加
  if (kindleTemplate && options.target === 'epub') {
    args.push('--template', kindleTemplate.paths.html);
    args.push('--css', kindleTemplate.paths.css);
    outputChannel.appendLine(`[Export] テンプレート: ${kindleTemplate.metadata.displayName}`);
  }

  outputChannel.appendLine(`[Export] Pandoc コマンド: pandoc ${args.join(' ')}`);
  outputChannel.appendLine(`[Export] 作業ディレクトリ: ${workingDirectory}`);

  const width = resolveWidth(options.mermaidConfig.export);
  const env = buildMermaidFilterEnv(format, width);

  try {
    const { stdout, stderr } = await execFile('pandoc', args, {
      cwd: workingDirectory,
      env,
      timeout: EXPORT_COMMAND_TIMEOUT_MS,
    });

    if (stdout) {
      outputChannel.appendLine(`[Export] Pandoc stdout: ${stdout}`);
    }
    if (stderr) {
      outputChannel.appendLine(`[Export] Pandoc stderr: ${stderr}`);
    }

    outputChannel.appendLine(`[Export] エクスポート成功: ${outputPath}`);
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    const errorCode = (err as { code?: string }).code;
    const stderr = (err as { stderr?: string }).stderr;

    // ログに詳細を出力
    outputChannel.appendLine(`[Export] Pandoc 実行に失敗しました。`);
    outputChannel.appendLine(`  エラーコード: ${errorCode || 'unknown'}`);
    outputChannel.appendLine(`  詳細: ${errorDetail}`);
    if (stderr) {
      outputChannel.appendLine(`  stderr: ${stderr}`);
    }

    // エラーコード別に具体的なメッセージを生成
    if (errorCode === 'ETIMEDOUT') {
      throw new Error(
        `Pandoc 実行がタイムアウトしました（${EXPORT_COMMAND_TIMEOUT_MS / 1000}秒）。\n` +
        `大きなファイルや複雑な図が含まれている可能性があります。\n` +
        `詳細: ${errorDetail}`
      );
    }

    if (errorCode === 'ENOENT') {
      throw new Error(
        `Pandoc または mermaid-filter が見つかりません。\n` +
        `ツールチェックは成功しましたが、実行時に見つかりませんでした。\n` +
        `詳細: ${errorDetail}`
      );
    }

    if (errorCode === 'EACCES') {
      throw new Error(
        `ファイルのアクセス権限エラーが発生しました。\n` +
        `出力先ディレクトリへの書き込み権限を確認してください。\n` +
        `詳細: ${errorDetail}`
      );
    }

    // stderr から mermaid-filter 特有のエラーを検出
    if (stderr && stderr.includes('mermaid-filter')) {
      throw new Error(
        `mermaid-filter の実行中にエラーが発生しました。\n` +
        `Mermaid 図の構文エラーの可能性があります。\n` +
        `stderr: ${stderr}`
      );
    }

    // 汎用的な Pandoc エラー
    throw new Error(
      `Pandoc 実行に失敗しました。\n` +
      `stderr: ${stderr || 'なし'}\n` +
      `詳細: ${errorDetail}`
    );
  }
}

/**
 * Mermaid CLI 用の設定ファイル（.mermaid-config.json）を作業ディレクトリに書き出す。
 * theme, themeVariables（base テーマ時のみ）、themeCSS のみを含む。
 */
async function writeMermaidConfig(
  workingDirectory: string,
  mermaidConfig: MermaidConfig,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const configPath = path.join(workingDirectory, '.mermaid-config.json');

  const cliConfig = {
    theme: mermaidConfig.theme,
    themeVariables: mermaidConfig.theme === 'base' ? mermaidConfig.themeVariables : undefined,
    themeCSS: mermaidConfig.themeCSS,
  };

  try {
    await fs.promises.writeFile(
      configPath,
      JSON.stringify(cliConfig, null, 2),
      'utf-8'
    );
    outputChannel.appendLine(`[Export] .mermaid-config.json を作業ディレクトリに書き出しました: ${configPath}`);
  } catch (err) {
    const errorDetail = err instanceof Error ? err.message : String(err);
    const errorCode = (err as { code?: string }).code;

    outputChannel.appendLine(`[Export] エラー: .mermaid-config.json の書き出しに失敗しました。`);
    outputChannel.appendLine(`  エラーコード: ${errorCode || 'unknown'}`);
    outputChannel.appendLine(`  詳細: ${errorDetail}`);

    // エラーを上位に伝播させる
    let errorMessage = `Mermaid 設定ファイルの書き出しに失敗しました。\nパス: ${configPath}`;

    if (errorCode === 'EACCES') {
      errorMessage += '\nディレクトリへの書き込み権限を確認してください。';
    } else if (errorCode === 'ENOSPC') {
      errorMessage += '\nディスクの空き容量を確認してください。';
    }

    errorMessage += `\n詳細: ${errorDetail}`;

    throw new Error(errorMessage);
  }
}

/**
 * エクスポートパイプラインを実行する
 */
export async function runExportPipeline(
  options: ExportPipelineOptions,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const { target, mermaidConfig, workingDirectory } = options;

  outputChannel.appendLine(`[Export] ${target.toUpperCase()} エクスポートを開始します...`);

  const format = resolveImageFormat(target, mermaidConfig.export);
  const dpi = resolveDpi(mermaidConfig.export);

  outputChannel.appendLine(`[Export] 画像形式: ${format}, DPI: ${dpi}`);

  await writeMermaidConfig(workingDirectory, mermaidConfig, outputChannel);
  await runPandoc(options, format, dpi, outputChannel);

  outputChannel.appendLine(`[Export] ${target.toUpperCase()} エクスポートが完了しました。`);
}
