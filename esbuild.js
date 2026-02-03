// @ts-check
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * VS Code のビルド問題マッチャー用プラグイン。
 * ビルド開始・終了をコンソールに出力し、エラーを VS Code が認識可能な形式で表示する。
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[build] Build started');
    });
    build.onEnd((result) => {
      // Handle errors
      if (result.errors.length > 0) {
        console.error(`[build] ${result.errors.length} error(s):`);
        for (const error of result.errors) {
          if (error.location) {
            console.error(
              `  > ${error.location.file}:${error.location.line}:${error.location.column}: ${error.text}`
            );
          } else {
            console.error(`  > ${error.text}`);
          }
        }
        // Non-watch mode: exit on errors
        if (!watch) {
          process.exit(1);
        }
      }

      // Handle warnings
      if (result.warnings.length > 0) {
        console.warn(`[build] ${result.warnings.length} warning(s):`);
        for (const warning of result.warnings) {
          if (warning.location) {
            console.warn(
              `  > ${warning.location.file}:${warning.location.line}:${warning.location.column}: ${warning.text}`
            );
          } else {
            console.warn(`  > ${warning.text}`);
          }
        }
      }

      console.log('[build] Build finished');
    });
  },
};

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'out/extension.js',
    external: ['vscode'],
    logLevel: 'warning',
    plugins: [esbuildProblemMatcherPlugin],
  });

  if (watch) {
    console.log('[watch] Watching for changes...');
    await ctx.watch();
  } else {
    try {
      await ctx.rebuild();
    } finally {
      await ctx.dispose();
    }
  }
}

main().catch((e) => {
  console.error('[build] Fatal error:', e);
  process.exit(1);
});
