# CONSTRAINTS.md - プロジェクト制約事項

## 1. 技術的制約

### プラットフォーム制約
- **対応環境**: VS Code 1.85 以上（macOS, Windows, Linux）
- **Node.js**: 18.x 以上（拡張ホストおよびエクスポート時の mermaid-cli 実行）
- **エクスポート**: Pandoc, mermaid-filter / mermaid-cli（mmdc）が利用可能であることを前提とする（オプション機能）

### 開発環境制約
- **言語**: TypeScript 5.x（strict mode 必須）
- **パッケージ**: npm。VS Code 拡張 API（@types/vscode）を使用
- **ビルド**: vsce（Visual Studio Code Extensions）でパッケージング

### 拡張の制約
- Markdown プレビューは VS Code の標準プレビューを拡張するか、カスタム Webview を提供する
- 設定ファイルはワークスペースルートの .mermaid-config.json を優先。未検出時は VS Code 設定またはデフォルト値を使用

## 2. ビジネス制約

### スコープ制約
- 表向きは汎用の「Markdown Mermaid Viewer」。Kindle/EPUB/PDF 対応は差別化として打ち出すが、汎用利用を妨げない
- 既存の Mermaid プレビュー拡張と共存可能な設計とする（置き換えまたは併用をユーザーが選択可能であることが望ましい）

### ライセンス制約
- **使用可能ライセンス**: MIT または Apache 2.0 を想定（プロジェクト方針に従う）
- **依存**: Mermaid.js のライセンス（MIT）に準拠

## 3. 品質制約

### コード品質
- マジックナンバー禁止。名前付き定数または設定から注入
- 関数は 30 行以内を目安に単一責任
- 単体テストで主要ロジックをカバー（80% 以上目標）

### ドキュメント
- AI 仕様駆動開発に従い、docs/MASTER.md を中核に 01-context, 02-design, 03-implementation 等を維持する
- ドキュメント参照時はフォルダパスを含める（例: docs/02-design/ARCHITECTURE.md）
