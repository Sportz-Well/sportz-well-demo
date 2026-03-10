// ======================================
// SPORTZ-WELL FRONTEND API CONFIG
// ======================================

// IMPORTANT: Replace with your Render backend URL
const API_BASE = "https://sportz-well-backend.onrender.com";

// ======================================
// TOKEN HELPER
// ======================================

function getToken() {
  return localStorage.getItem("token");
}

// ======================================
// TOKEN HELPER
// ======================================

function getToken() {
  return localStorage.getItem("token");
}


// ======================================
// LOGIN
// ======================================

async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const data = await response.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      window.location.href = "dashboard.html";
    } else {
      alert("Invalid login credentials");
    }

  } catch (error) {
    console.error("Login error:", error);
    alert("Server connection failed");
  }
}


// ======================================
// GET PLAYERS
// ======================================

async function fetchPlayers() {
  const response = await fetch(`${API_BASE}/players`, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });

  return await response.json();
}


// ======================================
// ADD PLAYER
// ======================================

async function addPlayer(player) {

  const response = await fetch(`${API_BASE}/players`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify(player)
  });

  return await response.json();
}


// ======================================
// ADD ASSESSMENT
// ======================================

async function addAssessment(data) {

  const response = await fetch(`${API_BASE}/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify(data)
  });

  return await response.json();
}