/* === FIREBASE CONFIGURATION ===

   SETUP INSTRUCTIONS:
   1. Go to https://console.firebase.google.com
   2. Create a new project (e.g. "odisea-tours")
   3. Enable Authentication > Email/Password
   4. Enable Cloud Firestore (start in test mode, then apply rules below)
   5. Enable Storage
   6. Go to Project Settings > General > Your apps > Add web app
   7. Copy the config values below
   8. Add your GitHub Pages domain as authorized domain in Authentication > Settings

   FIRESTORE SECURITY RULES: see firestore.rules file
   ─────────────────────────────────────────────────────
   Key points:
   - Admin (authenticated) has full read/write
   - Public can read tours and subcollections (portal/guide access)
   - Public can create/update passengers (with validation) but NOT delete
   - Public can create messages (with size limit) but NOT update/delete
   - Guide expenses/notes: public can read/create but NOT delete
   - Portal/guide use soft-delete (_removed flag) instead of hard delete
   - Deploy rules: firebase deploy --only firestore:rules

   STORAGE SECURITY RULES (paste in Storage > Rules):
   ──────────────────────────────────────────────────
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /tours/{tourId}/{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
*/

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC1DQLaouWXRtlmjljB-9Vu88HnqjIDpGQ",
  authDomain: "odisea-tours.firebaseapp.com",
  projectId: "odisea-tours",
  storageBucket: "odisea-tours.firebasestorage.app",
  messagingSenderId: "1097156707780",
  appId: "1:1097156707780:web:f6d337e0fba5bf5fc11091"
};
