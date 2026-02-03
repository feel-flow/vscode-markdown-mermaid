/**
 * 拡張共通定数
 * docs/03-implementation/PATTERNS.md, CONVENTIONS.md を参照。
 */

/** Mermaid のデフォルトテーマ（印刷・EPUB 向け）。Issue #4 では固定で使用。 */
export const DEFAULT_MERMAID_THEME = 'neutral';

/** Mermaid.js を読み込む CDN URL。Webview 用。 */
export const MERMAID_CDN_URL =
  'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';

/** Viewer 内で Mermaid 描画に失敗したときに表示するメッセージ。 */
export const VIEWER_RENDER_ERROR_MESSAGE = '図の描画に失敗しました。';
