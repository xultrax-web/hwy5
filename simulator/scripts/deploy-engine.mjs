/* Cross-platform engine deploy: simulator/dist -> app/cc-engine.
   Replaces the manual rm/cp pipeline from the handoffs. Run via `npm run deploy:engine`
   (which builds first). Clears stale hashed assets, then copies index.html + assets + logo
   together so the HTML's relative ./assets/<hash> references always resolve. */
import { rmSync, mkdirSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const sim = resolve(here, '..');                       // simulator/
const dist = resolve(sim, 'dist');                     // simulator/dist
const dest = resolve(sim, '..', 'app', 'cc-engine');   // app/cc-engine
const destAssets = resolve(dest, 'assets');

if (!existsSync(resolve(dist, 'index.html'))) {
  console.error('[deploy:engine] No build found at simulator/dist. Run the build first (npm run deploy:engine builds automatically).');
  process.exit(1);
}

// 1. clear stale content-hashed assets (Vite emits new hashes every build)
rmSync(destAssets, { recursive: true, force: true });
mkdirSync(destAssets, { recursive: true });

// 2. copy index.html + assets TOGETHER (HTML references the new hashed names)
cpSync(resolve(dist, 'index.html'), resolve(dest, 'index.html'));
cpSync(resolve(dist, 'assets'), destAssets, { recursive: true });

// 3. copy the logo if present
const logo = resolve(dist, 'i5-logo.png');
if (existsSync(logo)) cpSync(logo, resolve(dest, 'i5-logo.png'));

const n = readdirSync(destAssets).length;
console.log(`[deploy:engine] OK -> app/cc-engine (index.html + ${n} asset file(s)).`);
