# AI駆動開発マスタードキュメント

## 前提（重要・短文）
- ドキュメントはAIが迷わず理解できることを第一基準とする（人間の可読性は副次）。
- AI生成の推測/補完が混入し得るため、エンジニアは必ず一次情報（ソース/設定/設計資料/実行結果/テスト）で検証し、乖離はSSOTへ即時反映（重複は参照化）。
- 本ガイドの時間表記は目安。チーム/AIの習熟で短縮される。

## 🚨 AIツール向け重要ルール

### 情報不足時の必須確認プロトコル

AIツールは、ドキュメント生成やコード生成時に**情報が不足している場合、推論で埋めずに必ず確認を求めること**。

詳細な確認テンプレート・推論許容範囲は [ai-spec-driven-development の MASTER.md](https://github.com/FEEL-FLOW/ai-spec-driven-development) を参照。

---

## プロジェクト識別情報
- **プロジェクト名**: Markdown Mermaid Viewer（vscode-markdown-mermaid）
- **リポジトリ名**: vscode-markdown-mermaid
- **バージョン**: 0.1.0
- **使用AIツール**: Claude Code, GitHub Copilot, Cursor
- **最終更新日**: 2026-02-03

## プロジェクト概要
- **何を作るか**: VS Code 拡張「Markdown Mermaid Viewer」。Markdown 内の Mermaid 図を洗練されたデザインでプレビューし、Kindle 本・EPUB/PDF にしっかり対応したエクスポートを提供する。
- **なぜ作るか**: 既存の Mermaid プレビュー拡張はデザインの制御が限定的。プレビューと EPUB/PDF 出力で同じ設定（.mermaid-config.json）を使い、執筆〜出版まで一貫した体験を実現する。
- **誰のためか**: Markdown + Mermaid でドキュメント・技術書・Kindle 本を書く著者・技術者。一般的なビューア用途と、Kindle/EPUB/PDF 出版の両方に対応する。

## 技術スタック

### 概要（バージョン付き）

| カテゴリ | 技術 | バージョン | AIへの注意点 |
|---------|------|-----------|-------------|
| Language | TypeScript | 5.9+ | strict mode 必須 |
| Runtime | Node.js | 22.x 以上 | VS Code 内蔵 Node に合わせる |
| 拡張基盤 | VS Code Extension API | 1.100+ | vscode 型定義を参照 |
| 図の描画 | Mermaid.js | 10.x 以上 | themeVariables は base テーマ時のみ |
| エクスポート | Pandoc, mermaid-filter / mermaid-cli | - | 図は SVG/PNG に事前描画 |

### 開発ツール
- パッケージマネージャー: npm
- ビルド: esbuild + @vscode/vsce
- リンター/フォーマッター: ESLint, Prettier
- テスト: Vitest または Mocha（拡張テストは @vscode/test-electron を検討）

※ 詳細な技術選定理由は [ARCHITECTURE.md](./02-design/ARCHITECTURE.md) を参照。

## アーキテクチャパターン
- [x] 拡張は VS Code の Markdown プレビュー／カスタム Webview を拡張
- [x] 設定はプロジェクトルートの .mermaid-config.json を優先して読み込む
- [ ] エクスポート時は mermaid-filter または mermaid-cli を呼び出し（Pandoc 連携）

## コード生成ルール
### 必須事項
1. **型安全性**: すべての変数、関数、API レスポンスに明示的な型定義を付与
2. **エラーハンドリング**: try-catch で適切に処理し、ユーザーに分かりやすいメッセージを表示
3. **テスト**: 主要ロジックに単体テスト（カバレッジ 80% 以上目標）
4. **コメント**: 複雑なロジックには日本語でコメントを追加
5. **リーダブルコード**: 単一責任の原則に従い、関数は 30 行以内を目安に
6. **マジックナンバー禁止**: 意味のある数値/文字列は名前付き定数または設定から注入（単位・範囲を明示）

### 命名規則
- **変数名**: camelCase（例: userName, isActive）
- **定数名**: UPPER_SNAKE_CASE（例: MAX_RETRY_COUNT）
- **型名/インターフェース**: PascalCase（例: MermaidConfig, ExportOptions）
- **ファイル名**: コンポーネントは PascalCase、ユーティリティは camelCase、設定は kebab-case

### 禁止事項
- ❌ any 型の使用（やむを得ない場合はコメントで理由を明記）
- ❌ console.log の本番コードへの残留（VS Code の OutputChannel を使用）
- ❌ マジックナンバーの直接使用
- ❌ 未使用のインポートや変数の放置
- ❌ エラーの握りつぶし

## 実装優先順位
### Phase 1: MVP（必須機能）
1. Markdown プレビュー内で Mermaid コードブロックを描画（.mermaid-config.json を読み込み可能に）
2. テーマ・themeVariables の適用（base テーマ + カスタム色・フォント）
3. プレビューとエクスポートで同じ設定を使うための設定ファイル仕様の確定

### Phase 2: 拡張機能
1. エクスポート: Markdown → Mermaid を画像化（SVG/PNG）→ Pandoc で EPUB/PDF
2. 図の形式の出し分け（EPUB 用 PNG / PDF 用 SVG など）
3. 「新規 Kindle 本プロジェクト」テンプレートまたはウィザード（任意）

### Phase 3: 最適化
1. パフォーマンス（大きなドキュメントでのプレビュー速度）
2. KDP 向けメタデータ補助・目次チェック（任意）

## エラーハンドリング方針
- **設定読み込みエラー**: デフォルト設定にフォールバックし、ユーザーに通知
- **Mermaid 描画エラー**: プレビュー内にエラーメッセージを表示
- **エクスポートエラー**: ログとユーザー向けメッセージで原因を伝える

## セキュリティ要件
- [x] ユーザーの Markdown / 設定ファイルのみを読み取り、外部へ送信しない
- [x] エクスポート時に実行する外部コマンド（Pandoc, mmdc）のパス・引数を検証
- [ ] サンドボックス内での Mermaid 実行（XSS 等のリスク低減）

## パフォーマンス目標
- **プレビュー初回表示**: 2 秒以内（通常サイズの Markdown）
- **図の再描画**: 500ms 以内（設定変更時）
- **エクスポート**: 書籍 1 冊分を 60 秒以内目安（環境依存）

## 開発フロー
1. 要件確認（PROJECT.md 参照）
2. 設計確認（ARCHITECTURE.md 参照）
3. 実装（PATTERNS.md, CONVENTIONS.md 参照）
4. テスト（TESTING.md 参照）
5. パッケージ・公開（DEPLOYMENT.md 参照）

## AI仕様駆動 Git Workflow
- 作業は Issue から開始。ブランチ名: `feature/#{issue-number}-{description}`
- コミットメッセージにドキュメント参照を含める（例: `docs/MASTER.md`）
- PR 作成前にセルフレビュー。マージ後にナレッジを記録。

詳細は [DEPLOYMENT.md](./05-operations/DEPLOYMENT.md) を参照。

## ドキュメント参照順序
- **MASTER.md**（本ファイル）— プロジェクト全体とコード生成ルール
- **01-context/PROJECT.md** — ビジョン・要件
- **02-design/ARCHITECTURE.md** — 技術設計
- **03-implementation/PATTERNS.md** — 実装パターン
- **04-quality/TESTING.md** — テスト戦略（作成後）
- **05-operations/DEPLOYMENT.md** — ビルド・公開手順（作成後）
