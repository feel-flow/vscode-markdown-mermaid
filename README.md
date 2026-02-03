# Markdown Mermaid Viewer（vscode-markdown-mermaid）

VS Code 拡張「**Markdown Mermaid Viewer**」のリポジトリです。Markdown 内の Mermaid 図を洗練されたデザインでプレビューし、**Kindle 本・EPUB/PDF にしっかり対応**したエクスポートを提供することを目指します。

## プロジェクトの位置づけ
- **表向き**: 汎用の Markdown 内 Mermaid ビューア
- **差別化**: Kindle 本・EPUB/PDF にしっかり対応（プレビューとエクスポートで同じ設定を使用）

## 開発方法（AI 仕様駆動開発）
本プロジェクトは [AI Spec Driven Development](https://github.com/FEEL-FLOW/ai-spec-driven-development) の考え方に従い、仕様書を中核に開発を進めます。

### 必読ドキュメント
- **作業開始前**: [docs/MASTER.md](docs/MASTER.md) を必ず読む
- **要件**: [docs/01-context/PROJECT.md](docs/01-context/PROJECT.md)
- **設計**: [docs/02-design/ARCHITECTURE.md](docs/02-design/ARCHITECTURE.md)
- **実装**: [docs/03-implementation/PATTERNS.md](docs/03-implementation/PATTERNS.md), [CONVENTIONS.md](docs/03-implementation/CONVENTIONS.md)
- **用語・判断**: [docs/06-reference/GLOSSARY.md](docs/06-reference/GLOSSARY.md), [DECISIONS.md](docs/06-reference/DECISIONS.md)
- **ロードマップ**: [docs/07-project-management/ROADMAP.md](docs/07-project-management/ROADMAP.md)

### AI ツール（Cursor / Claude / Copilot）を使う場合
- ルートの [.cursorrules](.cursorrules) および [AGENTS.md](AGENTS.md) に、MASTER.md 参照とコード生成ルールを記載しています。コード生成前に `docs/MASTER.md` を参照してください。

## 現状
- **Phase 1（MVP）**: これから実装を開始します（Mermaid プレビュー + .mermaid-config.json 対応）
- **Phase 2**: エクスポート（mermaid-filter + Pandoc で EPUB/PDF）
- **Phase 3**: 最適化・任意機能（KDP 向け補助等）

## ライセンス
未定（MIT または Apache 2.0 を想定）
