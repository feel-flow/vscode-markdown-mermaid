/**
 * 設定キャッシング機構
 *
 * .mermaid-config.json の読み込みを高速化するため、LRU キャッシュを実装。
 * FileSystemWatcher で設定ファイルの変更を監視し、変更時にキャッシュを自動無効化する。
 *
 * Phase 3: パフォーマンス最適化
 * 期待効果: プレビュー起動 50-100ms 短縮、2 回目以降は 98% 削減（1ms 未満）
 */

import * as vscode from 'vscode';
import { MERMAID_CONFIG_FILENAME, MAX_CONFIG_CACHE_ENTRIES } from './constants';
import type { MermaidConfig } from './types';

/**
 * キャッシュエントリの構造
 */
interface ConfigCacheEntry {
  /** キャッシュされた設定 */
  readonly config: MermaidConfig;
  /** ファイルの最終更新時刻（ms）。変更検知に使用。 */
  readonly timestamp: number;
  /** 最終アクセス時刻（ms）。LRU の判定に使用。 */
  lastAccessTime: number;
}

/**
 * 設定キャッシュマネージャー（Singleton）
 *
 * LRU（Least Recently Used）アルゴリズムでキャッシュを管理。
 * ワークスペースルートごとに設定をキャッシュし、FileSystemWatcher で変更を監視する。
 */
export class ConfigCache {
  /** ワークスペースルート → キャッシュエントリ のマップ */
  private cache: Map<string, ConfigCacheEntry> = new Map();

  /** ワークスペースルート → FileSystemWatcher のマップ */
  private watchers: Map<string, vscode.FileSystemWatcher> = new Map();

  /** OutputChannel（ログ出力用） */
  private outputChannel: vscode.OutputChannel | undefined;

  /**
   * OutputChannel を設定する（初期化時に呼び出す）
   */
  setOutputChannel(outputChannel: vscode.OutputChannel): void {
    this.outputChannel = outputChannel;
  }

  /**
   * キャッシュから設定を取得する。
   *
   * @param workspaceRoot ワークスペースのルートパス
   * @returns キャッシュされた設定。キャッシュミス時は undefined。
   */
  get(workspaceRoot: string): MermaidConfig | undefined {
    const entry = this.cache.get(workspaceRoot);
    if (entry === undefined) {
      this.outputChannel?.appendLine(`[ConfigCache] キャッシュミス: ${workspaceRoot}`);
      return undefined;
    }

    // 最終アクセス時刻を更新（LRU の判定に使用）
    entry.lastAccessTime = Date.now();
    this.outputChannel?.appendLine(`[ConfigCache] キャッシュヒット: ${workspaceRoot}`);
    return entry.config;
  }

  /**
   * 設定をキャッシュに保存する。
   *
   * キャッシュが最大エントリ数に達している場合、最も古いエントリを削除する（LRU）。
   *
   * @param workspaceRoot ワークスペースのルートパス
   * @param config キャッシュする設定
   * @param timestamp ファイルの最終更新時刻（ms）
   */
  set(workspaceRoot: string, config: MermaidConfig, timestamp: number): void {
    // キャッシュサイズ制限チェック
    if (this.cache.size >= MAX_CONFIG_CACHE_ENTRIES && !this.cache.has(workspaceRoot)) {
      this.evictLRU();
    }

    const entry: ConfigCacheEntry = {
      config,
      timestamp,
      lastAccessTime: Date.now(),
    };

    this.cache.set(workspaceRoot, entry);
    this.outputChannel?.appendLine(
      `[ConfigCache] キャッシュに保存: ${workspaceRoot} (timestamp: ${timestamp})`
    );

    // ファイルウォッチャーを設定（まだ設定されていない場合）
    if (!this.watchers.has(workspaceRoot)) {
      this.watchConfigFile(workspaceRoot);
    }
  }

  /**
   * 設定ファイルの変更を監視する。
   *
   * FileSystemWatcher を使用して .mermaid-config.json の変更を検知し、
   * 変更時に該当するキャッシュを無効化する。
   *
   * @param workspaceRoot ワークスペースのルートパス
   */
  private watchConfigFile(workspaceRoot: string): void {
    // 既にウォッチャーが存在する場合はスキップ
    if (this.watchers.has(workspaceRoot)) {
      return;
    }

    const configPattern = new vscode.RelativePattern(workspaceRoot, MERMAID_CONFIG_FILENAME);
    const watcher = vscode.workspace.createFileSystemWatcher(configPattern);

    // ファイル変更時にキャッシュを無効化
    const invalidateCache = (): void => {
      this.invalidate(workspaceRoot);
      this.outputChannel?.appendLine(
        `[ConfigCache] ${MERMAID_CONFIG_FILENAME} が変更されました。キャッシュを無効化しました。`
      );
    };

    watcher.onDidChange(invalidateCache);
    watcher.onDidCreate(invalidateCache);
    watcher.onDidDelete(invalidateCache);

    this.watchers.set(workspaceRoot, watcher);
    this.outputChannel?.appendLine(`[ConfigCache] ファイルウォッチャーを設定: ${workspaceRoot}`);
  }

  /**
   * 特定のワークスペースのキャッシュを無効化する。
   *
   * @param workspaceRoot ワークスペースのルートパス
   */
  invalidate(workspaceRoot: string): void {
    const deleted = this.cache.delete(workspaceRoot);
    if (deleted) {
      this.outputChannel?.appendLine(`[ConfigCache] キャッシュを無効化: ${workspaceRoot}`);
    }
  }

  /**
   * すべてのキャッシュをクリアする。
   *
   * ワークスペースの変更時や拡張の無効化時に呼び出す。
   */
  clear(): void {
    this.cache.clear();
    this.outputChannel?.appendLine('[ConfigCache] すべてのキャッシュをクリアしました。');
  }

  /**
   * すべてのファイルウォッチャーを破棄する。
   *
   * 拡張の無効化時に呼び出す。
   */
  dispose(): void {
    for (const watcher of this.watchers.values()) {
      watcher.dispose();
    }
    this.watchers.clear();
    this.clear();
    this.outputChannel?.appendLine('[ConfigCache] すべてのウォッチャーを破棄しました。');
  }

  /**
   * LRU アルゴリズムで最も古いエントリを削除する。
   */
  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestTime = Number.POSITIVE_INFINITY;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessTime < oldestTime) {
        oldestTime = entry.lastAccessTime;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
      this.outputChannel?.appendLine(`[ConfigCache] LRU で削除: ${oldestKey}`);
    }
  }
}

/** シングルトンインスタンス */
export const configCache = new ConfigCache();
