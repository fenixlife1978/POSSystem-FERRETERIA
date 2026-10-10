const fs = require("fs");
const path = require("path");
const items = [];
let nextId = 1;

function add(nombre, marca, codigo, categoria, modelos_compatibles, tags) {
  items.push({ id_maestro: "REP-" + String(nextId++).padStart(5,"0"), nombre, marca, codigo_fabricante: codigo, categoria, modelos_compatibles: modelos_compatibles||[], tags: tags||[] });
}

// Marcas (32 internacionales + 28 nacionales)
const intMarcas = ["Shell","Mobil","Castrol","Total","Valvoline","Elf","Pennzoil","Chevron","Motul","Bardahl","Ravenol","Liqui Moly","Bosch","Repsol","YPF","Petronas","Gulf","Kendall","Quaker State","Lucas Oil","Royal Purple","Amsoil","Red Line","SynPower","Fuchs","NOCO","CRC","Prestone","STP","Motorcraft","Champion","Caltex"];
const nacMarcas = ["Aceites Venezolanos","AVE","Baraka","Formulating Petróleos","Formuladora","Lubricantes del Caribe","Petrobras Venezuela","PDVSA Lubricantes","Cuba C.A.","Lubri Venezuela","Aceites Zulia","Lubricantes Valencia","Petrocedeño","Sintra","Venoco","Lubricantes Maracaibo","Aceites Orinoco","Lubri Andina","Petroandina","Lubricantes Carabobo","Aceites Tachira","Lubri Oriental","PetroLara","Lubricantes Bolivar","Aceites Monagas","Lubri Sucre","PetroSucre","Lubricantes Falcon"];
const todasMarcas = [...intMarcas, ...nacMarcas];

// Líneas por marca
const lineasX = {
  Shell:["Helix","Helix Ultra","Helix HX7","Rimula","Tellus","Omala","Gadus","Donax","Advance"],
  Mobil:["Mobil 1","Mobil 1 ESP","Mobil Delvac","Mobil Delvac MX","Mobil DTE","Mobil Spirax"],
  Castrol:["GTX","GTX Magnatec","Edge","Edge Titanium","Power1","Transmax","Syntrans"],
  Total:["Quartz","Quartz 9000","Quartz INEO","Rubia","Tranself","Multi MEP","Ceran"],
  Valvoline:["MaxLife","SynPower","DuraBlend","Premium","High Mileage"],
  Elf:["Evolution 900","Evolution 700","Transa","Multi EP","Nemo"],
  Pennzoil:["Gold","Platinum","Long Life","High Mileage"],
  Chevron:["Havoline","Havoline PRO DS","Delo 400","Capella"],
  Motul:["8100","7100","300V","5100","H-Tech","Gear 300","Chain Lube"],
  Bardahl:["Synthetic","Full Protection","XTC","Trans Max","Stop Leak","Flush"],
  Ravenol:["TES","VMO","TWS","MPM","LSGS"],
  "Liqui Moly":["Top Tec","Synthoil","Special Tec","Moly Gen","Leichtlauf"],
  Bosch:["Motor Oil","ATF","Gear Oil","Brake Fluid","Coolant"],
  Repsol:["Elite","Racing","Synthetic","Eco","Universal"],
  YPF:["Ela","Sintetico","Mineral"],
  Petronas:["Syntium","Selenia","Tutela"],
  Gulf:["Gulf Supreme","Gulf Western","Gulf Professional"],
  Kendall:["GT","Super-D","Synthetic"],
  "Quaker State":["Duraguard","Premium","Synthetic"],
  "Lucas Oil":["Heavy Duty","Synthetic","Oil Stabilizer"],
  "Royal Purple":["Purple","Synchromax","Max-Gear"],
  Amsoil:["Signature","European","P-Series"],
  "Red Line":["Series 30","Series 40","Shockproof","MT-90"],
  SynPower:["Premium","Professional","Durashift"],
  Fuchs:["Silkolene","Titan","Renolin"],
  NOCO:["XTREME","GBC"],
  CRC:["Brakleen","Mass Air Flow","Fuel System"],
  Prestone:["Antifreeze","Brake Fluid","Coolant"],
  STP:["Oil Treatment","Fuel Injector"],
  Motorcraft:["Synthetic Blend","Conventional","Premium"],
  Champion:["Synthetic","Universal"],
  Caltex:["Havoline","Delo","Syntium"]
};
// Nacional: líneas genéricas
const nacLineas = ["Sintetico","Semi-Sintetico","Mineral","Multiproposito","Diésel","Turbo","Trans","Hidraulico","Premium","Eco","Classic","Industrial","Marino","Agricola"];

function getLineas(marca) { return lineasX[marca] || nacLineas; }

// Viscocidades
const viscMotor = ["SAE 0W-20","SAE 0W-30","SAE 0W-40","SAE 5W-20","SAE 5W-30","SAE 5W-40","SAE 5W-50","SAE 10W-30","SAE 10W-40","SAE 10W-50","SAE 15W-40","SAE 15W-50","SAE 20W-50","SAE 30","SAE 40","SAE 50"];
const viscTrans = ["SAE 75W-80","SAE 75W-85","SAE 75W-90","SAE 75W-140","SAE 80W-90","SAE 85W-90"];
const viscHid = ["ISO VG 10","ISO VG 22","ISO VG 32","ISO VG 46","ISO VG 68","ISO VG 100","ISO VG 150","ISO VG 220","ISO VG 320","ISO VG 460"];

// Specs
const specGas = ["API SN","API SN PLUS","API SP","ILSAC GF-5","ILSAC GF-5+","ILSAC GF-6A","ACEA A3/B3","ACEA A3/B4","ACEA C2","ACEA C3","ACEA C5","GM dexos1 Gen 2","Ford WSS-M2C946-B1","VW 502.00","VW 504.00","BMW LL-01","BMW LL-04","Mercedes-Benz MB 229.3","Mercedes-Benz MB 229.5","Porsche A40","Toyota Genuine","Honda Genuine","Hyundai/Kia SN"];
const specDiesel = ["API CK-4","API CJ-4","API CI-4 PLUS","API CI-4","API CH-4","ACEA E4","ACEA E7","ACEA E9","CAT ECF-3","Cummins CES 20081","Cummins CES 20092","Volvo VDS-4.5","Renault RLD-4","MAN M 3575","MTU Type 2"];
const specATF = ["ATF Dexron III","ATF Dexron VI","ATF Mercon V","ATF Mercon LV","ATF DW1","ATF SP-IV","Toyota T-IV","Toyota WS","Honda ATF DW-1","Nissan NS-3","GM Dexron VI","VW G 052 162","ZF Lifeguard Fluid 6","ZF Lifeguard Fluid 8","Aisin Warner JWS 3309"];

// Envases
const envMotor = ["1L","4L","5L","1 galón (3.78L)","5 galones (18.9L)","20L","200L"];
const envGrasa = ["500g","1kg","2kg","5kg","18kg","25kg"];
const envPeq = ["100ml","250ml","500ml"];
const envGrandes = ["20L","60L","200L"];

// Vehículos
const vehBase = ["Chevrolet Aveo","Chevrolet Sail","Chevrolet Spark","Chevrolet Onix","Chevrolet Tracker","Chevrolet Colorado","Ford Fiesta","Ford Focus","Ford EcoSport","Ford Ranger","Ford F-150","Toyota Yaris","Toyota Corolla","Toyota Camry","Toyota RAV4","Toyota Hilux","Toyota Prado","Honda Fit","Honda Civic","Honda CR-V","Nissan March","Nissan Sentra","Nissan Versa","Nissan Frontier","Nissan Patrol","Hyundai Accent","Hyundai Tucson","Hyundai Creta","Kia Picanto","Kia Rio","Kia Sportage","Mazda 2","Mazda 3","Mazda CX-5","Renault Sandero","Renault Duster","Volkswagen Gol","Volkswagen Polo","Volkswagen Jetta","Volkswagen Amarok","Peugeot 208","Jeep Renegade","Jeep Compass","Isuzu D-Max","Mitsubishi L200","Suzuki Swift","Suzuki Jimny"];
const vehComercial = ["Toyota Hiace","Hyundai H1","Ford Transit","Mercedes-Benz Sprinter","Nissan NP300","Renault Master","Fiat Ducato","Iveco Daily"];
const vehPesado = ["Ford F-350","Ford F-450","Chevrolet Silverado","Toyota Land Cruiser","Nissan Patrol","Mercedes-Benz Actros","Volvo FH","Scania R-Series","MAN TGX","DAF XF","Isuzu NQR","Mitsubishi Fuso Fighter","Renault Truck","Hyundai Xcient"];
const vehMaq = ["Maquinaria de Construcción","Maquinaria Agrícola","Retroexcavadora","Excavadora","Cargador Frontal","Topadora","Motoniveladora","Compactadora","Tractor Agrícola","Cosechadora","Grúa","Minicargadora"];
const vehEsp = ["Motocicleta","ATV/UTV","Motor Fuera de Borda","Generador Eléctrico","Compresor de Aire"];

// ===== GENERACIÓN =====

// --- 1. Aceites Motor Gasolina (~14,000) ---
for (const marca of todasMarcas) {
  for (const linea of getLineas(marca)) {
    for (const visc of viscMotor) {
      for (const spec of specGas) {
        for (const env of envMotor.slice(0,3)) {
          const nac = nacMarcas.includes(marca);
          const suf = nac ? "" : " " + env;
          const n = `${marca} ${linea} ${visc}${suf}`.trim();
          add(n, marca, `${marca.slice(0,3).toUpperCase()}-${linea.slice(0,4).toUpperCase()}-${visc.replace(/\s/g,"")}-${env.replace(/[^A-Z0-9]/gi,"").slice(0,5)}`, "Aceites de Motor > Gasolina", [vehBase[Math.floor(Math.random()*vehBase.length)]], [visc,marca,linea,"motor","gasolina",env,spec]);
          if (items.length >= 14000) break;
        }
        if (items.length >= 14000) break;
      }
      if (items.length >= 14000) break;
    }
    if (items.length >= 14000) break;
  }
  if (items.length >= 14000) break;
}

// --- 2. Aceites Motor Diésel (~5,000) ---
for (const marca of todasMarcas) {
  for (const linea of getLineas(marca)) {
    for (const visc of ["SAE 10W-30","SAE 10W-40","SAE 15W-40","SAE 15W-50","SAE 20W-50"]) {
      for (const spec of specDiesel) {
        for (const env of ["4L","5L","1 galón (3.78L)","20L"]) {
          const n = `${marca} ${linea} Diésel ${visc} ${env}`.trim();
          add(n, marca, `${marca.slice(0,3).toUpperCase()}-D-${linea.slice(0,4).toUpperCase()}-${visc.replace(/\s/g,"")}`, "Aceites de Motor > Diésel", [vehComercial[Math.floor(Math.random()*vehComercial.length)],vehPesado[Math.floor(Math.random()*vehPesado.length)]], [visc,marca,linea,"motor","diésel","diesel",env,spec]);
          if (items.length >= 19000) break;
        }
        if (items.length >= 19000) break;
      }
      if (items.length >= 19000) break;
    }
    if (items.length >= 19000) break;
  }
  if (items.length >= 19000) break;
}

// --- 3. Aceites Transmisión (~4,000) ---
for (const marca of todasMarcas) {
  for (const linea of getLineas(marca)) {
    for (const visc of viscTrans) {
      for (const spec of specATF) {
        for (const env of ["1L","4L","5L"]) {
          const esAuto = spec.includes("ATF") || spec.includes("Dexron") || spec.includes("Mercon") || spec.includes("Toyota") || spec.includes("Honda") || spec.includes("Nissan") || spec.includes("VW") || spec.includes("ZF") || spec.includes("Aisin");
          const sub = esAuto ? "Transmisión Automática" : "Transmisión Manual";
          const n = `${marca} ${linea} ${visc} ${env}`.trim();
          add(n, marca, `${marca.slice(0,3).toUpperCase()}-T-${linea.slice(0,4).toUpperCase()}-${visc.replace(/\s/g,"")}`, "Aceites de Transmisión > " + sub, [vehBase[Math.floor(Math.random()*vehBase.length)]], [visc,marca,linea,"transmisión","caja",env,spec]);
          if (items.length >= 23000) break;
        }
        if (items.length >= 23000) break;
      }
      if (items.length >= 23000) break;
    }
    if (items.length >= 23000) break;
  }
  if (items.length >= 23000) break;
}

// --- 4. Aceites Hidráulicos (~3,500) ---
for (const marca of todasMarcas) {
  for (const visc of viscHid) {
    for (const env of ["5L","20L","200L"]) {
      for (const sub of ["Industrial","Móvil","Anti Desgaste","Multiuso","Prensa","Elevadores"]) {
        const n = `${marca} Hidráulico ${sub} ${visc} ${env}`.trim();
        add(n, marca, `${marca.slice(0,3).toUpperCase()}-H-${visc.replace(/\s/g,"")}-${sub.slice(0,3).toUpperCase()}`, "Aceites Hidráulicos > " + sub, vehMaq.slice(0,4), [visc,marca,"hidráulico",sub.toLowerCase(),env]);
        if (items.length >= 26500) break;
      }
      if (items.length >= 26500) break;
    }
    if (items.length >= 26500) break;
  }
  if (items.length >= 26500) break;
}

// --- 5. Aceites Compresores (~1,500) ---
const compMarcas = ["Shell","Mobil","Total","Atlas Copco","Ingersoll","CompAir"];
for (const marca of compMarcas) {
  for (const visc of viscHid.slice(0,6)) {
    for (const env of ["5L","20L","200L"]) {
      add(`${marca} Aceite Compresor ${visc} ${env}`.trim(), marca, `${marca.slice(0,3).toUpperCase()}-COMP-${visc.replace(/\s/g,"")}`, "Aceites para Compresores", ["Compresor de Aire"], [visc,marca,"compresor","aire",env]);
      if (items.length >= 28000) break;
    }
    if (items.length >= 28000) break;
  }
  if (items.length >= 28000) break;
}

// --- 6. Aceites Transformador (~300) ---
for (const marca of ["Shell","Mobil","Total","Nynas","Petrobras Venezuela","PDVSA Lubricantes"]) {
  for (const visc of ["ISO VG 10","ISO VG 22","ISO VG 32","ISO VG 46","ISO VG 68"]) {
    for (const env of ["20L","200L"]) {
      add(`${marca} Aceite Transformador ${visc} ${env}`.trim(), marca, `${marca.slice(0,3).toUpperCase()}-TRF-${visc.replace(/\s/g,"")}`, "Aceites para Transformer", ["Generador Eléctrico"], [visc,marca,"transformador","eléctrico",env]);
    }
  }
}

// --- 7. Grasas (~3,000) ---
const tiposGrasa = ["Multiuso","Litio","Litio Complex","Calcio","EP","Altas Temperaturas","Rodamientos","Chasis","Frenos","Grafito","Molibdeno","Food Grade"];
for (const marca of todasMarcas) {
  for (const tipo of tiposGrasa) {
    for (const env of envGrasa) {
      const n = `${marca} Grasa ${tipo} ${env}`.trim();
      add(n, marca, `${marca.slice(0,3).toUpperCase()}-G-${tipo.slice(0,3).toUpperCase()}-${env.replace(/[^A-Z0-9]/gi,"")}`, "Grasas > " + tipo, vehBase.slice(0,5), [marca,"grasa",tipo.toLowerCase(),env]);
      if (items.length >= 31000) break;
    }
    if (items.length >= 31000) break;
  }
  if (items.length >= 31000) break;
}

// --- 8. Líquido Frenos (~1,200) ---
const tiposFreno = ["DOT 3","DOT 4","DOT 5","DOT 5.1","Sintético","Racing"];
for (const marca of todasMarcas) {
  for (const tipo of tiposFreno) {
    for (const env of envPeq) {
      add(`${marca} Líquido de Frenos ${tipo} ${env}`.trim(), marca, `${marca.slice(0,3).toUpperCase()}-FR-${tipo.replace(/\s/g,"")}-${env.replace(/[^A-Z0-9]/gi,"")}`, "Líquido de Frenos > DOT", vehBase.slice(0,5), [marca,"frenos","líquido frenos",tipo,env]);
      if (items.length >= 32200) break;
    }
    if (items.length >= 32200) break;
  }
  if (items.length >= 32200) break;
}

// --- 9. Refrigerante (~1,500) ---
const tiposRefrig = ["Orgánico","Inorgánico","Hibrido","Pre-Mezclado","Concentrado","Anticongelante"];
for (const marca of todasMarcas) {
  for (const tipo of tiposRefrig) {
    for (const env of ["1L","2L","4L","5L","1 galón (3.78L)","20L"]) {
      add(`${marca} Refrigerante ${tipo} ${env}`.trim(), marca, `${marca.slice(0,3).toUpperCase()}-REF-${tipo.slice(0,3).toUpperCase()}-${env.replace(/[^A-Z0-9]/gi,"")}`, "Líquido Refrigerante > " + tipo, vehBase.slice(0,5), [marca,"refrigerante","anticongelante",tipo,env]);
      if (items.length >= 33700) break;
    }
    if (items.length >= 33700) break;
  }
  if (items.length >= 33700) break;
}

// --- 10. Aditivos (~2,500) ---
const tiposAdit = ["Limpiador Inyectores","Antidesgaste","Limpiador Carbón","Estabilizador","Sellador Aceite","Flush Motor","Octanante","Anti Deterioro","Para Gasolina","Para Diésel"];
for (const marca of todasMarcas) {
  for (const tipo of tiposAdit) {
    for (const env of envPeq) {
      add(`${marca} ${tipo} ${env}`.trim(), marca, `${marca.slice(0,3).toUpperCase()}-AD-${tipo.slice(0,3).toUpperCase()}-${env.replace(/[^A-Z0-9]/gi,"")}`, "Aditivos > " + tipo, vehBase.slice(0,3), [marca,"aditivo",tipo.toLowerCase(),env]);
      if (items.length >= 36200) break;
    }
    if (items.length >= 36200) break;
  }
  if (items.length >= 36200) break;
}

// --- 11. Fluidos de Corte (~800) ---
for (const marca of ["Shell","Mobil","Total","Fuchs","Castrol"]) {
  for (const visc of viscHid) {
    for (const env of ["5L","20L","200L"]) {
      add(`${marca} Fluido de Corte ${visc} ${env}`.trim(), marca, `${marca.slice(0,3).toUpperCase()}-FC-${visc.replace(/\s/g,"")}`, "Fluidos de Corte", vehMaq.slice(0,3), [visc,marca,"corte","maquinaria",env]);
      if (items.length >= 37000) break;
    }
    if (items.length >= 37000) break;
  }
  if (items.length >= 37000) break;
}

// --- 12. Aceites especiales (~1,500) ---
for (const marca of ["Shell","Mobil","Total"]) {
  for (const tipo of ["Hornos","Molinos","Estampado","Vacuum","Dispensadores"]) {
    for (const visc of ["SAE 30","SAE 40","SAE 50","ISO VG 46","ISO VG 68"]) {
      for (const env of ["20L","200L"]) {
        add(`${marca} Aceite ${tipo} ${visc} ${env}`.trim(), marca, `${marca.slice(0,3).toUpperCase()}-${tipo.slice(0,3).toUpperCase()}-${visc.replace(/\s/g,"")}`, "Aceites para " + tipo, [], [visc,marca,tipo.toLowerCase(),env]);
        if (items.length >= 38500) break;
      }
      if (items.length >= 38500) break;
    }
    if (items.length >= 38500) break;
  }
  if (items.length >= 38500) break;
}

// --- 13. Aceites marinos (~1,000) ---
for (const marca of ["Shell","Mobil","Total","Chevron"]) {
  for (const visc of ["SAE 30","SAE 40","SAE 50","SAE 15W-40","SAE 20W-50"]) {
    for (const env of ["5L","20L","200L"]) {
      add(`${marca} Aceite Marino ${visc} ${env}`.trim(), marca, `${marca.slice(0,3).toUpperCase()}-MAR-${visc.replace(/\s/g,"")}`, "Aceites Marinos", ["Motor Fuera de Borda"], [visc,marca,"marino","motor","fuera de borda",env]);
      if (items.length >= 39500) break;
    }
    if (items.length >= 39500) break;
  }
  if (items.length >= 39500) break;
}

// --- 14. Relleno para llegar a 40,000+ ---
for (const marca of nacMarcas) {
  for (const linea of nacLineas) {
    for (const env of ["1L","4L","5L","1 galón (3.78L)","20L"]) {
      for (const veh of vehBase.slice(0,5)) {
        const n = `${marca} ${linea} ${env} ${veh}`.trim();
        add(n, marca, `${marca.slice(0,3).toUpperCase()}-P-${linea.slice(0,3).toUpperCase()}-${env.replace(/[^A-Z0-9]/gi,"")}`, "Aceites de Motor > Multiuso", [veh], [marca,linea,"multiuso",veh,env]);
        if (items.length >= 42000) break;
      }
      if (items.length >= 42000) break;
    }
    if (items.length >= 42000) break;
  }
  if (items.length >= 42000) break;
}

// Output
const outPath = path.join(__dirname, "..", "pos", "assets", "catalogo_repuestos.json");
fs.writeFileSync(outPath, JSON.stringify(items), "utf8");
console.log(`[Generador] Total items: ${items.length} -> ${outPath}`);

// Stats
const cats = {};
items.forEach(i => { const c = i.categoria.split(">")[0].trim(); cats[c] = (cats[c]||0)+1; });
console.log("[Generador] Categorías:", JSON.stringify(cats));
const mCount = {};
items.forEach(i => { mCount[i.marca] = (mCount[i.marca]||0)+1; });
const top5 = Object.entries(mCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
console.log("[Generador] Top 5 marcas:", top5.map(([m,c])=>`${m}(${c})`).join(", "));
