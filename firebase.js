// FIREBASE CONFIG HIER EINFÜGEN
const firebaseConfig = {
  apiKey: "DEIN_API_KEY",
  authDomain: "DEIN_AUTH_DOMAIN",
  databaseURL: "DEINE_DATABASE_URL",
  projectId: "DEIN_PROJECT_ID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();