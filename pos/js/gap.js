// ============================================================================
// MÓDULO DE AJUSTE DE BRECHA BCV vs USDT
// Permite proteger el margen de reposición frente a la brecha cambiaria
// entre la Tasa Oficial (BCV) y la Tasa de Reposición (USDT/Paralelo).
// ============================================================================

const Gap = (() => {
  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v === null || v === undefined || v === "") return 0;
    let s = String(v).trim().replace(/\s/g, "");
    if (s.includes(",") && s.includes(".")) {
      const lc = s.lastIndexOf(",");
      const ld = s.lastIndexOf(".");
      if (lc > ld) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (s.includes(",")) s = s.replace(",", ".");
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  const r2 = n => Math.round((num(n) + Number.EPSILON) * 100) / 100;

  // -------------------------------------------------------------------------
  // Cálculo del Ratio de Brecha
  // ratio = daily_usdt_rate / daily_bcv_rate
  // Si ratio <= 1, no hay brecha (no se ajusta)
  // -------------------------------------------------------------------------
  function getGapRatio() {
    const bcv = num(DB.parametros.daily_bcv_rate);
    const usdt = num(DB.parametros.daily_usdt_rate);
    if (bcv <= 0 || usdt <= 0) return 1;
    const ratio = usdt / bcv;
    return ratio <= 1 ? 1 : ratio;
  }

  // -------------------------------------------------------------------------
  // Verifica si el ajuste de brecha está habilitado
  // -------------------------------------------------------------------------
  function isEnabled() {
    return !!DB.parametros.enable_gap_adjustment && getGapRatio() > 1;
  }

  // -------------------------------------------------------------------------
  // Calcula el margen aplicado según la regla de brecha
  // Si exclude_from_gap == true O enable_gap_adjustment == false:
  //   M_aplicado = M_base
  // Si exclude_from_gap == false Y enable_gap_adjustment == true:
  //   Markup sobre Venta: M_aplicado = 1 - ((1 - M_base) / ratio)
  //   Markup sobre Costo: M_aplicado = (1 + M_base) * ratio - 1
  // -------------------------------------------------------------------------
  function getAdjustedMargin(baseMarginPct, excludeFromGap) {
    if (!isEnabled() || excludeFromGap) return baseMarginPct;

    const baseMargin = num(baseMarginPct) / 100;
    const ratio = getGapRatio();
    const method = getMarkupMethod();

    let adjustedMargin;
    if (method === "costo" || method === "brecha") {
      // Markup sobre Costo: M_adjusted = (1 + M_base) * ratio - 1
      adjustedMargin = (1 + baseMargin) * ratio - 1;
    } else {
      // Markup sobre Venta: M_aplicado = 1 - ((1 - M_base) / ratio)
      adjustedMargin = 1 - ((1 - baseMargin) / ratio);
    }

    // Limitar entre 0% y 99.99%
    const clamped = Math.max(0, Math.min(0.9999, adjustedMargin));
    return r2(clamped * 100);
  }

  // -------------------------------------------------------------------------
  // Calcula el precio USD aplicando el margen ajustado
  // Markup sobre Costo: Precio = Costo * (1 + M_aplicado)
  // Markup sobre Venta: Precio = Costo / (1 - M_aplicado)
  // -------------------------------------------------------------------------
  function calcAdjustedPriceUSD(costoUSD, baseMarginPct, excludeFromGap) {
    const adjustedMarginPct = getAdjustedMargin(baseMarginPct, excludeFromGap);
    const adjustedMargin = adjustedMarginPct / 100;
    const costo = num(costoUSD);
    if (costo <= 0) return 0;
    const method = getMarkupMethod();

    if (method === "costo" || method === "brecha") {
      // Markup sobre Costo: Precio = Costo * (1 + M_aplicado)
      return r2(costo * (1 + adjustedMargin));
    } else {
      // Markup sobre Venta: Precio = Costo / (1 - M_aplicado)
      const denominator = 1 - Math.min(adjustedMargin, 0.9999);
      return r2(denominator > 0 ? costo / denominator : 0);
    }
  }

  // -------------------------------------------------------------------------
  // Recalcula el precio VES usando la tasa BCV
  // Precio VES = Precio USD (BCV) * daily_bcv_rate
  // -------------------------------------------------------------------------
  function calcPriceVES(priceUSD) {
    const bcv = num(DB.parametros.daily_bcv_rate);
    if (bcv <= 0) bcv = num(DB.parametros.tasaBCV);
    return r2(num(priceUSD) * bcv);
  }

  // -------------------------------------------------------------------------
  // Recalcula el margen base a partir del precio USD y costo
  // M_base = ((Precio USD - Costo USD) / Precio USD) * 100
  // -------------------------------------------------------------------------
  function getBaseMarginFromPrice(costoUSD, precioUSD) {
    const costo = num(costoUSD);
    const precio = num(precioUSD);
    if (precio <= 0 || costo <= 0) return 0;
    return r2(((precio - costo) / precio) * 100);
  }

  // -------------------------------------------------------------------------
  // Recalculación masiva de precios con ajuste de brecha
  // Se llama cuando cambian las tasas diarias (BCV y USDT)
  // -------------------------------------------------------------------------
  function recalcularConGap() {
    if (!isEnabled()) {
      // Si no hay brecha o está deshabilitado, recalcular normal
      if (typeof recalcularPreciosPorTasa === "function") {
        recalcularPreciosPorTasa(getTasa());
      }
      return { ok: true, ajustados: 0, mensaje: "Ajuste de brecha deshabilitado o sin brecha" };
    }

    const ratio = getGapRatio();
    let ajustados = 0;

    // 1. Productos
    (DB.productos || []).forEach(p => {
      // Servicios se manejan por separado
      if (typeof esServicio === "function" && esServicio(p)) return;

      if (!p.exclude_from_gap) {
        const newPrecioUSD = calcAdjustedPriceUSD(p.costoUSD, p.margenPct, false);
        const newPrecioVES = calcPriceVES(newPrecioUSD);

        if (num(newPrecioUSD) > 0 && Math.abs(num(newPrecioUSD) - num(p.precioUSD)) > 0.005) {
          p.precioUSD = newPrecioUSD;
          p.precio = newPrecioVES;
          p.margenPct = getAdjustedMargin(p.margenPct, false);
          ajustados++;
        }
      }

      // Precios especiales (mayor, oferta, promo) - recalcular usando el mismo margen base
      const tiers = ["mayor", "oferta", "promo"];
      tiers.forEach(k => {
        const t = p.precios && p.precios[k];
        if (t && t.usd !== undefined && num(t.usd) > 0) {
          const baseTierMargin = num(t.margen);
          const adjustedTierMargin = getAdjustedMargin(baseTierMargin, false);
          const costoUSD = num(p.costoUSD);
          const newTierUSD = calcAdjustedPriceUSD(costoUSD, baseTierMargin, false);
          t.usd = newTierUSD;
          t.bs = calcPriceVES(newTierUSD);
          t.margen = adjustedTierMargin;
        }
      });
    });

    // 2. Servicios
    (DB.productos || []).filter(p => typeof esServicio === "function" && esServicio(p)).forEach(s => {
      if (!s.exclude_from_gap) {
        const newPrecioUSD = calcAdjustedPriceUSD(s.costoUSD, s.margenPct, false);
        const newPrecioVES = calcPriceVES(newPrecioUSD);

        if (num(newPrecioUSD) > 0 && Math.abs(num(newPrecioUSD) - num(s.precioUSD)) > 0.005) {
          s.precioUSD = newPrecioUSD;
          s.precio = newPrecioVES;
          s.margenPct = getAdjustedMargin(s.margenPct, false);
          ajustados++;
        }
      }
    });

    saveDB();
    return { ok: true, ajustados, ratio: r2(ratio), mensaje: `${ajustados} productos/servicios ajustados con ratio ${r2(ratio)}` };
  }

  // -------------------------------------------------------------------------
  // Obtener tasa BCV actual (para compatibilidad)
  // -------------------------------------------------------------------------
  function getTasa() {
    return num(DB.parametros.tasaBCV) || 1;
  }

  // -------------------------------------------------------------------------
  // Funciones de ayuda para UI
  // -------------------------------------------------------------------------
  function getConfig() {
    return {
      enabled: !!DB.parametros.enable_gap_adjustment,
      daily_bcv: num(DB.parametros.daily_bcv_rate),
      daily_usdt: num(DB.parametros.daily_usdt_rate),
      ratio: r2(getGapRatio()),
      isActive: isEnabled()
    };
  }

  function setConfig({ enabled, daily_bcv, daily_usdt }) {
    DB.parametros.enable_gap_adjustment = !!enabled;
    DB.parametros.daily_bcv_rate = num(daily_bcv);
    DB.parametros.daily_usdt_rate = num(daily_usdt);
    saveDB();
  }

  // -------------------------------------------------------------------------
  // API pública
  // -------------------------------------------------------------------------
  return {
    isEnabled,
    getGapRatio,
    getAdjustedMargin,
    calcAdjustedPriceUSD,
    calcPriceVES,
    getBaseMarginFromPrice,
    recalcularConGap,
    getConfig,
    setConfig,
    getTasa
  };
})();