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

   FIRESTORE SECURITY RULES (paste in Firestore > Rules):
   ─────────────────────────────────────────────────────
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Admin (authenticated) can read/write everything
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
       // Public can read tour data (access code validated in app logic)
       match /tours/{tourId} {
         allow read: if true;
       }
       // Public can read/create passengers and messages
       match /tours/{tourId}/passengers/{passengerId} {
         allow read, create: if true;
       }
       match /tours/{tourId}/messages/{messageId} {
         allow read, create: if true;
       }
       // Public can read documents (download links)
       match /tours/{tourId}/documents/{docId} {
         allow read: if true;
       }
     }
   }

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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
