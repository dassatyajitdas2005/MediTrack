# 🏥 MediTrack

## Hospital Internship & Training Management System

> **Note on this document:** This README was generated from the project's specification/description as provided by the developer. It has **not** been cross-verified against the live source code, Firebase console, or Firestore rules (no codebase was available at generation time). Feature statuses below reflect the *intended* design. Before publishing, re-run a code-verification pass and correct any status labels that don't match the actual implementation.

---

## Table of Contents

1. [About MediTrack](#about-meditrack)
2. [Project Purpose](#project-purpose)
3. [Problem Statement](#problem-statement)
4. [Objectives](#objectives)
5. [Key Features](#key-features)
6. [User Roles](#user-roles)
7. [Authentication](#authentication)
8. [Google Sign-In](#google-sign-in)
9. [Authentication vs Authorization](#authentication-vs-authorization)
10. [Admin Features](#admin-features)
11. [Student Features](#student-features)
12. [Supervisor Features](#supervisor-features)
13. [Dashboard](#dashboard)
14. [Intern Management](#intern-management)
15. [Doctor Management](#doctor-management)
16. [OPD Schedule](#opd-schedule)
17. [Attendance Management](#attendance-management)
18. [Training Progress](#training-progress)
19. [Daily Training Schedule](#daily-training-schedule)
20. [Certificate Management](#certificate-management)
21. [Reports](#reports)
22. [User Management](#user-management)
23. [Settings](#settings)
24. [UI/UX](#uiux)
25. [Responsive Design](#responsive-design)
26. [Firebase Integration](#firebase-integration)
27. [Firebase Authentication](#firebase-authentication)
28. [Cloud Firestore](#cloud-firestore)
29. [Firestore Collections](#firestore-collections)
30. [Database Architecture](#database-architecture)
31. [CRUD Operations](#crud-operations)
32. [Security Architecture](#security-architecture)
33. [Role-Based Access Control](#role-based-access-control)
34. [Firestore Security Rules](#firestore-security-rules)
35. [Application Architecture](#application-architecture)
36. [Data Flow](#data-flow)
37. [Project Structure](#project-structure)
38. [JavaScript Module Responsibilities](#javascript-module-responsibilities)
39. [HTML Page Responsibilities](#html-page-responsibilities)
40. [Technology Stack](#technology-stack)
41. [Local Setup](#local-setup)
42. [Firebase Setup](#firebase-setup)
43. [Running Locally](#running-locally)
44. [Testing Strategy](#testing-strategy)
45. [Error Handling](#error-handling)
46. [Git & GitHub](#git--github)
47. [Git Workflow](#git-workflow)
48. [Pull Request Workflow](#pull-request-workflow)
49. [AI-Assisted Development](#ai-assisted-development)
50. [Current Project Status](#current-project-status)
51. [Known Limitations](#known-limitations)
52. [Future Roadmap](#future-roadmap)
53. [Long-Term Vision](#long-term-vision)
54. [About the Developer](#about-the-developer)
55. [Production Considerations](#production-considerations)
56. [Resources](#resources)
57. [Contribution Guidelines](#contribution-guidelines)
58. [Disclaimer](#disclaimer)
59. [License](#license)
60. [Acknowledgements](#acknowledgements)
61. [Closing Statement](#closing-statement)

---

<img width="1919" height="931" alt="image" src="https://github.com/user-attachments/assets/87b17c9a-acf0-45e8-9e1d-ae84910e27a6" />

---

## About MediTrack

MediTrack is a modern, web-based **Hospital Internship & Training Management System** designed to manage internship-related activities, including students/interns, attendance, training progress, doctors, OPD (Out-Patient Department) schedules, certificates, reports, users, and role-based access.

MediTrack is **not** a general-purpose hospital management system. Its scope is intentionally focused on the internship and training lifecycle within a hospital or clinical training setting.

## Project Purpose

MediTrack exists to digitize and centralize the day-to-day administrative work involved in running a hospital-based internship/training program — replacing manual attendance registers, paper certificates, and scattered spreadsheets with a single structured system.

## Problem Statement

Hospital internship programs (such as D.Pharm, B.Pharm, or clinical placements) typically rely on manual processes for:

- Tracking intern attendance
- Assigning and monitoring OPD/training schedules
- Recording training progress
- Issuing completion certificates
- Generating reports for administrative or academic review

These manual processes are time-consuming, error-prone, and difficult to audit. MediTrack addresses this by providing a centralized, role-based digital platform.

## Objectives

- Provide a single source of truth for intern records, attendance, and training progress
- Enforce role-based access so each user only sees and does what their role permits
- Reduce administrative overhead for supervisors and coordinators
- Provide exportable reports for academic or institutional review
- Maintain a clean, responsive interface usable on both desktop and mobile devices

## Key Features

| Feature Area | Description |
|---|---|
| Authentication | Secure sign-in (Email/Password and Google Sign-In) |
| Role-Based Dashboards | Separate views/permissions for Admin, Student, Supervisor |
| Intern Management | Add, update, and track intern records |
| Doctor Management | Maintain doctor/mentor records |
| OPD Scheduling | Assign interns to OPD rotations |
| Attendance | Daily attendance tracking per intern |
| Training Progress | Track completion of training modules/milestones |
| Daily Training Schedule | Structured daily schedule per intern/batch |
| Certificates | Generate and manage completion certificates |
| Reports | Administrative and academic reporting |
| User Management | Admin-level control over accounts and roles |
| Theming | Light and dark mode support |
| Responsive UI | Usable across desktop, tablet, and mobile |

## User Roles

MediTrack defines three primary roles: **Admin**, **Student**, and **Supervisor**.

> **Frontend visibility vs. Firestore authorization:** Hiding a button or menu item in the UI only controls what a user *sees* — it does not by itself prevent access to data. Actual access control must be enforced independently at the Firestore Security Rules layer. This distinction is described further in [Security Architecture](#security-architecture).

### Admin

| Capability | Access |
|---|---|
| View | Full system-wide visibility across all modules |
| Access | All modules: interns, doctors, attendance, training, schedules, certificates, reports, users, settings |
| Create | Interns, doctors, schedules, certificates, user accounts |
| Update | Any record across all modules |
| Delete | Any record across all modules |
| Cannot access | N/A — Admin is the highest-privilege role |

### Student (Intern)

| Capability | Access |
|---|---|
| View | Own profile, own attendance, own training progress, own schedule, own certificate status |
| Access | Personal dashboard, attendance view, training progress view, schedule view |
| Create | Limited to self-service actions (e.g., profile updates, where permitted) |
| Update | Own profile information (where permitted) |
| Delete | None |
| Cannot access | Other interns' records, doctor management, user management, reports, admin settings |

### Supervisor

| Capability | Access |
|---|---|
| View | Interns and OPD/training data under their supervision |
| Access | Attendance marking, training progress updates, schedule views for assigned interns |
| Create | Attendance entries, training progress entries |
| Update | Attendance and training records for assigned interns |
| Delete | Limited/none, depending on configuration |
| Cannot access | User management, system-wide settings, other supervisors' interns (unless explicitly granted) |

## Authentication

**Authentication answers the question: "Who are you?"**

MediTrack's authentication layer is handled through **Firebase Authentication**, supporting:

- Email/Password sign-in
- Google Sign-In (OAuth)
- Logout
- Persisted authentication state across sessions
- Role loading after successful sign-in
- Protected/guarded pages that redirect unauthenticated users

## Google Sign-In

Google Sign-In is implemented as an authentication provider via Firebase Authentication, allowing users to sign in using their existing Google account instead of a manually created password.

## Authentication vs Authorization

| Concept | Question It Answers | Where It's Enforced |
|---|---|---|
| Authentication | "Who are you?" | Firebase Authentication |
| Authorization | "What are you allowed to do?" | Firestore Security Rules (and mirrored in frontend logic for UX) |

Authentication confirms identity. Authorization determines what that identity is permitted to read, write, update, or delete. **The two are separate layers, and both must be enforced for the system to be secure.**

## Admin Features

- Full oversight of interns, doctors, attendance, training, and certificates
- User account management (create/update/deactivate accounts, assign roles)
- Access to system-wide reports
- Access to application settings

## Student Features

- View personal attendance history
- View personal training progress
- View assigned daily/OPD schedule
- View certificate status once training is complete

## Supervisor Features

- Mark attendance for assigned interns
- Update training progress for assigned interns
- View OPD schedules relevant to their supervision

## Dashboard

A central landing page presenting summarized, role-specific information (e.g., attendance overview, training progress, upcoming schedule items) using dashboard cards and/or tables.

## Intern Management

CRUD interface for managing intern/student records — including personal details, batch/cohort information, and status.

## Doctor Management

CRUD interface for managing doctor/mentor records associated with OPD assignments and supervision.

## OPD Schedule

Module for assigning and viewing which interns are scheduled to which OPD department/doctor on which dates.

## Attendance Management

Daily attendance tracking module allowing marking of intern presence/absence, tied to individual intern records.

## Training Progress

Tracks completion of training milestones or modules per intern over the course of the internship.

## Daily Training Schedule

A structured, day-by-day schedule view outlining planned training activities for interns.

## Certificate Management

Module for generating and managing completion certificates once an intern's training requirements are satisfied.

## Reports

Administrative reporting module for reviewing attendance, training completion, and other program-level data.

## User Management

Admin-only module for managing system user accounts, including role assignment.

## Settings

Application-level configuration options, which may include theme preference and account settings.

## UI/UX

- Sidebar and/or navbar navigation
- Dashboard summary cards
- Data tables for record listings
- Forms for data entry (intern, doctor, schedule, etc.)
- Light Mode / Dark Mode theming
- Toast notifications for user feedback (where implemented)

## Responsive Design

The interface is designed to adapt across desktop, tablet, and mobile screen sizes using responsive CSS layout techniques.

## Firebase Integration

MediTrack is built on **Firebase** as its backend-as-a-service platform, using:

- **Firebase Authentication** — identity/sign-in management
- **Cloud Firestore** — NoSQL document database
- A Firebase configuration module for initializing the app in the frontend
- Database helper modules (e.g., `firebase-db.js`) abstracting Firestore read/write logic
- **Firestore Security Rules** enforcing server-side authorization

> No credentials, API keys, service account files, or secrets are included in this README or in version control. Firebase configuration for local development should be set up per the [Firebase Setup](#firebase-setup) instructions using your own project credentials.

## Firebase Authentication

Handles user sign-up, sign-in (email/password and Google), session persistence, and sign-out. After a successful sign-in, the application loads the corresponding user role from Firestore to determine dashboard access and permissions.

## Cloud Firestore

MediTrack uses Cloud Firestore as its primary database — a document-oriented NoSQL store organized into collections, as described below.

## Firestore Collections

> The following collections are based on the module list in the project specification. Confirm each against the actual Firestore console / codebase before treating this as final documentation.

| Collection | Purpose | Primary Module | Roles Interacting |
|---|---|---|---|
| `users` | Stores user accounts and role assignments | Authentication / User Management | Admin (full), Student & Supervisor (own record) |
| `interns` | Stores intern/student profile and status data | Intern Management | Admin, Supervisor (assigned), Student (own record) |
| `doctors` | Stores doctor/mentor records for OPD assignment | Doctor Management | Admin |
| `attendance` | Stores daily attendance entries per intern | Attendance Management | Admin, Supervisor (create/update), Student (read own) |
| `training` | Stores training progress/milestone data | Training Progress | Admin, Supervisor (update), Student (read own) |
| `certificates` | Stores certificate issuance/status records | Certificate Management | Admin (create/update), Student (read own) |
| `otps` | Stores one-time-password verification data (if OTP-based verification is used) | Authentication (verify-otp flow) | System-managed |

## Database Architecture

MediTrack uses a flat, collection-based Firestore structure rather than deeply nested subcollections, favoring simplicity and predictable query patterns appropriate for a moderate-scale internship program.

## CRUD Operations

Standard Create, Read, Update, Delete operations are implemented per module through Firestore's client SDK, mediated by dedicated JavaScript modules rather than direct calls from HTML.

**Example data flow (e.g., Attendance):**

```
User (Supervisor)
   ↓
Attendance Form (attendance.html)
   ↓
attendance.js (module logic)
   ↓
firebase-db.js (Firestore helper)
   ↓
Cloud Firestore (attendance collection)
   ↓
UI Update (table refresh / toast confirmation)
```

## Security Architecture

Security in MediTrack operates on two layers:

1. **Frontend visibility** — controls what menu items, buttons, and pages a user *sees* based on their role. This is a UX convenience, not a security boundary.
2. **Firestore Security Rules** — the actual enforcement layer. All read/write requests are validated server-side against `firebase/firestore.rules`, regardless of what the frontend displays.

> **Important:** Hiding a button in the UI does not prevent a technically capable user from attempting a direct Firestore request. Security must be enforced in Firestore Security Rules, not assumed from frontend behavior.

## Role-Based Access Control

Access control is intended to be enforced through a combination of:

- The authenticated user's UID
- A role field associated with that user's document in the `users` collection
- Firestore Security Rules that check this role before permitting reads/writes to protected collections

## Firestore Security Rules

Rules should, at minimum, enforce:

- **Authentication requirement** — no reads/writes without a valid signed-in user
- **Admin permissions** — broad access across collections
- **Student permissions** — read access limited to their own records
- **Supervisor permissions** — read/write access limited to records within their assigned scope
- **Collection-level access** — explicit rules per collection rather than a blanket allow

*(Reference the actual contents of `firebase/firestore.rules` to document the precise rule logic before publishing this section.)*

## Application Architecture

```
Browser
   ↓
HTML Pages
   ↓
JavaScript Modules
   ↓
Authentication / Application Logic
   ↓
Firebase Database Layer (firebase-db.js)
   ↓
Cloud Firestore
```

## Data Flow

Data flows from user interaction (forms, buttons) through role-specific JavaScript modules, into Firebase helper modules, and finally to Cloud Firestore — with UI updates reflecting the result of each operation.

## Project Structure

> Adjust this tree to match the confirmed, actual file layout before publishing.

```
MediTrack/
├── assets/
│   ├── css/
│   └── js/
│       ├── app.js
│       ├── auth.js
│       ├── firebase-auth.js
│       ├── firebase-db.js
│       ├── dashboard.js
│       ├── intern.js
│       ├── doctor.js
│       ├── attendance.js
│       ├── training.js
│       ├── schedule.js
│       ├── certificate.js
│       ├── report.js
│       ├── user.js
│       └── settings.js
├── firebase/
│   └── firestore.rules
├── login.html
├── signup.html
├── verify-otp.html
├── dashboard.html
├── intern.html
├── doctor.html
├── attendance.html
├── training.html
├── schedule.html
├── certificate.html
├── report.html
├── user.html
├── settings.html
└── README.md
```

## JavaScript Module Responsibilities

| Module | Purpose | Related Page | Firebase Interaction |
|---|---|---|---|
| `app.js` | Application bootstrap / shared logic | Global | Indirect |
| `auth.js` | Auth state handling, route protection | login.html, signup.html | Firebase Auth |
| `firebase-auth.js` | Firebase Authentication wrapper functions | Global | Firebase Auth |
| `firebase-db.js` | Firestore helper/abstraction functions | Global | Cloud Firestore |
| `dashboard.js` | Dashboard data aggregation and rendering | dashboard.html | Firestore (read) |
| `intern.js` | Intern CRUD logic | intern.html | Firestore |
| `doctor.js` | Doctor CRUD logic | doctor.html | Firestore |
| `attendance.js` | Attendance marking and retrieval | attendance.html | Firestore |
| `training.js` | Training progress tracking | training.html | Firestore |
| `schedule.js` | Daily/OPD schedule logic | schedule.html | Firestore |
| `certificate.js` | Certificate generation/status | certificate.html | Firestore |
| `report.js` | Report generation | report.html | Firestore (read) |
| `user.js` | User account management | user.html | Firestore + Firebase Auth |
| `settings.js` | App settings (e.g., theme) | settings.html | Firestore / local state |

## HTML Page Responsibilities

| Page | Purpose |
|---|---|
| `login.html` | User sign-in (email/password, Google) |
| `signup.html` | New account registration |
| `verify-otp.html` | OTP verification step (if applicable) |
| `dashboard.html` | Role-specific landing dashboard |
| `intern.html` | Intern management |
| `doctor.html` | Doctor management |
| `attendance.html` | Attendance tracking |
| `training.html` | Training progress |
| `schedule.html` | OPD/daily schedule |
| `certificate.html` | Certificate management |
| `report.html` | Reports |
| `user.html` | User management (Admin only) |
| `settings.html` | Application settings |

## Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Styling and responsive layout |
| JavaScript (ES6+) | Application logic |
| Firebase Authentication | User authentication |
| Google Sign-In | OAuth authentication provider |
| Cloud Firestore | NoSQL database |
| Firestore Security Rules | Server-side authorization |
| Git | Version control |
| GitHub | Repository hosting |
| OpenRouter | AI-assisted development tooling |

## Local Setup

1. Clone the repository
   ```bash
   git clone https://github.com/<your-username>/MediTrack.git
   ```
2. Enter the project directory
   ```bash
   cd MediTrack
   ```
3. Open the project in your code editor
4. Proceed to [Firebase Setup](#firebase-setup)

## Firebase Setup

1. Create a project in the [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** → Email/Password and Google providers
3. Enable **Cloud Firestore** in production or test mode as appropriate
4. Add your Firebase config object to the project's configuration file (do not commit real credentials to a public repository)
5. Deploy `firebase/firestore.rules` to enforce security rules
6. Create initial `users` documents with appropriate role fields for testing

## Running Locally

Since this is a static HTML/CSS/JS project connecting to Firebase, it can be served with any static file server:

```bash
# Example using a simple static server
npx serve .
```

Then open the served URL in your browser and navigate to `login.html`.

## Testing Strategy

The checklist below is unchecked by default — verify each item manually before marking it complete.

**Authentication**
- [ ] Email/password sign-up works
- [ ] Email/password sign-in works
- [ ] Google Sign-In works
- [ ] Logout clears session correctly
- [ ] Unauthenticated users are redirected from protected pages

**Dashboard**
- [ ] Dashboard loads correct data per role
- [ ] Dashboard cards display accurate counts

**Intern Management**
- [ ] Create intern record
- [ ] Read/list intern records
- [ ] Update intern record
- [ ] Delete intern record

**Doctor Management**
- [ ] Create doctor record
- [ ] Read/list doctor records
- [ ] Update doctor record
- [ ] Delete doctor record

**Attendance**
- [ ] Mark attendance
- [ ] View attendance history
- [ ] Edit attendance entry

**Training Progress**
- [ ] Update training progress
- [ ] View training progress per intern

**Schedule**
- [ ] Create/view OPD schedule
- [ ] Assign intern to schedule slot

**Certificates**
- [ ] Generate certificate
- [ ] View certificate status

**Reports**
- [ ] Generate report
- [ ] Export report (if implemented)

**User Management**
- [ ] Create user account
- [ ] Assign/change role
- [ ] Deactivate account

**Security**
- [ ] Firestore rules block unauthorized reads
- [ ] Firestore rules block unauthorized writes
- [ ] Role-based UI matches role-based data access

**Responsive / Theme**
- [ ] Layout adapts correctly on mobile
- [ ] Light/Dark mode toggles correctly

## Error Handling

Application logic should handle Firebase Authentication errors (invalid credentials, network errors) and Firestore operation failures gracefully, surfacing clear feedback to the user (e.g., via toast notifications) rather than failing silently.

## Git & GitHub

MediTrack is version-controlled with Git and hosted on GitHub.

## Git Workflow

```bash
git status
git add .
git commit -m "Meaningful commit message"
git push origin main
```

Feature branches:

```bash
git checkout -b feature/example
```

## Pull Request Workflow

```
Feature Branch
   ↓
Development
   ↓
Testing
   ↓
Commit
   ↓
Push
   ↓
Pull Request
   ↓
Review
   ↓
Merge
```

**Pull Request Checklist**
- [ ] Code builds/runs without errors
- [ ] Feature manually tested
- [ ] No secrets or credentials included
- [ ] Relevant documentation updated

## AI-Assisted Development

Parts of MediTrack's development process make use of AI-assisted tooling (e.g., OpenRouter-connected models) to support:

- Code analysis
- Debugging
- Documentation generation
- Refactoring suggestions
- Architecture review
- Error investigation

AI assistance is a development aid, not an autonomous developer — all AI-suggested or AI-generated changes are reviewed and tested by the developer before being merged.

## Current Project Status

### Implemented
*(Confirm against actual code before publishing — see note at top of document.)*

### In Development


### Planned
See [Future Roadmap](#future-roadmap).

> Do not represent MediTrack as production-ready until this section is verified against the live codebase.

## Known Limitations

- Not verified for large-scale/multi-hospital deployment
- Security rules and role enforcement require independent verification
- No confirmed automated test suite at this time

## Future Roadmap

The following are potential future features and are **not** currently confirmed as implemented:

- QR-code-based attendance
- Advanced analytics dashboards
- PDF report generation
- Advanced Excel export
- In-app notifications
- Hospital notice board
- Digital certificate verification
- Automated certificate generation
- AI assistant integration
- Multi-hospital support
- Audit logs
- Backup & recovery tooling

## Long-Term Vision

```
Healthcare + Education + Technology + Data + AI
                    =
   Digital Healthcare Training Platform
```

This is a long-term direction for the project, not a description of its current state.

## About the Developer

**Satyajit Das**
Diploma in Pharmacy (D.Pharm) Student

Areas of interest:
- Pharmacy
- Healthcare
- Web Development
- Artificial Intelligence
- Firebase
- Databases
- Technology

MediTrack reflects an intersection of healthcare/pharmacy background and hands-on software development — built as a practical tool for the kind of internship/training environment the developer is familiar with from pharmacy training programs.

## Production Considerations

MediTrack has not been independently verified for production deployment with real patient or sensitive healthcare data. Before any production use, the project should undergo:

- Independent security review
- Firestore rules audit
- Data protection / privacy review
- Load and reliability testing

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- 
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [JavaScript — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [HTML — MDN](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [CSS — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [Git Documentation](https://git-scm.com/doc)
- [GitHub Docs](https://docs.github.com/)
- [OpenRouter](https://openrouter.ai/)

## Contribution Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make and test your changes
4. Commit with a clear, meaningful message
5. Push and open a Pull Request against `main`

## Disclaimer

MediTrack is an independently developed project created for learning and internship-management purposes. It requires appropriate security review, privacy safeguards, testing, and compliance review before any use involving real, sensitive healthcare or personal data. MediTrack does not claim any medical certification or regulatory compliance.

## License

No explicit open-source license has been specified for this repository at this time. Until a `LICENSE` file is added, all rights are reserved by the author by default.

## Acknowledgements

Built with Firebase, and developed with the assistance of AI-based development tools (OpenRouter-connected models) used for code review, debugging support, and documentation.

## Closing Statement

MediTrack is a work-in-progress project aimed at bringing structure and digital tooling to hospital internship and training management. Feedback, testing, and contributions are welcome as the project continues to develop.
