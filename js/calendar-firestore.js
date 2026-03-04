import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function loadBlockedDates() {
  const blocked = new Set();
  const snap = await getDocs(collection(db, "CALENDAR"));

  snap.forEach((doc) => {
    const data = doc.data();
    if (data && typeof data.date === "string") blocked.add(data.date);
  });

  return blocked;
}
