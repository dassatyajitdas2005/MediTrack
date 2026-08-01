/* MediTrack - Hospital Training Completion Certificate Renderer */

import { db } from './db.js';
import { auth } from './auth.js';

export function openCertificateModal(internId) {
  const intern = db.getInternById(internId);
  if (!intern) return;

  const cert = db.getCertificate(internId) || {
    issued: intern.certificateIssued,
    issuedDate: new Date().toISOString().split('T')[0],
    approvedBy: "Dr. A. K. Sharma (Medical Superintendent)"
  };

  let modal = document.getElementById('certificate-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'certificate-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-container" style="max-width: 800px; padding: 0; background: #ffffff; color: #0f172a; border-radius: 20px;">
      <div style="padding: 16px 24px; background: var(--bg-sidebar); color: white; display: flex; justify-content: space-between; align-items: center; border-radius: 20px 20px 0 0;">
        <h3 style="font-size: 16px; font-weight: 800;"><i class="bx bx-award"></i> Hospital Internship Completion Certificate</h3>
        <button id="close-cert-modal-btn" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;"><i class="bx bx-x"></i></button>
      </div>

      <div id="printable-certificate-area" style="padding: 40px; text-align: center; border: 12px double #0ea5e9; margin: 20px; background: #ffffff; position: relative;">
        <!-- Watermark / Seal Background -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.04; font-size: 260px; pointer-events: none;">
          <i class="bx bx-plus-medical"></i>
        </div>

        <div style="font-size: 28px; font-weight: 800; color: #0ea5e9; text-transform: uppercase; letter-spacing: 2px;">
          CITY GENERAL HOSPITAL &amp; MEDICAL CENTER
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 3px;">
          DEPARTMENT OF MEDICAL EDUCATION &amp; TRAINING
        </div>

        <div style="margin: 32px 0 20px; font-size: 22px; font-family: Georgia, serif; font-style: italic; color: #334155;">
          This is to proudly certify that
        </div>

        <div style="font-size: 32px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #0ea5e9; display: inline-block; padding: 0 20px 6px;">
          ${intern.name}
        </div>

        <div style="font-size: 15px; color: #475569; margin-top: 20px; line-height: 1.8; max-width: 600px; margin-left: auto; margin-right: auto;">
          student of <strong>${intern.college}</strong>, has successfully completed the 
          <strong>${intern.course}</strong> internship training program in the 
          <strong>${intern.department}</strong> department for a duration of 
          <strong>${intern.totalTrainingDays} Days</strong> (from ${intern.joiningDate} to ${intern.endingDate}).
        </div>

        <div style="display: flex; justify-content: space-around; margin-top: 50px; text-align: center;">
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${cert.issuedDate}</div>
            <div style="border-top: 1px solid #cbd5e1; margin-top: 6px; padding-top: 4px; font-size: 12px; color: #64748b; font-weight: 700;">DATE OF ISSUANCE</div>
          </div>
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #0f172a;">MT-CERT-${intern.internId}</div>
            <div style="border-top: 1px solid #cbd5e1; margin-top: 6px; padding-top: 4px; font-size: 12px; color: #64748b; font-weight: 700;">SERIAL NUMBER</div>
          </div>
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #0ea5e9;">${cert.approvedBy}</div>
            <div style="border-top: 1px solid #cbd5e1; margin-top: 6px; padding-top: 4px; font-size: 12px; color: #64748b; font-weight: 700;">AUTHORIZED SIGNATORY</div>
          </div>
        </div>
      </div>

      <div style="padding: 16px 24px; background: var(--bg-main); display: flex; justify-content: flex-end; gap: 12px; border-radius: 0 0 20px 20px;">
        <button id="print-cert-btn" class="btn btn-primary"><i class="bx bx-printer"></i> Print / Save PDF Certificate</button>
      </div>
    </div>
  `;

  modal.classList.add('active');

  document.getElementById('close-cert-modal-btn').addEventListener('click', () => modal.classList.remove('active'));
  document.getElementById('print-cert-btn').addEventListener('click', () => {
    window.print();
  });
}
