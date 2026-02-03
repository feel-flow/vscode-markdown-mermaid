/**
 * エクスポート形式解決モジュール
 * ターゲット（EPUB/PDF）に応じた画像形式・解像度・幅を決定する。
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
 * エクスポートターゲット（EPUB/PDF）に応じた画像形式を取得する。
 * 設定が未指定の場合、EPUB は PNG（Kindle 互換性）、PDF は SVG（高品質）を返す。
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
 * エクスポート用の解像度（DPI）を取得する。
 * 設定が未指定の場合はデフォルト値（300 DPI）を返す。
 */
export function resolveDpi(exportOptions?: ExportOptions): number {
  return exportOptions?.dpi ?? DEFAULT_EXPORT_DPI;
}

/**
 * エクスポート用の図の最大幅（px）を取得する。
 * 設定が未指定の場合はデフォルト値（800px）を返す。
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
