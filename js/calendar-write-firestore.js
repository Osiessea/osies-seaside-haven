import { db } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function blockDates(startYMD, endYMD) {
  const [sy, sm, sd] = startYMD.split("-").map(Number);
  const [ey, em, ed] = endYMD.split("-").map(Number);

  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));

  for (let i = 0; i < nights; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const ymd = `${y}-${m}-${day}`;

    // ✅ docId = fecha (no duplica)
    await setDoc(doc(db, "CALENDAR", ymd), { date: ymd }, { merge: true });
  }
}
