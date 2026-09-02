/**
 * Writes frontend/src/assets/config.json at build time.
 * Set API_URL in Vercel (or locally) to your Render backend, e.g.:
 *   https://your-api.onrender.com/api
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'src', 'assets', 'config.json');

const apiUrl = (process.env.API_URL || 'http://localhost:8080/api').replace(/\/$/, '');

writeFileSync(outPath, JSON.stringify({ apiUrl }, null, 2) + '\n', 'utf8');
console.log(`[write-config] apiUrl = ${apiUrl}`);
