import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync, promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildBootstrap,
  deleteUploadedFile,
  ensureStorage,
  readData,
  saveUploadedFile,
  serializeUser,
  updateData,
  UPLOAD_DIR,
} from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  });

  if (statusCode === 204) {
    response.end();
    return;
  }

  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(payload);
}

async function parseJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8');

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON request body.');
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function createSessionRecord(userId) {
  return {
    token: randomUUID().replace(/-/g, ''),
    userId,
    createdAt: new Date().toISOString(),
  };
}

function extractToken(request, url) {
  const authHeader = request.headers.authorization || '';

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return url.searchParams.get('token') || '';
}

async function getAuthenticatedContext(request, url) {
  const token = extractToken(request, url);

  if (!token) {
    return null;
  }

  const data = await readData();
  const session = data.sessions.find((item) => item.token === token);

  if (!session) {
    return null;
  }

  const user = data.users.find((item) => item.id === session.userId);

  if (!user) {
    return null;
  }

  return { token, data, session, user };
}

function getDocumentKeywords(documents) {
  return (documents || []).map((d) => d.name.toLowerCase()).join(' ');
}

function checkDocumentEligibility(documents, requiredKeywords) {
  const docText = getDocumentKeywords(documents);
  const missing = [];
  for (const kw of requiredKeywords) {
    if (!docText.includes(kw.keyword)) {
      missing.push(kw.label);
    }
  }
  return missing;
}

const SCHEME_REQUIRED_DOCS = [
  { keyword: 'udyam', label: 'Udyam Registration Certificate' },
  { keyword: 'pan', label: 'PAN Card' },
  { keyword: 'gst', label: 'GST Certificate / GSTIN' },
];

const LOAN_REQUIRED_DOCS = [
  { keyword: 'pan', label: 'PAN Card' },
  { keyword: 'gst', label: 'GST Certificate / Return' },
  { keyword: 'bank', label: 'Bank Statement (last 6 months)' },
];

function buildAssistantReply(question, data) {
  const prompt = question.toLowerCase().trim();
  const profile = data.profile || {};
  const compliances = data.compliances || [];
  const alerts = data.alerts || [];
  const schemes = data.schemes || [];
  const loans = data.loans || [];
  const documents = data.documents || [];

  const pendingCompliances = compliances.filter((item) => item.status === 'PENDING');
  const overdueCompliances = compliances.filter((item) => item.status === 'OVERDUE');
  const completedCompliances = compliances.filter((item) => item.status === 'COMPLETED');
  const overdueAlerts = alerts.filter((item) => item.type === 'overdue' && item.status === 'OPEN');
  const openAlerts = alerts.filter((item) => item.status === 'OPEN');
  const resolvedAlerts = alerts.filter((item) => item.status === 'RESOLVED');
  const topSchemes = [...schemes].sort((a, b) => b.match - a.match);
  const topLoan = [...loans].sort((a, b) => (a.minRate || 0) - (b.minRate || 0))[0];

  const companyName = profile.companyName || 'your company';
  const industry = profile.industry || 'your industry';
  const companySize = profile.companySize || 'MSME';

  // Greetings
  if (prompt.match(/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|hii|helo)[\s!?]*/)) {
    return `Hello! 👋 I'm your CompliAssist AI assistant. I'm here to help **${companyName}** stay compliant and grow.\n\nYou currently have:\n• ${pendingCompliances.length} pending compliance task(s)\n• ${overdueCompliances.length} overdue item(s)\n• ${openAlerts.length} open alert(s)\n\nAsk me about GST, loans, schemes, EPF, TDS, documents, deadlines, or anything compliance-related!`;
  }

  // Help / what can you do
  if (prompt.includes('help') || prompt.includes('what can you do') || prompt.includes('capabilities') || prompt.includes('features')) {
    return `I can help you with a wide range of topics for **${companyName}**:\n\n📋 **Compliance** – GST, EPF, TDS, Professional Tax deadlines and status\n🏦 **Loans** – Compare loan offers and check eligibility based on your documents\n🏛️ **Govt Schemes** – Find matching schemes and check eligibility\n📁 **Documents** – Track uploaded files and document vault usage\n⚠️ **Alerts** – Check overdue items and upcoming deadlines\n📊 **Dashboard** – Get a summary of your compliance health\n\nJust ask me anything!`;
  }

  // GST filing
  if (prompt.includes('gstr-1') || prompt.includes('gstr1') || (prompt.includes('gst') && prompt.includes('filing'))) {
    const gstCompliance = compliances.find((c) => c.id === 'cmp-gstr1');
    const status = gstCompliance?.status || 'PENDING';
    const docsPending = data.guidance?.requiredDocs?.filter((d) => d.status === 'pending') || [];
    return `📋 **GSTR-1 (Monthly Outward Supplies Return)**\n\nStatus: **${status}** | Due: **${gstCompliance?.date || 'Check dashboard'}**\n\n${docsPending.length > 0 ? `⚠️ ${docsPending.length} document(s) still pending:\n${docsPending.map((d) => `  • ${d.name}`).join('\n')}\n\n` : '✅ All required documents are ready!\n\n'}**Steps to file:**\n1. Gather sales invoices and export records\n2. Validate customer GSTINs\n3. Prepare the portal upload template\n4. Submit on gst.gov.in and archive the acknowledgement\n\nGo to **Compliance Guidance** in the sidebar for the full step-by-step checklist.`;
  }

  // General GST questions
  if (prompt.includes('gst') || prompt.includes('goods and service')) {
    return `💡 **GST Overview for ${companyName}**\n\nAs an MSME in ${industry}, you are required to:\n• File **GSTR-1** monthly for outward supplies\n• File **GSTR-3B** monthly as a summary return\n• Maintain input tax credit (ITC) records\n\nYour current GST status: ${pendingCompliances.find((c) => c.title && c.title.includes('GST')) ? '⚠️ GSTR-1 filing is PENDING' : '✅ No pending GST filings'}\n\nAsk me specifically about "GSTR-1 filing" or "GST status" for more details.`;
  }

  // EPF / Provident Fund
  if (prompt.includes('epf') || prompt.includes('provident fund') || prompt.includes('pf ') || prompt.match(/\bpf\b/)) {
    const epfCompliance = compliances.find((c) => c.id === 'cmp-epf');
    return `🏦 **EPF (Employees' Provident Fund) Status**\n\nStatus: **${epfCompliance?.status || 'PENDING'}** | Due: ${epfCompliance?.date || 'Check dashboard'}\n\n${epfCompliance?.status === 'COMPLETED' ? '✅ Your EPF contribution for this month has been completed.' : '⚠️ EPF contribution is pending. Please file before the due date.'}\n\n**Key Points:**\n• ${companyName} has ${profile.employees || 'N/A'} employees on EPF rolls\n• Employer contribution: 12% of Basic + DA\n• Employee contribution: 12% of Basic + DA\n• File monthly via the EPFO Unified Portal\n\nLate contributions attract interest @18% per annum.`;
  }

  // TDS
  if (prompt.includes('tds') || prompt.includes('tax deducted') || prompt.includes('tcs')) {
    const tdsCompliance = compliances.find((c) => c.id === 'cmp-tds');
    return `💰 **TDS (Tax Deducted at Source) Status**\n\nStatus: **${tdsCompliance?.status || 'PENDING'}** | Due: **${tdsCompliance?.date || 'Check dashboard'}**\n\n${tdsCompliance?.status === 'PENDING' ? '⚠️ TDS payment is due. File before the deadline to avoid interest.' : '✅ TDS payment is up to date.'}\n\n**For ${industry} companies:**\n• Section 194J – Professional/Technical services: 10%\n• Section 194C – Contractor payments: 1-2%\n• Section 192 – Salary TDS (as per slab)\n\nFile via the **NSDL TIN Portal** and deposit using Challan 281.`;
  }

  // Professional Tax
  if (prompt.includes('professional tax') || prompt.includes('ptax') || prompt.includes('p-tax')) {
    const ptaxCompliance = compliances.find((c) => c.id === 'cmp-ptax');
    return `⚠️ **Professional Tax**\n\nStatus: **${ptaxCompliance?.status || 'OVERDUE'}** | Was due: ${ptaxCompliance?.date || 'Check dashboard'}\n\n${ptaxCompliance?.status === 'OVERDUE' ? '🚨 This payment is OVERDUE. Late fees may apply. Please pay immediately via the Karnataka Commercial Taxes portal.' : '✅ Professional Tax is up to date.'}\n\n**PT Slabs (Karnataka):**\n• Salary ₹25,000+: ₹200/month per employee\n• Employer PT (enrolled persons): ₹2,500/year\n\nGo to **Alerts & Deadlines** to resolve this item and update your compliance score.`;
  }

  // Loans / Finance
  if (prompt.includes('loan') || prompt.includes('finance') || prompt.includes('credit') || prompt.includes('borrow') || prompt.includes('fund')) {
    const missingLoanDocs = checkDocumentEligibility(documents, LOAN_REQUIRED_DOCS);
    const loanEligNote = missingLoanDocs.length === 0 ? '✅ Your documents look good for loan eligibility!' : `📎 To improve loan eligibility, upload: ${missingLoanDocs.join(', ')}`;
    const loanList = loans.map((l, i) => `${i + 1}. **${l.bank} – ${l.type}**\n   Rate: ${l.interest} | Amount: ${l.amount} | Tenure: ${l.tenure}\n   Purpose: ${l.purpose}`).join('\n\n');
    return `🏦 **Loan Recommendations for ${companyName}**\n\n${loanList || 'No loan offers available currently.'}\n\n${topLoan ? `💡 **Best rate:** ${topLoan.bank} at ${topLoan.interest}` : ''}\n\n${loanEligNote}\n\nGo to **Loan Recommendations** to view details and check eligibility.`;
  }

  // Schemes / Subsidies / Government support
  if (prompt.includes('scheme') || prompt.includes('subsidy') || prompt.includes('government support') || prompt.includes('ministry') || prompt.includes('grant')) {
    const missingSchemeDocs = checkDocumentEligibility(documents, SCHEME_REQUIRED_DOCS);
    const schemeEligNote = missingSchemeDocs.length === 0 ? '✅ Your documents support scheme eligibility!' : `📎 Upload these documents to improve eligibility: ${missingSchemeDocs.join(', ')}`;
    const schemeList = topSchemes.map((s) => `• **${s.title}** (${s.ministry})\n  Match: ${s.match}% | ${s.benefits}`).join('\n\n');
    return `🏛️ **Government Schemes for ${companyName}**\n\n${schemeList || 'No schemes matched currently.'}\n\n${schemeEligNote}\n\nGo to **Govt Schemes** to check eligibility for each scheme based on your uploaded documents.`;
  }

  // CLCSS / specific scheme questions
  if (prompt.includes('clcss') || prompt.includes('credit linked capital')) {
    return `🏭 **CLCSS (Credit Linked Capital Subsidy Scheme)**\n\nThis scheme provides upfront capital subsidy of 15% on institutional credit up to ₹1 Crore for upgrading plant & machinery.\n\n**Eligibility:**\n• Valid Udyam Registration (you have: ${profile.udyamRegistration || 'N/A'})\n• Manufacturing or service sector MSME\n• Investment in approved plant & machinery\n\nCheck eligibility on the **Govt Schemes** page. Apply through your bank or SIDBI.`;
  }

  // Documents / vault
  if (prompt.includes('document') || prompt.includes('upload') || prompt.includes('vault') || prompt.includes('file') || prompt.includes('storage')) {
    return `📁 **Document Vault Status**\n\nTotal files: **${documents.length}** file(s)\n\n${documents.length === 0 ? 'Your vault is empty. Upload compliance documents to enable accurate eligibility checking for loans and schemes.' : documents.map((d) => `• ${d.name} (${d.type})`).join('\n')}\n\n**Documents needed for eligibility checks:**\n• Udyam Certificate (for schemes)\n• PAN Card (for loans & schemes)\n• GST Certificate (for loans & schemes)\n• Bank Statement (for loans)\n\nGo to **Document Storage** to upload files.`;
  }

  // Alerts / deadlines / overdue
  if (prompt.includes('alert') || prompt.includes('deadline') || prompt.includes('overdue') || prompt.includes('urgent') || prompt.includes('pending')) {
    if (overdueAlerts.length > 0) {
      return `🚨 **Urgent Alerts for ${companyName}**\n\n${overdueAlerts.map((a) => `⛔ **${a.title}**\n   ${a.desc}`).join('\n\n')}\n\nOpen alerts: **${openAlerts.length}** | Resolved: **${resolvedAlerts.length}**\n\n⚡ Resolve overdue items immediately to avoid penalties. Go to **Alerts & Deadlines** in the sidebar.`;
    }
    return `✅ **No overdue alerts right now!**\n\nUpcoming items:\n${openAlerts.map((a) => `• ${a.title} – due ${a.date}`).join('\n') || 'No open alerts.'}\n\nYour compliance score looks healthy. Keep tracking deadlines via the **Alerts & Deadlines** page.`;
  }

  // Compliance status / health
  if (prompt.includes('compliance') || prompt.includes('status') || prompt.includes('health') || prompt.includes('score')) {
    const completionPct = Math.round((completedCompliances.length / Math.max(compliances.length, 1)) * 100);
    return `📊 **Compliance Health: ${companyName}**\n\n• ✅ Completed: ${completedCompliances.length}\n• ⏳ Pending: ${pendingCompliances.length}\n• 🚨 Overdue: ${overdueCompliances.length}\n• Total tracked: ${compliances.length}\n\nCompletion rate: **${completionPct}%**\n\n${overdueCompliances.length > 0 ? '⚠️ You have overdue items. Head to **Alerts & Deadlines** to resolve them and boost your score.' : '👍 Keep up the good work! No overdue items.'}`;
  }

  // Profile / company info
  if (prompt.includes('profile') || prompt.includes('company') || prompt.includes('about') || prompt.includes('business')) {
    return `🏢 **Company Profile: ${companyName}**\n\n• Industry: ${industry}\n• Type: ${profile.businessType || 'N/A'}\n• Size: ${companySize}\n• Employees: ${profile.employees || 'N/A'}\n• Location: ${profile.location || 'N/A'}\n• Founded: ${profile.foundedYear || 'N/A'}\n• Udyam: ${profile.udyamRegistration || 'N/A'}\n• PAN: ${profile.pan || 'N/A'}\n\nTo update these details, go to **MSME Profile** in the sidebar.`;
  }

  // Udyam registration
  if (prompt.includes('udyam') || prompt.includes('registration') || prompt.includes('msme certificate')) {
    return `📜 **Udyam Registration Status**\n\nRegistration No: **${profile.udyamRegistration || 'Not set'}**\nVerification: **${profile.verificationStatus || 'Verified'}**\n\nYour Udyam certificate is required for:\n• Govt scheme eligibility checks\n• Credit Guarantee Fund (CGS)\n• ZED Certification subsidies\n• Collateral-free loans up to ₹10 Crore\n\n💡 Upload your Udyam certificate to the **Document Storage** to enable eligibility checks.`;
  }

  // Settings / notifications
  if (prompt.includes('setting') || prompt.includes('notification') || prompt.includes('email') || prompt.includes('remind')) {
    return `⚙️ **Notification Settings**\n\nCurrent settings:\n• Email alerts: ${data.settings?.notifications?.email ? '✅ Enabled' : '❌ Disabled'}\n• SMS reminders: ${data.settings?.notifications?.sms ? '✅ Enabled' : '❌ Disabled'}\n• Weekly digest: ${data.settings?.notifications?.digest ? '✅ Enabled' : '❌ Disabled'}\n\nTo change these, go to **Settings** > **Notifications** in the sidebar.`;
  }

  // Income tax / ITR
  if (prompt.includes('income tax') || prompt.includes('itr') || prompt.includes('it return')) {
    const isTradingOrPvt = (profile.businessType || '').includes('Private');
    return `🧾 **Income Tax / ITR for MSMEs**\n\n${isTradingOrPvt ? 'As a Private Limited Company, you file **ITR-6** (Companies).' : 'As a Partnership/Proprietorship, you file **ITR-5** or **ITR-3**.'}\n\n**Key dates:**\n• Advance Tax Q4: 15 March\n• ITR Filing (Audit required): 31 October\n• ITR Filing (No audit): 31 July\n\n**Presumptive Taxation (Section 44AD):** Available if turnover ≤ ₹3 Crore (8% of receipts as profit, or 6% for digital transactions).\n\nConsult your CA for tax planning and ensure all TDS deductions are reconciled with Form 26AS.`;
  }

  // Dashboard / summary
  if (prompt.includes('dashboard') || prompt.includes('summary') || prompt.includes('overview')) {
    return `📈 **Workspace Summary: ${companyName}**\n\n**Compliance:** ${completedCompliances.length}/${compliances.length} completed\n**Alerts:** ${overdueAlerts.length} overdue, ${openAlerts.length} open total\n**Schemes:** ${schemes.length} matched\n**Loans:** ${loans.length} offers available\n**Documents:** ${documents.length} files in vault\n\n${overdueAlerts.length > 0 ? '🚨 Priority Action: Resolve overdue alerts to improve your compliance health score.' : '✅ No urgent actions needed!'}`;
  }

  // Thank you
  if (prompt.match(/^(thanks|thank you|thank|thx|ty)[\s!?]*/)) {
    return `You're welcome! 😊 Feel free to ask anytime. I'm here to help **${companyName}** stay compliant and grow!\n\nIs there anything else I can assist you with?`;
  }

  return `I can help you with compliance, loans, schemes, documents, and alerts for **${companyName}**.\n\n**Try asking:**\n• "What is my GST filing status?"\n• "Show me my compliance health"\n• "What loans are available for me?"\n• "Which government schemes match my profile?"\n• "What documents do I need to upload?"\n• "Are there any overdue alerts?"\n• "Explain EPF requirements"\n• "What is TDS for my company?"\n\nCurrently tracking **${compliances.length}** compliance items for your ${industry} business.`;
}

async function handleLogin(request, response) {
  const body = await parseJsonBody(request);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');

  if (!email || !password) {
    sendJson(response, 400, { message: 'Email and password are required.' });
    return;
  }

  const existingData = await readData();
  const user = existingData.users.find((item) => normalizeEmail(item.email) === email);

  if (!user || user.password !== password) {
    sendJson(response, 401, { message: 'Invalid email or password.' });
    return;
  }

  const { data, result } = await updateData((draft) => {
    draft.sessions = draft.sessions.filter((item) => item.userId !== user.id);
    const session = createSessionRecord(user.id);
    draft.sessions.push(session);
    return { session };
  });

  sendJson(response, 200, {
    message: 'Signed in successfully.',
    token: result.session.token,
    user: serializeUser(user),
    data: buildBootstrap(data),
  });
}

async function handleSession(request, response, url) {
  const auth = await getAuthenticatedContext(request, url);

  if (!auth) {
    sendJson(response, 401, { message: 'Session expired.' });
    return;
  }

  sendJson(response, 200, {
    user: serializeUser(auth.user),
    data: buildBootstrap(auth.data),
  });
}

async function handleLogout(request, response, url) {
  const token = extractToken(request, url);

  if (!token) {
    sendJson(response, 200, { message: 'Signed out.' });
    return;
  }

  await updateData((draft) => {
    draft.sessions = draft.sessions.filter((item) => item.token !== token);
  });

  sendJson(response, 200, { message: 'Signed out.' });
}

function parseBoolean(value) {
  return value === true || value === 'true';
}

async function handleApi(request, response, url) {
  const method = request.method || 'GET';
  const { pathname } = url;

  if (method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (pathname === '/api/health' && method === 'GET') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    await handleLogin(request, response);
    return;
  }

  if (pathname === '/api/auth/session' && method === 'GET') {
    await handleSession(request, response, url);
    return;
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    await handleLogout(request, response, url);
    return;
  }

  const auth = await getAuthenticatedContext(request, url);

  if (!auth) {
    sendJson(response, 401, { message: 'Authentication required.' });
    return;
  }

  if (pathname === '/api/bootstrap' && method === 'GET') {
    sendJson(response, 200, { data: buildBootstrap(auth.data) });
    return;
  }

  if (pathname === '/api/profile' && method === 'PUT') {
    const body = await parseJsonBody(request);

    const { data } = await updateData((draft) => {
      draft.profile = {
        ...draft.profile,
        companyName: String(body.companyName || draft.profile.companyName).trim(),
        shortName: String(body.shortName || draft.profile.shortName).trim().slice(0, 6),
        location: String(body.location || draft.profile.location).trim(),
        businessType: String(body.businessType || draft.profile.businessType).trim(),
        industry: String(body.industry || draft.profile.industry).trim(),
        companySize: String(body.companySize || draft.profile.companySize).trim(),
        udyamRegistration: String(
          body.udyamRegistration || draft.profile.udyamRegistration,
        ).trim(),
        employees: Number(body.employees || draft.profile.employees),
        foundedYear: String(body.foundedYear || draft.profile.foundedYear).trim(),
        pan: String(body.pan || draft.profile.pan).trim().toUpperCase(),
        website: String(body.website || draft.profile.website).trim(),
        description: String(body.description || draft.profile.description).trim(),
      };
      draft.settings.companyName = draft.profile.companyName;
    });

    sendJson(response, 200, {
      message: 'Business profile updated.',
      data: buildBootstrap(data),
    });
    return;
  }

  if (pathname === '/api/settings' && method === 'PUT') {
    const body = await parseJsonBody(request);

    const { data } = await updateData((draft) => {
      draft.settings = {
        ...draft.settings,
        companyName: String(body.companyName || draft.settings.companyName).trim(),
        businessEmail: String(body.businessEmail || draft.settings.businessEmail).trim(),
        phone: String(body.phone || draft.settings.phone).trim(),
        timezone: String(body.timezone || draft.settings.timezone).trim(),
        language: String(body.language || draft.settings.language).trim(),
        notifications: {
          email: parseBoolean(body.notifications?.email ?? draft.settings.notifications.email),
          sms: parseBoolean(body.notifications?.sms ?? draft.settings.notifications.sms),
          digest: parseBoolean(body.notifications?.digest ?? draft.settings.notifications.digest),
        },
        security: {
          twoFactor: parseBoolean(
            body.security?.twoFactor ?? draft.settings.security.twoFactor,
          ),
          sessionTimeout: String(
            body.security?.sessionTimeout || draft.settings.security.sessionTimeout,
          ).trim(),
        },
        backup: {
          frequency: String(
            body.backup?.frequency || draft.settings.backup.frequency,
          ).trim(),
          retention: String(body.backup?.retention || draft.settings.backup.retention).trim(),
        },
      };
    });

    sendJson(response, 200, {
      message: 'Settings saved successfully.',
      data: buildBootstrap(data),
    });
    return;
  }

  const guidanceDocMatch = /^\/api\/guidance\/documents\/([^/]+)$/.exec(pathname);

  if (guidanceDocMatch && method === 'PUT') {
    const body = await parseJsonBody(request);
    const documentId = guidanceDocMatch[1];

    try {
      const { data, result } = await updateData((draft) => {
        const doc = draft.guidance.requiredDocs.find((item) => item.id === documentId);

        if (!doc) {
          throw new Error('Document checklist item not found.');
        }

        doc.status = body.status === 'ready' ? 'ready' : 'pending';
        return { name: doc.name, status: doc.status };
      });

      sendJson(response, 200, {
        message: `${result.name} marked as ${result.status}.`,
        data: buildBootstrap(data),
      });
    } catch {
      sendJson(response, 404, { message: 'Document checklist item not found.' });
    }
    return;
  }

  const alertActionMatch = /^\/api\/alerts\/([^/]+)\/action$/.exec(pathname);

  if (alertActionMatch && method === 'POST') {
    const alertId = alertActionMatch[1];

    try {
      const { data, result } = await updateData((draft) => {
        const alert = draft.alerts.find((item) => item.id === alertId);

        if (!alert) {
          throw new Error('Alert not found.');
        }

        alert.status = 'RESOLVED';
        alert.resolvedAt = new Date().toISOString();

        if (alert.relatedComplianceId) {
          const compliance = draft.compliances.find(
            (item) => item.id === alert.relatedComplianceId,
          );

          if (compliance) {
            compliance.status = 'COMPLETED';
          }
        }

        return { title: alert.title };
      });

      sendJson(response, 200, {
        message: `${result.title} resolved.`,
        data: buildBootstrap(data),
      });
    } catch {
      sendJson(response, 404, { message: 'Alert not found.' });
    }
    return;
  }

  if (pathname === '/api/schemes/scan' && method === 'POST') {
    const { data } = await updateData((draft) => {
      const isTech = (draft.profile.industry || '').toLowerCase().includes('technology');
      draft.schemes = draft.schemes.map((scheme, index) => {
        const bonus = isTech && scheme.tags && scheme.tags.includes('TECHNOLOGY') ? 5 : 0;
        return {
          ...scheme,
          match: Math.max(68, Math.min(99, scheme.match + bonus - index)),
        };
      });
    });

    sendJson(response, 200, {
      message: 'Eligibility scan refreshed using the current business profile.',
      data: buildBootstrap(data),
    });
    return;
  }

  const schemeEligibilityMatch = /^\/api\/schemes\/([^/]+)\/eligibility$/.exec(pathname);

  if (schemeEligibilityMatch && method === 'GET') {
    const schemeId = schemeEligibilityMatch[1];
    const scheme = auth.data.schemes.find((item) => item.id === schemeId);

    if (!scheme) {
      sendJson(response, 404, { message: 'Scheme not found.' });
      return;
    }

    const missingDocs = checkDocumentEligibility(auth.data.documents, SCHEME_REQUIRED_DOCS);
    const profile = auth.data.profile || {};
    const isEligible = missingDocs.length === 0 && scheme.match >= 70;

    let message;
    if (isEligible) {
      message = `✅ Eligible for "${scheme.title}": Your profile (${profile.companySize || 'MSME'}, ${profile.industry || 'your industry'}) matches ${scheme.match}% and all key documents are present. You can apply via the relevant Ministry portal.`;
    } else {
      const reasons = [];
      if (scheme.match < 70) reasons.push(`profile match is only ${scheme.match}% (need 70%+)`);
      if (missingDocs.length > 0) reasons.push(`missing documents: ${missingDocs.join(', ')}`);
      message = `⚠️ Not yet eligible for "${scheme.title}": ${reasons.join('; ')}. Upload the required documents to the Document Vault to improve eligibility.`;
    }

    sendJson(response, 200, {
      message,
      eligible: isEligible,
      missingDocs,
      matchScore: scheme.match,
      data: buildBootstrap(auth.data),
    });
    return;
  }

  if (pathname === '/api/loans/compare' && method === 'POST') {
    const lowestRate = [...auth.data.loans].sort((left, right) => left.minRate - right.minRate)[0];
    const highestLimit = [...auth.data.loans].sort(
      (left, right) => right.maxAmountLakhs - left.maxAmountLakhs,
    )[0];

    sendJson(response, 200, {
      message: `Best visible rate: ${lowestRate.bank} at ${lowestRate.interest}. Highest available ticket size: ${highestLimit.bank} at ${highestLimit.amount}.`,
      data: buildBootstrap(auth.data),
    });
    return;
  }

  const loanApplyMatch = /^\/api\/loans\/([^/]+)\/apply$/.exec(pathname);

  if (loanApplyMatch && method === 'POST') {
    const loanId = loanApplyMatch[1];

    try {
      const { data, result } = await updateData((draft) => {
        const loan = draft.loans.find((item) => item.id === loanId);

        if (!loan) {
          throw new Error('Loan not found.');
        }

        loan.status = 'APPLICATION_STARTED';
        loan.appliedAt = new Date().toISOString();
        return { bank: loan.bank, type: loan.type };
      });

      sendJson(response, 200, {
        message: `Application started for ${result.bank} ${result.type}.`,
        data: buildBootstrap(data),
      });
    } catch {
      sendJson(response, 404, { message: 'Loan not found.' });
    }
    return;
  }

  const loanEligibilityMatch = /^\/api\/loans\/([^/]+)\/eligibility$/.exec(pathname);

  if (loanEligibilityMatch && method === 'GET') {
    const loanId = loanEligibilityMatch[1];
    const loan = auth.data.loans.find((item) => item.id === loanId);

    if (!loan) {
      sendJson(response, 404, { message: 'Loan not found.' });
      return;
    }

    const profile = auth.data.profile || {};
    const missingDocs = checkDocumentEligibility(auth.data.documents, LOAN_REQUIRED_DOCS);
    const isEligible = missingDocs.length === 0;

    let message;
    if (isEligible) {
      message = `✅ Eligible for ${loan.bank} ${loan.type}: Your ${(profile.companySize || 'MSME').toLowerCase()} profile in ${(profile.industry || 'your industry').toLowerCase()} qualifies for ${loan.purpose.toLowerCase()} financing. All required documents are present. Visit the lender's portal to start your application.`;
    } else {
      message = `⚠️ ${loan.bank} ${loan.type} – missing documents: ${missingDocs.join(', ')}. Upload them to the Document Vault for a complete eligibility check.`;
    }

    sendJson(response, 200, {
      message,
      eligible: isEligible,
      missingDocs,
      data: buildBootstrap(auth.data),
    });
    return;
  }

  if (pathname === '/api/assistant/query' && method === 'POST') {
    const body = await parseJsonBody(request);
    const question = String(body.question || '').trim();

    if (!question) {
      sendJson(response, 400, { message: 'Question is required.' });
      return;
    }

    const { data, result } = await updateData((draft) => {
      const answer = buildAssistantReply(question, draft);

      if (!Array.isArray(draft.assistantHistory)) {
        draft.assistantHistory = [];
      }
      draft.assistantHistory.push(
        {
          id: `msg-${randomUUID()}`,
          role: 'user',
          text: question,
          timestamp: new Date().toISOString(),
        },
        {
          id: `msg-${randomUUID()}`,
          role: 'assistant',
          text: answer,
          timestamp: new Date().toISOString(),
        },
      );

      draft.assistantHistory = draft.assistantHistory.slice(-20);
      return { answer };
    });

    sendJson(response, 200, {
      message: result.answer,
      data: buildBootstrap(data),
    });
    return;
  }

  if (pathname === '/api/documents/upload' && method === 'POST') {
    const body = await parseJsonBody(request);

    if (!body.name || !body.content) {
      sendJson(response, 400, { message: 'Document name and content are required.' });
      return;
    }

    const savedFile = await saveUploadedFile(body);
    const uploadedAt = new Date().toISOString();

    const { data } = await updateData((draft) => {
      draft.documents.push({
        id: `doc-${randomUUID()}`,
        name: String(body.name).trim(),
        type: savedFile.mimeType.includes('pdf')
          ? 'PDF'
          : savedFile.mimeType.startsWith('image/')
            ? 'Image'
            : 'File',
        bytes: savedFile.bytes,
        mimeType: savedFile.mimeType,
        uploadedAt,
        storedName: savedFile.storedName,
      });
    });

    sendJson(response, 200, {
      message: `${body.name} uploaded successfully.`,
      data: buildBootstrap(data),
    });
    return;
  }

  const documentDownloadMatch = /^\/api\/documents\/([^/]+)\/download$/.exec(pathname);

  if (documentDownloadMatch && method === 'GET') {
    const documentId = documentDownloadMatch[1];
    const document = auth.data.documents.find((item) => item.id === documentId);

    if (!document) {
      sendJson(response, 404, { message: 'Document not found.' });
      return;
    }

    const filePath = path.join(UPLOAD_DIR, document.storedName);

    try {
      await fs.access(filePath);
    } catch {
      sendJson(response, 404, { message: 'Stored file not found.' });
      return;
    }

    response.writeHead(200, {
      'Content-Disposition': `attachment; filename="${document.name}"`,
      'Content-Type': document.mimeType || 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
    return;
  }

  const documentDeleteMatch = /^\/api\/documents\/([^/]+)$/.exec(pathname);

  if (documentDeleteMatch && method === 'DELETE') {
    const documentId = documentDeleteMatch[1];

    try {
      const { data, result } = await updateData((draft) => {
        const index = draft.documents.findIndex((item) => item.id === documentId);

        if (index === -1) {
          throw new Error('Document not found.');
        }

        const [removed] = draft.documents.splice(index, 1);
        return removed;
      });

      await deleteUploadedFile(result.storedName);

      sendJson(response, 200, {
        message: `${result.name} removed from the vault.`,
        data: buildBootstrap(data),
      });
    } catch {
      sendJson(response, 404, { message: 'Document not found.' });
    }
    return;
  }

  sendJson(response, 404, { message: 'API route not found.' });
}

async function serveStatic(response, url) {
  if (!existsSync(DIST_DIR)) {
    sendText(
      response,
      503,
      'Frontend build not found. Run "npm run build" and then "npm run start".',
    );
    return;
  }

  const requestPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const safePath = path
    .normalize(requestPath)
    .replace(/^([/\\])+/, '')
    .replace(/^(\.\.[/\\])+/, '');
  const assetPath = path.join(DIST_DIR, safePath);

  try {
    const stat = await fs.stat(assetPath);

    if (stat.isFile()) {
      const extension = path.extname(assetPath);
      response.writeHead(200, {
        'Content-Type': CONTENT_TYPES[extension] || 'application/octet-stream',
      });
      createReadStream(assetPath).pipe(response);
      return;
    }
  } catch {
    // Fall through to index.html for SPA routes.
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
  });
  createReadStream(indexPath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendJson(response, 405, { message: 'Method not allowed.' });
      return;
    }

    await serveStatic(response, url);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { message: error.message || 'Internal server error.' });
  }
});

ensureStorage().then(() => {
  server.listen(PORT, HOST, () => {
    console.log(`CompliAssist server listening on http://${HOST}:${PORT}`);
  });
});
