import { db } from "./firebase.js";
import { doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

function datesBetween(startYMD, endYMD) {
  const [sy, sm, sd] = startYMD.split("-").map(Number);
  const [ey, em, ed] = endYMD.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));

  const out = [];
  for (let i = 0; i < nights; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

// Bloquea fechas SOLO si están libres (atómico)
export async function holdDatesIfFree(checkin, checkout, bookingId) {
  const nights = datesBetween(checkin, checkout);

  await runTransaction(db, async (tx) => {
    // 1) Verificar todas
    for (const ymd of nights) {
      const ref = doc(db, "CALENDAR", ymd);
      const snap = await tx.get(ref);
      if (snap.exists()) {
        throw new Error(`Fecha ocupada: ${ymd}`);
      }
    }

    // 2) Escribir todas
    for (const ymd of nights) {
      const ref = doc(db, "CALENDAR", ymd);
      tx.set(ref, {
        date: ymd,
        bookingId,
        type: "hold",
        createdAt: serverTimestamp()
      });
    }
  });

  return nights;
}
