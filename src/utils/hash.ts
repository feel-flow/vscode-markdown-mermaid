/**
 * ハッシュ生成ユーティリティ
 *
 * レンダーキャッシュのキー生成に使用する暗号学的ハッシュ関数を提供。
 * SHA-256 を使用して、衝突の可能性を最小化しながら一意なキーを生成する。
 *
 * Phase 3: パフォーマンス最適化
 */

import * as crypto from 'node:crypto';
import type { MermaidConfig } from '../types';

/**
 * Markdown 内容と Mermaid 設定から暗号学的ハッシュを生成する。
 *
 * キャッシュキーとして使用するため、同じ内容+設定は同じハッシュを生成する必要がある。
 * SHA-256 を使用して衝突の可能性を最小化。
 *
 * @param markdown Markdown の内容
 * @param config Mermaid 設定
 * @returns SHA-256 ハッシュ（hex 形式）
 */
export function createHash(markdown: string, config: MermaidConfig): string {
  const hash = crypto.createHash('sha256');

  // Markdown 内容をハッシュに追加
  hash.update(markdown, 'utf8');

  // 設定を正規化してハッシュに追加（キーの順序を固定）
  const normalizedConfig = normalizeConfig(config);
  hash.update(JSON.stringify(normalizedConfig), 'utf8');

  return hash.digest('hex');
}

/**
 * Mermaid 設定を正規化する。
 *
 * キーの順序を固定し、同じ設定は常に同じ JSON 文字列になるようにする。
 * これにより、設定が同じならハッシュも同じになることを保証する。
 *
 * @param config Mermaid 設定
 * @returns 正規化された設定オブジェクト
 */
function normalizeConfig(config: MermaidConfig): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  // キーをソートして固定順序で処理
  const keys = Object.keys(config).sort();

  for (const key of keys) {
    const value = config[key as keyof MermaidConfig];

    if (value !== undefined) {
      // オブジェクトの場合は再帰的に正規化
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        normalized[key] = normalizeObject(value as Record<string, unknown>);
      } else {
        normalized[key] = value;
      }
    }
  }

  return normalized;
}

/**
 * 任意のオブジェクトを正規化する（再帰用ヘルパー）。
 *
 * @param obj オブジェクト
 * @returns 正規化されたオブジェクト
 */
function normalizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    const value = obj[key];

    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        normalized[key] = normalizeObject(value as Record<string, unknown>);
      } else {
        normalized[key] = value;
      }
    }
  }

  return normalized;
}
