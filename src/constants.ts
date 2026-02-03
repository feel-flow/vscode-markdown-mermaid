/**
 * 拡張共通定数
 * docs/03-implementation/PATTERNS.md, CONVENTIONS.md を参照。
 */

/** Mermaid のデフォルトテーマ（印刷・EPUB 向け）。 */
export const DEFAULT_MERMAID_THEME = 'neutral';

/** 設定ファイル名。ワークスペースルート直下に配置。 */
export const MERMAID_CONFIG_FILENAME = '.mermaid-config.json';

/** Mermaid.js を読み込む CDN URL。Webview 用。 */
export const MERMAID_CDN_URL =
  'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';

/** Viewer 内で Mermaid 描画に失敗したときに表示するメッセージ。 */
export const VIEWER_RENDER_ERROR_MESSAGE = '図の描画に失敗しました。';

// ==================== Phase 2: エクスポート関連定数 ====================

/** エクスポート時のデフォルト解像度（DPI）。印刷・電子書籍向けに最適化。範囲: 72-600 */
export const DEFAULT_EXPORT_DPI = 300;

/** エクスポート時の図のデフォルト幅（px）。範囲: 400-2000 */
export const DEFAULT_EXPORT_WIDTH = 800;

/** DPI の有効範囲（最小値）。 */
export const MIN_EXPORT_DPI = 72;

/** DPI の有効範囲（最大値）。 */
export const MAX_EXPORT_DPI = 600;

/** 図の幅の有効範囲（最小値、px）。 */
export const MIN_EXPORT_WIDTH = 400;

/** 図の幅の有効範囲（最大値、px）。 */
export const MAX_EXPORT_WIDTH = 2000;

/** EPUB エクスポート時のデフォルト画像形式。Kindle 互換性を優先。 */
export const DEFAULT_EPUB_FORMAT = 'png' as const;

/** PDF エクスポート時のデフォルト画像形式。ベクター形式で高品質。 */
export const DEFAULT_PDF_FORMAT = 'svg' as const;

/** エクスポートコマンド実行時のタイムアウト（ms）。Pandoc 実行を想定。範囲: 30000-300000 */
export const EXPORT_COMMAND_TIMEOUT_MS = 120000; // 120秒
