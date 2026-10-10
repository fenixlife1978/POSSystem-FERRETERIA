// ============================================================================
// CATÁLOGO MAESTRO: Búsqueda difusa de productos.
// Soporta múltiples catálogos (ferretería, repuestos/aceites/lubricantes).
// Carga diferida del JSON y búsqueda difusa en cliente.
// ============================================================================
function createCatalogInstance(catalogUrl, label) {
  let _items = null;
  let _promise = null;
  let _cache = null;

  function norm(t) {
    return String(t == null ? "" : t)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function load() {
    if (_items) return Promise.resolve(_items);
    if (_promise) return _promise;
    _promise = fetch(catalogUrl)
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(arr => {
        if (!Array.isArray(arr)) throw new Error("Formato inválido");
        _items = arr;
        _cache = {};
        _items.forEach(item => { _cache[item.id_maestro] = item; });
        return _items;
      })
      .catch(err => {
        console.warn("[Catálogo " + (label||"") + "] No se pudo cargar:", err);
        _items = [];
        _cache = {};
        return _items;
      });
    return _promise;
  }

  function getAll() { return load(); }

  function getById(id) {
    if (_cache) return _cache[id] || null;
    return null;
  }

  function search(query, max) {
    max = Math.max(1, (max || 12));
    const q = norm(query);
    if (!q || q.length < 2) return Promise.resolve([]);

    return load().then(items => {
      const scored = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const score = computeScore(item, q);
        if (score > 0) scored.push({ item, score });
      }
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, max);
    });
  }

  function computeScore(item, q) {
    let score = 0;
    const qWords = q.split(/\s+/).filter(w => w.length > 0);
    if (qWords.length === 0) return 0;

    const nNombre = norm(item.nombre || "");
    const nMarca = norm(item.marca || "");
    const nCodigo = norm(item.codigo_fabricante || "");
    const nTags = (item.tags || []).map(t => norm(t));
    const nModelos = (item.modelos_compatibles || []).map(m => norm(m));

    if (nNombre === q) score += 100;
    else if (nCodigo === q) score += 90;

    if (nNombre.indexOf(q) >= 0) score += 10;
    if (nCodigo.indexOf(q) >= 0) score += 6;
    if (nMarca.indexOf(q) >= 0) score += 4;
    nTags.forEach(t => { if (t.indexOf(q) >= 0) score += 8; });
    nModelos.forEach(m => { if (m.indexOf(q) >= 0) score += 2; });

    qWords.forEach(w => {
      if (w.length < 2) return;
      if (nNombre.indexOf(w) >= 0) {
        score += 10;
        if (nNombre === w || nNombre.indexOf(" " + w + " ") >= 0 || nNombre.startsWith(w + " ") || nNombre.endsWith(" " + w)) score += 40;
      }
      if (nMarca.indexOf(w) >= 0) {
        score += 6;
        if (nMarca === w || nMarca.indexOf(" " + w + " ") >= 0 || nMarca.startsWith(w + " ") || nMarca.endsWith(" " + w)) score += 34;
      }
      if (nCodigo.indexOf(w) >= 0) score += 5;
      nTags.forEach(t => {
        if (t.indexOf(w) >= 0) {
          score += 5;
          if (t === w || t.indexOf(" " + w + " ") >= 0 || t.startsWith(w + " ") || t.endsWith(" " + w)) score += 25;
        }
      });
      nModelos.forEach(m => {
        if (m.indexOf(w) >= 0) {
          score += 3;
          if (m === w || m.indexOf(" " + w + " ") >= 0 || m.startsWith(w + " ") || m.endsWith(" " + w)) score += 17;
        }
      });
    });

    let wordsMatched = 0;
    qWords.forEach(w => {
      if (nNombre.indexOf(w) >= 0 || nCodigo.indexOf(w) >= 0 ||
          nTags.some(t => t.indexOf(w) >= 0) || nModelos.some(m => m.indexOf(w) >= 0)) {
        wordsMatched++;
      }
    });
    if (wordsMatched > 0 && qWords.length > 0) score += (wordsMatched / qWords.length) * 20;

    return Math.round(score);
  }

  // UI: Crea barra de búsqueda + dropdown en un container
  function createSearchUI(containerId, onSelect) {
    const _onSelect = onSelect || null;
    const container = document.getElementById(containerId);
    if (!container) return;

    const uid = containerId + "-cat";
    const inputId = uid + "-input";
    const spinnerId = uid + "-spinner";
    const dropdownId = uid + "-dropdown";

    const searchBar = document.createElement("div");
    searchBar.className = "catalogo-search-bar";
    searchBar.innerHTML =
      '<div class="catalogo-search-header">' +
        '<span class="catalogo-search-icon">' + (label ? '📦' : '🔧') + '</span>' +
        '<span class="catalogo-search-label">Buscar en Catálogo Maestro de ' + escHtml(label || 'Herramientas y Ferretería') + ':</span>' +
      '</div>' +
      '<div class="catalogo-search-input-wrap">' +
        '<input type="text" id="' + inputId + '" class="catalogo-search-input"' +
          ' placeholder="Escriba nombre, marca, código o modelo... (mín. 2 caracteres)" autocomplete="off">' +
        '<div class="catalogo-search-spinner" id="' + spinnerId + '" style="display:none"></div>' +
      '</div>' +
      '<div class="catalogo-dropdown" id="' + dropdownId + '" style="display:none"></div>';

    container.insertBefore(searchBar, container.firstChild);

    const inputEl = document.getElementById(inputId);
    const dropdownEl = document.getElementById(dropdownId);
    let searchTimer = null;

    inputEl.addEventListener("input", () => {
      clearTimeout(searchTimer);
      const q = inputEl.value.trim();
      if (q.length < 2) { hide(); return; }
      searchTimer = setTimeout(() => doSearch(q), 250);
    });

    inputEl.addEventListener("keydown", (e) => {
      const items = dropdownEl.querySelectorAll(".catalogo-item");
      if (!items.length) return;
      let idx = Array.from(items).findIndex(el => el.classList.contains("catalogo-item-hover"));
      if (idx < 0) idx = -1;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        idx = (idx + 1) % items.length;
        items.forEach(el => el.classList.remove("catalogo-item-hover"));
        items[idx].classList.add("catalogo-item-hover");
        items[idx].scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        idx = (idx - 1 + items.length) % items.length;
        items.forEach(el => el.classList.remove("catalogo-item-hover"));
        items[idx].classList.add("catalogo-item-hover");
        items[idx].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hovered = dropdownEl.querySelector(".catalogo-item-hover");
        if (hovered) {
          const item = getById(hovered.dataset.id);
          if (item) selectItem(item);
        }
      } else if (e.key === "Escape") {
        hide();
      }
    });

    document.addEventListener("click", (e) => {
      if (searchBar && !searchBar.contains(e.target)) hide();
    });

    function doSearch(q) {
      const sp = document.getElementById(spinnerId);
      if (sp) sp.style.display = "inline-block";
      search(q).then(results => {
        if (sp) sp.style.display = "none";
        renderResults(results);
      }).catch(() => {
        if (sp) sp.style.display = "none";
        renderResults([]);
      });
    }

    function renderResults(results) {
      dropdownEl.innerHTML = "";
      if (!results || results.length === 0) {
        dropdownEl.innerHTML = '<div class="catalogo-empty">Sin resultados en el catálogo.</div>';
        dropdownEl.style.display = "block";
        return;
      }
      results.forEach((r, i) => {
        const item = r.item;
        const div = document.createElement("div");
        div.className = "catalogo-item" + (i === 0 ? " catalogo-item-hover" : "");
        div.dataset.id = item.id_maestro;
        const modelos = (item.modelos_compatibles || []).slice(0, 3).join(", ");
        const extra = (item.modelos_compatibles || []).length > 3 ? " (+" + (item.modelos_compatibles.length - 3) + " más)" : "";
        div.innerHTML =
          '<div class="catalogo-item-nombre">' + escHtml(item.nombre) + '</div>' +
          '<div class="catalogo-item-meta">' +
            '<span class="catalogo-item-marca">' + escHtml(item.marca) + '</span>' +
            '<span class="catalogo-item-codigo">' + escHtml(item.codigo_fabricante || "") + '</span>' +
            '<span class="catalogo-item-categoria">' + escHtml(item.categoria) + '</span>' +
          '</div>' +
          '<div class="catalogo-item-modelos">' + escHtml(modelos) + extra + '</div>';
        div.addEventListener("click", () => {
          const item = getById(div.dataset.id);
          if (item) selectItem(item);
        });
        div.addEventListener("mouseenter", () => {
          dropdownEl.querySelectorAll(".catalogo-item").forEach(el => el.classList.remove("catalogo-item-hover"));
          div.classList.add("catalogo-item-hover");
        });
        dropdownEl.appendChild(div);
      });
      dropdownEl.style.display = "block";
    }

    function selectItem(item) {
      hide();
      if (inputEl) inputEl.value = item.nombre + " (" + item.marca + " " + item.codigo_fabricante + ")";
      if (typeof _onSelect === "function") _onSelect(item);
    }

    function hide() { if (dropdownEl) dropdownEl.style.display = "none"; }

    load().catch(() => {});
  }

  function escHtml(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  return { load, getAll, getById, search, createSearchUI };
}

const Catalogo = createCatalogInstance("assets/catalogo_herramientas.json", "Herramientas y Ferretería");
const CatalogoRepuestos = createCatalogInstance("assets/catalogo_repuestos.json", "Repuestos, Aceites y Lubricantes");
