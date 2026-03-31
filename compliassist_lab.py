"""
╔══════════════════════════════════════════════════════════════╗
║      CompliAssist AI – MSME Compliance Platform              ║
║      Lab Notebook Script  |  SEPM Project                    ║
╚══════════════════════════════════════════════════════════════╝

Run:  python compliassist_lab.py
Deps: pip install pandas matplotlib seaborn numpy requests
"""

# ─── Imports ──────────────────────────────────────────────────────────────────
import os
import json
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns

warnings.filterwarnings("ignore")
plt.rcParams["figure.figsize"] = (10, 5)
plt.rcParams["font.family"] = "DejaVu Sans"
sns.set_theme(style="whitegrid", palette="muted")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 – Project Architecture Overview
# ─────────────────────────────────────────────────────────────────────────────
print("""
╔════════════════════════════════════════════════════════════════════════╗
║        SECTION 1 – PROJECT ARCHITECTURE                               ║
╚════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────┐
│                        COMPLIASSIST PLATFORM                         │
├─────────────────────────┬────────────────────────────────────────────┤
│       FRONTEND          │               BACKEND                      │
│  Vite + React (SPA)     │  Node.js HTTP Server  (port 8787)          │
│                         │                                            │
│  Pages:                 │  API Routes:                               │
│  • Dashboard            │  POST /api/auth/login                      │
│  • MSME Profile         │  GET  /api/auth/session                    │
│  • Compliance Guidance  │  GET  /api/bootstrap                       │
│  • Govt Schemes         │  PUT  /api/profile                         │
│  • Loan Recommendations │  PUT  /api/settings                        │
│  • Document Storage     │  PUT  /api/guidance/documents/:id          │
│  • Alerts & Deadlines   │  POST /api/alerts/:id/action               │
│  • AI Query Assistant   │  POST /api/schemes/:id/apply               │
│  • Settings             │  POST /api/loans/compare                   │
│                         │  POST /api/loans/:id/apply                 │
│                         │  GET  /api/loans/:id/eligibility           │
│                         │  POST /api/assistant/query                 │
│                         │  POST /api/documents/upload                │
│                         │  GET  /api/documents/:id/download          │
│                         │  DELETE /api/documents/:id                 │
│                         │  GET  /api/health                          │
├─────────────────────────┴────────────────────────────────────────────┤
│            Data Layer: JSON flat-file store (backend/data/)          │
│            File Uploads: backend/uploads/  (Docker volume)           │
├──────────────────────────────────────────────────────────────────────┤
│                     Docker (multi-stage build)                       │
│  Stage 1 (build): node:20-alpine → npm ci → vite build              │
│  Stage 2 (runtime): node:20-alpine → production deps → node server  │
└──────────────────────────────────────────────────────────────────────┘
""")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 – Seed Data Loading
# ─────────────────────────────────────────────────────────────────────────────
print("╔════════════════════════════════════════╗")
print("║  SECTION 2 – SEED DATA LOADING         ║")
print("╚════════════════════════════════════════╝")

seed_data = {
    "profile": {
        "companyName": "TechNova Solutions Pvt Ltd",
        "location": "Bengaluru, Karnataka",
        "businessType": "Private Limited Company",
        "industry": "Information Technology",
        "companySize": "11 - 50 Employees (Small)",
        "udyamRegistration": "UDYAM-KR-00-1234567",
        "employees": 32,
        "foundedYear": "2018",
        "pan": "AAACT1234F",
    },
    "compliances": [
        {"id": "cmp-gstr1", "title": "GST Filing (GSTR-1)",      "date": "2026-03-15", "status": "PENDING"},
        {"id": "cmp-epf",   "title": "EPF Contribution",          "date": "2026-03-11", "status": "COMPLETED"},
        {"id": "cmp-tds",   "title": "TDS Payment",               "date": "2026-03-18", "status": "PENDING"},
        {"id": "cmp-ptax",  "title": "Professional Tax Payment",  "date": "2026-03-08", "status": "OVERDUE"},
    ],
    "alerts": [
        {"id": "alert-ptax",     "type": "overdue",  "title": "Professional Tax Payment Overdue",  "date": "2026-03-08", "status": "OPEN"},
        {"id": "alert-gstr1",    "type": "warning",  "title": "GST Filing (GSTR-1) Due Soon",      "date": "2026-03-15", "status": "OPEN"},
        {"id": "alert-guidance", "type": "info",     "title": "Updated Data Privacy Guidance",      "date": "2026-03-12", "status": "OPEN"},
    ],
    "schemes": [
        {"id": "scheme-cgs",     "title": "Credit Guarantee Scheme (CGS)", "ministry": "MSME Ministry",                 "match": 96, "tags": ["FINANCING", "MANUFACTURING"], "status": "RECOMMENDED"},
        {"id": "scheme-digital", "title": "Digital MSME Scheme",           "ministry": "Ministry of Electronics and IT","match": 91, "tags": ["TECHNOLOGY", "DIGITIZATION"], "status": "RECOMMENDED"},
        {"id": "scheme-zed",     "title": "ZED Certification Scheme",      "ministry": "QCI and Ministry of MSME",      "match": 77, "tags": ["QUALITY", "SUSTAINABILITY"],   "status": "RECOMMENDED"},
    ],
    "loans": [
        {"id": "loan-hdfc",  "bank": "HDFC Bank",           "type": "MSME Growth Loan",    "interest": "8.45% - 10.50%", "minRate": 8.45, "amount": "Rs 10L - Rs 50L",  "maxAmountLakhs": 50,  "tenure": "Up to 5 years", "purpose": "Working Capital"},
        {"id": "loan-sidbi", "bank": "SIDBI",               "type": "SPEED Plus",          "interest": "6.75% onwards",  "minRate": 6.75, "amount": "Rs 25L - Rs 2Cr", "maxAmountLakhs": 200, "tenure": "Up to 3 years", "purpose": "Machinery Purchase"},
        {"id": "loan-sbi",   "bank": "State Bank of India", "type": "SME Smart Score Loan","interest": "7.90% onwards",  "minRate": 7.90, "amount": "Rs 50L - Rs 3Cr", "maxAmountLakhs": 300, "tenure": "Up to 7 years", "purpose": "Expansion Capital"},
    ],
    "requiredDocs": [
        {"id": "doc-sales-register",  "name": "Sales Register",  "status": "ready"},
        {"id": "doc-bank-statement",  "name": "Bank Statement",   "status": "ready"},
        {"id": "doc-export-records",  "name": "Export Records",   "status": "pending"},
        {"id": "doc-previous-return", "name": "Previous Return",  "status": "ready"},
    ],
}

df_compliance = pd.DataFrame(seed_data["compliances"])
df_alerts     = pd.DataFrame(seed_data["alerts"])
df_schemes    = pd.DataFrame(seed_data["schemes"])
df_loans      = pd.DataFrame(seed_data["loans"])
df_docs       = pd.DataFrame(seed_data["requiredDocs"])

df_compliance["date"] = pd.to_datetime(df_compliance["date"])
df_alerts["date"]     = pd.to_datetime(df_alerts["date"])

p = seed_data["profile"]
print(f"  Company   : {p['companyName']}")
print(f"  Industry  : {p['industry']}")
print(f"  Location  : {p['location']}")
print(f"  Employees : {p['employees']}")
print()
print(df_compliance[["title", "date", "status"]].to_string(index=False))

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 – Compliance Analysis & Risk Scoring
# ─────────────────────────────────────────────────────────────────────────────
print("\n╔════════════════════════════════════════════════════╗")
print("║  SECTION 3 – COMPLIANCE ANALYSIS & RISK SCORING   ║")
print("╚════════════════════════════════════════════════════╝")

STATUS_COLORS = {"COMPLETED": "#22c55e", "PENDING": "#f59e0b", "OVERDUE": "#ef4444"}
TODAY = pd.Timestamp("2026-03-23")

total     = len(df_compliance)
completed = (df_compliance["status"] == "COMPLETED").sum()
pending   = (df_compliance["status"] == "PENDING").sum()
overdue   = (df_compliance["status"] == "OVERDUE").sum()

health_score = round((completed / total) * 100)
health_label = ("Excellent" if health_score >= 85 else "Good" if health_score >= 70 else "Needs Attention")

print(f"  Compliance Health Score : {health_score}%  →  {health_label}")
print(f"    ✅ Completed : {completed}")
print(f"    ⏳ Pending   : {pending}")
print(f"    🚨 Overdue   : {overdue}")

def compute_risk_score(row):
    score = 0
    if row["status"] == "OVERDUE":
        score += 60
        days_late = (TODAY - row["date"]).days
        score += min(30, days_late * 2)
    elif row["status"] == "PENDING":
        days_left = (row["date"] - TODAY).days
        if days_left <= 3:   score += 50
        elif days_left <= 7: score += 30
        else:                score += 10
    return min(score, 100)

df_compliance["days_until_due"] = (df_compliance["date"] - TODAY).dt.days
df_compliance["risk_score"]     = df_compliance.apply(compute_risk_score, axis=1)

print()
print(df_compliance[["title", "status", "days_until_due", "risk_score"]]
      .sort_values("risk_score", ascending=False).to_string(index=False))

# Compliance charts
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
status_counts = df_compliance["status"].value_counts()
axes[0].pie(
    status_counts.values,
    labels=status_counts.index,
    colors=[STATUS_COLORS[s] for s in status_counts.index],
    autopct="%1.0f%%", startangle=90,
    wedgeprops=dict(edgecolor="white", linewidth=2),
)
axes[0].set_title("Compliance Status Distribution", fontweight="bold", fontsize=13)

axes[1].barh(df_compliance["title"], df_compliance["days_until_due"],
             color=[STATUS_COLORS[s] for s in df_compliance["status"]])
axes[1].axvline(0, color="black", linewidth=1.2, linestyle="--", label="Today")
axes[1].set_xlabel("Days Until Due (negative = overdue)")
axes[1].set_title("Compliance Deadline Timeline", fontweight="bold", fontsize=13)
axes[1].legend()
plt.suptitle("CompliAssist – Compliance Dashboard", fontsize=15, fontweight="bold")
plt.tight_layout()
plt.savefig("compliance_analysis.png", dpi=150, bbox_inches="tight")
plt.show()

# Risk score chart
fig, ax = plt.subplots(figsize=(10, 4))
risk_colors = ["#ef4444" if s >= 60 else "#f59e0b" if s >= 30 else "#22c55e"
               for s in df_compliance["risk_score"]]
bars = ax.barh(df_compliance["title"], df_compliance["risk_score"], color=risk_colors)
ax.set_xlabel("Risk Score (0 = Safe, 100 = Critical)")
ax.set_title("Compliance Item Risk Scores", fontweight="bold", fontsize=13)
ax.set_xlim(0, 100)
for bar, score in zip(bars, df_compliance["risk_score"]):
    ax.text(bar.get_width() + 1, bar.get_y() + bar.get_height() / 2,
            f"{score}", va="center", fontweight="bold")
ax.legend(handles=[
    mpatches.Patch(color="#ef4444", label="Critical (≥60)"),
    mpatches.Patch(color="#f59e0b", label="Warning (30-59)"),
    mpatches.Patch(color="#22c55e", label="Safe (<30)"),
], loc="lower right")
plt.tight_layout()
plt.savefig("risk_scores.png", dpi=150, bbox_inches="tight")
plt.show()

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 – Loan Recommendation Analysis
# ─────────────────────────────────────────────────────────────────────────────
print("\n╔════════════════════════════════════════════════════╗")
print("║  SECTION 4 – LOAN RECOMMENDATION ANALYSIS         ║")
print("╚════════════════════════════════════════════════════╝")

def loan_score(row, purpose_need="Working Capital"):
    score  = max(0, (10 - row["minRate"]) * 10)
    score += min(30, row["maxAmountLakhs"] / 10)
    if purpose_need.lower() in row["purpose"].lower():
        score += 20
    return round(score, 1)

df_loans["recommendation_score"] = df_loans.apply(loan_score, axis=1)
df_loans_sorted = df_loans.sort_values("recommendation_score", ascending=False)

print(df_loans_sorted[["bank", "type", "minRate", "maxAmountLakhs", "purpose", "recommendation_score"]]
      .to_string(index=False))

fig, axes = plt.subplots(1, 2, figsize=(13, 5))
axes[0].bar(df_loans["bank"], df_loans["minRate"], color=["#6366f1", "#06b6d4", "#10b981"])
axes[0].set_ylabel("Min Interest Rate (%)")
axes[0].set_title("Loan Interest Rate Comparison", fontweight="bold")
for i, r in enumerate(df_loans["minRate"]):
    axes[0].text(i, r + 0.1, f"{r}%", ha="center", fontweight="bold")

axes[1].barh(df_loans_sorted["bank"], df_loans_sorted["recommendation_score"],
             color=["#6366f1", "#06b6d4", "#10b981"])
axes[1].set_xlabel("Recommendation Score")
axes[1].set_title("Loan Recommendation Ranking\n(for Working Capital need)", fontweight="bold")
plt.suptitle("CompliAssist – Loan Recommendation Analysis", fontsize=13, fontweight="bold")
plt.tight_layout()
plt.savefig("loan_analysis.png", dpi=150, bbox_inches="tight")
plt.show()

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 – Government Scheme Matching
# ─────────────────────────────────────────────────────────────────────────────
print("\n╔════════════════════════════════════════════════════╗")
print("║  SECTION 5 – GOVERNMENT SCHEME MATCHING           ║")
print("╚════════════════════════════════════════════════════╝")

def refresh_scheme_scores(schemes, industry="Information Technology"):
    is_tech = "technology" in industry.lower()
    result = []
    for i, scheme in enumerate(schemes):
        bonus = 5 if is_tech and "TECHNOLOGY" in scheme["tags"] else 0
        new_match = max(68, min(99, scheme["match"] + bonus - i))
        result.append({**scheme, "match_after_scan": new_match})
    return pd.DataFrame(result)

df_schemes_scan = refresh_scheme_scores(seed_data["schemes"])
print(df_schemes_scan[["title", "match", "match_after_scan"]].to_string(index=False))

x = np.arange(len(df_schemes_scan))
fig, ax = plt.subplots(figsize=(10, 4))
ax.bar(x - 0.175, df_schemes_scan["match"],            0.35, label="Before Scan", color="#94a3b8")
ax.bar(x + 0.175, df_schemes_scan["match_after_scan"], 0.35, label="After Scan",  color="#6366f1")
ax.set_xticks(x)
ax.set_xticklabels(
    [s["title"].split("(")[0].strip() for s in seed_data["schemes"]],
    rotation=15, ha="right"
)
ax.set_ylabel("Match Score (%)")
ax.set_ylim(60, 100)
ax.set_title("Scheme Eligibility Match – Before vs After Profile Scan", fontweight="bold")
ax.legend()
plt.tight_layout()
plt.savefig("scheme_match.png", dpi=150, bbox_inches="tight")
plt.show()

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6 – Alert & Deadline Analysis
# ─────────────────────────────────────────────────────────────────────────────
print("\n╔════════════════════════════════════════════════════╗")
print("║  SECTION 6 – ALERT & DEADLINE ANALYSIS            ║")
print("╚════════════════════════════════════════════════════╝")

ALERT_COLORS = {"overdue": "#ef4444", "warning": "#f59e0b", "info": "#3b82f6"}
print(df_alerts[["title", "type", "date", "status"]].to_string(index=False))
print(f"\nOpen alerts   : {(df_alerts['status'] == 'OPEN').sum()}")
print(f"Overdue alerts: {(df_alerts['type'] == 'overdue').sum()}")

at = df_alerts["type"].value_counts()
fig, ax = plt.subplots(figsize=(6, 4))
ax.bar(at.index, at.values, color=[ALERT_COLORS.get(t, "#94a3b8") for t in at.index])
ax.set_title("Alert Types Distribution", fontweight="bold")
ax.set_ylabel("Count")
plt.tight_layout()
plt.savefig("alert_analysis.png", dpi=150, bbox_inches="tight")
plt.show()

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7 – AI Query Assistant – Pattern Analysis
# ─────────────────────────────────────────────────────────────────────────────
print("\n╔════════════════════════════════════════════════════╗")
print("║  SECTION 7 – AI QUERY ASSISTANT ANALYSIS          ║")
print("╚════════════════════════════════════════════════════╝")

QUERY_CATEGORIES = {
    "Greetings":          ["hi", "hello", "hey", "namaste"],
    "GST / GSTR-1":       ["gst", "gstr-1", "gstr1", "gst filing"],
    "EPF / PF":           ["epf", "provident fund", "pf"],
    "TDS":                ["tds", "tax deducted", "tcs"],
    "Professional Tax":   ["professional tax", "ptax"],
    "Loans / Finance":    ["loan", "finance", "credit", "borrow", "fund"],
    "Govt Schemes":       ["scheme", "subsidy", "grant", "ministry"],
    "Documents":          ["document", "upload", "vault", "file", "storage"],
    "Alerts / Deadlines": ["alert", "deadline", "overdue", "urgent", "pending"],
    "Compliance Status":  ["compliance", "status", "health", "score"],
    "Company Profile":    ["profile", "company", "about", "business"],
    "Udyam":              ["udyam", "registration", "msme certificate"],
    "Settings":           ["setting", "notification", "email", "remind"],
    "Income Tax":         ["income tax", "itr", "it return"],
    "Dashboard":          ["dashboard", "summary", "overview"],
}

def classify_query(question):
    q = question.lower()
    for cat, keywords in QUERY_CATEGORIES.items():
        if any(kw in q for kw in keywords):
            return cat
    return "Fallback / General"

test_queries = [
    "What is my GST filing status?",
    "Show available loans for my company",
    "Are there any overdue alerts?",
    "Which government schemes match my profile?",
    "What is my EPF contribution status?",
    "Hello!",
    "Explain TDS for my company",
    "What documents should I upload?",
    "Give me a dashboard summary",
]

print(f"  {'Query':<45} {'Detected Category'}")
print("  " + "-" * 70)
for q in test_queries:
    print(f"  {q:<45} {classify_query(q)}")

# Coverage chart
cat_df = pd.DataFrame({
    "Category": list(QUERY_CATEGORIES.keys()),
    "Keywords":  [len(v) for v in QUERY_CATEGORIES.values()],
})
fig, ax = plt.subplots(figsize=(12, 5))
bars = ax.barh(cat_df["Category"], cat_df["Keywords"], color="#6366f1")
ax.set_xlabel("Number of Trigger Keywords")
ax.set_title("AI Query Assistant – Category Coverage", fontweight="bold", fontsize=13)
for bar, cnt in zip(bars, cat_df["Keywords"]):
    ax.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height() / 2,
            str(cnt), va="center")
plt.tight_layout()
plt.savefig("ai_coverage.png", dpi=150, bbox_inches="tight")
plt.show()
print(f"\n  Total intent categories  : {len(QUERY_CATEGORIES)}")
print(f"  Total trigger keywords   : {sum(len(v) for v in QUERY_CATEGORIES.values())}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8 – Dashboard KPIs & Full Visualisation
# ─────────────────────────────────────────────────────────────────────────────
print("\n╔════════════════════════════════════════════════════╗")
print("║  SECTION 8 – DASHBOARD KPIs                       ║")
print("╚════════════════════════════════════════════════════╝")

kpis = {
    "Compliance Score":       f"{health_score}% ({health_label})",
    "Completed":              completed,
    "Pending":                pending,
    "Overdue":                overdue,
    "Open Alerts":            (df_alerts["status"] == "OPEN").sum(),
    "Matched Schemes":        len(df_schemes),
    "Loan Options":           len(df_loans),
    "Required Docs Ready":    (df_docs["status"] == "ready").sum(),
    "Required Docs Pending":  (df_docs["status"] == "pending").sum(),
    "Best Loan Rate":         f"{df_loans['minRate'].min()}% ({df_loans.loc[df_loans['minRate'].idxmin(), 'bank']})",
}

print("  ╔══════════════════════════════════════════════════╗")
for k, v in kpis.items():
    print(f"  ║  {k:<30} {str(v):<16} ║")
print("  ╚══════════════════════════════════════════════════╝")

# 6-panel dashboard
fig = plt.figure(figsize=(15, 10))
fig.suptitle("CompliAssist – Full Dashboard", fontsize=16, fontweight="bold")
gs = fig.add_gridspec(2, 3, hspace=0.45, wspace=0.35)

ax1 = fig.add_subplot(gs[0, 0])
sc = df_compliance["status"].value_counts()
ax1.pie(sc.values, labels=sc.index,
        colors=[STATUS_COLORS[s] for s in sc.index],
        autopct="%1.0f%%", startangle=90,
        wedgeprops=dict(edgecolor="white", linewidth=2))
ax1.set_title("Compliance Status", fontweight="bold")

ax2 = fig.add_subplot(gs[0, 1])
ax2.barh(df_compliance["title"], df_compliance["risk_score"],
         color=["#ef4444" if s >= 60 else "#f59e0b" if s >= 30 else "#22c55e"
                for s in df_compliance["risk_score"]])
ax2.set_xlabel("Risk Score")
ax2.set_title("Compliance Risk Scores", fontweight="bold")
ax2.set_xlim(0, 100)

ax3 = fig.add_subplot(gs[0, 2])
ax3.bar(range(len(df_schemes)), df_schemes["match"], color="#6366f1")
ax3.set_xticks(range(len(df_schemes)))
ax3.set_xticklabels(
    [s["title"].split("(")[0].strip() for s in seed_data["schemes"]],
    rotation=15, ha="right", fontsize=8
)
ax3.set_ylabel("Match %")
ax3.set_ylim(60, 100)
ax3.set_title("Govt Scheme Matches", fontweight="bold")

ax4 = fig.add_subplot(gs[1, 0])
ax4.bar(df_loans["bank"], df_loans["minRate"], color=["#f59e0b", "#10b981", "#3b82f6"])
ax4.set_ylabel("Min Rate (%)")
ax4.set_title("Loan Interest Rates", fontweight="bold")
ax4.set_ylim(5, 11)
for i, r in enumerate(df_loans["minRate"]):
    ax4.text(i, r + 0.1, f"{r}%", ha="center", fontsize=9, fontweight="bold")

ax5 = fig.add_subplot(gs[1, 1])
doc_status = df_docs["status"].value_counts()
ax5.bar(doc_status.index, doc_status.values,
        color=["#22c55e" if s == "ready" else "#ef4444" for s in doc_status.index])
ax5.set_title("Required Documents", fontweight="bold")
ax5.set_ylabel("Count")

ax6 = fig.add_subplot(gs[1, 2])
at2 = df_alerts["type"].value_counts()
ax6.bar(at2.index, at2.values,
        color=[ALERT_COLORS.get(t, "#94a3b8") for t in at2.index])
ax6.set_title("Alert Type Breakdown", fontweight="bold")
ax6.set_ylabel("Count")

plt.savefig("dashboard_full.png", dpi=150, bbox_inches="tight")
plt.show()
print("  ✅ Full dashboard saved: dashboard_full.png")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9 – API Endpoint Testing  (requires server running on port 8787)
# ─────────────────────────────────────────────────────────────────────────────
print("\n╔════════════════════════════════════════════════════╗")
print("║  SECTION 9 – API ENDPOINT TESTING                 ║")
print("╚════════════════════════════════════════════════════╝")
print("  NOTE: Start the server first with: npm run start\n")

try:
    import requests

    BASE = "http://localhost:8787"
    TOKEN = None

    def hit(method, path, body=None, token=None, label=""):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        try:
            r = requests.request(method, BASE + path, json=body, headers=headers, timeout=5)
            icon = "✅" if r.status_code < 300 else "❌"
            print(f"  {icon} [{r.status_code}] {method:6} {path:<42} {label}")
            return r
        except Exception as e:
            print(f"  ⚠️  {method} {path} → {e}")
            return None

    resp = hit("GET",  "/api/health", label="Health check")
    resp = hit("POST", "/api/auth/login",
               {"email": "admin@technova.com", "password": "demo123"}, label="Login")
    if resp and resp.status_code == 200:
        TOKEN = resp.json().get("token")
        print(f"     Token: {TOKEN[:16]}...")

    for m, p, b, lbl in [
        ("GET",  "/api/auth/session",           None, "Session check"),
        ("GET",  "/api/bootstrap",              None, "Bootstrap data"),
        ("POST", "/api/schemes/scan",           None, "Scheme eligibility scan"),
        ("POST", "/api/loans/compare",          None, "Loan comparison"),
        ("POST", "/api/assistant/query",        {"question": "What is my GST status?"}, "AI query – GST"),
        ("GET",  "/api/loans/loan-sidbi/eligibility", None, "Loan eligibility check"),
    ]:
        hit(m, p, b, TOKEN, lbl)

except ImportError:
    print("  ⚠️  `requests` not installed. Run: pip install requests")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 10 – Docker & Deployment Metrics
# ─────────────────────────────────────────────────────────────────────────────
print("\n╔════════════════════════════════════════════════════╗")
print("║  SECTION 10 – DOCKER & DEPLOYMENT METRICS         ║")
print("╚════════════════════════════════════════════════════╝")
print("""
  Build stages  : 2  (build → runtime)
  Base image    : node:20-alpine
  Exposed port  : 8787
  Healthcheck   : GET /api/health  (every 30s)
  Data volumes  : backend/data/, backend/uploads/

  ── Build command ──────────────────────────────────
  docker build -t compliassist .

  ── Run with persistent volumes ────────────────────
  docker run -p 8787:8787 \\
    -v compliassist_data:/app/backend/data \\
    -v compliassist_uploads:/app/backend/uploads \\
    compliassist
""")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 11 – Source Code Metrics & SEPM Summary
# ─────────────────────────────────────────────────────────────────────────────
print("╔════════════════════════════════════════════════════╗")
print("║  SECTION 11 – SOURCE CODE METRICS & SEPM SUMMARY  ║")
print("╚════════════════════════════════════════════════════╝")

PROJECT_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS    = {"node_modules", "dist", ".git", "uploads", "data", "__pycache__"}
EXTENSIONS   = {".jsx", ".js", ".css", ".html"}

file_stats: dict[str, dict] = {}
for root, dirs, files in os.walk(PROJECT_ROOT):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for fname in files:
        ext = os.path.splitext(fname)[1].lower()
        if ext in EXTENSIONS:
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    lines = len(f.readlines())
                if ext not in file_stats:
                    file_stats[ext] = {"files": 0, "lines": 0}
                file_stats[ext]["files"] += 1
                file_stats[ext]["lines"] += lines
            except OSError:
                pass

df_stats = pd.DataFrame([
    {"Extension": ext, "Files": v["files"], "Lines of Code": v["lines"]}
    for ext, v in file_stats.items()
]).sort_values("Lines of Code", ascending=False)

print("\n  === Source Code Metrics ===")
print(df_stats.to_string(index=False))
print(f"\n  Total files : {df_stats['Files'].sum()}")
print(f"  Total LoC   : {df_stats['Lines of Code'].sum()}")

sepm_summary = {
    "Project Name":         "CompliAssist – MSME Compliance Platform",
    "Type":                 "Full-Stack Web Application",
    "Frontend":             "Vite + React 19 (SPA)",
    "Backend":              "Node.js HTTP server (no framework)",
    "Data Storage":         "Flat-file JSON store with seed data",
    "Authentication":       "Token-based sessions (UUID tokens)",
    "Deployment":           "Docker (multi-stage, node:20-alpine)",
    "Pages Implemented":    10,
    "API Endpoints":        15,
    "AI Query Categories":  len(QUERY_CATEGORIES),
    "Compliance Items":     len(df_compliance),
    "Loan Options":         len(df_loans),
    "Govt Schemes":         len(df_schemes),
}

print("\n  ╔══════════════════════════════════════════════════════════════╗")
print("  ║                   SEPM PROJECT SUMMARY                      ║")
print("  ╠══════════════════════════════════════════════════════════════╣")
for k, v in sepm_summary.items():
    print(f"  ║  {k:<28} {str(v):<31} ║")
print("  ╚══════════════════════════════════════════════════════════════╝")

# Code metrics chart
ext_colors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"]
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
axes[0].bar(df_stats["Extension"], df_stats["Files"],        color=ext_colors[:len(df_stats)])
axes[0].set_title("Files per Type",        fontweight="bold")
axes[0].set_ylabel("Number of Files")
axes[1].bar(df_stats["Extension"], df_stats["Lines of Code"], color=ext_colors[:len(df_stats)])
axes[1].set_title("Lines of Code per Type", fontweight="bold")
axes[1].set_ylabel("Lines of Code")
plt.suptitle("CompliAssist – Source Code Metrics", fontsize=13, fontweight="bold")
plt.tight_layout()
plt.savefig("code_metrics.png", dpi=150, bbox_inches="tight")
plt.show()

print("\n✅ All sections complete. Charts saved as PNG files in the project folder.")
