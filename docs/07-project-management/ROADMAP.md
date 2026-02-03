# ROADMAP.md - ロードマップ

## Phase 1: MVP（必須機能）
- [ ] VS Code 拡張のスキャフォールド（package.json, extension.ts, アクティベート）
- [ ] Markdown プレビュー内で Mermaid コードブロックを描画
- [ ] ワークスペースルートの .mermaid-config.json を読み込み、Mermaid.initialize() に渡す
- [ ] テーマ（default, neutral, dark, forest, base）および base 時の themeVariables に対応
- [ ] ドキュメント・README の整備（使い方、.mermaid-config.json の例）

## Phase 2: 拡張機能（エクスポート）
- [ ] エクスポート: Markdown + Mermaid → mermaid-filter で図を画像化 → Pandoc で EPUB/PDF
- [ ] 図の形式の出し分け（EPUB 用 PNG / PDF 用 SVG）のオプション
- [ ] 解像度・幅の設定オプション
- [ ] 未インストール時の案内（mermaid-filter, Pandoc のインストール手順）

## Phase 3: 最適化・任意機能
- [ ] プレビュー・エクスポートのパフォーマンス改善
- [ ] 「新規 Kindle 本プロジェクト」テンプレート（任意）
- [ ] KDP 向けメタデータ補助・目次チェック（任意）
- [ ] VS Code Marketplace への公開
