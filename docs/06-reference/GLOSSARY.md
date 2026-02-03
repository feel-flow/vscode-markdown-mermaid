# GLOSSARY.md - 用語集

| 用語 | 説明 |
|------|------|
| **Markdown Mermaid Viewer** | 本拡張の表向きの名称。Markdown 内の Mermaid をプレビューし、Kindle/EPUB/PDF にしっかり対応する。 |
| **.mermaid-config.json** | プロジェクトルートに置く Mermaid の設定ファイル。theme, themeVariables, themeCSS を指定する。プレビューとエクスポートで共有する。 |
| **themeVariables** | Mermaid の base テーマで使用できる変数群。primaryColor, primaryTextColor, lineColor, fontFamily, fontSize 等。hex で指定する。 |
| **mermaid-filter** | Pandoc 用フィルタ。Markdown 内の Mermaid コードブロックを画像（SVG/PNG）に変換し、AST に埋め込む。 |
| **mermaid-cli (mmdc)** | Mermaid 図をコマンドラインから SVG/PNG/PDF に変換するツール。mermaid-filter は内部で mmdc を呼び出す。 |
| **KDP** | Kindle Direct Publishing。Amazon の電子書籍・紙版の自費出版プラットフォーム。 |
| **EPUB** | 電子書籍の標準フォーマット。KDP では EPUB をアップロードして Kindle 本として配信する。 |
| **AI 仕様駆動開発** | 仕様書（MASTER.md, PROJECT.md, ARCHITECTURE.md 等）を中核に、AI ツールと協調して開発する方法論。本リポジトリは ai-spec-driven-development の考え方に従う。 |
