// ============================================================================
// MÓDULOS DE LA BARRA DE HERRAMIENTAS (toolbar)
//  - Departamentos  (gestiona DB.parametros.categorias)
//  - Productos Terminados  (productos no-servicio)
//  - Productos Compuestos  (productos/servicios con componentes)
//  - Adicionales  (gestiona DB.parametros.presentaciones)
//  - Operaciones Precios  (aplicar % a todos los precios)
//  - Clientes / Proveedores / Servicios / Inventario 360 reutilizan módulos existentes
// ============================================================================

function _esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ===== DEPARTAMENTOS (categorías de productos) =====
function abrirDepartamentos() { openModuleWindow("modDepartamentos"); renderDepartmentsTable(); }

function renderDepartmentsTable() {
  const body = $("dep-body");
  if (!body) return;
  const cats = DB.parametros.categorias || [];
  body.innerHTML = cats.length
    ? cats.map((c, i) => `<tr>
        <td>${i + 1}</td>
        <td>${_esc(c)}</td>
        <td style="text-align:center"><button class="btn-mini" title="Eliminar departamento" onclick="eliminarDepartamento(${i})">✕</button></td>
      </tr>`).join("")
    : `<tr><td colspan="3" style="text-align:center;color:#888">Sin departamentos registrados</td></tr>`;
}

function agregarDepartamento() {
  const inp = $("dep-nombre");
  const v = (inp ? inp.value : "").trim();
  if (!v) return alert("Escriba el nombre del departamento");
  if (!DB.parametros.categorias) DB.parametros.categorias = [];
  if (DB.parametros.categorias.some(x => x.toLowerCase() === v.toLowerCase())) return alert("Ese departamento ya existe");
  DB.parametros.categorias.push(v);
  inp.value = "";
  saveDB();
  renderDepartmentsTable();
}

function eliminarDepartamento(i) {
  DB.parametros.categorias.splice(i, 1);
  saveDB();
  renderDepartmentsTable();
}

// ===== PRODUCTOS TERMINADOS =====
function abrirProdTerminados() { openModuleWindow("modProdTerminados"); renderProdTerminados(); }

function renderProdTerminados() {
  const body = $("proterm-body");
  if (!body) return;
  const q = (($("proterm-search") && $("proterm-search").value) || "").toLowerCase().trim();
  const rows = DB.productos.filter(p =>
    (p.categoria || "") !== "SERVICIOS" &&
    (!q || (p.descripcion || "").toLowerCase().includes(q) || (p.codigo || "").toLowerCase().includes(q))
  );
  body.innerHTML = rows.length
    ? rows.map(p => `<tr>
        <td>${_esc(p.codigo)}</td>
        <td>${_esc(p.descripcion)}</td>
        <td>${_esc(p.categoria || "")}</td>
        <td style="text-align:right">${fmt(p.existencia)}</td>
        <td style="text-align:right">${fmt(p.precio)}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" style="text-align:center;color:#888">Sin productos terminados</td></tr>`;
}

// ===== PRODUCTOS COMPUESTOS (con componentes) =====
function abrirProdCompuestos() { openModuleWindow("modProdCompuestos"); renderCompParts(); }

function _productosCompuestos() {
  return DB.productos.filter(p => (p.componentes || []).length);
}

function renderCompParts() {
  const body = $("compost-body");
  if (!body) return;
  const rows = _productosCompuestos();
  body.innerHTML = rows.length
    ? rows.map((p, i) => `<tr class="cursor" onclick="seleccionarCompuesto(${i})">
        <td>${_esc(p.codigo)}</td>
        <td>${_esc(p.descripcion)}</td>
        <td style="text-align:right">${(p.componentes || []).length}</td>
        <td style="text-align:right">${fmt(p.precio)}</td>
      </tr>`).join("")
    : `<tr><td colspan="4" style="text-align:center;color:#888">No hay productos compuestos</td></tr>`;
  const det = $("compost-detalle");
  if (det) det.innerHTML = "";
}

function seleccionarCompuesto(i) {
  const rows = _productosCompuestos();
  const p = rows[i];
  const det = $("compost-detalle");
  if (!p || !det) return;
  det.innerHTML = `<b>${_esc(p.descripcion)}</b><br>` +
    (p.componentes || []).map(c => {
      const prod = DB.productos.find(x => x.codigo === c.codigo);
      const desc = prod ? prod.descripcion : (c.descripcion || c.codigo);
      return `<span>• ${_esc(c.codigo)} — ${_esc(desc)} × ${num(c.cantidad) || 1}</span>`;
    }).join("<br>");
}

// ===== ADICIONALES (presentaciones de producto) =====
function abrirAdicionales() { openModuleWindow("modAdicionales"); renderAdicionales(); }

function renderAdicionales() {
  const body = $("adic-body");
  if (!body) return;
  const list = DB.parametros.presentaciones || [];
  body.innerHTML = list.length
    ? list.map((v, i) => `<tr>
        <td>${i + 1}</td>
        <td>${_esc(v)}</td>
        <td style="text-align:center"><button class="btn-mini" title="Eliminar adicional" onclick="eliminarAdicional(${i})">✕</button></td>
      </tr>`).join("")
    : `<tr><td colspan="3" style="text-align:center;color:#888">Sin adicionales registrados</td></tr>`;
}

function agregarAdicional() {
  const inp = $("adic-nombre");
  const v = (inp ? inp.value : "").trim();
  if (!v) return alert("Escriba el adicional");
  if (!DB.parametros.presentaciones) DB.parametros.presentaciones = [];
  if (DB.parametros.presentaciones.some(x => x.toLowerCase() === v.toLowerCase())) return alert("Ese adicional ya existe");
  DB.parametros.presentaciones.push(v);
  inp.value = "";
  saveDB();
  renderAdicionales();
}

function eliminarAdicional(i) {
  DB.parametros.presentaciones.splice(i, 1);
  saveDB();
  renderAdicionales();
}

// ===== OPERACIONES DE PRECIOS =====
function abrirOpPrecios() { openModuleWindow("modOpPrecios"); renderOpPrecios(); }
function renderOpPrecios() {
  const el = $("opp-count");
  if (el) el.textContent = "Productos que serán afectados: " + DB.productos.length;
}

async function aplicarOpPrecios() {
  const pct = num($("opp-pct") ? $("opp-pct").value : "");
  if (!isFinite(pct)) return alert("Ingrese un porcentaje válido (puede ser negativo)");
  const ok = (typeof uiConfirm === "function")
    ? await uiConfirm("¿Aplicar " + pct + "% a los precios de " + DB.productos.length + " productos?")
    : confirm("¿Aplicar " + pct + "% a los precios de " + DB.productos.length + " productos?");
  if (!ok) return;
  DB.productos.forEach(p => {
    p.precio = r2((p.precio || 0) * (1 + pct / 100));
    if (p.precioUSD != null) p.precioUSD = r2((p.precioUSD || 0) * (1 + pct / 100));
  });
  saveDB();
  if (typeof renderProductos === "function") renderProductos();
  if (typeof renderInventario === "function") renderInventario();
  alert("Precios actualizados para " + DB.productos.length + " productos.");
  renderOpPrecios();
}

// ============================================================================
// MAESTRO DE PRODUCTOS — pestañas, simulador y utilidades del formulario
// ============================================================================

function prodSwitchTab(btn, paneId) {
  var scope = btn.closest(".prod-workspace");
  if (scope) {
    scope.querySelectorAll(".prod-tab-btn").forEach(function(b) { b.classList.remove("active"); });
    scope.querySelectorAll(".prod-pane").forEach(function(p) { p.classList.remove("active"); });
  }
  btn.classList.add("active");
  var pane = document.getElementById(paneId);
  if (pane) pane.classList.add("active");

  if (paneId === "pane-proveedores") {
    if (typeof rellenarSelectProveedoresMaestros === "function") rellenarSelectProveedoresMaestros();
    if (typeof renderProdProveedores === "function") renderProdProveedores();
    if (typeof recalcularCostoMaximoProducto === "function") recalcularCostoMaximoProducto();
  } else if (paneId === "pane-etiqueta") {
    if (typeof renderHabladorPreview === "function") renderHabladorPreview();
  }
}

function prodRecalcularCostos() {
  var tasa = getTasa();
  var costo = num($("prod-costo").value) || 0;
  var gastosPct = num($("prod-gastos").value) || 0;
  var gastosMonto = costo * (gastosPct / 100);
  var costoReal = costo + gastosMonto;
  setVal("prod-costo-real-usd", costoReal);
  $("prod-costo-real-bs").value = (Math.round(costoReal * tasa * 100) / 100).toFixed(2).replace(".", ",");
  // Recalcular PVP según el método de Parámetros
  var margen = num($("prod-margen").value) || 0;
  var usd = calcPrecioUSD(costoReal, margen);
  setVal("prod-precio-usd", usd);
  setVal("prod-precio-bs", usd * tasa);
  actualizarResultadoPrecio();
  prodActualizarSim();
}

function prodActualizarSim() {
  var tasa = getTasa();
  var el = function(id) { var e = document.getElementById(id); return e || { textContent: "", style: {} }; };
  var costo = num($("prod-costo").value) || 0;
  var gastosPct = num($("prod-gastos").value) || 0;
  var gastosMonto = costo * (gastosPct / 100);
  var costoReal = costo + gastosMonto;
  var margen = num($("prod-margen").value) || 0;
  var method = getMarkupMethod();
  var subtotal = 0, ganancia = 0, margenDisplay = "0,00%";
  if (method === "costo" || method === "brecha") { ganancia = costoReal * (margen / 100); subtotal = costoReal + ganancia; margenDisplay = margen.toFixed(2) + "% (s/ Costo)"; }
  else { subtotal = margen < 100 ? costoReal / (1 - margen / 100) : costoReal; ganancia = subtotal - costoReal; margenDisplay = margen.toFixed(2) + "% (s/ Venta)"; }
  var ivaEnabled = !(document.querySelector('input[name="prod-iva-app"]:checked') && document.querySelector('input[name="prod-iva-app"]:checked').value === "no");
  var ivaPct = ivaEnabled ? (num($("prod-iva-rate").value) || 0) : 0;
  var ivaMonto = subtotal * (ivaPct / 100);
  var precioFinalUsd = subtotal + ivaMonto;
  var precioFinalBs = precioFinalUsd * tasa;
  el("sim-costo").textContent = "$" + fmt(costo);
  el("sim-gastos").textContent = "$" + fmt(gastosMonto);
  el("sim-costo-real").textContent = "$" + fmt(costoReal);
  el("sim-margen").textContent = margenDisplay;
  el("sim-ganancia").textContent = "$" + fmt(ganancia);
  el("sim-subtotal").textContent = "$" + fmt(subtotal);
  el("sim-iva-pct").textContent = ivaPct;
  el("sim-iva-val").textContent = "$" + fmt(ivaMonto);
  el("sim-precio-usd").textContent = "$" + fmt(precioFinalUsd);
  el("sim-precio-bs").textContent = "Bs " + fmt(precioFinalBs);
}

function prodToggleIva() {
  var warn = document.getElementById("prod-exempt-warning");
  var rate = document.getElementById("prod-iva-rate");
  var exento = document.querySelector('input[name="prod-iva-app"]:checked');
  var isExento = exento && exento.value === "no";
  if (warn) warn.style.display = isExento ? "flex" : "none";
  if (rate) rate.disabled = isExento;
  prodActualizarSim();
}

function editarTasaBCV() {
  var nuevo = prompt("Ingrese la nueva tasa oficial BCV (Bs/USD):", getTasa());
  if (nuevo !== null && !isNaN(nuevo) && num(nuevo) > 0) {
    DB.parametros.tasaBCV = num(nuevo);
    saveDB();
    var bcv = document.getElementById("prod-bcv-display");
    if (bcv) bcv.textContent = fmt(getTasa());
    $("prod-tasa-hint").textContent = fmt(getTasa());
    prodRecalcularCostos();
    recalcTotales();
  }
}

function duplicarProducto() {
  var cod = ($("prod-cod").value || "").trim();
  var p = DB.productos.find(function(x) { return x.codigo === cod; });
  if (!p) { alert("Seleccione o cargue un producto para duplicar."); return; }
  var copia = JSON.parse(JSON.stringify(p));
  copia.codigo = genNro(DB.productos, "codigo", "", 6);
  copia.descripcion = (p.descripcion || "") + " (Copia)";
  copia.existencia = 0; copia.reservado = 0; copia.stockIni = 0;
  DB.productos.push(copia);
  saveDB();
  renderProductos();
  selectProducto(copia.codigo);
  alert("Producto duplicado con código " + copia.codigo + ". Ajuste los datos y guarde.");
}

function generarCodigoProducto() {
  var nro = genNro(DB.productos, "codigo", "", 6);
  $("prod-cod").value = nro;
  $("prod-cod").focus();
  $("prod-cod").select();
}

function guardarProductoYNuevo() {
  guardarProducto();
  nuevoProducto();
}

// ============================================================================
// AUTO SKU (CÓDIGO INTERNO SEGÚN CATEGORÍA / SUBCATEGORÍA)
// ============================================================================
function generarAutoSKU() {
  var catSelect = document.getElementById("prod-cat");
  var subcatSelect = document.getElementById("prod-subcat");
  var cat = (catSelect ? catSelect.value : "").trim();
  var subcat = (subcatSelect ? subcatSelect.value : "").trim();

  var base = subcat || cat || "GEN";
  // Extraer letras limpias A-Z sin acentos
  var sigla = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase();
  if (sigla.length < 3) sigla = (sigla + "XXX").substring(0, 3);

  var prefix = "SKU-" + sigla + "-";
  var maxNum = 0;

  (DB.productos || []).forEach(function(p) {
    var skuStr = String(p.sku || "").toUpperCase();
    if (skuStr.indexOf(prefix) === 0) {
      var numPart = parseInt(skuStr.substring(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });

  var nextNum = String(maxNum + 1).padStart(5, '0');
  var nuevoSKU = prefix + nextNum;

  var skuInput = document.getElementById("prod-sku");
  if (skuInput) skuInput.value = nuevoSKU;
}

// ============================================================================
// GESTIÓN DE PROVEEDORES EN PRODUCTOS & PRECIO DE COSTO MÁXIMO
// ============================================================================
function rellenarSelectProveedoresMaestros() {
  var sel = document.getElementById("prod-prov-select");
  if (!sel) return;
  var list = (DB.maestroProveedores || []).slice();
  var html = '<option value="">-- Seleccionar Proveedor --</option>';
  html += '<option value="__NUEVO__">➕ -- CREAR NUEVO PROVEEDOR --</option>';
  list.forEach(function(p) {
    html += '<option value="' + _esc(p.codigo) + '">' + _esc(p.nombre) + (p.rif ? ' (' + _esc(p.rif) + ')' : '') + '</option>';
  });
  sel.innerHTML = html;
  toggleFormNuevoProveedor();
}

function toggleFormNuevoProveedor() {
  var sel = document.getElementById("prod-prov-select");
  var row = document.getElementById("row-nuevo-proveedor");
  if (!sel || !row) return;
  if (sel.value === "__NUEVO__") {
    row.style.display = "";
    var nIn = document.getElementById("prod-prov-nuevo-nombre");
    if (nIn) nIn.focus();
  } else {
    row.style.display = "none";
  }
}

function asociarProveedorProducto() {
  var sel = document.getElementById("prod-prov-select");
  if (!sel) return;
  var provCode = sel.value;
  var provNombre = "";
  var provRif = "";

  if (!provCode) {
    alert("Por favor seleccione un proveedor existente o elija 'CREAR NUEVO PROVEEDOR'.");
    return;
  }

  if (provCode === "__NUEVO__") {
    provNombre = (document.getElementById("prod-prov-nuevo-nombre").value || "").trim();
    provRif = (document.getElementById("prod-prov-nuevo-rif").value || "").trim();
    if (!provNombre) {
      alert("Ingrese el nombre del nuevo proveedor.");
      document.getElementById("prod-prov-nuevo-nombre").focus();
      return;
    }
    // Autoregistro en DB.maestroProveedores
    if (!DB.maestroProveedores) DB.maestroProveedores = [];
    var nuevoCod = genNro(DB.maestroProveedores, "codigo", "PROV-", 5);
    var nuevoObj = {
      codigo: nuevoCod,
      nombre: provNombre,
      rif: provRif,
      direccion: "",
      telefono: "",
      email: "",
      contacto: "",
      observaciones: "Creado automáticamente desde Formulario de Producto"
    };
    DB.maestroProveedores.push(nuevoObj);
    if (!DB.proveedores) DB.proveedores = [];
    if (!DB.proveedores.some(function(n) { return String(n).toLowerCase() === provNombre.toLowerCase(); })) {
      DB.proveedores.push(provNombre);
    }
    saveDB();
    provCode = nuevoCod;
    alert("Nuevo proveedor '" + provNombre + "' creado y registrado en Proveedores con el código " + nuevoCod + ".");
  } else {
    var pObj = DB.maestroProveedores.find(function(x) { return x.codigo === provCode; });
    provNombre = pObj ? pObj.nombre : provCode;
  }

  var precio = num(document.getElementById("prod-prov-precio").value);
  var barcode = (document.getElementById("prod-prov-barcode").value || "").trim();

  if (!window._prodProveedores) window._prodProveedores = [];

  var existingIdx = window._prodProveedores.findIndex(function(x) { return x.codigo === provCode || x.nombre === provNombre; });
  if (existingIdx >= 0) {
    window._prodProveedores[existingIdx].precioCompra = precio;
    window._prodProveedores[existingIdx].codigoBarras = barcode;
  } else {
    window._prodProveedores.push({
      codigo: provCode,
      nombre: provNombre,
      precioCompra: precio,
      codigoBarras: barcode,
      principal: window._prodProveedores.length === 0
    });
  }

  // Limpiar campos del formulario
  document.getElementById("prod-prov-precio").value = "";
  document.getElementById("prod-prov-barcode").value = "";
  document.getElementById("prod-prov-nuevo-nombre").value = "";
  document.getElementById("prod-prov-nuevo-rif").value = "";
  rellenarSelectProveedoresMaestros();

  renderProdProveedores();
  recalcularCostoMaximoProducto();
}

function recalcularCostoMaximoProducto() {
  var list = window._prodProveedores || [];
  var maxCosto = 0;
  list.forEach(function(p) {
    var c = num(p.precioCompra);
    if (c > maxCosto) maxCosto = c;
  });

  var labelMax = document.getElementById("prod-prov-costo-max");
  if (labelMax) labelMax.textContent = "$ " + fmtVE(maxCosto, 2);

  if (list.length > 0) {
    var costoIn = document.getElementById("prod-costo");
    if (costoIn) {
      costoIn.value = String(maxCosto.toFixed(2)).replace(".", ",");
      if (typeof prodRecalcularCostos === "function") prodRecalcularCostos();
      else if (typeof recalcPrecio === "function") recalcPrecio("costo");
    }
  }
}

function renderProdProveedores() {
  var body = document.getElementById("prod-proveedores-body");
  if (!body) return;
  var list = window._prodProveedores || [];

  if (list.length === 0) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:12px">Sin proveedores asociados</td></tr>';
  } else {
    body.innerHTML = list.map(function(p, i) {
      return '<tr>' +
        '<td>' + _esc(p.codigo || '—') + '</td>' +
        '<td><b>' + _esc(p.nombre || '') + '</b></td>' +
        '<td style="text-align:right">$ ' + fmtVE(num(p.precioCompra), 2) + '</td>' +
        '<td>' + _esc(p.codigoBarras || '—') + '</td>' +
        '<td style="text-align:center"><input type="radio" name="prod-prov-principal" ' + (p.principal ? "checked" : "") + ' onclick="marcarProveedorPrincipal(' + i + ')"></td>' +
        '<td style="text-align:center"><button type="button" class="btn-mini" title="Quitar" onclick="quitarProveedorProducto(' + i + ')">✕</button></td>' +
        '</tr>';
    }).join("");
  }
}

function marcarProveedorPrincipal(i) {
  var list = window._prodProveedores || [];
  list.forEach(function(p, idx) { p.principal = (idx === i); });
}

function quitarProveedorProducto(i) {
  if (!window._prodProveedores) return;
  window._prodProveedores.splice(i, 1);
  renderProdProveedores();
  recalcularCostoMaximoProducto();
}

function renderProdHistorial() {
  var body = document.getElementById("prod-historial-body");
  if (!body) return;
  var cod = ($("prod-cod").value || "").trim();
  var p = DB.productos.find(function(x) { return x.codigo === cod; });
  var hist = (p && p.historial) || [];
  body.innerHTML = hist.length
    ? hist.map(function(h) { return '<tr><td>' + _esc(h.fecha || "") + '</td><td>' + _esc(h.usuario || "") + '</td><td>' + _esc(h.operacion || "") + '</td><td>' + _esc(h.detalle || "") + '</td></tr>'; }).join("")
    : '<tr><td colspan="4" style="text-align:center;color:#888">Sin historial</td></tr>';
}

// ============================================================================
// GENERADOR DE CÓDIGO DE BARRAS SVG (CODE 128-B)
// ============================================================================
function generarSVGCode128(text, options) {
  options = options || {};
  var width = options.width || 2;
  var height = options.height || 45;
  var quiet = 10;
  var code128B = {
    ' ': '11011001100', '!': '11001101100', '"': '11001100110', '#': '10010011000', '$': '10010001100',
    '%': '10001001100', '&': '10011001000', '\'': '10011000100', '(': '10001100100', ')': '11001001000',
    '*': '11001000100', '+': '11000100100', ',': '10110011000', '-': '10110001100', '.': '10011011000',
    '/': '10011000110', '0': '10001101100', '1': '10001100110', '2': '11001011000', '3': '11001000110',
    '4': '11000101100', '5': '11000100110', '6': '10110110000', '7': '10110000110', '8': '10011010000',
    '9': '10011000010', ':': '10000110110', ';': '10000110011', '<': '10110010000', '=': '10110001000',
    '>': '10001101000', '?': '10001100010', '@': '10110000100', 'A': '10001100010', 'B': '11010010000',
    'C': '11010001000', 'D': '11010000100', 'E': '11001010000', 'F': '11001000100', 'G': '11000101000',
    'H': '11000100100', 'I': '10110100000', 'J': '10110001000', 'K': '10001101000', 'L': '10001100100',
    'M': '10000110100', 'N': '10000110010', 'O': '11000010100', 'P': '11000010010', 'Q': '11000001010',
    'R': '10100011000', 'S': '10100001100', 'T': '10010001100', 'U': '10001001100', 'V': '10000101100',
    'W': '10000100110', 'X': '10110001000', 'Y': '10110000100', 'Z': '10010001100', '[': '10010000110',
    '\\': '10000100110', ']': '10110010000', '^': '10110001000', '_': '10110000100', 'a': '10001101000',
    'b': '10001100100', 'c': '10000110100', 'd': '10000110010', 'e': '11000010100', 'f': '11000010010',
    'g': '11000001010', 'h': '10100011000', 'i': '10100001100', 'j': '10010001100', 'k': '10001001100',
    'l': '10000101100', 'm': '10000100110', 'n': '10110001000', 'o': '10110000100', 'p': '10010001100',
    'q': '10010000110', 'r': '10000100110', 's': '10110010000', 't': '10110001000', 'u': '10001101000',
    'v': '10001100100', 'w': '10000110100', 'x': '10000110010', 'y': '11000010100', 'z': '11000010010',
    '{': '11000001010', '|': '10100011000', '}': '10100001100', '~': '10010001100'
  };

  var s = String(text || "000000").trim();
  if (!s) s = "000000";
  var patterns = ['11010010000'];
  var checkSum = 104;
  for (var i = 0; i < s.length; i++) {
    var char = s[i];
    var pat = code128B[char] || code128B['?'];
    patterns.push(pat);
    var val = char.charCodeAt(0) - 32;
    if (val < 0 || val > 95) val = 31;
    checkSum += val * (i + 1);
  }
  var checkVal = checkSum % 103;
  var checkChar = String.fromCharCode(checkVal + 32);
  patterns.push(code128B[checkChar] || '11000111010');
  patterns.push('1100011101011');

  var bits = patterns.join('');
  var totalWidth = bits.length * width + (quiet * 2);
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + totalWidth + ' ' + (height + 18) + '" width="100%" height="100%">';
  svg += '<rect width="100%" height="100%" fill="#ffffff"/>';
  var x = quiet;
  for (var j = 0; j < bits.length; j++) {
    if (bits[j] === '1') {
      svg += '<rect x="' + x + '" y="2" width="' + width + '" height="' + height + '" fill="#000000"/>';
    }
    x += width;
  }
  svg += '<text x="' + (totalWidth / 2) + '" y="' + (height + 14) + '" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold" fill="#000">' + _escHtml(s) + '</text>';
  svg += '</svg>';
  return svg;
}

// ============================================================================
// HABLADOR DE PRODUCTO & COLA DE IMPRESIÓN MASIVA
// ============================================================================
function actualizarBadgeEtiquetas() {
  var badge = document.getElementById("badge-cola-etiquetas");
  var totalCount = (DB.colaEtiquetas || []).reduce(function(acc, item) { return acc + (item.reproducciones || 1); }, 0);
  if (badge) badge.textContent = totalCount;
  var modalCount = document.getElementById("total-etiquetas-masivas-count");
  if (modalCount) modalCount.textContent = totalCount;
}

function renderHabladorPreview() {
  var box = document.getElementById("hablador-preview-box");
  if (!box) return;

  var empresa = (DB.parametros && DB.parametros.nombreEmpresa) || "FERRETERÍA Y REPUESTOS";
  var cod = (document.getElementById("prod-cod") ? document.getElementById("prod-cod").value : "").trim() || "000001";
  var sku = (document.getElementById("prod-sku") ? document.getElementById("prod-sku").value : "").trim();
  var desc = (document.getElementById("prod-desc") ? document.getElementById("prod-desc").value : "").trim() || "DESCRIPCIÓN DE PRODUCTO";
  var barra = (document.getElementById("prod-barra") ? document.getElementById("prod-barra").value : "").trim() || sku || cod;

  var precioUSD = num(document.getElementById("prod-precio-usd") ? document.getElementById("prod-precio-usd").value : 0);
  var precioBs = num(document.getElementById("prod-precio-bs") ? document.getElementById("prod-precio-bs").value : 0);
  if (precioBs === 0 && precioUSD > 0) precioBs = precioUSD * (getTasa() || 1);

  var svgBarcode = generarSVGCode128(barra, { width: 1.8, height: 40 });

  box.innerHTML =
    '<div style="font-size:10px;font-weight:bold;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">' + _esc(empresa) + '</div>' +
    '<div style="font-size:13px;font-weight:bold;color:#111;margin-bottom:8px;line-height:1.2;min-height:34px;display:flex;align-items:center;justify-content:center">' + _esc(desc) + '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;background:#f0f4f8;padding:6px 10px;border-radius:4px;margin-bottom:8px">' +
      '<div style="text-align:left"><span style="font-size:9px;color:#666">CÓDIGO / SKU:</span><br><b style="font-size:12px;color:#0B3D91">' + _esc(sku || cod) + '</b></div>' +
      '<div style="text-align:right"><span style="font-size:11px;color:#333;font-weight:bold">$ ' + fmtVE(precioUSD, 2) + '</span><br><span style="font-size:15px;font-weight:900;color:#0B3D91">Bs. ' + fmtVE(precioBs, 2) + '</span></div>' +
    '</div>' +
    '<div style="height:55px;display:flex;justify-content:center;align-items:center">' + svgBarcode + '</div>';
}

function imprimirEtiquetaDirecta() {
  var cant = Math.max(1, parseInt(document.getElementById("prod-etiq-cant").value, 10) || 1);
  var cod = (document.getElementById("prod-cod").value || "").trim();
  var desc = (document.getElementById("prod-desc").value || "").trim();
  var sku = (document.getElementById("prod-sku").value || "").trim();
  var barra = (document.getElementById("prod-barra").value || "").trim() || sku || cod;
  var precioUSD = num(document.getElementById("prod-precio-usd").value);
  var precioBs = num(document.getElementById("prod-precio-bs").value);
  if (precioBs === 0 && precioUSD > 0) precioBs = precioUSD * (getTasa() || 1);

  imprimirPlantillaEtiquetas([{
    codigo: cod, sku: sku, descripcion: desc, barra: barra, precioUSD: precioUSD, precioBs: precioBs, reproducciones: cant
  }]);
}

function agregarProductoAColaEtiquetas() {
  var cant = Math.max(1, parseInt(document.getElementById("prod-etiq-cant").value, 10) || 1);
  var cod = (document.getElementById("prod-cod").value || "").trim();
  var desc = (document.getElementById("prod-desc").value || "").trim();
  if (!cod || !desc) {
    alert("Cargue o ingrese los datos del producto antes de agregarlo a la cola de etiquetas.");
    return;
  }
  var sku = (document.getElementById("prod-sku").value || "").trim();
  var barra = (document.getElementById("prod-barra").value || "").trim() || sku || cod;
  var precioUSD = num(document.getElementById("prod-precio-usd").value);
  var precioBs = num(document.getElementById("prod-precio-bs").value);
  if (precioBs === 0 && precioUSD > 0) precioBs = precioUSD * (getTasa() || 1);

  if (!DB.colaEtiquetas) DB.colaEtiquetas = [];
  var idx = DB.colaEtiquetas.findIndex(function(x) { return x.codigo === cod; });
  if (idx >= 0) {
    DB.colaEtiquetas[idx].reproducciones += cant;
    DB.colaEtiquetas[idx].precioUSD = precioUSD;
    DB.colaEtiquetas[idx].precioBs = precioBs;
  } else {
    DB.colaEtiquetas.push({
      codigo: cod, sku: sku, descripcion: desc, barra: barra, precioUSD: precioUSD, precioBs: precioBs, reproducciones: cant
    });
  }
  saveDB();
  actualizarBadgeEtiquetas();
  alert("Se agregaron " + cant + " copia(s) de '" + desc + "' a la cola de impresión masiva.");
}

function abrirColaEtiquetasMasivas() {
  renderColaEtiquetas();
  if (typeof openModuleWindow === "function") openModuleWindow("etiquetas-masivas");
  else {
    var win = document.getElementById("etiquetas-masivas-window");
    if (win) win.classList.remove("hidden");
  }
}

function renderColaEtiquetas() {
  actualizarBadgeEtiquetas();
  var body = document.getElementById("cola-etiquetas-body");
  if (!body) return;
  var list = DB.colaEtiquetas || [];

  if (list.length === 0) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:16px">No hay etiquetas en cola de impresión. Agregue productos desde la pestaña "Etiqueta / Hablador".</td></tr>';
  } else {
    body.innerHTML = list.map(function(item, i) {
      return '<tr>' +
        '<td><b>' + _esc(item.sku || item.codigo) + '</b></td>' +
        '<td>' + _esc(item.descripcion) + '</td>' +
        '<td style="text-align:right">$ ' + fmtVE(item.precioUSD, 2) + '</td>' +
        '<td style="text-align:right">Bs. ' + fmtVE(item.precioBs, 2) + '</td>' +
        '<td style="text-align:center"><input type="number" min="1" max="999" class="input-small" value="' + item.reproducciones + '" onchange="cambiarReproduccionesEtiqueta(' + i + ', this.value)" style="text-align:center"></td>' +
        '<td style="text-align:center"><button type="button" class="btn-mini" onclick="quitarDeColaEtiquetas(' + i + ')">✕</button></td>' +
        '</tr>';
    }).join("");
  }
}

function cambiarReproduccionesEtiqueta(i, val) {
  var n = Math.max(1, parseInt(val, 10) || 1);
  if (DB.colaEtiquetas && DB.colaEtiquetas[i]) {
    DB.colaEtiquetas[i].reproducciones = n;
    saveDB();
    actualizarBadgeEtiquetas();
  }
}

function quitarDeColaEtiquetas(i) {
  if (DB.colaEtiquetas && DB.colaEtiquetas[i]) {
    DB.colaEtiquetas.splice(i, 1);
    saveDB();
    renderColaEtiquetas();
  }
}

function vaciarColaEtiquetas() {
  if (!DB.colaEtiquetas || DB.colaEtiquetas.length === 0) return;
  if (confirm("¿Vaciar todas las etiquetas marcadas en la cola?")) {
    DB.colaEtiquetas = [];
    saveDB();
    renderColaEtiquetas();
  }
}

function imprimirTodasLasEtiquetasMasivas() {
  var list = DB.colaEtiquetas || [];
  if (list.length === 0) {
    alert("La cola de etiquetas está vacía.");
    return;
  }
  imprimirPlantillaEtiquetas(list);
}

function imprimirPlantillaEtiquetas(items) {
  var empresa = (DB.parametros && DB.parametros.nombreEmpresa) || "FERRETERÍA Y REPUESTOS";
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Impresión de Etiquetas</title><style>' +
    '@page { size: auto; margin: 5mm; }' +
    'body { font-family: Arial, sans-serif; margin: 0; padding: 10px; background: #fff; }' +
    '.label-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }' +
    '.label-card { border: 1px dashed #333; padding: 8px; border-radius: 4px; text-align: center; page-break-inside: avoid; background: #fff; font-size: 11px; }' +
    '.label-company { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #444; }' +
    '.label-desc { font-size: 11px; font-weight: bold; margin: 4px 0; line-height: 1.2; height: 28px; overflow: hidden; }' +
    '.label-prices { display: flex; justify-content: space-between; align-items: baseline; background: #f0f0f0; padding: 3px 6px; margin: 4px 0; font-weight: bold; }' +
    '.label-bs { font-size: 13px; color: #000; }' +
    '.label-barcode { margin-top: 4px; height: 45px; }' +
    '</style></head><body><div class="label-grid">';

  items.forEach(function(item) {
    var svg = generarSVGCode128(item.barra || item.sku || item.codigo, { width: 1.5, height: 35 });
    for (var k = 0; k < (item.reproducciones || 1); k++) {
      html += '<div class="label-card">' +
        '<div class="label-company">' + _escHtml(empresa) + '</div>' +
        '<div class="label-desc">' + _escHtml(item.descripcion) + '</div>' +
        '<div class="label-prices">' +
          '<span>COD: ' + _escHtml(item.sku || item.codigo) + '</span>' +
          '<span>$ ' + fmtVE(item.precioUSD, 2) + ' | <span class="label-bs">Bs. ' + fmtVE(item.precioBs, 2) + '</span></span>' +
        '</div>' +
        '<div class="label-barcode">' + svg + '</div>' +
        '</div>';
    }
  });

  html += '</div><script>window.onload = function() { window.print(); };</script></body></html>';

  var w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

document.addEventListener("DOMContentLoaded", function() {
  ["prod-desc", "prod-sku", "prod-barra", "prod-precio-usd", "prod-precio-bs"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", function() {
        if (typeof renderHabladorPreview === "function") renderHabladorPreview();
      });
    }
  });
});

