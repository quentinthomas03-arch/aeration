// Étape 1/2 de la non-régression des calculs contre le Rapso Excel/VBA (créé le 2026-10-03).
// Lit chaque classeur .xlsb de rapso-exemples-remplis/ et met en cache ses feuilles TAB_xxx en JSON
// dans ./rows/ (données clients : dossier exclu de git). À relancer seulement si les classeurs changent.
//   node outils/non-regression-rapso/dump.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(__dirname, '../..');
const OUT = __dirname + '/rows';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
const ctx = { console: { log() {}, warn() {} } }; ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(APP + '/js/xlsx.full.min.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(APP + '/js/rapso-import.js', 'utf8').replace(/console\.log.*$/m, ''), ctx);
const XLSX = ctx.XLSX;
const sheets = Object.keys(ctx.RAPSO_SHEET_TO_TYPE);
const dir = APP + '/rapso-exemples-remplis';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsb'));
for (const f of files) {
  const wb = XLSX.read(fs.readFileSync(path.join(dir, f)), { type: 'buffer', sheets: sheets });
  const res = {};
  for (const s of sheets) {
    const sh = wb.Sheets[s]; if (!sh) continue;
    const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '', raw: false });
    const data = rows.slice(5).filter(r => r && r.some(c => c !== '' && c != null));
    res[s] = { header: rows[4] || [], header3: rows[3] || [], header2: rows[2] || [], data };
  }
  fs.writeFileSync(OUT + '/' + f.replace(/\.xlsb$/, '.json'), JSON.stringify(res));
  console.error(f, Object.entries(res).map(([k, v]) => k + ':' + v.data.length).filter(x => !x.endsWith(':0')).join(' '));
}
