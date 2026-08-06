/* MediTrack - User Management */

import { renderLayout } from "./app.js";
import { auth } from "./auth.js";
import * as fbDb from "./firebase-db.js";

let allUsers = [];
let editingUserId = null;

document.addEventListener("DOMContentLoaded", () => {

    console.log("User page loaded");

    renderLayout("user");

    console.log("Layout rendered");

    // Admin check
    if (!auth.isAdmin()) {
        document.getElementById("add-user-btn").style.display = "none";
    }

    // ==========================
    // Modal Events
    // ==========================

    const modal = document.getElementById("user-modal");
    const modalTitle = modal.querySelector(".modal-header h3");

    document.getElementById("add-user-btn").addEventListener("click", () => {
        editingUserId = null;
        modalTitle.innerText = "Add New User";
        document.getElementById("user-form").reset();
        modal.classList.add("active");
    });

    document.getElementById("close-modal").addEventListener("click", closeModal);

    document.getElementById("cancel-user").addEventListener("click", closeModal);

    function closeModal() {
        modal.classList.remove("active");
        editingUserId = null;
        modalTitle.innerText = "Add New User";
        document.getElementById("user-form").reset();
    }

    // ==========================
    // Search & Filter
    // ==========================

    document.getElementById("user-search").addEventListener("input", filterAndRenderUsers);
    document.getElementById("role-filter").addEventListener("change", filterAndRenderUsers);

    // Load Users
    loadUsers();

    // ==========================
    // Create / Update User
    // ==========================

    document.getElementById("user-form").addEventListener("submit", async (e) => {

        e.preventDefault();

        const name = document.getElementById("user-name").value.trim();
        const email = document.getElementById("user-email").value.trim();
        const role = document.getElementById("user-role").value;

        try {

            if (editingUserId) {
                // UPDATE existing user
                await fbDb.updateUser(editingUserId, {
                    name,
                    email,
                    role,
                    department: role === "admin" ? "Administration" : "Pharmacy",
                    updatedAt: new Date().toISOString()
                });
                alert("User Updated Successfully!");

            } else {
                // CREATE new user
                // Check duplicate email
                const emailExists = allUsers.some(u =>
                    u.email && u.email.toLowerCase() === email.toLowerCase()
                );
                if (emailExists) {
                    alert("A user with this email already exists!");
                    return;
                }

                await fbDb.addUser({
                    name,
                    email,
                    role,
                    department: role === "admin" ? "Administration" : "Pharmacy",
                    status: "Pending"
                });
                alert("User Created Successfully!");
            }

            document.getElementById("user-form").reset();
            modal.classList.remove("active");
            editingUserId = null;
            modalTitle.innerText = "Add New User";
            loadUsers();

        } catch (error) {

            console.error("Full Error:", error);
            alert(error.message);

        }

    });

});

// ==========================
// Filter & Render
// ==========================

function filterAndRenderUsers() {
    const searchVal = document.getElementById("user-search").value.toLowerCase();
    const roleVal = document.getElementById("role-filter").value;

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
    const tbody = document.getElementById("users-table-body");
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:20px;">
                    No Users Found
                </td>
            </tr>
        `;
        return;
    }

    const isAdmin = auth.isAdmin();

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${escapeHtml(user.name || "-")}</td>
            <td>${escapeHtml(user.email || "-")}</td>
            <td>${escapeHtml(user.role || "-")}</td>
            <td>${escapeHtml(user.department || "-")}</td>
            <td>
                ${isAdmin ? `
                    <button class="btn btn-secondary btn-sm edit-user-btn" data-id="${user.id}">
                        Edit
                    </button>
                    <button class="btn btn-danger btn-sm delete-user-btn" data-id="${user.id}">
                        Delete
                    </button>
                ` : `
                    <button class="btn btn-secondary btn-sm" disabled>Edit</button>
                    <button class="btn btn-danger btn-sm" disabled>Delete</button>
                `}
            </td>
        </tr>
    `).join("");

    // Bind Edit / Delete events
    if (isAdmin) {
        document.querySelectorAll(".edit-user-btn").forEach(btn => {
            btn.addEventListener("click", (e) => openEditModal(e.target.dataset.id));
        });
        document.querySelectorAll(".delete-user-btn").forEach(btn => {
            btn.addEventListener("click", (e) => handleDeleteUser(e.target.dataset.id));
        });
    }
}

// ==========================
// Edit User
// ==========================

function openEditModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    editingUserId = userId;
    document.getElementById("user-name").value = user.name || "";
    document.getElementById("user-email").value = user.email || "";
    document.getElementById("user-role").value = user.role || "student";

    const modal = document.getElementById("user-modal");
    modal.querySelector(".modal-header h3").innerText = "Edit User";
    modal.classList.add("active");
}

// ==========================
// Delete User
// ==========================

async function handleDeleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    const userName = user ? user.name : userId;

    if (!confirm(`Are you sure you want to delete "${userName}"?`)) return;

    try {
        await fbDb.deleteUser(userId);
        alert("User deleted successfully!");
        loadUsers();
    } catch (error) {
        console.error("Full Error:", error);
        alert(error.message);
    }
}

// ==========================
// Load Users
// ==========================

async function loadUsers() {

    const tbody = document.getElementById("users-table-body");

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center;padding:20px;">
                Loading Users...
            </td>
        </tr>
    `;

    try {

        const users = await fbDb.getUsers();
        allUsers = users;
        filterAndRenderUsers();

    } catch (error) {

        console.error(error);

        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;color:red;padding:20px;">
                    Failed to load users.
                </td>
            </tr>
        `;

    }

}

// ==========================
// XSS Protection Helper
// ==========================

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}