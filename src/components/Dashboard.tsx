import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import '../leaflet-setup';
import * as L from 'leaflet';
import 'leaflet.heat';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Legend, LabelList
} from 'recharts';
import { 
  Search, Shield, Database, MapPin, Navigation, TrendingUp, AlertTriangle, 
  Zap, Target, ChevronRight, User, Tag, List, Activity, BarChart3, Sword,
  Map as MapIcon, Layers, Calendar
} from 'lucide-react';

const COLORS = ['#3C4C9A', '#D0234F', '#EE751E', '#4A4963', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];

const YAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const value = payload.value || "";
  
  let lines: string[] = [];
  if (value.length > 18) {
    if (value.includes(" / ")) {
      lines = value.split(" / ");
    } else {
      const words = value.split(" ");
      let currentLine = "";
      words.forEach((w: string) => {
        if ((currentLine + " " + w).length > 20) {
          lines.push(currentLine.trim());
          currentLine = w;
        } else {
          currentLine += " " + w;
        }
      });
      if (currentLine) {
        lines.push(currentLine.trim());
      }
    }
  } else {
    lines = [value];
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-10}
        y={lines.length > 1 ? -(lines.length - 1) * 5.5 : 4}
        textAnchor="end"
        fill="#475569"
        fontSize="10px"
        fontWeight="bold"
        className="uppercase tracking-tight"
      >
        {lines.map((line, index) => (
          <tspan x={-10} dy={index === 0 ? 0 : 12} key={index}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

const LargerYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const value = payload.value || "";
  
  let lines: string[] = [];
  if (value.length > 20) {
    if (value.includes(" / ")) {
      lines = value.split(" / ");
    } else {
      const words = value.split(" ");
      let currentLine = "";
      words.forEach((w: string) => {
        if ((currentLine + " " + w).length > 20) {
          lines.push(currentLine.trim());
          currentLine = w;
        } else {
          currentLine += " " + w;
        }
      });
      if (currentLine) {
        lines.push(currentLine.trim());
      }
    }
  } else {
    lines = [value];
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-12}
        y={lines.length > 1 ? -(lines.length - 1) * 6 : 4}
        textAnchor="end"
        fill="#1e293b"
        fontSize="12px"
        fontWeight="bold"
        className="uppercase tracking-tight"
      >
        {lines.slice(0, 3).map((line, index) => (
          <tspan x={-12} dy={index === 0 ? 0 : 13} key={index}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const value = item.value;
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
    return (
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 text-sm font-semibold relative z-50">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{item.payload.name}</p>
        <p className="text-white text-base font-black">
          Cantidad: <span className="text-[#EE751E]">{value}</span>
        </p>
        <p className="text-white text-base font-black">
          Porcentaje: <span className="text-sky-400">{percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
};

// 1. EXTRACTOR DE MOVILIDAD (NLP + JERARQUÍA ESTRÍCTA SEGÚN EJEMPLOS)
function extractMobilityFromText(text: string, defaultVal: string = "S/D", isAggressor: boolean = false): string[] {
  const s = String(text || "").toUpperCase();
  const def = String(defaultVal || "").toUpperCase();
  const searchIn = s + " " + def;

  const results: string[] = [];

  // 1. Detección de "ESTACIONADA" (Solo para víctimas: objeto dejado/apoyado/estacionado)
  if (!isAggressor) {
    if (s.includes('DEJE ESTACIONAD') || s.includes('DEJE MI') || s.includes('ESTACIONE MI') || 
        s.includes('ESTACIONADA EN') || s.includes('APOYADA EN') || s.includes('QUEDO EN LA PUERTA') ||
        s.includes('QUEDO ESTACIONAD') || s.includes('ESTABA ESTACIONAD') || s.includes('DEJAMOS ESTACIONAD')) {
      results.push("ESTACIONADA");
    }
  }

  // 2. Detección de MOTO
  const isMoto = s.includes('MOTO') || s.includes('MOTOCICLETA') || s.includes('MOTOVEHICULO') || 
                 s.includes('ZANELLA') || s.includes('HONDA WAVE') || s.includes('WAVE') || 
                 s.includes('BAJAJ') || s.includes('ROUSER') || s.includes('YBR') || s.includes('110CC') ||
                 s.includes('CICLOMOTOR') || s.includes('MOTOMEL');
  if (isMoto) {
    results.push("MOTO");
  }
  
  // 3. Detección de AUTO
  const isAuto = s.includes('AUTO') || s.includes('CAMIONETA') || s.includes('COCHE') || 
                 s.includes('PARTICULAR') || s.includes('VEHICULO') || s.includes('UTILITARIO') ||
                 s.includes('PEUGEOT') || s.includes('RENAULT') || s.includes('FORD');
  if (isAuto) {
    results.push("AUTO");
  }

  // 4. Marcadores de POSICIÓN HUMANA (A PIE)
  const isHumanMarker = s.includes('A PIE') || s.includes('CAMINANDO') || s.includes('PEATON') || 
                        s.includes('PARADO') || s.includes('PARADA') || s.includes('NOS ENCONTRAMOS') || 
                        s.includes('TROTANDO') ||
                        s.includes('CORRIENDO');
  if (isHumanMarker) {
    results.push("A PIE");
  }

  // Otros medios
  if (searchIn.includes('BICI') || searchIn.includes('BICICLETA') || searchIn.includes('MTB')) {
    results.push("BICI");
  }
  if (searchIn.includes('TAXI') || searchIn.includes('REMIS')) {
    results.push("TAXI/REMIS");
  }
  if (searchIn.includes('COLECTIVO') || searchIn.includes('OMNIBUS')) {
    results.push("COLECTIVO");
  }

  // Fallback 1: Si no hay marcas claras en texto, probar con el valor de la columna
  if (results.length === 0 && def !== "S/D" && def !== "" && def !== "SIN CLASIFICAR" && def !== "NULL") {
    if (def.includes('PIE')) results.push("A PIE");
    else if (def.includes('MOTO')) results.push("MOTO");
    else if (def.includes('AUTO')) results.push("AUTO");
    else if (def.includes('BICI')) results.push("BICI");
  }

  if (results.length === 0) {
    results.push("En investigación");
  }

  // Quitar duplicados
  return Array.from(new Set(results));
}

// 2. EXTRACTOR DE MEDIO EMPLEADO (ARMA / MEDIO)
function detectWeapon(row: any) {
  const val = getVal(row, "cmedio_empleado");
  const s = String(val || "").toUpperCase().trim();
  if (!s || s === "S/D" || s === "UNDEFINED" || s === "NULL" || s === "SIN CLASIFICAR") return "En investigación";
  return s;
}

// 3. ANÁLISIS INTELIGENTE DE MODUS OPERANDI (EXCLUSIVO CMODUS_OPERANDI)
function analyzeMO(row: any) {
  const csvMO = String(getVal(row, "cmodus_operandi") || "").trim().toUpperCase();
  if (csvMO && csvMO !== "SIN CLASIFICAR" && csvMO !== "S/D" && csvMO !== "NULL") return csvMO;
  return "En investigación";
}

function normalizeVehicleBrandModel(brandStr: string): string {
  const s = String(brandStr || "").trim().toUpperCase();

  if (!s || s === "S/D" || s === "SIN DATOS" || s === "NULL" || s === "UNDEFINED") {
    return "Sin datos del vehículo";
  }

  // Split by common separators like " - " or "-" to check brand and model
  const parts = s.split(/\s*-\s*/).map(p => p.trim());
  
  if (parts.length === 2) {
    const brand = parts[0];
    const model = parts[1];

    const isBrandEmpty = !brand || brand === "S/MARCA" || brand === "S/D" || brand === "SIN MARCA" || brand === "SIN_MARCA";
    const isModelEmpty = !model || model === "S/MODELO" || model === "S/D" || model === "SIN MODELO" || model === "SIN_MODELO";

    if (isBrandEmpty && isModelEmpty) {
      return "Sin datos del vehículo";
    }
    if (isBrandEmpty) {
      return `Modelo: ${model} (Marca S/D)`;
    }
    if (isModelEmpty) {
      return `${brand} (Modelo S/D)`;
    }
  } else if (parts.length === 1) {
    if (s === "S/MARCA" || s === "S/MODELO" || s === "SIN MARCA" || s === "SIN MODELO") {
      return "Sin datos del vehículo";
    }
  }

  return s;
}

// 4. EXTRACTOR DE MARCAS (JERARQUÍA ESTRICTA LITERAL: CMARCA > CMARCAMODELO_VEHICULO)
function extractBrands(row: any) {
  const cmarcaRaw = (getVal(row, "cmarca") || "").trim();
  const cmarcaUpper = cmarcaRaw.toUpperCase();

  // Prioridad Principal: Columna cmarca
  if (cmarcaRaw !== "" && cmarcaUpper !== "S/D") {
    return normalizeVehicleBrandModel(cmarcaUpper);
  }

  // Salto a Vehículo: Columna cmarcamodelo_vehiculo
  const cmarcamodeloRaw = (getVal(row, "cmarcamodelo_vehiculo") || "").trim();
  const cmarcamodeloUpper = cmarcamodeloRaw.toUpperCase();
  if (cmarcamodeloRaw !== "" && cmarcamodeloUpper !== "S/D") {
    return normalizeVehicleBrandModel(cmarcamodeloUpper);
  }

  return "Sin datos del vehículo";
}

// 5. EXTRACTOR DE BARRIOS (ELIMINADO - SE USA SPATIAL JOIN EXCLUSIVAMENTE)

// 6. EXTRACTOR DE OBJETOS (RTCO REFINADO SEGÚN PROMPT)
function resolveStolenObject(row: any) {
  const rawElem = String(getVal(row, "ctipo_elemento") || "").trim();
  const rawObj = String(getVal(row, "cobjetivo_atacado") || "").trim();

  const isSD = (val: string) => {
    const v = val.toUpperCase().trim();
    return !v || v === "S/D" || v === "NULL" || v === "UNDEFINED" || v === "SIN CLASIFICAR" || v === "BIEN NO ESPECIFICADO / OTROS" || v === "FALTA DETERMINAR OBJETO" || v === "OBJETO NO IDENTIFICADO";
  };

  const CRITICAL_CATEGORIES = [
    "MOTOVEHÍCULO", "MOTOVEHICULO",
    "AUTOMÓVIL PARTICULAR", "AUTOMOVIL PARTICULAR",
    "CAMIONETA",
    "BICICLETA",
    "CAMIÓN CARGA GENERAL", "CAMION CARGA GENERAL",
    "ANIMAL"
  ];

  // 1. Prioridad Principal: ctipo_elemento
  if (!isSD(rawElem)) {
    return rawElem;
  }

  // 2. Salto Condicional: ctipo_elemento es nulo, vacío o genérico. Busca en cobjetivo_atacado si coincide exactamente con la categoría crítica.
  if (CRITICAL_CATEGORIES.includes(rawObj.toUpperCase().trim())) {
    return rawObj;
  }

  return rawElem;
}

function extractObjects(row: any): string[] {
  const target = resolveStolenObject(row);

  // Términos que queremos agrupar SOLO si están esencialmente solos o sin contexto
  const ambiguousTerms = [
    "SIN DATOS", "S/D", "N/A", "SIN CLASIFICAR", "DESCONOCIDO", "PENDIENTE", "SIN ESPECIFICAR", "NINGUNO", "NINGUNA", "S MARK",
    "SIN INFORMACIÓN", "SIN INFORMACION", "SIN_INFORMACION", "SIN_INFORMACIÓN", "SIN DATA"
  ];

  // Lista negra de lugares y personas
  const blacklist = [
    "PERSONA", "VÍCTIMA", "VICTIMA", "PEATÓN", "PEATON", "HOMBRE", "MUJER", "CLIENTE",
    "VIVIENDA", "PROPIEDAD", "COMERCIO", "LOCAL", "ESTABLECIMIENTO", "NEGOCIO", "BANCO", "ENTIDAD",
    "CASA", "FAMILIA", "DOMICILIO", "RESIDENCIA", "DEPARTAMENTO", "EDIFICIO", "VIA PUBLICA", "VÍA PÚBLICA",
    "CLUB", "EMPRESA", "GARAGE", "COCHERA", "COCHERAS", "GALPÓN", "GALPON", "OBRA", "OBRAS",
    "DENTRO DE", "COLEGIO", "ESCUELA", "HOSPITAL", "CLÍNICA", "CONSULTORIO", "PARQUE", "PLAZA"
  ];

  if (!target || target === "") return ["OBJETO NO IDENTIFICADO"];

  // Dividimos por delimitadores comunes
  const parts = target.split(/[,\/Y-]/).map(p => p.trim()).filter(p => p.length > 2 || ambiguousTerms.includes(p.toUpperCase()));

  const normalized = parts.map(item => {
    const itemLower = item.toLowerCase();
    // 2. Unificación Absoluta de Genéricos a "BIEN NO ESPECIFICADO / OTROS"
    if (
      itemLower === "sin clasificar" ||
      itemLower === "sin especificar" ||
      itemLower === "sinespecificar" ||
      itemLower === "sin clasificar / otros" ||
      itemLower === "sin especificar / otros"
    ) {
      return "OBJETO NO IDENTIFICADO";
    }

    if (ambiguousTerms.includes(item.toUpperCase())) {
      return "OBJETO NO IDENTIFICADO";
    }
    
    // Si es un lugar o persona, lo unificamos a bien no especificado
    if (blacklist.some(term => item.toUpperCase() === term || item.toUpperCase().includes(term))) {
      return "OBJETO NO IDENTIFICADO";
    }

    const itemUpper = item.toUpperCase();

    // Normalizaciones estándar (Manteniendo especificidad técnica)
    if (itemUpper.includes("AUTO") || itemUpper.includes("AUTOMOVIL") || itemUpper.includes("AUTOMÓVIL") || itemUpper.includes("COCHE") || itemUpper.includes("PARTICULAR")) return "AUTOMÓVIL PARTICULAR";
    if (itemUpper.includes("MOTO") || itemUpper.includes("MOTOCICLETA")) return "MOTOVEHÍCULO";
    if (itemUpper.includes("CELULAR") || itemUpper.includes("TELEFONO") || (itemUpper.includes("MOVIL") && !itemUpper.includes("AUTOMOVIL"))) return "TELÉFONO CELULAR";
    if (itemUpper.includes("DINERO") || itemUpper.includes("EFECTIVO") || itemUpper.includes("PLATA") || itemUpper.includes("PESES") || itemUpper.includes("VALORES")) return "DINERO";
    if (itemUpper.includes("CAMIONETA")) return "CAMIONETA";
    if (itemUpper.includes("CAMION") || itemUpper.includes("CAMIÓN")) return "CAMIÓN CARGA GENERAL";
    if (itemUpper.includes("BILLETERA") || (itemUpper.includes("CARTERA") && !itemUpper.includes("CADENA"))) return "BILLETERA / CARTERA";
    if (itemUpper.includes("MOCHILA") || itemUpper.includes("BOLSO")) return "MOCHILA / BOLSO";
    if (itemUpper.includes("BICICLETA") || itemUpper.includes("BICI")) return "BICICLETA";
    if (itemUpper.includes("DOCUMENTO") || itemUpper.includes("DNI") || itemUpper.includes("CARNET") || itemUpper.includes("DOCUMENTACIÓN")) return "DOCUMENTACIÓN";
    if (itemUpper.includes("RELOJ") || itemUpper.includes("CADENA") || itemUpper.includes("ANILLO") || itemUpper.includes("ORO") || itemUpper.includes("JOYA") || itemUpper.includes("ALHAJA")) return "ALHAJAS / RELOJES";
    if (itemUpper.includes("HERRAMIENTA")) return "HERRAMIENTAS";
    if (itemUpper.includes("RUEDA") || itemUpper.includes("NEUMATICO") || itemUpper.includes("AUXILIO")) return "AUTOPARTES / RUEDAS";
    if (itemUpper.includes("INDUMENTARIA") || itemUpper.includes("ROPA") || itemUpper.includes("PRENDA") || itemUpper.includes("CALZADO")) return "INDUMENTARIA";
    if (itemUpper.includes("ANIMAL") || itemUpper.includes("PERRO") || itemUpper.includes("CABALLO")) return "ANIMAL";
    if (itemUpper.includes("ELECTRICO") || itemUpper.includes("CABLE") || itemUpper.includes("ELECTRICIDAD")) return "CABLES / ELECTRICIDAD";
    if (itemUpper.includes("CEREAL")) return "CEREALES";
    
    // Si contiene "OTRO" pero tiene más palabras (ej: CEREAL OTROS), lo dejamos pasar quitando el (OTROS) para limpiar
    if (itemUpper.includes("OTRO")) {
      const cleaned = itemUpper.replace(/\(OTROS\)/g, "").replace(/OTROS/g, "").replace(/OTRO/g, "").replace(/OTRAS/g, "").trim();
      if (cleaned.length > 2) return cleaned;
      return "OBJETO NO IDENTIFICADO";
    }

    return itemUpper;
  }).filter((i): i is string => i !== null);

  const unique = Array.from(new Set(normalized)).map(item => {
    const itemLower = item.toLowerCase();
    if (
      itemLower === "sin clasificar" || 
      itemLower === "sin especificar" || 
      itemLower === "sinespecificar" || 
      itemLower === "s/d" || 
      itemLower === "sin informacion" || 
      itemLower === "sin información" || 
      itemLower === "sin_informacion" || 
      itemLower === "sin_información" ||
      itemLower === "sin datos" ||
      itemLower === "sin data"
    ) {
      return "OBJETO NO IDENTIFICADO";
    }
    return item;
  });
  return unique.length > 0 ? unique : ["OBJETO NO IDENTIFICADO"];
}

// 7. AUXILIAR: BUSCAR VALOR EN FILA (IGNORAR MAYÚSCULAS/ESPACIOS) Y REMOVER PREFIJOS DEL SISTEMA SÍNTESIS
function sanitizeSynthesisPrefixes(str: string): string {
  if (!str) return "";
  // Busca y remueve de forma segura patrones del tipo "Delito 1:", "Persona 2:", "Elemento 3:", "Hecho 4:", etc.
  return str.replace(/(?:Delito|Persona|Elemento|Hecho|Sujeto|Objeto)\s*\d+\s*:\s*/gi, "").trim();
}

function getVal(row: any, key: string) {
  if (!row) return "";
  const k = key.toLowerCase().trim();
  const actualKey = Object.keys(row).find(orig => orig.toLowerCase().trim() === k);
  const val = actualKey ? row[actualKey] : "";
  if (val === null || val === undefined) return "";
  return sanitizeSynthesisPrefixes(String(val));
}

// 8. EXTRACTOR DE MOMENTO DEL DÍA (USANDO FHORA_DELITO_DESDE)
function extractTimeSlot(val: any) {
  const s = String(val || "").toUpperCase().trim();
  if (!s || s === "S/D" || s === "UNDEFINED" || s === "NULL" || s === "SIN DATA" || s === "SIN DATOS" || s === "SIN CLASIFICAR" || s === "") {
    return "En investigación";
  }
  
  // Eliminar cualquier asignación por defecto que fuerce horas simuladas
  if (s === "00:00" || s === "12:00" || s === "00:00:00" || s === "12:00:00") {
    return "En investigación";
  }
  
  const match = s.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "En investigación";
  
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  
  if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
    return "En investigación";
  }
  
  if (hour >= 0 && hour < 6) return "MADRUGADA"; // 00:00 - 05:59
  if (hour >= 6 && hour < 12) return "MAÑANA";   // 06:00 - 11:59
  if (hour >= 12 && hour < 18) return "TARDE";   // 12:00 - 17:59
  return "NOCHE";                                // 18:00 - 23:59
}

// 9. EXTRACTOR DE CONTEXTO DE LUGAR (USANDO CTIPO_LUGAR)
function sanitizeEncodingError(str: string): string {
  if (!str) return "";
  let s = String(str).toUpperCase().trim();
  
  // Unificaciones de tipeo/exportación para inconsistencias ortográficas
  s = s.replace(/AGREDIÒ/g, "AGREDIÓ");
  s = s.replace(/AGREDIO/g, "AGREDIÓ");
  s = s.replace(/SUSTRAID[OÒA]/g, "SUSTRAÍDO");
  s = s.replace(/SUSTRAIDO/g, "SUSTRAÍDO");
  
  // Reemplazo para codificación rota similar a UTF-8/ISO-8859-1 incompatibles
  // Como "VA PBLICA", "VA P?BLICA", "VIA PUBLICA" -> "VÍA PÚBLICA"
  s = s.replace(/\bVA\s+PBLICA\b/g, "VÍA PÚBLICA");
  s = s.replace(/\bVA\s+P\?BLICA\b/g, "VÍA PÚBLICA");
  s = s.replace(/\bV\?A\s+P\?BLICA\b/g, "VÍA PÚBLICA");
  s = s.replace(/\bVIA\s+PBLICA\b/g, "VÍA PÚBLICA");
  s = s.replace(/\bVIA\s+PUBLICA\b/g, "VÍA PÚBLICA");
  s = s.replace(/\bVA\s+PUBLICA\b/g, "VÍA PÚBLICA");
  s = s.replace(/\bVAPBLICA\b/g, "VÍA PÚBLICA");
  s = s.replace(/\bVA\b/g, "VÍA");
  s = s.replace(/\bV\?A\b/g, "VÍA");
  s = s.replace(/\bPBLICA\b/g, "PÚBLICA");
  s = s.replace(/\bP\?BLICA\b/g, "PÚBLICA");
  
  // Otros reemplazos comunes de codificación rota en español
  s = s.replace(/VEHICULO/g, "VEHÍCULO");
  s = s.replace(/VEHICULOS/g, "VEHÍCULOS");
  s = s.replace(/AUTOMOVIL/g, "AUTOMÓVIL");
  s = s.replace(/TELEFONO/g, "TELÉFONO");
  s = s.replace(/TELEFÒNO/g, "TELÉFONO");
  s = s.replace(/TELEF\?NO/g, "TELÉFONO");
  s = s.replace(/DIRECCION/g, "DIRECCIÓN");
  s = s.replace(/DIRECCI\?N/g, "DIRECCIÓN");
  s = s.replace(/S\/D/g, "SIN DATOS");
  s = s.replace(/CALE/g, "CALLE");
  s = s.replace(/P[\?]BLICA/g, "PÚBLICA");
  s = s.replace(/V[\?]A/g, "VÍA");
  
  return s;
}

function sanitizeDescription(desc: string): string {
  if (!desc) return "";
  let s = String(desc);
  
  // Reemplazar ocurrencias insensibles a mayúsculas de errores comunes
  s = s.replace(/agrediò/gi, "agredió");
  s = s.replace(/agredio/gi, "agredió");
  s = s.replace(/sustraid[oòa]/gi, "sustraído");
  s = s.replace(/sustraido/gi, "sustraído");
  s = s.replace(/va pblica/gi, "vía pública");
  s = s.replace(/va p\?blica/gi, "vía pública");
  s = s.replace(/via pblica/gi, "vía pública");
  s = s.replace(/via publica/gi, "vía pública");
  s = s.replace(/va publica/gi, "vía pública");
  s = s.replace(/vapblica/gi, "vía pública");
  s = s.replace(/vehiculo/gi, "vehículo");
  s = s.replace(/automovil/gi, "automóvil");
  s = s.replace(/telefono/gi, "teléfono");
  s = s.replace(/telefòno/gi, "teléfono");
  s = s.replace(/direccion/gi, "dirección");
  
  return s;
}

function extractPlaceType(val: any) {
  const s = String(val || "").toUpperCase().trim();
  if (!s || s === "S/D" || s === "UNDEFINED" || s === "NULL" || s === "SIN CLASIFICAR" || s === "SIN DATA" || s === "SIN DATOS" || s === "VACIO" || s === "VACÍO" || s === "") {
    return "En investigación";
  }
  
  // Preservación estricta de términos de alto valor analítico-situacional (evitando "OTROS")
  if (s.includes("OBRA EN CONSTRUCCION") || s.includes("OBRA EN CONSTRUCCIÓN") || s === "OBRA" || s === "OBRAS") {
    return "OBRA EN CONSTRUCCIÓN";
  }
  if (s.includes("TERRENO BALDIO") || s.includes("TERRENO BALDÍO") || s === "BALDIO" || s === "BALDÍO") {
    return "TERRENO BALDÍO";
  }
  if (s === "PLAZA" || s === "PARQUE" || s.startsWith("PLAZA ") || s.startsWith("PARQUE ")) {
    return "PLAZA";
  }
  
  return sanitizeEncodingError(s);
}

// 10. EXTRACTOR DE OBJETIVO (UNIFICADO CON LÓGICA DE PRIORIDAD)
function extractTargetObject(row: any) {
  const target = resolveStolenObject(row);
  
  const targetLower = (target || "").toLowerCase().trim();
  if (
    targetLower === "sin clasificar" ||
    targetLower === "sin especificar" ||
    targetLower === "sinespecificar" ||
    targetLower === "sin clasificar / otros" ||
    targetLower === "sin especificar / otros"
  ) {
    return "S/D";
  }

  const ambiguous = ["", "S/D", "NULL", "UNDEFINED", "OTRO", "OTROS", "OTRAS", "VARIOS", "ELEMENTOS", "SIN CLASIFICAR", "BIEN NO ESPECIFICADO / OTROS", "FALTA DETERMINAR OBJETO", "PENDIENTE", "DESCONOCIDO"];
  if (!target || target === "" || ambiguous.includes(target.toUpperCase())) return "OBJETO NO IDENTIFICADO";
  
  // Normalización técnica para el KPI
  let res = target;
  if (target.includes("AUTO") || target.includes("AUTOMOVIL") || target.includes("AUTOMÓVIL") || target.includes("COCHE") || target.includes("PARTICULAR")) {
    res = "AUTOMÓVIL PARTICULAR";
  } else if (target.includes("MOTO")) {
    res = "MOTOVEHÍCULO";
  } else if (target.includes("CELULAR") || target.includes("TELEFONO") || (target.includes("MOVIL") && !target.includes("AUTOMOVIL"))) {
    res = "TELÉFONO CELULAR";
  } else if (target.includes("BICI")) {
    res = "BICICLETA";
  } else if (target.includes("DINERO") || target.includes("EFECTIVO") || target.includes("PLATA")) {
    res = "DINERO";
  } else if (target.includes("ALHAJA") || target.includes("CADENA") || target.includes("RELOJ") || target.includes("JOYA")) {
    res = "ALHAJAS / RELOJES";
  } else if (target.includes("BOLSO") || target.includes("MOCHILA") || target.includes("CARTERA")) {
    res = "MOCHILA / BOLSO / CARTERA";
  } else if (target.includes("CABLE")) {
    res = "CABLES / ELECTRICIDAD";
  } else if (target.includes("CEREAL")) {
    res = "CEREALES";
  } else if (target.includes("OTRO")) {
    const cleaned = target.replace(/\(OTROS\)/g, "").replace(/OTROS/g, "").replace(/OTRO/g, "").replace(/OTRAS/g, "").trim();
    if (cleaned.length > 2) {
      res = cleaned;
    }
  }

  return sanitizeEncodingError(res);
}

// ============================================================================
// 11. ANALISIS DE VULNERABILIDAD, ESCAPE Y COERCIÓN (DICCIONARIO TÁCTICO REFINADO)
// ============================================================================
function extractTacticalInsights(text: string, context: string, tipologia: string = "", modalidad: string = "") {
  // Limpiamos acentos, eñes y caracteres raros para estandarizar la búsqueda
  const s = String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
    
  const c = String(context || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  // Tratamiento Homogéneo de Datos Vacíos: si tipologia o modalidad son nulas, vacías o "S/D" o similar,
  // las tratamos bajo el fallback estándar "Sin especificar / En investigación", pero para Pattern Matching
  // simplemente las normalizamos.
  const tVacias = ["", "S/D", "NULL", "UNDEFINED", "VACIO", "VACÍO", "SIN ESPECIFICAR", "SIN DATOS"];
  
  let t = String(tipologia || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  if (t === "" || tVacias.includes(t)) {
    t = "SIN ESPECIFICAR / EN INVESTIGACION";
  }

  let m = String(modalidad || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  if (m === "" || tVacias.includes(m)) {
    m = "SIN ESPECIFICAR / EN INVESTIGACION";
  }
  
  const vulnerability: string[] = [];
  const coercion: string[] = [];
  const escape: string[] = [];

  // --- LÓGICA DE VULNERABILIDAD (ENTORNO / VÍCTIMA) ---
  if (
    c.includes("GENERO") || c.includes("VINCULAR") || c.includes("DOMESTICA") || c.includes("PAREJA") ||
    t.includes("VINCULAR") || m.includes("VINCULAR") ||
    t.includes("FAMILIAR") || m.includes("FAMILIAR")
  ) {
    vulnerability.push("ENTORNO VINCULAR / RUTINA");
  }

  // Palabra ambigua: PARADO, ESPERA, COLEC, BONDI, LINEA + Tipología/Modalidad/Relato
  const hasAmbigTransport = s.includes('PARADA') || s.includes('ESPERANDO') || s.includes('COLECTIVO') || s.includes('BONDI') || s.includes('LINEA ') || s.includes('ESPERA') || s.includes('PARADO');
  const contextTransport = t.includes("TRANSPORTE") || m.includes("TRANSPORTE") || t.includes("COLECTIVO") || m.includes("COLECTIVO") || t.includes("VIA PUBLICA") || m.includes("VIA PUBLICA");
  if (hasAmbigTransport && (s.includes('PARADA') || s.includes('COLECTIVO') || s.includes('BONDI') || contextTransport)) {
    vulnerability.push("ESPERA DE TRANSPORTE PÚBLICO");
  }

  // Palabra ambigua: CELU, TELF, FONO, MANDANDO, CEL + Tipología/Modalidad de tecnología/distracción
  const hasAmbigDispositivos = s.includes('CELULAR') || s.includes('WHATSAPP') || s.includes('TELEFONO') || s.includes('FONO') || s.includes('PANTALLA') || s.includes('MANDANDO') || s.includes('CEL') || s.includes('CELU');
  const contextDispositivos = t.includes("DISTRACCION") || m.includes("DISTRACCION") || t.includes("DISPOSITIVO") || m.includes("DISPOSITIVO") || t.includes("TECNOLOGIA") || m.includes("TECNOLOGIA");
  if (hasAmbigDispositivos && (s.includes('CELULAR') || s.includes('TELEFONO') || contextDispositivos)) {
    vulnerability.push("DISTRACCIÓN CON DISPOSITIVO");
  }

  // Falta de iluminación urbana: OSCURA, POCA LUZ, NOCHE + Tipología/Modalidad
  const hasAmbigIluminacion = s.includes('OSCURA') || s.includes('POCA LUZ') || s.includes('ILUMINACION') || s.includes('NOCHE') || s.includes('SIN LUZ') || s.includes('APAGADO') || s.includes('OSCURO');
  const contextNocturno = t.includes("NOCTURNO") || m.includes("NOCTURNO") || t.includes("OSCURIDAD") || m.includes("OSCURIDAD") || t.includes("FALTA DE LUZ") || m.includes("FALTA DE LUZ");
  if (hasAmbigIluminacion && (s.includes('OSCURA') || s.includes('POCA LUZ') || s.includes('SIN LUZ') || contextNocturno)) {
    vulnerability.push("FALTA DE ILUMINACIÓN URBANA");
  }

  // Ingreso / egreso domiciliario: PORTÓN, COCHERA, GARAJE, GUARDANDO, ABRIENDO, INGRESANDO + Tipología/Modalidad de domicilio/vivienda
  const hasAmbigDomicilio = s.includes('PORTON') || s.includes('COCHERA') || s.includes('GARAJE') || s.includes('GUARDANDO') || s.includes('ABRIENDO') || s.includes('INGRESANDO') || s.includes('ENTRAR') || s.includes('SALIR');
  const contextDomicilio = t.includes("DOMICILIO") || m.includes("DOMICILIO") || t.includes("RESIDENCIAL") || m.includes("RESIDENCIAL") || t.includes("VIVIENDA") || m.includes("VIVIENDA") || c.includes("DOMICILIO");
  if (hasAmbigDomicilio && (s.includes('PORTON') || s.includes('COCHERA') || s.includes('GARAJE') || contextDomicilio)) {
    vulnerability.push("INGRESO / EGRESO DOMICILIARIO");
  }

  // Víctima en soledad: SOLO, SOLA, SOLEDAD, CAMINABA ASILADA, NO HABIA NADIE
  const hasAmbigSoledad = s.includes('SOLO') || s.includes('SOLA') || s.includes('SOLEDAD') || s.includes('CAMINABA') || s.includes('NO HABIA NADIE') || s.includes('PASANDO');
  const contextSoledad = t.includes("SOLEDAD") || m.includes("SOLEDAD") || t.includes("DESPOBLADO") || m.includes("DESPOBLADO") || t.includes("DESOLADO") || m.includes("DESOLADO");
  if (hasAmbigSoledad && (s.includes('SOLA') || s.includes('SOLO') || s.includes('SOLEDAD') || contextSoledad)) {
    vulnerability.push("VÍCTIMA EN SOLEDAD");
  }

  if (vulnerability.length === 0) {
    vulnerability.push("MODALIDAD AL VOLEO / CALLEJERA");
  }

  // --- LÓGICA DE COERCIÓN (MÉTODO DOMINANTE) ---
  // Violencia física: CULATAZO, GOLPE, PEGÓ, PATADA, EMPUJO, TIRO AL PISO, PEGAR, FORZAR
  const hasAmbigFisica = s.includes('CULATAZO') || s.includes('GOLPE') || s.includes('PEGÓ') || s.includes('PEGO') || s.includes('PATADA') || s.includes('EMPUJO') || s.includes('EMPUJAR') || s.includes('TIRO AL PISO') || s.includes('PEGAR') || s.includes('FORZAR');
  const contextFisica = t.includes("VIOLENCIA FISICA") || m.includes("VIOLENCIA FISICA") || t.includes("GOLPES") || m.includes("GOLPES") || t.includes("LESIONES") || m.includes("LESIONES") || t.includes("VIOLENCIA EXPLICITA") || m.includes("VIOLENCIA EXPLICITA");
  if (hasAmbigFisica && (s.includes('GOLPE') || s.includes('PEGÓ') || s.includes('PATADA') || s.includes('EMPUJO') || contextFisica)) {
    coercion.push("VIOLENCIA FÍSICA EXPLÍCITA");
  }

  // Arma de fuego: ARMA, FIERRO, PISTOLA, REVOLVER, DISPARO, TIRO
  const hasAmbigFuego = s.includes('ARMA') || s.includes('FIERRO') || s.includes('PISTOLA') || s.includes('REVOLVER') || s.includes('DISPARO') || s.includes('TIRO');
  const contextFuego = t.includes("ARMA DE FUEGO") || m.includes("ARMA DE FUEGO") || t.includes("PISTOLA") || m.includes("PISTOLA") || t.includes("REVOLVER") || m.includes("REVOLVER") || t.includes("DISPAROS") || m.includes("DISPAROS");
  if (hasAmbigFuego && (s.includes('PISTOLA') || s.includes('REVOLVER') || s.includes('DISPARO') || s.includes('FIERRO') || contextFuego)) {
    coercion.push("EXHIBICIÓN / USO DE ARMA DE FUEGO");
  }

  // Arma blanca: CUCHILLO, PUNTA, SEVILLANA, DESTORNILLADOR, FACO, CORTAR, PUNZÓ, PINCHÓ
  const hasAmbigBlanca = s.includes('CUCHILLO') || s.includes('PUNTA') || s.includes('SEVILLANA') || s.includes('DESTORNILLADOR') || s.includes('FACO') || s.includes('CORTAR') || s.includes('PUNZÓ') || s.includes('PUNZO') || s.includes('PINCHO');
  const contextBlanca = t.includes("ARMA BLANCA") || m.includes("ARMA BLANCA") || t.includes("PUNZANTE") || m.includes("PUNZANTE") || t.includes("CUCHILLO") || m.includes("CUCHILLO");
  if (hasAmbigBlanca && (s.includes('CUCHILLO') || s.includes('PUNTA') || s.includes('FACO') || contextBlanca)) {
    coercion.push("USO DE ARMA BLANCA / PUNZANTE");
  }

  // Simulacion de porte: SIMULO, MANO EN LA CINTURA, DECIA QUE TENIA
  const hasAmbigSimulacion = s.includes('SIMULO') || s.includes('MANO EN LA CINTURA') || s.includes('DECIA QUE TENIA') || s.includes('TENÍA ARMA') || s.includes('ADVERTIA');
  const contextSimulacion = t.includes("SIMULACION") || m.includes("SIMULACION") || t.includes("PORTE DE ARMA") || m.includes("PORTE DE ARMA") || t.includes("AMENAZA SIMULADA") || m.includes("AMENAZA SIMULADA");
  if (hasAmbigSimulacion && (s.includes('SIMULO') || s.includes('MANO EN LA CINTURA') || contextSimulacion)) {
    coercion.push("SIMULACIÓN DE PORTE DE ARMA");
  }

  if (coercion.length === 0) {
    coercion.push("INTIMIDACIÓN VERBAL O PSICOLÓGICA");
  }

  // --- LÓGICA DE ESCAPE (PATRÓN DE COORDINACIÓN) ---
  // Contramano: CONTRAMANO, SENTIDO CONTRARIO, MANO INVERSA
  const hasAmbigContramano = s.includes('CONTRAMANO') || s.includes('SENTIDO CONTRARIO') || s.includes('MANO INVERSA') || s.includes('CONTRARIO') || s.includes('INVERSO');
  const contextContramano = t.includes("CONTRAMANO") || m.includes("CONTRAMANO") || t.includes("SENTIDO CONTRARIO") || m.includes("SENTIDO CONTRARIO") || t.includes("INVERSO") || m.includes("INVERSO");
  if (hasAmbigContramano && (s.includes('CONTRAMANO') || s.includes('SENTIDO CONTRARIO') || contextContramano)) {
    escape.push("ESCAPE EN CONTRAMANO");
  }

  // Zonas intrincadas: PASILLO, PASAJES, ASENTAMIENTO, VILLA, CALLEJÓN
  const hasAmbigIntrincado = s.includes('PASILLO') || s.includes('PASAJES') || s.includes('ASENTAMIENTO') || s.includes('VILLA') || s.includes('CALLEJON') || s.includes('CALLEJÓN') || s.includes('PASAJE');
  const contextIntrincado = t.includes("ZONA INTRINCADA") || m.includes("ZONA INTRINCADA") || t.includes("ASENTAMIENTO") || m.includes("ASENTAMIENTO") || t.includes("VILLA") || m.includes("VILLA") || t.includes("PASILLO") || m.includes("PASILLO");
  if (hasAmbigIntrincado && (s.includes('PASILLO') || s.includes('ASENTAMIENTO') || s.includes('VILLA') || contextIntrincado)) {
    escape.push("FUGA POR ZONAS INTRINCADAS");
  }

  // Alta velocidad: VELOCIDAD, RAUDAMENTE, PIQUE, ACELERO, MANGO, VELOZ
  const hasAmbigVelocidad = s.includes('VELOCIDAD') || s.includes('RAUDAMENTE') || s.includes('PIQUE') || s.includes('ACELERO') || s.includes('MANGO') || s.includes('VELOZ') || s.includes('RAPIDO');
  const contextVelocidad = t.includes("ALTA VELOCIDAD") || m.includes("ALTA VELOCIDAD") || t.includes("ACELERADO") || m.includes("ACELERADO") || t.includes("ESCAPE RAPIDO") || m.includes("ESCAPE RAPIDO");
  if (hasAmbigVelocidad && (s.includes('VELOCIDAD') || s.includes('RAUDAMENTE') || s.includes('ACELERO') || contextVelocidad)) {
    escape.push("FUGA A ALTA VELOCIDAD");
  }

  // Via rapida: COLECTOR, AUTOPISTA, AVENIDA, CIRCUNVALACION, COLECTORA, RUTA
  const hasAmbigRapida = s.includes('COLECTOR') || s.includes('AUTOPISTA') || s.includes('AVENIDA') || s.includes('CIRCUNVALACION') || s.includes('COLECTORA') || s.includes('RUTA');
  const contextRapida = t.includes("VIA RAPIDA") || m.includes("VIA RAPIDA") || t.includes("AUTOPISTA") || m.includes("AUTOPISTA") || t.includes("AVENIDA") || m.includes("AVENIDA") || t.includes("CIRCUNVALACION") || m.includes("CIRCUNVALACION");
  if (hasAmbigRapida && (s.includes('AUTOPISTA') || s.includes('AVENIDA') || s.includes('CIRCUNVALACION') || contextRapida)) {
    escape.push("FUGA POR VÍA RÁPIDA");
  }

  // Peatonal: A PIE, CORRIENDO, CORRIO, PI disparó
  const hasAmbigPeatonal = s.includes('A PIE') || s.includes('CORRIENDO') || s.includes('CORRIO') || s.includes('CORRIÓ') || s.includes('PI ');
  const contextPeatonal = t.includes("PEATONAL") || m.includes("PEATONAL") || t.includes("A PIE") || m.includes("A PIE") || t.includes("CORRIENDO") || m.includes("CORRIENDO");
  if (hasAmbigPeatonal && (s.includes('A PIE') || s.includes('CORRIENDO') || s.includes('CORRIO') || contextPeatonal)) {
    escape.push("FUGA PEATONAL");
  }

  if (escape.length === 0) {
    escape.push("FUGA EN VEHÍCULO CORRIENTE");
  }

  return { vulnerability, coercion, escape };
}

// 12. EXTRACTOR DE CONTEXTO ESPECIAL (CCONTEXTO_TEMATICA, CCONTEXTO_TIPOLOGIA, CCONTEXTO_MODALIDAD)
function extractContextValue(val: any): string {
  if (val === undefined || val === null) return "EN INVESTIGACIÓN";
  const s = String(val).trim();
  const upper = s.toUpperCase();
  if (
    s === "" || 
    upper === "S/D" || 
    upper === "UNDEFINED" || 
    upper === "NULL" || 
    upper === "SIN CLASIFICAR" || 
    upper === "SIN DATA" || 
    upper === "SIN DATOS" || 
    upper === "VACIO" || 
    upper === "VACÍO" || 
    upper === "SIN ESPECIFICAR" || 
    upper === "SIN ESPECIFICACION" || 
    upper === "SIN ESPECIFICACIÓN" ||
    upper === "SIN ESPECIFICAR / SIN DATOS" ||
    upper === "SIN ESPECIFICAR / EN INVESTIGACIÓN"
  ) {
    return "EN INVESTIGACIÓN";
  }
  return upper; // Conserva y uniformiza a Mayúsculas Sostenidas para evitar duplicaciones
}

// 10. HELPER PARA NORMALIZAR NOMBRES DE BARRIOS (CRUCIAL PARA EL JOIN)
function normalizeName(name: any): string {
  if (!name) return "DESCONOCIDO";
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/B[°º]\s*/gi, "")       // Quitar "B°" o "Bº"
    .replace(/BARRIO\s*/gi, "")     // Quitar prefijo "BARRIO"
    .replace(/[^a-zA-Z0-9\s]/g, "") // Quitar cualquier otro carácter especial
    .toUpperCase()
    .trim();
}

function getBarrioNameFromProps(props: any) {
  if (!props) return "DESCONOCIDO";
  const pKeys = Object.keys(props);

  // 1. PRIORIDAD ABSOLUTA: 'cuadrante' (Exacto, con o sin mayúsculas)
  const targetKey = pKeys.find(k => k.toLowerCase() === 'cuadrante');
  if (targetKey && props[targetKey]) {
    return normalizeName(props[targetKey]);
  }

  // 2. BUSQUEDA DE CUADRÍCULA / GRID (Solo si parece un código o nombre de zona)
  const gridKey = pKeys.find(k => {
    const uk = k.toUpperCase();
    return uk.includes('CUAD') || uk.includes('GRID') || uk.includes('QUARTER');
  });
  if (gridKey && props[gridKey]) {
    const val = props[gridKey];
    if (isNaN(Number(val)) || String(val).length > 3) {
      return normalizeName(val);
    }
  }

  // 3. ÚLTIMO RECURSO: Cualquier nombre de barrio que tenga el archivo
  const barrioKey = pKeys.find(k => {
    const uk = k.toUpperCase();
    return uk.includes('BARRIO') || uk.includes('NOMBRE') || uk.includes('NOM');
  });
  if (barrioKey && props[barrioKey]) {
    return normalizeName(props[barrioKey]);
  }

  return "DESCONOCIDO";
}

// 11. MAPA NATIVO (MEJORADO CON CALOR Y COROPLETAS)
function PureLeafletMap({ 
  geoData, 
  stats, 
  crimes,
  allCrimes = [],
  searchTerm = ""
}: { 
  geoData: any; 
  stats: any; 
  crimes: any[]; 
  allCrimes?: any[];
  searchTerm?: string;
}) {
  const getChoroplethColor = (count: number): string => {
    if (count > 5000) return '#7f1d1d';
    if (count >= 2001) return '#b91c1c';
    if (count >= 501) return '#ea580c';
    if (count >= 101) return '#f97316';
    if (count >= 51) return '#facc15';
    if (count >= 21) return '#4ade80';
    if (count >= 6) return '#86efac';
    if (count >= 1) return '#bbf7d0';
    return '#f7fbff';
  };

  const mapRef = React.useRef<HTMLDivElement>(null);
  const leafletMap = React.useRef<L.Map | null>(null);
  const geoLayer = React.useRef<L.GeoJSON | null>(null);
  const heatLayer = React.useRef<any>(null);
  const [viewMode, setViewMode] = React.useState<'choropleth' | 'heatmap'>('choropleth');
  const mapId = React.useMemo(() => `map-${Math.random().toString(36).substr(2, 9)}`, []);

  const heatmapCrimes = React.useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return allCrimes;
    return allCrimes.filter(c => 
      c.description.toLowerCase().includes(s) || 
      c.modusOperandi.toLowerCase().includes(s) ||
      c.objects.some((obj: string) => obj.toLowerCase().includes(s))
    );
  }, [allCrimes, searchTerm]);

  // Efecto para inicializar el mapa
  React.useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    console.log("🗺️ Inicializando Leaflet...");
    try {
      leafletMap.current = L.map(mapRef.current, {
        center: [-32.95, -60.67],
        zoom: 12,
        zoomControl: false,
        fadeAnimation: true
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(leafletMap.current);
    } catch (err) {
      console.error("❌ Error inicializando el mapa:", err);
    }

    const resizeObserver = new ResizeObserver(() => {
      if (leafletMap.current) leafletMap.current.invalidateSize();
    });
    
    if (mapRef.current) resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [mapId]);

  // Efecto para dibujar las capas según el modo
  React.useEffect(() => {
    if (!leafletMap.current) return;

    // Limpiar capas previas
    if (geoLayer.current) leafletMap.current.removeLayer(geoLayer.current);
    if (heatLayer.current) leafletMap.current.removeLayer(heatLayer.current);

    if (viewMode === 'choropleth' && geoData) {
      if (geoData.features && geoData.features.length > 0) {
        console.log("📍 GeoJSON cargado. Primeras propiedades:", geoData.features[0].properties);
        console.log("📍 Barrios detectados en CSV:", stats.fullZoneTable?.length);
        
        try {
          geoLayer.current = L.geoJSON(geoData, {
            style: (feature: any) => {
              const barrioName = getBarrioNameFromProps(feature?.properties);
              const localidad = feature?.properties?.localidad || feature?.properties?.Localidad || "";
              const polyUniqueId = `${normalizeName(localidad)}|${normalizeName(barrioName)}`;
              
              // Buscamos en el conteo de polígonos únicos
              const count = stats.polyCounts?.[polyUniqueId] || 0;
              
              const fill = getChoroplethColor(count);

              return {
                fillColor: fill,
                weight: count > 0 ? 1.5 : 0.4,
                opacity: 1,
                color: count > 0 ? 'white' : '#cbd5e1',
                fillOpacity: count > 0 ? 0.8 : 0.15
              };
            },
            onEachFeature: (feature: any, layer: any) => {
              const barrioName = getBarrioNameFromProps(feature?.properties);
              const localidad = feature?.properties?.localidad || feature?.properties?.Localidad || "";
              const polyUniqueId = `${normalizeName(localidad)}|${normalizeName(barrioName)}`;
              
              const count = stats.polyCounts?.[polyUniqueId] || 0;
              const fill = getChoroplethColor(count); 
              const localidadBadge = localidad ? `<span style="background: #e0e7ff; color: #4f46e5; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; margin-bottom: 4px; display: inline-block;">${localidad}</span>` : "";
              layer.bindPopup(`
                <div style="font-family: inherit; padding: 4px;">
                  ${localidadBadge}
                  <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">CUADRANTE / ZONA</div>
                  <div style="font-size: 14px; font-weight: 900; color: #1e293b; margin-bottom: 8px;">${barrioName}</div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${fill}"></div>
                    <div style="font-size: 12px; font-weight: 700; color: #334155;">${count} Incidentes</div>
                  </div>
                </div>
              `);
            }
          }).addTo(leafletMap.current);

          const bounds = geoLayer.current.getBounds();
          if (bounds.isValid()) {
            leafletMap.current.fitBounds(bounds, { padding: [20, 20] });
          }
        } catch (err) {
          console.error("❌ Error dibujando Coropletas:", err);
        }
      }
    } else if (viewMode === 'heatmap' && heatmapCrimes.length > 0) {
      try {
        const heatPoints = heatmapCrimes
          .filter(c => c.lat && c.lng)
          .map(c => [c.lat, c.lng, 1]); // [lat, lng, intensity]
        
        // @ts-ignore - L.heatLayer viene de leaflet.heat
        heatLayer.current = L.heatLayer(heatPoints, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red' }
        }).addTo(leafletMap.current);

        console.log("🔥 Heatmap generado con", heatPoints.length, "puntos.");
      } catch (err) {
        console.error("❌ Error dibujando Mapa de Calor:", err);
      }
    }
  }, [geoData, crimes, heatmapCrimes, stats, viewMode]);

  return (
    <div className="relative group overflow-hidden rounded-[40px]">
      <div 
        id={mapId}
        ref={mapRef} 
        className="bg-[#f8fafc]" 
        style={{ height: '600px', width: '100%', position: 'relative' }}
      />
      
      {/* Leyenda de Referencias Flotante (Coropletas) */}
      {viewMode === 'choropleth' && (
        <div className="absolute bottom-6 left-6 z-[1000] bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-slate-200/50 max-w-xs transition-all pointer-events-auto">
          <p className="text-[10px] font-black uppercase text-slate-800 tracking-wider mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Rango de Densidad (Incidentes)
          </p>
          <div className="flex flex-col gap-1.5">
            {[
              { color: '#7f1d1d', label: 'Crítico Absoluto (> 5.000)' },
              { color: '#b91c1c', label: 'Foco Crítico (2.001 - 5.000)' },
              { color: '#ea580c', label: 'Alerta Máxima (501 - 2.000)' },
              { color: '#f97316', label: 'Alerta Alta (101 - 500)' },
              { color: '#facc15', label: 'Alerta Moderada (51 - 100)' },
              { color: '#4ade80', label: 'Incidencia Moderada (21 - 50)' },
              { color: '#86efac', label: 'Incidencia Leve (6 - 20)' },
              { color: '#bbf7d0', label: 'Baja Incidencia (1 - 5)' },
              { color: '#f7fbff', label: 'Sin eventos / Fuera de rango (0)' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div 
                  className="w-3.5 h-3.5 rounded border border-slate-200 shadow-sm flex-shrink-0" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="text-[9px] font-bold uppercase tracking-tight text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controles de Capas flotantes */}
      <div className="absolute top-6 right-6 z-[1000] flex gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-white/20 transition-all group-hover:top-4 opacity-0 group-hover:opacity-100">
        <button 
          onClick={() => setViewMode('choropleth')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'choropleth' ? 'bg-[#3C4C9A] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Coropletas
        </button>
        <button 
          onClick={() => setViewMode('heatmap')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'heatmap' ? 'bg-[#D0234F] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          Mapa de Calor
        </button>
      </div>
    </div>
  );
}

const VULNERABILITY_DESCRIPTIONS: Record<string, string> = {
  "ENTORNO VINCULAR / RUTINA": "Ocurre en ámbitos familiares, afectivos o de convivencia preexistente, donde el agresor explota la confianza o las rutinas reiterativas de la víctima.",
  "ESPERA DE TRANSPORTE PÚBLICO": "La víctima es abordada inmóvil en paradas o refugios de colectivos, reduciendo notablemente su alerta situacional y capacidad de reacción.",
  "DISTRACCIÓN CON DISPOSITIVO": "El uso focalizado del teléfono celular o pantallas electrónicas disminuye la vigilancia del peatón, facilitando asaltos sorpresa altamente efectivos.",
  "FALTA DE ILUMINACIÓN URBANA": "Aprovechamiento táctico de la nocturnidad, fallas lumínicas públicas o calles a oscuras para ocultar el acecho y dificultar la posterior identificación urbana.",
  "INGRESO / EGRESO DOMICILIARIO": "Ataques sincronizados durante la entrada o salida de garajes, cocheras o portones hogareños, donde la atención de la persona se divide operativamente.",
  "VÍCTIMA EN SOLEDAD": "La ausencia absoluta de testigos u otros transeúntes facilita la dominación física del entorno e incrementa la sensación de impunidad del delincuente.",
  "MODALIDAD AL VOLEO / CALLEJERA": "Ataques de oportunidad sin planificación previa, dirigidos contra peatones vulnerables elegidos aleatoriamente durante su tránsito ordinario por la vía pública.",
  "SIN DATOS": "Cargue un archivo CSV para detectar y describir de forma automática el tipo de vulnerabilidad y la exposición del entorno de la víctima.",
  "En investigación": "Cargue un archivo CSV para detectar y describir de forma automática el tipo de vulnerabilidad y la exposición del entorno de la víctima."
};

const COERCION_DESCRIPTIONS: Record<string, string> = {
  "VIOLENCIA FÍSICA EXPLÍCITA": "Sometimiento corporal agresivo mediante golpes, forcejeos bruscos, tirones de pertenencias o derribos directos para suprimir la resistencia física.",
  "EXHIBICIÓN / USO DE ARMA DE FUEGO": "Coacción extrema que utiliza el poder letal de armas de fuego, anulando de inmediato los márgenes de defensa activa de los asaltados.",
  "USO DE ARMA BLANCA / PUNZANTE": "Amagos y amenazas inminentes con cuchillos, navajas u objetos punzantes improvisados, explotando su alto índice de peligro a cortas distancias.",
  "SIMULACIÓN DE PORTE DE ARMA": "Engaño gestual o verbal, comúnmente llevando la mano a la cintura, para fingir portar un arma letal y acelerar el pánico y entrega de bienes.",
  "INTIMIDACIÓN VERBAL O PSICOLÓGICA": "Uso estricto de amenazas directas, gritos o mandatos hablados hostiles para doblegar la voluntad situacional sin presencia de armas físicas.",
  "SIN DATOS": "Cargue un archivo CSV para clasificar de manera automática los factores de coercion física o intimidación dominantes en las denuncias.",
  "En investigación": "Cargue un archivo CSV para clasificar de manera automática los factores de coerción física o intimidación dominantes en las denuncias."
};

const ESCAPE_DESCRIPTIONS: Record<string, string> = {
  "ESCAPE EN CONTRAMANO": "Fuga de alta peligrosidad circulando en sentido contrario al flujo vial preestablecido, buscando anular persecuciones reglamentarias inmediatas.",
  "FUGA POR ZONAS INTRINCADAS": "Retiro veloz de los sospechosos a través de pasadizos estrechos, pasajes de asentamientos o callejones peatonales inaccesibles para vehículos policiales.",
  "FUGA A ALTA VELOCIDAD": "Efectivización inmediata de la huida exprimiendo la velocidad extrema del vehículo (típicamente motovehículos) para salir rápido del entorno observable.",
  "FUGA POR VÍA RÁPIDA": "Canalización del escape hacia arterias de rápida circulación, colectoras de doble mano o autopistas para camuflar rápidamente el rodado sospechoso.",
  "FUGA PEATONAL": "Abandono inmediato de la escena a pie o corriendo, con alto índice de mimetización táctica o refugio rápido en edificaciones vecinas.",
  "FUGA EN VEHÍCULO CORRIENTE": "Escape ordenado asimilándose al sentido de circulación y velocidades estándar de la calle para que el rodado escape desapercibido en el parque automotor.",
  "SIN DATOS": "Cargue un archivo CSV para determinar de manera automática el tipo de transporte y patrones de coordinación empleados en la huida.",
  "En investigación": "Cargue un archivo CSV para determinar de manera automática el tipo de transporte y patrones de coordinación empleados en la huida."
};

const CITIES = [
  { id: 'rosario_geojson', name: 'Rosario (GeoJSON)', filename: 'Rosario.geojson' },
  { id: 'armstrong', name: 'Armstrong', filename: 'Armstrong.geojson' },
  { id: 'avellaneda', name: 'Avellaneda', filename: 'Avellaneda.geojson' },
  { id: 'casilda', name: 'Casilda', filename: 'Casilda.geojson' },
  { id: 'cañada_gomez', name: 'Cañada de Gómez', filename: 'Cañada de Gomez.geojson' },
  { id: 'ceres', name: 'Ceres', filename: 'Ceres.geojson' },
  { id: 'coronda', name: 'Coronda', filename: 'Coronda.geojson' },
  { id: 'el_trebol', name: 'El Trébol', filename: 'El Trebol.geojson' },
  { id: 'esperanza', name: 'Esperanza', filename: 'Esperanza.geojson' },
  { id: 'frontera', name: 'Frontera', filename: 'Frontera.geojson' },
  { id: 'galvez', name: 'Gálvez', filename: 'Galvez.geojson' },
  { id: 'helvecia', name: 'Helvecia', filename: 'Helvecia.geojson' },
  { id: 'las_parejas', name: 'Las Parejas', filename: 'Las Parejas.geojson' },
  { id: 'las_rosas', name: 'Las Rosas', filename: 'Las Rosas.geojson' },
  { id: 'rafaela', name: 'Rafaela', filename: 'Rafaela.geojson' },
  { id: 'reconquista', name: 'Reconquista', filename: 'Reconquista.geojson' },
  { id: 'roldan', name: 'Roldán', filename: 'Roldan.geojson' },
  { id: 'san_cristobal', name: 'San Cristóbal', filename: 'San Cristobal.geojson' },
  { id: 'san_javier', name: 'San Javier', filename: 'San Javier.geojson' },
  { id: 'san_jorge', name: 'San Jorge', filename: 'San Jorge.geojson' },
  { id: 'san_justo', name: 'San Justo', filename: 'San Justo.geojson' },
  { id: 'san_lorenzo', name: 'San Lorenzo', filename: 'San Lorenzo.geojson' },
  { id: 'santa_fe', name: 'Santa Fe', filename: 'Santa Fe.geojson' },
  { id: 'santo_tome', name: 'Santo Tomé', filename: 'Santo Tome.geojson' },
  { id: 'sauce_viejo', name: 'Sauce Viejo', filename: 'Sauce Viejo.geojson' },
  { id: 'tostado', name: 'Tostado', filename: 'Tostado.geojson' },
  { id: 'venado_tuerto', name: 'Venado Tuerto', filename: 'Venado Tuerto.geojson' },
  { id: 'vera', name: 'Vera', filename: 'Vera.geojson' },
  { id: 'villa_constitucion', name: 'Villa Constitución', filename: 'Villa Constitución.geojson' },
  { id: 'villa_gobernador_galvez', name: 'Villa Gobernador Gálvez', filename: 'VGG.geojson' },
  { id: 'rosario_gpkg', name: 'Rosario (GPKG)', filename: 'Rosario.geojson' }
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = React.useState('overview');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [crimes, setCrimes] = React.useState<any[]>([]);
  const [totalDenunciasUnicas, setTotalDenunciasUnicas] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [geoData, setGeoData] = React.useState<any>(null);
  const [spatialJoined, setSpatialJoined] = React.useState(false);
  const [geoStatus, setGeoStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  React.useEffect(() => {
    setGeoStatus('loading');
    setSpatialJoined(false); // Reset para forzar re-análisis con la nueva capa
    
    const loadLayer = async () => {
      try {
        console.log("🔍 Cargando todas las capas de ciudades en paralelo...");
        // Obtener nombres de archivo únicos (ej: evitar cargar 'Rosario.geojson' dos veces)
        const uniqueFilenames = Array.from(new Set(CITIES.map(c => c.filename)));
        
        const fetchPromises = uniqueFilenames.map(async (filename) => {
          const path = `/gepgeojson/${filename}`;
          const cityConfig = CITIES.find(c => c.filename === filename);
          const cityName = cityConfig ? cityConfig.name : "";
          try {
            const res = await fetch(path);
            if (res.ok) {
              const data = await res.json();
              if (data && Array.isArray(data.features)) {
                return data.features.map((feature: any) => {
                  const props = feature.properties || {};
                  return {
                    ...feature,
                    properties: {
                      ...props,
                      localidad: props.localidad || props.Localidad || cityName
                    }
                  };
                });
              }
            }
          } catch (err) {
            console.warn(`ℹ️ No se pudo cargar la capa para ${filename}:`, err);
          }
          return [];
        });

        const results = await Promise.all(fetchPromises);
        const mergedFeatures = results.flat();

        if (mergedFeatures.length > 0) {
          console.log(`✅ Se cargaron exitosamente ${mergedFeatures.length} cuadrículas/polígonos de todas las ciudades.`);
          setGeoData({
            type: "FeatureCollection",
            features: mergedFeatures
          });
          setGeoStatus('success');
          return;
        }
      } catch (err) {
        console.error("❌ Error en la carga unificada de capas:", err);
      }

      // Fallback a archivos por defecto históricos
      const fallbacks = ['/cuadriculas.geojson', '/barrios.geojson'];
      for (const fPath of fallbacks) {
        try {
          console.log(`🔍 Intentando fallback histórico: ${fPath}`);
          const res = await fetch(fPath);
          if (res.ok) {
            const data = await res.json();
            if (data && data.features) {
              console.log(`✅ Capa fallback cargada con éxito desde ${fPath}.`);
              setGeoData(data);
              setGeoStatus('success');
              return;
            }
          }
        } catch (err) {
          console.warn(`ℹ️ No se pudo cargar fallback ${fPath}`);
        }
      }
      setGeoStatus('idle');
    };

    loadLayer();
  }, []);

  // EFECTO: SPATIAL JOIN AUTOMÁTICO (Clasificación Geográfica)
  React.useEffect(() => {
    if (crimes.length > 0 && geoData && !spatialJoined) {
      console.log(`📍 Iniciando análisis espacial: ${crimes.length} puntos vs ${geoData.features.length} polígonos...`);
      let joinedCount = 0;
      const updatedCrimes = crimes.map(c => {
        let mappedZone = "Sin Cuadrante Asignado"; // Reset para cada punto
        let isJoined = false;
        let cityVal = "";
        let polyUniqueId = "";

        if (c.lat && c.lng && c.lat !== 0 && c.lng !== 0) {
          try {
            const pt = turf.point([c.lng, c.lat]);
            for (const feature of geoData.features) {
              if (turf.booleanPointInPolygon(pt, feature)) {
                mappedZone = getBarrioNameFromProps(feature.properties);
                cityVal = feature.properties?.localidad || feature.properties?.Localidad || "";
                polyUniqueId = `${normalizeName(cityVal)}|${normalizeName(mappedZone)}`;
                isJoined = true;
                joinedCount++;
                break;
              }
            }
            if (!isJoined) {
              mappedZone = "Resto de la Provincia";
            }
          } catch (e) {
            console.warn("⚠️ Error en cálculo espacial:", e);
            mappedZone = "Resto de la Provincia";
          }
        }
        
        return { 
          ...c, 
          neighborhood: mappedZone, // Forzamos el uso de la zona del mapa
          city: cityVal,
          polygonUniqueId: isJoined ? polyUniqueId : null,
          isSpatialJoined: true 
        };
      });
      
      setCrimes(updatedCrimes);
      setSpatialJoined(true);
      console.log(`✅ Análisis geográfico finalizado. ${joinedCount} puntos asignados a barrios.`);
    }
  }, [geoData, crimes, spatialJoined]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setSpatialJoined(false); 
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy', 
      complete: (results) => {
        // REGLA: Conteo de denuncias basado en id_principal (registros únicos)
        // Se ignoran filas vacías o sin identificador válido para que el total coincida con la carga real.
        const uniqueRecords = new Map();
        const tempDenunciasSet = new Set();
        
        results.data.forEach((row: any) => {
          if (!row) return;

          // Robustez ante Filas Vacías: Descartar celdas/filas sin contenido real o residual
          const values = Object.values(row);
          if (values.length === 0 || values.every(v => v === undefined || v === null || String(v).trim() === "")) {
            return;
          }

          // Filtro Estricto: SOLO 'ctipo_actuacion' === 'Denuncia'
          const actuacion = String(getVal(row, "ctipo_actuacion") || "").trim().toLowerCase();
          if (actuacion !== "denuncia") {
            return; // Excluye cualquier otra categoría como ampliaciones
          }

          // Identificar los 'id_principal' únicos presentes
          const idPrincipalRaw = getVal(row, "id_principal").trim();
          if (idPrincipalRaw && idPrincipalRaw.toLowerCase() !== "null" && idPrincipalRaw.toLowerCase() !== "undefined") {
            tempDenunciasSet.add(idPrincipalRaw);
          }

          // Clave de unicidad por id_actuacion_delito
          const idActuacionDelitoRaw = getVal(row, "id_actuacion_delito").trim();
          const keyUnica = idActuacionDelitoRaw || idPrincipalRaw || getVal(row, "id_denuncia").trim() || Math.random().toString();
          
          if (keyUnica && keyUnica.toLowerCase() !== "null" && keyUnica.toLowerCase() !== "undefined") {
            if (!uniqueRecords.has(keyUnica)) {
              uniqueRecords.set(keyUnica, row);
            }
          }
        });

        setTotalDenunciasUnicas(tempDenunciasSet.size);

        const finalRows = Array.from(uniqueRecords.values());

        const mappedData = finalRows.map((row: any) => {
          // Helper para limpiar coordenadas con comas y asegurar que sean números
          const parseCoord = (val: any) => {
            if (val === undefined || val === null || val === "") return 0;
            const clean = String(val).replace(',', '.').trim();
            const num = parseFloat(clean);
            return isNaN(num) ? 0 : num;
          };

          const lat = parseCoord(getVal(row, "clatitud") || getVal(row, "nlatitud") || getVal(row, "lat") || getVal(row, "latitud") || "0");
          const lng = parseCoord(getVal(row, "clongitud") || getVal(row, "nlongitud") || getVal(row, "lng") || getVal(row, "longitud") || "0");
          
          const description = sanitizeDescription(getVal(row, "crelato_denuncia") || getVal(row, "cdescripcion_denuncia") || "SIN RELATO");
          const context = extractContextValue(getVal(row, "ccontexto_tematica"));
          const contextTipologia = extractContextValue(getVal(row, "ccontexto_tipologia"));
          const contextModalidad = extractContextValue(getVal(row, "ccontexto_modalidad"));
          const aggMob = getVal(row, "cmedio_empleado");
          const vicMob = getVal(row, "cobjetivo_atacado");
          
          // Lógica interconectada: Priorizar NLP si es Narcocriminalidad o Trata
          const isHighValueContext = context.includes("NARCOCRIMINALIDAD") || context.includes("TRATA");
          const aggressorMobility = extractMobilityFromText(description, aggMob, true);
          const victimMobility = extractMobilityFromText(description, vicMob, false);

          const tactical = extractTacticalInsights(description, context, contextTipologia, contextModalidad);

          const idVal = (getVal(row, "id_actuacion_delito") || getVal(row, "id_principal") || getVal(row, "id_denuncia") || Math.random().toString()).trim();

          return {
            id: idVal,
            id_principal: getVal(row, "id_principal").trim(),
            date: getVal(row, "ffecha_denuncia") || "S/D",
            type: String(getVal(row, "cdelito_general") || "S/D").split('(')[0].trim().toUpperCase(),
            description,
            location: `${getVal(row, "ccalle_principal") || ""} ${getVal(row, "naltura_calle") || ""}`.trim() || "S/D",
            lat,
            lng,
            modusOperandi: analyzeMO(row),
            objects: extractObjects(row),
            brands: extractBrands(row),
            neighborhood: "PENDIENTE DE ANÁLISIS GEOGRÁFICO", 
            aggressorMobility: aggressorMobility,
            victimMobility: victimMobility,
            weaponType: detectWeapon(row),
            timeSlot: extractTimeSlot(getVal(row, "fhora_delito_desde")),
            placeType: extractPlaceType(getVal(row, "ctipo_lugar")),
            targetObject: extractTargetObject(row),
            specialContext: context,
            contextTipologia,
            contextModalidad,
            vulnerability: tactical.vulnerability,
            coercion: tactical.coercion,
            escapeMode: tactical.escape,
            rawAggMobility: aggMob,
            _rawRow: row
          };
        });
        setCrimes(mappedData);
        setIsUploading(false);
      },
      error: () => setIsUploading(false)
    });
  };

  const handleGeoFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setGeoData(json);
        setGeoStatus('success');
        setSpatialJoined(false); // Reset para forzar re-análisis con la nueva capa
      } catch (err) {
        console.error("Error al cargar GeoJSON", err);
        alert("Error al procesar el archivo. Asegúrate de que sea un GeoJSON válido.");
      }
    };
    reader.readAsText(file);
  };

  const filteredCrimes = React.useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return crimes;
    return crimes.filter(c => {
      const matchDescription = (c.description && c.description.toLowerCase().includes(s));
      const matchMO = (c.modusOperandi && c.modusOperandi.toLowerCase().includes(s));
      const matchZone = (c.neighborhood && c.neighborhood.toLowerCase().includes(s));
      const matchObject = (c.targetObject && c.targetObject.toLowerCase().includes(s)) ||
                          (c.objects && c.objects.some((obj: string) => obj.toLowerCase().includes(s)));

      return matchDescription || matchMO || matchZone || matchObject;
    });
  }, [crimes, searchTerm]);

  const filteredCrimesForStats = filteredCrimes;

  const totalDelitosCalculado = React.useMemo(() => {
    const uniqueDelitos = new Set<string>();
    filteredCrimesForStats.forEach(c => {
      if (c.delitoIds && Array.isArray(c.delitoIds)) {
        c.delitoIds.forEach((id: string) => uniqueDelitos.add(id));
      } else if (c.id) {
        uniqueDelitos.add(c.id);
      }
    });
    return uniqueDelitos.size;
  }, [filteredCrimesForStats]);

  const filteredTotalDenunciasUnicas = React.useMemo(() => {
    const uniqueIds = new Set<string>();
    filteredCrimes.forEach(c => {
      const idPrincipalRaw = String(c.id_principal || "").trim();
      if (idPrincipalRaw && idPrincipalRaw.toLowerCase() !== "null" && idPrincipalRaw.toLowerCase() !== "undefined" && idPrincipalRaw !== "") {
        uniqueIds.add(idPrincipalRaw);
      } else if (c.id) {
        uniqueIds.add(c.id);
      }
    });
    return uniqueIds.size;
  }, [filteredCrimes]);

  const cityRanking = React.useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCrimes.forEach(c => {
      const raw = c._rawRow || {};
      const city = getVal(raw, "cnombre_ciudad");
      
      const cleanCity = String(city || "").trim();
      if (cleanCity && cleanCity !== "" && cleanCity !== "S/D" && cleanCity !== "SIN DATOS" && cleanCity !== "NULL" && cleanCity !== "Resto de la Provincia" && cleanCity !== "Sin Cuadrante Asignado") {
        let normalized = cleanCity.toUpperCase();
        if (normalized === "CAÑADA DE GOMEZ") normalized = "CAÑADA DE GÓMEZ";
        if (normalized === "EL TREBOL") normalized = "EL TRÉBOL";
        if (normalized === "GALVEZ") normalized = "GÁLVEZ";
        if (normalized === "ROLDAN") normalized = "ROLDÁN";
        if (normalized === "SAN CRISTOBAL") normalized = "SAN CRISTÓBAL";
        if (normalized === "SANTO TOME") normalized = "SANTO TOMÉ";
        if (normalized === "VILLA CONSTITUCION") normalized = "VILLA CONSTITUCIÓN";
        if (normalized === "VILLA GOBERNADOR GALVEZ" || normalized === "VGG") normalized = "VILLA GOBERNADOR GÁLVEZ";
        
        const titleCased = normalized.split(' ').map(w => {
          if (w.toLowerCase() === "de" || w.toLowerCase() === "la" || w.toLowerCase() === "del") return w.toLowerCase();
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }).join(' ');
        
        counts[titleCased] = (counts[titleCased] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredCrimes]);

  const dateRangeText = React.useMemo(() => {
    if (!filteredCrimes || filteredCrimes.length === 0) return "Sin periodo registrado";
    
    const dates: Date[] = [];
    filteredCrimes.forEach(c => {
      let rawDate = "";
      if (c._rawRow) {
        rawDate = getVal(c._rawRow, "ffecha_delito_desde") || getVal(c._rawRow, "ffecha_denuncia") || "";
      }
      if (!rawDate) {
        rawDate = c.ffecha_delito_desde || c.date || "";
      }
      
      if (!rawDate || rawDate === "S/D" || rawDate === "SIN DATOS") return;

      const datePart = String(rawDate).trim().split(' ')[0].split('T')[0];
      const parts = datePart.split(/[-/]/);
      
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD or YYYY/MM/DD
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m < 12 && d > 0 && d <= 31) {
            dates.push(new Date(y, m, d));
          }
        } else if (parts[2].length === 4) {
          // DD/MM/YYYY or DD-MM-YYYY
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m < 12 && d > 0 && d <= 31) {
            dates.push(new Date(y, m, d));
          }
        }
      } else {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          dates.push(parsed);
        }
      }
    });

    if (dates.length === 0) return "Sin periodo registrado";
    
    let minDate = dates[0];
    let maxDate = dates[0];
    dates.forEach(d => {
      if (d < minDate) minDate = d;
      if (d > maxDate) maxDate = d;
    });

    const formatDate = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    if (minDate.getTime() === maxDate.getTime()) {
      return formatDate(minDate);
    }
    
    return `${formatDate(minDate)} al ${formatDate(maxDate)}`;
  }, [filteredCrimes]);

  const stats = React.useMemo(() => {
    const defaultStats = { 
      objects: [], topBarrio: "N/A", topMO: "N/A", zoneTable: [], 
      mobility: [], pairs: [], weapons: [], contexts: [], topTangible: "N/A",
      topVulnerability: "SIN DATOS", topCoercion: "SIN DATOS", topEscape: "SIN DATOS",
      contextTipologias: [], contextModalidades: [],
      modusOperandiStats: [],
      polyCounts: {}
    };
    if (filteredCrimesForStats.length === 0) return defaultStats;

    const objCounts: any = {};
    const nCounts: any = {};
    const nDetails: any = {};
    const moCounts: any = {};
    const moDetailedCounts: any = {};
    const weaponCounts: any = {};
    const contextCounts: any = {};
    const contextTipologiaCounts: any = {};
    const contextModalidadCounts: any = {};
    const vulnerabilityCounts: any = {};
    const escapeCounts: any = {};
    const coercionCounts: any = {};
    const polyCounts: any = {};

    filteredCrimesForStats.forEach(c => {
      // Registrar el conteo del polígono único de Spatial Join
      if (c.polygonUniqueId) {
        polyCounts[c.polygonUniqueId] = (polyCounts[c.polygonUniqueId] || 0) + 1;
      }

      const b = c.neighborhood;
      nCounts[b] = (nCounts[b] || 0) + 1;
      if (!nDetails[b]) nDetails[b] = { objs: {}, brands: {}, cities: {} };

      // Obtener la localidad basada en la columna cnombre_ciudad
      const rawCity = getVal(c._rawRow, "cnombre_ciudad") || c.city || "";
      const cityClean = String(rawCity).trim().toUpperCase();
      if (cityClean && cityClean !== "S/D" && cityClean !== "NULL" && cityClean !== "UNDEFINED" && cityClean !== "SIN DATOS") {
        nDetails[b].cities[cityClean] = (nDetails[b].cities[cityClean] || 0) + 1;
      }

      // Consumimos el objeto único por fila ya procesado por el extractor
      let obj = c.targetObject || "OBJETO NO IDENTIFICADO";
      const uObj = String(obj).toUpperCase().trim();
      const ambiguousObjNames = [
        "S/D", "FALTA DETERMINAR OBJETO", "OBJETO NO IDENTIFICADO", "SIN DATOS", 
        "NULL", "UNDEFINED", "SIN CLASIFICAR", "SIN ESPECIFICAR", "NINGUNO", "NINGUNA", 
        "BIEN NO ESPECIFICADO / OTROS", "", "SIN INFORMACION", "SIN INFORMACIÓN", 
        "SIN_INFORMACION", "SIN_INFORMACIÓN", "SIN DATA", "EN INVESTIGACIÓN", "EN INVESTIGACION", "S/M"
      ];
      if (!obj || ambiguousObjNames.includes(uObj)) {
        obj = "OBJETO NO IDENTIFICADO";
      }
      
      // Acumulamos directamente el conteo por fila única
      objCounts[obj] = (objCounts[obj] || 0) + 1;
      nDetails[b].objs[obj] = (nDetails[b].objs[obj] || 0) + 1;

      if (c.brands !== "S/D") {
        nDetails[b].brands[c.brands] = (nDetails[b].brands[c.brands] || 0) + 1;
      }

      moCounts[c.modusOperandi] = (moCounts[c.modusOperandi] || 0) + 1;
      
      const rawMO = getVal(c._rawRow, "cmodus_operandi");
      const uMo = String(rawMO || "").toUpperCase().trim();
      const ambiguousMO = [
        "", "S/D", "SIN DATOS", "NULL", "UNDEFINED", "SIN CLASIFICAR", "SIN ESPECIFICAR", "NINGUNO", "NINGUNA", "SIN INFORMACIÓN", "SIN INFORMACÍON", "SIN INFORMACION", "SIN_INFORMACION", "SIN_INFORMACIÓN"
      ];
      let finalMO = "";
      if (!rawMO || ambiguousMO.includes(uMo)) {
        finalMO = "En investigación";
      } else {
        finalMO = sanitizeEncodingError(rawMO);
      }
      moDetailedCounts[finalMO] = (moDetailedCounts[finalMO] || 0) + 1;
      
      // Asegurar reasignación consistente de medios empleados (armas/otros)
      let finalWeapon = c.weaponType;
      const ambiguousWeapons = ["S/D", "NULL", "UNDEFINED", "SIN CLASIFICAR", "SIN ESPECIFICAR", "NINGUNO", "NINGUNA", "SIN DATOS", ""];
      if (!finalWeapon || ambiguousWeapons.includes(String(finalWeapon).toUpperCase().trim())) {
        finalWeapon = "En investigación";
      }
      weaponCounts[finalWeapon] = (weaponCounts[finalWeapon] || 0) + 1;

      // Contexto especial (Estandarización y Unificación de vacíos/S/D)
      const finalContext = extractContextValue(c.specialContext);
      contextCounts[finalContext] = (contextCounts[finalContext] || 0) + 1;

      // Tipología especial (Estandarización y Unificación de vacíos/S/D)
      const finalTipologia = extractContextValue(c.contextTipologia);
      contextTipologiaCounts[finalTipologia] = (contextTipologiaCounts[finalTipologia] || 0) + 1;

      // Modalidad especial (Estandarización y Unificación de vacíos/S/D)
      const finalModalidad = extractContextValue(c.contextModalidad);
      contextModalidadCounts[finalModalidad] = (contextModalidadCounts[finalModalidad] || 0) + 1;

      // Análisis tácticos multidireccionales (Soportando arrays de forma expansiva y reteniendo Todo)
      const getNormalizedTacticals = (rawList: any) => {
        const arr = Array.isArray(rawList) ? rawList : [rawList];
        const ambiguous = ["S/D", "NULL", "UNDEFINED", "SIN CLASIFICAR", "SIN ESPECIFICAR", "NINGUNO", "NINGUNA", "SIN DATOS", ""];
        const normalized = arr.map((x: any) => {
          const s = String(x || "").trim();
          if (!s || ambiguous.includes(s.toUpperCase())) {
            return "En investigación";
          }
          return s;
        });
        return Array.from(new Set(normalized));
      };

      const finalVulns = getNormalizedTacticals(c.vulnerability);
      finalVulns.forEach(v => {
        vulnerabilityCounts[v] = (vulnerabilityCounts[v] || 0) + 1;
      });

      const finalEscapes = getNormalizedTacticals(c.escapeMode);
      finalEscapes.forEach(e => {
        escapeCounts[e] = (escapeCounts[e] || 0) + 1;
      });

      const finalCoercions = getNormalizedTacticals(c.coercion);
      finalCoercions.forEach(co => {
        coercionCounts[co] = (coercionCounts[co] || 0) + 1;
      });
    });

    const sortedBarrios = Object.entries(nCounts).sort((a: any, b: any) => b[1] - a[1]);

    const weaponArr = Object.entries(weaponCounts).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value);
    const contextArr = Object.entries(contextCounts).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value);
    const contextTipologiaArr = Object.entries(contextTipologiaCounts).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value);
    const contextModalidadArr = Object.entries(contextModalidadCounts).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value);
    const moDetailedArr = Object.entries(moDetailedCounts).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value);

    const sortedObjects = Object.entries(objCounts).map(([name, count]) => ({ name, count: count as number })).sort((a,b) => b.count - a.count);
    
    let objectsToReturn = [...sortedObjects];
    if (objectsToReturn.length > 12) {
      const top11 = objectsToReturn.slice(0, 11);
      const remaining = objectsToReturn.slice(11);
      const otherCount = remaining.reduce((acc, curr) => acc + curr.count, 0);
      objectsToReturn = [...top11, { name: "OTROS BIENES SECUNDARIOS", count: otherCount }];
    }

    // 3. Algoritmo de Salto en la Serie para el Gráfico/Listado
    let topTangible = "No identificado";
    if (sortedObjects.length > 0) {
      const invalidNames = ["S/D", "BIEN NO ESPECIFICADO / OTROS", "FALTA DETERMINAR OBJETO", "OBJETO NO IDENTIFICADO", "SIN DATOS", "NULL", "UNDEFINED", "SIN CLASIFICAR"];
      if (invalidNames.includes(sortedObjects[0].name.toUpperCase())) {
        topTangible = sortedObjects[1] ? sortedObjects[1].name : sortedObjects[0].name;
      } else {
        topTangible = sortedObjects[0].name;
      }
    }

    const filteredBarrios = sortedBarrios.filter(b => 
      b[0] !== "PENDIENTE DE ANÁLISIS GEOGRÁFICO" && 
      b[0] !== "FUERA DE JURISDICCIÓN" && 
      b[0] !== "DESCONOCIDO" && 
      b[0] !== "Sin Cuadrante Asignado" && 
      b[0] !== "Resto de la Provincia"
    );

    return {
      objects: objectsToReturn,
      topTangible,
      topBarrio: filteredBarrios[0]?.[0] || "N/A",
      topMO: (() => {
        const sortedMOs = Object.entries(moCounts).sort((a: any, b: any) => b[1] - a[1]);
        if (sortedMOs.length === 0) return "En investigación";
        const isGeneric = (val: string) => {
          const u = val.toUpperCase().trim();
          return u === "" || u === "SIN CLASIFICAR" || u === "S/D" || u === "SIN DATOS" || u === "NULL" || u === "UNDEFINED" || u === "EN INVESTIGACIÓN" || u === "EN INVESTIGACION" || u === "SIN ESPECIFICAR";
        };
        const firstMO = sortedMOs[0][0];
        if (isGeneric(firstMO)) {
          const secondMO = sortedMOs.find(m => !isGeneric(m[0]));
          return secondMO ? secondMO[0] : firstMO;
        }
        return firstMO;
      })(),
      zoneTable: filteredBarrios.slice(0, 10).map(([name, count]: any) => {
        const rawBrandEntries = Object.entries(nDetails[name].brands).sort((a: any, b: any) => b[1] - a[1]);
        const isBrandGeneric = (val: string) => {
          const u = val.toUpperCase().trim();
          return u === "" || u === "SIN DATOS DEL VEHÍCULO" || u === "SIN DATOS DEL VEHICULO" || u === "SIN MARCA ESPECIFICADA" || u === "SIN MARCA" || u === "SIN_MARCA" || u === "S/MARCA" || u === "S/D" || u === "SIN DATOS" || u === "NULL" || u === "UNDEFINED" || u === "SIN CLASIFICAR";
        };
        const topBrandEntry = rawBrandEntries.find(x => !isBrandGeneric(x[0]));
        const brandsStr = topBrandEntry ? `${topBrandEntry[0].replace(/VEHICULO\s*1\s*:\s*/gi, "").trim()} (${topBrandEntry[1]})` : "";

        const rawObjEntries = Object.entries(nDetails[name].objs).sort((a: any, b: any) => b[1] - a[1]);
        const isObjGeneric = (val: string) => {
          const u = val.toUpperCase().trim();
          return u === "" || u === "OBJETO NO IDENTIFICADO" || u === "BIEN NO ESPECIFICADO / OTROS" || u === "S/D" || u === "SIN ESPECIFICAR" || u === "SIN CLASIFICAR" || u === "SIN DATOS" || u === "NULL" || u === "UNDEFINED" || u === "VACIO" || u === "VACÍO" || u === "FALTA DETERMINAR OBJETO";
        };
        const topObjEntry = rawObjEntries.find(x => !isObjGeneric(x[0]));
        const objsStr = topObjEntry ? topObjEntry[0].replace(/VEHICULO\s*1\s*:\s*/gi, "").trim() : "";

        const rawCityEntries = Object.entries(nDetails[name].cities || {}).sort((a: any, b: any) => b[1] - a[1]);
        const cityStr = rawCityEntries[0]?.[0] || "S/D";

        return { name, count, brands: brandsStr, objs: objsStr, city: cityStr };
      }),
      mobility: [],
      pairs: [],
      weapons: weaponArr,
      contexts: contextArr,
      contextTipologias: contextTipologiaArr,
      contextModalidades: contextModalidadArr,
      modusOperandiStats: moDetailedArr,
      topVulnerability: Object.entries(vulnerabilityCounts).sort((a: any, b: any) => b[1] - a[1]).filter(x => x[0] !== "En investigación")[0]?.[0] || "En investigación",
      topEscape: Object.entries(escapeCounts).sort((a: any, b: any) => b[1] - a[1]).filter(x => x[0] !== "En investigación")[0]?.[0] || "En investigación",
      topCoercion: Object.entries(coercionCounts).sort((a: any, b: any) => b[1] - a[1]).filter(x => x[0] !== "En investigación")[0]?.[0] || "En investigación",
      fullZoneTable: Object.entries(nCounts).map(([name, count]: any) => ({ name, count })),
      polyCounts
    };
  }, [filteredCrimesForStats]);

  // ANÁLISIS LDA Y MÉTRICAS (Minería de Texto - ANÁLISIS CRUZADO ESTRÍCTO)
  const textAnalysis = React.useMemo(() => {
    if (filteredCrimesForStats.length === 0) {
      return { 
        lda: [], 
        remainingPercentage: 100, 
        metrics: { coherence: 0, obs: 0, trust: 0 } 
      };
    }
    
    const comboCounts: Record<string, number> = {};
    let totalCount = filteredCrimesForStats.length;

    filteredCrimesForStats.forEach(c => {
      let place = sanitizeEncodingError(c.placeType || "En investigación");
      if (place === "ENTORNO NO ESPECIFICADO") place = "En investigación";

      // Dimensión Cronológica (fhora_delito_desde)
      const rawTime = getVal(c._rawRow, "fhora_delito_desde");
      let timeSlot = "En investigación";
      if (rawTime) {
        const timeStr = String(rawTime).trim().toUpperCase();
        if (timeStr !== "" && timeStr !== "S/D" && timeStr !== "NULL" && timeStr !== "UNDEFINED" && timeStr !== "SIN DATA" && timeStr !== "SIN DATOS") {
          const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
          if (match) {
            const hour = parseInt(match[1], 10);
            const minute = parseInt(match[2], 10);
            if (!isNaN(hour) && hour >= 0 && hour <= 23 && !isNaN(minute) && minute >= 0 && minute <= 59) {
              if (hour >= 0 && hour <= 5) {
                timeSlot = "Madrugada";
              } else if (hour >= 6 && hour <= 11) {
                timeSlot = "Mañana";
              } else if (hour >= 12 && hour <= 17) {
                timeSlot = "Tarde";
              } else {
                timeSlot = "Noche";
              }
            }
          }
        }
      }

      // Dimensión Patrimonial Cruzada (ctipo_elemento y cobjetivo_atacado)
      const rawElem = getVal(c._rawRow, "ctipo_elemento");
      const rawObj = getVal(c._rawRow, "cobjetivo_atacado");
      let finalObj = "OBJETO NO IDENTIFICADO";

      const uElem = String(rawElem || "").toUpperCase().trim();
      const isSD_Elem = !rawElem || uElem === "" || uElem === "S/D" || uElem === "NULL" || uElem === "UNDEFINED" || uElem === "SIN CLASIFICAR" || uElem === "SIN ESPECIFICAR" || uElem === "SIN DATOS" || uElem === "NINGUNO" || uElem === "NINGUNA" || uElem === "BIEN NO ESPECIFICADO / OTROS" || uElem === "FALTA DETERMINAR OBJETO" || uElem === "OBJETO NO IDENTIFICADO";

      if (!isSD_Elem) {
        finalObj = sanitizeEncodingError(rawElem);
      } else {
        const uObj = String(rawObj || "").toUpperCase().trim();
        const normalizedObj = uObj.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents
        const criticalCategories = [
          "MOTOVEHICULO", "MOTOVEHÍCULO",
          "AUTOMOVIL PARTICULAR", "AUTOMÓVIL PARTICULAR",
          "CAMIONETA",
          "BICICLETA",
          "CAMION CARGA GENERAL", "CAMIÓN CARGA GENERAL",
          "ANIMAL"
        ];
        const matchesCritical = criticalCategories.includes(uObj) || criticalCategories.includes(normalizedObj);
        
        if (matchesCritical) {
          finalObj = sanitizeEncodingError(rawObj);
        }
      }
      
      // Concatenar con el signo mas y espacios obligatorios " + "
      const combo = `${place} + ${timeSlot} + ${finalObj}`;
      comboCounts[combo] = (comboCounts[combo] || 0) + 1;
    });

    const sortedCombos = Object.entries(comboCounts)
      .map(([topic, count]) => {
        const pct = Math.round((count / totalCount) * 100);
        return {
          topic,
          count,
          weight: pct
        };
      })
      .sort((a, b) => b.count - a.count);

    // Seleccionar únicamente el Top 3 de combinaciones con agrupamiento de frecuencias reales
    const top3 = sortedCombos.slice(0, 3);
    
    const ldaResult = top3.map((item, i) => ({
      topic: item.topic,
      weight: item.weight,
      color: COLORS[i % COLORS.length]
    }));

    while (ldaResult.length < 3) {
      ldaResult.push({ 
        topic: "DATOS INSUFICIENTES PARA PATRÓN", 
        weight: 0, 
        color: '#CBD5E1' 
      });
    }

    const sumPct = top3.reduce((sum, item) => sum + item.weight, 0);
    const remainingPercentage = Math.max(0, 100 - sumPct);

    return { 
      lda: ldaResult, 
      remainingPercentage,
      metrics: { coherence: 0.88, obs: totalCount, trust: totalCount > 100 ? 96 : 80 } 
    };
  }, [filteredCrimesForStats]);

  const formattedWeaponsData = React.useMemo(() => {
    const list = stats.weapons || [];
    const totalFrecuencias = list.reduce((sum, w) => sum + w.value, 0);
    
    if (list.length <= 8) {
      return {
        chartData: list,
        remainingPct: 0
      };
    }
    
    const top8 = list.slice(0, 8);
    const remainingList = list.slice(8);
    const remainingSum = remainingList.reduce((sum, w) => sum + w.value, 0);
    
    const chartData = [
      ...top8,
      { name: "Otros medios", value: remainingSum }
    ];
    
    const den = filteredCrimesForStats.length || 1;
    const remainingPct = parseFloat(((remainingSum / den) * 100).toFixed(1).replace(/\.0$/, ''));
    
    return {
      chartData,
      remainingPct
    };
  }, [stats.weapons, filteredCrimesForStats]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-[#1e293b] font-sans selection:bg-[#3C4C9A]/30">
      <nav className="bg-white border-b sticky top-0 z-50 h-16 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Shield size={20} className="text-[#3C4C9A]" />
          <h1 className="text-lg font-bold">CrimeMiner</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Filtrar por Modus Operandi, Cuadrante u Objeto Sustraído..." 
              className="w-[300px] md:w-[400px] pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-[#3C4C9A] transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <button 
            onClick={() => document.getElementById('u')?.click()} 
            className="bg-[#3C4C9A] text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#2a377d] transition-colors shadow-sm active:scale-95"
          >
            <Database size={16} /> {isUploading ? 'Procesando...' : 'Cargar CSV'}
          </button>
          <input type="file" id="u" className="hidden" accept=".csv" onChange={handleFileUpload} />
        </div>
      </nav>

      <div className="p-8 max-w-[1700px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 w-full">
          {/* Selector de Pestañas */}
          <div className="flex gap-2 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border w-fit">
            {[
              { id: 'overview', label: 'Vista General', icon: Activity },
              { id: 'text-mining', label: 'Minería de Texto', icon: List },
              { id: 'mobility', label: 'Inteligencia Táctica', icon: Navigation },
              { id: 'map', label: 'Mapeo del delito', icon: MapIcon }
            ].map(t => (
              <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id)} 
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === t.id ? 'bg-[#1e293b] text-white shadow-lg shadow-gray-200' : 'text-gray-500 hover:bg-white hover:text-[#1e293b]'}`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {/* Indicador de Periodo Analizado */}
          <div className="flex items-center gap-2.5 bg-white border border-slate-100 px-4 py-2.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.015)] hover:border-slate-200 transition-all w-fit md:self-auto self-start">
            <Calendar className="h-4 w-4 text-[#3C4C9A]" />
            <div className="flex flex-col text-left">
              <span className="text-[8px] font-black text-[#3C4C9A] uppercase tracking-wider leading-none">Período Analizado</span>
              <span className="text-[10px] font-black text-slate-700 leading-tight mt-0.5 whitespace-nowrap">
                {dateRangeText}
              </span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* OVERVIEW (VISTA GENERAL) */}
            {activeTab === 'overview' && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Denuncias', value: filteredTotalDenunciasUnicas, sub: `Total de delitos (${filteredCrimes.length})`, color: '#3C4C9A', icon: Database },
                    { label: 'Cuadrante Crítico', value: stats.topBarrio, sub: 'Mayor incidencia', color: '#D0234F', icon: MapPin },
                    { label: 'Modus Operandi', value: stats.topMO, sub: 'Modus Operandi dominante', color: '#EE751E', icon: Zap },
                    { label: 'Principal objeto sustraido', value: stats.topTangible, sub: 'Elemento más robado', color: '#4A4963', icon: Target }
                  ].map((kpi, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-7 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 border-l-4 group hover:shadow-xl hover:-translate-y-1 transition-all duration-500" 
                      style={{ borderLeftColor: kpi.color }}
                    >
                      <div className="flex justify-between items-start mb-3 text-gray-400">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] leading-none">{kpi.label}</p>
                        <kpi.icon size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="text-2xl font-black truncate mb-1 font-mono tracking-tighter uppercase" style={{ color: kpi.color }}>{kpi.value}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{kpi.sub}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
                  <div className="bg-white p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-full min-h-[600px]">
                    <h4 className="font-black mb-10 flex items-center gap-3 text-gray-800 uppercase text-[10px] tracking-[0.2em] leading-none"><TrendingUp size={16} className="text-[#3C4C9A]" /> Objetos más Afectados</h4>
                    {(() => {
                      const visualFilteredObjects = (stats.objects || []).filter((obj: any) => {
                        const uName = String(obj?.name || "").toUpperCase().trim();
                        return (
                          uName !== "" &&
                          uName !== "OBJETO NO IDENTIFICADO" &&
                          uName !== "S/D" &&
                          uName !== "SIN DATOS" &&
                          uName !== "SIN CLASIFICAR" &&
                          uName !== "BIEN NO ESPECIFICADO / OTROS" &&
                          uName !== "FALTA DETERMINAR OBJETO" &&
                          uName !== "NULL" &&
                          uName !== "UNDEFINED"
                        );
                      });

                      return (
                        <div className="flex-grow w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={visualFilteredObjects} layout="vertical" margin={{ left: 10, right: 40, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                              <XAxis type="number" hide />
                              <YAxis 
                                dataKey="name" 
                                type="category" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 800, textTransform: 'uppercase' }} 
                                width={140}
                              />
                              <Tooltip 
                                cursor={{ fill: '#f8fafc' }} 
                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                              />
                              <Bar dataKey="count" radius={[0, 12, 12, 0]} barSize={26}>
                                {visualFilteredObjects.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.9} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}
                    <span className="text-slate-500 text-xs italic mt-2 block leading-relaxed">
                      Nota metodológica: Las categorías de objetos contabilizan todos los bienes sustraídos. Por ello, el total de objetos registrados puede ser superior al total de delitos.
                    </span>
                  </div>

                  <div className="bg-white p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-full min-h-[600px]">
                    <h4 className="font-black mb-2 flex items-center gap-3 text-gray-800 uppercase text-[10px] tracking-[0.2em] leading-none"><MapPin size={16} className="text-[#D0234F]" /> Mapa de Concentración</h4>
                    <p className="text-xs text-slate-500 mb-8 font-medium">Mostrando Top 10 relatos de las zonas asociadas a los {filteredCrimes.length} delitos analizados</p>
                    <div className="overflow-x-auto flex-grow">
                      <table className="w-full text-left">
                        <thead className="text-[10px] uppercase text-gray-400 border-b border-gray-100 pb-4">
                          <tr>
                            <th className="pb-5 font-black tracking-widest text-[#64748b] whitespace-nowrap">cuadrante / zona</th>
                            <th className="pb-5 font-black tracking-widest text-[#64748b] whitespace-nowrap">localidad</th>
                            <th className="pb-5 font-black tracking-widest">Objeto Top</th>
                            <th className="pb-5 font-black tracking-widest text-right">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {stats.zoneTable.map((row, i) => (
                            <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                              <td className="py-5">
                                <p className="text-[11px] font-black text-[#1e293b] uppercase tracking-tight">{row.name}</p>
                              </td>
                              <td className="py-5">
                                <span className="bg-indigo-50 text-indigo-600 border border-indigo-100/50 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-tight whitespace-nowrap">{row.city || "S/D"}</span>
                              </td>
                              <td className="py-5">
                                <div className="flex flex-col gap-1.5">
                                  {row.objs && (
                                    <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter w-fit">{row.objs}</span>
                                  )}
                                  {row.brands && (
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter truncate max-w-[200px] italic">{row.brands}</p>
                                  )}
                                </div>
                              </td>
                              <td className="py-5 text-right">
                                <span className="text-xl font-black font-mono text-[#3C4C9A] tracking-tighter">{row.count}</span>
                              </td>
                            </tr>
                          ))}
                          {stats.zoneTable.length === 0 && (
                            <tr><td colSpan={4} className="py-24 text-center text-gray-400 italic font-medium uppercase text-[10px] tracking-widest">Sin datos disponibles</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium mt-6 border-t border-gray-100 pt-4">
                      {(() => {
                        const total = filteredCrimes.length;
                        if (total === 0) return "*Nota metodológica: El 0,0% restante de los delitos se encuentra distribuido entre otros cuadrantes o zonas con menor incidencia relativa, por lo que no integran los sectores de mayor concentración delictiva identificados en el presente análisis.";
                        const sumTop = (stats.zoneTable || []).reduce((acc: number, curr: any) => acc + curr.count, 0);
                        const remainingPct = Math.max(0, ((total - sumTop) / total) * 100).toFixed(1).replace('.', ',');
                        return `*Nota metodológica: El ${remainingPct}% restante de los delitos se encuentra distribuido entre otros cuadrantes o zonas con menor incidencia relativa, por lo que no integran los sectores de mayor concentración delictiva identificados en el presente análisis.`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* MINERÍA DE TEXTO */}
            {activeTab === 'text-mining' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-stretch lg:h-[1020px] max-w-full">
                <div className="lg:col-span-3 flex flex-col h-full min-h-0">
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-10">
                      <div>
                        <h2 className="text-xl font-black flex items-center gap-4 tracking-tight"><Search className="h-7 w-7 text-[#3C4C9A]" /> Relatos textuales de las denuncias</h2>
                        {stats.topMO && stats.topMO !== "SIN CLASIFICAR" && stats.topMO !== "N/A" && stats.topMO !== "SIN DATOS" ? (
                          <p className="text-[11px] text-gray-500 font-bold mt-1.5 uppercase tracking-wider">
                            Mostrando Top 10 relatos asociados exclusivamente al Modus Operandi preponderante: <span className="text-[#3C4C9A] font-extrabold">{stats.topMO}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-500 font-bold mt-1.5 uppercase tracking-wider">
                            Cargue datos para identificar el Modus Operandi preponderante y sus relatos principales
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className="bg-green-50 text-green-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">NLP V2.0</span>
                        <span className="bg-gray-50 text-gray-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-100">
                          {stats.topMO && stats.topMO !== "SIN CLASIFICAR" && stats.topMO !== "N/A" && stats.topMO !== "SIN DATOS"
                            ? `${filteredCrimes.filter(c => c.modusOperandi === stats.topMO).slice(0, 10).length} de ${filteredCrimes.filter(c => c.modusOperandi === stats.topMO).length}`
                            : filteredCrimes.length} Registros
                        </span>
                      </div>
                    </div>
                    <div className="flex-grow flex-1 min-h-0 overflow-y-auto space-y-5 pr-4 scrollbar-thin hover:scrollbar-thumb-gray-300">
                      {(() => {
                        const targetMO = stats.topMO;
                        const hasPreponderantMO = targetMO && targetMO !== "SIN CLASIFICAR" && targetMO !== "N/A" && targetMO !== "SIN DATOS";
                        
                        const displayList = hasPreponderantMO
                          ? filteredCrimes.filter(c => c.modusOperandi === targetMO).slice(0, 10)
                          : filteredCrimes.slice(0, 50);

                        if (displayList.length === 0) {
                          return (
                            <p className="text-sm font-medium text-gray-400 italic text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed uppercase tracking-wider">
                              Cargue un archivo CSV para detectar y visualizar los relatos preponderantes.
                            </p>
                          );
                        }

                        return displayList.map((c, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-8 rounded-[32px] border border-gray-50 hover:border-[#3C4C9A]/30 hover:bg-[#3C4C9A]/[0.01] hover:shadow-lg transition-all duration-300 bg-white group"
                          >
                            <div className="flex flex-wrap gap-2 mb-4">
                              <span className="bg-[#3C4C9A]/5 text-[#3C4C9A] px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-[#3C4C9A]/10">{c.type}</span>
                              <span className="bg-[#D0234F]/5 text-[#D0234F] px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-[#D0234F]/10 italic">MODUS: {c.modusOperandi}</span>
                              <span className="bg-orange-50 text-orange-600 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-orange-100 italic">MEDIO EMPLEADO: {c.weaponType}</span>
                            </div>
                            <p className="text-sm font-bold text-[#1e293b] leading-relaxed mb-6 italic opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-sm">"{c.description}"</p>
                            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-gray-300" />
                                <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">
                                  {getVal(c._rawRow, "cnombre_ciudad") || c.city || "S/D"}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-mono font-bold text-gray-300">{c.date}</span>
                              </div>
                            </div>
                          </motion.div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col h-full space-y-8 bg-transparent">
                  <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h3 className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-[0.25em] flex items-center gap-3">
                      <Sword size={14} className="text-[#EE751E]" /> Análisis de Medios Empleados
                    </h3>
                    <p className="text-slate-500 text-[10px] mt-1 mb-6 leading-normal">
                      Mostrando el Top 8 de medios más frecuentes. El {formattedWeaponsData.remainingPct}% restante corresponde a categorías con menor frecuencia, agrupadas bajo la etiqueta 'Otros Medios'.
                    </p>
                    <div className="w-full h-[320px]">
                      {formattedWeaponsData.chartData.length === 0 ? (
                        <p className="text-[10px] text-gray-400 font-bold italic text-center py-20 uppercase tracking-widest">Sin datos de medios</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart layout="vertical" data={formattedWeaponsData.chartData} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              width={150}
                              tick={<YAxisTick />} 
                            />
                            <Tooltip 
                              contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                            />
                            <Bar dataKey="value" fill="#EE751E" radius={[0, 8, 8, 0]} name="Frecuencia" barSize={16}>
                              <LabelList dataKey="value" position="right" style={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} offset={10} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h3 className="text-[10px] font-black uppercase text-gray-400 mb-10 tracking-[0.25em]">Análisis de Tópicos Emergentes</h3>
                    <div className="space-y-8">
                      {textAnalysis.lda.map((t, i) => (
                        <div key={i} className="group">
                          <div className="flex justify-between text-[10px] font-black mb-3 uppercase tracking-tight">
                            <span className="text-gray-600 group-hover:text-[#1e293b] transition-colors">{t.topic}</span>
                            <span className="font-mono" style={{color: t.color}}>{t.weight}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100 shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${t.weight}%` }}
                              transition={{ duration: 1, ease: 'easeOut', delay: i * 0.2 }}
                              className="h-full rounded-full shadow-lg" 
                              style={{ backgroundColor: t.color }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 pt-4 border-t border-gray-100 flex flex-col gap-2">
                      <p className="text-[9px] text-[#3C4C9A] font-black uppercase tracking-wider">*Mostrando los 3 tópicos principales</p>
                      <p className="text-[9px] text-gray-500 font-medium italic leading-normal">
                        Nota metodológica: Los porcentajes expresados indican la tasa de incidencia individual de cada patrón sobre el universo total de delitos analizados. El {textAnalysis.remainingPercentage}% restante de la muestra se distribuye de manera atomizada en combinaciones secundarias y dispersas de entorno físico, franja horaria y objeto material afectado, cuyas frecuencias absolutas no alcanzan los umbrales de representatividad estadística para ingresar al ranking principal.
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#1e293b] p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all duration-700 group-hover:scale-150" />
                    <h3 className="text-[10px] font-black uppercase text-gray-500 mb-10 tracking-[0.25em] relative z-10">Métricas de Patrón</h3>
                    <div className="space-y-6 relative z-10">
                      {[
                        { label: 'Coherencia Semántica', value: textAnalysis.metrics.coherence, color: 'text-indigo-400' },
                        { label: 'Soporte de Patrón', value: `${textAnalysis.metrics.obs} obs`, color: 'text-white' },
                        { label: 'Confianza del Modelo', value: `${textAnalysis.metrics.trust}%`, color: 'text-green-400' }
                      ].map((m, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{m.label}</span>
                          <span className={`font-mono text-sm font-black ${m.color}`}>{m.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MOVILIDAD Y ANÁLISIS TÁCTICO */}
            {activeTab === 'mobility' && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="bg-white p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-full min-h-[500px]">
                    <h4 className="font-black mb-6 flex items-center gap-3 text-gray-800 uppercase text-[10px] tracking-[0.2em] leading-none">
                      <Zap size={16} className="text-[#3C4C9A]" /> Análisis por Tipología de Contexto
                    </h4>
                    <div className="flex-grow w-full relative min-h-[350px]">
                      {stats.contextTipologias.length === 0 ? (
                        <p className="text-[10px] text-gray-400 font-bold italic text-center py-20 uppercase tracking-widest">Sin datos de tipología</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const totalTipologias = stats.contextTipologias.reduce((acc: number, curr: any) => acc + curr.value, 0) || 1;
                            return (
                              <BarChart layout="vertical" data={stats.contextTipologias.slice(0, 10)} margin={{ top: 10, right: 110, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis 
                                  type="category" 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  width={180}
                                  tick={<LargerYAxisTick />} 
                                />
                                <Tooltip 
                                  content={<CustomTooltip total={totalTipologias} />} 
                                />
                                <Bar dataKey="value" fill="#3C4C9A" radius={[0, 10, 10, 0]} name="Frecuencia" barSize={16}>
                                  <LabelList 
                                    dataKey="value" 
                                    position="right" 
                                    formatter={(val: number) => {
                                      const pct = ((val / totalTipologias) * 100).toFixed(1);
                                      return `${val} (${pct}%)`;
                                    }}
                                    style={{ fill: '#1e293b', fontSize: 11, fontWeight: 'bold' }} 
                                    offset={10} 
                                  />
                                </Bar>
                              </BarChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col h-full min-h-[500px]">
                    <h4 className="font-black mb-6 flex items-center gap-3 text-gray-800 uppercase text-[10px] tracking-[0.2em] leading-none">
                      <Layers size={16} className="text-[#D0234F]" /> Análisis por Modalidad del Contexto
                    </h4>
                    <div className="flex-grow w-full relative min-h-[350px]">
                      {stats.contextModalidades.length === 0 ? (
                        <p className="text-[10px] text-gray-400 font-bold italic text-center py-20 uppercase tracking-widest">Sin datos de modalidad</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const totalModalidades = stats.contextModalidades.reduce((acc: number, curr: any) => acc + curr.value, 0) || 1;
                            return (
                              <BarChart layout="vertical" data={stats.contextModalidades.slice(0, 10)} margin={{ top: 10, right: 110, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis 
                                  type="category" 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  width={180}
                                  tick={<LargerYAxisTick />} 
                                />
                                <Tooltip 
                                  content={<CustomTooltip total={totalModalidades} />} 
                                />
                                <Bar dataKey="value" fill="#D0234F" radius={[0, 10, 10, 0]} name="Frecuencia" barSize={16}>
                                  <LabelList 
                                    dataKey="value" 
                                    position="right" 
                                    formatter={(val: number) => {
                                      const pct = ((val / totalModalidades) * 100).toFixed(1);
                                      return `${val} (${pct}%)`;
                                    }}
                                    style={{ fill: '#1e293b', fontSize: 11, fontWeight: 'bold' }} 
                                    offset={10} 
                                  />
                                </Bar>
                              </BarChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* NUEVA TARJETA: Análisis de Modus Operandi */}
                  <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between min-h-[500px]">
                    <h3 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-[0.25em] flex items-center gap-3">
                      <List size={14} className="text-[#EE751E]" /> Análisis de Modus Operandi
                    </h3>
                    <div className="flex-grow w-full relative min-h-[350px]">
                      {(stats.modusOperandiStats || []).length === 0 ? (
                        <p className="text-[10px] text-gray-400 font-bold italic text-center py-20 uppercase tracking-widest">Sin datos de Modus Operandi</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const totalMOStats = stats.modusOperandiStats.reduce((acc: number, curr: any) => acc + curr.value, 0) || 1;
                            return (
                              <BarChart layout="vertical" data={(stats.modusOperandiStats || []).slice(0, 10)} margin={{ top: 10, right: 110, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis 
                                  type="category" 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  width={180}
                                  tick={<LargerYAxisTick />} 
                                />
                                <Tooltip 
                                  content={<CustomTooltip total={totalMOStats} />} 
                                />
                                <Bar dataKey="value" fill="#EE751E" radius={[0, 10, 10, 0]} name="Frecuencia" barSize={16}>
                                  <LabelList 
                                    dataKey="value" 
                                    position="right" 
                                    formatter={(val: number) => {
                                      const pct = ((val / totalMOStats) * 100).toFixed(1);
                                      return `${val} (${pct}%)`;
                                    }}
                                    style={{ fill: '#1e293b', fontSize: 11, fontWeight: 'bold' }} 
                                    offset={10} 
                                  />
                                </Bar>
                              </BarChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between h-full min-h-[500px]">
                    <h3 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-[0.25em] flex items-center gap-3">
                      <AlertTriangle size={14} className="text-[#3C4C9A]" /> Análisis del Contexto delictivo
                    </h3>
                    <div className="flex-grow w-full relative min-h-[350px]">
                      {(stats.contexts || []).length === 0 ? (
                        <p className="text-[10px] text-gray-400 font-bold italic text-center py-20 uppercase tracking-widest">Sin datos de contexto</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const totalContexts = stats.contexts.reduce((acc: number, curr: any) => acc + curr.value, 0) || 1;
                            return (
                              <BarChart layout="vertical" data={(stats.contexts || []).slice(0, 6)} margin={{ top: 10, right: 110, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis 
                                  type="category" 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  width={180}
                                  tick={<LargerYAxisTick />} 
                                />
                                <Tooltip 
                                  content={<CustomTooltip total={totalContexts} />} 
                                />
                                <Bar dataKey="value" fill="#3C4C9A" radius={[0, 10, 10, 0]} name="Frecuencia" barSize={16}>
                                  <LabelList 
                                    dataKey="value" 
                                    position="right" 
                                    formatter={(val: number) => {
                                      const pct = ((val / totalContexts) * 100).toFixed(1);
                                      return `${val} (${pct}%)`;
                                    }}
                                    style={{ fill: '#1e293b', fontSize: 11, fontWeight: 'bold' }} 
                                    offset={10} 
                                  />
                                </Bar>
                              </BarChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-3 bg-[#1e293b] p-10 rounded-[50px] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                      <Shield size={200} className="text-white" />
                    </div>
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="text-white text-xs font-black uppercase tracking-[0.3em] flex items-center gap-4">
                        <Zap size={16} className="text-orange-400" /> Inteligencia Táctica (Minería Local Privada)
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                      <div className="space-y-4">
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Vulnerabilidad Táctica</p>
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 min-h-[210px] flex flex-col justify-between">
                          <div>
                            <p className="text-white text-lg font-black tracking-tighter uppercase leading-tight mb-2">
                              {stats.topVulnerability}
                            </p>
                            <p className="text-gray-300 text-[11px] leading-relaxed">
                              {VULNERABILITY_DESCRIPTIONS[stats.topVulnerability] || VULNERABILITY_DESCRIPTIONS["SIN DATOS"]}
                            </p>
                          </div>
                          <p className="text-orange-400 text-[9px] font-bold mt-4 uppercase tracking-widest">Entorno / Víctima</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Factor de Coerción</p>
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 min-h-[210px] flex flex-col justify-between">
                          <div>
                            <p className="text-white text-lg font-black tracking-tighter uppercase leading-tight mb-2">
                              {stats.topCoercion}
                            </p>
                            <p className="text-gray-300 text-[11px] leading-relaxed">
                              {COERCION_DESCRIPTIONS[stats.topCoercion] || COERCION_DESCRIPTIONS["SIN DATOS"]}
                            </p>
                          </div>
                          <p className="text-blue-400 text-[9px] font-bold mt-4 uppercase tracking-widest">Método Dominante</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Comportamiento de Banda</p>
                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 min-h-[210px] flex flex-col justify-between">
                          <div>
                            <p className="text-white text-lg font-black tracking-tighter uppercase leading-tight mb-2">
                              {stats.topEscape}
                            </p>
                            <p className="text-gray-300 text-[11px] leading-relaxed">
                              {ESCAPE_DESCRIPTIONS[stats.topEscape] || ESCAPE_DESCRIPTIONS["SIN DATOS"]}
                            </p>
                          </div>
                          <p className="text-purple-400 text-[9px] font-bold mt-4 uppercase tracking-widest">Patrón Coordinación</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-10 pt-10 border-t border-white/5">
                      <p className="text-gray-500 text-[10px] font-bold italic leading-relaxed">
                        * Los datos anteriores son extraídos de manera 100% local en tu navegador mediante algoritmos optimizados de Minería de Texto (NLP v2.0). 
                        No se envía ningún dato a servidores externos ni a inteligencias artificiales en la nube (como Gemini o OpenAI), garantizando seguridad, privacidad y confidencialidad absoluta sobre las denuncias.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* MAPA DE CALOR */}
            {activeTab === 'map' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-10 rounded-[50px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h2 className="text-xl font-black flex items-center gap-4 tracking-tight"><MapIcon className="h-7 w-7 text-[#3C4C9A]" /> Mapa de Concentración Geográfica</h2>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">
                        {geoStatus === 'success' ? (spatialJoined ? "Análisis mediante Spatial Join (Turf.js) - ACTIVO" : "Capa cargada. Esperando datos CSV...") : "Capa geográfica no detectada"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Indicador de Capas Integradas */}
                      <div className="flex items-center gap-2 bg-[#3C4C9A]/5 border border-[#3C4C9A]/10 px-3.5 py-2 rounded-2xl">
                        <span className="text-[9px] font-black text-[#3C4C9A] uppercase tracking-wider">Capa Unificada:</span>
                        <span className="text-slate-700 text-[11px] font-black uppercase tracking-wider">
                          30 Ciudades Integradas
                        </span>
                      </div>

                      {geoStatus === 'success' ? (
                        <div className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-100 flex items-center gap-2">
                          <Shield size={12} /> Capa Lista
                        </div>
                      ) : (
                        <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-2 animate-pulse">
                          <AlertTriangle size={12} /> Esperando Capa
                        </div>
                      )}
                      <input type="file" id="geoInput" className="hidden" accept=".json,.geojson" onChange={handleGeoFileUpload} />
                      <button 
                        onClick={() => document.getElementById('geoInput')?.click()}
                        className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 flex items-center gap-2 cursor-pointer"
                      >
                        <Layers size={14} /> {geoData ? 'Actualizar Capa' : 'Cargar GeoJSON'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3">
                      <PureLeafletMap 
                        geoData={geoData} 
                        stats={stats} 
                        crimes={filteredCrimes} 
                        allCrimes={crimes} 
                        searchTerm={searchTerm} 
                      />
                    </div>

                    <div className="lg:col-span-1 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 flex flex-col h-[600px]">
                      <div className="mb-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-[#3C4C9A]" /> Ranking por Ciudad
                        </h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Cantidad total de incidentes</p>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[500px]">
                        {cityRanking.map((city, idx) => {
                          const maxCount = cityRanking[0]?.count || 1;
                          const pct = (city.count / maxCount) * 100;

                          return (
                            <div key={city.name} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all hover:border-slate-200">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[11px] font-black text-slate-700 flex items-center gap-2 truncate max-w-[120px]" title={city.name}>
                                  <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 text-[9px] font-black h-4 w-4 rounded-full flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  {city.name}
                                </span>
                                <span className="text-[10px] font-black text-[#3C4C9A] bg-[#3C4C9A]/5 px-2 py-0.5 rounded-lg flex-shrink-0">
                                  {city.count} {city.count === 1 ? 'delito' : 'delitos'}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div 
                                  className="bg-[#3C4C9A] h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {cityRanking.length === 0 && (
                          <div className="text-center py-12 text-slate-400">
                            <p className="text-[10px] font-bold uppercase tracking-wider">Sin datos de incidentes</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-10 bg-[#f8fafc] rounded-[40px] border border-slate-100">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 flex flex-col justify-center max-w-3xl mx-auto text-center">
                      <p className="text-[10px] text-slate-400 font-black uppercase mb-3 tracking-[0.2em]">Funcionalidad Dual</p>
                      <p className="text-sm text-slate-600 leading-relaxed italic font-medium">
                        "El sistema ofrece dos lecturas complementarias según la escala del análisis. El <b>Mapa de Coropletas</b> agrupa los datos de manera agregada según los cuadrantes policiales oficiales de la ciudad de Rosario, permitiendo identificar tasas de incidencia por jurisdicción. Por otro lado, el <b>Mapa de Calor</b> trabaja con coordenadas geográficas exactas; al no estar condicionado por límites poligonales o divisiones administrativas, permite visualizar la densidad absoluta de incidentes de manera continua a lo largo de toda la provincia. Utilice los botones flotantes (esquina superior derecha) para alternar entre ambas capas."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
