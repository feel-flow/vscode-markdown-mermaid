# CONVENTIONS.md - コーディング規約

## 0. ドキュメント命名規則

このプロジェクトでは、AI 仕様駆動開発に従い、docs 以下のディレクトリ・ファイル名を統一する。

### ディレクトリ構造
```
docs/
├── MASTER.md
├── 01-context/
│   ├── PROJECT.md
│   └── CONSTRAINTS.md
├── 02-design/
│   └── ARCHITECTURE.md
├── 03-implementation/
│   ├── CONVENTIONS.md
│   └── PATTERNS.md
├── 06-reference/
│   ├── GLOSSARY.md
│   └── DECISIONS.md
└── 07-project-management/
    ├── ROADMAP.md
    └── TASKS.md
```

### ファイル命名
- メインドキュメント: 英語大文字.md（MASTER.md, ARCHITECTURE.md 等）
- ディレクトリ: 数字-英語小文字（ハイフン区切り）。日本語・スペース・アンダースコアは使わない。

## 1. TypeScript 規約

### 型
- strict モードを有効にする。any は禁止。unknown または明示的な型を使用する。
- 公開 API は interface または type で明示する。Mermaid 設定は MermaidConfig 等の型を定義する。

### 命名
- 変数・関数: camelCase
- 定数: UPPER_SNAKE_CASE
- 型・interface: PascalCase
- ファイル: コンポーネント・クラスは PascalCase、ユーティリティは camelCase

### エラー・ログ
- 本番コードに console.log を残さない。VS Code の OutputChannel または Diagnostic を使用する。
- エラーは握りつぶさず、ユーザーに伝えるかログに記録する。

## 2. VS Code 拡張規約

### 拡張 ID
- パブリッシャーと拡張 ID は package.json で定義する。例: `"name": "markdown-mermaid-viewer"`

### 設定キー
- 設定は `markdownMermaidViewer.*` のように名前空間を付ける（キャメルケース）。例: `markdownMermaidViewer.theme`, `markdownMermaidViewer.exportFormat`

### コマンド ID
- コマンドは `markdownMermaidViewer.exportToEpub` のように拡張名を含める。

## 3. マジックナンバー禁止
- 意味のある数値・文字列は定数または設定に抽出する。例: デフォルトの図の幅 800 → `DEFAULT_DIAGRAM_WIDTH`、テーマ名 `"neutral"` → 設定または定数 `DEFAULT_THEME`。
- 単位（px, ms）と有効範囲をコメントまたは型で明示する。

## 4. テスト
- 単体テストは Vitest または Mocha を使用。拡張の起動テストは @vscode/test-electron を検討する。
- テストファイルは `*.test.ts` または `__tests__` に配置する。
- カバレッジ 80% 以上を目標とする。
