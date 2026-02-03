/**
 * レンダーキャッシュ機構
 *
 * Markdown のレンダリング結果をキャッシュして、プレビューの再描画を高速化する。
 * LRU（Least Recently Used）アルゴリズムで古いエントリを自動削除。
 *
 * Phase 3: パフォーマンス最適化
 * 期待効果: プレビュー再描画 300-400ms 短縮、キャッシュヒット時は 99% 削減（5ms 未満）
 */

import * as vscode from 'vscode';
import { MAX_RENDER_CACHE_ENTRIES, MAX_RENDER_CACHE_MEMORY_MB } from './constants';
import type { MermaidConfig } from './types';
import { createHash } from './utils/hash';

/**
 * レンダーキャッシュエントリの構造
 */
interface RenderCacheEntry {
  /** キャッシュキー（Markdown + 設定のハッシュ） */
  readonly key: string;
  /** レンダリング済み HTML */
  readonly html: string;
  /** HTML のサイズ（バイト） */
  readonly size: number;
  /** 最終アクセス時刻（ms）。LRU の判定に使用。 */
  lastAccessTime: number;
}

/**
 * レンダーキャッシュマネージャー（Singleton）
 *
 * LRU（Least Recently Used）アルゴリズムでキャッシュを管理。
 * Markdown 内容 + 設定のハッシュをキャッシュキーとして使用。
 */
export class RenderCache {
  /** キャッシュキー → キャッシュエントリ のマップ */
  private cache: Map<string, RenderCacheEntry> = new Map();

  /** 現在のメモリ使用量（バイト） */
  private currentMemoryBytes: number = 0;

  /** OutputChannel（ログ出力用） */
  private outputChannel: vscode.OutputChannel | undefined;

  /**
   * OutputChannel を設定する（初期化時に呼び出す）
   */
  setOutputChannel(outputChannel: vscode.OutputChannel): void {
    this.outputChannel = outputChannel;
  }

  /**
   * キャッシュから HTML を取得する。
   *
   * @param markdown Markdown の内容
   * @param config Mermaid 設定
   * @returns キャッシュされた HTML。キャッシュミス時は undefined。
   */
  get(markdown: string, config: MermaidConfig): string | undefined {
    const key = createHash(markdown, config);
    const entry = this.cache.get(key);

    if (entry === undefined) {
      this.outputChannel?.appendLine(`[RenderCache] キャッシュミス: ${key.substring(0, 16)}...`);
      return undefined;
    }

    // 最終アクセス時刻を更新（LRU の判定に使用）
    entry.lastAccessTime = Date.now();
    this.outputChannel?.appendLine(
      `[RenderCache] キャッシュヒット: ${key.substring(0, 16)}... (size: ${entry.size} bytes)`
    );
    return entry.html;
  }

  /**
   * レンダリング結果をキャッシュに保存する。
   *
   * キャッシュが最大エントリ数またはメモリ制限に達している場合、
   * 最も古いエントリを削除する（LRU）。
   *
   * @param markdown Markdown の内容
   * @param config Mermaid 設定
   * @param html レンダリング済み HTML
   */
  set(markdown: string, config: MermaidConfig, html: string): void {
    const key = createHash(markdown, config);
    const size = Buffer.byteLength(html, 'utf8');

    // 既存エントリがある場合は削除（メモリ計算のため）
    const existingEntry = this.cache.get(key);
    if (existingEntry !== undefined) {
      this.currentMemoryBytes -= existingEntry.size;
      this.cache.delete(key);
    }

    // メモリ制限チェック（20MB = 20 * 1024 * 1024 bytes）
    const maxMemoryBytes = MAX_RENDER_CACHE_MEMORY_MB * 1024 * 1024;
    while (
      this.currentMemoryBytes + size > maxMemoryBytes ||
      this.cache.size >= MAX_RENDER_CACHE_ENTRIES
    ) {
      this.evictLRU();
    }

    const entry: RenderCacheEntry = {
      key,
      html,
      size,
      lastAccessTime: Date.now(),
    };

    this.cache.set(key, entry);
    this.currentMemoryBytes += size;

    this.outputChannel?.appendLine(
      `[RenderCache] キャッシュに保存: ${key.substring(0, 16)}... (size: ${size} bytes, total: ${this.currentMemoryBytes} bytes, entries: ${this.cache.size})`
    );
  }

  /**
   * すべてのキャッシュをクリアする。
   *
   * 設定変更時や拡張の無効化時に呼び出す。
   */
  clear(): void {
    this.cache.clear();
    this.currentMemoryBytes = 0;
    this.outputChannel?.appendLine('[RenderCache] すべてのキャッシュをクリアしました。');
  }

  /**
   * LRU アルゴリズムで最も古いエントリを削除する。
   */
  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestTime = Number.POSITIVE_INFINITY;

    try {
      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessTime < oldestTime) {
          oldestTime = entry.lastAccessTime;
          oldestKey = key;
        }
      }

      if (oldestKey !== undefined) {
        const entry = this.cache.get(oldestKey);
        if (entry !== undefined) {
          this.cache.delete(oldestKey);
          this.currentMemoryBytes -= entry.size;
          this.outputChannel?.appendLine(
            `[RenderCache] LRU で削除: ${oldestKey.substring(0, 16)}... (freed: ${entry.size} bytes)`
          );
        }
      }
    } catch (err) {
      const errorDetail = err instanceof Error ? err.message : String(err);
      this.outputChannel?.appendLine(
        `[RenderCache] エラー: LRU 削除に失敗しました: ${errorDetail}`
      );
    }
  }

  /**
   * キャッシュの統計情報を返す（デバッグ用）。
   */
  getStats(): {
    entries: number;
    memoryBytes: number;
    memoryMB: number;
  } {
    return {
      entries: this.cache.size,
      memoryBytes: this.currentMemoryBytes,
      memoryMB: this.currentMemoryBytes / (1024 * 1024),
    };
  }
}

/** シングルトンインスタンス */
export const renderCache = new RenderCache();
