'use strict';

(function initSWPI(windowObj) {
  const STORAGE_KEYS = {
    token: 'token',
    legacyToken: 'authToken',
    apiBase: 'swpi_api_base',
    schoolId: 'school_id'
  };

  const DEFAULT_API_BASE = 'https://sportz-well-backend.onrender.com';

  function normalizeBaseUrl(url) {
    return String(url || DEFAULT_API_BASE).trim().replace(/\/+$/, '');
  }

  function getApiBase() {
    const fromStorage = localStorage.getItem(STORAGE_KEYS.apiBase);
    return normalizeBaseUrl(fromStorage || DEFAULT_API_BASE);
  }

  function setApiBase(nextBase) {
    localStorage.setItem(STORAGE_KEYS.apiBase, normalizeBaseUrl(nextBase));
  }

  function getToken() {
    return (
      localStorage.getItem(STORAGE_KEYS.token) ||
      localStorage.getItem(STORAGE_KEYS.legacyToken) ||
      ''
    );
  }

  function setToken(token) {
    const safeToken = String(token || '').trim();
    if (!safeToken) {
      return;
    }

    localStorage.setItem(STORAGE_KEYS.token, safeToken);
    localStorage.setItem(STORAGE_KEYS.legacyToken, safeToken);
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.legacyToken);
    localStorage.removeItem('user');
  }

  function getSchoolId() {
    return localStorage.getItem(STORAGE_KEYS.schoolId) || '';
  }

  function setSchoolId(schoolId) {
    if (schoolId === undefined || schoolId === null || schoolId === '') {
      return;
    }

    localStorage.setItem(STORAGE_KEYS.schoolId, String(schoolId));
  }

  function buildUrl(path) {
    const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`;
    return `${getApiBase()}${normalizedPath}`;
  }

  function parseJsonSafe(text) {
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch (_error) {
      return {};
    }
  }

  async function request(path, options = {}) {
    const {
      method = 'GET',
      body,
      auth = true,
      headers = {},
      timeoutMs = 15000
    } = options;

    const finalHeaders = Object.assign({ Accept: 'application/json' }, headers);
    const isJsonBody = body !== undefined && body !== null && !(body instanceof FormData);

    if (isJsonBody && !finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    if (auth) {
      const token = getToken();
      if (token) {
        finalHeaders.Authorization = `Bearer ${token}`;
      }
    }

    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);
    const url = buildUrl(path);

    try {
      const response = await fetch(url, {
        method,
        headers: finalHeaders,
        body: isJsonBody ? JSON.stringify(body) : body,
        signal: controller.signal
      });

      const rawText = await response.text();
      const parsed = parseJsonSafe(rawText);

      if (!response.ok) {
        const message = parsed.message || parsed.error || `Request failed (${response.status})`;
        const error = new Error(message);
        error.status = response.status;
        error.url = url;
        error.response = parsed;

        if (response.status === 401) {
          clearSession();
        }

        throw error;
      }

      return parsed;
    } finally {
      clearTimeout(timerId);
    }
  }

  async function requestFirst(paths, options = {}) {
    const errors = [];

    for (const path of paths) {
      try {
        return await request(path, options);
      } catch (error) {
        errors.push(error);
      }
    }

    const first = errors[0] || new Error('No API path could be called.');
    first.allErrors = errors;
    throw first;
  }

  function coerceGender(value) {
    const safe = String(value || '').trim().toLowerCase();

    if (safe === 'm' || safe === 'male' || safe === 'boy') {
      return 'Male';
    }

    if (safe === 'f' || safe === 'female' || safe === 'girl') {
      return 'Female';
    }

    return '--';
  }

  function calculateAge(dob) {
    if (!dob) {
      return null;
    }

    const date = new Date(dob);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const hasBirthdayPassed =
      today.getMonth() > date.getMonth() ||
      (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());

    if (!hasBirthdayPassed) {
      age -= 1;
    }

    return age >= 0 ? age : null;
  }

  function normalizePlayer(rawPlayer) {
    const dob =
      rawPlayer.date_of_birth ||
      rawPlayer.dob ||
      rawPlayer.birth_date ||
      rawPlayer.dateOfBirth ||
      null;

    const riskRaw = rawPlayer.risk_status || rawPlayer.riskStatus || '';
    const improvementRaw = rawPlayer.improvement_pct ?? rawPlayer.improvementPct ?? null;
    const latestScoreRaw = rawPlayer.latest_score ?? rawPlayer.latestScore ?? null;

    return {
      id: rawPlayer.id || rawPlayer.user_id || rawPlayer.userId || '',
      name: rawPlayer.name || rawPlayer.player_name || 'Unnamed Player',
      role: rawPlayer.role || rawPlayer.player_role || '--',
      gender: coerceGender(rawPlayer.gender),
      dateOfBirth: dob,
      age: calculateAge(dob),
      latestScore:
        latestScoreRaw === null || latestScoreRaw === undefined || Number.isNaN(Number(latestScoreRaw))
          ? null
          : Math.round(Number(latestScoreRaw) * 100) / 100,
      improvementPct:
        improvementRaw === null || improvementRaw === undefined || Number.isNaN(Number(improvementRaw))
          ? null
          : Math.round(Number(improvementRaw) * 100) / 100,
      riskStatus: riskRaw || 'On Track'
    };
  }

  async function login(email, password) {
    const response = await requestFirst(
      ['/api/v1/auth/login', '/api/v1/login', '/api/login', '/login'],
      {
        method: 'POST',
        auth: false,
        body: { email, password }
      }
    );

    const token =
      response.token ||
      response.accessToken ||
      (response.data && (response.data.token || response.data.accessToken));

    if (!token) {
      throw new Error('Login succeeded but token was not found in response.');
    }

    setToken(token);

    const schoolId =
      response.school_id ||
      response.schoolId ||
      (response.user && (response.user.school_id || response.user.schoolId)) ||
      (response.data &&
        (response.data.school_id ||
          response.data.schoolId ||
          (response.data.user &&
            (response.data.user.school_id || response.data.user.schoolId))));

    setSchoolId(schoolId);
    return response;
  }

  async function fetchPlayers() {
    const response = await request('/api/v1/players');
    const rows = response.data || response.players || [];
    return rows.map(normalizePlayer);
  }

  async function fetchPlayerById(playerId) {
    if (!playerId) {
      throw new Error('playerId is required.');
    }

    const response = await request(`/api/v1/players/${encodeURIComponent(playerId)}`);
    const source = response.data || response.player || response;
    return normalizePlayer(source);
  }

  async function fetchDashboard() {
    const response = await request('/api/v1/analytics/dashboard');
    return response.data || response;
  }

  async function fetchTrend() {
    const response = await request('/api/v1/analytics/trend');
    return response.data || response;
  }

  async function resetDemoData() {
    return request('/api/v1/demo/reset', { method: 'POST' });
  }

  function formatGrowthWithArrow(value) {
    const numeric = Number(value || 0);
    if (numeric > 0) {
      return `\u2191 ${Math.abs(numeric).toFixed(2)}%`;
    }
    if (numeric < 0) {
      return `\u2193 ${Math.abs(numeric).toFixed(2)}%`;
    }
    return '\u2192 0.00%';
  }

  windowObj.SWPI = {
    request,
    requestFirst,
    login,
    fetchPlayers,
    fetchPlayerById,
    fetchDashboard,
    fetchTrend,
    resetDemoData,
    normalizePlayer,
    formatGrowthWithArrow,
    getApiBase,
    setApiBase,
    getToken,
    setToken,
    clearSession,
    getSchoolId,
    setSchoolId
  };
})(window);
