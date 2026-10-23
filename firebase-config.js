/* ------------------------------------------------------------------
   NMD Development Desk — Firebase settings
   Paste the values from Firebase console → Project settings →
   General → "Your apps" → Web app → SDK setup and configuration → Config.
   These values are not secret (every Firebase web app shows them);
   the protection is the sign-in + firestore.rules.
------------------------------------------------------------------- */
window.NMD_FIREBASE_CONFIG = {
  apiKey:            "PASTE_API_KEY",
  authDomain:        "PASTE_PROJECT_ID.firebaseapp.com",
  projectId:         "PASTE_PROJECT_ID",
  storageBucket:     "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId:             "PASTE_APP_ID"
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
