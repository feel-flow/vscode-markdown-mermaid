/**
 * Kindle テンプレートローダー（Phase 3 追加）
 *
 * バンドル済みテンプレートとカスタムテンプレートの読み込みを提供する。
 * テンプレートは templates/kindle/ ディレクトリに配置される。
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { KindleTemplate, TemplateMetadata } from './types';

/** テンプレートディレクトリ名 */
const TEMPLATES_DIR = 'templates';
const KINDLE_TEMPLATES_SUBDIR = 'kindle';

/** テンプレートファイル名 */
const METADATA_FILENAME = 'metadata.json';
const HTML_FILENAME = 'template.html';
const CSS_FILENAME = 'styles.css';

/** バンドル済みテンプレート ID 一覧 */
const BUNDLED_TEMPLATE_IDS = ['technical', 'novel', 'basic'] as const;

/** デフォルトテンプレート ID */
export const DEFAULT_TEMPLATE_ID = 'basic';

/**
 * テンプレート読み込みエラー
 */
export class TemplateLoadError extends Error {
  constructor(
    message: string,
    public readonly templateId: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'TemplateLoadError';
  }
}

/**
 * バンドル済みテンプレートのベースディレクトリパスを取得
 *
 * @param extensionPath 拡張機能のルートパス
 * @returns テンプレートディレクトリのパス
 */
function getBundledTemplatesDir(extensionPath: string): string {
  return path.join(extensionPath, TEMPLATES_DIR, KINDLE_TEMPLATES_SUBDIR);
}

/**
 * テンプレートディレクトリからテンプレートを読み込む
 *
 * @param templateDir テンプレートディレクトリのパス
 * @param isBundled バンドル済みテンプレートかどうか
 * @param outputChannel ログ出力用（任意）
 * @returns 読み込んだテンプレート
 * @throws TemplateLoadError テンプレートの読み込みに失敗した場合
 */
async function loadTemplateFromDir(
  templateDir: string,
  isBundled: boolean,
  outputChannel?: vscode.OutputChannel
): Promise<KindleTemplate> {
  const templateId = path.basename(templateDir);
  const metadataPath = path.join(templateDir, METADATA_FILENAME);
  const htmlPath = path.join(templateDir, HTML_FILENAME);
  const cssPath = path.join(templateDir, CSS_FILENAME);

  // 必須ファイルの存在チェック
  const requiredFiles = [metadataPath, htmlPath, cssPath];
  for (const filePath of requiredFiles) {
    if (!fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      throw new TemplateLoadError(
        `テンプレート "${templateId}" に必須ファイル "${fileName}" がありません`,
        templateId
      );
    }
  }

  // metadata.json を読み込み
  let metadataContent: string;
  try {
    metadataContent = await fsPromises.readFile(metadataPath, 'utf-8');
  } catch (err) {
    throw new TemplateLoadError(
      `テンプレート "${templateId}" の metadata.json の読み込みに失敗しました`,
      templateId,
      err
    );
  }

  // JSON パース
  let metadata: TemplateMetadata;
  try {
    const parsed = JSON.parse(metadataContent) as Record<string, unknown>;
    metadata = validateMetadata(parsed, templateId);
  } catch (err) {
    if (err instanceof TemplateLoadError) {
      throw err;
    }
    throw new TemplateLoadError(
      `テンプレート "${templateId}" の metadata.json のパースに失敗しました`,
      templateId,
      err
    );
  }

  outputChannel?.appendLine(`[Template] テンプレート "${templateId}" を読み込みました`);

  return {
    metadata,
    paths: {
      metadata: metadataPath,
      html: htmlPath,
      css: cssPath,
    },
    isBundled,
  };
}

/**
 * メタデータオブジェクトを検証
 */
function validateMetadata(
  parsed: Record<string, unknown>,
  templateId: string
): TemplateMetadata {
  // 必須フィールドのチェック
  if (typeof parsed.id !== 'string' || parsed.id.length === 0) {
    throw new TemplateLoadError(
      `テンプレート "${templateId}" の metadata.json に有効な id がありません`,
      templateId
    );
  }
  if (typeof parsed.displayName !== 'string' || parsed.displayName.length === 0) {
    throw new TemplateLoadError(
      `テンプレート "${templateId}" の metadata.json に有効な displayName がありません`,
      templateId
    );
  }
  if (typeof parsed.description !== 'string') {
    throw new TemplateLoadError(
      `テンプレート "${templateId}" の metadata.json に有効な description がありません`,
      templateId
    );
  }
  if (
    parsed.contentType !== 'technical' &&
    parsed.contentType !== 'novel' &&
    parsed.contentType !== 'general'
  ) {
    throw new TemplateLoadError(
      `テンプレート "${templateId}" の metadata.json に有効な contentType がありません（technical/novel/general）`,
      templateId
    );
  }

  return {
    id: parsed.id,
    displayName: parsed.displayName,
    description: parsed.description,
    contentType: parsed.contentType,
    author: typeof parsed.author === 'string' ? parsed.author : undefined,
    version: typeof parsed.version === 'string' ? parsed.version : undefined,
  };
}

/**
 * すべてのバンドル済みテンプレートを読み込む
 *
 * @param extensionPath 拡張機能のルートパス
 * @param outputChannel ログ出力用（任意）
 * @returns テンプレートの配列
 */
export async function loadBundledTemplates(
  extensionPath: string,
  outputChannel?: vscode.OutputChannel
): Promise<KindleTemplate[]> {
  const templatesDir = getBundledTemplatesDir(extensionPath);
  const templates: KindleTemplate[] = [];

  outputChannel?.appendLine(`[Template] バンドル済みテンプレートを読み込み中: ${templatesDir}`);

  for (const templateId of BUNDLED_TEMPLATE_IDS) {
    const templateDir = path.join(templatesDir, templateId);

    if (!fs.existsSync(templateDir)) {
      outputChannel?.appendLine(
        `[Template] 警告: テンプレート "${templateId}" のディレクトリが見つかりません`
      );
      continue;
    }

    try {
      const template = await loadTemplateFromDir(templateDir, true, outputChannel);
      templates.push(template);
    } catch (err) {
      const errorDetail = err instanceof Error ? err.message : String(err);
      outputChannel?.appendLine(
        `[Template] 警告: テンプレート "${templateId}" の読み込みに失敗しました: ${errorDetail}`
      );
    }
  }

  outputChannel?.appendLine(`[Template] ${templates.length} 個のテンプレートを読み込みました`);
  return templates;
}

/**
 * ID でテンプレートを取得
 *
 * @param extensionPath 拡張機能のルートパス
 * @param templateId テンプレート ID
 * @param outputChannel ログ出力用（任意）
 * @returns テンプレート、見つからない場合は undefined
 */
export async function getTemplateById(
  extensionPath: string,
  templateId: string,
  outputChannel?: vscode.OutputChannel
): Promise<KindleTemplate | undefined> {
  // バンドル済みテンプレートをチェック
  const templatesDir = getBundledTemplatesDir(extensionPath);
  const templateDir = path.join(templatesDir, templateId);

  if (fs.existsSync(templateDir)) {
    try {
      return await loadTemplateFromDir(templateDir, true, outputChannel);
    } catch (err) {
      const errorDetail = err instanceof Error ? err.message : String(err);
      outputChannel?.appendLine(
        `[Template] テンプレート "${templateId}" の読み込みに失敗しました: ${errorDetail}`
      );
      return undefined;
    }
  }

  outputChannel?.appendLine(`[Template] テンプレート "${templateId}" が見つかりません`);
  return undefined;
}

/**
 * カスタムテンプレートを読み込む
 *
 * @param customTemplateDir カスタムテンプレートのディレクトリパス
 * @param outputChannel ログ出力用（任意）
 * @returns テンプレート
 * @throws TemplateLoadError テンプレートの読み込みに失敗した場合
 */
export async function loadCustomTemplate(
  customTemplateDir: string,
  outputChannel?: vscode.OutputChannel
): Promise<KindleTemplate> {
  outputChannel?.appendLine(`[Template] カスタムテンプレートを読み込み中: ${customTemplateDir}`);

  if (!fs.existsSync(customTemplateDir)) {
    const templateId = path.basename(customTemplateDir);
    throw new TemplateLoadError(
      `カスタムテンプレートディレクトリが見つかりません: ${customTemplateDir}`,
      templateId
    );
  }

  return loadTemplateFromDir(customTemplateDir, false, outputChannel);
}

/**
 * テンプレートの HTML コンテンツを読み込む
 *
 * @param template テンプレート
 * @returns HTML コンテンツ
 */
export async function loadTemplateHtml(template: KindleTemplate): Promise<string> {
  return fsPromises.readFile(template.paths.html, 'utf-8');
}

/**
 * テンプレートの CSS コンテンツを読み込む
 *
 * @param template テンプレート
 * @returns CSS コンテンツ
 */
export async function loadTemplateCss(template: KindleTemplate): Promise<string> {
  return fsPromises.readFile(template.paths.css, 'utf-8');
}

/**
 * 利用可能なテンプレート ID の一覧を取得
 *
 * @returns バンドル済みテンプレート ID の配列
 */
export function getBundledTemplateIds(): readonly string[] {
  return BUNDLED_TEMPLATE_IDS;
}
