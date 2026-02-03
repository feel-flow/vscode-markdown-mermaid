# AIエージェント向けガイド

この文書は、本プロジェクト（Markdown Mermaid Viewer / vscode-markdown-mermaid）で作業する AI エージェント（Claude Code, GitHub Copilot, Cursor 等）向けの統一ガイドです。

## 言語設定
**すべての応答・解説・コード内コメントは日本語で行ってください。**

## MANDATORY: 作業開始前に MASTER.md を参照
**このプロジェクトで作業を開始する前に、必ず `docs/MASTER.md` を読み、内容を理解してください。**

### なぜ MASTER.md が重要なのか
MASTER.md には以下が含まれます：
- プロジェクト識別情報（名前、バージョン、使用 AI ツール）
- 技術スタック（TypeScript, VS Code Extension API, Mermaid.js）
- コード生成ルール（型安全性、マジックナンバー禁止、命名規則）
- 実装優先順位（Phase 1: プレビュー、Phase 2: エクスポート、Phase 3: 最適化）
- 禁止事項・必須事項

### MASTER.md を参照しない場合のリスク
- プロジェクトの技術スタックと異なる実装を生成する
- 禁止パターン（any 型、マジックナンバー等）を使用する
- 拡張の責務（プレビュー + Kindle/EPUB/PDF 対応）から外れた機能を提案する

## 情報不足時の確認ルール
**情報が不足している場合は推論で埋めず、必ず確認を求めること。**  
確認テンプレート・推論許容範囲は [ai-spec-driven-development の MASTER.md](https://github.com/FEEL-FLOW/ai-spec-driven-development) を参照。

## ドキュメント構造（番号付きフォルダ）
```
docs/
├── MASTER.md
├── 01-context/     (PROJECT.md, CONSTRAINTS.md)
├── 02-design/      (ARCHITECTURE.md)
├── 03-implementation/ (CONVENTIONS.md, PATTERNS.md)
├── 06-reference/   (GLOSSARY.md, DECISIONS.md)
└── 07-project-management/ (ROADMAP.md, TASKS.md)
```
新しいドキュメントは上記のいずれかのフォルダに配置し、参照時はフォルダパスを含める（例: `docs/02-design/ARCHITECTURE.md`）。

## Git Workflow（AI 仕様駆動開発）

本プロジェクトでは、[AI 仕様駆動開発](https://github.com/FEEL-FLOW/ai-spec-driven-development) の Git Flow ベースのワークフローに従います。

### Workflow 概要

```
1. Issue 作成 → 2. ブランチ作成 → 3. プラン作成（任意）
    ↓
4. 実装 → 5. 自己レビュー → 6. PR 作成
    ↓
7. レビュー → 8. 指摘対応 → 9. 再レビュー（必要に応じて繰り返し）
    ↓
10. マージ可能 → ユーザー確認 → 11. マージ → 12. クリーンナップ
```

### ステップごとの手順

#### 1. Issue 作成
- タスクの内容を明確にした Issue を GitHub に作成する
- 適切なラベルを付与する（enhancement, bug, docs 等）

#### 2. ブランチ作成
- Issue 番号を含むブランチ名で作成する
- **命名規則**: `feature/#<issue番号>-<簡潔な説明>`
- 例: `feature/#1-add-mermaid-preview`, `feature/#2-load-mermaid-config`

#### 3. プラン作成（任意）
- 複雑なタスクの場合はプランを作成し、ユーザー承認を得てから実装を開始する

#### 4. 実装
- [docs/MASTER.md](docs/MASTER.md) および [docs/03-implementation/PATTERNS.md](docs/03-implementation/PATTERNS.md) に従って実装する
- 小さな単位でコミットする

#### 5. 自己レビュー（Pre-commit）
- コミット前に内容を確認する
- 明らかなミス・MASTER.md 違反を修正する

#### 6. PR 作成
- ブランチを push し、PR を作成する
- PR 本文に変更概要・関連 Issue ・確認してほしい点を記載する

#### 7. レビュー
- レビュー指摘があれば対応する
- 必要に応じてテスト・ドキュメントを追加する

#### 8. 指摘対応
- レビュー結果に基づき修正する
- 対応可能な指摘はすべて対応する

#### 9. 再レビュー
- 修正完了後、再度レビューを依頼する
- 問題がなくなるまで 8–9 を繰り返す

#### 10. マージ確認
- すべての指摘に対応完了後、**必ずユーザーに確認を取る**
- 「マージしてよろしいですか？」と確認する

#### 11. マージ
- ユーザー承認後に PR をマージする

#### 12. クリーンナップ
- マージ済みブランチを削除する
- メインブランチ（main または develop）に戻る

### 重要なルール

1. **PR マージ前には必ずユーザー確認を取ること**
2. **レビュー指摘は可能な限りすべて対応すること**
3. **ブランチはマージ後にクリーンナップすること**
4. **大きな変更は複数の PR に分割すること**
5. **コミットメッセージにドキュメント参照を含める**（例: `docs/MASTER.md`, `docs/02-design/ARCHITECTURE.md`）

### 開発フロー（要約）
- 作業は Issue から開始。ブランチ名: `feature/#<issue番号>-<説明>`
- コミットメッセージにドキュメント参照を含める
- PR 作成前にセルフレビュー。マージ後にナレッジを記録（任意: CHANGELOG や docs/06-reference/DECISIONS.md）

## コード生成時のチェックリスト
- [ ] MASTER.md のルールに従っている
- [ ] マジックナンバー・ハードコードがない
- [ ] 型安全性が確保されている
- [ ] エラーハンドリングが適切
- [ ] 命名規則（camelCase, UPPER_SNAKE_CASE, PascalCase）に従っている
- [ ] 定数は単位・有効範囲をコメントで明示している
