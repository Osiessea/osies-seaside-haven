import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

async function testConnection() {
  try {
    const querySnapshot = await getDocs(collection(db, "calendar"));
    querySnapshot.forEach((doc) => {
      console.log("Fecha bloqueada:", doc.data().date);
    });
    console.log("🔥 Conexión exitosa con Firestore");
  } catch (error) {
    console.error("❌ Error conectando a Firestore:", error);
  }
}

testConnection();
