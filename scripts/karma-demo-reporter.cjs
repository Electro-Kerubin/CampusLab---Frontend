//PARA TESTING
const C = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

function DemoReporter(baseReporterDecorator) {
  baseReporterDecorator(this);
  const results = [];
  const started = Date.now();

  this.onBrowserLog = () => {};
  this.onBrowserStart = () => {};

  this.specSuccess = this.specFailure = this.specSkipped = (_browser, result) => results.push(result);

  this.onRunComplete = (_browsers, summary) => {
    const out = [];
    const bySuite = new Map();
    for (const r of results) {
      const key = r.suite[0] ?? '(sin describe)';
      if (!bySuite.has(key)) bySuite.set(key, []);
      bySuite.get(key).push(r);
    }

    out.push('', C.bold('  PRUEBAS DEL FRONTEND · CampusLab'), '');
    for (const suite of [...bySuite.keys()].sort((a, b) => a.localeCompare(b, 'es'))) {
      const list = bySuite.get(suite).sort((a, b) =>
        [...a.suite.slice(1), a.description].join(' › ').localeCompare([...b.suite.slice(1), b.description].join(' › '), 'es')
      );
      const failed = list.filter((r) => !r.success && !r.skipped).length;
      out.push(`  ${failed ? C.red('✗') : C.green('✓')} ${C.bold(suite)} ${C.dim(`(${list.length})`)}`);
      for (const r of list) {
        const name = [...r.suite.slice(1), r.description].join(' › ');
        if (r.skipped) out.push(`      ${C.yellow('-')} ${C.dim(name)}`);
        else if (r.success) out.push(`      ${C.green('✓')} ${name}`);
        else {
          out.push(`      ${C.red('✗ ' + name)}`);
          for (const msg of r.log) out.push(C.red('          ' + String(msg).split('\n')[0]));
        }
      }
    }

    const ok = summary.success;
    const ko = summary.failed;
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    out.push(
      '',
      `  ${C.bold('Total:')} ${ok + ko} pruebas · ${C.green(ok + ' OK')} · ${ko ? C.red(ko + ' fallidas') : '0 fallidas'} · ${secs} s`,
      ''
    );
    this.write(out.join('\n') + '\n');
  };
}

DemoReporter.$inject = ['baseReporterDecorator'];

module.exports = { 'reporter:demo': ['type', DemoReporter] };
