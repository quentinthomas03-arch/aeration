// Étape 2/2 : rejoue chaque ligne des classeurs Rapso réels dans js/calculations.js et compare nos
// valeurs calculées à celles calculées par le Rapso (Excel/VBA). À relancer après toute modification
// d'une formule. Prérequis : dump.js lancé une fois.
//   node outils/non-regression-rapso/compare.js [feuille, ex. BOA] [--verbose]
// Bilan au 2026-10-03 : 2 106 valeurs identiques, 44 écarts tous expliqués (saisies incohérentes
// dans un classeur source, ancienne version V27, fiches incomplètes, libellés mineurs).
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(__dirname, '../..');
const ctx = { console: { log() {}, warn() {} } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['installations-schema.js', 'calculations.js', 'rapso-import.js']) {
  vm.runInContext(fs.readFileSync(APP + '/js/' + f, 'utf8'), ctx, { filename: f });
}
vm.runInContext('this.T=INSTALLATION_TYPES', ctx);
const CFG = require('./types.js');
const onlySheet = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const verbose = process.argv.includes('--verbose');
const dir = __dirname + '/rows';

function norm(s) { return ctx.rapsoNorm(s); }
function numv(v) { const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? null : n; }
function normText(v) { return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' '); }

const summary = {};
for (const f of fs.readdirSync(dir)) {
  const wb = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
  for (const sheet of Object.keys(CFG)) {
    if (onlySheet && sheet !== onlySheet) continue;
    const s = wb[sheet]; if (!s || !s.data.length) continue;
    const cfg = CFG[sheet], typeId = ctx.RAPSO_SHEET_TO_TYPE[sheet];
    const colIdx = ctx.rapsoHeaderIndex(s.header);
    const col = (label) => { const i = colIdx[norm(label)]; if (i === undefined) throw new Error(sheet + ': colonne introuvable ' + label + ' dans ' + f); return i; };
    s.data.forEach((row, r) => {
      if (cfg.skip && cfg.skip(row, col)) return;
      const data = Object.assign({}, ctx.rapsoSheetToInstallations(typeId, [[], [], [], [], s.header, row])[0] || {});
      (cfg.input || []).forEach(([label, key, tr]) => {
        let v = row[col(label)]; v = v == null ? '' : String(v).trim();
        if (tr) v = tr(v, row, col); if (v !== '' && v !== undefined) data[key] = v;
      });
      if (cfg.prepare) cfg.prepare(data, row, col);
      const inst = { data };
      ctx.applyCalculations(typeId, inst);
      (cfg.compare || []).forEach(([label, key, kind]) => {
        const exp = row[col(label)], got = inst.data[key];
        const k = sheet + ' › ' + key;
        summary[k] = summary[k] || { ok: 0, ko: 0, skip: 0, ex: [] };
        if (exp === '' || exp == null) { summary[k].skip++; return; }
        let ok;
        if (kind === 'num') {
          const a = numv(exp), b = numv(got);
          const intLike = !/[.,]/.test(String(exp)) && Math.abs(a) >= 10;
          ok = a !== null && b !== null ? Math.abs(a - b) <= Math.max(intLike ? 0.5 : 0.011, Math.abs(a) * 0.006) : normText(exp) === normText(got);
        } else ok = normText(exp) === normText(got);
        if (ok) summary[k].ok++; else {
          summary[k].ko++;
          if (summary[k].ex.length < (verbose ? 50 : 4)) summary[k].ex.push(f.slice(0, 22) + ' L' + (r + 6) + ' attendu=' + JSON.stringify(exp) + ' obtenu=' + JSON.stringify(got) + (cfg.show ? ' ' + cfg.show(row, col, inst.data) : ''));
        }
      });
    });
  }
}
for (const [k, v] of Object.entries(summary)) {
  console.log((v.ko ? '✗ ' : '✓ ') + k + ' : ' + v.ok + ' ok, ' + v.ko + ' écarts, ' + v.skip + ' vides');
  v.ex.forEach(e => console.log('    ' + e));
}
