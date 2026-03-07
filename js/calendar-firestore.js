import { db } from "./firebase.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function loadBlockedDates(unitIds = []) {
  const blocked = new Set();

  // incluir docs viejos sin unitId (para que NO se "desbloquee" todo)
  const globalSnap = await getDocs(query(collection(db, "CALENDAR"), where("unitId", "==", null)));
  globalSnap.forEach((doc) => {
    const data = doc.data();
    if (data && typeof data.date === "string") blocked.add(data.date);
  });

  const ids = Array.isArray(unitIds)
    ? unitIds.map(s => String(s || "").toLowerCase()).filter(Boolean)
    : [];

if (ids.length === 0) {
  return blocked;
  }

  const snap = await getDocs(query(collection(db, "CALENDAR"), where("unitId", "in", ids)));
  snap.forEach((doc) => {
    const data = doc.data();
    if (data && typeof data.date === "string") blocked.add(data.date);
  });

  return blocked;
}
