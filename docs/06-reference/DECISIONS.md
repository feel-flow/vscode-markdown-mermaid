# DECISIONS.md - 設計判断記録（ADR）

## ADR-001: 拡張の表向き名称と差別化

- **日付**: 2026-02-03
- **状況**: 拡張を Kindle 本特化とするか、汎用とするか。
- **決定**: 表向きは「Markdown Mermaid Viewer」として汎用のビューアとし、差別化として「Kindle 本・EPUB/PDF にしっかり対応」をうたう。
- **理由**: 一般的な執筆者にも使ってもらいやすくしつつ、Kindle 本著者には「出版対応がきちんとしている」という信頼感を与える。拡張名が「Kindle 専用」に縛られないため、マーケットプレースでの発見も期待できる。

## ADR-002: 設定の単一ソース（.mermaid-config.json）

- **日付**: 2026-02-03
- **状況**: プレビューとエクスポートでデザインを一致させる方法。
- **決定**: プロジェクトルートの .mermaid-config.json をプレビューとエクスポートの両方で参照する。
- **理由**: mermaid-filter は cwd の .mermaid-config.json を mmdc に渡す。同じファイルを拡張のプレビューでも読み込めば、WYSIWYG に近い体験を提供できる。

## ADR-003: 図の形式（EPUB は PNG、PDF は SVG）

- **日付**: 2026-02-03
- **状況**: EPUB/PDF で Mermaid を埋め込む際の画像形式。
- **決定**: EPUB（Kindle）では PNG をデフォルト推奨、PDF では SVG を推奨とする。
- **理由**: Kindle 端末は SVG 対応が機種依存のため、互換性を優先して PNG とする。PDF は weasyprint 等で SVG をそのまま扱え、解像度を保てる。

## ADR-004: ドキュメント構造（AI 仕様駆動開発）

- **日付**: 2026-02-03
- **状況**: 本リポジトリの開発方法論。
- **決定**: ai-spec-driven-development の docs 構造（MASTER.md, 01-context, 02-design, 03-implementation, 06-reference, 07-project-management）を採用する。
- **理由**: AI ツールが迷わず仕様を参照でき、コード生成時の一貫性を保つ。親リポジトリ（ai-spec-driven-development）で検証されたテンプレートを流用する。

## ADR-005: 開発環境の最新化（Node 22, TypeScript 5.9, esbuild）

- **日付**: 2026-02-03
- **状況**: 開発環境が古くなっていた（Node 18+, VS Code 1.85+, TypeScript 5.3）。
- **決定**:
  1. **Node.js 22 以上**を必須とする（VS Code 1.108 内蔵の Node 22.21.1 に合わせる）
  2. **TypeScript 5.9** に更新
  3. **VS Code Extension API 1.100+** を下限とする（最新すぎると古いユーザーが使えないため、半年前程度を下限に）
  4. **esbuild** をビルドツールとして導入（webpack から移行）
  5. **tsconfig.json** の module/moduleResolution を **Node16** に変更
- **理由**:
  - VS Code 内蔵 Node.js に合わせることで、ネイティブモジュールの互換性問題を回避
  - esbuild は VS Code 公式が推奨しており、webpack より10-100倍高速でシンプル
  - Node16 モジュールシステムは ESM/CJS 相互運用が改善され、VS Code 拡張でも安定
- **参考**: [ewanharris/vscode-versions](https://github.com/ewanharris/vscode-versions) で VS Code/Node/Electron のバージョン対応表を確認
