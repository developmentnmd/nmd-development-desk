/* NMD Development Desk — Firebase settings */

const firebaseConfig = {
  apiKey: "AIzaSyDIteLEQ4gyoQ-6qzd_5lqQfspiv9vjiyE",
  authDomain: "nmd-development-desk.firebaseapp.com",
  projectId: "nmd-development-desk",
  storageBucket: "nmd-development-desk.firebasestorage.app",
  messagingSenderId: "763312520748",
  appId: "1:763312520748:web:26145b71d7bb92d13e1b89"
};

window.NMD_FIREBASE_CONFIG = firebaseConfig;

window.NMD_AUTH = {
  mode: "email",
  google: true,
  allowedDomains: ["pmiglobal.co.in"],
  allowedEmails:  ["reportspmi411@gmail.com"]
};
