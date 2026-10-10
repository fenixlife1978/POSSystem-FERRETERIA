// ============================================================================
// MODO DEMO — restricciones para versión de evaluación.
// Se activa SOLO cuando existe pos/demo-mode.json dentro del empaquetado
// (el build completo nunca lo incluye). Límites:
//   · 30 días de prueba desde la primera ejecución
//   · Máximo 50 ventas registradas
//   · Máximo 100 productos en inventario
// ============================================================================
window.DemoMode = (() => {
  const DIAS_PRUEBA = 30;
  const MAX_VENTAS = 50;
  const MAX_PRODUCTOS = 100;
  const INICIO_KEY = "_demo_inicio";

  let _activo = false;

  function activo() { return _activo; }

  function fechaInicio() {
    let iso = null;
    try { iso = window.localStorage.getItem(INICIO_KEY); } catch (e) {}
    // Preferir la fecha más antigua registrada (localStorage o snapshot DB)
    try {
      const dbIso = DB && DB.parametros && DB.parametros.demoInicio;
      if (dbIso && (!iso || new Date(dbIso) < new Date(iso))) iso = dbIso;
    } catch (e) {}
    if (!iso) {
      iso = new Date().toISOString();
      try { window.localStorage.setItem(INICIO_KEY, iso); } catch (e) {}
    }
    try { if (DB && DB.parametros) DB.parametros.demoInicio = DB.parametros.demoInicio || iso; } catch (e) {}
    return iso;
  }

  function diasRestantes() {
    try {
      const t0 = new Date(fechaInicio()).getTime();
      const dias = Math.floor((Date.now() - t0) / 86400000);
      return Math.max(0, DIAS_PRUEBA - dias);
    } catch (e) { return DIAS_PRUEBA; }
  }

  function expirado() { return diasRestantes() <= 0; }

  function msjLimite(que, limite) {
    alert(
      "VERSIÓN DE EVALUACIÓN\n\n" +
      "Ha alcanzado el límite del modo demo: " + que + "\n" +
      "(Límite: " + limite + ")\n\n" +
      "Adquiera la licencia completa de POSsystem pro para continuar usando el sistema sin restricciones.\n\n" +
      "Contacte a su distribuidor autorizado."
    );
  }

  function msjExpirado() {
    alert(
      "VERSIÓN DE EVALUACIÓN EXPIRADA\n\n" +
      "El período de prueba de " + DIAS_PRUEBA + " días ha finalizado.\n\n" +
      "Adquiera la licencia completa de POSsystem pro para seguir utilizando el sistema.\n\n" +
      "Contacte a su distribuidor autorizado."
    );
  }

  function permitirAcceso() {
    if (!_activo) return true;
    if (expirado()) { msjExpirado(); return false; }
    return true;
  }

  function puedeVender() {
    if (!_activo) return true;
    if (expirado()) { msjExpirado(); return false; }
    if ((DB.ventas || []).length >= MAX_VENTAS) { msjLimite("máximo de ventas registradas", MAX_VENTAS + " ventas"); return false; }
    return true;
  }

  function puedeAgregarProducto() {
    if (!_activo) return true;
    if (expirado()) { msjExpirado(); return false; }
    if ((DB.productos || []).length >= MAX_PRODUCTOS) { msjLimite("máximo de productos en inventario", MAX_PRODUCTOS + " productos"); return false; }
    return true;
  }

  function aplicarMarcaVisual() {
    document.body.classList.add("demo-mode");

    // Badge DEMO junto al título de la ventana
    const tl = document.querySelector(".title-left");
    if (tl && !tl.querySelector(".demo-badge")) {
      const b = document.createElement("span");
      b.className = "demo-badge";
      b.textContent = "DEMO";
      b.title = "Versión de evaluación — quedan " + diasRestantes() + " días";
      tl.appendChild(b);
    }

    // Etiqueta en pantalla de login
    const sub = document.querySelector("#login-screen .brand-subtitle");
    if (sub && !sub.textContent.includes("DEMO")) {
      sub.textContent += "  ·  VERSIÓN DEMO";
    }

    // Marca de agua permanente
    if (!document.getElementById("demo-watermark")) {
      const w = document.createElement("div");
      w.id = "demo-watermark";
      w.textContent = "POSsystem pro — VERSIÓN DE EVALUACIÓN";
      document.body.appendChild(w);
    }
  }

  async function init() {
    try {
      if (window.desktop && typeof window.desktop.getAppInfo === "function") {
        const info = await window.desktop.getAppInfo();
        _activo = !!(info && info.demo);
      }
    } catch (e) { _activo = false; }
    if (!_activo) return;

    fechaInicio();          // asegura registro de primera ejecución
    aplicarMarcaVisual();

    // Interceptar login: bloquear si expiró
    if (typeof window.doLogin === "function") {
      const original = window.doLogin;
      window.doLogin = function () {
        if (!permitirAcceso()) return;
        return original.apply(this, arguments);
      };
    }

    // Aviso al arrancar
    setTimeout(() => {
      if (expirado()) { msjExpirado(); return; }
      console.log("[DEMO] Días restantes de evaluación:", diasRestantes());
    }, 1200);

    // Persistir fecha de inicio en el snapshot
    try { if (typeof saveDB === "function") saveDB(); } catch (e) {}
  }

  return { init, activo, puedeVender, puedeAgregarProducto, permitirAcceso, diasRestantes };
})();

document.addEventListener("DOMContentLoaded", () => {
  // login.js define doLogin en su propio DOMContentLoaded; esperar un tick
  setTimeout(() => { window.DemoMode.init(); }, 0);
});
