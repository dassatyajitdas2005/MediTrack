/* MediTrack - Intern Management Controller (Single Source of Truth) */

import * as fbDb from "./firebase-db.js";
import { auth } from "./auth.js";
import { renderLayout } from "./app.js";

let currentInterns = [];
let editingFirestoreId = null;
let editingAllIds = [];
let enrollingUid = null;
let deletingId = null;
let deletingAllIds = [];

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await auth.init();
    const isAllowed = await auth.checkAuth(["admin", "supervisor"]);
    if (!isAllowed) return;

    renderLayout("intern");
    initInternModule();
  } catch (error) {
    console.error("Intern page initialization error:", error);
  }
});

function initInternModule() {
  const user = auth.getCurrentUser();
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  const isAdmin = user.role === "admin";

  const addBtn = document.getElementById("add-intern-btn");
  if (addBtn) {
    if (!isAdmin) {
      addBtn.style.display = "none";
    } else {
      addBtn.addEventListener("click", () => openInternModal());
    }
  }

  document.getElementById("intern-search-input")?.addEventListener("input", filterInterns);
  document.getElementById("intern-dept-filter")?.addEventListener("change", filterInterns);
  document.getElementById("intern-course-filter")?.addEventListener("change", filterInterns);

  const form = document.getElementById("intern-form");
  if (form && isAdmin) {
    form.addEventListener("submit", handleInternFormSubmit);
  }

  // Modal close handlers
  document.getElementById("close-intern-modal")?.addEventListener("click", closeInternModal);
  document.getElementById("cancel-intern-modal")?.addEventListener("click", closeInternModal);
  document.getElementById("intern-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "intern-modal") closeInternModal();
  });

  // Delete modal handlers
  document.getElementById("close-delete-modal")?.addEventListener("click", closeDeleteModal);
  document.getElementById("cancel-delete")?.addEventListener("click", closeDeleteModal);
  document.getElementById("delete-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "delete-modal") closeDeleteModal();
  });
  document.getElementById("confirm-delete")?.addEventListener("click", handleConfirmDelete);

  // Delegated Table Action Button Events (Edit, Enroll, Delete)
  const tbody = document.getElementById("intern-tbody");
  if (tbody && isAdmin) {
    tbody.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".edit-intern-btn");
      if (editBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = editBtn.dataset.id || editBtn.getAttribute("data-id");
        openInternModal(id);
        return;
      }

      const enrollBtn = e.target.closest(".enroll-intern-btn");
      if (enrollBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = enrollBtn.dataset.id || enrollBtn.getAttribute("data-id");
        openInternModal(id);
        return;
      }

      const deleteBtn = e.target.closest(".delete-intern-btn");
      if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = deleteBtn.dataset.id || deleteBtn.getAttribute("data-id");
        openDeleteModal(id);
        return;
      }
    });
  }

  loadInterns(true);
}

async function loadInterns(forceRefresh = false) {
  try {
    currentInterns = await fbDb.getMergedInternsAndStudents({
      forceRefresh,
      onBackgroundUpdate: (fresh) => {
        currentInterns = fresh || [];
        filterInterns();
      }
    });

    filterInterns();
  } catch (error) {
    console.error("Failed to load interns:", error);
    showToast("Failed to load intern records.", "error");
    const tbody = document.getElementById("intern-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--accent-rose);">Failed to load records: ${escapeHtml(error.message)}</td></tr>`;
    }
  }
}

function filterInterns() {
  const searchVal = document.getElementById("intern-search-input")?.value.toLowerCase().trim() || "";
  const deptVal = document.getElementById("intern-dept-filter")?.value.toLowerCase().trim() || "";
  const courseVal = document.getElementById("intern-course-filter")?.value.toLowerCase().trim() || "";

  const filtered = currentInterns.filter(intern => {
    const displayId = fbDb.formatDisplayInternId(intern).toLowerCase();
    const rawId = String(intern.internId || intern.id || intern.uid || "").toLowerCase();
    const name = (intern.name || "").toLowerCase();
    const college = (intern.college || "").toLowerCase();
    const email = (intern.email || "").toLowerCase();
    const dept = (intern.department || "").toLowerCase();
    const course = (intern.course || "").toLowerCase();

    const matchesSearch = !searchVal || 
      name.includes(searchVal) || 
      displayId.includes(searchVal) || 
      rawId.includes(searchVal) || 
      college.includes(searchVal) || 
      email.includes(searchVal);

    const matchesDept = !deptVal || dept.includes(deptVal) || deptVal.includes(dept);

    const matchesCourse = !courseVal || 
      course.includes(courseVal) || 
      courseVal.includes(course) ||
      (courseVal === 'diploma pharmacy' && (course.includes('d.pharm') || course.includes('diploma'))) ||
      (courseVal === 'd.pharm' && course.includes('diploma pharmacy'));

    return matchesSearch && matchesDept && matchesCourse;
  });

  renderInternTable(filtered);
}

function renderInternTable(interns) {
  const tbody = document.getElementById("intern-tbody");
  const emptyState = document.getElementById("empty-state");
  if (!tbody) return;

  const user = auth.getCurrentUser();
  const isAdmin = user?.role === "admin";

  let displayList = interns;
  if (user && user.role === "student") {
    const userUid = user.uid || user.id;
    const userEmail = (user.email || '').toLowerCase().trim();
    displayList = interns.filter(i => 
      (userUid && (i.uid === userUid || i.userId === userUid || (i.allIds && i.allIds.includes(userUid)))) ||
      (userEmail && i.email && i.email.toLowerCase().trim() === userEmail)
    );
  }

  if (!displayList.length) {
    tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  tbody.innerHTML = displayList.map(intern => {
    // ── Pending virtual student account (not yet enrolled) ──
    if (intern._isVirtual) {
      return `
        <tr>
          <td class="col-id"><span style="color:var(--text-muted); font-style:italic; font-size:12px;">—</span></td>
          <td class="col-student">
            <div style="font-weight:700;">${escapeHtml(intern.name || 'Student Account')}</div>
            <div style="font-size:11px; color:var(--text-muted); word-break:break-all;">${escapeHtml(intern.email || '')}</div>
          </td>
          <td class="col-course" style="color:var(--text-muted);">—</td>
          <td class="col-dept">${escapeHtml(intern.department || '—')}</td>
          <td class="col-dates" style="color:var(--text-muted); font-size:11px;">—</td>
          <td class="col-progress">
            <span style="color:var(--accent-amber); font-size:11px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
              <i class="bx bx-time-five"></i> Not Enrolled
            </span>
          </td>
          <td class="col-att" style="color:var(--text-muted);">—</td>
          <td class="col-cert">
            <span class="cert-badge cert-pending"><i class="bx bx-time"></i> Pending</span>
          </td>
          <td class="col-actions">
            <div class="action-btns">
              ${isAdmin ? `
                <button type="button" class="btn-edit enroll-intern-btn" data-id="${escapeHtml(intern.id)}" title="Enroll Student">
                  <i class="bx bx-user-plus"></i>
                </button>
              ` : `
                <span style="color:var(--text-muted); font-size:11px;">Pending</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }

    // ── Real Enrolled Intern ──
    const displayId = fbDb.formatDisplayInternId(intern);
    const displayCourse = fbDb.formatCourse(intern.course);
    const progress = fbDb.getInternProgress(intern);
    const totalDays = progress.totalDays;
    const certIssued = intern.certificateIssued === true;

    const certBadge = certIssued ? `
      <span class="cert-badge cert-issued"><i class="bx bx-check-circle"></i> Issued</span>
    ` : `
      <span class="cert-badge cert-pending"><i class="bx bx-time"></i> Pending</span>
    `;

    return `
      <tr>
        <td class="col-id"><strong>${escapeHtml(displayId)}</strong></td>
        <td class="col-student">
          <div style="font-weight:700;">${escapeHtml(intern.name || 'Unnamed')}</div>
          <div style="font-size:11px; color:var(--text-muted); word-break:break-all;">${escapeHtml(intern.college || intern.email || '')}</div>
        </td>
        <td class="col-course">${escapeHtml(displayCourse)}</td>
        <td class="col-dept">${escapeHtml(intern.department || '—')}</td>
        <td class="col-dates" style="font-size:11px; line-height:1.3;">
          <div>${escapeHtml(intern.joiningDate || '—')}</div>
          <div style="color:var(--text-muted);">${escapeHtml(intern.endingDate || '—')}</div>
        </td>
        <td class="col-progress">
          <div class="progress-container" style="width:100%; max-width:95px;">
            <div class="progress-header" style="font-size:11px; margin-bottom:2px;">
              <span>${progress.completedDays}/${totalDays}d</span>
              <span>${progress.progressPercent}%</span>
            </div>
            <div class="progress-bar-bg" style="height:6px;">
              <div class="progress-bar-fill" style="width:${progress.progressPercent}%;"></div>
            </div>
          </div>
        </td>
        <td class="col-att">
          <strong>${intern.attendancePercentage || 0}%</strong>
        </td>
        <td class="col-cert">${certBadge}</td>
        <td class="col-actions">
          <div class="action-btns">
            ${isAdmin ? `
              <button type="button" class="btn-edit edit-intern-btn" data-id="${escapeHtml(intern.id)}" title="Edit">
                <i class="bx bx-edit-alt"></i>
              </button>
              <button type="button" class="btn-delete delete-intern-btn" data-id="${escapeHtml(intern.id)}" title="Delete">
                <i class="bx bx-trash"></i>
              </button>
            ` : `
              <span style="color:var(--text-muted); font-size:11px;"><i class="bx bx-lock-alt"></i> Read Only</span>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function openInternModal(internId = null) {
  const modal = document.getElementById("intern-modal");
  const form = document.getElementById("intern-form");
  const title = document.getElementById("modal-title");
  const saveBtnText = document.getElementById("save-btn-text");

  if (!modal || !form) return;

  form.reset();
  editingFirestoreId = null;
  editingAllIds = [];
  enrollingUid = null;

  if (internId) {
    const intern = currentInterns.find(item => 
      String(item.id) === String(internId) || 
      String(item.internId) === String(internId) || 
      String(item.uid) === String(internId) ||
      String(item.userId) === String(internId) ||
      (item.allIds && item.allIds.includes(internId))
    );

    if (!intern) {
      console.warn("Intern not found for ID:", internId);
      return;
    }

    if (intern._isVirtual) {
      // ── Enrolling a virtual student account ──
      editingFirestoreId = null;
      editingAllIds = [];
      enrollingUid = intern.uid || intern.userId || intern.id;

      if (title) title.innerHTML = `<i class="bx bx-user-plus"></i> Enroll Student`;
      if (saveBtnText) saveBtnText.textContent = "Enroll Intern";

      document.getElementById("intern-name").value = intern.name || "";
      document.getElementById("intern-email").value = intern.email || "";
      document.getElementById("intern-course").value = intern.course || "Diploma Pharmacy";
      document.getElementById("intern-college").value = intern.college || "";
      document.getElementById("intern-department").value = intern.department || "Pharmacy";
      document.getElementById("intern-total-days").value = 90;

      const todayStr = new Date().toISOString().split('T')[0];
      document.getElementById("intern-joining").value = todayStr;
      
      const endingDate = new Date();
      endingDate.setDate(endingDate.getDate() + 90);
      document.getElementById("intern-ending").value = endingDate.toISOString().split('T')[0];
      document.getElementById("intern-cert-issued").checked = false;

      modal.classList.add("active");
      return;
    }

    // ── Editing an existing enrolled intern ──
    editingFirestoreId = intern.id;
    editingAllIds = intern.allIds || [intern.id];
    enrollingUid = intern.uid || intern.userId || null;

    if (title) title.innerHTML = `<i class="bx bx-edit"></i> Edit Intern`;
    if (saveBtnText) saveBtnText.textContent = "Save Changes";

    document.getElementById("intern-name").value = intern.name || "";
    document.getElementById("intern-email").value = intern.email || "";
    document.getElementById("intern-course").value = intern.course || "Diploma Pharmacy";
    document.getElementById("intern-college").value = intern.college || "";
    document.getElementById("intern-department").value = intern.department || "Pharmacy";
    document.getElementById("intern-total-days").value = intern.totalTrainingDays || intern.totalDays || 90;
    document.getElementById("intern-joining").value = intern.joiningDate || "";
    document.getElementById("intern-ending").value = intern.endingDate || "";
    document.getElementById("intern-cert-issued").checked = intern.certificateIssued === true;

  } else {
    // ── Add New Intern from scratch ──
    if (title) title.innerHTML = `<i class="bx bx-user-plus"></i> Add New Intern`;
    if (saveBtnText) saveBtnText.textContent = "Add Intern";

    document.getElementById("intern-total-days").value = 90;
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById("intern-joining").value = todayStr;

    const endingDate = new Date();
    endingDate.setDate(endingDate.getDate() + 90);
    document.getElementById("intern-ending").value = endingDate.toISOString().split('T')[0];
  }

  modal.classList.add("active");
}

function closeInternModal() {
  const modal = document.getElementById("intern-modal");
  if (modal) modal.classList.remove("active");
  editingFirestoreId = null;
  editingAllIds = [];
  enrollingUid = null;
}

async function handleInternFormSubmit(event) {
  event.preventDefault();

  const user = auth.getCurrentUser();
  if (!user || user.role !== "admin") {
    showToast("Only admin can modify intern records.", "error");
    return;
  }

  const saveBtn = document.getElementById("save-intern-btn");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="bx bx-loader bx-spin"></i> Saving...`;
  }

  try {
    const name = document.getElementById("intern-name").value.trim();
    const email = document.getElementById("intern-email").value.trim().toLowerCase();
    const course = document.getElementById("intern-course").value;
    const college = document.getElementById("intern-college").value.trim();
    const department = document.getElementById("intern-department").value;
    const totalDays = parseInt(document.getElementById("intern-total-days").value) || 90;
    const joiningDate = document.getElementById("intern-joining").value;
    const endingDate = document.getElementById("intern-ending").value;
    const certIssued = document.getElementById("intern-cert-issued").checked;

    if (!name || !email || !course || !college || !department || !joiningDate || !endingDate) {
      showToast("Please fill in all required fields.", "error");
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="bx bx-save"></i> <span id="save-btn-text">Save Intern</span>`;
      }
      return;
    }

    const existingIntern = currentInterns.find(i => 
      (editingFirestoreId && String(i.id) === String(editingFirestoreId)) ||
      (enrollingUid && (i.uid === enrollingUid || i.userId === enrollingUid)) ||
      (i.email && i.email.toLowerCase().trim() === email)
    );

    const internId = (editingFirestoreId && existingIntern?.internId && existingIntern.internId !== 'PENDING')
      ? existingIntern.internId
      : ("INT-" + (Math.floor(10000 + Math.random() * 90000)).toString());

    const formData = {
      internId,
      name,
      email,
      course,
      college,
      department,
      joiningDate,
      endingDate,
      totalTrainingDays: totalDays,
      completedDays: existingIntern?.completedDays || 0,
      attendancePercentage: existingIntern?.attendancePercentage || 0,
      certificateIssued: certIssued,
      status: certIssued ? "completed" : "active"
    };

    // Preserve Firebase Auth UID and userId link
    const targetUid = enrollingUid || existingIntern?.uid || existingIntern?.userId;
    if (targetUid) {
      formData.uid = targetUid;
      formData.userId = targetUid;
    }

    if (editingFirestoreId) {
      await fbDb.updateIntern(editingFirestoreId, formData, editingAllIds);
      showToast("Intern updated successfully.", "success");
    } else {
      await fbDb.addIntern(formData);
      showToast("Intern enrolled successfully.", "success");
    }

    closeInternModal();
    await loadInterns(true);

  } catch (error) {
    console.error("Intern save error:", error);
    showToast(error.message || "Failed to save intern.", "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="bx bx-save"></i> <span id="save-btn-text">Save Intern</span>`;
    }
  }
}

function openDeleteModal(id) {
  const intern = currentInterns.find(item => 
    String(item.id) === String(id) || 
    String(item.internId) === String(id) || 
    (item.allIds && item.allIds.includes(id))
  );

  if (!intern || intern._isVirtual) {
    showToast("Cannot delete a virtual student record.", "error");
    return;
  }

  deletingId = intern.id; // Target the primary Firestore document ID in 'interns' collection
  deletingAllIds = intern.allIds || [intern.id];
  const modal = document.getElementById("delete-modal");
  if (modal) modal.classList.add("active");
}

function closeDeleteModal() {
  deletingId = null;
  deletingAllIds = [];
  const modal = document.getElementById("delete-modal");
  if (modal) modal.classList.remove("active");
}

async function handleConfirmDelete() {
  if (!deletingId) return;

  const btn = document.getElementById("confirm-delete");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="bx bx-loader bx-spin"></i> Deleting...`;
  }

  try {
    await fbDb.deleteIntern(deletingId, deletingAllIds);
    showToast("Intern deleted successfully.", "success");
    closeDeleteModal();
    await loadInterns(true);
  } catch (error) {
    console.error("Delete error:", error);
    showToast(error.message || "Failed to delete intern.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="bx bx-trash"></i> Delete`;
    }
  }
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast " + (type === "success" ? "toast-success" : type === "error" ? "toast-error" : "");
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