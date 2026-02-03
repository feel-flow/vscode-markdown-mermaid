/**
 * Mermaid 設定スキーマ（Domain 層）
 *
 * docs/02-design/ARCHITECTURE.md の Domain 層に対応。
 * Mermaid 公式の設定仕様に準拠。
 */

/** Mermaid の組み込みテーマ名 */
export type MermaidTheme = 'default' | 'neutral' | 'dark' | 'forest' | 'base';

/**
 * base テーマ使用時のカスタムテーマ変数。
 * theme === 'base' のときのみ有効。他のテーマでは無視される（Mermaid 仕様）。
 */
export interface MermaidThemeVariables {
  primaryColor?: string;
  primaryTextColor?: string;
  primaryBorderColor?: string;
  lineColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  fontFamily?: string;
  fontSize?: string;
  /** その他のカスタム変数を許容 */
  [key: string]: string | undefined;
}

/**
 * エクスポート設定（Phase 2）
 */
export interface ExportOptions {
  /** 解像度（DPI）。最小 72、最大 600、デフォルト 300 */
  dpi?: number;
  /** 図の最大幅（px）。最小 400、最大 2000、デフォルト 800 */
  width?: number;
  /** EPUB エクスポート時の設定 */
  epub?: {
    /** 画像形式。デフォルト png */
    format?: 'png' | 'svg';
  };
  /** PDF エクスポート時の設定 */
  pdf?: {
    /** 画像形式。デフォルト svg */
    format?: 'png' | 'svg';
  };
}

/**
 * .mermaid-config.json の設定オブジェクト。
 * Mermaid.initialize() に渡す設定と対応。
 */
export interface MermaidConfig {
  theme?: MermaidTheme;
  themeVariables?: MermaidThemeVariables;
  themeCSS?: string;
  startOnLoad?: boolean;
  securityLevel?: 'strict' | 'loose' | 'antiscript' | 'sandbox';
  logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 0 | 1 | 2 | 3 | 4 | 5;
  /** Phase 2: エクスポート設定 */
  export?: ExportOptions;
}
