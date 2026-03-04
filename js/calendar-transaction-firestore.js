import { db } from "./firebase.js";
import {
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

function pad2(n){ return String(n).padStart(2, "0"); }
function ymd(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }

function addDays(date, days){
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Bloquea noches por UNIDAD en CALENDAR.
 * Crea docs con ID: `${unitId}_${YYYY-MM-DD}`
 * Campos: unitId, date, bookingId, type, createdAt
 */
export async function holdDatesIfFree(checkinYMD, checkoutYMD, bookingId, unitIds) {
  const units = Array.isArray(unitIds) ? unitIds.map(u => String(u).toLowerCase()) : [];

  if (units.length === 0) {
    throw new Error("No units selected.");
  }

  const start = new Date(checkinYMD + "T00:00:00");
  const end = new Date(checkoutYMD + "T00:00:00");

  const nights = Math.round((end - start) / (1000*60*60*24));
  if (nights <= 0) throw new Error("Invalid date range.");

  await runTransaction(db, async (tx) => {

    // 1) Validar que TODAS las noches están libres para TODAS las unidades
    for (const unitId of units) {
      for (let i = 0; i < nights; i++){
        const d = addDays(start, i);
        const dateStr = ymd(d);

        const id = `${unitId}_${dateStr}`;
        const ref = doc(db, "CALENDAR", id);

        const snap = await tx.get(ref);
        if (snap.exists()) {
          throw new Error(`No disponible: ${unitId.toUpperCase()} ${dateStr}`);
        }
      }
    }

    // 2) Crear los bloqueos
    for (const unitId of units) {
      for (let i = 0; i < nights; i++){
        const d = addDays(start, i);
        const dateStr = ymd(d);

        const id = `${unitId}_${dateStr}`;
        const ref = doc(db, "CALENDAR", id);

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
}    for (const ymd of nights) {
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
