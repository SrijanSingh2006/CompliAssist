import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 8788;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ROOT_DIR = process.cwd();

async function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);

      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the backend is ready.
    }

    await delay(500);
  }

  throw new Error('Smoke test server did not become ready in time.');
}

async function request(pathname, { token, method = 'GET', body } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    const errorPayload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    const message =
      typeof errorPayload === 'string'
        ? errorPayload
        : errorPayload.message || 'Smoke test request failed.';
    throw new Error(message);
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.arrayBuffer();
}

async function run() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'compliassist-smoke-'));
  const dataDir = path.join(tempRoot, 'data');
  const uploadDir = path.join(tempRoot, 'uploads');

  const server = spawn(process.execPath, ['backend/server.js'], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      COMPLIASSIST_DATA_DIR: dataDir,
      COMPLIASSIST_UPLOAD_DIR: uploadDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
  });

  server.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  try {
    await waitForServer();

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@technova.com',
        password: 'demo123',
      },
    });

    const token = login.token;

    await request('/api/profile', {
      token,
      method: 'PUT',
      body: {
        companyName: 'TechNova Solutions Pvt Ltd',
        shortName: 'TN',
        location: 'Bengaluru, Karnataka',
        businessType: 'Private Limited Company',
        industry: 'Information Technology',
        companySize: '11 - 50 Employees (Small)',
        udyamRegistration: 'UDYAM-KR-00-1234567',
        employees: 32,
        foundedYear: '2018',
        pan: 'AAACT1234F',
        website: 'https://technova.example',
        description: 'Smoke test profile update.',
      },
    });

    await request('/api/settings', {
      token,
      method: 'PUT',
      body: {
        companyName: 'TechNova Solutions Pvt Ltd',
        businessEmail: 'admin@technova.com',
        phone: '+91 98765 43210',
        timezone: 'Asia/Kolkata (IST)',
        language: 'English',
        notifications: {
          email: true,
          sms: false,
          digest: true,
        },
        security: {
          twoFactor: false,
          sessionTimeout: '30 minutes',
        },
        backup: {
          frequency: 'Weekly',
          retention: '90 days',
        },
      },
    });

    await request('/api/guidance/documents/doc-export-records', {
      token,
      method: 'PUT',
      body: { status: 'ready' },
    });
    await request('/api/alerts/alert-guidance/action', {
      token,
      method: 'POST',
    });
    await request('/api/schemes/scan', {
      token,
      method: 'POST',
    });
    await request('/api/schemes/scheme-digital/apply', {
      token,
      method: 'POST',
    });
    await request('/api/loans/compare', {
      token,
      method: 'POST',
    });
    await request('/api/loans/loan-hdfc-growth/apply', {
      token,
      method: 'POST',
    });
    await request('/api/loans/loan-sidbi-speed/eligibility', {
      token,
      method: 'GET',
    });
    await request('/api/assistant/query', {
      token,
      method: 'POST',
      body: {
        question: 'What government scheme should I apply for?',
      },
    });

    const fileContent = Buffer.from('smoke test document', 'utf8').toString('base64');
    const upload = await request('/api/documents/upload', {
      token,
      method: 'POST',
      body: {
        name: 'smoke-test.txt',
        mimeType: 'text/plain',
        content: `data:text/plain;base64,${fileContent}`,
      },
    });

    const documentId = upload.data.documents[0].id;
    await request(`/api/documents/${documentId}/download`, {
      token,
      method: 'GET',
    });
    await request(`/api/documents/${documentId}`, {
      token,
      method: 'DELETE',
    });

    console.log('Smoke test passed: auth, CRUD actions, assistant, and document flows all succeeded.');
  } finally {
    server.kill();
    await rm(tempRoot, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
