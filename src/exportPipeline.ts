/**
 * エクスポートパイプライン
 * Phase 2: Pandoc + mermaid-filter による EPUB/PDF エクスポート実行。
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
import type { MermaidConfig } from './types';

const execFile = promisify(childProcess.execFile);

export interface ExportPipelineOptions {
  inputPath: string;
  outputPath: string;
  target: ExportTarget;
  mermaidConfig: MermaidConfig;
  workingDirectory: string;
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
  const { inputPath, outputPath, workingDirectory } = options;

  const args = [
    inputPath,
    '-F', 'mermaid-filter',
    '-o', outputPath,
    '--dpi', String(dpi),
  ];

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
    const stderr = (err as { stderr?: string }).stderr;

    outputChannel.appendLine(`[Export] Pandoc 実行に失敗しました。`);
    outputChannel.appendLine(`  詳細: ${errorDetail}`);
    if (stderr) {
      outputChannel.appendLine(`  stderr: ${stderr}`);
    }

    throw new Error(`Pandoc 実行に失敗しました: ${errorDetail}`);
  }
}

/**
 * .mermaid-config.json を作業ディレクトリに書き出す
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
    outputChannel.appendLine(`[Export] 警告: .mermaid-config.json の書き出しに失敗しました。`);
    outputChannel.appendLine(`  詳細: ${errorDetail}`);
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
