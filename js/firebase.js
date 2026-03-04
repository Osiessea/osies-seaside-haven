// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBZuQO4UHJLiz_SjVbC-E4FLkmgfkIGrJ4",
  authDomain: "mi-casita-demo.firebaseapp.com",
  projectId: "mi-casita-demo",
  storageBucket: "mi-casita-demo.firebasestorage.app",
  messagingSenderId: "464398345719",
  appId: "1:464398345719:web:91f49e92383cae6dfa3af2"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
