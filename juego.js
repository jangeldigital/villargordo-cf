/* Cabezones del Villargordo · fútbol 5 contra 5 en el navegador
   Las caras salen del cromo de cada jugador. En menores solo se usa la foto real
   si la familia autorizó el juego (campo "juego" en el cromo); si no, cara dibujada. */
(() => {
"use strict";

/* ================= constantes del campo ================= */
const W = 1200, H = 720;              // campo en unidades
const GW = 170, GY0 = H / 2 - GW / 2, GY1 = H / 2 + GW / 2, GH = 34;   // portería
const BOX_X = 170, BOX_W = 400, SPOT = 120;
const T = 0.72;                       // inclinación de la cámara
const G = 0.32;                       // gravedad del balón
const DT = 1 / 60;
const KITS = [
  { camiseta: "#B5122B", pantalon: "#FFFFFF", medias: "#B5122B", borde: "#7d0c1d", nombre: "rojo" },
  { camiseta: "#658049", pantalon: "#14170F", medias: "#3E5230", borde: "#3E5230", nombre: "oliva" },
  { camiseta: "#76994F", pantalon: "#0b060c", medias: "#0b060c", borde: "#0b060c", nombre: "oleo" },
  { camiseta: "#1c1a1e", pantalon: "#658049", medias: "#658049", borde: "#658049", nombre: "oleo-negra" },
];
function kitsPartido(a, b) {   // [kit del equipo 0, kit del equipo 1] sin que se repitan colores
  const ka = (a && a.kits) || [0, 1], kb = (b && b.kits) || [0, 1];
  return [KITS[ka[0]], KITS[kb[0] === ka[0] ? kb[1] : kb[0]]];
}
const FRASES_MISTER = ["¡Venga, venga!", "¡Presión!", "¡Ábrete a la banda!", "¡Tira!", "¡Atrás, atrás!", "¡Eso es!", "¡Pásala!", "¡Árbitro, hombre!", "¡Esa pierna!", "¡Bajad!", "¡Concentración!", "¡Mira el hueco!"];
const pick = L => L[Math.floor(Math.random() * L.length)];
const EQUIPO_OLEO = {
  id: "oleo", nombre: "Oleo Telecom", menores: false, kits: [2, 3],
  jugadores: [
    { nombre: "José Ángel", posicion: "Portero", dorsal: 1, foto: "img/oleo/oleo-4.jpg", zoom: 1 },
    { nombre: "Noemí", posicion: "Defensa", dorsal: 2, foto: "img/oleo/oleo-2.jpg", zoom: 1 },
    { nombre: "Marién", posicion: "Defensa", dorsal: 4, foto: "img/oleo/oleo-3.jpg", zoom: 1 },
    { nombre: "El Router", posicion: "Centrocampista", dorsal: 5 },
    { nombre: "Bresbal", posicion: "Delantero", dorsal: 9, foto: "img/oleo/oleo-1.jpg", zoom: 1 },
  ],
  entrenador: { nombre: "Míster Wifi" },
};
const ESPECIALES = {
  fuego:    { nombre: "Cañonazo de fuego", ico: "🔥" },
  rayo:     { nombre: "Tiro rayo",         ico: "⚡" },
  fantasma: { nombre: "Balón fantasma",    ico: "👻" },
  banana:   { nombre: "Efecto banana",     ico: "🍌" },
  aceituna: { nombre: "Aceituna de Jaén",  ico: "🫒" },
};
const LISTA_ESP = Object.keys(ESPECIALES);
const DIF = {
  facil:  { vel: [1.06, 0.86], entrada: [0.012, 0.006], robo: [0.05, 0.025], punteria: [0.82, 0.55], portero: [1.1, 0.72], penIA: 0.28 },
  normal: { vel: [1.02, 0.96], entrada: [0.012, 0.012], robo: [0.05, 0.045], punteria: [0.78, 0.7],  portero: [1.0, 0.92], penIA: 0.4 },
  crack:  { vel: [1.0, 1.05],  entrada: [0.012, 0.02],  robo: [0.045, 0.06], punteria: [0.75, 0.82], portero: [1.0, 1.08], penIA: 0.52 },
};
const BASES = [[0.035, 0.5], [0.2, 0.3], [0.2, 0.7], [0.4, 0.5], [0.58, 0.5]];  // portero, 2 defensas, medio, punta
const PELO = ["#4a2e1c", "#a8642a", "#1d1410", "#2b1a10", "#e0b25a", "#120c08", "#7a4a24", "#c98b3c", "#3a2416"];
const STAFF = /entrenador|delegado|utiller|fisio|míster|mister/i;
const CLAVE_ALBUM = "villargordo-demo-album-v1";

/* ================= utilidades ================= */
const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function distSeg(o, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1;
  const t = clamp(((o.x - a.x) * dx + (o.y - a.y) * dy) / l, 0, 1);
  return Math.hypot(a.x + dx * t - o.x, a.y + dy * t - o.y);
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function guardaLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function leeLS(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }

/* ================= lienzo ================= */
const cv = $("#lienzo"), ctx = cv.getContext("2d");
let DPR = 1, VW = 0, VH = 0;
function ajusta() {
  DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
}
addEventListener("resize", ajusta); ajusta();

/* ================= sonido ================= */
let AC = null, sonidoOn = leeLS("cabezones-sonido") !== false;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { AC = null; } }
  if (AC && AC.state === "suspended") AC.resume();
  return AC;
}
let RUIDO = null;
function ruido(a) {
  if (RUIDO) return RUIDO;
  RUIDO = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
  const d = RUIDO.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return RUIDO;
}
function tono(a, t, f0, f1, dur, tipo, vol) {
  const o = a.createOscillator(), g = a.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function soplo(a, t, dur, f, q, vol, sube) {
  const s = a.createBufferSource(); s.buffer = ruido(a);
  const fl = a.createBiquadFilter(); fl.type = "bandpass"; fl.frequency.value = f; fl.Q.value = q;
  const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (sube || 0.02));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
}
function sonido(tipo) {
  if (!sonidoOn || !S || S.attract) return;
  const a = ac(); if (!a) return; const t = a.currentTime;
  if (tipo === "patada") { tono(a, t, 170, 55, 0.09, "sine", 0.5); soplo(a, t, 0.05, 1800, 1, 0.08); }
  if (tipo === "fuerte") { tono(a, t, 120, 40, 0.16, "sine", 0.7); soplo(a, t, 0.1, 900, 0.8, 0.2); }
  if (tipo === "silbato") {
    for (const [d0, d] of [[0, 0.18], [0.24, 0.42]]) {
      const o = a.createOscillator(), l = a.createOscillator(), lg = a.createGain(), g = a.createGain();
      o.type = "square"; o.frequency.value = 2650; l.frequency.value = 28; lg.gain.value = 180;
      l.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t + d0); g.gain.linearRampToValueAtTime(0.06, t + d0 + 0.02); g.gain.setValueAtTime(0.06, t + d0 + d - 0.03); g.gain.linearRampToValueAtTime(0.0001, t + d0 + d);
      o.connect(g).connect(a.destination); o.start(t + d0); l.start(t + d0); o.stop(t + d0 + d + 0.02); l.stop(t + d0 + d + 0.02);
    }
  }
  if (tipo === "gol") { soplo(a, t, 3.2, 700, 0.4, 0.5, 0.35); soplo(a, t + 0.1, 2.6, 1500, 0.6, 0.2, 0.3); }
  if (tipo === "uy") soplo(a, t, 1.1, 500, 0.7, 0.3, 0.15);
  if (tipo === "especial") { tono(a, t, 180, 1400, 0.45, "sawtooth", 0.09); soplo(a, t, 0.5, 2500, 0.5, 0.15, 0.1); }
  if (tipo === "palo") { tono(a, t, 950, 880, 0.35, "square", 0.08); tono(a, t, 1430, 1300, 0.25, "triangle", 0.08); }
  if (tipo === "parada") { tono(a, t, 90, 50, 0.12, "sine", 0.6); soplo(a, t, 0.25, 600, 0.8, 0.25); }
  if (tipo === "entrada") soplo(a, t, 0.25, 350, 0.7, 0.25, 0.05);
}
function habla(txt) {
  if (!sonidoOn || !("speechSynthesis" in window) || !S || S.attract) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt); u.lang = "es-ES"; u.rate = 1.08; u.pitch = 1.1;
    const v = speechSynthesis.getVoices().find(v => /^es(-|_)ES/i.test(v.lang)) || speechSynthesis.getVoices().find(v => /^es/i.test(v.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch {}
}

/* ================= equipos y caras ================= */
function rol(pos) {
  pos = (pos || "").toLowerCase();
  if (pos.startsWith("porter")) return "GK";
  if (pos.startsWith("defens") || pos.includes("lateral") || pos.includes("central")) return "DEF";
  if (pos.startsWith("delanter") || pos.includes("extrem")) return "FWD";
  return "MID";
}
function nombreCorto(n) {
  const w = String(n).trim().split(/\s+/);
  if (w.length === 1) return w[0];
  if (n.length <= 11) return n;
  return w.find(x => !x.endsWith(".") && x.length > 2) || w[0];
}
const CORTO_EQ = { senior: "Primer equipo", juvenil: "Juvenil", cadete: "Cadete", alevin: "Alevín", benjamin: "Benjamín", prebenjamin: "Prebenjamín" };
function preparaEquipo(eq) {
  const adulto = !eq.menores;
  let js = (eq.jugadores || []).filter(j => !STAFF.test(j.posicion || ""));
  const relleno = ["Portero", "Defensa", "Defensa", "Centrocampista", "Delantero", "Delantero", "Defensa"];
  for (let k = js.length; k < 7; k++) js.push({ nombre: "Jugador " + (k + 1), posicion: relleno[k % relleno.length], dorsal: k + 1 });
  const tengo = new Set(eq.id === "alevin" ? ((leeLS(CLAVE_ALBUM) || {}).tengo || ["hugo", "lucia", "martina"]) : []);
  const jugadores = js.map((j, k) => {
    const h = hash(eq.id + j.nombre);
    const p = j._p ? { ...j._p, dorsal: null } : {
      piel: h % 5, colorPelo: PELO[(h >>> 6) % PELO.length], adulto, barba: adulto && (h >>> 9) % 3 === 0,
      pelo: adulto ? ["corto", "calvo", "rizado", "corto", "largo"][(h >>> 3) % 5] : ["corto", "coleta", "largo", "rizado"][(h >>> 3) % 4],
    };
    const real = j.foto && !String(j.foto).startsWith("data:");
    const r = rol(j.posicion);
    return {
      nombre: j.nombre, corto: nombreCorto(j.nombre), rol: r, pos: j.posicion || "", dorsal: j.dorsal ?? (k + 1), p,
      foto: real && (adulto || j.juego) ? j.foto : null, encuadre: j.encuadre || "50% 30%", zoom: j.zoom,
      esp: r === "GK" ? null : LISTA_ESP[(h >>> 12) % LISTA_ESP.length], id: norm(j.nombre), propio: tengo.has(norm(j.nombre)),
    };
  });
  // entrenador en la banda: el del cuerpo técnico si está en la plantilla; si no, uno dibujado
  let e = (eq.jugadores || []).find(j => /entrenador|m[ií]ster/i.test(j.posicion || "")) || eq.entrenador;
  if (!e && eq.id === "senior") e = { nombre: "Manuel Jiménez", foto: "img/prensa/w-manuel.jpg", encuadre: "58.5% 27%", zoom: 0.22 };
  if (!e) e = { nombre: "Míster" };
  if (e.foto && /w-manuel/.test(e.foto) && !e.zoom) e = { ...e, encuadre: "58.5% 26.5%", zoom: 0.2 };
  const he = hash(eq.id + "mister" + e.nombre);
  const entrenador = {
    nombre: e.nombre, corto: nombreCorto(e.nombre), foto: e.foto && !String(e.foto).startsWith("data:") ? e.foto : null,
    encuadre: e.encuadre || "50% 30%", zoom: e.zoom,
    p: { piel: he % 5, colorPelo: PELO[(he >>> 6) % PELO.length], adulto: true, barba: (he >>> 9) % 2 === 0, pelo: ["corto", "calvo", "rizado", "corto"][(he >>> 3) % 4] },
  };
  return { id: eq.id, nombre: CORTO_EQ[eq.id] || eq.nombre, jugadores, kits: eq.kits || [0, 1], entrenador };
}
function svgCara(p) {
  let s = (window.Demo && Demo.avatar) ? Demo.avatar(p) : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><circle cx="100" cy="112" r="48" fill="#F2C9A5"/></svg>`;
  s = s.replace(/viewBox="[^"]*"/, 'viewBox="40 44 120 120"').replace(/preserveAspectRatio="[^"]*"/, "").replace("<svg ", '<svg width="240" height="240" ');
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
}
const CACHE_CARAS = new Map();
function cara(j) {          // canvas redondo 96x96 con la cara (sin borde de equipo)
  const clave = (j.foto ? j.foto + "|" + j.encuadre + "|" + (j.zoom || "") : JSON.stringify(j.p));
  if (CACHE_CARAS.has(clave)) return CACHE_CARAS.get(clave);
  const pr = new Promise(res => {
    const c = document.createElement("canvas"); c.width = c.height = 96; const g = c.getContext("2d");
    const img = new Image();
    img.onload = () => {
      g.save(); g.beginPath(); g.arc(48, 48, 46, 0, 7); g.clip();
      g.fillStyle = "#24345e"; g.fillRect(0, 0, 96, 96);
      if (j.foto) {
        const [ex, ey] = j.encuadre.split(" ").map(v => parseFloat(v) / 100 || 0.5);
        const s = Math.min(img.width, img.height) * (j.zoom || 0.55);
        g.drawImage(img, clamp(img.width * ex - s / 2, 0, img.width - s), clamp(img.height * ey - s / 2, 0, img.height - s), s, s, 0, 0, 96, 96);
      } else g.drawImage(img, 0, 0, 96, 96);
      g.restore(); res(c);
    };
    img.onerror = () => { g.fillStyle = "#F2C9A5"; g.beginPath(); g.arc(48, 48, 44, 0, 7); g.fill(); res(c); };
    img.src = j.foto || svgCara(j.p);
  });
  CACHE_CARAS.set(clave, pr); return pr;
}
function cabeza(caraC, kit, propio) {   // cara + borde del color del equipo
  const c = document.createElement("canvas"); c.width = c.height = 104; const g = c.getContext("2d");
  g.drawImage(caraC, 4, 4);
  g.lineWidth = 6; g.strokeStyle = kit.camiseta; g.beginPath(); g.arc(52, 52, 47, 0, 7); g.stroke();
  if (propio) { g.lineWidth = 3; g.strokeStyle = "#E6CD85"; g.beginPath(); g.arc(52, 52, 51, 0, 7); g.stroke(); }
  return c;
}

/* ================= vallas publicitarias ================= */
let VALLAS = [];
const VALLAS_DEF = [
  { tipo: "oleo" },
  { tipo: "texto", texto: "TU EMPRESA AQUÍ", sub: "Solo para clientes de Oleo Telecom", fondo: "#C9A23A", color: "#0B1226" },
  { tipo: "oleo-claro" },
  { tipo: "texto", texto: "¡AÚPA VILLARGORDO!", sub: "Escuela Deportiva Villargordo C.F.", fondo: "#B5122B", color: "#FFFFFF" },
];
function cargaImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
async function preparaVallas() {
  let lista = VALLAS_DEF;
  try { const r = await fetch("vallas.json", { cache: "no-store" }); if (r.ok) { const d = await r.json(); if (Array.isArray(d.vallas) && d.vallas.length) lista = d.vallas; } } catch {}
  const blanco = await cargaImg("img/patrocinadores/oleo-blanco.svg"), color = await cargaImg("img/patrocinadores/oleo-color.svg");
  VALLAS = [];
  for (const v of lista) {
    const c = document.createElement("canvas"); c.width = 400; c.height = 80; const g = c.getContext("2d");
    const caja = (fondo) => { g.fillStyle = fondo; g.fillRect(0, 0, 400, 80); g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(0, 0, 400, 6); };
    const logo = (img, fondo, lema, colorLema) => {
      caja(fondo);
      if (img) { const h = 46, w = img.width / img.height * h || 120; g.drawImage(img, 26, 17, w, h); }
      g.fillStyle = colorLema; g.font = "700 17px 'Inter Tight',Arial"; g.textAlign = "right"; g.textBaseline = "middle";
      g.fillText(lema, 380, 32); g.font = "500 13px 'Inter Tight',Arial"; g.fillText("Telefonía · Fibra · Energía", 380, 53);
    };
    if (v.tipo === "oleo") logo(blanco, "#0B1226", "Oleo Telecom", "#E6CD85");
    else if (v.tipo === "oleo-claro") logo(color, "#FFFFFF", "Conectados con Villargordo", "#3E5230");
    else if (v.tipo === "logo" && v.logo) {
      caja(v.fondo || "#FFFFFF"); const img = await cargaImg(v.logo);
      if (img) { const s = Math.min(360 / img.width, 64 / img.height); g.drawImage(img, 200 - img.width * s / 2, 40 - img.height * s / 2, img.width * s, img.height * s); }
      else { g.fillStyle = v.color || "#0B1226"; g.font = "800 30px 'Big Shoulders Display',Impact"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(v.nombre || "", 200, 40); }
    } else {
      caja(v.fondo || "#0B1226"); g.fillStyle = v.color || "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "900 34px 'Big Shoulders Display',Impact,sans-serif"; g.fillText(v.texto || "", 200, v.sub ? 33 : 40);
      if (v.sub) { g.font = "600 14px 'Inter Tight',Arial"; g.globalAlpha = 0.85; g.fillText(v.sub, 200, 60); g.globalAlpha = 1; }
    }
    VALLAS.push(c);
  }
}

/* ================= grada ================= */
let GRADA = null;
function preparaGrada() {
  const c = document.createElement("canvas"); c.width = 600; c.height = 170; const g = c.getContext("2d");
  const fondo = g.createLinearGradient(0, 0, 0, 170); fondo.addColorStop(0, "#0a1020"); fondo.addColorStop(1, "#1b2547");
  g.fillStyle = fondo; g.fillRect(0, 0, 600, 170);
  const cols = ["#B5122B", "#ffffff", "#F2C9A5", "#E0AC84", "#8D5A3B", "#C9A23A", "#658049", "#1d1410", "#B5122B"];
  for (let fila = 0; fila < 9; fila++) for (let i = 0; i < 46; i++) {
    const x = i * 13 + (fila % 2) * 6 + rnd(-2, 2), y = 14 + fila * 18 + rnd(-2, 2);
    g.fillStyle = cols[(i * 7 + fila * 3 + (i >> 2)) % cols.length]; g.fillRect(x - 4, y + 2, 9, 10);
    g.fillStyle = ["#F2C9A5", "#E0AC84", "#C68A62", "#8D5A3B"][(i + fila) % 4]; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill();
  }
  GRADA = c;
}

/* ================= estado ================= */
let EQUIPOS = [];
let S = null;                 // partido en curso
const joy = { x: 0, y: 0, activo: false, id: null, ox: 0, oy: 0 };
const cola = [];              // eventos de botones
let tiroPulsado = false;

function nuevoJugador(t, k, d, kit) {
  return {
    t, k, d, nombre: d.corto, rol: k === 0 ? "GK" : d.rol === "GK" ? "DEF" : d.rol, base: BASES[k], esp: d.esp, propio: d.propio,
    x: W / 2, y: H / 2, vx: 0, vy: 0, dx: 0, dy: 0, dir: t === 0 ? 0 : Math.PI, anim: 0,
    estado: "", et: 0, cool: 0, carga: -1, amarillas: 0, faltas: 0, fuera: 0, goles: 0, saqueT: 50,
    vel: (k === 0 ? 2.45 : d.rol === "FWD" ? 2.9 : d.rol === "MID" ? 2.8 : 2.65), cab: null, kit,
  };
}
async function nuevoPartido(cfg) {
  const s = {
    cfg, attract: !!cfg.attract, marcador: [0, 0], tiempo: cfg.mitad, parte: 1, fase: "juego", faseT: 0, frame: 0,
    jug: [], barra: [0, 0], armado: [false, false], cazador: [null, null], humano: null, proteg: null, pena: null, tanda: null,
    cam: { x: W / 2, y: H / 2, z: 1 }, shake: 0, part: [], aviso: null, avisoT: 0, siguiente: null, pausa: false, cambioT: 0,
    balon: { x: W / 2, y: H / 2, z: 0, vx: 0, vy: 0, vz: 0, dueno: null, ultimo: null, pateo: null, cool: 0, esp: null, espT: 0, efecto: 0, tiro: null, rastro: [], giro: 0, pase: false, enRed: false },
  };
  for (let t = 0; t < 2; t++) {
    const kit = (cfg.kits || KITS)[t];
    cfg.alin[t].forEach((d, k) => s.jug.push(nuevoJugador(t, k, d, kit)));
  }
  s.mister = [0, 1].map(t => ({ t, x: t ? W * 0.75 : W * 0.25, y: H + 34, vx: 0, anim: 0, d: (cfg.misters || [])[t] || { nombre: "Míster", p: { piel: 1, colorPelo: "#3a2a1c", adulto: true, pelo: "corto" } }, kit: (cfg.kits || KITS)[t], cab: null, frase: "", fT: 0, salta: 0 }));
  await Promise.all([...s.jug.map(async p => { p.cab = cabeza(await cara(p.d), p.kit, p.propio && !s.attract); }),
    ...s.mister.map(async m => { m.cab = cabeza(await cara(m.d), m.kit, false); })]);
  S = s;
  saqueCentro(0);
}
const portero = t => S.jug.find(p => p.t === t && p.rol === "GK");
const delantero = t => S.jug.filter(p => p.t === t && !p.fuera && p.rol !== "GK").sort((a, b) => b.k - a.k)[0];

/* ================= reanudaciones ================= */
function ponBalon(x, y, dueno) {
  Object.assign(S.balon, { centro: null, x, y, z: 0, vx: 0, vy: 0, vz: 0, dueno: dueno || null, tiro: null, esp: null, efecto: 0, enRed: false, pase: false, pateo: null, cool: 0 });
  S.balon.rastro.length = 0;
  if (dueno) S.balon.ultimo = dueno;
}
function saqueCentro(t) {
  for (const p of S.jug) {
    if (p.fuera) continue;
    let x = Math.min(p.base[0] * W * 0.95, W / 2 - 40); const y = p.base[1] * H;
    if (p.t === 1) x = W - x;
    Object.assign(p, { x, y, vx: 0, vy: 0, estado: "", et: 0, carga: -1, dir: p.t === 0 ? 0 : Math.PI });
  }
  const tk = delantero(t); tk.x = W / 2 + (t === 0 ? -14 : 14); tk.y = H / 2;
  ponBalon(W / 2, H / 2, tk);
  S.proteg = { x: W / 2, y: H / 2, r: 92, t, timer: 0, tipo: "centro" };
  if (t === 0 && !S.attract) S.humano = tk;
  else if (!S.attract) S.humano = delantero(0);
  S.fase = "juego";
}
function colocaSaque(t, x, y, tipo) {
  const dirAt = t === 0 ? 1 : -1;
  let tk;
  if (tipo === "puerta") tk = portero(t);
  else tk = S.jug.filter(p => p.t === t && !p.fuera && p.rol !== "GK").sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  const hacia = Math.atan2(H / 2 - y, (t === 0 ? W : 0) - x);
  const ang = tipo === "banda" ? Math.atan2(H / 2 - y, dirAt * 0.6) : tipo === "corner" ? Math.atan2(H / 2 - y, W / 2 - x) : hacia;
  tk.x = x - Math.cos(ang) * 14; tk.y = y - Math.sin(ang) * 14; tk.dir = ang; tk.estado = ""; tk.vx = tk.vy = 0; tk.saqueT = 45;
  ponBalon(x, y, tk);
  S.proteg = { x, y, r: tipo === "corner" ? 95 : 80, t, timer: 0, tipo };
  if (!S.attract) S.humano = (t === 0 && tk.rol !== "GK") ? tk : masCercano(0, x, y);
  S.fase = "juego";
}
function masCercano(t, x, y, excluir) {
  let m = null, md = 1e9;
  for (const p of S.jug) { if (p.t !== t || p.fuera || p.rol === "GK" || p === excluir) continue; const d = Math.hypot(p.x - x, p.y - y); if (d < md) { md = d; m = p; } }
  return m;
}
function parar(texto, sig, frames) {
  const b = S.balon;
  if (b.dueno) { b.dueno = null; }
  b.tiro = null;
  S.proteg = null; S.fase = "parado"; S.faseT = frames; S.siguiente = sig;
  for (const p of S.jug) p.carga = -1;
  if (texto) aviso(texto);
}
function aviso(txt, frames) { S.aviso = txt; S.avisoT = frames || 90; }

/* ================= patadas ================= */
function patea(p, vx, vy, vz, fuerte) {
  const b = S.balon;
  b.dueno = null; b.vx = vx; b.vy = vy; b.vz = vz; b.z = Math.max(b.z, 1); b.pateo = p; b.cool = 12; b.ultimo = p; b.efecto = 0; b.pase = false; b.tiro = null;
  S.proteg = null; p.carga = -1;
  sonido(fuerte ? "fuerte" : "patada");
}
function hayRivalEntre(a, q) { for (const o of S.jug) if (o.t !== a.t && !o.fuera && distSeg(o, a, q) < 20) return true; return false; }
function pase(p, dirx, diry, forzarAlto) {
  const b = S.balon;
  let best = null, bs = -1e9;
  for (const q of S.jug) {
    if (q.t !== p.t || q === p || q.fuera) continue;
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
    if (d < 45 || d > 650) continue;
    let s = (dx * dirx + dy * diry) / d * 2 - d / 700;
    for (const o of S.jug) if (o.t !== p.t && !o.fuera && distSeg(o, p, q) < 22) s -= 0.7;
    if (q.rol === "GK") s -= 1.6;
    s += (p.t === 0 ? dx : -dx) / d * 0.35;
    if (s > bs) { bs = s; best = q; }
  }
  if (!best || bs < -0.4) {
    const m = Math.hypot(dirx, diry) || 1;
    patea(p, dirx / m * 9.5, diry / m * 9.5, 0.4); b.pase = true; return;
  }
  const lead = 14, tx = best.x + best.vx * lead, ty = best.y + best.vy * lead;
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
  if (forzarAlto || d > 360 || hayRivalEntre(p, best)) {
    const sp = Math.min(11, 4.2 + d / 60), tt = d / sp;
    patea(p, dx / d * sp, dy / d * sp, G * tt / 2);
  } else {
    const sp = clamp(d / 44 + 2, 5, 12.5);
    patea(p, dx / d * sp, dy / d * sp, 0.3);
  }
  b.pase = true;
}
function tira(p, pot, aimY, esp) {
  const b = S.balon, sg = p.t === 0 ? 1 : -1, gx = p.t === 0 ? W + 6 : -6;
  const err = (1 - S.cfg.dif.punteria[p.t]) * rnd(-70, 70) * (0.4 + pot * 0.6);
  let ty = H / 2 + clamp(aimY, -GW / 2 + 8, GW / 2 - 8) + err;
  let dx = gx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
  let sp = 8 + pot * 10, vz = 0.8 + pot * 2 + d / 700 + (pot > 0.93 ? rnd(0, 3) : 0);
  let efecto = 0;
  if (esp === "fuego") { sp = 21; vz = 0.6 + d / 1000; }
  if (esp === "rayo") { sp = 16; vz = 0.8 + d / 900; }
  if (esp === "fantasma") { sp = 15; vz = 1 + d / 800; }
  if (esp === "aceituna") { sp = 14; vz = 1.2 + d / 800; }
  if (esp === "banana") {
    sp = 15; vz = 1 + d / 850; const lado = Math.random() < 0.5 ? -1 : 1;
    ty = H / 2 + lado * (GW / 2 - 18); dx = gx - b.x; dy = ty - b.y; d = Math.hypot(dx, dy);
    const giro = -lado * sg * 0.5; const c = Math.cos(giro), s = Math.sin(giro);
    const ux = dx / d, uy = dy / d; dx = ux * c - uy * s; dy = ux * s + uy * c; d = 1; efecto = lado * sg * 0.021;
  }
  patea(p, dx / d * sp, dy / d * sp, vz, true);
  b.tiro = { t: p.t }; b.esp = esp || null; b.espT = 0; b.efecto = efecto; b.rastro.length = 0;
  if (esp) {
    S.barra[p.t] = 0; S.armado[p.t] = false; S.shake = 14;
    aviso(ESPECIALES[esp].ico + " " + ESPECIALES[esp].nombre.toUpperCase(), 80); sonido("especial");
  }
}
function centro(p) {
  const b = S.balon, gx = p.t === 0 ? W - 105 : 105;
  let best = null, bs = -1e9;
  for (const q of S.jug) {
    if (q.t !== p.t || q === p || q.fuera || q.rol === "GK") continue;
    const sc = -Math.hypot(q.x - gx, q.y - H / 2);
    if (sc > bs) { bs = sc; best = q; }
  }
  let tx = gx, ty = H / 2 + rnd(-50, 50);
  if (best) { tx = (best.x + gx) / 2; ty = (best.y + ty) / 2; }
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
  const sp = clamp(d / 24, 7, 13), tt = d / sp;
  patea(p, dx / d * sp, dy / d * sp, (26 + G * tt * tt / 2) / tt);
  b.pase = true; b.centro = { x: tx, y: ty, t: p.t };
  if (best && p.t === 0 && !S.attract) { S.humano = best; S.cambioT = 90; aviso("¡CENTRO! Pulsa TIRO para la chilena", 70); }
}
function chilena(p) {
  const b = S.balon, gx = p.t === 0 ? W + 4 : -4, gy = H / 2 + rnd(-GW / 2 + 15, GW / 2 - 15);
  p.estado = "chilena"; p.et = 36; p.vx *= 0.2; p.vy *= 0.2;
  const dx = gx - b.x, dy = gy - b.y, d = Math.hypot(dx, dy) || 1;
  const esp = S.armado[p.t] ? p.esp : null;
  patea(p, dx / d * 15.5, dy / d * 15.5, 0.6 + d / 650, true);
  b.tiro = { t: p.t }; b.esp = esp; b.espT = 0; b.rastro.length = 0; b.centro = null;
  if (esp) { S.barra[p.t] = 0; S.armado[p.t] = false; }
  S.shake = 10; aviso("¡CHILENA!" + (esp ? " " + ESPECIALES[esp].ico : ""), 80); sonido("especial");
}
function entrada(p) {
  if (p.estado) return;
  p.estado = "entrada"; p.et = 26; p.tocoBalon = false;
  p.vx = Math.cos(p.dir) * 6.3; p.vy = Math.sin(p.dir) * 6.3;
  for (let i = 0; i < 10; i++) S.part.push({ x: p.x, y: p.y, z: 1, vx: -p.vx * rnd(0.1, 0.4) + rnd(-1, 1), vy: -p.vy * rnd(0.1, 0.4) + rnd(-1, 1), vz: rnd(0.5, 2), vida: rnd(15, 30), c: ["#c9b98f", "#a89468", "#3d7330"][i % 3] });
  sonido("entrada");
}
function compruebaEntrada(p) {
  const b = S.balon;
  const px = p.x + Math.cos(p.dir) * 9, py = p.y + Math.sin(p.dir) * 9;
  if (!p.tocoBalon && b.z < 10 && Math.hypot(b.x - px, b.y - py) < 17 && !(b.dueno && b.dueno.rol === "GK")) {
    p.tocoBalon = true;
    if (b.dueno && b.dueno.t !== p.t) { const v = b.dueno; v.estado = "suelo"; v.et = 24; }
    b.dueno = null; b.vx = Math.cos(p.dir) * 4.5 + p.vx * 0.3; b.vy = Math.sin(p.dir) * 4.5 + p.vy * 0.3; b.vz = 0;
    b.pateo = p; b.cool = 6; b.ultimo = p; b.tiro = null;
    S.barra[p.t] = Math.min(100, S.barra[p.t] + 6);
  }
  for (const o of S.jug) {
    if (o.t === p.t || o.fuera || o.estado === "suelo") continue;
    if (Math.hypot(o.x - p.x, o.y - p.y) < 19) {
      const conBalon = b.dueno === o || Math.hypot(b.x - o.x, b.y - o.y) < 40;
      o.estado = "suelo"; o.et = 55; o.vx = p.vx * 0.4; o.vy = p.vy * 0.4;
      if (!p.tocoBalon && conBalon) { falta(p, o, Math.cos(p.dir - o.dir) > 0.35); return; }
    }
  }
}
function falta(a, v, detras) {
  const t = v.t;
  let tarjeta = null;
  a.faltas++;
  if (detras || a.faltas >= 3) { a.amarillas++; tarjeta = a.amarillas >= 2 ? "roja" : "amarilla"; }
  sonido("silbato");
  grita(t, pick(["¡Tarjeta, árbitro!", "¡Eso es falta!", "¡Árbitro!"])); grita(a.t, pick(["¡Si no le ha tocado!", "¡Al balón, al balón!", "¡Se ha tirado!"]));
  const enArea = t === 0 ? (v.x > W - BOX_X && Math.abs(v.y - H / 2) < BOX_W / 2) : (v.x < BOX_X && Math.abs(v.y - H / 2) < BOX_W / 2);
  const fx = clamp(v.x, 30, W - 30), fy = clamp(v.y, 30, H - 30);
  let txt = enArea ? "¡PENALTI!" : "¡FALTA!";
  if (tarjeta === "amarilla") txt += "  🟨 " + a.nombre;
  if (tarjeta === "roja") { txt += "  🟥 " + a.nombre + " · 20 s fuera"; }
  parar(txt, () => {
    if (tarjeta === "roja") { a.fuera = 60 * 20; a.amarillas = 0; a.faltas = 0; }
    if (enArea) iniciaPenalti(t, false); else colocaSaque(t, fx, fy, "falta");
  }, 85);
}
function cogeBalon(p) {
  const b = S.balon, antes = b.ultimo;
  if (b.pase && antes && antes.t === p.t && antes !== p) S.barra[p.t] = Math.min(100, S.barra[p.t] + (p.propio || antes.propio ? 15 : 8));
  b.dueno = p; b.ultimo = p; b.tiro = null; b.esp = null; b.centro = null; b.rastro.length = 0; b.efecto = 0; b.pase = false; b.vz = 0; b.z = 0;
  p.carga = -1;
  if (p.t === 0 && p.rol !== "GK" && !S.attract) S.humano = p;
  if (p.rol === "GK") p.saqueT = 55;
}
function gkAtaja(g, v) {
  const b = S.balon;
  const enArea = g.t === 0 ? b.x < BOX_X : b.x > W - BOX_X;
  if (!enArea) return false;
  if (b.tiro && b.tiro.t !== g.t) {
    if (b.esp === "aceituna" && Math.random() < 0.55) {
      g.estado = "suelo"; g.et = 60; aviso("🫒 ¡La aceituna tumba al portero!", 80); b.vx *= 0.85; b.vy *= 0.85; b.cool = 30; b.pateo = g; sonido("parada"); return true;
    }
    let pr = v > 15 ? 0.5 : v > 11 ? 0.72 : 0.92;
    if (b.esp === "fuego") pr = 0.04;
    if (b.esp === "fantasma" || b.esp === "rayo") pr *= 0.35;
    pr *= S.cfg.dif.portero[g.t];
    if (Math.random() < pr) { cogeBalon(g); aviso("¡PARADÓN de " + g.nombre + "!", 70); sonido("parada"); return true; }
    if (b.esp === "fuego" || (b.esp && Math.random() < 0.5)) { b.cool = 30; b.pateo = g; return true; }
    const sg = g.t === 0 ? 1 : -1;
    b.vx = sg * rnd(3, 6); b.vy = rnd(-6, 6); b.vz = rnd(2, 5); b.z = Math.max(b.z, 2);
    b.tiro = null; b.esp = null; b.pateo = g; b.cool = 14; b.ultimo = g;
    aviso("¡Despeje de " + g.nombre + "!", 60); sonido("parada"); return true;
  }
  cogeBalon(g); return true;
}

/* ================= jugadores ================= */
function mueve(p) {
  if (p.fuera > 0) {
    p.fuera--; p.x = -999; p.y = -999;
    if (p.fuera === 0) { p.x = W / 2 + (p.t === 0 ? -60 : 60); p.y = -10; p.estado = ""; }
    return;
  }
  if (p.cool > 0) p.cool--;
  if (p.estado) {
    p.et--;
    if (p.estado === "entrada") { p.vx *= 0.95; p.vy *= 0.95; if (S.fase === "juego") compruebaEntrada(p); }
    else { p.vx *= 0.85; p.vy *= 0.85; }
    if (p.et <= 0) p.estado = "";
  } else {
    const sp = p.vel * S.cfg.dif.vel[p.t] * (p === S.humano ? 1.06 : 1) * (S.balon.dueno === p ? 0.9 : 1);
    p.vx += (p.dx * sp - p.vx) * 0.2; p.vy += (p.dy * sp - p.vy) * 0.2;
    if (Math.abs(p.dx) + Math.abs(p.dy) > 0.15) p.dir = Math.atan2(p.dy, p.dx);
  }
  p.x = clamp(p.x + p.vx, -40, W + 40); p.y = clamp(p.y + p.vy, -26, H + 26);
  p.anim += Math.hypot(p.vx, p.vy) * 0.28;
  const pr = S.proteg;
  if (pr && p.t !== pr.t) {
    const d = Math.hypot(p.x - pr.x, p.y - pr.y);
    if (d < pr.r) { const a = Math.atan2(p.y - pr.y, p.x - pr.x) || 0; p.x = pr.x + Math.cos(a) * pr.r; p.y = pr.y + Math.sin(a) * pr.r; }
  }
}
function separa() {
  const L = S.jug;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j]; if (a.fuera || b.fuera) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < 20) { const k = (20 - d) / d * 0.5; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
  }
}
function cazadores() {
  const b = S.balon;
  S.cobertura = [null, null];
  for (let t = 0; t < 2; t++) {
    let m = null, md = 1e9, m2 = null, md2 = 1e9;
    for (const p of S.jug) {
      if (p.t !== t || p.fuera || p.rol === "GK" || p.estado === "suelo" || p === S.humano) continue;
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < md) { m2 = m; md2 = md; md = d; m = p; } else if (d < md2) { md2 = d; m2 = p; }
    }
    S.cobertura[t] = m2;
    if (t === 0 && S.humano && m) {
      const dh = Math.hypot(S.humano.x - b.x, S.humano.y - b.y);
      if (!(b.x < W * 0.45 || dh > md + 80)) m = null;
    }
    S.cazador[t] = m;
  }
}
function ia(p) {
  if (p.fuera || p.estado) { p.dx = p.dy = 0; return; }
  if (p.rol === "GK") return iaPortero(p);
  const b = S.balon, dirAt = p.t === 0 ? 1 : -1, dif = S.cfg.dif;
  if (b.dueno === p) return iaConBalon(p);
  const nuestro = b.dueno && b.dueno.t === p.t;
  let hx = (p.t === 0 ? p.base[0] : 1 - p.base[0]) * W, hy = p.base[1] * H;
  hx += (b.x - W / 2) * 0.5; hy += (b.y - hy) * 0.32;
  hx += nuestro ? dirAt * 110 : -dirAt * 30;
  if (nuestro && p.rol === "FWD") { hy = H / 2 + (p.y < H / 2 ? -1 : 1) * 60; }
  let tx = hx, ty = hy;
  if (!nuestro && S.cazador[p.t] === p) {
    tx = b.x + b.vx * 6; ty = b.y + b.vy * 6;
    if (b.dueno && b.dueno.t !== p.t && !(b.dueno.rol === "GK")) {
      const d = dist(p, b.dueno);
      if (d < 55 && d > 22 && Math.random() < dif.entrada[p.t]) { p.dir = Math.atan2(b.y - p.y, b.x - p.x); entrada(p); return; }
      if (d < 16 && Math.random() < dif.robo[p.t]) { const v = b.dueno; cogeBalon(p); b.pateo = v; v.cool = 30; return; }
    }
  }
  if (!nuestro && S.cobertura && S.cobertura[p.t] === p) {      // cubre entre el balón y su portería
    const gx = p.t === 0 ? 0 : W; tx = b.x + (gx - b.x) * 0.3; ty = b.y + (H / 2 - b.y) * 0.3;
  }
  if (!b.dueno && b.z > 12 && b.z < 46 && b.vz < 1 && dist(p, b) < 30 && Math.abs((p.t === 0 ? W : 0) - b.x) < 520 && Math.random() < 0.12) { chilena(p); return; }
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d < 3) { p.dx = p.dy = 0; p.dir = Math.atan2(b.y - p.y, b.x - p.x); return; }
  const k = Math.min(1, d / 30); p.dx = dx / d * k; p.dy = dy / d * k;
}
function iaConBalon(p) {
  const b = S.balon, dirAt = p.t === 0 ? 1 : -1, gx = p.t === 0 ? W : 0;
  if (S.proteg) {
    S.proteg.timer++; p.dx = p.dy = 0;
    if (S.proteg.timer < 50) return;
    const tp = S.proteg.tipo, dg = Math.hypot(gx - p.x, H / 2 - p.y);
    if (tp === "corner") return pase(p, -Math.cos(p.dir) * 0 + (gx === W ? -1 : 1) * 0.3, Math.sign(H / 2 - p.y), true);
    if (tp === "falta" && dg < 380) return tira(p, rnd(0.75, 0.95), rnd(-70, 70), S.barra[p.t] >= 100 ? p.esp : null);
    return pase(p, dirAt, 0);
  }
  const dg = Math.hypot(gx - p.x, H / 2 - p.y);
  if (dg < 200 || (dg < 330 && Math.random() < 0.06)) {
    return tira(p, rnd(0.55, 0.95), rnd(-70, 70), S.barra[p.t] >= 100 && !(p.t === 0 && !S.attract) ? p.esp : null);
  }
  let cerca = 1e9;
  for (const o of S.jug) if (o.t !== p.t && !o.fuera) cerca = Math.min(cerca, dist(o, p));
  if (Math.abs(gx - p.x) < 230 && Math.abs(p.y - H / 2) > 160 && Math.random() < 0.05) return pase(p, 0, Math.sign(H / 2 - p.y), true);
  if ((cerca < 42 && Math.random() < 0.05) || Math.random() < 0.006) return pase(p, dirAt, 0);
  let dx = dirAt, dy = (H / 2 - p.y) / 420;
  for (const o of S.jug) {
    if (o.t === p.t || o.fuera) continue;
    const ox = o.x - p.x, oy = o.y - p.y, d = Math.hypot(ox, oy);
    if (d < 75 && ox * dirAt > -10) dy += (oy > 0 ? -1 : 1) * (75 - d) / 75 * 1.1;
  }
  const m = Math.hypot(dx, dy) || 1; p.dx = dx / m; p.dy = dy / m;
}
function iaPortero(g) {
  const b = S.balon, lx = g.t === 0 ? 16 : W - 16;
  if (b.dueno === g) {
    g.dx = g.dy = 0; g.saqueT--;
    if (S.proteg) S.proteg.timer++;
    if (g.saqueT <= 0) { g.dir = g.t === 0 ? 0 : Math.PI; pase(g, g.t === 0 ? 1 : -1, 0); }
    return;
  }
  let tx = lx, ty = H / 2 + (b.y - H / 2) * 0.55, rapido = false;
  if (b.tiro && b.tiro.t !== g.t && ((g.t === 0 && b.vx < 0) || (g.t === 1 && b.vx > 0))) {
    const tt = (lx - b.x) / b.vx; ty = b.y + b.vy * tt; rapido = true;
    if (b.esp === "fantasma" && b.espT % 30 < 22) ty = g.y;
    if (b.esp === "rayo") ty += Math.sin(S.frame * 0.25) * 45;
  }
  const enArea = g.t === 0 ? b.x < BOX_X - 30 : b.x > W - BOX_X + 30;
  const db = dist(g, b);
  if (!rapido && !b.dueno && enArea && db < 130 && Math.abs(b.y - H / 2) < BOX_W / 2 - 30) { tx = b.x; ty = b.y; }
  else if (!rapido && b.dueno && b.dueno.t !== g.t && enArea && db < 110) {
    if (db < 75) { tx = b.x; ty = b.y; } else { tx = (b.x + lx) / 2; ty = b.y; }
    if (db < 22 && Math.random() < 0.09 * S.cfg.dif.portero[g.t]) { const v = b.dueno; cogeBalon(g); b.pateo = v; v.cool = 30; aviso("¡Blocaje de " + g.nombre + "!", 60); sonido("parada"); return; }
  }
  else ty = clamp(ty, GY0 - 14, GY1 + 14);
  const dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy);
  const k = Math.min(rapido ? 1.6 : 1, d / 10);
  g.dx = d ? dx / d * k : 0; g.dy = d ? dy / d * k : 0;
  if (d > 2) g.dir = Math.atan2(b.y - g.y, b.x - g.x);
}

/* ================= control humano ================= */
function controlHumano() {
  let h = S.humano;
  if (!h || h.fuera) { h = S.humano = masCercano(0, S.balon.x, S.balon.y); if (!h) return; }
  const b = S.balon;
  if (S.cambioT > 0) S.cambioT--;
  const conBalon = b.dueno === h;
  if (conBalon && S.proteg) {
    h.dx = h.dy = 0; S.proteg.timer++;
    if (Math.hypot(joy.x, joy.y) > 0.3) { h.dir = Math.atan2(joy.y, joy.x); if (S.proteg.timer > 20 && S.proteg.tipo !== "corner") S.proteg = null; }
    else if (S.proteg.timer > 60 * 7) pase(h, Math.cos(h.dir), Math.sin(h.dir));
  }
  else { h.dx = joy.x; h.dy = joy.y; }
  if (h.carga >= 0) {
    if (!conBalon) h.carga = -1;
    else { h.carga++; if (h.carga > 70) suelta(h); }
  }
  // chilena fácil: si pulsaste TIRO un poco antes, se hace sola cuando llega el balón
  const chilenaOk = () => !b.dueno && b.z > 6 && b.z < 85 && dist(h, b) < 58;
  if (h.chil > 0) { h.chil--; if (!h.estado && chilenaOk()) { h.chil = 0; chilena(h); } }
  // en un centro, el rematador va solo hacia el balón si no tocas el joystick
  if (b.centro && b.centro.t === 0 && !b.dueno && Math.hypot(joy.x, joy.y) < 0.2) {
    const px = b.centro.x, py = b.centro.y, dd = Math.hypot(px - h.x, py - h.y);
    if (dd > 8) { h.dx = (px - h.x) / dd; h.dy = (py - h.y) / dd; }
  }
  for (const e of cola.splice(0)) {
    if (h.estado && e !== "esp") continue;
    if (e === "pase") {
      if (conBalon) pase(h, Math.cos(h.dir), Math.sin(h.dir), S.proteg && S.proteg.tipo === "corner");
      else {
        const n = masCercano(0, b.x, b.y, h); if (n) { S.humano = n; S.cambioT = 40; }
      }
    } else if (e === "centro") {
      if (conBalon) centro(h);
      else { const n = masCercano(0, b.x, b.y, h); if (n) { S.humano = n; S.cambioT = 40; } }
    } else if (e === "tiro") {
      if (conBalon) h.carga = 0;
      else if (chilenaOk()) chilena(h);
      else if (!b.dueno && b.centro && b.centro.t === 0) h.chil = 100;
      else if (!b.dueno && b.z > 4 && dist(h, b) < 140) h.chil = 30;
      else entrada(h);
    } else if (e === "tiroUp") {
      if (conBalon && h.carga >= 0) suelta(h);
    } else if (e === "esp") {
      if (S.barra[0] < 100) aviso(`⚡ Barra al ${Math.floor(S.barra[0])} % · pasa y roba para llenarla`, 60);
      else if (conBalon && h.esp && !h.estado) tira(h, 1, joy.y * 75, h.esp);      // ¡dispara el especial ya!
      else if (!S.armado[0]) { S.armado[0] = true; aviso("⚡ ¡Especial listo! Tu próximo tiro o chilena", 80); sonido("especial"); }
    }
  }
  // robo al chocar
  if (!conBalon && !h.estado && b.dueno && b.dueno.t === 1 && b.dueno.rol !== "GK" && dist(h, b.dueno) < 17 && Math.random() < S.cfg.dif.robo[0]) {
    const v = b.dueno; cogeBalon(h); b.pateo = v; v.cool = 30;
  }
  // cambio automático
  if (!b.dueno || b.dueno.t === 1) {
    if (S.cambioT <= 0 && S.frame % 15 === 0) {
      const n = masCercano(0, b.x, b.y);
      if (n && n !== h && dist(h, b) > dist(n, b) + 110) S.humano = n;
    }
  }
}
function suelta(h) {
  const pot = 0.35 + 0.65 * Math.min(1, h.carga / 42);
  const esp = S.armado[0] ? h.esp : null;
  tira(h, pot, joy.y * 75, esp);
}

/* ================= balón y reglas ================= */
function fisicaBalon() {
  const b = S.balon;
  if (b.dueno) {
    const p = b.dueno;
    b.x = p.x + Math.cos(p.dir) * 13; b.y = p.y + Math.sin(p.dir) * 13; b.z = 0; b.vx = p.vx; b.vy = p.vy; b.vz = 0;
    b.giro += Math.hypot(p.vx, p.vy) * 0.3; return;
  }
  if (b.efecto) {
    const c = Math.cos(b.efecto), s = Math.sin(b.efecto), vx = b.vx * c - b.vy * s;
    b.vy = b.vx * s + b.vy * c; b.vx = vx; b.efecto *= 0.965; if (Math.abs(b.efecto) < 0.0004) b.efecto = 0;
  }
  if (b.esp) b.espT++;
  b.x += b.vx; b.y += b.vy;
  if (b.esp === "rayo") b.y += Math.sin(b.espT * 0.55) * 4.5;
  if (b.z > 0 || b.vz > 0) {
    b.vz -= G; b.z += b.vz;
    if (b.z <= 0) { b.z = 0; if (b.vz < -1.6) b.vz = -b.vz * 0.45; else b.vz = 0; }
  }
  const f = b.z < 1 ? 0.982 : 0.997; b.vx *= f; b.vy *= f;
  b.giro += Math.hypot(b.vx, b.vy) * 0.3;
  if (b.cool > 0) b.cool--;
  if (b.esp) { b.rastro.push({ x: b.x, y: b.y, z: b.z }); if (b.rastro.length > 16) b.rastro.shift(); if (Math.hypot(b.vx, b.vy) < 4) { b.esp = null; } }
  else if (b.rastro.length) b.rastro.shift();
  if (b.enRed) {   // dentro de la red
    if (b.x < -26) { b.x = -26; b.vx = Math.abs(b.vx) * 0.1; }
    if (b.x > W + 26) { b.x = W + 26; b.vx = -Math.abs(b.vx) * 0.1; }
    if (b.y < GY0 + 4) { b.y = GY0 + 4; b.vy = Math.abs(b.vy) * 0.2; }
    if (b.y > GY1 - 4) { b.y = GY1 - 4; b.vy = -Math.abs(b.vy) * 0.2; }
    if (b.z > GH - 4) { b.z = GH - 4; b.vz = -Math.abs(b.vz) * 0.2; }
    b.vx *= 0.9; b.vy *= 0.9;
  }
}
function recogidas() {
  const b = S.balon; if (b.dueno || b.enRed) return;
  let m = null, md = 1e9;
  for (const p of S.jug) {
    if (p.fuera || p.estado === "suelo" || p.estado === "chilena") continue;
    if (p === b.pateo && b.cool > 0) continue;
    const gk = p.rol === "GK" && (p.t === 0 ? b.x < BOX_X : b.x > W - BOX_X);
    const r = gk ? 27 : 17, zmax = gk ? 44 : 13;
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d < r && b.z < zmax && d < md) { md = d; m = p; }
  }
  if (!m) return;
  const v = Math.hypot(b.vx, b.vy);
  if (m.rol === "GK" && gkAtaja(m, v)) return;
  if (v > 13 && Math.random() < 0.55) {
    b.vx = -b.vx * 0.35 + rnd(-2, 2); b.vy = -b.vy * 0.35 + rnd(-2, 2); b.pateo = m; b.cool = 8; b.tiro = null; b.esp = null; b.ultimo = m; return;
  }
  cogeBalon(m);
}
function reglas() {
  const b = S.balon;
  if (b.enRed) return;
  // palos
  for (const gx of [0, W]) {
    if (Math.abs(b.x - gx) < 7 && b.z < GH) for (const py of [GY0, GY1]) {
      if (Math.abs(b.y - py) < 6) { b.vy = -b.vy * 0.8 + (b.y < py ? -1 : 1); b.vx *= -0.6; b.x = gx + (gx ? -8 : 8); b.tiro = null; b.esp = null; aviso("¡Al palo!", 60); sonido("palo"); sonido("uy"); return; }
    }
  }
  if (b.x < 0 || b.x > W) {
    const lado = b.x < 0 ? 0 : 1;           // portería del equipo 0 a la izquierda
    const enBoca = b.y > GY0 && b.y < GY1;
    if (enBoca && b.z < GH) { b.enRed = true; b.dueno = null; return gol(1 - lado, b.ultimo); }
    if (enBoca && b.z < GH + 5) { b.vz = -Math.abs(b.vz) * 0.5; b.vx = -b.vx * 0.5; b.x = lado ? W - 2 : 2; b.tiro = null; b.esp = null; aviso("¡Al larguero!", 60); sonido("palo"); sonido("uy"); return; }
    const ataca = 1 - lado, ult = b.ultimo ? b.ultimo.t : ataca;
    if (b.tiro) sonido("uy");
    if (ult === ataca) parar("Saque de puerta", () => colocaSaque(lado, lado ? W - 50 : 50, H / 2, "puerta"), 50);
    else parar("¡Córner!", () => colocaSaque(ataca, lado ? W - 3 : 3, b.y < H / 2 ? 3 : H - 3, "corner"), 50);
    return;
  }
  if (b.y < 0 || b.y > H) {
    const t = b.ultimo ? 1 - b.ultimo.t : 0;
    const x = clamp(b.x, 20, W - 20), y = b.y < 0 ? 2 : H - 2;
    parar("Saque de banda", () => colocaSaque(t, x, y, "banda"), 40);
  }
}
function gol(t, autor) {
  S.marcador[t]++;
  const propia = autor && autor.t !== t;
  if (autor && !propia) autor.goles++;
  S.fase = "gol"; S.faseT = 190; S.golDe = { t, autor, propia };
  S.proteg = null; S.shake = 18;
  sonido("gol"); sonido("silbato");
  const nombre = autor ? autor.nombre : "";
  grita(t, pick(["¡GOLAZO!", "¡Eso es, eso es!", "¡Toma ya!"]), true); grita(1 - t, pick(["¡Pero bueno!", "¡Despertad!", "¿Quién marcaba a ese?"]));
  if (!S.attract) {
    habla(propia ? "¡Gol en propia puerta!" : `¡Gooool de ${nombre}!`);
    muestraGol(autor, propia);
  }
  for (let i = 0; i < 90; i++) S.part.push({ x: t === 0 ? W : 0, y: H / 2 + rnd(-90, 90), z: rnd(0, 40), vx: rnd(-4, 4), vy: rnd(-4, 4), vz: rnd(2, 8), vida: rnd(60, 120), c: ["#C9A23A", "#B5122B", "#ffffff", "#E6CD85"][i % 4] });
}

/* ================= penaltis ================= */
function iniciaPenalti(t, tanda) {
  S.fase = "pena";
  const sx = t === 0 ? W - SPOT : SPOT;
  let tk;
  if (tanda) { const L = S.tanda.orden[t]; tk = L[S.tanda.n[t] % L.length]; }
  else tk = S.jug.filter(p => p.t === t && !p.fuera && p.rol !== "GK").sort((a, b) => (b.rol === "FWD") - (a.rol === "FWD"))[0];
  const g = portero(1 - t);
  S.pena = { t, tanda, fase: "apunta", timer: 0, sx, tk, g, apunta: 0, buzo: 0, res: null };
  ponBalon(sx, H / 2, null);
  Object.assign(tk, { x: sx - (t === 0 ? 30 : -30), y: H / 2 + 6, vx: 0, vy: 0, estado: "", dir: t === 0 ? 0 : Math.PI });
  Object.assign(g, { x: t === 0 ? W - 6 : 6, y: H / 2, vx: 0, vy: 0, estado: "", dir: t === 0 ? Math.PI : 0 });
  for (const p of S.jug) if (p !== tk && p !== g && !p.fuera) {
    Object.assign(p, { x: t === 0 ? W - BOX_X - 30 - rnd(0, 90) : BOX_X + 30 + rnd(0, 90), y: H / 2 + rnd(-220, 220), vx: 0, vy: 0, estado: "", dx: 0, dy: 0 });
  }
  S.proteg = null;
  if (!S.attract) {
    if (t === 0) aviso("Pulsa TIRO cuando la mira esté dentro", 150);
    else aviso("¡Eres el portero! Mueve el joystick ↑ ↓ para elegir lado", 150);
  }
}
function penalti() {
  const P = S.pena, b = S.balon, g = P.g, tk = P.tk;
  P.timer++;
  for (const p of S.jug) { if (p !== g && p !== tk) { p.dx = p.dy = 0; } }
  if (P.fase === "apunta") {
    const humanoTira = P.t === 0 && !S.attract;
    if (humanoTira) {
      P.apunta = Math.sin(P.timer * 0.055) * (GW / 2 + 22);
      for (const e of cola.splice(0)) if (e === "tiro" && P.timer > 20) return dispara(P.apunta);
      if (P.timer > 60 * 7) return dispara(P.apunta);
    } else {
      cola.length = 0;
      if (P.t === 1 && !S.attract) P.buzo = joy.y < -0.35 ? -1 : joy.y > 0.35 ? 1 : 0;
      if (P.timer === 95) {
        const zona = [-1, 0, 1][Math.floor(Math.random() * 3)];
        dispara(zona * (GW / 2 - 20) + rnd(-12, 12) + (Math.random() < 0.08 ? zona * 40 : 0));
      }
    }
    if (P.timer > 70 && P.fase === "apunta") { tk.dx = P.t === 0 ? 0.6 : -0.6; tk.dy = 0; } else { tk.dx = tk.dy = 0; }
  } else if (P.fase === "vuelo") {
    fisicaBalon();
    const objetivo = H / 2 + P.buzo * (GW / 2 - 16);
    if (P.timer > 4) { g.y += clamp(objetivo - g.y, -6.5, 6.5); g.estado = P.buzo ? "estira" : ""; }
    const llega = P.t === 0 ? b.x >= W - 10 : b.x <= 10;
    if (llega && !P.res) {
      const enBoca = b.y > GY0 && b.y < GY1 && b.z < GH;
      if (Math.abs(b.y - g.y) < 26 && b.z < 38) { P.res = "parada"; b.vx *= -0.3; b.vy = rnd(-4, 4); b.vz = 3; aviso("¡PARADÓN de " + g.nombre + "!", 90); sonido("parada"); if (!S.attract) habla("¡Paradón!"); }
      else if (enBoca) { P.res = "gol"; b.enRed = true; aviso("¡GOOOL!", 90); sonido("gol"); }
      else { P.res = "fuera"; aviso("¡Fuera!", 80); sonido("uy"); }
      P.fase = "fin"; P.timer = 0;
    }
    if (P.timer > 120 && !P.res) { P.res = "fuera"; P.fase = "fin"; P.timer = 0; }
  } else if (P.fase === "fin") {
    fisicaBalon();
    if (P.timer > 100) finPenalti();
  }
  for (const p of S.jug) if (p !== g) mueve(p);
  g.x = clamp(g.x, 0, W); g.anim += 0.1;
}
function dispara(y) {
  const P = S.pena, b = S.balon, tk = P.tk;
  P.fase = "vuelo"; P.timer = 0; P.apuntaFinal = y; tk.dx = tk.dy = 0; tk.vx *= 0.3; tk.vy *= 0.3;
  const gx = P.t === 0 ? W + 6 : -6, ty = H / 2 + y, dx = gx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
  patea(tk, dx / d * 14, dy / d * 14, rnd(0.8, 2.4), true);
  b.tiro = { t: P.t };
  if (P.t === 0 || S.attract) {
    const zonaReal = Math.abs(y) < GW / 6 ? 0 : Math.sign(y);
    P.buzo = Math.random() < S.cfg.dif.penIA ? zonaReal : [-1, 0, 1][Math.floor(Math.random() * 3)];
  }
}
function finPenalti() {
  const P = S.pena; S.pena = null;
  if (P.tanda) {
    const T = S.tanda; T.n[P.t]++; if (P.res === "gol") T.g[P.t]++; T.hist[P.t].push(P.res === "gol");
    T.turno = 1 - P.t; return siguienteTanda();
  }
  if (P.res === "gol") { P.tk.goles++; S.marcador[P.t]++; S.golDe = { t: P.t, autor: P.tk }; if (!S.attract) { muestraGol(P.tk, false); habla(`¡Gol de ${P.tk.nombre}!`); } S.fase = "gol"; S.faseT = 150; return; }
  const g = portero(1 - P.t); g.estado = ""; colocaSaque(1 - P.t, P.t === 0 ? W - 50 : 50, H / 2, "puerta");
}
function iniciaTanda() {
  const orden = t => S.jug.filter(p => p.t === t && p.rol !== "GK").sort((a, b) => b.k - a.k);
  S.tanda = { g: [0, 0], n: [0, 0], hist: [[], []], turno: 0, orden: [orden(0), orden(1)] };
  for (const p of S.jug) p.fuera = 0;
  siguienteTanda();
}
function siguienteTanda() {
  const T = S.tanda, [g0, g1] = T.g, [n0, n1] = T.n;
  const fin = () => finPartido();
  if (n0 <= 3 && n1 <= 3 && (g0 + (3 - n0) < g1 || g1 + (3 - n1) < g0)) return fin();
  if (n0 >= 3 && n0 === n1 && g0 !== g1) return fin();
  if (n0 >= 10 && n1 >= 10) return fin();
  iniciaPenalti(T.turno, true);
}

/* ================= partes y final ================= */
function finParte() {
  sonido("silbato");
  if (S.parte === 1) {
    S.parte = 2; S.tiempo = S.cfg.mitad;
    parar("Descanso", () => { if (S.attract) return saqueCentro(1); S.pausa = true; muestra("p-descanso"); pintaDescanso(); }, 70);
  } else if (S.marcador[0] === S.marcador[1] && !S.attract) {
    parar("¡Empate! Tanda de penaltis", () => iniciaTanda(), 110);
  } else {
    parar("¡Final del partido!", () => finPartido(), 90);
  }
}
function finPartido() {
  if (S.attract) { arrancaAttract(); return; }
  S.fase = "final"; S.pausa = true;
  muestra("p-final"); pintaFinal();
}

/* ================= paso de simulación ================= */
function misters() {
  if (!S.mister) return;
  for (const m of S.mister) {
    const lo = m.t === 0 ? 110 : W / 2 + 70, hi = m.t === 0 ? W / 2 - 70 : W - 110;
    const dx = clamp(S.balon.x, lo, hi) - m.x;
    m.vx = Math.abs(dx) > 10 ? Math.sign(dx) * 1.2 : 0; m.x += m.vx; if (m.vx) m.anim += 0.22;
    if (m.salta > 0) m.salta--;
    if (m.fT > 0) m.fT--;
    else if (S.fase === "juego" && Math.random() < 0.004) grita(m.t, pick(FRASES_MISTER));
  }
}
function grita(t, txt, salta) { const m = S.mister && S.mister[t]; if (!m) return; m.frase = txt; m.fT = 120; if (salta) m.salta = 120; }
function paso() {
  misters();
  S.frame++;
  if (S.avisoT > 0) S.avisoT--;
  if (S.shake > 0) S.shake *= 0.88;
  switch (S.fase) {
    case "juego":
      if (!S.proteg) { S.tiempo -= DT; if (S.tiempo <= 0) { S.tiempo = 0; finParte(); break; } }
      cazadores();
      if (!S.attract && !S.auto) controlHumano();
      for (const p of S.jug) if (p !== S.humano || S.attract || S.auto) ia(p);
      for (const p of S.jug) mueve(p);
      separa(); fisicaBalon(); recogidas(); reglas();
      for (let t = 0; t < 2; t++) S.barra[t] = Math.min(100, S.barra[t] + 0.035);
      if (S.attract && S.barra[0] >= 100) S.armado[0] = true;
      break;
    case "parado":
      S.faseT--;
      for (const p of S.jug) { p.dx = p.dy = 0; mueve(p); }
      fisicaBalon();
      if (S.faseT <= 0) { const f = S.siguiente; S.siguiente = null; f && f(); }
      break;
    case "gol":
      S.faseT--;
      for (const p of S.jug) {
        p.dx = p.dy = 0;
        if (S.golDe && p.t === S.golDe.t && !S.golDe.propia && p.rol !== "GK") {
          const a = S.golDe.autor && S.golDe.autor.t === p.t ? S.golDe.autor : null;
          if (a && p !== a) { const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy); if (d > 24) { p.dx = dx / d; p.dy = dy / d; } }
          if (!p.estado) { p.estado = "celebra"; p.et = 999; }
        }
        mueve(p);
      }
      fisicaBalon();
      if (S.faseT <= 0) {
        ocultaGol();
        for (const p of S.jug) if (p.estado === "celebra") p.estado = "";
        saqueCentro(1 - S.golDe.t);
      }
      break;
    case "pena": penalti(); break;
  }
  for (const q of S.part) { q.x += q.vx; q.y += q.vy; q.vz -= 0.15; q.z = Math.max(0, q.z + q.vz); q.vx *= 0.98; q.vy *= 0.98; q.vida--; }
  if (S.part.length) S.part = S.part.filter(q => q.vida > 0);
}

/* ================= dibujo ================= */
function camara() {
  const c = S.cam, b = S.balon;
  const zBase = Math.min(VW / 700, VH / (430 * T));
  let tx = b.x + b.vx * 14, ty = b.y + b.vy * 10, tz = zBase;
  if (S.fase === "pena" && S.pena) { tx = S.pena.t === 0 ? W - 150 : 150; ty = H / 2; tz = zBase * 1.3; }
  if (S.fase === "gol") tz = zBase * 1.12;
  c.z += (tz - c.z) * 0.06;
  c.x += (tx - c.x) * 0.08; c.y += (ty - c.y) * 0.08;
  const mw = VW / 2 / c.z, mh = VH / 2 / (c.z * T);
  c.x = mw * 2 > W + 260 ? W / 2 : clamp(c.x, mw - 130, W + 130 - mw);
  c.y = mh * 2 > H + 300 ? H / 2 : clamp(c.y, mh - 200, H + 120 - mh);
}
let SX = 0, SY = 0;
function pant(x, y, z) { const c = S.cam; return [(x - c.x) * c.z + VW / 2 + SX, (y - c.y) * c.z * T + VH / 2 - (z || 0) * c.z + SY]; }
function suelo() { const c = S.cam; ctx.setTransform(DPR * c.z, 0, 0, DPR * c.z * T, DPR * (VW / 2 - c.x * c.z + SX), DPR * (VH / 2 - c.y * c.z * T + SY)); }
function pantalla() { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }

function dibujaCampo() {
  suelo();
  ctx.fillStyle = "#2f5a26"; ctx.fillRect(-200, -80, W + 400, H + 160);
  // grada
  if (GRADA) { for (let x = -400; x < W + 400; x += 600) { ctx.drawImage(GRADA, x, -330, 600, 250); ctx.drawImage(GRADA, x, H + 85, 600, 250); } }
  for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? "#3d7330" : "#447d35"; ctx.fillRect(i * 100, 0, 100, H); }
  ctx.fillStyle = "#3a6c2e"; ctx.fillRect(-80, -80, 80, H + 160); ctx.fillRect(W, -80, 80, H + 160); ctx.fillRect(0, -80, W, 80); ctx.fillRect(0, H, W, 80);
  ctx.strokeStyle = "rgba(255,255,255,.88)"; ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, W, H);
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 90, 0, 7); ctx.stroke();
  for (const [x, s] of [[0, 1], [W, -1]]) {
    ctx.strokeRect(Math.min(x, x + s * BOX_X), H / 2 - BOX_W / 2, BOX_X, BOX_W);
    ctx.strokeRect(Math.min(x, x + s * 60), H / 2 - 110, 60, 220);
    ctx.beginPath(); ctx.arc(x + s * SPOT, H / 2, 3.5, 0, 7); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * SPOT, H / 2, 70, s > 0 ? -0.93 : Math.PI - 0.93, s > 0 ? 0.93 : Math.PI + 0.93);
    ctx.save(); ctx.clip(); ctx.restore();
    ctx.beginPath();
    const a0 = Math.acos((BOX_X - SPOT) / 70);
    if (s > 0) ctx.arc(x + SPOT, H / 2, 70, -a0, a0); else ctx.arc(x - SPOT, H / 2, 70, Math.PI - a0, Math.PI + a0);
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 3.5, 0, 7); ctx.fillStyle = "#fff"; ctx.fill();
  for (const [x, y, a] of [[0, 0, 0], [W, 0, Math.PI / 2], [W, H, Math.PI], [0, H, -Math.PI / 2]]) { ctx.beginPath(); ctx.arc(x, y, 12, a, a + Math.PI / 2); ctx.stroke(); }
  // escudo pintado en el centro
  if (ESCUDO) { ctx.globalAlpha = 0.16; ctx.drawImage(ESCUDO, W / 2 - 55, H / 2 - 55, 110, 110); ctx.globalAlpha = 1; }
  // sombras
  ctx.fillStyle = "rgba(0,0,0,.25)";
  for (const p of S.jug) { if (p.fuera) continue; ctx.beginPath(); ctx.ellipse(p.x, p.y, 13, 9, 0, 0, 7); ctx.fill(); }
  const b = S.balon, k = Math.max(0.3, 1 - b.z / 120);
  ctx.beginPath(); ctx.ellipse(b.x, b.y, 6 * k, 4.5 * k, 0, 0, 7); ctx.fill();
  // zona de saque protegida
  if (S.proteg && S.proteg.tipo !== "centro") { ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(S.proteg.x, S.proteg.y, S.proteg.r, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  // jugador controlado: aro
  const h = S.humano;
  if (h && !S.attract && !h.fuera) { ctx.strokeStyle = "#E6CD85"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(h.x, h.y, 17, 13, 0, 0, 7); ctx.stroke(); }
}
function dibujaVallas(fila) {
  if (!VALLAS.length) return;
  const c = S.cam, y = fila === 0 ? -62 : H + 58, hW = 30, ancho = 150;
  const paso = Math.floor(S.frame / 420), frac = clamp((S.frame % 420) / 30, 0, 1);
  for (let i = -1, x = -90; x < W + 90; x += ancho, i++) {
    const [sx, sy] = pant(x, y, 0), w = ancho * c.z, h = hW * c.z;
    if (sx > VW || sx + w < 0) continue;
    const idx = (i + paso + (fila ? 2 : 0)) % VALLAS.length;
    const img = VALLAS[(idx + VALLAS.length) % VALLAS.length];
    ctx.fillStyle = "#111"; ctx.fillRect(sx - 1, sy - h - 1, w + 2, h + 2);
    if (frac < 1) {   // cambio tipo LED
      const prev = VALLAS[(idx - 1 + VALLAS.length * 2) % VALLAS.length];
      ctx.drawImage(prev, 0, 0, 400, 80, sx, sy - h, w, h * (1 - frac));
      ctx.drawImage(img, 0, 0, 400, 80, sx, sy - h + h * (1 - frac), w, h * frac);
    } else ctx.drawImage(img, sx, sy - h, w, h);
    ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fillRect(sx, sy - h, w, h * 0.35);
  }
}
function porteria(lado, parte) {
  const x0 = lado === 0 ? 0 : W, xb = lado === 0 ? -28 : W + 28;
  ctx.lineWidth = Math.max(2, 3.5 * S.cam.z);
  if (parte === "fondo") {
    const p = [pant(x0, GY0, GH), pant(xb, GY0, GH * 0.8), pant(xb, GY1, GH * 0.8), pant(x0, GY1, GH), pant(xb, GY0, 0), pant(xb, GY1, 0), pant(x0, GY0, 0)];
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.strokeStyle = "rgba(255,255,255,.45)";
    ctx.beginPath(); ctx.moveTo(...p[4]); ctx.lineTo(...p[1]); ctx.lineTo(...p[2]); ctx.lineTo(...p[5]); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...p[0]); ctx.lineTo(...p[1]); ctx.lineTo(...p[2]); ctx.lineTo(...p[3]); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...p[6]); ctx.lineTo(...p[4]); ctx.lineTo(...p[1]); ctx.lineTo(...p[0]); ctx.closePath(); ctx.fill(); ctx.stroke();
    // red: líneas
    ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) { const yy = GY0 + GW * i / 8; ctx.beginPath(); ctx.moveTo(...pant(xb, yy, 0)); ctx.lineTo(...pant(xb, yy, GH * 0.8)); ctx.lineTo(...pant(x0, yy, GH)); ctx.stroke(); }
    ctx.lineWidth = Math.max(2, 3.5 * S.cam.z); ctx.strokeStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(...pant(x0, GY0, 0)); ctx.lineTo(...pant(x0, GY0, GH)); ctx.stroke();
  } else {
    ctx.strokeStyle = "#fff"; ctx.strokeStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(...pant(x0, GY1, 0)); ctx.lineTo(...pant(x0, GY1, GH)); ctx.lineTo(...pant(x0, GY0, GH)); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(...pant(x0, GY1, GH)); ctx.lineTo(...pant(xb, GY1, GH * 0.8)); ctx.lineTo(...pant(xb, GY1, 0)); ctx.moveTo(...pant(x0, GY1, 0)); ctx.lineTo(...pant(xb, GY1, 0)); ctx.stroke();
  }
}
function dibujaJugador(p) {
  if (p.fuera) return;
  const [sx, sy] = pant(p.x, p.y, 0), z = S.cam.z, kit = p.kit;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(z, z);
  const izq = Math.cos(p.dir) < -0.1;
  let salto = 0;
  if (p.estado === "celebra") salto = Math.abs(Math.sin(S.frame * 0.18 + p.k)) * 14;
  ctx.translate(0, -salto);
  if (p.estado === "chilena") { const a = (1 - p.et / 36) * Math.PI * 2 * (p.t === 0 ? -1 : 1); ctx.translate(0, -24); ctx.rotate(a); ctx.translate(0, 24 - Math.sin((1 - p.et / 36) * Math.PI) * 22); }
  else if (p.estado === "suelo") { ctx.rotate((izq ? -1 : 1) * Math.PI / 2 * 0.95); ctx.translate(8, 6); }
  else if (p.estado === "entrada") { ctx.translate((izq ? -1 : 1) * 12, -2); ctx.rotate((izq ? 1 : -1) * 1.3); ctx.translate(0, 4); }
  else if (p.estado === "estira") { const s = S.pena ? S.pena.buzo : 0; ctx.rotate(s * 1.2 * (p.t === 0 ? -1 : 1)); }
  if (izq) ctx.scale(-1, 1);
  const f = Math.sin(p.anim), corre = Math.min(1, Math.hypot(p.vx, p.vy) / 1.5);
  // piernas
  ctx.lineCap = "round"; ctx.lineWidth = 4.2;
  for (const s of [-1, 1]) {
    const pie = p.estado === "entrada" ? 4 + s * 2 : s * f * 5 * corre;
    ctx.strokeStyle = kit.medias; ctx.beginPath(); ctx.moveTo(s * 3, -11); ctx.lineTo(s * 3 + pie, -1); ctx.stroke();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.ellipse(s * 3 + pie + 1.5, 0, 3.4, 2, 0, 0, 7); ctx.fill();
  }
  // pantalón y camiseta
  ctx.fillStyle = kit.pantalon; ctx.fillRect(-7, -16, 14, 7);
  ctx.fillStyle = p.rol === "GK" ? (p.t === 0 ? "#1F2B4F" : "#C9A23A") : kit.camiseta;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-8.5, -30, 17, 16, 4) : ctx.rect(-8.5, -30, 17, 16); ctx.fill();
  ctx.strokeStyle = kit.borde; ctx.lineWidth = 1; ctx.stroke();
  // brazos
  ctx.strokeStyle = p.rol === "GK" ? (p.t === 0 ? "#1F2B4F" : "#C9A23A") : kit.camiseta; ctx.lineWidth = 4;
  const br = p.estado === "celebra" ? -1 : f * corre;
  ctx.beginPath(); ctx.moveTo(-8, -27); ctx.lineTo(-11 - br * 2, -18 + (p.estado === "celebra" ? -16 : 0)); ctx.moveTo(8, -27); ctx.lineTo(11 + br * 2, -18 + (p.estado === "celebra" ? -16 : 0)); ctx.stroke();
  // dorsal
  ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.font = "800 8px 'Big Shoulders Display',Impact"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (!izq) ctx.fillText(String(p.d.dorsal ?? ""), 0, -22); else { ctx.save(); ctx.scale(-1, 1); ctx.fillText(String(p.d.dorsal ?? ""), 0, -22); ctx.restore(); }
  // cabezón
  const bote = p.estado ? 0 : Math.abs(Math.sin(p.anim * 0.5)) * 1.5 * corre;
  if (p.cab) ctx.drawImage(p.cab, -21, -71 - bote, 42, 42);
  // estrellitas al caer
  if (p.estado === "suelo") { ctx.fillStyle = "#E6CD85"; ctx.font = "10px sans-serif"; for (let i = 0; i < 3; i++) { const a = S.frame * 0.15 + i * 2.1; ctx.fillText("★", Math.cos(a) * 14, -78 + Math.sin(a) * 4); } }
  ctx.restore();
  // marcadores encima
  if (p === S.humano && !S.attract) {
    const [hx, hy] = pant(p.x, p.y, 0), top = hy - (80 + salto) * z;
    ctx.fillStyle = "#E6CD85"; ctx.beginPath(); ctx.moveTo(hx - 7, top - 10); ctx.lineTo(hx + 7, top - 10); ctx.lineTo(hx, top); ctx.fill();
    ctx.font = "700 12px 'Inter Tight',Arial"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(11,18,38,.8)"; ctx.strokeText(p.nombre, hx, top - 12); ctx.fillStyle = "#fff"; ctx.fillText(p.nombre, hx, top - 12);
    if (p.carga >= 0) {
      const k = Math.min(1, p.carga / 42), w = 44;
      ctx.fillStyle = "rgba(11,18,38,.75)"; ctx.fillRect(hx - w / 2, top - 38, w, 7);
      ctx.fillStyle = k > 0.93 ? "#B5122B" : "#E6CD85"; ctx.fillRect(hx - w / 2 + 1, top - 37, (w - 2) * k, 5);
    }
    if (S.armado[0]) { ctx.font = "16px sans-serif"; ctx.fillText(ESPECIALES[p.esp]?.ico || "⚡", hx + 26, top - 2); }
  }
}
function dibujaMister(m) {
  const [sx, sy] = pant(m.x, m.y, 0), z = S.cam.z, kit = m.kit;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(z, z);
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(0, 0, 13, 5, 0, 0, 7); ctx.fill();
  const salto = m.salta > 0 ? Math.abs(Math.sin(m.salta * 0.25)) * 12 : 0;
  ctx.translate(0, -salto);
  if (m.vx < 0) ctx.scale(-1, 1);
  const f = Math.sin(m.anim);
  ctx.lineCap = "round"; ctx.lineWidth = 4.6; ctx.strokeStyle = kit.borde;          // chándal largo
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 3, -14); ctx.lineTo(s * 3 + s * f * 4, -1); ctx.stroke(); ctx.fillStyle = "#f4f4f4"; ctx.beginPath(); ctx.ellipse(s * 3 + s * f * 4 + 1.5, 0, 3.6, 2.1, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = kit.camiseta; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-9.5, -32, 19, 20, 5) : ctx.rect(-9.5, -32, 19, 20); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(0, -12); ctx.stroke();   // cremallera
  const grita = m.fT > 0, w = grita ? Math.sin(S.frame * 0.5) : 0;
  ctx.strokeStyle = kit.camiseta; ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(-9, -29); ctx.lineTo(grita ? -15 + w * 4 : -12, grita ? -46 : -18);
  ctx.moveTo(9, -29); ctx.lineTo(grita ? 15 - w * 4 : 12, grita ? -46 : -18);
  ctx.stroke();
  if (m.cab) ctx.drawImage(m.cab, -23, -78, 46, 46);
  ctx.restore();
  // nombre y bocadillo
  const top = sy - (82 + salto) * z;
  ctx.font = "700 11px 'Inter Tight',Arial"; ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(11,18,38,.85)"; ctx.strokeText(m.d.corto || m.d.nombre, sx, sy + 4 * z); ctx.fillStyle = "#E6CD85"; ctx.fillText(m.d.corto || m.d.nombre, sx, sy + 4 * z);
  if (m.fT > 0) {
    ctx.font = "800 14px 'Inter Tight',Arial";
    const tw = ctx.measureText(m.frase).width + 18, bx = sx - tw / 2, by = top - 30;
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0B1226"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, tw, 24, 12) : ctx.rect(bx, by, tw, 24); ctx.moveTo(sx - 6, by + 24); ctx.lineTo(sx, by + 32); ctx.lineTo(sx + 6, by + 24); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#0B1226"; ctx.textBaseline = "middle"; ctx.fillText(m.frase, sx, by + 12.5);
  }
}
function dibujaBalon() {
  const b = S.balon, z = S.cam.z;
  // estela
  if (b.rastro.length) {
    for (let i = 0; i < b.rastro.length; i++) {
      const r = b.rastro[i], [x, y] = pant(r.x, r.y, r.z + 5), k = i / b.rastro.length;
      if (b.esp === "fuego") { ctx.fillStyle = `rgba(255,${120 + k * 120 | 0},0,${k * 0.8})`; ctx.beginPath(); ctx.arc(x, y, (4 + k * 7) * z, 0, 7); ctx.fill(); }
      else if (b.esp === "aceituna") { ctx.fillStyle = `rgba(120,150,40,${k * 0.5})`; ctx.beginPath(); ctx.arc(x, y, (3 + k * 6) * z, 0, 7); ctx.fill(); }
      else if (b.esp === "banana") { ctx.fillStyle = `rgba(255,220,60,${k * 0.6})`; ctx.beginPath(); ctx.arc(x, y, (2 + k * 4) * z, 0, 7); ctx.fill(); }
      else if (b.esp === "fantasma") { ctx.fillStyle = `rgba(200,220,255,${k * 0.25})`; ctx.beginPath(); ctx.arc(x, y, (3 + k * 5) * z, 0, 7); ctx.fill(); }
    }
    if (b.esp === "rayo") {
      ctx.strokeStyle = "#fff36b"; ctx.lineWidth = 3 * z; ctx.shadowColor = "#fff36b"; ctx.shadowBlur = 12; ctx.beginPath();
      b.rastro.forEach((r, i) => { const [x, y] = pant(r.x, r.y + (i % 2 ? 6 : -6), r.z + 5); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.shadowBlur = 0;
    }
  }
  const [x, y] = pant(b.x, b.y, b.z + 5);
  ctx.save(); ctx.translate(x, y);
  if (b.esp === "fantasma") ctx.globalAlpha = b.espT % 30 < 22 ? 0.18 : 0.7;
  if (b.esp === "aceituna") {
    ctx.rotate(Math.atan2(b.vy * T, b.vx));
    const g = ctx.createRadialGradient(-4 * z, -4 * z, 1, 0, 0, 14 * z); g.addColorStop(0, "#b6c95a"); g.addColorStop(1, "#4b5e1c");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 15 * z, 10 * z, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#6b8a2a"; ctx.beginPath(); ctx.ellipse(-15 * z, -3 * z, 6 * z, 2.5 * z, -0.5, 0, 7); ctx.fill();
  } else {
    const r = 5.8 * z;
    if (b.esp === "fuego") { ctx.shadowColor = "#ff8a00"; ctx.shadowBlur = 18; }
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "#14170F"; ctx.rotate(b.giro * 0.1);
    for (let i = 0; i < 3; i++) { const a = i * 2.1; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.28, 0, 7); ctx.fill(); }
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  }
  ctx.restore();
}
function dibujaPenalti() {
  const P = S.pena; if (!P || P.fase !== "apunta") return;
  if (P.t === 0 && !S.attract) {
    const [x, y] = pant(W, H / 2 + P.apunta, GH / 2), dentro = Math.abs(P.apunta) < GW / 2 - 6;
    ctx.strokeStyle = dentro ? "#E6CD85" : "#ff5c5c"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y); ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 18); ctx.stroke();
  } else if (P.t === 1 && !S.attract) {
    const g = P.g, [x, y] = pant(g.x, g.y, 0);
    ctx.fillStyle = "#E6CD85"; ctx.font = "800 26px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(P.buzo < 0 ? "▲" : P.buzo > 0 ? "▼" : "●", x + 34, y - 30 * S.cam.z);
  }
}
function dibuja() {
  pantalla();
  ctx.fillStyle = "#0B1226"; ctx.fillRect(0, 0, VW, VH);
  if (!S) return;
  camara();
  SX = S.shake > 0.5 ? rnd(-S.shake, S.shake) * 0.5 : 0; SY = S.shake > 0.5 ? rnd(-S.shake, S.shake) * 0.5 : 0;
  dibujaCampo();
  pantalla();
  dibujaVallas(0);
  const items = [];
  for (const p of S.jug) if (!p.fuera) items.push({ y: p.y, f: () => dibujaJugador(p) });
  items.push({ y: S.balon.y + 1, f: dibujaBalon });
  items.push({ y: GY0, f: () => porteria(0, "fondo") }, { y: GY0, f: () => porteria(1, "fondo") });
  items.push({ y: GY1, f: () => porteria(0, "frente") }, { y: GY1, f: () => porteria(1, "frente") });
  items.sort((a, b) => a.y - b.y).forEach(i => i.f());
  for (const q of S.part) { const [x, y] = pant(q.x, q.y, q.z); ctx.fillStyle = q.c; ctx.fillRect(x - 2, y - 2, 4, 5); }
  dibujaVallas(1);
  if (S.mister && !S.pena) S.mister.forEach(dibujaMister);
  dibujaPenalti();
  hud();
}

/* ================= HUD (DOM) ================= */
const el = {};
["hud", "m0", "m1", "goles", "reloj", "aviso", "b-pase", "b-tiro", "b-esp", "b-centro", "barra-fill", "joy-base", "joy-pomo", "tanda"].forEach(id => el[id] = document.getElementById(id));
let ultimoHud = "";
function hud() {
  if (S.attract) return;
  const m = Math.floor(S.tiempo / 60), s = Math.floor(S.tiempo % 60);
  const txt = `${S.marcador[0]}|${S.marcador[1]}|${S.parte}|${m}:${s}`;
  if (txt !== ultimoHud) {
    ultimoHud = txt;
    el.goles.textContent = `${S.marcador[0]} - ${S.marcador[1]}`;
    el.reloj.textContent = S.tanda ? "Penaltis" : `${S.parte}ª · ${m}:${String(s).padStart(2, "0")}`;
  }
  el.tanda.textContent = S.tanda ? `Penaltis ${S.tanda.g[0]} - ${S.tanda.g[1]}` : "";
  if (S.avisoT > 0 && S.aviso) { if (el.aviso.textContent !== S.aviso) { el.aviso.textContent = S.aviso; el.aviso.classList.toggle("largo", S.aviso.length > 22); } el.aviso.classList.add("on"); }
  else el.aviso.classList.remove("on");
  const h = S.humano, b = S.balon;
  let a = "PASE", t = "TIRO", c = "CENTRO";
  if (S.fase === "pena") { a = "·"; c = "·"; t = S.pena && S.pena.t === 0 ? "TIRO" : "·"; }
  else if (h && b.dueno !== h) { a = "CAMBIO"; c = "·"; t = (!b.dueno && ((b.centro && b.centro.t === 0) || (b.z > 5 && b.z < 85 && dist(h, b) < 90))) ? "CHILENA" : "ENTRADA"; }
  if (el["b-centro"].dataset.t !== c) { el["b-centro"].dataset.t = c; el["b-centro"].textContent = c; el["b-centro"].classList.toggle("apagado", c === "·"); }
  if (el["b-pase"].dataset.t !== a) { el["b-pase"].dataset.t = a; el["b-pase"].textContent = a; }
  if (el["b-tiro"].dataset.t !== t) { el["b-tiro"].dataset.t = t; el["b-tiro"].textContent = t; el["b-tiro"].classList.toggle("chilena", t === "CHILENA"); }
  el["barra-fill"].style.width = S.barra[0] + "%";
  el["b-esp"].classList.toggle("listo", S.barra[0] >= 100 && !S.armado[0]);
  el["b-esp"].classList.toggle("armado", S.armado[0]);
}

/* ================= bucle ================= */
let ultimoT = 0, acum = 0;
function bucle(ts) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.1, ((ts - ultimoT) / 1000) || 0); ultimoT = ts;
  if (S && !S.pausa) {
    acum += dt; let n = 0;
    while (acum >= DT && n < 5) { paso(); acum -= DT; n++; }
    if (n === 5) acum = 0;
  }
  dibuja();
}

/* ================= controles ================= */
const zonaJoy = $("#joy");
function joyPos(e) {
  const dx = e.clientX - joy.ox, dy = e.clientY - joy.oy, d = Math.hypot(dx, dy), R = 52;
  const k = d > R ? R / d : 1;
  joy.x = dx * k / R; joy.y = dy * k / R;
  el["joy-pomo"].style.transform = `translate(${joy.ox + dx * k}px,${joy.oy + dy * k}px)`;
}
zonaJoy.addEventListener("pointerdown", e => {
  ac(); e.preventDefault(); joy.activo = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY;
  el["joy-base"].style.transform = `translate(${joy.ox}px,${joy.oy}px)`; el["joy-pomo"].style.transform = `translate(${joy.ox}px,${joy.oy}px)`;
  zonaJoy.classList.add("activo"); try { zonaJoy.setPointerCapture(e.pointerId); } catch {}
});
zonaJoy.addEventListener("pointermove", e => { if (joy.activo && e.pointerId === joy.id) joyPos(e); });
const sueltaJoy = e => { if (e.pointerId !== joy.id) return; joy.activo = false; joy.x = joy.y = 0; zonaJoy.classList.remove("activo"); };
zonaJoy.addEventListener("pointerup", sueltaJoy); zonaJoy.addEventListener("pointercancel", sueltaJoy);
function boton(id, down, up) {
  const b = document.getElementById(id);
  b.addEventListener("pointerdown", e => { ac(); e.preventDefault(); b.classList.add("pulsado"); down(); try { b.setPointerCapture(e.pointerId); } catch {} });
  const fin = e => { b.classList.remove("pulsado"); up && up(); };
  b.addEventListener("pointerup", fin); b.addEventListener("pointercancel", fin);
  b.addEventListener("contextmenu", e => e.preventDefault());
}
boton("b-pase", () => cola.push("pase"));
boton("b-tiro", () => { tiroPulsado = true; cola.push("tiro"); }, () => { if (tiroPulsado) cola.push("tiroUp"); tiroPulsado = false; });
boton("b-esp", () => cola.push("esp"));
boton("b-centro", () => cola.push("centro"));
const teclas = {};
addEventListener("keydown", e => {
  if (e.repeat) return;
  const k = e.key.toLowerCase(); teclas[k] = true;
  if (k.startsWith("arrow")) e.preventDefault();
  if (k === "a") cola.push("pase");
  if (k === "s" || k === " ") { tiroPulsado = true; cola.push("tiro"); e.preventDefault(); }
  if (k === "d") cola.push("centro");
  if (k === "f") cola.push("esp");
  if (k === "escape" || k === "p") pausa();
  ac();
});
addEventListener("keyup", e => {
  const k = e.key.toLowerCase(); teclas[k] = false;
  if ((k === "s" || k === " ") && tiroPulsado) { cola.push("tiroUp"); tiroPulsado = false; }
});
setInterval(() => {
  if (joy.activo) return;
  let x = (teclas.arrowright ? 1 : 0) - (teclas.arrowleft ? 1 : 0);
  let y = (teclas.arrowdown ? 1 : 0) - (teclas.arrowup ? 1 : 0);
  const m = Math.hypot(x, y) || 1; joy.x = x / m; joy.y = y / m;
}, 16);

/* ================= pantallas ================= */
const pantallas = ["p-menu", "p-equipo", "p-alin", "p-ayuda", "p-descanso", "p-final", "p-pausa"];
function muestra(id) {
  for (const p of pantallas) document.getElementById(p).hidden = p !== id;
  el.hud.hidden = !!id || !S || S.attract;
}
function enJuego() { for (const p of pantallas) document.getElementById(p).hidden = true; el.hud.hidden = false; }
let ESCUDO = null;
const eleccion = { mio: null, rival: null, alin: null, dif: leeLS("cabezones-dif") || "normal", mitad: leeLS("cabezones-mitad") || 120 };

async function cabezaURL(d, kit) { const c = cabeza(await cara(d), kit, d.propio); return c.toDataURL(); }
async function pintaEquipos(paso) {
  const cont = $("#lista-equipos");
  $("#t-equipo").textContent = paso === "mio" ? "Elige tu equipo" : "Elige el rival";
  $("#s-equipo").textContent = paso === "mio" ? "Todas las categorías del Villargordo… y el equipo de Oleo Telecom" : "¿Contra quién juegas?";
  cont.innerHTML = "";
  for (const eq of EQUIPOS) {
    const b = document.createElement("button"); b.type = "button"; b.className = "eq-card";
    const propios = eq.jugadores.filter(j => j.propio).length;
    const muestraJ = eq.jugadores.filter(j => j.rol !== "GK").slice(0, 3);
    const kit = paso === "mio" ? kitsPartido(eq, null)[0] : kitsPartido(eleccion.mio, eq)[1];
    const caras = await Promise.all(muestraJ.map(j => cabezaURL(j, kit)));
    b.innerHTML = `<span class="caras">${caras.map(u => `<img src="${u}" alt="">`).join("")}</span><b>${esc(eq.nombre)}</b><small>${eq.jugadores.length} jugadores${propios ? ` · ★ ${propios} cromos tuyos` : ""}</small>`;
    b.onclick = () => {
      if (paso === "mio") { eleccion.mio = eq; pintaEquipos("rival"); }
      else { eleccion.rival = eq; preparaAlineacion(); }
    };
    cont.appendChild(b);
  }
  const azar = document.createElement("button"); azar.type = "button"; azar.className = "eq-card azar";
  azar.innerHTML = `<span class="caras"><i>🎲</i></span><b>Al azar</b><small>Que decida la suerte</small>`;
  azar.onclick = () => { const e = EQUIPOS[Math.floor(Math.random() * EQUIPOS.length)]; if (paso === "mio") { eleccion.mio = e; pintaEquipos("rival"); } else { eleccion.rival = e; preparaAlineacion(); } };
  cont.appendChild(azar);
  muestra("p-equipo");
}
function onceInicial(eq) {
  const L = eq.jugadores.slice();
  const coge = f => { const i = L.findIndex(f); return i >= 0 ? L.splice(i, 1)[0] : null; };
  const gk = coge(j => j.rol === "GK") || coge(() => true);
  const pref = j => (j.propio ? -1 : 0);
  L.sort((a, b) => pref(a) - pref(b));
  const d1 = coge(j => j.rol === "DEF") || coge(() => true), d2 = coge(j => j.rol === "DEF") || coge(j => j.rol !== "FWD") || coge(() => true);
  const m = coge(j => j.rol === "MID") || coge(() => true), f = coge(j => j.rol === "FWD") || coge(() => true);
  return [gk, d1, d2, m, f];
}
async function preparaAlineacion() {
  eleccion.alin = onceInicial(eleccion.mio);
  await pintaAlineacion();
  muestra("p-alin");
}
async function pintaAlineacion() {
  $("#t-alin").textContent = `${eleccion.mio.nombre} contra ${eleccion.rival.nombre}`;
  const roles = ["Portería", "Defensa", "Defensa", "Medio", "Ataque"];
  const cont = $("#alin"); cont.innerHTML = "";
  for (let k = 0; k < 5; k++) {
    const j = eleccion.alin[k], u = await cabezaURL(j, kitsPartido(eleccion.mio, eleccion.rival)[0]);
    const b = document.createElement("button"); b.type = "button"; b.className = "jug" + (j.propio ? " propio" : "");
    b.innerHTML = `<img src="${u}" alt=""><b>${esc(j.corto)}</b><small>${roles[k]}</small>${j.esp && k ? `<span class="esp">${ESPECIALES[j.esp].ico} ${ESPECIALES[j.esp].nombre}</span>` : `<span class="esp">🧤 Portero</span>`}${j.propio ? `<i class="estrella">★ Tienes su cromo</i>` : ""}<em>Cambiar</em>`;
    b.onclick = () => {
      const libres = eleccion.mio.jugadores.filter(x => !eleccion.alin.includes(x));
      if (!libres.length) return;
      const pref = k === 0 ? libres.filter(x => x.rol === "GK") : libres.filter(x => x.rol !== "GK");
      const lista = pref.length ? pref : libres;
      const idx = (lista.indexOf(eleccion.alin[k]) + 1) % lista.length;
      const actual = eleccion.mio.jugadores.indexOf(j);
      const sig = lista.find(x => eleccion.mio.jugadores.indexOf(x) > actual) || lista[0];
      eleccion.alin[k] = sig || lista[idx]; pintaAlineacion();
    };
    cont.appendChild(b);
  }
  document.querySelectorAll("[data-dif]").forEach(b => b.classList.toggle("on", b.dataset.dif === eleccion.dif));
  document.querySelectorAll("[data-mitad]").forEach(b => b.classList.toggle("on", +b.dataset.mitad === eleccion.mitad));
}
document.querySelectorAll("[data-dif]").forEach(b => b.onclick = () => { eleccion.dif = b.dataset.dif; guardaLS("cabezones-dif", eleccion.dif); pintaAlineacion(); });
document.querySelectorAll("[data-mitad]").forEach(b => b.onclick = () => { eleccion.mitad = +b.dataset.mitad; guardaLS("cabezones-mitad", eleccion.mitad); pintaAlineacion(); });

function completa() {   // pantalla completa y en horizontal (donde el móvil lo permita)
  const d = document.documentElement;
  try { if (!document.fullscreenElement && (d.requestFullscreen || d.webkitRequestFullscreen)) { const p = (d.requestFullscreen || d.webkitRequestFullscreen).call(d, { navigationUI: "hide" }); if (p && p.then) p.then(() => { try { screen.orientation.lock("landscape").catch(() => {}); } catch {} }).catch(() => {}); } } catch {}
}
async function empieza() {
  completa(); ac();
  $("#cargando").hidden = false;
  const rival = onceInicial(eleccion.rival).map(j => ({ ...j, propio: false }));
  await nuevoPartido({ kits: kitsPartido(eleccion.mio, eleccion.rival), misters: [eleccion.mio.entrenador, eleccion.rival.entrenador], alin: [eleccion.alin, rival], dif: DIF[eleccion.dif], mitad: eleccion.mitad, nombres: [eleccion.mio.nombre, eleccion.rival.nombre] });
  el.m0.textContent = eleccion.mio.nombre; el.m1.textContent = eleccion.rival.nombre;
  el.m0.style.setProperty("--c", S.cfg.kits[0].camiseta); el.m1.style.setProperty("--c", S.cfg.kits[1].camiseta);
  $("#cargando").hidden = true;
  if (!leeLS("cabezones-ayuda-vista")) { S.pausa = true; muestra("p-ayuda"); }
  else { enJuego(); sonido("silbato"); }
}
$("#b-jugar").onclick = () => { completa(); ac(); pintaEquipos("mio"); };
$("#b-volver-eq").onclick = () => muestra("p-menu");
$("#b-volver-alin").onclick = () => pintaEquipos("mio");
$("#b-empezar").onclick = empieza;
$("#b-ayuda-ok").onclick = () => { guardaLS("cabezones-ayuda-vista", true); S.pausa = false; enJuego(); sonido("silbato"); };
$("#b-como").onclick = () => { muestra("p-ayuda"); $("#b-ayuda-ok").textContent = "Entendido"; $("#b-ayuda-ok").onclick = () => muestra("p-menu"); };
$("#b-segunda").onclick = () => { S.pausa = false; enJuego(); saqueCentro(1); sonido("silbato"); };
$("#b-revancha").onclick = empieza;
$("#b-otros").onclick = () => { arrancaAttract(); pintaEquipos("mio"); };
function pausa() { if (!S || S.attract || S.fase === "final" || !document.getElementById("p-descanso").hidden) return; S.pausa = true; muestra("p-pausa"); }
$("#b-pausa").onclick = pausa;
$("#b-seguir").onclick = () => { S.pausa = false; enJuego(); };
$("#b-salir").onclick = () => { arrancaAttract(); muestra("p-menu"); };
function pintaSonido() { document.querySelectorAll(".b-sonido").forEach(b => b.textContent = sonidoOn ? "🔊 Sonido" : "🔇 Sin sonido"); }
document.querySelectorAll(".b-sonido").forEach(b => b.onclick = () => { sonidoOn = !sonidoOn; guardaLS("cabezones-sonido", sonidoOn); pintaSonido(); });
pintaSonido();
document.addEventListener("visibilitychange", () => { if (document.hidden) pausa(); });

function muestraGol(autor, propia) {
  const c = $("#gol-cara"), g = c.getContext("2d"); g.clearRect(0, 0, 200, 200);
  if (autor && autor.cab) g.drawImage(autor.cab, 0, 0, 200, 200);
  $("#gol-quien").textContent = propia ? "En propia puerta" : autor ? `${autor.nombre} · ${S.cfg.nombres[autor.t]}` : "";
  $("#p-gol").hidden = false; $("#p-gol").classList.remove("anim"); void $("#p-gol").offsetWidth; $("#p-gol").classList.add("anim");
}
function ocultaGol() { $("#p-gol").hidden = true; }
function pintaDescanso() {
  $("#d-marcador").textContent = `${S.cfg.nombres[0]} ${S.marcador[0]} - ${S.marcador[1]} ${S.cfg.nombres[1]}`;
}
function pintaFinal() {
  const [a, b] = S.marcador, T = S.tanda;
  let gana = a > b ? 0 : b > a ? 1 : T ? (T.g[0] > T.g[1] ? 0 : 1) : -1;
  $("#f-titulo").textContent = gana === 0 ? "¡Has ganado!" : gana === 1 ? "Esta vez no ha podido ser" : "Empate";
  $("#f-marcador").textContent = `${S.cfg.nombres[0]} ${a} - ${b} ${S.cfg.nombres[1]}` + (T ? `  (penaltis ${T.g[0]} - ${T.g[1]})` : "");
  const mvp = S.jug.filter(p => p.t === 0).sort((x, y) => y.goles - x.goles)[0];
  const c = $("#f-cara"), g = c.getContext("2d"); g.clearRect(0, 0, 160, 160); if (mvp && mvp.cab) g.drawImage(mvp.cab, 0, 0, 160, 160);
  $("#f-mvp").textContent = mvp && mvp.goles ? `Mejor jugador: ${mvp.nombre} · ${mvp.goles} ${mvp.goles === 1 ? "gol" : "goles"}` : `Mejor jugador: ${mvp ? mvp.nombre : ""}`;
  if (gana === 0 && sonidoOn) habla("¡Victoria! ¡Aúpa Villargordo!");
}

/* ================= modo exhibición (detrás del menú) ================= */
async function arrancaAttract() {
  if (!EQUIPOS.length) return;
  const a = EQUIPOS[Math.floor(Math.random() * EQUIPOS.length)], b = EQUIPOS[Math.floor(Math.random() * EQUIPOS.length)];
  await nuevoPartido({ attract: true, kits: kitsPartido(a, b), misters: [a.entrenador, b.entrenador], alin: [onceInicial(a), onceInicial(b)], dif: DIF.normal, mitad: 600, nombres: [a.nombre, b.nombre] });
  if (!document.getElementById("p-gol").hidden) ocultaGol();
}

/* ================= arranque ================= */
(async function inicio() {
  preparaGrada();
  ESCUDO = await cargaImg("img/escudo.png");
  await preparaVallas();
  let datos = null;
  for (const u of ["/api/cromos", "cromos.json"]) {
    try { const r = await fetch(u, { cache: "no-store" }); if (r.ok) { datos = await r.json(); break; } } catch {}
  }
  let eqs = (datos && datos.equipos) || [];
  if (!eqs.length) eqs = ["senior", "juvenil", "cadete", "alevin", "benjamin", "prebenjamin"].map(id => ({ id, nombre: CORTO_EQ[id], menores: id !== "senior", jugadores: [] }));
  if (window.Demo) eqs = Demo.rellena(eqs);
  let oleo = EQUIPO_OLEO;
  try { const r = await fetch("equipo-oleo.json", { cache: "no-store" }); if (r.ok) oleo = { ...EQUIPO_OLEO, ...(await r.json()) }; } catch {}
  EQUIPOS = eqs.map(preparaEquipo).concat(preparaEquipo(oleo));
  await arrancaAttract();
  $("#cargando").hidden = true;
  muestra("p-menu");
  requestAnimationFrame(bucle);
  if (new URLSearchParams(location.search).has("captura")) {   // para sacar imágenes del juego
    guardaLS("cabezones-ayuda-vista", true);
    eleccion.mio = EQUIPOS.find(e => e.id === "alevin"); eleccion.rival = EQUIPOS.find(e => e.id === "cadete");
    eleccion.alin = onceInicial(eleccion.mio); await empieza(); S.auto = true; S.barra[0] = 85;
    const seg = +new URLSearchParams(location.search).get("captura") || 0; for (let i = 0; i < seg * 60; i++) { paso(); S.cam.x += 0; camara(); } ocultaGol();
  }
  window.__cabezones = { get S() { return S; }, centro, cola, EQUIPOS, eleccion, empieza, pinta: pintaEquipos, sim(n) { const v = {}; for (let i = 0; i < n; i++) { if (S.pausa) { if (S.fase === "final") break; S.pausa = false; if (S.parte === 2 && S.fase === "parado") {} } paso(); v[S.fase] = (v[S.fase] || 0) + 1; if (S.aviso) v["a:" + S.aviso.split(" ")[0]] = 1; } return v; }, iniciaPenalti, falta, iniciaTanda };
})();
})();
