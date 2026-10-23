/* ------------------------------------------------------------------
   NMD Development Desk — Firebase settings
   Paste the values from Firebase console → Project settings →
   General → "Your apps" → Web app → SDK setup and configuration → Config.
   These values are not secret (every Firebase web app shows them);
   the protection is the sign-in + firestore.rules.
------------------------------------------------------------------- */
window.NMD_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDIteLEQ4gyoQ-6qzd_5lqQfspiv9vjiyE",
  authDomain:        "nmd-development-desk.firebaseapp.com",
  projectId:         "nmd-development-desk",
  storageBucket:     "nmd-development-desk.firebasestorage.app",
  messagingSenderId: "763312520748",
  appId:             "1:763312520748:web:26145b71d7bb92d13e1b89"
};

/* Who may open the dashboard:
   Sign-in is by a link e-mailed to the company address (works with Outlook),
   or with a Google account. Only these e-mails / domains get in.
   google: false hides the "sign in with Google" button.               */
window.NMD_AUTH = {
  mode: "email",
  google: true,
  allowedDomains: ["pmiglobal.co.in"],
  allowedEmails:  ["reportspmi411@gmail.com"]
};
