import { loadBlockedDates } from "./calendar-firestore.js";
import { createBooking } from "./bookings-firestore.js";
import { blockDates } from "./calendar-write-firestore.js";
import { holdDatesIfFree } from "./calendar-transaction-firestore.js";

console.log("✅ app.js cargó");

(() => {
  // ====== Placeholder generator (sin imágenes reales todavía) ======
  function makePlaceholder(label){
    const w = 1400, h = 900;
    const bg = "#ffffff";
    const a0 = "#ff385c";
    const a1 = "#ff385c";
    const txt = "#111111";

    const svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a0}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${a1}" stop-opacity="0.18"/>
    </linearGradient>
    <radialGradient id="r" cx="25%" cy="20%" r="70%">
      <stop offset="0" stop-color="${a0}" stop-opacity="0.25"/>
      <stop offset="1" stop-color="${bg}" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  <rect width="100%" height="100%" fill="url(#r)"/>
  <rect x="60" y="60" width="${w-120}" height="${h-120}" rx="48" fill="url(#g)" stroke="rgba(0,0,0,0.10)"/>
  <text x="110" y="170" fill="${txt}" font-size="52" font-family="ui-sans-serif, system-ui" font-weight="800">Mi Casita Demo</text>
  <text x="110" y="240" fill="rgba(0,0,0,0.55)" font-size="30" font-family="ui-sans-serif, system-ui">${escapeXml(label)}</text>
  <text x="110" y="${h-110}" fill="rgba(0,0,0,0.40)" font-size="22" font-family="ui-sans-serif, system-ui">Placeholder • Replace with real photos</text>
</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function escapeXml(s){
    return String(s).replace(/[<>&'"]/g, (c) => ({
      "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", "\"":"&quot;"
    }[c]));
  }

  // ====== Config ======
  const CONFIG = {
    propertyName: "Mi Casita Demo",
    pricePerNight: 165,
    minNights: 2,
    photos: [
"./assets/01-exterior.jpg",
"./assets/02-sala.jpg",
"./assets/03-cocina.jpg",
"./assets/04-habitacion.jpg",
      "./assets/05-bano.jpg",
      makePlaceholder("Terraza • View")
    ],
    blockedDates: new Set([
      "2026-03-06",
      "2026-03-07",
      "2026-03-14",
      "2026-03-15",
      "2026-03-22",
      "2026-03-27"
    ])
  };

  // ====== DOM helpers ======
  const $ = (id) => document.getElementById(id);

  function pad2(n){ return String(n).padStart(2, "0"); }
  function ymd(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
  function addDays(date, days){
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
  function diffDays(a, b){
    const ms = (b.getTime() - a.getTime());
    return Math.round(ms / (1000*60*60*24));
  }

  // ====== Gallery ======
  let gIndex = 0;

  function renderGallery(){
    const img = $("gImg");
    const title = $("gTitle");
    const sub = $("gSub");
    const thumbs = $("thumbs");
    if (!img || !thumbs) return;

    img.src = CONFIG.photos[gIndex];
    title.textContent = CONFIG.propertyName;
    sub.textContent = `Imagen ${gIndex + 1} de ${CONFIG.photos.length}`;

    thumbs.innerHTML = "";
    CONFIG.photos.slice(0, 10).forEach((src, idx) => {
      const b = document.createElement("button");
      b.className = "thumb" + (idx === gIndex ? " active" : "");
      b.type = "button";
      b.addEventListener("click", () => {
        gIndex = idx;
        renderGallery();
      });

      const timg = document.createElement("img");
      timg.src = src;
      timg.alt = `Miniatura ${idx + 1}`;
      b.appendChild(timg);
      thumbs.appendChild(b);
    });
  }

  function wireGallery(){
    const prev = $("gPrev");
    const next = $("gNext");
    if (prev) prev.addEventListener("click", () => { gIndex = (gIndex - 1 + CONFIG.photos.length) % CONFIG.photos.length; renderGallery(); });
    if (next) next.addEventListener("click", () => { gIndex = (gIndex + 1) % CONFIG.photos.length; renderGallery(); });
  }

  function renderPhotoGrid(){
    const grid = $("photoGrid");
    if (!grid) return;

    const main = document.createElement("div");
    main.className = "photo-main";
    main.innerHTML = `<img src="${CONFIG.photos[0]}" alt="Foto principal" />`;

    const side = document.createElement("div");
    side.className = "photo-side";
    CONFIG.photos.slice(1, 5).forEach((src, idx) => {
      const tile = document.createElement("div");
      tile.className = "photo-tile";
      tile.innerHTML = `<img src="${src}" alt="Foto ${idx + 2}" />`;
      side.appendChild(tile);
    });

    grid.innerHTML = "";
    grid.appendChild(main);
    grid.appendChild(side);
  }

  // ====== Calendar ======
  const DOW = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
  let viewMonth = new Date();
  viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);

  let checkIn = null;
  let checkOut = null;

  function isBlocked(dateObj){
    return CONFIG.blockedDates.has(ymd(dateObj));
  }
  function isPast(dateObj){
  const t = new Date();
  t.setHours(0,0,0,0);
  const d = new Date(dateObj);
  d.setHours(0,0,0,0);
  return d <= t; // pasado (hoy permitido)
}

  function inRange(d){
    if (!checkIn || !checkOut) return false;
    return d > checkIn && d < checkOut;
  }

  function isSameDay(a,b){
    return a && b && ymd(a) === ymd(b);
  }

  function updateSummary(){
    $("sIn").textContent = checkIn ? ymd(checkIn) : "—";
    $("sOut").textContent = checkOut ? ymd(checkOut) : "—";

    if (checkIn && checkOut){
      const nights = diffDays(checkIn, checkOut);
      $("sNights").textContent = String(nights);
      $("sTotal").textContent = `$${(nights * CONFIG.pricePerNight).toFixed(0)}`;
      $("calMeta").textContent = `${nights} noches • $${CONFIG.pricePerNight}/noche`;
    } else {
      $("sNights").textContent = "—";
      $("sTotal").textContent = "—";
      $("calMeta").textContent = "Selecciona fechas";
    }
  }

  function clearSelection(){
    checkIn = null;
    checkOut = null;
    updateSummary();
    renderCalendar();
  }

  function canSelectRange(start, endExclusive){
    const nights = diffDays(start, endExclusive);
    if (nights < CONFIG.minNights) return { ok:false, reason:`Mínimo ${CONFIG.minNights} noches.` };

    for (let i = 0; i < nights; i++){
      const d = addDays(start, i);
      if (isBlocked(d)) return { ok:false, reason:"El rango incluye noches no disponibles." };
    }
    return { ok:true, reason:"" };
  }

  function handleDayClick(dateObj){
    if (isBlocked(dateObj)) return;

    if (!checkIn || (checkIn && checkOut)){
      checkIn = dateObj;
      checkOut = null;
      updateSummary();
      renderCalendar();
      return;
    }

    if (dateObj <= checkIn){
      checkIn = dateObj;
      checkOut = null;
      updateSummary();
      renderCalendar();
      return;
    }

    const res = canSelectRange(checkIn, dateObj);
    if (!res.ok){
      toast(res.reason);
      return;
    }

    checkOut = dateObj;
    updateSummary();
    renderCalendar();
  }

  function renderCalendar(){
    const host = $("calendar");
    if (!host) return;

    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();

    const jsDow = first.getDay();        // 0..6
    const mondayIndex = (jsDow + 6) % 7; // Monday=0..Sunday=6

    const grid = document.createElement("div");
    grid.className = "cal-grid";

    for (const d of DOW){
      const cell = document.createElement("div");
      cell.className = "cal-dow";
      cell.textContent = d;
      grid.appendChild(cell);
    }

    for (let i = 0; i < mondayIndex; i++){
      const blank = document.createElement("div");
      blank.className = "cal-cell disabled";
      blank.innerHTML = `<div class="cal-num"></div>`;
      grid.appendChild(blank);
    }

    for (let day = 1; day <= daysInMonth; day++){
      const d = new Date(year, month, day);
      const cell = document.createElement("div");
      cell.className = "cal-cell";

const blocked = isBlocked(d) || isPast(d);
      const selectedStart = isSameDay(d, checkIn);
      const selectedEnd = isSameDay(d, checkOut);

      if (blocked) cell.classList.add("blocked", "disabled");
      if (selectedStart || selectedEnd) cell.classList.add("selected");
      if (inRange(d)) cell.classList.add("inrange");

      cell.innerHTML = `
        <div class="cal-num">${day}</div>
        <div class="cal-tag">${blocked ? "No disponible" : "Disponible"}</div>
      `;

      if (!blocked){
        cell.addEventListener("click", () => handleDayClick(d));
      }

      grid.appendChild(cell);
    }

    host.innerHTML = "";
    host.appendChild(grid);

    const mname = new Intl.DateTimeFormat("es-PR", { month:"long", year:"numeric" }).format(viewMonth);
$("calMeta").textContent = mname;  }

  function wireCalendarNav(){
    const prev = $("calPrev");
    const next = $("calNext");
    if (prev) prev.addEventListener("click", () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1); renderCalendar(); });
    if (next) next.addEventListener("click", () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1); renderCalendar(); });
  }

  // ====== Booking (save to Firestore) ======
  function wireBooking(){
    const form = $("bookingForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = $("msg");
      msg.textContent = "";

      if (!checkIn || !checkOut){
        toast("Selecciona check-in y check-out.");
        return;
      }

      const nights = diffDays(checkIn, checkOut);
      if (nights < CONFIG.minNights){
        toast(`Mínimo ${CONFIG.minNights} noches.`);
        return;
      }

      const res = canSelectRange(checkIn, checkOut);
      if (!res.ok){
        toast(res.reason);
        return;
      }

      const payload = {
        name: $("name").value.trim(),
        email: $("email").value.trim(),
        phone: $("phone").value.trim(),
        guests: Number($("guests").value || 1),
        checkin: ymd(checkIn),
        checkout: ymd(checkOut),
        nights,
        total: nights * CONFIG.pricePerNight
      };

      try {
  const bookingId = await createBooking(payload);

  // ✅ bloquea noches (ATÓMICO: si alguna existe, falla)
await holdDatesIfFree(payload.checkin, payload.checkout, bookingId);

  // ✅ refresca disponibilidad y repinta
  CONFIG.blockedDates = await loadBlockedDates();
  renderCalendar();

  msg.textContent = `✅ Reserva guardada y fechas bloqueadas: ${bookingId} • ${payload.checkin} → ${payload.checkout} • $${payload.total.toFixed(0)}.`;
} catch (err) {
  console.error(err);
msg.textContent = `❌ No se pudo reservar: ${err?.message || "fechas no disponibles"}.`;
}
    });
  }

  // ====== UI helpers ======
  function wireTopCTA(){
    const b = $("btnPrimary");
    if (!b) return;
    b.addEventListener("click", () => {
      document.querySelector("#reservar")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => $("calendar")?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    });
  }

  function toast(text){
    const msg = $("msg");
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = "var(--muted)";
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => { msg.textContent = ""; }, 3500);
  }

  // ====== Boot ======
  async function init(){
    async function hydrateAvailability(){
      try {
        const set = await loadBlockedDates();
        if (set instanceof Set && set.size) {
          CONFIG.blockedDates = set;
        }
        console.log("✅ CONFIG.blockedDates hydrated:", [...CONFIG.blockedDates]);
      } catch (e) {
        console.log("Firestore no cargó; usando bloqueos demo:", e);
      }
    }

    await hydrateAvailability();

    wireTopCTA();
    wireGallery();
    wireCalendarNav();
    wireBooking();

    renderGallery();
    renderPhotoGrid();
    updateSummary();

    const now = new Date();
    viewMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    renderCalendar();

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") clearSelection();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
