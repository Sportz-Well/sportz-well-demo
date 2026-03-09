// ===============================
// Sportz-Well Global App Script
// Production API Connection
// ===============================

// Live Backend API
const API_BASE = "https://sportz-well-backend.onrender.com";


// ===============================
// LOGIN FUNCTION
// ===============================
async function loginUser(email, password) {

    try {

        const response = await fetch(`${API_BASE}/api/login`, {
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
        alert("Server error");

    }
}



// ===============================
// TOKEN HELPER
// ===============================
function getToken() {

    return localStorage.getItem("token");

}



// ===============================
// FETCH PLAYERS
// ===============================
async function fetchPlayers() {

    try {

        const response = await fetch(`${API_BASE}/api/players`, {
            headers: {
                Authorization: `Bearer ${getToken()}`
            }
        });

        const players = await response.json();

        return players;

    } catch (error) {

        console.error("Error loading players:", error);
        return [];

    }

}



// ===============================
// ADD PLAYER
// ===============================
async function addPlayer(playerData) {

    try {

        const response = await fetch(`${API_BASE}/api/players`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getToken()}`
            },
            body: JSON.stringify(playerData)
        });

        const data = await response.json();

        return data;

    } catch (error) {

        console.error("Add player error:", error);

    }

}



// ===============================
// FETCH SINGLE PLAYER
// ===============================
async function getPlayer(playerId) {

    try {

        const response = await fetch(`${API_BASE}/api/players/${playerId}`, {
            headers: {
                Authorization: `Bearer ${getToken()}`
            }
        });

        return await response.json();

    } catch (error) {

        console.error("Player fetch error:", error);

    }

}



// ===============================
// LOGOUT
// ===============================
function logout() {

    localStorage.removeItem("token");

    window.location.href = "login.html";

}