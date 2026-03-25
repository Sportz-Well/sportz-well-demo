const API_BASE = "https://sportz-well-backend.onrender.com";

async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!data.token) {
      alert("Login failed");
      console.log(data);
      return;
    }

    // ✅ Save token
    localStorage.setItem("token", data.token);

    // ✅ Redirect
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error("Login error:", err);
    alert("Something went wrong");
  }
}

// Sportz-Well API Utility
const SWPI = {
  getToken() {
    return localStorage.getItem("token");
  },

  async request(url, options = {}) {
    const token = this.getToken();
    const headers = {
      "Content-Type": "application/json",
      ...options.headers
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {}

    if (!response.ok) {
      const error = new Error(data.error || data.message || "API Error");
      error.status = response.status;
      error.response = data;
      throw error;
    }

    return data;
  },

  async requestFirst(paths, options = {}) {
    const errors = [];
    for (const path of paths) {
      try {
        const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
        return await this.request(url, options);
      } catch (error) {
        errors.push(error);
      }
    }
    throw errors[errors.length - 1] || new Error("All endpoints failed");
  },

  async fetchPlayers() {
    const paths = [
      "/api/v1/players",
      "/api/players"
    ];
    return await this.requestFirst(paths, { method: "GET" });
  },

  async fetchPlayerById(playerId) {
    const paths = [
      `/api/v1/players/${encodeURIComponent(playerId)}`,
      `/api/players/${encodeURIComponent(playerId)}`
    ];
    return await this.requestFirst(paths, { method: "GET" });
  },

  async fetchDashboard() {
    const schoolId = new URLSearchParams(window.location.search).get("schoolId") || "";
    const suffix = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "";
    const paths = [
      `/api/v1/analytics/dashboard${suffix}`,
      `/api/analytics/dashboard${suffix}`
    ];
    return await this.requestFirst(paths, { method: "GET" });
  },

  async fetchTrend() {
    const schoolId = new URLSearchParams(window.location.search).get("schoolId") || "";
    const suffix = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "";
    const paths = [
      `/api/v1/analytics/trend${suffix}`,
      `/api/analytics/trend${suffix}`
    ];
    return await this.requestFirst(paths, { method: "GET" });
  },

  async resetDemoData() {
    return await this.request(`${API_BASE}/api/v1/demo/reset`, { method: "POST" });
  }
};