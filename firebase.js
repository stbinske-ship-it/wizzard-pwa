// FIREBASE CONFIG HIER EINFÜGEN
const firebaseConfig = {
  apiKey: "AIzaSyC_Uhhm0w-UZam1LctPMnGcxZkXPSjx_8g",
  authDomain: "wizzard-pwa.firebaseapp.com",
  databaseURL: "https://wizzard-pwa-default-rtdb.firebaseio.com",
  projectId: "wizzard-pwa"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();