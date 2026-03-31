/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
} from 'react';
import { apiRequest, SESSION_STORAGE_KEY } from '../lib/api';

const AppContext = createContext(null);

function readStoredSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistSession(nextSession) {
  if (!nextSession) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [data, setData] = useState(null);
  const [isReady, setIsReady] = useState(false);

  function applySession(nextSession) {
    setSession(nextSession);
    persistSession(nextSession);
  }

  function clearSession() {
    applySession(null);
    startTransition(() => setData(null));
  }

  async function performAuthedRequest(path, options = {}) {
    if (!session?.token) {
      throw new Error('You are not signed in.');
    }

    try {
      return await apiRequest(path, { ...options, token: session.token });
    } catch (error) {
      if (error.status === 401) {
        clearSession();
      }

      throw error;
    }
  }

  useEffect(() => {
    const storedSession = readStoredSession();
    let isActive = true;

    if (!storedSession?.token) {
      setIsReady(true);
      return;
    }

    apiRequest('/auth/session', { token: storedSession.token })
      .then((response) => {
        if (!isActive) {
          return;
        }

        setSession({
          token: storedSession.token,
          user: response.user,
        });
        persistSession({
          token: storedSession.token,
          user: response.user,
        });
        startTransition(() => setData(response.data));
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setSession(null);
        persistSession(null);
        startTransition(() => setData(null));
      })
      .finally(() => {
        if (isActive) {
          setIsReady(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function login(credentials) {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: credentials,
    });

    applySession({
      token: response.token,
      user: response.user,
    });
    startTransition(() => setData(response.data));
    setIsReady(true);
    return response;
  }

  async function logout() {
    try {
      if (session?.token) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          token: session.token,
        });
      }
    } finally {
      clearSession();
      setIsReady(true);
    }
  }

  async function refreshData() {
    const response = await performAuthedRequest('/bootstrap');
    startTransition(() => setData(response.data));
    return response.data;
  }

  async function saveProfile(profile) {
    const response = await performAuthedRequest('/profile', {
      method: 'PUT',
      body: profile,
    });
    startTransition(() => setData(response.data));
    return response.message;
  }

  async function saveSettings(settings) {
    const response = await performAuthedRequest('/settings', {
      method: 'PUT',
      body: settings,
    });
    startTransition(() => setData(response.data));
    return response.message;
  }

  async function updateGuidanceDocument(documentId, status) {
    const response = await performAuthedRequest(`/guidance/documents/${documentId}`, {
      method: 'PUT',
      body: { status },
    });
    startTransition(() => setData(response.data));
    return response.message;
  }

  async function resolveAlert(alertId) {
    const response = await performAuthedRequest(`/alerts/${alertId}/action`, {
      method: 'POST',
    });
    startTransition(() => setData(response.data));
    return response.message;
  }

  async function scanSchemes() {
    const response = await performAuthedRequest('/schemes/scan', {
      method: 'POST',
    });
    startTransition(() => setData(response.data));
    return response.message;
  }

  async function checkSchemeEligibility(schemeId) {
    const response = await performAuthedRequest(`/schemes/${schemeId}/eligibility`);
    startTransition(() => setData(response.data));
    return {
      message: response.message,
      eligible: response.eligible,
      missingDocs: response.missingDocs || [],
      matchScore: response.matchScore,
    };
  }

  async function compareLoans() {
    const response = await performAuthedRequest('/loans/compare', {
      method: 'POST',
    });
    startTransition(() => setData(response.data));
    return response.message;
  }

  async function getLoanEligibility(loanId) {
    const response = await performAuthedRequest(`/loans/${loanId}/eligibility`);
    startTransition(() => setData(response.data));
    return {
      message: response.message,
      eligible: response.eligible,
      missingDocs: response.missingDocs || [],
    };
  }

  async function askAssistant(question) {
    const response = await performAuthedRequest('/assistant/query', {
      method: 'POST',
      body: { question },
    });
    startTransition(() => setData(response.data));
    return response.message;
  }

  async function uploadDocument(file) {
    const content = await fileToDataUrl(file);
    const response = await performAuthedRequest('/documents/upload', {
      method: 'POST',
      body: {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        content,
      },
    });
    startTransition(() => setData(response.data));
    return response.message;
  }

  async function deleteDocument(documentId) {
    const response = await performAuthedRequest(`/documents/${documentId}`, {
      method: 'DELETE',
    });
    startTransition(() => setData(response.data));
    return response.message;
  }

  async function downloadDocument(documentId, fileName) {
    const blob = await performAuthedRequest(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });

    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
  }

  return (
    <AppContext.Provider
      value={{
        session,
        data,
        isReady,
        isAuthenticated: Boolean(session?.token),
        login,
        logout,
        refreshData,
        saveProfile,
        saveSettings,
        updateGuidanceDocument,
        resolveAlert,
        scanSchemes,
        checkSchemeEligibility,
        compareLoans,
        getLoanEligibility,
        askAssistant,
        uploadDocument,
        deleteDocument,
        downloadDocument,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used within AppProvider.');
  }

  return context;
}
