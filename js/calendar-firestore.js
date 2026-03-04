import { db } from "./firebase.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function loadBlockedDates(unitIds = []) {
  const blocked = new Set();

  // 1) Siempre incluye los docs viejos (sin unitId) para que NO se “desbloquee”
  const globalSnap = await getDocs(query(collection(db, "CALENDAR"), where("unitId", "==", null)));
  globalSnap.forEach((doc) => {
    const data = doc.data();
    if (data && typeof data.date === "string") blocked.add(data.date);
  });

  // 2) Si no hay unidades seleccionadas, comportamiento viejo: todo
  const ids = Array.isArray(unitIds)
    ? unitIds.map(s => String(s || "").toLowerCase()).filter(Boolean)
    : [];

  if (ids.length === 0) {
    const snap = await getDocs(collection(db, "CALENDAR"));
    snap.forEach((doc) => {
      const data = doc.data();
      if (data && typeof data.date === "string") blocked.add(data.date);
    });
    return blocked;
  }

  // 3) Trae bloqueos por unidad
  const q = query(collection(db, "CALENDAR"), where("unitId", "in", ids));
  const snap = await getDocs(q);

  snap.forEach((doc) => {
    const data = doc.data();
    if (data && typeof data.date === "string") blocked.add(data.date);
  });

  return blocked;
}
