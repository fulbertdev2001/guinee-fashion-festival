import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

// Stockage durable. Hostinger remplace le dossier du site à chaque déploiement :
// tout ce qui est écrit dedans (base, uploads, candidatures) disparaît.
// Par défaut on utilise ~/gff-data (hors du dossier de déploiement),
// avec repli sur le dossier local data/ puis sur le dossier temporaire.
// Les variables DATA_DIR / UPLOAD_DIR / PRIVATE_DIR priment si spécifiées.
function writable(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function pickDir(envValue, name) {
  const local = path.join(ROOT, 'data', name === 'data' ? '' : name);
  const homeTarget = path.join(os.homedir(), 'gff-data', name);
  // Si envValue est un chemin absolu personnalisé explicite, on le respecte en priorité
  const candidates = (envValue && path.isAbsolute(envValue))
    ? [envValue, homeTarget, local]
    : [homeTarget, local, path.join(os.tmpdir(), 'gff-data', name)];
  const dir = candidates.find(writable);
  if (!dir) throw new Error(`Aucun dossier inscriptible pour ${name}`);
  // Première fois sur un dossier externe : rapatriement du contenu local initial
  if (dir !== local && fs.existsSync(local)) {
    try {
      for (const f of fs.readdirSync(local)) {
        if (f.startsWith('.') || fs.existsSync(path.join(dir, f))) continue;
        try { fs.cpSync(path.join(local, f), path.join(dir, f), { recursive: true }); } catch {}
      }
    } catch {}
  }
  console.log(`[stockage] ${name} → ${dir}`);
  return dir;
}

export const DATA_DIR = pickDir(process.env.DATA_DIR, 'data');
export const UPLOAD_DIR = pickDir(process.env.UPLOAD_DIR, 'uploads'); // public media
export const PRIVATE_DIR = pickDir(process.env.PRIVATE_DIR, 'private'); // candidatures (CV, photos)
export const DB_FILE = path.join(DATA_DIR, 'gff.sqlite');
export const DIST_DIR = path.join(ROOT, 'dist');

for (const d of [DATA_DIR, UPLOAD_DIR, PRIVATE_DIR]) {
  try { fs.mkdirSync(d, { recursive: true }); } catch {}
}

const rawPort = process.env.PORT || 3000;
export const PORT = isNaN(Number(rawPort)) ? rawPort : Number(rawPort);
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-a-changer-en-production';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@guineefashionfestival.com';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMoi!2026';
export const IS_PROD = process.env.NODE_ENV === 'production';
export const MAX_VIDEO_MB = Number(process.env.MAX_VIDEO_MB || 600);
