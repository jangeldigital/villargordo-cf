/* Modo demostración de la web del Villargordo C.F.
   Se activa con index.html?demo (y se mantiene mientras dure la visita).
   Rellena la cantera con personajes INVENTADOS (dibujos, no fotos), contesta las
   entrevistas de cantera con respuestas de ejemplo y hace que los cromos hablen
   con la voz del navegador. Los datos reales del club no se tocan. */
const Demo = (() => {
  let activo = false;
  try {
    const q = new URLSearchParams(location.search);
    if (q.has("demo")) sessionStorage.setItem("vgcf-demo", "1");
    if (q.has("real")) sessionStorage.removeItem("vgcf-demo");
    activo = sessionStorage.getItem("vgcf-demo") === "1";
  } catch { activo = new URLSearchParams(location.search).has("demo"); }

  /* ---------- avatar ilustrado (igual que en mialbum.html) ---------- */
  const PIEL = ["#F2C9A5","#E0AC84","#C68A62","#8D5A3B","#F6D5B8"];
  function avatar(p, opts = {}) {
    const piel = PIEL[p.piel || 0], pelo = p.colorPelo || "#3a2416", ropa = p.ropa || "#B5122B";
    const atras = { largo:`<path d="M52 104c-4 40 2 80 10 96h76c8-16 14-56 10-96Z" fill="${pelo}"/>`,
      coleta:`<path d="M140 88c22 6 30 34 18 56c-6-20-14-30-22-34Z" fill="${pelo}"/>` }[p.pelo] || "";
    const arriba = {
      corto:`<path d="M58 98c-2-34 22-52 44-52s46 16 42 52c-6-14-16-22-30-24c-14 10-38 12-56 24Z" fill="${pelo}"/>`,
      largo:`<path d="M56 106c-4-38 20-60 46-60s50 20 44 60c-8-22-22-36-44-38c-20 2-36 16-46 38Z" fill="${pelo}"/>`,
      coleta:`<path d="M56 100c-2-34 22-54 46-54s46 18 44 54c-10-18-24-28-44-28s-36 10-46 28Z" fill="${pelo}"/>`,
      rizado:`<g fill="${pelo}"><circle cx="66" cy="78" r="16"/><circle cx="86" cy="62" r="18"/><circle cx="110" cy="58" r="18"/><circle cx="132" cy="70" r="17"/><circle cx="142" cy="90" r="12"/><circle cx="58" cy="96" r="11"/></g>`,
      calvo:`<path d="M60 96c0-10 4-18 8-22M140 96c0-10-4-18-8-22" stroke="${pelo}" stroke-width="8" stroke-linecap="round" fill="none"/>`,
    }[p.pelo] || "";
    const barba = p.barba ? `<path d="M70 124c6 30 20 40 32 40s26-10 32-40c-8 10-18 14-32 14s-24-4-32-14Z" fill="${pelo}" opacity=".85"/>` : "";
    const dorsal = p.dorsal != null ? `<text x="100" y="238" text-anchor="middle" font-family="Impact,Arial Black,sans-serif" font-weight="900" font-size="34" fill="#fff" opacity=".92">${p.dorsal}</text>` : "";
    const fondo = opts.fondo ? `<rect x="0" y="0" width="200" height="280" fill="${opts.fondo}"/>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="22 34 156 218" preserveAspectRatio="xMidYMid slice"${opts.attrs || ""}>${fondo}
      ${atras}
      <path d="M20 280c0-58 32-96 80-96s80 38 80 96Z" fill="${ropa}"/>
      ${p.adulto ? "" : `<path d="M58 200l-10 80h18l8-74ZM142 200l10 80h-18l-8-74Z" fill="#fff" opacity=".9"/>`}
      <path d="M86 150h28v38c0 8-28 8-28 0Z" fill="${piel}"/>
      <path d="M80 186c6 10 34 10 40 0l6 6c-10 14-42 14-52 0Z" fill="#fff"/>
      <ellipse cx="56" cy="116" rx="9" ry="12" fill="${piel}"/><ellipse cx="144" cy="116" rx="9" ry="12" fill="${piel}"/>
      <ellipse cx="100" cy="112" rx="44" ry="${p.adulto ? 54 : 50}" fill="${piel}"/>
      ${barba}
      <ellipse cx="78" cy="128" rx="9" ry="5" fill="#E26B6B" opacity=".28"/><ellipse cx="122" cy="128" rx="9" ry="5" fill="#E26B6B" opacity=".28"/>
      <path d="M74 96q8-6 16 0M110 96q8-6 16 0" stroke="${pelo}" stroke-width="4" stroke-linecap="round" fill="none"/>
      <g class="ojos"><ellipse cx="82" cy="112" rx="6" ry="7.5" fill="#1b1410"/><ellipse cx="118" cy="112" rx="6" ry="7.5" fill="#1b1410"/>
      <circle cx="84" cy="109" r="2.2" fill="#fff"/><circle cx="120" cy="109" r="2.2" fill="#fff"/></g>
      <path d="M98 118q2 8 6 6" stroke="#000" stroke-opacity=".25" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path class="boca-c" d="M86 136q14 14 28 0" stroke="#7a2a2a" stroke-width="4" fill="none" stroke-linecap="round"/>
      <g class="boca-a" opacity="0"><ellipse cx="100" cy="140" rx="11" ry="9" fill="#6b1f24"/><ellipse cx="100" cy="145" rx="6" ry="3.5" fill="#E26B6B"/></g>
      ${arriba}${dorsal}</svg>`;
  }
  const uri = svg => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

  /* foto de plantilla dibujada: dos filas de niños sobre el césped */
  function plantilla(jug, color) {
    const fila = (lista, y, h, dx) => lista.map((p, i) => {
      const w = h * 156 / 218;
      return `<svg x="${dx + i * (w * .78)}" y="${y}" width="${w}" height="${h}">${avatar(p).replace(/^<svg[^>]*>/, `<svg viewBox="22 34 156 218" preserveAspectRatio="xMidYMid slice">`)}</svg>`;
    }).join("");
    const atras = jug.slice(0, 6), delante = jug.slice(6, 11);
    const w1 = 230 * 156 / 218, w2 = 250 * 156 / 218;
    const ancho1 = w1 + (atras.length - 1) * w1 * .78, ancho2 = w2 + (delante.length - 1) * w2 * .78;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
      <defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2b4f"/><stop offset=".45" stop-color="${color}"/><stop offset=".46" stop-color="#3f6b2c"/><stop offset="1" stop-color="#2c5220"/></linearGradient></defs>
      <rect width="800" height="500" fill="url(#c)"/>
      <g opacity=".14" stroke="#fff" stroke-width="3" fill="none"><path d="M0 330h800"/><ellipse cx="400" cy="420" rx="160" ry="40"/></g>
      ${fila(atras, 70, 230, (800 - ancho1) / 2)}
      ${fila(delante, 230, 250, (800 - ancho2) / 2)}
    </svg>`;
  }

  /* ---------- personajes inventados por equipo ---------- */
  const PELOS = ["corto","coleta","largo","rizado","corto","coleta","corto","largo","rizado"];
  const COLORES_PELO = ["#4a2e1c","#a8642a","#1d1410","#2b1a10","#e0b25a","#120c08","#7a4a24","#c98b3c","#3a2416"];
  const NOMBRES = {
    prebenjamin: [["Nico","m"],["Vera","f"],["Bruno","m"],["Alba","f"],["Iker","m"],["Noa","f"],["Pablo","m"],["Lola","f"],["Teo","m"],["Mía","f"]],
    benjamin:    [["Vega","f"],["Marcos","m"],["Irene","f"],["Adrián","m"],["Julia","f"],["Gonzalo","m"],["Elena","f"],["Rubén","m"],["Claudia","f"],["Óscar","m"],["Nerea","f"]],
    alevin:      [["Hugo","m"],["Lucía","f"],["Martina","f"],["Álex","m"],["Carmen","f"],["Mario","m"],["Sofía","f"],["Leo","m"],["Paula","f"],["Dani","m"]],
    cadete:      [["Javi","m"],["Andrea","f"],["Raúl","m"],["Marta","f"],["Sergio","m"],["Laura","f"],["Iván","m"],["Ana","f"],["Pedro","m"],["Rocío","f"],["Jorge","m"],["Inés","f"]],
    juvenil:     [["Antonio","m"],["Cristina","f"],["Fran","m"],["Belén","f"],["Miguel","m"],["Patricia","f"],["Diego","m"],["Silvia","f"],["Carlos","m"],["Nuria","f"],["Manu","m"],["Lidia","f"]],
  };
  const POS = { m: ["Portero","Defensa","Defensa","Centrocampista","Centrocampista","Delantero","Extremo"],
                f: ["Portera","Defensa","Defensa","Centrocampista","Centrocampista","Delantera","Extremo"] };
  const GUSTOS = ["Lo que más me gusta es celebrar los goles con todo el equipo.","Mi abuelo viene a verme a todos los partidos.",
    "Este cromo me lo gané por no faltar a ningún entreno.","Quiero jugar algún día en el primer equipo del Villargordo.",
    "Mi jugada favorita es el caño, aunque el míster dice que pase más.","Aquí todos somos amigos, ganemos o perdamos.",
    "Me gané este cromo por ayudar a un compañero nuevo.","En el cole he subido las notas y por eso me dieron este cromo."];

  /* el alevín es el mismo equipo que el de "Mi álbum" (mialbum.html) */
  const ALEVIN = {
    Hugo:{pos:"Delantero",dorsal:9,piel:0,pelo:"corto",colorPelo:"#4a2e1c",frase:"¡Hola! Soy Hugo, juego de delantero y llevo el nueve. Mi jugada favorita es el sombrero, y cuando marco lo celebro como los mayores. ¡Aúpa Villargordo!"},
    "Lucía":{pos:"Portera",dorsal:1,piel:4,pelo:"coleta",colorPelo:"#a8642a",frase:"Soy Lucía y soy la portera. No me da miedo nada, ni los penaltis. Lo que más me gusta es parar un balón y que todo el equipo me abrace."},
    Martina:{pos:"Defensa",dorsal:4,piel:2,pelo:"largo",colorPelo:"#1d1410",frase:"Hola, soy Martina, defensa central. Mi abuelo viene a todos los partidos y me grita desde la grada. ¡Abuelo, esta va por ti!"},
    "Álex":{pos:"Centrocampista",dorsal:8,piel:1,pelo:"rizado",colorPelo:"#2b1a10",frase:"Soy Álex y juego en el medio. Me gusta dar el último pase, que es casi mejor que marcar. Bueno, casi."},
    Carmen:{pos:"Extremo",dorsal:11,piel:0,pelo:"coleta",colorPelo:"#e0b25a",frase:"¡Hola! Me llamo Carmen y corro por la banda más rápido que nadie del equipo. Mi sueño es jugar algún día en el primer equipo del Villargordo."},
    Mario:{pos:"Defensa",dorsal:3,piel:3,pelo:"corto",colorPelo:"#120c08",frase:"Soy Mario, lateral izquierdo. Este cromo me lo gané por esfuerzo, porque no he faltado a ningún entreno. ¡Ni cuando llovía!"},
    "Sofía":{pos:"Centrocampista",dorsal:6,piel:4,pelo:"largo",colorPelo:"#7a4a24",frase:"Hola, soy Sofía. En el cole he subido las notas de mates y por eso me dieron este cromo. Ahora quiero subir también los goles."},
    Leo:{pos:"Delantero",dorsal:10,piel:2,pelo:"rizado",colorPelo:"#1a110b",frase:"Soy Leo, llevo el diez. Lo que más me gusta del Villargordo es que aquí todos somos amigos, ganemos o perdamos."},
    Paula:{pos:"Defensa",dorsal:5,piel:1,pelo:"coleta",colorPelo:"#3a2416",frase:"¡Hola! Soy Paula. Me gané este cromo por compañerismo, porque ayudé a una niña nueva a aprenderse los ejercicios."},
    Dani:{pos:"Portero",dorsal:13,piel:0,pelo:"corto",colorPelo:"#c98b3c",frase:"Soy Dani, el otro portero. Mi abuela dice que tengo manos de pianista, pero yo las uso para parar balones."},
  };
  function rellena(EQUIPOS) {
    return EQUIPOS.map(eq => {
      const lista = NOMBRES[eq.id];
      if (!lista || eq.jugadores.some(j => j.foto)) return eq; // si ya hay cromos reales, no se toca
      const color = eq.color || "#B5122B";
      const jug = lista.map(([nombre, g], k) => {
        const fijo = eq.id === "alevin" && ALEVIN[nombre];
        const pos = fijo ? fijo.pos : POS[g][k % POS[g].length];
        const p = fijo ? { ...fijo, ropa: "#B5122B" } : { nombre, pos, dorsal: k === 0 ? 1 : k + 2, piel: (k * 3 + eq.id.length) % 5,
          pelo: g === "f" ? ["coleta","largo","coleta","largo"][k % 4] : ["corto","rizado","corto"][k % 3],
          colorPelo: COLORES_PELO[(k * 2 + eq.id.length) % COLORES_PELO.length], ropa: "#B5122B" };
        if (fijo) return { nombre, posicion: pos, dorsal: p.dorsal, foto: uri(avatar(p)), encuadre: "50% 50%",
          autorizado: true, autorizadoVideo: true, video: "demo", frase: fijo.frase, especial: false, _p: p };
        const frase = `¡Hola! Soy ${nombre} y juego de ${pos.toLowerCase()} en el ${eq.nombre.toLowerCase()}. ${GUSTOS[(k + eq.id.length) % GUSTOS.length]} ¡Aúpa Villargordo!`;
        return { nombre, posicion: pos, dorsal: p.dorsal, foto: uri(avatar(p)), encuadre: "50% 50%",
          autorizado: true, autorizadoVideo: true, video: "demo", frase, especial: k === 0, _p: p };
      });
      const fotoEq = uri(plantilla(jug.map(j => j._p), color));
      return { ...eq, foto: fotoEq, plazas: jug.length + 3, jugadores: jug, demo: true };
    });
  }

  /* ---------- voz: el cromo habla ---------- */
  let voz = null;
  const eligeVoz = () => { const v = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    voz = v.find(x => /es[-_]ES/i.test(x.lang) && /helena|laura|elvira|monica|female|mujer/i.test(x.name)) || v.find(x => /es[-_]ES/i.test(x.lang)) || v.find(x => /^es/i.test(x.lang)) || null; };
  if (window.speechSynthesis) { eligeVoz(); speechSynthesis.onvoiceschanged = eligeVoz; }

  function css() {
    if (document.getElementById("demo-css")) return;
    const s = document.createElement("style"); s.id = "demo-css";
    s.textContent = `
      .demo-pill{position:fixed;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;display:flex;align-items:center;gap:12px;
        background:#0B1226;border:1px solid #C9A23A;border-radius:40px;padding:8px 8px 8px 16px;box-shadow:0 14px 34px rgba(0,0,0,.45);font-family:"Inter Tight",system-ui,sans-serif;white-space:nowrap}
      .demo-pill small{font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:#E6CD85}
      .demo-pill a{background:#C9A23A;color:#0B1226;text-decoration:none;font-weight:700;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;padding:10px 16px;border-radius:30px}
      .demo-habla{position:fixed;inset:0;z-index:120;background:rgba(5,9,20,.94);display:flex;align-items:center;justify-content:center;padding:24px}
      .demo-habla .caja{width:min(340px,88vw);text-align:center;color:#F5F1E8;font-family:"Inter Tight",system-ui,sans-serif}
      .demo-habla .retrato{width:min(240px,62vw);aspect-ratio:5/7;margin:0 auto;border-radius:10px;padding:4px;background:linear-gradient(145deg,#E6CD85,#8F7024 45%,#E6CD85 75%,#8F7024)}
      .demo-habla .retrato>div{width:100%;height:100%;border-radius:7px;overflow:hidden;background:radial-gradient(120% 70% at 50% 0%,#5c1424,#0B1226 80%)}
      .demo-habla .retrato svg{width:100%;height:100%;display:block}
      .demo-habla h3{font-family:"Big Shoulders Display",Impact,sans-serif;font-weight:800;font-size:1.8rem;text-transform:uppercase;margin-top:14px}
      .demo-habla .sub{margin-top:10px;font-size:1rem;line-height:1.5;min-height:3em}
      .demo-habla .sub .w{opacity:.35;transition:opacity .15s}.demo-habla .sub .w.on{opacity:1}
      .demo-habla .nota{margin-top:12px;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:#AEB6CC}
      .demo-habla button{margin-top:14px;background:none;border:1px solid rgba(201,162,58,.5);color:#E6CD85;border-radius:3px;padding:11px 18px;font:700 .72rem/1 "Inter Tight",sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
      .demo-habla .x{position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:50%;padding:0;font-size:1.2rem;color:#F5F1E8}
      .demo-habla.hablando .boca-a{animation:demoBoca .22s steps(1) infinite}
      .demo-habla.hablando .boca-c{animation:demoBoca .22s steps(1) infinite reverse}
      @keyframes demoBoca{0%{opacity:1}50%{opacity:0}}
      #album .cromo .play{top:auto;left:auto;right:8px;bottom:52px;margin:0;width:34px;height:34px}
      #album .cromo .play svg{width:12px;height:12px}
      .ent .resp{display:block;grid-column:2/-1;margin-top:4px;color:#E6CD85;font-style:italic}
      .ent .escuchar{margin-top:14px;background:none;border:1px solid rgba(201,162,58,.6);color:#E6CD85;border-radius:3px;padding:10px 14px;font:700 .7rem/1 "Inter Tight",sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
      .ent .ejemplo{margin-top:10px;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;opacity:.7}
    `;
    document.head.appendChild(s);
  }

  let temp = null;
  function habla({ nombre, rol, frase, p }) {
    css(); calla();
    document.querySelector(".demo-habla")?.remove();
    const capa = document.createElement("div");
    capa.className = "demo-habla"; capa.setAttribute("role", "dialog"); capa.setAttribute("aria-label", "Cromo que habla");
    const palabras = frase.split(/\s+/);
    capa.innerHTML = `<button class="x" aria-label="Cerrar">×</button><div class="caja">
      <div class="retrato"><div>${p ? avatar(p) : ""}</div></div>
      <h3>${nombre}</h3><div style="font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:#E6CD85">${rol || ""}</div>
      <p class="sub">${palabras.map(w => `<span class="w">${w}</span>`).join(" ")}</p>
      <button class="otra" type="button">▶ Escuchar otra vez</button>
      <p class="nota">Personaje y voz de ejemplo · el real será el vídeo del niño</p></div>`;
    (document.querySelector("dialog[open]") || document.body).appendChild(capa);
    const cierra = () => { calla(); capa.remove(); };
    capa.querySelector(".x").onclick = cierra;
    capa.addEventListener("click", e => { if (e.target === capa) cierra(); });
    const di = () => {
      const ws = [...capa.querySelectorAll(".w")]; ws.forEach(w => w.classList.remove("on"));
      calla(); capa.classList.add("hablando");
      let i = 0; temp = setInterval(() => { if (i < ws.length) ws[i++].classList.add("on"); }, 300);
      const fin = () => { clearInterval(temp); ws.forEach(w => w.classList.add("on")); capa.classList.remove("hablando"); };
      if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
        const u = new SpeechSynthesisUtterance(frase); u.lang = "es-ES"; if (voz) u.voice = voz;
        u.pitch = p && p.adulto ? .9 : 1.45; u.rate = 1.05; u.onend = u.onerror = fin; speechSynthesis.speak(u);
      } else setTimeout(fin, palabras.length * 300 + 400);
    };
    capa.querySelector(".otra").onclick = di;
    di();
  }
  function calla() { clearInterval(temp); if (window.speechSynthesis) speechSynthesis.cancel(); }

  /* ---------- entrevistas de cantera contestadas (ejemplo) ---------- */
  const ENTREVISTAS = [
    { quien: "Nico", rol: "Prebenjamín · 6 años", p: { piel: 0, pelo: "rizado", colorPelo: "#4a2e1c", dorsal: 7 },
      r: ["Bruno, porque me deja su balón.", "¡Sí! Uno con la rodilla, pero cuenta.", "Un guepardo, porque corro mucho.", "La merienda. Bueno, chutar. Las dos."] },
    { quien: "Vega", rol: "Benjamín · 9 años", p: { piel: 2, pelo: "coleta", colorPelo: "#1d1410", dorsal: 9 },
      r: ["Defensa, porque me gusta quitar balones.", "El capitán del primer equipo.", "Hago un avión por toda la banda.", "Pasar con la izquierda."] },
    { quien: "Hugo", rol: "Alevín · 10 años", p: { piel: 0, pelo: "corto", colorPelo: "#4a2e1c", dorsal: 9 },
      r: ["A levantar la cabeza antes de pasar.", "El 3-2 contra Mengíbar, que remontamos.", "¡Sí! Con el nueve, como ahora.", "Que se lo pasen bien y que no falten a entrenar."] },
  ];
  function entrevistas() {
    const arts = document.querySelectorAll("#p-cantera .ent");
    arts.forEach((art, i) => {
      const e = ENTREVISTAS[i]; if (!e) return;
      const lis = art.querySelectorAll("ol li");
      lis.forEach((li, k) => { if (e.r[k]) li.insertAdjacentHTML("beforeend", `<span class="resp">${e.quien}: «${e.r[k]}»</span>`); });
      const est = art.querySelector(".estado");
      const frase = `Hola, soy ${e.quien}. ` + e.r.join(" ");
      if (est) est.outerHTML = `<button class="escuchar" type="button">▶ Escuchar a ${e.quien}</button><div class="ejemplo">Respuestas de ejemplo · personaje inventado</div>`;
      art.querySelector(".escuchar").onclick = () => habla({ nombre: e.quien, rol: e.rol, frase, p: { ...e.p, ropa: "#B5122B" } });
    });
  }

  function inicia() {
    if (!activo) return;
    css();
    document.body.insertAdjacentHTML("beforeend", `<div class="demo-pill" role="note"><small>Modo demostración</small><a href="mialbum.html">Abrir un sobre</a></div>`);
    const nav = document.querySelector("nav ul");
    if (nav && !nav.querySelector('a[href="mialbum.html"]')) nav.insertAdjacentHTML("beforeend", `<li><a href="mialbum.html">Mi álbum</a></li>`);
    entrevistas();
  }

  return { get activo() { return activo; }, avatar, rellena, habla, inicia };
})();
window.Demo = Demo;
