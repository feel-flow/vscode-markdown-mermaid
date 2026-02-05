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
 * エクスポート設定
 */
export interface ExportOptions {
  /** 解像度（DPI）。最小 72、最大 600、デフォルト 300 */
  readonly dpi?: number;
  /** 図の最大幅（px）。最小 400、最大 2000、デフォルト 800 */
  readonly width?: number;
  /** EPUB エクスポート時の設定 */
  readonly epub?: {
    /** 画像形式。デフォルト png */
    readonly format?: 'png' | 'svg';
  };
  /** PDF エクスポート時の設定 */
  readonly pdf?: {
    /** 画像形式。デフォルト svg */
    readonly format?: 'png' | 'svg';
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
  /** エクスポート設定 */
  export?: ExportOptions;
}

// ==================== Phase 3: Kindle テンプレート関連型 ====================

/** テンプレートの対象コンテンツ種別 */
export type TemplateContentType = 'technical' | 'novel' | 'general';

/**
 * テンプレートメタデータ
 *
 * 各テンプレートフォルダの metadata.json に対応。
 */
export interface TemplateMetadata {
  /** テンプレート ID（フォルダ名と一致） */
  readonly id: string;
  /** 表示名（日本語） */
  readonly displayName: string;
  /** 説明文 */
  readonly description: string;
  /** 対象コンテンツ種別 */
  readonly contentType: TemplateContentType;
  /** 作成者（任意） */
  readonly author?: string;
  /** バージョン（任意） */
  readonly version?: string;
}

/**
 * Kindle テンプレート
 *
 * テンプレートローダーが返すオブジェクト。
 * メタデータとファイルパス、読み込み済みコンテンツを含む。
 */
export interface KindleTemplate {
  /** テンプレートメタデータ */
  readonly metadata: TemplateMetadata;
  /** テンプレートファイルのパス */
  readonly paths: {
    /** metadata.json のパス */
    readonly metadata: string;
    /** template.html のパス */
    readonly html: string;
    /** styles.css のパス */
    readonly css: string;
  };
  /** バンドル済みテンプレートかどうか（false の場合はカスタムテンプレート） */
  readonly isBundled: boolean;
}
