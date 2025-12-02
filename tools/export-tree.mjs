// tools/export-tree.mjs
// Node-only, cross-platform. Genera reports/TREE.txt ed esegue (se presente) tools/audit-project.mjs
// USO (da qualsiasi cartella del progetto):
//   node tools/export-tree.mjs --root . --out reports --entries "backend/index.js,backend/server.js,backend/src/index.js,src/main.jsx,src/index.jsx,src/main.tsx,src/index.tsx"
// Oppure su Windows: doppio click su tools/export-tree.cmd (usa la CWD come root)

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Config ---
const DEFAULT_EXCLUDE_DIRS = new Set([
  'node_modules','.git','.husky','.next','dist','build','coverage',
  '.cache','.parcel-cache','.vite','.turbo','tmp','temp','.DS_Store'
]);

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

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function buildCleanTree(root) {
  const lines = [];
  async function walk(dir, prefix = '') {
    let items = await fs.readdir(dir, { withFileTypes: true });
    items = items.filter(e => !DEFAULT_EXCLUDE_DIRS.has(e.name));
    // directory prima, poi file; ordine alfabetico
    items.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
    const last = items.length - 1;
    for (let i = 0; i < items.length; i++) {
      const e = items[i];
      const conn = i === last ? '└── ' : '├── ';
      const nextPrefix = prefix + (i === last ? '    ' : '│   ');
      lines.push(prefix + conn + e.name);
      if (e.isDirectory()) {
        await walk(path.join(dir, e.name), nextPrefix);
      }
    }
  }
  lines.push(path.basename(root));
  await walk(root);
  return lines.join('\n');
}

function execNode(file, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], {
      stdio: 'inherit',
      ...opts
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(file)} exited with code ${code}`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv);

  // Se lanciato via .cmd, usiamo la CWD come root di default.
  const root = path.resolve(args.root || process.cwd());
  const outDir = path.resolve(root, args.out || 'reports');
  const entries = args.entries || 'backend/index.js,backend/server.js,backend/src/index.js,src/main.jsx,src/index.jsx,src/main.tsx,src/index.tsx';

  await ensureDir(outDir);

  // 1) TREE.txt
  const tree = await buildCleanTree(root);
  const treePath = path.join(outDir, 'TREE.txt');
  await fs.writeFile(treePath, tree, 'utf8');
  console.log(`✅ TREE.txt generato: ${treePath}`);

  // 2) Se presente, lancia audit-project.mjs
  const auditPath = path.join(__dirname, 'audit-project.mjs');
  const auditExists = await fs
    .access(auditPath)
    .then(() => true)
    .catch(() => false);

  if (auditExists) {
    console.log('▶️  Avvio audit-project.mjs ...');
    const auditArgs = [
      '--root', root,
      '--out', outDir,
      '--entries', entries
    ];
    await execNode(auditPath, auditArgs);
    console.log('✅ Audit completato. Controlla audit-report.txt e audit-report.json in', outDir);
  } else {
    console.warn('⚠️  tools/audit-project.mjs non trovato. Eseguo solo TREE.txt.');
  }
}

main().catch((err) => {
  console.error('❌ Errore:', err?.stack || err?.message || err);
  process.exit(1);
});
