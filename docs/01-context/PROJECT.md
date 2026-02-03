# PROJECT.md - プロジェクト定義書

## 1. プロジェクト識別情報

### プロジェクト名
Markdown Mermaid Viewer（vscode-markdown-mermaid）

### バージョン
0.1.0

### 最終更新日
2026-02-03

## 2. プロジェクトビジョン

### ミッションステートメント
Markdown 内の Mermaid 図を、洗練されたデザインでプレビューし、Kindle 本・EPUB/PDF にしっかり対応したエクスポートを提供する VS Code 拡張を開発する。

### ビジネス価値
- **一般的な執筆者**: Mermaid のプレビューが美しく、設定（.mermaid-config.json）でテーマ・色・フォントを統一できる。
- **Kindle 本・技術書の著者**: プレビューと EPUB/PDF 出力で同じ見た目を実現し、執筆〜出版まで一貫した体験を提供する。
- **発見しやすさ**: 拡張名は汎用の「Markdown Mermaid Viewer」とし、差別化として「Kindle/EPUB/PDF にしっかり対応」をうたう。

### 成功指標
- プレビューで .mermaid-config.json の themeVariables が反映される
- エクスポート（EPUB/PDF）で Mermaid が図として埋め込まれる（コードブロックのままではない）
- 既存の Mermaid プレビュー拡張より「デザインの制御」と「出版対応」で優位である

## 3. ステークホルダー分析

### 主要ステークホルダー
| ステークホルダー | 役割 | 期待値 | 影響度 |
|-----------------|------|--------|--------|
| 技術書・ドキュメント執筆者 | 利用者 | きれいな Mermaid プレビューと EPUB/PDF 出力 | 高 |
| Kindle 本著者 | 利用者 | KDP 提出可能な EPUB/PDF に図が正しく含まれる | 高 |
| 開発チーム | 開発・保守 | 仕様の明確化と AI 仕様駆動開発での効率化 | 中 |

## 4. 要件定義

### 機能要件

#### コア機能（Phase 1）
- [ ] Markdown プレビュー内で Mermaid コードブロックを描画する
- [ ] プロジェクトルートの .mermaid-config.json を読み込み、テーマ・themeVariables を適用する
- [ ] 組み込みテーマ（default, neutral, dark, forest, base）および base 時の themeVariables に対応する

#### 拡張機能（Phase 2）
- [ ] エクスポート: Markdown + Mermaid → 図を画像化（SVG/PNG）→ Pandoc で EPUB/PDF
- [ ] 図の形式の出し分け（EPUB 用 PNG / PDF 用 SVG など）
- [ ] 解像度・幅の設定オプション

#### 任意（Phase 3）
- [ ] 「新規 Kindle 本プロジェクト」テンプレート
- [ ] KDP 向けメタデータ補助・目次チェック

### 非機能要件
- **パフォーマンス**: プレビュー初回表示 2 秒以内目安、図の再描画 500ms 以内目安
- **セキュリティ**: ユーザーのファイルのみ読み取り、外部送信しない。外部コマンド実行時はパス・引数を検証
- **互換性**: VS Code 1.85 以上、Node 18 以上を想定

## 5. スコープ定義

### 含まれるもの
- VS Code 拡張としての Markdown Mermaid プレビュー（.mermaid-config.json 対応）
- EPUB/PDF エクスポート時の Mermaid 図の描画（mermaid-filter または mermaid-cli 連携）
- プロジェクト単位の設定ファイルによるデザイン統一

### 含まれないもの
- Mermaid の文法エディタ・オートコンプリート（既存拡張に委ねる）
- クラウド連携・認証
- 複数ユーザー向けのサーバー機能

## 6. リスクと前提条件

### 主要リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| mermaid-cli / Puppeteer の環境差異 | 中 | インストール手順の明文化、フォールバック動作の定義 |
| VS Code API の変更 | 低 | 型定義とリリースノートの確認 |

### 前提条件
- ユーザーは Pandoc / Node をインストール可能である（エクスポート利用時）
- .mermaid-config.json のスキーマは Mermaid 公式の themeVariables に準拠する
