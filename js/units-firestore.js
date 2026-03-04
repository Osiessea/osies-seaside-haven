import { db } from "./firebase-init.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function loadUnits() {
  const q = query(collection(db, "UNITS"), orderBy("order"));
  const snap = await getDocs(q);

  const units = [];

  snap.forEach((doc) => {
    const data = doc.data();
    units.push({
      id: doc.id,
      name: data.name,
      code: data.code,
      price: data.basePrice,
      active: data.active
    });
  });

  return units;
}
