// Use Render backend for all deployments
const BACKEND_URL = "https://final-year-group-project-q9mg.onrender.com";
const email = sessionStorage.getItem("userEmail");
const msg = document.getElementById("adminMsg");

async function loadUsers() {
  try {
    const res = await fetch(`${BACKEND_URL}/admin/users`, {
      headers: { "x-admin-email": email }
    });

    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.message || "Not allowed";
      return;
    }

    const tbody = document.querySelector("#usersTable tbody");
    tbody.innerHTML = data.map(u => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #eee;">${u.id}</td>
        <td style="padding:10px; border-bottom:1px solid #eee;">${u.name || ""}</td>
        <td style="padding:10px; border-bottom:1px solid #eee;">${u.email}</td>
      </tr>
    `).join("");
  } catch {
    msg.textContent = "Backend not reachable ❌";
  }
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.clear();
  window.location.href = "index.html";
});

loadUsers();
