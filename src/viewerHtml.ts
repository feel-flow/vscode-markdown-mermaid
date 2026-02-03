/**
 * Viewer 用 HTML 生成
 * docs/02-design/ARCHITECTURE.md, docs/03-implementation/PATTERNS.md を参照。
 *
 * Phase 3: レンダーキャッシュを統合してプレビュー再描画を高速化。
 */

import MarkdownIt from 'markdown-it';
import { MERMAID_CDN_URL, VIEWER_RENDER_ERROR_MESSAGE } from './constants';
import { renderCache } from './renderCache';
import type { MermaidConfig } from './types';

/** 生 HTML を無効化して XSS を防ぐ（docs/MASTER.md セキュリティ要件）。 */
const md = new MarkdownIt({ html: false });

/** ```mermaid ... ``` のブロックを分割する正規表現（改行付き）。 */
const MERMAID_BLOCK_REGEX = /```mermaid\s*\n([\s\S]*?)```/gi;

/**
 * HTML にエスケープして挿入する（XSS と script 抜け対策）。
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Markdown 本文を Mermaid ブロックとそれ以外に分割する。
 * @returns [{ kind: 'markdown'|'mermaid', content: string }, ...]
 */
function splitMarkdownAndMermaid(markdown: string): Array<{ kind: 'markdown' | 'mermaid'; content: string }> {
  MERMAID_BLOCK_REGEX.lastIndex = 0;
  const segments: Array<{ kind: 'markdown' | 'mermaid'; content: string }> = [];
  const matches = [...markdown.matchAll(MERMAID_BLOCK_REGEX)];
  let lastIndex = 0;
  for (const m of matches) {
    const start = typeof m.index === 'number' ? m.index : 0;
    const before = markdown.slice(lastIndex, start);
    if (before.length > 0) {
      segments.push({ kind: 'markdown', content: before });
    }
    const mermaidContent = m[1];
    if (mermaidContent !== undefined) {
      segments.push({ kind: 'mermaid', content: mermaidContent.trim() });
    }
    lastIndex = start + (m[0]?.length ?? 0);
  }
  const after = markdown.slice(lastIndex);
  if (after.length > 0) {
    segments.push({ kind: 'markdown', content: after });
  }
  if (segments.length === 0 && markdown.length > 0) {
    segments.push({ kind: 'markdown', content: markdown });
  }
  return segments;
}

/**
 * MermaidConfig を JSON 文字列に変換する。
 * - theme !== 'base' の場合、themeVariables は除外される（Mermaid 仕様）
 * - 循環参照や BigInt などで失敗した場合はエラーをスローする
 */
function stringifyMermaidConfig(config: MermaidConfig): string {
  // base テーマ以外では themeVariables を除外（Mermaid の仕様に準拠）
  const { themeVariables, ...restConfig } = config;
  const effectiveConfig: MermaidConfig =
    config.theme === 'base'
      ? { ...config, startOnLoad: false }
      : { ...restConfig, startOnLoad: false };

  try {
    return JSON.stringify(effectiveConfig);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Mermaid 設定の JSON 変換に失敗しました。.mermaid-config.json を確認してください。詳細: ${detail}`
    );
  }
}

/**
 * Viewer 用の HTML 文字列を生成する。
 * Markdown は markdown-it で HTML に変換し、Mermaid ブロックは div.mermaid で Mermaid.js に描画させる。
 *
 * Phase 3 修正: レンダーキャッシュを使用して再描画を高速化。
 * キャッシュヒット時はレンダリングをスキップして即座に HTML を返す。
 *
 * @param markdown - 表示する Markdown 本文
 * @param cspSource - Webview の cspSource（CSP に含める）
 * @param nonce - インライン script 用 nonce
 * @param mermaidConfig - Mermaid 設定（.mermaid-config.json から読み込んだもの）
 * @throws {Error} MermaidConfig の JSON 変換に失敗した場合
 */
export function getViewerHtml(
  markdown: string,
  cspSource: string,
  nonce: string,
  mermaidConfig: MermaidConfig
): string {
  // Phase 3: レンダーキャッシュをチェック
  const cachedHtml = renderCache.get(markdown, mermaidConfig);
  if (cachedHtml !== undefined) {
    // キャッシュヒット: レンダリングをスキップして即座に返す
    return cachedHtml;
  }

  // キャッシュミス: 通常のレンダリングを実行
  // 設定を JSON 文字列に変換（失敗時はここでエラーがスローされる）
  const mermaidConfigJson = stringifyMermaidConfig(mermaidConfig);

  const segments = splitMarkdownAndMermaid(markdown);
  const bodyParts: string[] = [];

  for (const seg of segments) {
    if (seg.kind === 'markdown') {
      bodyParts.push(md.render(seg.content));
    } else {
      bodyParts.push(
        `<div class="mermaid">${escapeHtml(seg.content)}</div>`
      );
    }
  }

  const bodyHtml = bodyParts.join('\n');
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' ${cspSource} https://cdn.jsdelivr.net`,
    `style-src 'unsafe-inline' ${cspSource} https://cdn.jsdelivr.net`,
    `img-src ${cspSource} https: data:`,
  ].join('; ');

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <script nonce="${nonce}" src="${MERMAID_CDN_URL}"></script>
</head>
<body>
  <div class="viewer-content">${bodyHtml}</div>
  <script nonce="${nonce}">
    (function() {
      if (typeof mermaid === 'undefined') {
        var el = document.querySelector('.viewer-content');
        if (el) {
          var p = document.createElement('p');
          p.className = 'mermaid-error';
          p.textContent = 'Mermaid の読み込みに失敗しました。';
          el.appendChild(p);
        }
        return;
      }
      try {
        mermaid.initialize(${mermaidConfigJson});
      } catch (initErr) {
        var el = document.querySelector('.viewer-content');
        if (el) {
          var p = document.createElement('p');
          p.className = 'mermaid-error';
          p.textContent = 'Mermaid 設定の初期化に失敗しました。.mermaid-config.json を確認してください。';
          el.appendChild(p);
        }
        console.error('Mermaid initialize error:', initErr);
        return;
      }
      var containers = document.querySelectorAll('.mermaid');
      if (containers.length === 0) return;
      mermaid.run({ nodes: Array.from(containers) }).catch(function(err) {
        var root = document.querySelector('.viewer-content');
        if (!root) return;
        var msg = document.createElement('p');
        msg.className = 'mermaid-error';
        msg.textContent = '${escapeHtml(VIEWER_RENDER_ERROR_MESSAGE)}';
        root.appendChild(msg);
        console.error('Mermaid run error:', err);
      });
    })();
  </script>
</body>
</html>`;

  // Phase 3: レンダリング結果をキャッシュに保存
  renderCache.set(markdown, mermaidConfig, html);

  return html;
}
