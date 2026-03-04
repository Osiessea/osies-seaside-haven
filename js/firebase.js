// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAgkI6wmH6sitqXMhmQ5bxcJYKRCGqhkms",
  authDomain: "osies-seaside-haven.firebaseapp.com",
  projectId: "osies-seaside-haven",
  storageBucket: "osies-seaside-haven.firebasestorage.app",
  messagingSenderId: "516451768058",
  appId: "1:516451768058:web:8fc363ca39427cbe6c5b43"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
