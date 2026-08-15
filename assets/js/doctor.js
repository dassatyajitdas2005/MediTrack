/* MediTrack - Doctor OPD Schedule Controller
   Admin = CRUD
   Student = READ ONLY
*/

import * as fbDb from "./firebase-db.js";
import { auth } from "./auth.js";
import { renderLayout } from "./app.js";


let currentDoctors = [];
let selectedDay = "Monday";
let editingFirestoreId = null;
let deletingDoctorId = null;


/* ==========================================
   PAGE INITIALIZATION
========================================== */

document.addEventListener("DOMContentLoaded", async () => {

  try {

    // Initialize authentication
    await auth.init();


    // Only Admin can access
    const isAllowed = await auth.checkAuth(["admin", "supervisor"]);
    if (!isAllowed) {
      return;
    }


    // Render common layout
    renderLayout("doctor");


    // Initialize Doctor module
    initDoctorModule();


  } catch (error) {

    console.error(
      "Doctor page initialization error:",
      error
    );

  }

});


/* ==========================================
   INITIALIZE MODULE
========================================== */

function initDoctorModule() {

  const user = auth.getCurrentUser();

  if (!user) {
    window.location.replace("login.html");
    return;
  }


  const isAdmin = user.role === "admin";


  console.log("Doctor page user:", user);
  console.log("Doctor page role:", user.role);


  /* ======================================
     ADD DOCTOR BUTTON
  ====================================== */

  const addBtn =
    document.getElementById("add-doctor-btn");


  if (addBtn) {

    if (!isAdmin) {

      // Student cannot add doctor
      addBtn.style.display = "none";

    } else {

      addBtn.addEventListener(
        "click",
        () => openDoctorModal()
      );

    }

  }


  /* ======================================
     DAY TABS
  ====================================== */

  document
    .querySelectorAll(".opd-tab-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          document
            .querySelectorAll(".opd-tab-btn")
            .forEach(btn =>
              btn.classList.remove("active")
            );


          event.currentTarget
            .classList.add("active");


          selectedDay =
            event.currentTarget
              .getAttribute("data-day");


          renderOPDSchedule();

        }
      );

    });


  /* ======================================
     DOCTOR FORM
  ====================================== */

  const doctorForm =
    document.getElementById("doctor-form");


  if (doctorForm && isAdmin) {

    doctorForm.addEventListener(
      "submit",
      handleDoctorFormSubmit
    );

  }


  /* ======================================
     MODAL CLOSE
  ====================================== */

  document
    .getElementById("close-doctor-modal")
    ?.addEventListener(
      "click",
      closeDoctorModal
    );


  document
    .getElementById("cancel-doctor-modal")
    ?.addEventListener(
      "click",
      closeDoctorModal
    );


  /* ======================================
     DELETE MODAL
  ====================================== */

  document
    .getElementById("close-delete-modal")
    ?.addEventListener(
      "click",
      closeDeleteModal
    );


  document
    .getElementById("cancel-delete-modal")
    ?.addEventListener(
      "click",
      closeDeleteModal
    );


  document
    .getElementById("confirm-delete-doctor")
    ?.addEventListener(
      "click",
      confirmDeleteDoctor
    );


  /* ======================================
     LOAD DOCTORS
  ====================================== */

  loadDoctors();

}


/* ==========================================
   LOAD DOCTORS
========================================== */

async function loadDoctors() {

  const container =
    document.getElementById(
      "doctor-grid-container"
    );


  if (container) {

    container.innerHTML = `
            <div
                class="glass-card"
                style="
                    grid-column:1/-1;
                    text-align:center;
                    padding:40px;
                "
            >
                <i
                    class="bx bx-loader-alt bx-spin"
                    style="
                        font-size:42px;
                        color:var(--primary-500);
                    "
                ></i>

                <p
                    style="
                        margin-top:12px;
                        color:var(--text-muted);
                    "
                >
                    Loading doctor schedule...
                </p>

            </div>
        `;

  }


  try {

    currentDoctors =
      await fbDb.getDoctors();


    console.log(
      "Doctors loaded:",
      currentDoctors
    );


    renderOPDSchedule();


  } catch (error) {

    console.error(
      "Error loading doctors:",
      error
    );


    if (container) {

      container.innerHTML = `
                <div
                    class="glass-card"
                    style="
                        grid-column:1/-1;
                        text-align:center;
                        padding:40px;
                    "
                >

                    <i
                        class="bx bx-error-circle"
                        style="
                            font-size:48px;
                            color:var(--danger);
                        "
                    ></i>

                    <h4 style="margin-top:10px;">
                        Failed to load doctor schedule
                    </h4>

                    <p
                        style="
                            color:var(--text-muted);
                            margin-top:6px;
                        "
                    >
                        Please refresh the page and try again.
                    </p>

                </div>
            `;

    }

  }

}


/* ==========================================
   RENDER OPD SCHEDULE
========================================== */

function renderOPDSchedule() {

  const container =
    document.getElementById(
      "doctor-grid-container"
    );


  if (!container) return;


  const user =
    auth.getCurrentUser();


  const isAdmin =
    user?.role === "admin";


  const availableDocs =
    currentDoctors.filter(doctor => {

      const days =
        Array.isArray(
          doctor.availableDays
        )
          ? doctor.availableDays
          : [];


      return days.includes(selectedDay);

    });


  /* ======================================
     NO DOCTOR
  ====================================== */

  if (availableDocs.length === 0) {

    container.innerHTML = `

            <div
                class="glass-card"
                style="
                    grid-column:1/-1;
                    text-align:center;
                    padding:40px;
                "
            >

                <i
                    class="bx bx-calendar-x"
                    style="
                        font-size:48px;
                        color:var(--text-muted);
                    "
                ></i>

                <h4
                    style="
                        margin-top:10px;
                        color:var(--text-muted);
                    "
                >
                    No doctors scheduled for
                    ${escapeHtml(selectedDay)}.
                </h4>

            </div>

        `;

    return;
  }


  /* ======================================
     GROUP BY DEPARTMENT
  ====================================== */

  const departments = {};


  availableDocs.forEach(doctor => {

    const department =
      doctor.department ||
      "General";


    if (!departments[department]) {

      departments[department] = [];

    }


    departments[department].push(
      doctor
    );

  });


  let html = "";


  /* ======================================
     CREATE DOCTOR CARDS
  ====================================== */

  for (
    const [department, doctors]
    of Object.entries(departments)
  ) {


    html += `

            <div
                style="
                    grid-column:1/-1;
                    margin-top:10px;
                "
            >

                <h3
                    style="
                        font-size:16px;
                        font-weight:800;
                        color:var(--primary-500);
                    "
                >

                    <i class="bx bx-clinic"></i>

                    ${escapeHtml(department)}

                </h3>

            </div>

        `;


    doctors.forEach(doctor => {

      const doctorId =
        doctor.id ||
        doctor.doctorId;


      const availableDays =
        Array.isArray(
          doctor.availableDays
        )
          ? doctor.availableDays
          : [];


      html += `

                <div
                    class="glass-card doctor-card animate-fade-in"
                >

                    <!-- Doctor Header -->

                    <div class="doctor-header">

                        <div class="doctor-avatar">

                            <i class="bx bx-user-voice"></i>

                        </div>


                        <div class="doctor-details">

                            <h4>
                                ${escapeHtml(
        doctor.name ||
        "Doctor"
      )}
                            </h4>

                            <p>
                                ${escapeHtml(
        doctor.specialization ||
        "Specialist"
      )}
                            </p>

                        </div>

                    </div>


                    <!-- Doctor Information -->

                    <div
                        style="
                            font-size:13px;
                            color:var(--text-muted);
                            display:flex;
                            flex-direction:column;
                            gap:6px;
                            margin-top:12px;
                        "
                    >

                        <div>

                            <strong>
                                <i class="bx bx-building-house"></i>
                                Room:
                            </strong>

                            ${escapeHtml(
        doctor.room ||
        "Not assigned"
      )}

                        </div>


                        <div>

                            <strong>
                                <i class="bx bx-time-five"></i>
                                Timing:
                            </strong>

                            ${escapeHtml(
        doctor.opdTiming ||
        "Not specified"
      )}

                        </div>


                        <div>

                            <strong>
                                <i class="bx bx-calendar"></i>
                                Days:
                            </strong>

                            ${availableDays
          .map(day =>
            escapeHtml(day)
          )
          .join(", ")
        }

                        </div>

                    </div>


                    <!-- ADMIN ACTIONS -->

                    ${isAdmin
          ? `

                                <div
                                    style="
                                        display:flex;
                                        gap:8px;
                                        margin-top:18px;
                                        padding-top:14px;
                                        border-top:1px solid var(--border-color);
                                    "
                                >

                                    <button
                                        type="button"
                                        class="btn btn-secondary btn-sm edit-doc-btn"
                                        data-id="${escapeHtml(
            doctorId
          )}"
                                    >

                                        <i class="bx bx-edit"></i>

                                        Edit

                                    </button>


                                    <button
                                        type="button"
                                        class="btn btn-danger btn-sm delete-doc-btn"
                                        data-id="${escapeHtml(
            doctorId
          )}"
                                    >

                                        <i class="bx bx-trash"></i>

                                        Delete

                                    </button>

                                </div>

                              `
          : `
                                <div
                                    style="
                                        margin-top:16px;
                                        padding-top:12px;
                                        border-top:1px solid var(--border-color);
                                        color:var(--text-muted);
                                        font-size:12px;
                                    "
                                >

                                    <i class="bx bx-lock-alt"></i>

                                    View Only

                                </div>
                              `
        }

                </div>

            `;

    });

  }


  container.innerHTML = html;


  /* ======================================
     ADMIN EDIT BUTTONS
  ====================================== */

  if (isAdmin) {

    document
      .querySelectorAll(".edit-doc-btn")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            openDoctorModal(
              button.dataset.id
            );

          }
        );

      });


    /* ==================================
       ADMIN DELETE BUTTONS
    ================================== */

    document
      .querySelectorAll(".delete-doc-btn")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            openDeleteModal(
              button.dataset.id
            );

          }
        );

      });

  }

}


/* ==========================================
   OPEN ADD / EDIT MODAL
========================================== */

function openDoctorModal(doctorId = null) {

  const modal =
    document.getElementById(
      "doctor-modal"
    );


  const form =
    document.getElementById(
      "doctor-form"
    );


  if (!modal || !form) return;


  form.reset();


  editingFirestoreId = null;


  const title =
    document.getElementById(
      "doctor-modal-title"
    );


  /* ======================================
     EDIT
  ====================================== */

  if (doctorId) {

    const doctor =
      currentDoctors.find(
        item =>
          item.id === doctorId ||
          item.doctorId === doctorId
      );


    if (!doctor) {

      showToast(
        "Doctor record not found.",
        "error"
      );

      return;
    }


    editingFirestoreId =
      doctor.id;


    if (title) {

      title.textContent =
        "Edit Doctor";

    }


    document
      .getElementById(
        "doctor-id-input"
      )
      .value =
      doctor.doctorId ||
      doctor.id;


    document
      .getElementById("doc-name")
      .value =
      doctor.name || "";


    document
      .getElementById("doc-department")
      .value =
      doctor.department || "Medicine";


    document
      .getElementById(
        "doc-specialization"
      )
      .value =
      doctor.specialization || "";


    document
      .getElementById("doc-room")
      .value =
      doctor.room || "";


    document
      .getElementById(
        "doc-opd-timing"
      )
      .value =
      doctor.opdTiming || "";


    const availableDays =
      Array.isArray(
        doctor.availableDays
      )
        ? doctor.availableDays
        : [];


    document
      .querySelectorAll(
        ".day-checkbox"
      )
      .forEach(checkbox => {

        checkbox.checked =
          availableDays.includes(
            checkbox.value
          );

      });

  }


  /* ======================================
     ADD
  ====================================== */

  else {

    if (title) {

      title.textContent =
        "Add New Doctor";

    }


    document
      .getElementById(
        "doctor-id-input"
      )
      .value =
      "DOC-" +
      Date.now()
        .toString()
        .slice(-5);

  }


  modal.classList.add("active");

}


/* ==========================================
   CLOSE DOCTOR MODAL
========================================== */

function closeDoctorModal() {

  const modal =
    document.getElementById(
      "doctor-modal"
    );


  if (modal) {

    modal.classList.remove("active");

  }


  editingFirestoreId = null;

}


/* ==========================================
   SAVE DOCTOR
========================================== */

async function handleDoctorFormSubmit(event) {

  event.preventDefault();


  const user =
    auth.getCurrentUser();


  /* ======================================
     ADMIN CHECK
  ====================================== */

  if (!user || user.role !== "admin") {

    showToast(
      "Only admin can modify doctor records.",
      "error"
    );

    return;
  }


  const doctorId =
    document
      .getElementById(
        "doctor-id-input"
      )
      .value;


  const selectedDays =
    Array.from(
      document.querySelectorAll(
        ".day-checkbox:checked"
      )
    )
      .map(
        checkbox =>
          checkbox.value
      );


  if (selectedDays.length === 0) {

    showToast(
      "Please select at least one day.",
      "error"
    );

    return;
  }


  const formData = {

    doctorId,

    name:
      document
        .getElementById("doc-name")
        .value
        .trim(),

    department:
      document
        .getElementById("doc-department")
        .value,

    specialization:
      document
        .getElementById(
          "doc-specialization"
        )
        .value
        .trim(),

    room:
      document
        .getElementById("doc-room")
        .value
        .trim(),

    opdTiming:
      document
        .getElementById(
          "doc-opd-timing"
        )
        .value
        .trim(),

    availableDays:
      selectedDays

  };


  try {

    /* ==================================
       UPDATE
    ================================== */

    if (editingFirestoreId) {

      await fbDb.updateDoctor(
        editingFirestoreId,
        formData
      );


      showToast(
        "Doctor updated successfully.",
        "success"
      );

    }


    /* ==================================
       ADD
    ================================== */

    else {

      await fbDb.addDoctor(
        formData
      );


      showToast(
        "Doctor added successfully.",
        "success"
      );

    }


    closeDoctorModal();


    await loadDoctors();


  } catch (error) {

    console.error(
      "Doctor save error:",
      error
    );


    showToast(
      error.message ||
      "Failed to save doctor.",
      "error"
    );

  }

}


/* ==========================================
   OPEN DELETE MODAL
========================================== */

function openDeleteModal(doctorId) {

  const doctor =
    currentDoctors.find(
      item =>
        item.id === doctorId ||
        item.doctorId === doctorId
    );


  if (!doctor) {

    showToast(
      "Doctor record not found.",
      "error"
    );

    return;
  }


  deletingDoctorId =
    doctor.id;


  const nameElement =
    document.getElementById(
      "delete-doctor-name"
    );


  if (nameElement) {

    nameElement.textContent =
      doctor.name ||
      "this doctor";

  }


  const modal =
    document.getElementById(
      "delete-doctor-modal"
    );


  if (modal) {

    modal.classList.add("active");

  }

}


/* ==========================================
   CLOSE DELETE MODAL
========================================== */

function closeDeleteModal() {

  const modal =
    document.getElementById(
      "delete-doctor-modal"
    );


  if (modal) {

    modal.classList.remove("active");

  }


  deletingDoctorId = null;

}


/* ==========================================
   CONFIRM DELETE
========================================== */

async function confirmDeleteDoctor() {

  const user =
    auth.getCurrentUser();


  if (!user || user.role !== "admin") {

    showToast(
      "Only admin can delete doctors.",
      "error"
    );

    return;
  }


  if (!deletingDoctorId) {

    showToast(
      "Doctor record not found.",
      "error"
    );

    return;
  }


  try {

    await fbDb.deleteDoctor(
      deletingDoctorId
    );


    closeDeleteModal();


    showToast(
      "Doctor deleted successfully.",
      "success"
    );


    await loadDoctors();


  } catch (error) {

    console.error(
      "Delete doctor error:",
      error
    );


    showToast(
      error.message ||
      "Failed to delete doctor.",
      "error"
    );

  }

}


/* ==========================================
   TOAST
========================================== */

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


/* ==========================================
   ESCAPE HTML
========================================== */

function escapeHtml(text) {

  if (
    text === null ||
    text === undefined
  ) {

    return "";

  }


  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    String(text);


  return div.innerHTML;

}