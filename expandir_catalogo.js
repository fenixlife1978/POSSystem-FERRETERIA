/**
 * Generador de Catálogo Maestro de Repuestos Automotrices
 *
 * Amplía el catálogo semilla (catalogo_maestro.json) generando
 * combinatorias de marcas × categorías × productos para alcanzar
 * 25,000+ entradas con enfoque en mercado venezolano.
 *
 * Uso:
 *   node expandir_catalogo.js
 *
 * Requisitos: Node.js 14+ (ya incluido en el proyecto Electron).
 * El script carga el json semilla, genera variantes y escribe
 * el archivo final en pos/assets/catalogo_maestro.json.
 */
const fs = require("fs");
const path = require("path");

const SEED = path.join(__dirname, "pos", "assets", "catalogo_maestro.json");
const OUTPUT = path.join(__dirname, "pos", "assets", "catalogo_maestro.json");
const TARGET = 25000;

// ===== TEMPLATES GENERATIVOS =====
// Cada template define una categoría, lista de marcas, sufijos de
// nombres, y rangos de códigos para generar productos.
const TEMPLATES = [
  // ── FILTROS ──
  {
    categoria: "Filtros",
    subcategorias: ["Filtro de Aceite", "Filtro de Aire", "Filtro de Combustible", "Filtro de Cabina", "Filtro de Transmisión"],
    prefijos: ["REF-FIL-"],
    marcas: ["Fram", "Wega", "Mac", "Purolator", "Bosch", "Acdelco", "Mann"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} #${String(n).padStart(4, "0")} ${marca}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}${String(n).padStart(5, "0")}`
    }),
    tags: ["filtro", "aceite", "aire", "combustible", "cabina"]
  },
  // ── LUBRICANTES ──
  {
    categoria: "Lubricantes",
    subcategorias: [
      "Aceite de Motor 20W50", "Aceite de Motor 10W30", "Aceite de Motor 15W40",
      "Aceite de Motor 5W30", "Aceite de Motor 5W40", "Aceite de Transmisión ATF",
      "Aceite de Diferencial 80W90", "Aceite de Diferencial 85W140",
      "Líquido de Dirección Hidráulica", "Líquido de Transmisión CVT",
      "Refrigerante/Anticongelante", "Lubricante Multigrado",
      "Aceite a Granel 20W50", "Aceite a Granel 10W30", "Aceite a Granel 15W40",
      "Aceite a Granel 5W30", "Aceite a Granel 5W40", "Aceite a Granel ATF",
      "Aceite a Granel 80W90", "Aceite a Granel Refrigerante"
    ],
    prefijos: ["REF-LUB-"],
    marcas: ["Mobil", "Shell", "Mac", "Castrol", "Valvoline", "Total", "Pennzoil",
      "INCA", "PDV", "Petrolera Venca", "Lubricantes Andinos", "LubriCar", "Aceites Lara",
      "Petrolera del Caribe", "LubriVenezuela", "INCA Premium", "PDV Max", "INCA Diesel"],
    nombres: (sub, marca, n) => {
      const esGranel = sub.includes("Granel");
      const presentacion = esGranel ? "200L (Tambor)" : (n % 3 === 0 ? "1L" : "4L");
      const codigoBase = sub.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
      return {
        nombre: `${sub} ${marca} ${presentacion}`,
        codigo: `${marca.slice(0, 4).toUpperCase()}-${codigoBase}-${String(n).padStart(4, "0")}`
      };
    },
    tags: ["aceite", "lubricante", "motor", "transmision", "atf", "diferencial", "granel", "venezuela"]
  },
  // ── BATERÍAS ──
  {
    categoria: "Baterías",
    subcategorias: ["Batería 12V 55Ah", "Batería 12V 65Ah", "Batería 12V 75Ah", "Batería 12V 85Ah", "Batería 12V 100Ah"],
    prefijos: ["REF-BAT-"],
    marcas: ["Mac", "Acdelco", "Bosch", "Varta", "Exide", "Moura", "Heliar"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} L${(n % 6) + 2}`,
      codigo: `BAT-${String(n).padStart(4, "0")}-${marca.slice(0, 3).toUpperCase()}`
    }),
    tags: ["bateria", "12v", "automotriz", "arranque"]
  },
  // ── BUJÍAS ──
  {
    categoria: "Bujías",
    subcategorias: ["Bujía Estándar", "Bujía de Iridio", "Bujía de Platino", "Bujía de Cobre"],
    prefijos: ["REF-BUJ-"],
    marcas: ["NGK", "Denso", "Bosch", "Champion", "AC Delco"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${["BKR6E", "BKR5E", "BPR6ES", "ZFR6F", "FR8DC"][n % 5]}-${11 + (n % 5)}`,
      codigo: `${["BKR6E", "BKR5E", "BPR6ES", "ZFR6F", "FR8DC"][n % 5]}-${11 + (n % 5)}`
    }),
    tags: ["bujia", "encendido", "iridio", "platino"]
  },
  // ── FRENOS ──
  {
    categoria: "Frenos",
    subcategorias: ["Pastilla de Freno Delantero", "Pastilla de Freno Trasero", "Disco de Freno Delantero", "Disco de Freno Trasero", "Líquido de Freno DOT 3", "Líquido de Freno DOT 4", "Tambor de Freno", "Kit de Zapatas"],
    prefijos: ["REF-FRN-"],
    marcas: ["Brembo", "Ferodo", "Bosch", "Acdelco", "TRW", "EBC", "ABS"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${["P", "D", "T", "Z"][n % 4]}${String(68000 + n).slice(0, 5)}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}-${["P", "D", "T", "Z"][n % 4]}${String(68000 + n).slice(0, 5)}`
    }),
    tags: ["pastilla", "freno", "disco", "liquido", "dot3", "dot4", "tambor"]
  },
  // ── CORREAS ──
  {
    categoria: "Correas",
    subcategorias: ["Correa de Distribución", "Correa de Alternador", "Correa de Accesorios", "Kit de Distribución", "Tensor de Correa"],
    prefijos: ["REF-COR-"],
    marcas: ["Gates", "Bosch", "Dayco", "Goodyear", "Contitech", "Bando"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${["T", "K", "6PK", "5PK"][n % 4]}${String(3000 + n)}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}-${["T", "K", "6PK", "5PK"][n % 4]}${String(3000 + n)}`
    }),
    tags: ["correa", "distribucion", "alternador", "tensor", "kit"]
  },
  // ── SENSORES ──
  {
    categoria: "Sensores",
    subcategorias: ["Sensor de Oxígeno", "Sensor CKP", "Sensor CMP", "Sensor MAP", "Sensor de Temperatura", "Sensor de Velocidad (VSS)", "Sensor IAT", "Sensor TPS", "Sensor ABS"],
    prefijos: ["REF-SNS-"],
    marcas: ["Bosch", "Acdelco", "Denso", "Delphi", "Vemo", "Siemens"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} 0${String(26000000 + n * 100).slice(0, 9)}`,
      codigo: `0${String(26000000 + n * 100).slice(0, 9)}`
    }),
    tags: ["sensor", "oxigeno", "ckp", "map", "temperatura", "velocidad"]
  },
  // ── ELÉCTRICO ──
  {
    categoria: "Eléctrico",
    subcategorias: ["Alternador", "Motor de Arranque", "Bobina de Encendido", "Cable de Bujía", "Lámpara H4", "Lámpara H7", "Lámpara LED", "Fusible ATC", "Fusible Maxi", "Relé", "Interruptor de Encendido"],
    prefijos: ["REF-ELC-"],
    marcas: ["Bosch", "Denso", "Valeo", "Acdelco", "Hella", "Osram", "Philips", "Bussmann", "Littlefuse"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${String(98000000 + n * 100).slice(0, 10)}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}-EL${String(n).padStart(4, "0")}`
    }),
    tags: ["alternador", "arranque", "bobina", "lampara", "fusible", "rele", "electrico"]
  },
  // ── SUSPENSIÓN ──
  {
    categoria: "Suspensión",
    subcategorias: ["Amortiguador Delantero", "Amortiguador Trasero", "Rótula Inferior", "Rótula Superior", "Barra Estabilizadora", "Buje de Suspensión", "Brazo de Control", "Muelle Helicoidal"],
    prefijos: ["REF-SUS-"],
    marcas: ["Monroe", "Nakata", "KYB", "Bosch", "Gabriel", "Moog", "TRW"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${String(1000 + n * 10)}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}-${["A", "B", "E"][n % 3]}${String(1000 + n * 10)}`
    }),
    tags: ["amortiguador", "suspension", "rotula", "estabilizadora", "brazo"]
  },
  // ── MOTOR ──
  {
    categoria: "Motor",
    subcategorias: ["Bomba de Agua", "Bomba de Combustible", "Bomba de Aceite", "Radiador de Aluminio", "Termostato", "Válvula PCV", "Tapa de Radiador", "Manguera de Radiador", "Compresor A/A", "Ventilador Eléctrico"],
    prefijos: ["REF-MOT-"],
    marcas: ["Acdelco", "Bosch", "Denso", "Gates", "Dorman", "Mitsubishi", "Valeo"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${String(2000 + n * 10)}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}-M${String(n).padStart(4, "0")}`
    }),
    tags: ["bomba", "agua", "combustible", "radiador", "termostato", "pcv", "motor"]
  },
  // ── TRANSMISIÓN ──
  {
    categoria: "Transmisión",
    subcategorias: ["Kit de Embrague Completo", "Disco de Embrague", "Plato de Presión", "Collín de Embrague", "Soporte de Motor", "Soporte de Transmisión", "Filtro de Transmisión"],
    prefijos: ["REF-TRN-"],
    marcas: ["Nakata", "Sachs", "Valeo", "Luk", "Acdelco", "Bosch"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${String(3000 + n * 10)}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}-T${String(n).padStart(4, "0")}`
    }),
    tags: ["embrague", "clutch", "disco", "presion", "transmision"]
  },
  // ── LLANTAS ──
  {
    categoria: "Llantas",
    subcategorias: ["Neumático 175/65R14", "Neumático 185/65R15", "Neumático 195/65R15", "Neumático 205/55R16", "Neumático 205/65R16", "Neumático 215/55R17", "Neumático 225/65R17", "Neumático 265/70R17", "Neumático 235/75R15"],
    prefijos: ["REF-LLN-"],
    marcas: ["Firestone", "Michelin", "Goodyear", "Bridgestone", "Pirelli", "Continental", "Dunlop", "General Tire"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} Serie ${["H", "T", "AT"][n % 3]}`,
      codigo: `${sub.replace(/[^0-9]/g, "")}-${marca.slice(0, 3).toUpperCase()}-${n % 100}`
    }),
    tags: ["neumatico", "llanta", "caucho", "radial"]
  },
  // ── ACCESORIOS ──
  {
    categoria: "Accesorios",
    subcategorias: ["Limpiaparabrisas", "Espejo Retrovisor", "Escobilla", "Tapa de Combustible", "Forro de Volante", "Alfombra", "Señalizador", "Cable de Batería"],
    prefijos: ["REF-ACC-"],
    marcas: ["Bosch", "Acdelco", "Dorman", "3M", "Mann", "Duralast"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${String(4000 + n * 10)}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}-ACC${String(n).padStart(4, "0")}`
    }),
    tags: ["limpiaparabrisas", "accesorio", "espejo", "escobilla"]
  }
];

// ===== TEMPLATES ESPECÍFICOS VENEZOLANOS =====
const TEMPLATES_VE = [
  // ── FILTROS VENEZOLANOS ──
  {
    categoria: "Filtros",
    subcategorias: ["Filtro de Aceite", "Filtro de Aire", "Filtro de Combustible", "Filtro de Cabina", "Filtro de Transmisión"],
    prefijos: ["REF-FIL-VE-"],
    marcas: ["Filtros Andinos", "Filtros Venezolanos", "Filtros Caracas", "Filtros Lara", "Filtros Carabobo", "Filtros Valencia", "Filtros Maracay", "Filtros Barquisimeto", "Filtros Maturin", "Filtros Puerto La Cruz"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${String(1000 + n * 10)}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}-${sub.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase()}-${String(n).padStart(4, "0")}`
    }),
    tags: ["filtro", "aceite", "aire", "combustible", "cabina", "venezuela", "nacional"]
  },
  // ── ACEITES VENEZOLANOS ESPECIALES ──
  {
    categoria: "Lubricantes",
    subcategorias: [
      "Aceite de Motor 20W50 Mineral", "Aceite de Motor 15W40 Semisintético", "Aceite de Motor 10W30 Sintético",
      "Aceite Diésel 15W40", "Aceite Diésel 20W50", "Aceite Hidráulico ISO 32", "Aceite Hidráulico ISO 46",
      "Aceite para Compresor", "Aceite para Caja de Cambios", "Grasa Litio EP2", "Grasa Multiusos",
      "Aceite a Granel 20W50 (Tambor 200L)", "Aceite a Granel 15W40 (Tambor 200L)", "Aceite a Granel ATF (Tambor 200L)",
      "Refrigerante Concentrado", "Refrigerante Listo para Usar", "Aditivo para Radiador"
    ],
    prefijos: ["REF-LUB-VE-"],
    marcas: ["INCA", "PDV", "Petrolera Venca", "Lubricantes Andinos", "LubriCar", "Aceites Lara",
      "Petrolera del Caribe", "LubriVenezuela", "INCA Premium", "PDV Max", "INCA Diesel",
      "Petrolera Monagas", "Petrolera Anzoategui", "Lubricantes Zulia", "Aceites Falcón", "LubriMérida"],
    nombres: (sub, marca, n) => {
      const esGranel = sub.includes("Granel") || sub.includes("Tambor");
      const presentacion = esGranel ? "200L (Tambor)" : (n % 4 === 0 ? "1L" : n % 3 === 0 ? "4L" : "20L (Cuba)");
      const codigoBase = sub.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
      return {
        nombre: `${sub} ${marca} ${presentacion}`,
        codigo: `${marca.slice(0, 4).toUpperCase()}-${codigoBase}-${String(n).padStart(4, "0")}`
      };
    },
    tags: ["aceite", "lubricante", "motor", "transmision", "hidraulico", "granel", "venezuela", "nacional", "inca", "pdv"]
  },
  // ── FRENOS VENEZOLANOS ──
  {
    categoria: "Frenos",
    subcategorias: ["Pastilla de Freno Delantero", "Pastilla de Freno Trasero", "Disco de Freno Delantero", "Disco de Freno Trasero", "Líquido de Freno DOT 3", "Líquido de Freno DOT 4", "Kit de Reparación de Caliper", "Kit de Reparación de Cilindro Maestro"],
    prefijos: ["REF-FRN-VE-"],
    marcas: ["Frenos Venezolanos", "Frenos Caracas", "Frenos Andinos", "Frenos Lara", "Frenos Carabobo", "Frenos Valencia", "Frenos Nacional", "Frenos del Centro", "Frenos Occidente", "Frenos Oriente"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${String(2000 + n * 10)}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}-${["P", "D", "T", "K", "C"][n % 5]}${String(2000 + n * 10)}`
    }),
    tags: ["pastilla", "freno", "disco", "liquido", "dot3", "dot4", "venezuela", "nacional"]
  },
  // ── SUSPENSIÓN VENEZOLANA ──
  {
    categoria: "Suspensión",
    subcategorias: ["Amortiguador Delantero", "Amortiguador Trasero", "Rótula Inferior", "Rótula Superior", "Barra Estabilizadora", "Buje de Suspensión", "Brazo de Control", "Muelle Helicoidal", "Soporte de Amortiguador", "Cojinete de Rueda"],
    prefijos: ["REF-SUS-VE-"],
    marcas: ["Suspensión Venezolana", "Suspensión Caracas", "Suspensión Andina", "Suspensión Lara", "Suspensión Carabobo", "Suspensión Nacional", "Amortiguadores del Centro", "Amortiguadores del Llano", "Suspensión Zulia", "Suspensión Falcón"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${String(3000 + n * 10)}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}-${["A", "B", "E", "R", "C"][n % 5]}${String(3000 + n * 10)}`
    }),
    tags: ["amortiguador", "suspension", "rotula", "estabilizadora", "brazo", "venezuela", "nacional"]
  },
  // ── ELÉCTRICO VENEZOLANO ──
  {
    categoria: "Eléctrico",
    subcategorias: ["Alternador Reacondicionado", "Motor de Arranque Reacondicionado", "Bobina de Encendido Nacional", "Cable de Bujía Nacional", "Lámpara H4 Nacional", "Lámpara H7 Nacional", "Relé Nacional", "Interruptor de Encendido Nacional", "Sensor CKP Nacional", "Sensor MAP Nacional", "Regulador de Voltaje Nacional"],
    prefijos: ["REF-ELC-VE-"],
    marcas: ["Eléctricos Venezolanos", "Eléctricos Caracas", "Eléctricos Andinos", "Eléctricos Nacionales", "Repuestos Eléctricos Lara", "Repuestos Eléctricos Carabobo", "Eléctricos del Centro", "Eléctricos Zulia", "Eléctricos Falcón", "Eléctricos Mérida"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${String(4000 + n * 10)}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}-ELC${String(n).padStart(4, "0")}`
    }),
    tags: ["alternador", "arranque", "bobina", "lampara", "rele", "sensor", "venezuela", "nacional", "reacondicionado"]
  },
  // ── CORREAS VENEZOLANAS ──
  {
    categoria: "Correas",
    subcategorias: ["Correa de Distribución Nacional", "Correa de Alternador Nacional", "Correa de Accesorios Nacional", "Kit de Distribución Nacional", "Tensor de Correa Nacional"],
    prefijos: ["REF-COR-VE-"],
    marcas: ["Correas Venezolanas", "Correas Caracas", "Correas Andinas", "Correas Nacionales", "Correas del Centro", "Correas del Llano", "Correas Zulia", "Correas Falcón"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} ${["T", "K", "6PK", "5PK"][n % 4]}${String(4000 + n)}`,
      codigo: `${marca.slice(0, 3).toUpperCase()}-COR${String(n).padStart(4, "0")}`
    }),
    tags: ["correa", "distribucion", "alternador", "tensor", "kit", "venezuela", "nacional"]
  },
  // ── BATERÍAS VENEZOLANAS ──
  {
    categoria: "Baterías",
    subcategorias: ["Batería 12V 55Ah Nacional", "Batería 12V 65Ah Nacional", "Batería 12V 75Ah Nacional", "Batería 12V 85Ah Nacional", "Batería 12V 100Ah Nacional", "Batería 12V 120Ah Camión", "Batería 12V 150Ah Camión", "Batería 12V 200Ah Camión"],
    prefijos: ["REF-BAT-VE-"],
    marcas: ["Baterías Venezolanas", "Baterías Caracas", "Baterías Andinas", "Baterías Nacionales", "Baterías del Centro", "Baterías del Llano", "Baterías Zulia", "Baterías Falcón", "Baterías Lara", "Baterías Carabobo"],
    nombres: (sub, marca, n) => ({
      nombre: `${sub} ${marca} L${String(2 + (n % 6))}`,
      codigo: `BAT-VE-${marca.slice(0, 3).toUpperCase()}-${String(n).padStart(4, "0")}`
    }),
    tags: ["bateria", "12v", "automotriz", "camion", "venezuela", "nacional"]
  }
];

// Combinar templates
const ALL_TEMPLATES = [...TEMPLATES, ...TEMPLATES_VE];

// ===== GENERACIÓN =====
function generar() {
  let items = [];

  // Cargar semilla si existe
  try {
    const seed = JSON.parse(fs.readFileSync(SEED, "utf8"));
    if (Array.isArray(seed) && seed.length > 0) {
      items = seed;
      console.log(`✓ Cargados ${items.length} productos semilla`);
    }
  } catch (e) {
    console.log("Semilla no encontrada, generando desde cero...");
  }

  // Generar combinatorias hasta alcanzar el target
  let idCounter = items.length + 1;
  const modelosBase = [
    "Chevrolet Aveo 1.5", "Chevrolet Corsa 1.4", "Chevrolet Spark 1.0", "Chevrolet Optra 1.8", "Chevrolet Onix 1.4",
    "Chevrolet Silverado 5.3", "Chevrolet Cruze 1.8", "Chevrolet Malibu 2.4", "Chevrolet Tracker 1.8",
    "Toyota Corolla 1.8", "Toyota Camry 2.4", "Toyota Hilux 2.7", "Toyota Yaris 1.5", "Toyota RAV4 2.0",
    "Toyota Prado 4.0", "Toyota Fortuner 2.8",
    "Ford F-150 5.0", "Ford Explorer 4.0", "Ford Ranger 3.0", "Ford Focus 2.0", "Ford Fiesta 1.6",
    "Ford Escape 2.5", "Ford Fusion 2.5",
    "Nissan Sentra 1.8", "Nissan Versa 1.6", "Nissan March 1.6", "Nissan Frontier 2.5", "Nissan Altima 2.5",
    "Honda Civic 1.8", "Honda Accord 2.4", "Honda CR-V 2.0", "Honda Fit 1.5",
    "Mazda 3 2.0", "Mazda CX-5 2.0", "Mazda 6 2.5",
    "Hyundai Accent 1.6", "Hyundai i10 1.1", "Hyundai Tucson 2.0", "Hyundai Elantra 1.8",
    "Kia Picanto 1.0", "Kia Rio 1.6", "Kia Sportage 2.0", "Kia Sorento 2.4",
    "Mitsubishi Lancer 1.6", "Mitsubishi Montero 3.0", "Mitsubishi L200 2.5",
    "Jeep Cherokee 4.0", "Jeep Grand Cherokee 3.6", "Jeep Wrangler 3.6",
    "Dodge Ram 5.7", "Dodge Durango 3.6",
    "Suzuki Swift 1.3", "Suzuki Vitara 1.6",
    "Volkswagen Gol 1.6", "Volkswagen Jetta 2.5", "Volkswagen Amarok 2.0",
    "Fiat Siena 1.4", "Fiat Uno 1.3",
    "Peugeot 206 1.6", "Peugeot 307 2.0",
    "Renault Clio 1.2", "Renault Sandero 1.6", "Renault Duster 2.0",
    "Daewoo Lanos 1.5", "Daewoo Nubira 1.6",
    // Modelos venezolanos comunes
    "Chevrolet Century 2.5", "Chevrolet Monza 1.6", "Chevrolet Cavalier 2.2", "Chevrolet Astra 1.8",
    "Ford Fiesta 1.4", "Ford Laser 1.6", "Ford Fairmont 2.0", "Ford Ranger 2.5 Diésel",
    "Toyota Tercel 1.5", "Toyota Corolla 1.6", "Toyota Hilux 2.4 Diésel", "Toyota Land Cruiser 4.2",
    "Mitsubishi Montero 3.2", "Mitsubishi L200 2.5 Diésel", "Mitsubishi Galant 2.0",
    "Nissan Tsuru 1.6", "Nissan Pickup 2.4", "Nissan Frontier 2.4 Diésel",
    "Fiat Palio 1.3", "Fiat Siena 1.4", "Fiat Uno 1.0", "Fiat Duna 1.6",
    "Renault 9 1.4", "Renault 11 1.4", "Renault Clio 1.2", "Renault Symbol 1.6",
    "Peugeot 405 1.8", "Peugeot 306 1.6", "Peugeot 206 1.4",
    "Volkswagen Santana 1.8", "Volkswagen Gol 1.6", "Volkswagen Pointer 1.8",
    "Mack CH 12.0", "Mack Granite 13.0", "International 9800 14.0", "Freightliner Cascadia 15.0",
    "Kenworth T680 12.9", "Peterbilt 579 12.9", "Volvo VNL 13.0", "Western Star 4900 14.0"
  ];

  outer:
  while (items.length < TARGET) {
    for (const tmpl of ALL_TEMPLATES) {
      for (let s = 0; s < tmpl.subcategorias.length; s++) {
        const sub = tmpl.subcategorias[s];
        for (let m = 0; m < tmpl.marcas.length; m++) {
          const marca = tmpl.marcas[m];
          for (let n = 1; n <= 50; n++) { // hasta 50 variantes por (sub × marca)
            if (items.length >= TARGET) break outer;

            const gen = tmpl.nombres(sub, marca, n + s * 100 + m * 1000);
            const id = String(idCounter).padStart(6, "0");

            // Asignar 1-5 modelos aleatorios
            const numModelos = 1 + (n % 4);
            const shuff = [...modelosBase].sort(() => Math.random() - 0.5);
            const modelos = shuff.slice(0, numModelos);

            const tags = [
              ...tmpl.tags,
              ...marca.toLowerCase().split(" "),
              ...modelos.map(m => m.toLowerCase().split(" ")[1] || m.toLowerCase())
            ];

            items.push({
              id_maestro: `REF-${tmpl.prefijos[0].replace(/-/g, "")}${id}`,
              nombre: gen.nombre,
              marca: marca,
              codigo_fabricante: gen.codigo,
              categoria: tmpl.categoria,
              modelos_compatibles: modelos,
              tags: [...new Set(tags)]
            });
            idCounter++;
          }
        }
      }
    }
  }

  // Escribir archivo
  fs.writeFileSync(OUTPUT, JSON.stringify(items, null, 2), "utf8");
  console.log(`✓ Catálogo generado: ${items.length} productos en ${OUTPUT}`);
  console.log(`✓ Categorías incluidas: ${new Set(items.map(i => i.categoria)).size}`);
  console.log(`✓ Marcas incluidas: ${new Set(items.map(i => i.marca)).size}`);
  console.log(`  Para empaquetar en .exe, el archivo está en pos/assets/`);
}

generar();