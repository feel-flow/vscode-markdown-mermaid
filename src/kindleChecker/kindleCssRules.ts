/**
 * Kindle CSS 互換性ルール定義
 *
 * Kindle デバイスでサポートされない CSS プロパティを検出するためのルール。
 * 各ルールは重大度（critical/warning/info）に分類される。
 *
 * 参考: Amazon Kindle Publishing Guidelines
 */

/** ルールの重大度 */
export type CssRuleSeverity = 'critical' | 'warning' | 'info';

/** CSS 検証ルール */
export interface KindleCssRule {
  /** ルール ID（一意の識別子） */
  readonly id: string;
  /** ルールの重大度 */
  readonly severity: CssRuleSeverity;
  /** 検出用の正規表現パターン */
  readonly pattern: RegExp;
  /** ユーザー向けメッセージ */
  readonly message: string;
  /** 修正提案（任意） */
  readonly suggestion?: string;
}

/**
 * Kindle CSS 互換性ルール一覧
 *
 * 重大度の基準:
 * - critical: Kindle で完全にサポートされず、表示崩れやエラーを引き起こす
 * - warning: 部分的にサポートされるが、意図通りに表示されない可能性がある
 * - info: 推奨されないが、多くの場合は無視される
 */
export const KINDLE_CSS_RULES: readonly KindleCssRule[] = [
  // ==================== Critical ルール ====================
  {
    id: 'no-url-function',
    severity: 'critical',
    pattern: /url\s*\(/gi,
    message: 'url() 関数は Kindle でサポートされません',
    suggestion: '外部リソースの参照を削除するか、インライン化してください',
  },
  {
    id: 'no-expression',
    severity: 'critical',
    pattern: /expression\s*\(/gi,
    message: 'expression() は Kindle でサポートされません（IE 専用機能）',
    suggestion: 'expression() を削除してください',
  },
  {
    id: 'no-javascript-protocol',
    severity: 'critical',
    pattern: /javascript\s*:/gi,
    message: 'JavaScript プロトコルは Kindle でサポートされません',
    suggestion: 'JavaScript 参照を削除してください',
  },
  {
    id: 'no-import',
    severity: 'critical',
    pattern: /@import\b/gi,
    message: '@import は Kindle で正しく処理されない可能性があります',
    suggestion: 'インポートするスタイルを直接記述してください',
  },

  // ==================== Warning ルール ====================
  {
    id: 'no-position-fixed',
    severity: 'warning',
    pattern: /position\s*:\s*fixed/gi,
    message: 'position: fixed は Kindle でサポートされません',
    suggestion: 'position: static または relative を使用してください',
  },
  {
    id: 'no-position-sticky',
    severity: 'warning',
    pattern: /position\s*:\s*sticky/gi,
    message: 'position: sticky は Kindle でサポートされません',
    suggestion: 'position: static または relative を使用してください',
  },
  {
    id: 'no-float',
    severity: 'warning',
    pattern: /float\s*:\s*(left|right)/gi,
    message: 'float プロパティは Kindle で予期しないレイアウトを引き起こす可能性があります',
    suggestion: 'Flexbox または通常のブロックレイアウトを検討してください',
  },
  {
    id: 'no-flexbox',
    severity: 'warning',
    pattern: /display\s*:\s*flex/gi,
    message: 'Flexbox は古い Kindle デバイスでサポートされません',
    suggestion: 'ブロックレイアウトまたはテーブルレイアウトを検討してください',
  },

  // ==================== Info ルール ====================
  {
    id: 'fixed-pixel-width',
    severity: 'info',
    pattern: /width\s*:\s*\d+px/gi,
    message: '固定幅（px）は異なる画面サイズで問題を起こす可能性があります',
    suggestion: 'パーセント値（%）または max-width の使用を検討してください',
  },
  {
    id: 'fixed-pixel-height',
    severity: 'info',
    pattern: /height\s*:\s*\d+px/gi,
    message: '固定高さ（px）は異なる画面サイズで問題を起こす可能性があります',
    suggestion: 'auto または min-height の使用を検討してください',
  },
  {
    id: 'no-viewport-units',
    severity: 'info',
    pattern: /\d+(vw|vh|vmin|vmax)/gi,
    message: 'ビューポート単位は Kindle でサポートされません',
    suggestion: 'パーセント値（%）または固定値を使用してください',
  },
] as const;

/**
 * 重大度の優先順位（ソート用）
 * 数値が小さいほど優先度が高い
 */
export const SEVERITY_PRIORITY: Record<CssRuleSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
} as const;

/**
 * 重大度に対応する絵文字インジケーター
 */
export const SEVERITY_EMOJI: Record<CssRuleSeverity, string> = {
  critical: '\u{1F6A8}', // 🚨
  warning: '\u26A0\uFE0F', // ⚠️
  info: '\u2139\uFE0F', // ℹ️
} as const;
