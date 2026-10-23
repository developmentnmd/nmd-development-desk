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
   "google"    = sign in with a Google account whose e-mail ends with
                 one of allowedDomains or is in allowedEmails (recommended)
   "anonymous" = no Google sign-in; only the dashboard PINs protect it  */
window.NMD_AUTH = {
  mode: "google",
  allowedDomains: ["pmiglobal.co.in"],
  allowedEmails:  ["reportspmi411@gmail.com"]
};
