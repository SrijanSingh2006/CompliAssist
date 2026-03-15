const API_BASE = '/api';

export const SESSION_STORAGE_KEY = 'compliassist-session';

export async function apiRequest(
  path,
  { token, method = 'GET', body, headers = {}, responseType = 'json' } = {},
) {
  const config = {
    method,
    headers: { ...headers },
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, config);

  if (responseType === 'blob') {
    if (!response.ok) {
      let errorMessage = 'Request failed.';

      try {
        const payload = await response.json();
        errorMessage = payload.message || errorMessage;
      } catch {
        // Ignore JSON parsing failure for blob responses.
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    return response.blob();
  }

  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : {};

  if (!response.ok) {
    const error = new Error(payload.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }

  return payload;
}
