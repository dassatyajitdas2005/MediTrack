/* MediTrack - User Management (Firebase Only) */

import * as fbDb from "./firebase-db.js";
import { renderLayout } from "./app.js";
import { auth } from "./auth.js";

let allUsers = [];
let editingUserId = null;

document.addEventListener("DOMContentLoaded", async () => {
    await auth.init();
    const isAllowed = await auth.checkAuth(['admin', 'supervisor']);
    if (!isAllowed) return;
    renderLayout("user");

    const modal = document.getElementById("user-modal");
    const modalTitle = modal?.querySelector(".modal-header h3");

    document.getElementById("add-user-btn")?.addEventListener("click", () => {
        editingUserId = null;
        if (modalTitle) modalTitle.innerText = "Add New User";
        document.getElementById("user-form")?.reset();
        modal?.classList.add("active");
    });

    document.getElementById("close-user-modal")?.addEventListener("click", closeModal);
    document.getElementById("cancel-user-modal")?.addEventListener("click", closeModal);

    function closeModal() {
        modal?.classList.remove("active");
        editingUserId = null;
        if (modalTitle) modalTitle.innerText = "Add New User";
        document.getElementById("user-form")?.reset();
    }

    document.getElementById("user-search-input")?.addEventListener("input", filterAndRenderUsers);
    document.getElementById("user-role-filter")?.addEventListener("change", filterAndRenderUsers);

    loadUsers();

    document.getElementById("user-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("user-name").value.trim();
        const email = document.getElementById("user-email").value.trim();
        const role = document.getElementById("user-role").value;
        const department = document.getElementById("user-department").value;
        const phone = document.getElementById("user-phone").value.trim();
        const status = document.getElementById("user-status").value;

        try {
            if (editingUserId) {
                await fbDb.updateUser(editingUserId, { name, email, role, department, phone, status });
                showToast("User Updated Successfully!", "success");
            } else {
                const payload = {
                    name, email, role,
                    department: department || (role === "admin" ? "Administration" : "Pharmacy"),
                    phone,
                    status: status || "active",
                    createdAt: new Date().toISOString()
                };
                await fbDb.addUser(payload);
                showToast("User Created Successfully!", "success");
            }

            document.getElementById("user-form")?.reset();
            modal?.classList.remove("active");
            editingUserId = null;
            if (modalTitle) modalTitle.innerText = "Add New User";
            loadUsers(true);

        } catch (error) {
            console.error("Full Error:", error);
            showToast(error.message, "error");
        }
    });

    document.getElementById("close-delete-modal")?.addEventListener("click", closeDeleteModal);
    document.getElementById("cancel-delete")?.addEventListener("click", closeDeleteModal);
    document.getElementById("confirm-delete")?.addEventListener("click", confirmDelete);
});

let userToDelete = null;

function filterAndRenderUsers() {
    const searchVal = document.getElementById("user-search-input").value.toLowerCase();
    const roleVal = document.getElementById("user-role-filter").value;

    const filtered = allUsers.filter(user => {
        const matchSearch = !searchVal ||
            (user.name && user.name.toLowerCase().includes(searchVal)) ||
            (user.email && user.email.toLowerCase().includes(searchVal));
        const matchRole = !roleVal || user.role === roleVal;
        return matchSearch && matchRole;
    });

    renderUserRows(filtered);
}

function renderUserRows(users) {
    const tbody = document.getElementById("user-tbody");
    const emptyState = document.getElementById("empty-state");
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = "";
        if (emptyState) emptyState.style.display = "block";
        return;
    }

    if (emptyState) emptyState.style.display = "none";

    const isAdmin = auth.isAdmin();

    tbody.innerHTML = users.map(user => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="user-avatar-sm">${(user.name || "U").charAt(0).toUpperCase()}</span>
          <span>${escapeHtml(user.name || "-")}</span>
        </div>
      </td>
      <td>${escapeHtml(user.email || "-")}</td>
      <td>
        <span class="role-badge role-${user.role || "student"}">${escapeHtml(user.role || "-")}</span>
      </td>
      <td>${escapeHtml(user.department || "-")}</td>
      <td>${escapeHtml(user.phone || "-")}</td>
      <td>
        <span class="status-dot status-${user.status || "active"}"></span>
        ${escapeHtml(user.status || "active")}
      </td>
      <td>
        <div class="action-btns">
          ${isAdmin ? `
            <button class="btn-edit edit-user-btn" data-id="${user.id}" title="Edit">
              <i class="bx bx-edit"></i>
            </button>
            <button class="btn-delete delete-user-btn" data-id="${user.id}" title="Delete">
              <i class="bx bx-trash"></i>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join("");

    if (isAdmin) {
        document.querySelectorAll(".edit-user-btn").forEach(btn => {
            btn.addEventListener("click", (e) => openEditModal(e.currentTarget.dataset.id));
        });
        document.querySelectorAll(".delete-user-btn").forEach(btn => {
            btn.addEventListener("click", (e) => openDeleteModal(e.currentTarget.dataset.id));
        });
    }
}

function openEditModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    editingUserId = userId;
    document.getElementById("user-name").value = user.name || "";
    document.getElementById("user-email").value = user.email || "";
    document.getElementById("user-role").value = user.role || "student";
    document.getElementById("user-department").value = user.department || "";
    document.getElementById("user-phone").value = user.phone || "";
    document.getElementById("user-status").value = user.status || "active";

    const modal = document.getElementById("user-modal");
    modal.querySelector(".modal-header h3").innerText = "Edit User";
    modal.classList.add("active");
}

function openDeleteModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    userToDelete = userId;
    const modal = document.getElementById("delete-modal");
    modal?.classList.add("active");
}

function closeDeleteModal() {
    const modal = document.getElementById("delete-modal");
    modal?.classList.remove("active");
    userToDelete = null;
}

async function confirmDelete() {
    if (!userToDelete) return;

    try {
        await fbDb.deleteUser(userToDelete);
        showToast("User deleted successfully!", "success");
        closeDeleteModal();
        loadUsers(true);
    } catch (error) {
        console.error("Full Error:", error);
        showToast(error.message, "error");
    }
}

async function loadUsers(forceRefresh = false) {
    const tbody = document.getElementById("user-tbody");
    const emptyState = document.getElementById("empty-state");
    if (!tbody) return;

    const cached = fbDb.CacheManager.get('users');
    if (!cached.exists || !cached.data || cached.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 40px;"><div style="display: flex; flex-direction: column; gap: 12px;"><div class="skeleton" style="width: 100%; height: 40px;"></div><div class="skeleton" style="width: 100%; height: 40px;"></div><div class="skeleton" style="width: 100%; height: 40px;"></div></div></td></tr>`;
        if (emptyState) emptyState.style.display = "none";
    }

    const processUsers = (rawUsers) => {
        const emailMap = new Map();
        (rawUsers || []).forEach(user => {
            const email = (user.email || '').toLowerCase();
            if (!email) return;
            if (!emailMap.has(email)) {
                emailMap.set(email, user);
            } else {
                const existing = emailMap.get(email);
                if (user.id === user.uid && existing.id !== existing.uid) {
                    emailMap.set(email, user);
                }
            }
        });
        const noEmail = (rawUsers || []).filter(u => !u.email);
        allUsers = [...emailMap.values(), ...noEmail];
        filterAndRenderUsers();
    };

    try {
        const users = await fbDb.getUsers({
            forceRefresh,
            onBackgroundUpdate: (fresh) => {
                processUsers(fresh);
            }
        });

        processUsers(users);
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;padding:20px;">Failed to load users.</td></tr>`;
    }
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) {
        alert(message);
        return;
    }

    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "bx-check-circle" : "bx-error-circle";
    toast.innerHTML = `<i class="bx ${icon}"></i> ${escapeHtml(message)}`;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}