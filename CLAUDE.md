# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 必読ドキュメント

作業開始前に必ず **[docs/MASTER.md](docs/MASTER.md)** を読むこと。コード生成ルール、禁止事項、実装優先順位が記載されている。

## Git Workflow（必須）

Issue に基づく作業では **必ず** 以下に従うこと。詳細は [AGENTS.md](AGENTS.md) の「Git Workflow」を参照。

1. **実装前にブランチを作成する**: `feature/#<Issue番号>-<簡潔な説明>`（例: `feature/#4-viewer-button-webview`）。
2. **develop/main で直接実装しない**: すべての変更は feature ブランチで行い、PR でマージする。
3. 流れ: Issue 確認 → ブランチ作成 → 実装 → コミット → 自己レビュー → PR 作成。

### ドキュメント構造
- `docs/MASTER.md` — プロジェクト全体とコード生成ルール（最重要）
- `docs/01-context/PROJECT.md` — ビジョン・要件
- `docs/02-design/ARCHITECTURE.md` — システムアーキテクチャ
- `docs/03-implementation/PATTERNS.md` — 実装パターン
- `docs/03-implementation/CONVENTIONS.md` — コーディング規約

## プロジェクト概要

VS Code 拡張「**Markdown Mermaid Viewer**」。Markdown 内の Mermaid 図を `.mermaid-config.json` に基づいてプレビューし、Kindle 本・EPUB/PDF エクスポートに対応する。

### 技術スタック
- TypeScript 5.9+（strict mode必須）
- Node.js 22.x 以上（VS Code 内蔵 Node に合わせる）
- VS Code Extension API 1.100+
- Mermaid.js 10.x+
- ビルド: esbuild 0.27+
- エクスポート: Pandoc + mermaid-filter / mermaid-cli

## 開発コマンド

```bash
# 依存インストール
npm install

# 型チェックのみ
npm run check-types

# ビルド（型チェック + esbuild）
npm run compile

# ウォッチモード（ファイル変更時に自動リビルド）
npm run watch

# 本番用パッケージビルド（minify有効）
npm run package

# リント（未実装）
npm run lint

# テスト（未実装）
npm run test

# 拡張パッケージ作成（.vsix生成）
npx vsce package
```

## アーキテクチャ

```
┌─────────────────────────────────────┐
│  Presentation (Webview / Preview)    │  Mermaid 描画表示
├─────────────────────────────────────┤
│  Application (Commands, Config)     │  設定読み込み、エクスポート制御
├─────────────────────────────────────┤
│  Domain (Mermaid Config Schema)     │  テーマ・themeVariables の型
├─────────────────────────────────────┤
│  Infrastructure (FS, Child Process)  │  設定読み取り、外部ツール実行
└─────────────────────────────────────┘
```

### 設定の優先順位
1. ワークスペースルートの `.mermaid-config.json`
2. VS Code 設定 (`markdownMermaidViewer.*`)
3. デフォルト設定（neutral テーマ）

## コード規約（クイックリファレンス）

### 命名
- 変数・関数: `camelCase`
- 定数: `UPPER_SNAKE_CASE`（例: `DEFAULT_DIAGRAM_WIDTH`）
- 型・interface: `PascalCase`

### 禁止事項
- ❌ `any` 型（`unknown` を使用）
- ❌ `console.log`（VS Code OutputChannel を使用。ビルドスクリプトは例外）
- ❌ マジックナンバー（定数化し、単位・範囲をコメントで明示）
- ❌ エラーの握りつぶし

### 定数の例
```typescript
/** 図のデフォルト幅（px）。最小 400、最大 2000 */
const DEFAULT_DIAGRAM_WIDTH = 800;

const MERMAID_CONFIG_FILENAME = '.mermaid-config.json';
const DEFAULT_MERMAID_THEME = 'neutral';
```

## 実装フェーズ

現在 **Phase 1（MVP）** を実装中。

1. **Phase 1**: Mermaid プレビュー + .mermaid-config.json 対応
2. **Phase 2**: EPUB/PDF エクスポート（mermaid-filter + Pandoc）
3. **Phase 3**: パフォーマンス最適化、KDP 向け補助機能
