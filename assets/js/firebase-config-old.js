/* MediTrack - Firebase SDK Configuration & Initialization */

// Config holder for Firebase (Replace with your actual Firebase project config when deploying)
export const firebaseConfig = {
  apiKey: localStorage.getItem('meditrack_fb_apiKey') || "AIzaSyDemoKey_MediTrackHospital2026",
  authDomain: localStorage.getItem('meditrack_fb_authDomain') || "meditrack-hospital.firebaseapp.com",
  projectId: localStorage.getItem('meditrack_fb_projectId') || "meditrack-hospital",
  storageBucket: localStorage.getItem('meditrack_fb_storageBucket') || "meditrack-hospital.appspot.com",
  messagingSenderId: localStorage.getItem('meditrack_fb_messagingSenderId') || "847291048291",
  appId: localStorage.getItem('meditrack_fb_appId') || "1:847291048291:web:a1b2c3d4e5f67890"
};

// State flag to check if actual live Firebase credentials are present
export const isFirebaseConfigured = () => {
  const key = localStorage.getItem('meditrack_fb_apiKey');
  return key && key.length > 20 && !key.includes('DemoKey');
};

console.log(`[MediTrack Engine] Firebase Configured: ${isFirebaseConfigured() ? 'YES (Live Firestore Mode)' : 'NO (Interactive Standalone Demo DB Mode)'}`);