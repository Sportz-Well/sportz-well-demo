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