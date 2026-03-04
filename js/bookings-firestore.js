import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function createBooking(booking) {
  const ref = await addDoc(collection(db, "BOOKINGS"), {
    ...booking,
    status: "pending",          // luego Stripe lo cambia a "paid"
    createdAt: serverTimestamp()
  });
  return ref.id;
}
