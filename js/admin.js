import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const loadingEl = document.getElementById("adminLoading");
const errorEl = document.getElementById("adminError");
const emptyEl = document.getElementById("adminEmpty");
const tableWrapEl = document.getElementById("adminTableWrap");
const tableBodyEl = document.getElementById("adminTableBody");

const calEl = document.getElementById("adminCalendar");
const calTitle = document.getElementById("calTitle");
const calPrev = document.getElementById("calPrev");
const calNext = document.getElementById("calNext");

let currentMonth = new Date();

if (calPrev) calPrev.onclick = () => changeMonth(-1);
if (calNext) calNext.onclick = () => changeMonth(1);

init();
loadCalendar();

async function init() {
  try {
    showLoading();

    const bookingsRef = collection(db, "BOOKINGS");
    const q = query(bookingsRef, orderBy("checkin", "desc"));
    const snap = await getDocs(q);

    const rows = snap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(row => row.status === "confirmed")
      .sort((a, b) => new Date(b.checkin) - new Date(a.checkin));

    if (!rows.length) {
      showEmpty();
      return;
    }

    tableBodyEl.innerHTML = rows.map(renderRow).join("");
    bindCancelButtons();
    showTable();
  } catch (err) {
    console.error("ADMIN_LOAD_ERROR:", err);
    showError(err?.message || "No se pudieron cargar las reservas.");
  }
}

function bindCancelButtons() {
  const buttons = document.querySelectorAll(".cancel-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const bookingId = btn.dataset.id || "";
      if (!bookingId) return;

      const ok = confirm(`¿Cancelar la reserva ${bookingId}?`);
      if (!ok) return;

      await cancelBooking(bookingId);
    });
  });
}

async function cancelBooking(bookingId) {
  try {
    const bookingRef = doc(db, "BOOKINGS", bookingId);

    // 1) marcar reserva como cancelada
    await updateDoc(bookingRef, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancelledBy: "admin"
    });

    // 2) leer TODO CALENDAR y borrar los docs que correspondan a esa reserva
    const calRef = collection(db, "CALENDAR");
    const snap = await getDocs(calRef);

    console.log("BOOKING ID:", bookingId);
    console.log("TOTAL DOCS CALENDAR:", snap.size);

    let deleted = 0;

    for (const d of snap.docs) {
      const data = d.data();
      const docBookingId = String(data.bookingId || "").trim();
      const targetBookingId = String(bookingId || "").trim();

      if (docBookingId === targetBookingId) {
        console.log("BORRANDO DOC:", d.id, data);
        await deleteDoc(d.ref);
        deleted++;
      }
    }

    console.log("DOCS BORRADOS:", deleted);
    console.log("CANCELACIÓN COMPLETA");

    location.reload();
  } catch (err) {
    console.error("CANCEL_BOOKING_ERROR:", err);
    alert("Error cancelando: " + (err?.message || err));
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

  const safeId = escapeHtml(row.id || "");
  const safeName = escapeHtml(row.name || "");
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
      <td>${safePhone}</td>
      <td>${safeCheckin}</td>
      <td>${safeCheckout}</td>
      <td>${safeNights}</td>
      <td>${safeUnits}</td>
      <td>${safeTotal}</td>
      <td>
        <button class="cancel-btn" data-id="${safeId}">
          Cancelar
        </button>
      </td>
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

async function loadCalendar() {
  const snap = await getDocs(collection(db, "CALENDAR"));
  const blocks = snap.docs.map(d => d.data());
  renderCalendar(blocks);
}

function changeMonth(delta) {
  currentMonth.setMonth(currentMonth.getMonth() + delta);
  loadCalendar();
}

function renderCalendar(blocks) {
  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();

  const first = new Date(y, m, 1);
  const startDay = first.getDay();

  const last = new Date(y, m + 1, 0);
  const totalDays = last.getDate();

  const monthName = first.toLocaleString("default", { month: "long" });
  calTitle.textContent = `${monthName} ${y}`;

  let html = `<div class="cal-grid">`;

  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  names.forEach(n => {
    html += `<div class="cal-dayname">${n}</div>`;
  });

  for (let i = 0; i < startDay; i++) {
    html += `<div class="cal-cell muted"></div>`;
  }

  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(y, m, d);
    const ymd = date.toISOString().slice(0, 10);

    const dayBlocks = blocks.filter(b => b.date === ymd);

    let tags = "";
    dayBlocks.forEach(b => {
      tags += `<span class="cal-tag">${String(b.unitId || "").toUpperCase()}</span>`;
    });

    html += `
      <div class="cal-cell">
        <div class="cal-date">${d}</div>
        <div class="cal-tags">${tags}</div>
      </div>
    `;
  }

  html += `</div>`;
  calEl.innerHTML = html;
}
