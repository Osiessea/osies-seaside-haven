import { db } from "./firebase.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Espera docs en CALENDAR con campos:
// - unitId: "a1" | "a2" | "b1" | "b2"
// - date: "YYYY-MM-DD"
export async function loadBlockedDates(unitIds = []) {
  const blocked = new Set();

  // Normaliza: ["a1","b1"] (en minúsculas, sin vacíos)
  const ids = Array.isArray(unitIds)
    ? unitIds.map(s => String(s || "").toLowerCase()).filter(Boolean)
    : [];

  // Si no hay unidades, fallback: comportamiento viejo (global)
  if (ids.length === 0) {
    const snap = await getDocs(collection(db, "CALENDAR"));
    snap.forEach((doc) => {
      const data = doc.data();
      if (data && typeof data.date === "string") blocked.add(data.date);
    });
    return blocked;
  }

  // Firestore "in" permite hasta 30 valores; aquí solo 4, ok.
  const q = query(collection(db, "CALENDAR"), where("unitId", "in", ids));
  const snap = await getDocs(q);

  snap.forEach((doc) => {
    const data = doc.data();
    if (data && typeof data.date === "string") blocked.add(data.date);
  });

  return blocked;
}
