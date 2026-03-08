import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const loadingEl = document.getElementById("adminLoading");
const errorEl = document.getElementById("adminError");
const emptyEl = document.getElementById("adminEmpty");
const tableWrapEl = document.getElementById("adminTableWrap");
const tableBodyEl = document.getElementById("adminTableBody");

init();

async function init() {
  try {
    showLoading();

    const bookingsRef = collection(db, "BOOKINGS");
    const q = query(bookingsRef, orderBy("checkin", "desc"));
    const snap = await getDocs(q);

    const rows = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (!rows.length) {
      showEmpty();
      return;
    }

    tableBodyEl.innerHTML = rows.map(renderRow).join("");
    showTable();
  } catch (err) {
    console.error("ADMIN_LOAD_ERROR:", err);
    showError(err?.message || "No se pudieron cargar las reservas.");
  }
}

function renderRow(row) {
  const units = Array.isArray(row.units)
    ? row.units.map(u => String(u).toUpperCase()).join(", ")
    : "";

  const total = Number(row.total || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });

  const status = String(row.status || "").trim() || "unknown";
  const safeStatus = escapeHtml(status);
  const safeId = escapeHtml(row.id || "");
  const safeName = escapeHtml(row.name || "");
  const safeEmail = escapeHtml(row.email || "");
  const safePhone = escapeHtml(row.phone || "");
  const safeCheckin = escapeHtml(row.checkin || "");
  const safeCheckout = escapeHtml(row.checkout || "");
  const safeNights = escapeHtml(String(row.nights ?? ""));
  const safeUnits = escapeHtml(units);
  const safeTotal = escapeHtml(total);

  return `
    <tr>
      <td>${safeId}</td>
      <td>${safeName}</td>
      <td>${safeEmail}</td>
      <td>${safePhone}</td>
      <td>${safeCheckin}</td>
      <td>${safeCheckout}</td>
      <td>${safeNights}</td>
      <td>${safeUnits}</td>
      <td>${safeTotal}</td>
      <td><span class="status-badge ${safeStatus}">${safeStatus}</span></td>
    </tr>
  `;
}

function showLoading() {
  loadingEl.hidden = false;
  errorEl.hidden = true;
  emptyEl.hidden = true;
  tableWrapEl.hidden = true;
}

function showError(message) {
  loadingEl.hidden = true;
  errorEl.hidden = false;
  emptyEl.hidden = true;
  tableWrapEl.hidden = true;
  errorEl.textContent = message;
}

function showEmpty() {
  loadingEl.hidden = true;
  errorEl.hidden = true;
  emptyEl.hidden = false;
  tableWrapEl.hidden = true;
}

function showTable() {
  loadingEl.hidden = true;
  errorEl.hidden = true;
  emptyEl.hidden = true;
  tableWrapEl.hidden = false;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
