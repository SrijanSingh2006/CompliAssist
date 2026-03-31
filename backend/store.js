import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedData } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATA_DIR = process.env.COMPLIASSIST_DATA_DIR
  ? path.resolve(process.env.COMPLIASSIST_DATA_DIR)
  : path.join(__dirname, 'data');
export const DATA_FILE = path.join(DATA_DIR, 'store.json');
export const UPLOAD_DIR = process.env.COMPLIASSIST_UPLOAD_DIR
  ? path.resolve(process.env.COMPLIASSIST_UPLOAD_DIR)
  : path.join(__dirname, 'uploads');

let writeQueue = Promise.resolve();

function cloneSeed() {
  return JSON.parse(JSON.stringify(seedData));
}

export async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(cloneSeed(), null, 2), 'utf8');
  }
}

export async function readData() {
  await ensureStorage();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

export async function writeData(nextData) {
  await ensureStorage();
  writeQueue = writeQueue.then(() =>
    fs.writeFile(DATA_FILE, JSON.stringify(nextData, null, 2), 'utf8'),
  );
  return writeQueue;
}

export async function updateData(mutator) {
  const current = await readData();
  const next = JSON.parse(JSON.stringify(current));
  const result = await mutator(next);
  await writeData(next);
  return { data: next, result };
}

export function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

export async function saveUploadedFile({ name, mimeType, content }) {
  const match = /^data:(.+);base64,(.+)$/.exec(content || '');

  if (!match) {
    throw new Error('Invalid file payload.');
  }

  const detectedMimeType = mimeType || match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const storedName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(name)}`;
  const uploadPath = path.join(UPLOAD_DIR, storedName);

  await fs.writeFile(uploadPath, buffer);

  return {
    storedName,
    mimeType: detectedMimeType,
    bytes: buffer.length,
  };
}

export async function deleteUploadedFile(storedName) {
  if (!storedName) {
    return;
  }

  const uploadPath = path.join(UPLOAD_DIR, storedName);

  try {
    await fs.unlink(uploadPath);
  } catch {
    // Ignore missing file cleanup errors.
  }
}

export function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function sortByDate(items, field = 'date') {
  return [...items].sort((left, right) => {
    const leftValue = left[field] || '';
    const rightValue = right[field] || '';
    return leftValue.localeCompare(rightValue);
  });
}

function healthLabel(score) {
  if (score >= 85) {
    return 'Excellent';
  }

  if (score >= 70) {
    return 'Good';
  }

  return 'Needs Attention';
}

export function formatBytes(bytes) {
  if (!bytes) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let value = bytes;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  const display = value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${display} ${units[index]}`;
}

export function buildBootstrap(data) {
  const compliances = sortByDate(data.compliances);
  const documents = [...data.documents].sort((left, right) =>
    (right.uploadedAt || '').localeCompare(left.uploadedAt || ''),
  );
  const alerts = [...data.alerts].sort((left, right) =>
    (right.date || '').localeCompare(left.date || ''),
  );

  const completed = compliances.filter((item) => item.status === 'COMPLETED').length;
  const pending = compliances.filter((item) => item.status === 'PENDING').length;
  const overdue = compliances.filter((item) => item.status === 'OVERDUE').length;
  const total = compliances.length || 1;
  const score = Math.round((completed / total) * 100);
  const storageUsedBytes = documents.reduce((sum, doc) => sum + (doc.bytes || 0), 0);
  const openAlerts = alerts.filter((alert) => alert.status === 'OPEN');

  return {
    profile: data.profile,
    settings: data.settings,
    guidance: data.guidance,
    alerts,
    schemes: [...data.schemes].sort((left, right) => right.match - left.match),
    loans: [...data.loans].sort((left, right) => left.minRate - right.minRate),
    documents,
    assistantHistory: (data.assistantHistory || []).slice(-20),
    dashboard: {
      score,
      healthLabel: healthLabel(score),
      completedCount: completed,
      pendingCount: pending,
      overdueCount: overdue,
      openAlertCount: openAlerts.length,
      upcomingDeadlines: pending + overdue,
      compliances,
      chartData: [
        { name: 'Completed', value: completed, color: 'var(--success)' },
        { name: 'Pending', value: pending, color: 'var(--warning)' },
        { name: 'Overdue', value: overdue, color: 'var(--danger)' },
      ],
      storage: {
        usedBytes: storageUsedBytes,
        usedLabel: formatBytes(storageUsedBytes),
        limitBytes: data.storageLimitBytes,
        limitLabel: formatBytes(data.storageLimitBytes),
        percentage: Math.min(
          100,
          Math.round((storageUsedBytes / (data.storageLimitBytes || 1)) * 100),
        ),
      },
    },
  };
}
