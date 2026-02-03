/**
 * エクスポート形式解決モジュール
 * Phase 2: ターゲット（EPUB/PDF）に応じた画像形式・解像度・幅を決定する。
 *
 * docs/03-implementation/PATTERNS.md および CONVENTIONS.md を参照。
 */
import {
  DEFAULT_EPUB_FORMAT,
  DEFAULT_EXPORT_DPI,
  DEFAULT_EXPORT_WIDTH,
  DEFAULT_PDF_FORMAT,
} from './constants';
import type { ExportOptions } from './types';

export type ExportTarget = 'epub' | 'pdf';
export type ImageFormat = 'png' | 'svg';

/**
 * エクスポートターゲットに応じた画像形式を解決する
 */
export function resolveImageFormat(
  target: ExportTarget,
  exportOptions?: ExportOptions
): ImageFormat {
  if (!exportOptions) {
    return target === 'epub' ? DEFAULT_EPUB_FORMAT : DEFAULT_PDF_FORMAT;
  }

  if (target === 'epub') {
    return exportOptions.epub?.format ?? DEFAULT_EPUB_FORMAT;
  } else {
    return exportOptions.pdf?.format ?? DEFAULT_PDF_FORMAT;
  }
}

/**
 * 解像度（DPI）を解決する
 */
export function resolveDpi(exportOptions?: ExportOptions): number {
  return exportOptions?.dpi ?? DEFAULT_EXPORT_DPI;
}

/**
 * 図の幅（px）を解決する
 */
export function resolveWidth(exportOptions?: ExportOptions): number {
  return exportOptions?.width ?? DEFAULT_EXPORT_WIDTH;
}

/**
 * mermaid-filter 用の環境変数を生成する
 */
export function buildMermaidFilterEnv(
  format: ImageFormat,
  width: number
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    MERMAID_FILTER_FORMAT: format,
    MERMAID_FILTER_WIDTH: String(width),
  };
}
