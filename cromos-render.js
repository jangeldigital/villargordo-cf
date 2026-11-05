/* Pinta un cromo — compartido por index.html y club.html */
const Cromos = (() => {
  const SILUETA = `<svg class="silueta" viewBox="0 0 100 120" aria-hidden="true"><circle cx="50" cy="34" r="22" fill="currentColor"/><path d="M8 120c0-30 18-50 42-50s42 20 42 50Z" fill="currentColor"/></svg>`;
  const PLAY = `<span class="play" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 1.5v13l11-6.5Z"/></svg></span>`;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const visible = (eq, j) => !!(j && j.foto && (!eq.menores || j.autorizado === true));
  // el vídeo de un menor necesita también su propia autorización de vídeo
  const tieneVideo = (eq, j) => !!(visible(eq, j) && j.video && (!eq.menores || j.autorizadoVideo === true));
  const cuenta = eq => eq.jugadores.filter(j => visible(eq, j)).length;
  const total = eq => Math.max(eq.plazas || 0, eq.jugadores.length);

  function cromo(eq, j, k) {
    const n = `<span class="n">${String(k + 1).padStart(2, "0")}</span>`;
    if (visible(eq, j)) {
      const v = tieneVideo(eq, j);
      const attrs = v ? ` data-video="${k}" role="button" tabindex="0" aria-label="Ver el vídeo de ${esc(j.nombre)}"` : "";
      return `<div class="cromo lleno ${j.especial ? "especial" : ""} ${v ? "con-video" : ""}"${attrs}><div class="in">
        <img class="foto" src="${esc(j.foto)}" alt="${v ? "" : "Cromo de " + esc(j.nombre)}" style="object-position:${esc(j.encuadre || "50% 25%")}" loading="lazy">
        ${n}<img class="esc" src="img/escudo.png" alt="">${j.dorsal != null ? `<span class="dorsal">${esc(j.dorsal)}</span>` : ""}
        ${v ? PLAY : ""}
        <div class="nombre"><b>${esc(j.nombre)}</b><span>${esc(j.posicion)}</span></div></div></div>`;
    }
    return `<div class="cromo hueco"><div class="in">${SILUETA}${n}
        <div class="nombre"><b>${j ? esc(j.nombre) : "Cromo " + (k + 1)}</b><span>${j ? esc(j.posicion) : "Pendiente"}</span></div></div></div>`;
  }
  return { esc, visible, tieneVideo, cuenta, total, cromo };
})();
