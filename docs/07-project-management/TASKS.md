# TASKS.md - タスク一覧

## Phase 1 タスク（Issue ベース）

開発計画と Issue のスコープ・受け入れ条件は [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) を参照。GitHub Issue に基づいて作業する。

| Issue | 内容 |
|-------|------|
| #3 | [Epic] Phase 1 MVP: Viewer と .mermaid-config.json 対応（親 Issue） |
| #4 | Viewer を開くボタンと Webview で Markdown + Mermaid 表示 |
| #5 | .mermaid-config.json 読み込みモジュール |
| #6 | Viewer へ設定を注入（Mermaid.initialize） |
| #7 | テーマ・themeVariables 対応（base 時） |
| #8 | README と .mermaid-config.json 例の整備 |

推奨実装順序: #4 → #5（並行可）→ #6 → #7 → #8。ブランチ名は `feature/#<番号>-<簡潔な説明>`（[AGENTS.md](../AGENTS.md) 参照）。

## 参照
- 開発計画・Issue 構成: [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md)
- 実装優先順位: [MASTER.md](../MASTER.md) の「実装優先順位」
- ロードマップ: [ROADMAP.md](./ROADMAP.md)
- 開発フロー: [MASTER.md](../MASTER.md) の「AI仕様駆動 Git Workflow」
