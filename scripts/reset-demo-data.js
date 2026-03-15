import { mkdir, writeFile } from 'node:fs/promises';
import { seedData } from '../backend/seedData.js';
import { DATA_DIR, DATA_FILE } from '../backend/store.js';

await mkdir(DATA_DIR, { recursive: true });
await writeFile(DATA_FILE, JSON.stringify(seedData, null, 2), 'utf8');

console.log(`Demo data reset in ${DATA_FILE}`);
