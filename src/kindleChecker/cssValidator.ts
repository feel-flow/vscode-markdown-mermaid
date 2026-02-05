/**
 * Kindle CSS バリデーター
 *
 * themeCSS フィールドの CSS を解析し、
 * Kindle 互換性の問題を検出・報告する。
 */

import {
  KINDLE_CSS_RULES,
  SEVERITY_EMOJI,
  SEVERITY_PRIORITY,
  type CssRuleSeverity,
  type KindleCssRule,
} from './kindleCssRules';

/** CSS 検証で検出された問題 */
export interface CssValidationIssue {
  /** 違反したルール */
  readonly rule: KindleCssRule;
  /** 問題が検出された行番号（1始まり） */
  readonly line: number;
  /** 問題が検出された列番号（1始まり） */
  readonly column: number;
  /** マッチした CSS テキスト */
  readonly matchedText: string;
}

/** CSS 検証結果 */
export interface CssValidationResult {
  /** 検出された問題のリスト（重大度でソート済み） */
  readonly issues: readonly CssValidationIssue[];
  /** Critical レベルの問題数 */
  readonly criticalCount: number;
  /** Warning レベルの問題数 */
  readonly warningCount: number;
  /** Info レベルの問題数 */
  readonly infoCount: number;
  /** 検証が成功したか（critical が 0 の場合 true） */
  readonly isValid: boolean;
}

/**
 * CSS テキストを検証し、Kindle 互換性の問題を検出する
 *
 * @param css - 検証対象の CSS テキスト
 * @returns 検証結果（問題リスト、カウント、有効性フラグ）
 */
export function validateCss(css: string): CssValidationResult {
  // 入力検証
  if (!css || typeof css !== 'string') {
    return {
      issues: [],
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      isValid: true,
    };
  }

  const issues: CssValidationIssue[] = [];
  const lines = css.split('\n');

  // パターンのコピーを事前に作成（パフォーマンス最適化）
  const patterns = KINDLE_CSS_RULES.map((rule) => ({
    rule,
    pattern: new RegExp(rule.pattern.source, rule.pattern.flags),
  }));

  // 各行を検証
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineNumber = lineIndex + 1;

    // 各ルールをチェック
    for (const { rule, pattern } of patterns) {
      // lastIndex をリセットして再利用
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(line)) !== null) {
        issues.push({
          rule,
          line: lineNumber,
          column: match.index + 1,
          matchedText: match[0],
        });
      }
    }
  }

  // 重大度でソート
  issues.sort((a, b) => {
    const priorityDiff =
      SEVERITY_PRIORITY[a.rule.severity] - SEVERITY_PRIORITY[b.rule.severity];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    // 同じ重大度なら行番号でソート
    return a.line - b.line;
  });

  // カウントを集計
  const counts = countBySeverity(issues);

  return {
    issues,
    criticalCount: counts.critical,
    warningCount: counts.warning,
    infoCount: counts.info,
    isValid: counts.critical === 0,
  };
}

/**
 * 重大度ごとの問題数をカウント
 */
function countBySeverity(
  issues: readonly CssValidationIssue[]
): Record<CssRuleSeverity, number> {
  const counts: Record<CssRuleSeverity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
  };

  for (const issue of issues) {
    counts[issue.rule.severity]++;
  }

  return counts;
}

/**
 * 検証結果を人間可読な文字列にフォーマット
 *
 * @param result - 検証結果
 * @returns フォーマットされた文字列
 */
export function formatValidationResult(result: CssValidationResult): string {
  if (result.issues.length === 0) {
    return '\u2705 Kindle CSS チェック: 問題は検出されませんでした';
  }

  const lines: string[] = [];

  // サマリー
  lines.push('Kindle CSS チェック結果:');
  lines.push(
    `  ${SEVERITY_EMOJI.critical} Critical: ${result.criticalCount}  ` +
      `${SEVERITY_EMOJI.warning} Warning: ${result.warningCount}  ` +
      `${SEVERITY_EMOJI.info} Info: ${result.infoCount}`
  );
  lines.push('');

  // 問題の詳細
  for (const issue of result.issues) {
    const emoji = SEVERITY_EMOJI[issue.rule.severity];
    const location = `${issue.line}:${issue.column}`;
    lines.push(`${emoji} [${location}] ${issue.rule.message}`);
    lines.push(`   マッチ: "${issue.matchedText}"`);
    if (issue.rule.suggestion) {
      lines.push(`   提案: ${issue.rule.suggestion}`);
    }
    lines.push('');
  }

  // 結論
  if (!result.isValid) {
    lines.push(
      '\u{1F6A8} Critical な問題が検出されました。Kindle エクスポート前に修正が必要です。'
    );
  } else if (result.warningCount > 0) {
    lines.push(
      '\u26A0\uFE0F Warning が検出されました。確認することを推奨します。'
    );
  }

  return lines.join('\n');
}

/**
 * 検証結果を VS Code の診断情報形式にフォーマット
 * （将来の VS Code 統合用）
 *
 * @param result - 検証結果
 * @returns 診断情報の配列
 */
export function toVsCodeDiagnostics(result: CssValidationResult): Array<{
  severity: 'error' | 'warning' | 'information';
  line: number;
  column: number;
  message: string;
  code: string;
}> {
  return result.issues.map((issue) => ({
    severity: mapSeverityToVsCode(issue.rule.severity),
    line: issue.line,
    column: issue.column,
    message: issue.rule.suggestion
      ? `${issue.rule.message} - ${issue.rule.suggestion}`
      : issue.rule.message,
    code: issue.rule.id,
  }));
}

/**
 * 重大度を VS Code の診断レベルにマッピング
 */
function mapSeverityToVsCode(
  severity: CssRuleSeverity
): 'error' | 'warning' | 'information' {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'information';
  }
}
