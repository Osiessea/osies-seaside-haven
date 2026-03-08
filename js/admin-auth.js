const ADMIN_PASSWORD = "osies2026";

const ok = sessionStorage.getItem("admin_ok") === "1";

if (!ok) {
  const entered = prompt("Contraseña admin");
  if (entered !== ADMIN_PASSWORD) {
    document.body.innerHTML = "<main style='padding:40px;font-family:Arial,sans-serif'>Acceso denegado</main>";
    throw new Error("ADMIN_ACCESS_DENIED");
  }
  sessionStorage.setItem("admin_ok", "1");
}
