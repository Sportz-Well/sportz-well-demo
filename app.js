// ================================
// Sportz-Well Frontend API Config
// ================================

const API_BASE = "https://sportz-well-backend.onrender.com/api";


// ================================
// LOGIN
// ================================

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


// ================================
// TOKEN
// ================================

function getToken() {

    return localStorage.getItem("token");

}


// ================================
// GET PLAYERS
// ================================

async function fetchPlayers() {

    const response = await fetch(`${API_BASE}/players`, {
        headers: {
            Authorization: `Bearer ${getToken()}`
        }
    });

    return await response.json();

}


// ================================
// ADD PLAYER
// ================================

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


// ================================
// LOGOUT
// ================================

function logout() {

    localStorage.removeItem("token");

    window.location.href = "login.html";

}