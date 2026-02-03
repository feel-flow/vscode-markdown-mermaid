# PATTERNS.md - 実装パターン

## 1. 設定の読み込み

### パターン: ワークスペース設定の優先
1. `vscode.workspace.workspaceFolders` からルートを取得
2. ルート直下の `.mermaid-config.json` を `fs.readFileSync` または `fs.promises.readFile` で読み取り
3. JSON パースに失敗した場合はデフォルト設定にフォールバックし、OutputChannel に警告を出す
4. 取得した設定を Mermaid.initialize() に渡す（theme, themeVariables, themeCSS）

### 定数化
- デフォルトテーマ名: `DEFAULT_MERMAID_THEME = 'neutral'`（印刷・EPUB 向け）
- デフォルト図の幅: `DEFAULT_DIAGRAM_WIDTH = 800`（px）
- 設定ファイル名: `MERMAID_CONFIG_FILENAME = '.mermaid-config.json'`

## 2. Mermaid の描画（プレビュー）

### パターン: 非同期描画
- Mermaid.run() は非同期。プレビューでは then/catch で完了・エラーを扱う
- エラー時はプレビュー内に「図の描画に失敗しました」と表示し、元のコードブロックを表示するフォールバックも検討する

### テーマの適用
- theme が `base` のときのみ themeVariables を有効にする（Mermaid の仕様）
- themeCSS は文字列で渡す。.mermaid.css を別ファイルで読み、その内容を themeCSS に渡すことも可能

## 3. エクスポート（EPUB/PDF）

### パターン: 外部コマンドの呼び出し
1. mermaid-filter が利用可能か確認（`npm list -g mermaid-filter` または which）
2. 利用可能なら `pandoc -F mermaid-filter` で Markdown → 画像埋め込み → EPUB/PDF
3. 作業ディレクトリを書籍ルートにし、.mermaid-config.json が同じディレクトリにあるようにする
4. 環境変数 `MERMAID_FILTER_FORMAT=svg`（PDF 用）または `png`（EPUB 用）を設定

### エラーハンドリング
- コマンドが見つからない場合: 「mermaid-filter をインストールしてください: npm i -g mermaid-filter」と表示
- 実行失敗時: 子プロセスの stderr を取得し、ユーザーに表示する

## 4. 定数・設定の配置
- 拡張内で使う定数は `src/constants.ts` または各モジュールの先頭で定義する
- 単位と有効範囲をコメントで明示する。例: `/** 図のデフォルト幅（px）。最小 400、最大 2000 */`
