/* MediTrack - Intern Management Controller
   Admin = CRUD
   Student = READ ONLY
*/

import * as fbDb from "./firebase-db.js";
import { auth } from "./auth.js";
import { renderLayout } from "./app.js";

let currentInterns = [];
let editingFirestoreId = null;


document.addEventListener("DOMContentLoaded", async () => {
  try {

    // 1. Initialize authentication
    await auth.init();

    // 2. Allow only admin and student
    if (!auth.checkAuth(["admin", "student"])) {
      return;
    }

    // 3. Render navbar/profile/sidebar
    renderLayout("intern");

    // 4. Initialize intern module
    initInternModule();

    // 5. Logout button
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        try {
          await auth.logout();
        } catch (error) {
          console.error("Logout failed:", error);
        }
      });
    }

  } catch (error) {
    console.error("Intern page initialization error:", error);
  }
});


/* =========================
   INITIALIZE MODULE
========================= */

function initInternModule() {

  const user = auth.getCurrentUser();

  if (!user) {
    window.location.replace("login.html");
    return;
  }

  const isAdmin = user.role === "admin";

  console.log("Current user:", user);
  console.log("Current role:", user.role);
  console.log("Admin:", isAdmin);


  /* -------------------------
     ADD BUTTON
  ------------------------- */

  const addBtn = document.getElementById("add-intern-btn");

  if (addBtn) {

    if (!isAdmin) {
      // Student should NOT see Add button
      addBtn.style.display = "none";
    } else {
      addBtn.addEventListener("click", () => {
        openInternModal();
      });
    }
  }


  /* -------------------------
     SEARCH & FILTERS
  ------------------------- */

  document
    .getElementById("intern-search-input")
    ?.addEventListener("input", filterInterns);

  document
    .getElementById("intern-dept-filter")
    ?.addEventListener("change", filterInterns);

  document
    .getElementById("intern-course-filter")
    ?.addEventListener("change", filterInterns);


  /* -------------------------
     FORM
  ------------------------- */

  const form = document.getElementById("intern-form");

  if (form && isAdmin) {
    form.addEventListener("submit", handleInternFormSubmit);
  }


  /* -------------------------
     MODAL BUTTONS
  ------------------------- */

  document
    .getElementById("close-intern-modal")
    ?.addEventListener("click", closeInternModal);

  document
    .getElementById("cancel-intern-modal")
    ?.addEventListener("click", closeInternModal);


  /* -------------------------
     LOAD DATA
  ------------------------- */

  loadInterns();
}


/* =========================
   LOAD INTERNS
========================= */

async function loadInterns() {

  try {

    currentInterns = await fbDb.getInterns();

    console.log("Interns loaded:", currentInterns);

    renderInternTable(currentInterns);

  } catch (error) {

    console.error("Failed to load interns:", error);

    Toast(
      "Failed to load intern records.",
      "error"
    );
  } show
}


/* =========================
   PROGRESS CALCULATION
========================= */

function getInternProgress(intern) {

  const today = new Date();

  today.setHours(0, 0, 0, 0);


  const joining = new Date(intern.joiningDate);

  joining.setHours(0, 0, 0, 0);


  const ending = new Date(intern.endingDate);

  ending.setHours(0, 0, 0, 0);


  let completedDays = 0;


  if (today >= joining) {

    completedDays = Math.ceil(
      Math.min(
        today - joining,
        ending - joining
      ) /
      (1000 * 60 * 60 * 24)
    );
  }


  const totalDays =
    Number(
      intern.totalTrainingDays ||
      intern.totalDays ||
      30
    );


  completedDays = Math.max(
    0,
    Math.min(
      completedDays,
      totalDays
    )
  );


  const percent =
    totalDays > 0
      ? Math.round(
        (completedDays / totalDays) * 100
      )
      : 0;


  let status = "active";


  if (
    percent >= 100 ||
    today > ending
  ) {
    status = "completed";
  }


  return {
    completedDays,
    progressPercent: percent,
    status
  };
}


/* =========================
   RENDER TABLE
========================= */

function renderInternTable(interns) {

  const tbody =
    document.getElementById("intern-tbody");

  if (!tbody) return;


  const user =
    auth.getCurrentUser();

  const isAdmin =
    user?.role === "admin";

  let displayList = interns;
  if (user && user.role === "student") {
    displayList = interns.filter(i => i.email && i.email.toLowerCase() === user.email.toLowerCase());
  }

  if (!displayList.length) {

    tbody.innerHTML = `
            <tr>
                <td colspan="9"
                    style="
                        text-align:center;
                        padding:40px;
                        color:var(--text-muted);
                    ">
                    No intern records found.
                </td>
            </tr>
        `;

    return;
  }


  tbody.innerHTML = displayList.map(intern => {

    const progress =
      getInternProgress(intern);


    const totalDays =
      intern.totalTrainingDays ||
      intern.totalDays ||
      30;


    const certBadge =
      intern.certificateIssued
        ? `
                    <span class="cert-badge cert-issued">
                        <i class="bx bx-check-circle"></i>
                        Issued
                    </span>
                  `
        : `
                    <span class="cert-badge cert-pending">
                        <i class="bx bx-time"></i>
                        Pending
                    </span>
                  `;


    return `
            <tr>

                <td>
                    <strong>
                        ${escapeHtml(
      intern.internId || "N/A"
    )}
                    </strong>
                </td>


                <td>
                    <div style="font-weight:700;">
                        ${escapeHtml(
      intern.name || "N/A"
    )}
                    </div>

                    <div style="
                        font-size:12px;
                        color:var(--text-muted);
                    ">
                        ${escapeHtml(
      intern.college || ""
    )}
                    </div>
                </td>


                <td>
                    ${escapeHtml(
      intern.course || "N/A"
    )}
                </td>


                <td>
                    ${escapeHtml(
      intern.department || "N/A"
    )}
                </td>


                <td style="font-size:12px;">

                    ${escapeHtml(
      intern.joiningDate || "-"
    )}

                    <br>

                    ${escapeHtml(
      intern.endingDate || "-"
    )}

                </td>


                <td>

                    <div
                        class="progress-container"
                        style="width:120px;"
                    >

                        <div class="progress-header">

                            <span>
                                ${progress.completedDays}/${totalDays}d
                            </span>

                            <span>
                                ${progress.progressPercent}%
                            </span>

                        </div>


                        <div class="progress-bar-bg">

                            <div
                                class="progress-bar-fill"
                                style="
                                    width:${progress.progressPercent}%;
                                "
                            ></div>

                        </div>

                    </div>

                </td>


                <td>
                    <strong>
                        ${intern.attendancePercentage || 0}%
                    </strong>
                </td>


                <td>
                    ${certBadge}
                </td>


                <td>

                    <div class="action-btns">

                        ${isAdmin
        ? `
                                    <button
                                        class="btn-edit edit-intern-btn"
                                        data-id="${escapeHtml(intern.id)}"
                                        title="Edit"
                                    >
                                        <i class="bx bx-edit-alt"></i>
                                    </button>

                                    <button
                                        class="btn-delete delete-intern-btn"
                                        data-id="${escapeHtml(intern.id)}"
                                        title="Delete"
                                    >
                                        <i class="bx bx-trash"></i>
                                    </button>
                                  `
        : `
                                    <span
                                        style="
                                            color:var(--text-muted);
                                            font-size:13px;
                                        "
                                    >
                                        <i class="bx bx-lock-alt"></i>
                                        Read Only
                                    </span>
                                  `
      }

                    </div>

                </td>

            </tr>
        `;

  }).join("");


  /* =========================
     ADMIN BUTTON EVENTS
  ========================= */

  if (isAdmin) {

    document
      .querySelectorAll(".edit-intern-btn")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.id;

            openInternModal(id);
          }
        );
      });


    document
      .querySelectorAll(".delete-intern-btn")
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            const id =
              button.dataset.id;

            await deleteIntern(id);
          }
        );
      });
  }
}


/* =========================
   FILTER
========================= */

function filterInterns() {

  const search =
    document
      .getElementById("intern-search-input")
      ?.value
      .toLowerCase() || "";


  const department =
    document
      .getElementById("intern-dept-filter")
      ?.value || "";


  const course =
    document
      .getElementById("intern-course-filter")
      ?.value || "";


  const filtered =
    currentInterns.filter(intern => {

      const name =
        (intern.name || "")
          .toLowerCase();

      const internId =
        (intern.internId || "")
          .toLowerCase();

      const college =
        (intern.college || "")
          .toLowerCase();


      const matchesSearch =
        name.includes(search) ||
        internId.includes(search) ||
        college.includes(search);


      const matchesDepartment =
        !department ||
        intern.department === department;


      const matchesCourse =
        !course ||
        (intern.course || "")
          .includes(course);


      return (
        matchesSearch &&
        matchesDepartment &&
        matchesCourse
      );

    });


  renderInternTable(filtered);
}


/* =========================
   OPEN MODAL
========================= */

function openInternModal(internId = null) {

  const modal =
    document.getElementById("intern-modal");

  const form =
    document.getElementById("intern-form");

  if (!modal || !form) return;


  form.reset();

  editingFirestoreId = null;


  const title =
    document.getElementById("modal-title");


  if (internId) {

    const intern =
      currentInterns.find(
        item => item.id === internId
      );


    if (!intern) return;


    editingFirestoreId =
      intern.id;


    if (title) {
      title.innerHTML =
        `<i class="bx bx-edit"></i> Edit Intern`;
    }


    document.getElementById("intern-name").value =
      intern.name || "";


    document.getElementById("intern-email").value =
      intern.email || "";


    document.getElementById("intern-course").value =
      intern.course || "Diploma Pharmacy";


    document.getElementById("intern-college").value =
      intern.college || "";


    document.getElementById("intern-department").value =
      intern.department || "Outdoor";


    document.getElementById("intern-total-days").value =
      intern.totalTrainingDays ||
      intern.totalDays ||
      90;


    document.getElementById("intern-joining").value =
      intern.joiningDate || "";


    document.getElementById("intern-ending").value =
      intern.endingDate || "";


    document.getElementById("intern-cert-issued").checked =
      intern.certificateIssued === true;

  } else {

    if (title) {
      title.innerHTML =
        `<i class="bx bx-user-plus"></i> Add New Intern`;
    }

    document.getElementById(
      "intern-total-days"
    ).value = 90;
  }


  modal.classList.add("active");
}


/* =========================
   CLOSE MODAL
========================= */

function closeInternModal() {

  const modal =
    document.getElementById("intern-modal");

  if (modal) {
    modal.classList.remove("active");
  }

  editingFirestoreId = null;
}


/* =========================
   SAVE / UPDATE INTERN
========================= */

async function handleInternFormSubmit(event) {

  event.preventDefault();


  const user =
    auth.getCurrentUser();


  if (!user || user.role !== "admin") {

    showToast(
      "Only admin can modify intern records.",
      "error"
    );

    return;
  }


  const form =
    document.getElementById("intern-form");


  const internId =
    editingFirestoreId ||
    "INT-" +
    Date.now()
      .toString()
      .slice(-5);


  const existingIntern =
    currentInterns.find(
      intern => intern.id === editingFirestoreId
    );


  const formData = {

    internId,

    name:
      document
        .getElementById("intern-name")
        .value
        .trim(),

    email:
      document
        .getElementById("intern-email")
        .value
        .trim()
        .toLowerCase(),

    course:
      document
        .getElementById("intern-course")
        .value,

    college:
      document
        .getElementById("intern-college")
        .value
        .trim(),

    department:
      document
        .getElementById("intern-department")
        .value,

    joiningDate:
      document
        .getElementById("intern-joining")
        .value,

    endingDate:
      document
        .getElementById("intern-ending")
        .value,

    totalTrainingDays:
      parseInt(
        document
          .getElementById("intern-total-days")
          .value
      ) || 30,

    completedDays:
      existingIntern?.completedDays || 0,

    attendancePercentage:
      existingIntern?.attendancePercentage || 0,

    certificateIssued:
      document
        .getElementById("intern-cert-issued")
        .checked,

    status:
      document
        .getElementById("intern-cert-issued")
        .checked
        ? "completed"
        : "active"
  };


  try {

    if (editingFirestoreId) {

      await fbDb.updateIntern(
        editingFirestoreId,
        formData
      );

      showToast(
        "Intern updated successfully.",
        "success"
      );

    } else {

      await fbDb.addIntern(
        formData
      );

      showToast(
        "Intern added successfully.",
        "success"
      );
    }


    closeInternModal();

    await loadInterns();


  } catch (error) {

    console.error(
      "Intern save error:",
      error
    );

    showToast(
      error.message ||
      "Failed to save intern.",
      "error"
    );
  }
}


/* =========================
   DELETE INTERN
========================= */

async function deleteIntern(id) {

  const user =
    auth.getCurrentUser();


  if (!user || user.role !== "admin") {

    showToast(
      "Only admin can delete interns.",
      "error"
    );

    return;
  }


  const intern =
    currentInterns.find(
      item => item.id === id
    );


  if (!intern) {
    showToast(
      "Intern record not found.",
      "error"
    );

    return;
  }


  const confirmed =
    confirm(
      `Delete intern "${intern.name}"?`
    );


  if (!confirmed) return;


  try {

    await fbDb.deleteIntern(
      intern.id
    );


    showToast(
      "Intern deleted successfully.",
      "success"
    );


    await loadInterns();


  } catch (error) {

    console.error(
      "Delete intern error:",
      error
    );


    showToast(
      error.message ||
      "Failed to delete intern.",
      "error"
    );
  }
}


/* =========================
   TOAST
========================= */

function showToast(message, type = "success") {

  const toast =
    document.getElementById("toast");


  if (!toast) {
    alert(message);
    return;
  }


  toast.className =
    `toast toast-${type}`;


  const icon =
    type === "success"
      ? "bx-check-circle"
      : "bx-error-circle";


  toast.innerHTML =
    `<i class="bx ${icon}"></i> ${escapeHtml(message)}`;


  toast.classList.add("show");


  setTimeout(() => {

    toast.classList.remove("show");

  }, 3000);
}


/* =========================
   HTML ESCAPE
========================= */

function escapeHtml(text) {

  if (!text) return "";

  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}