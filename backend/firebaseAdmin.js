const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Ensure that these environment variables are set in your backend .env file
// Example:
// FIREBASE_PROJECT_ID=your-project-id
// FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com
// FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace literal string "\n" with actual newline character for the private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
      }),
    });
    console.log('Firebase Admin Initialized Successfully');
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
  }
}

module.exports = {
  auth: () => getAuth()
};
