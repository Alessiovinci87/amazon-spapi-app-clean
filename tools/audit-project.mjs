// tools/audit-project.mjs
// Node CLI per audit del progetto: genera TREE.txt, audit-report.txt, audit-report.json
// - Scansiona il repo escludendo cartelle pesanti (node_modules, build, ecc.)
// - Costruisce un grafo delle dipendenze (import/require/dynamic import)
// - Identifica file "orfani" (non raggiunti dagli entrypoint)
// - Risolve estensioni comuni (.js,.jsx,.ts,.tsx,.json) e index.*
// USO:
//   node tools/audit-project.mjs --root . --entries "backend/index.js,backend/server.js,backend/src/index.js,src/main.jsx,src/index.jsx,src/main.tsx,src/index.tsx" --out reports

import fs from 'fs/promises';
import path from 'path';

const DEFAULT_EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.husky', '.next', 'dist', 'build', 'coverage',
  '.cache', '.parcel-cache', '.vite', '.turbo', 'tmp', 'temp', '.DS_Store'
]);

const DEFAULT_EXTS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json'];
const DEFAULT_ENTRIES_GUESS = [
  'backend/index.js',
  'backend/server.js',
  'backend/src/index.js',
  'backend/app.js',
  'src/main.jsx',
  'src/index.jsx',
  'src/main.tsx',
  'src/index.tsx',
  'src/App.jsx',
  'src/App.tsx'
];

const IMPORT_RE = /\bimport\s+(?:.+?\s+from\s+)?['"]([^'"]+)['"];?|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.split('=');
      const key = k.replace(/^--/, '');
      if (typeof v !== 'undefined') {
        args[key] = v;
      } else {
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) {
          args[key] = true;
        } else {
          args[key] = next;
          i++;
        }
      }
    }
  }
  return args;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function normalizeRoot(root) {
  return path.resolve(root || '.');
}

async function* walk(dir, { excludeDirs = DEFAULT_EXCLUDE_DIRS } = {}) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const name = e.name;
    if (excludeDirs.has(name)) continue;
    const full = path.join(dir, name);
    if (e.isDirectory()) {
      yield* walk(full, { excludeDirs });
    } else if (e.isFile()) {
      yield full;
    }
  }
}

async function readFileSafe(fp) {
  try {
    return await fs.readFile(fp, 'utf8');
  } catch {
    return '';
  }
}

async function pathExists(fp) {
  try {
    await fs.access(fp);
    return true;
  } catch {
    return false;
  }
}

async function resolveImport(fromFile, spec, root, extensions = DEFAULT_EXTS) {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  const baseDir = path.dirname(fromFile);
  const raw = spec.startsWith('/')
    ? path.join(root, spec)
    : path.resolve(baseDir, spec);

  const candidates = [];
  for (const ext of extensions) candidates.push(raw + ext);
  for (const ext of extensions) candidates.push(path.join(raw, 'index' + ext));
  candidates.unshift(raw); // se già con estensione

  for (const c of candidates) {
    if (await pathExists(c)) return path.resolve(c);
  }
  return null;
}

function extractImports(code) {
  const imports = [];
  let m;
  while ((m = IMPORT_RE.exec(code))) {
    const spec = m[1] || m[2] || m[3];
    if (spec) imports.push(spec);
  }
  return imports;
}

async function buildGraph(files, root) {
  const graph = new Map();
  const allFilesSet = new Set(files.map(f => path.resolve(f)));
  for (const f of files) {
    const abs = path.resolve(f);
    const code = await readFileSafe(abs);
    const specs = extractImports(code);
    const deps = new Set();
    for (const spec of specs) {
      const resolved = await resolveImport(abs, spec, root);
      if (resolved && allFilesSet.has(resolved)) deps.add(resolved);
    }
    graph.set(abs, deps);
  }
  return graph;
}

function findReachable(graph, entriesAbs) {
  const visited = new Set();
  const stack = [...entriesAbs];
  while (stack.length) {
    const cur = stack.pop();
    if (visited.has(cur)) continue;
    visited.add(cur);
    const deps = graph.get(cur);
    if (!deps) continue;
    for (const d of deps) stack.push(d);
  }
  return visited;
}

async function buildTree(root, { excludeDirs = DEFAULT_EXCLUDE_DIRS } = {}) {
  const treeLines = [];
  async function walkTree(dir, prefix = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const filtered = entries.filter(e => !excludeDirs.has(e.name));
    const lastIndex = filtered.length - 1;

    filtered.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < filtered.length; i++) {
      const e = filtered[i];
      const isLast = i === lastIndex;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      treeLines.push(prefix + connector + e.name);
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walkTree(full, nextPrefix);
    }
  }
  const rootName = path.basename(root);
  treeLines.push(rootName);
  await walkTree(root);
  return treeLines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const root = normalizeRoot(args.root || '.');
  const outDir = path.resolve(args.out || 'reports');
  const entriesCli = (args.entries || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  await fs.mkdir(outDir, { recursive: true });

  const allFiles = [];
  for await (const f of walk(root)) allFiles.push(path.resolve(f));
  const codeFiles = allFiles.filter(f => ['.js','.jsx','.ts','.tsx','.mjs','.cjs','.json'].includes(path.extname(f)));

  const candidateEntries = entriesCli.length ? entriesCli : DEFAULT_ENTRIES_GUESS;
  const entriesAbs = [];
  for (const rel of candidateEntries) {
    const abs = path.resolve(root, rel);
    if (await pathExists(abs)) entriesAbs.push(abs);
  }
  if (entriesAbs.length === 0) {
    const fallback = path.resolve(root, 'backend/index.js');
    if (await pathExists(fallback)) entriesAbs.push(fallback);
  }
  if (entriesAbs.length === 0 && codeFiles.length > 0) entriesAbs.push(codeFiles[0]);

  const graph = await buildGraph(codeFiles, root);
  const reachable = findReachable(graph, entriesAbs);

  const codeFilesSet = new Set(codeFiles.map(p => path.resolve(p)));
  const orphans = [...codeFilesSet].filter(f => !reachable.has(f));

  const treeStr = await buildTree(root);
  const treePath = path.join(outDir, 'TREE.txt');
  await fs.writeFile(treePath, treeStr, 'utf8');

  const rel = (p) => toPosix(path.relative(root, p)) || '.';
  const reportTxtPath = path.join(outDir, 'audit-report.txt');
  const reportTxt = [
    '=== AUDIT PROGETTO ===',
    `Root: ${root}`,
    '',
    'Entrypoint usati:',
    ...entriesAbs.map(e => ` - ${rel(e)}`),
    '',
    `Totale file analizzabili: ${codeFiles.length}`,
    `Raggiungibili dagli entry: ${reachable.size}`,
    `Orfani: ${orphans.length}`,
    '',
    '--- FILE ORFANI ---',
    ...orphans.sort().map(o => ` - ${rel(o)}`),
    '',
    '--- NOTE ---',
    'I file orfani potrebbero essere:',
    '  • codice morto da eliminare/spostare',
    '  • utility non ancora collegate',
    '  • entry aggiuntivi mancanti (usa --entries per indicarli)',
    ''
  ].join('\n');
  await fs.writeFile(reportTxtPath, reportTxt, 'utf8');

  const reportJsonPath = path.join(outDir, 'audit-report.json');
  const json = {
    root,
    entries: entriesAbs.map(rel),
    totals: { codeFiles: codeFiles.length, reachable: reachable.size, orphans: orphans.length },
    orphans: orphans.map(rel),
    generatedAt: new Date().toISOString()
  };
  await fs.writeFile(reportJsonPath, JSON.stringify(json, null, 2), 'utf8');

  console.log('✅ Audit completato');
  console.log(` - ${path.relative(process.cwd(), treePath)}`);
  console.log(` - ${path.relative(process.cwd(), reportTxtPath)}`);
  console.log(` - ${path.relative(process.cwd(), reportJsonPath)}`);
  console.log('\nSuggerimento: aggiungi manualmente eventuali entry mancanti con:');
  console.log('  node tools/audit-project.mjs --entries "backend/index.js,src/main.jsx"');
}

main().catch((err) => {
  console.error('❌ Errore audit:', err);
  process.exit(1);
});
