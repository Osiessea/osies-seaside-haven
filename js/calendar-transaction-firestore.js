import { db } from "./firebase.js";
import { doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

function pad2(n){ return String(n).padStart(2, "0"); }
function ymd(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function addDays(date, days){
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function holdDatesIfFree(checkinYMD, checkoutYMD, bookingId, unitIds) {
  const units = Array.isArray(unitIds) ? unitIds.map(u => String(u).toLowerCase()) : [];
  if (units.length === 0) throw new Error("No units selected.");

  const start = new Date(checkinYMD + "T00:00:00");
  const end = new Date(checkoutYMD + "T00:00:00");
  const nights = Math.round((end - start) / (1000*60*60*24));
  if (nights <= 0) throw new Error("Invalid date range.");

  await runTransaction(db, async (tx) => {

    for (const unitId of units) {
      for (let i = 0; i < nights; i++){
        const dateStr = ymd(addDays(start, i));
        const ref = doc(db, "CALENDAR", `${unitId}_${dateStr}`);
        const snap = await tx.get(ref);
        if (snap.exists()) throw new Error(`No disponible: ${unitId.toUpperCase()} ${dateStr}`);
      }
    }

    for (const unitId of units) {
      for (let i = 0; i < nights; i++){
        const dateStr = ymd(addDays(start, i));
        const ref = doc(db, "CALENDAR", `${unitId}_${dateStr}`);

        tx.set(ref, {
          unitId,
          date: dateStr,
          bookingId,
          type: "hold",
          createdAt: serverTimestamp()
        });
      }
    }
  });
}
