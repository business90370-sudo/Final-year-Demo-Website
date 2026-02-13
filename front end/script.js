console.log("script.js loaded ✅");

// Use Render backend for all deployments
const API_BASE = "https://final-year-demo-website-2.onrender.com";

// Hide login card if already logged in (until tab is closed)
if (sessionStorage.getItem("loggedIn") === "yes") {
  const loginCard = document.querySelector(".login-card");
  if (loginCard) loginCard.style.display = "none";
}

// Helper
function hideLoginCard() {
  const loginCard = document.querySelector(".login-card");
  if (loginCard) loginCard.style.display = "none";
}

// ===================== LOGIN =====================
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value.trim();

  if (!email || !password) return alert("Enter email & password");

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message);

    // ✅ only after success
    sessionStorage.setItem("loggedIn", "yes");
    sessionStorage.setItem("userEmail", data.user.email);
    sessionStorage.setItem("isAdmin", data.isAdmin ? "yes" : "no");

    alert("Login success ✅");

    // hide login UI if staying on same page
    hideLoginCard();

    // redirect
    if (data.isAdmin) window.location.href = "admin.html";
    else window.location.href = "index.html";
  } catch (err) {
    alert("Backend not reachable ❌ Run server.js first");
  }
});

// ===================== REGISTER =====================
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("regName")?.value.trim();
  const email = document.getElementById("regEmail")?.value.trim();
  const password = document.getElementById("regPassword")?.value.trim();

  if (!name || !email || !password) return alert("Fill all details");

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message);

    alert("Account created ✅ Now login");
    window.location.href = "index.html";
  } catch (err) {
    alert("Backend not reachable ❌ Run server.js first");
  }
});

// ===================== FORGOT PASSWORD =====================
document.getElementById("forgotForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("fpEmail")?.value.trim();
  const newPassword = document.getElementById("fpNewPassword")?.value.trim();

  if (!email || !newPassword) return alert("Fill all details");

  try {
    const res = await fetch(`${API_BASE}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message);

    alert("Password updated ✅");
    window.location.href = "index.html";
  } catch (err) {
    alert("Backend not reachable ❌ Run server.js first");
  }
});

// ===================== APPLY PAGE =====================
const applyForm = document.getElementById("applyForm");

if (applyForm) {
  applyForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const borrowerName = document.getElementById("borrowerName")?.value.trim();
    const loanType = document.getElementById("loanType")?.value.trim();
    const loanAmount = document.getElementById("loanAmount")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const address = document.getElementById("address")?.value.trim();

    if (!borrowerName || !loanType || !loanAmount || !phone || !address) {
      return alert("Fill all fields");
    }

    try {
      const res = await fetch(`${API_BASE}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ borrowerName, loanType, loanAmount, phone, address }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Application submitted ✅");
        applyForm.reset();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Backend not reachable ❌ Run server.js first");
    }
  });
}
