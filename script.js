const $ = (s, r = document) => r.querySelector(s);
const post = (u, d) => fetch(u, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(d)}).then(async r => ({ok: r.ok, ...(await r.json())}));

/* Luz que segue o cursor */
addEventListener("pointermove", e => {
  document.documentElement.style.setProperty("--x", e.clientX + "px");
  document.documentElement.style.setProperty("--y", e.clientY + "px");
});

/* Cartões 3D com brilho */
document.querySelectorAll(".card").forEach(c => {
  c.addEventListener("pointermove", e => {
    const b = c.getBoundingClientRect(), px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
    c.style.transform = `perspective(700px) rotateX(${(.5 - py) * 8}deg) rotateY(${(px - .5) * 8}deg)`;
    c.style.setProperty("--mx", px * 100 + "%"); c.style.setProperty("--my", py * 100 + "%");
  });
  c.addEventListener("pointerleave", () => c.style.transform = "");
});

/* Onda de voz: reage ao mouse e ao microfone (Web Audio API) */
const cv = $("#onda"), g = cv.getContext("2d");
let W, H, mx = .5, an = null, buf = null, t = 0;
const fit = () => { const d = devicePixelRatio || 1; W = cv.width = cv.offsetWidth * d; H = cv.height = cv.offsetHeight * d; };
addEventListener("resize", fit); fit();
addEventListener("pointermove", e => mx = e.clientX / innerWidth);
const reduz = matchMedia("(prefers-reduced-motion:reduce)").matches;

function nivel() {
  if (!an) return .25;
  an.getByteTimeDomainData(buf);
  let s = 0; for (const v of buf) s += (v - 128) ** 2;
  return Math.min(1, Math.sqrt(s / buf.length) / 40) + .12;
}
function desenhar() {
  g.clearRect(0, 0, W, H); const n = nivel(); t += reduz ? 0 : .02 + n * .03;
  for (let k = 0; k < 5; k++) {
    g.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const u = x / W, env = Math.exp(-((u - (.35 + mx * .5)) ** 2) / .06);
      const y = H * .55 + Math.sin(u * 9 + t + k * .7) * env * H * .16 * n * (1 - k * .13) + Math.sin(u * 3 - t * .6 + k) * H * .02;
      x ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = k % 2 ? "rgba(184,169,255," + (.5 - k * .07) + ")" : "rgba(127,227,208," + (.7 - k * .1) + ")";
    g.lineWidth = 2 * (devicePixelRatio || 1); g.stroke();
  }
  requestAnimationFrame(desenhar);
}
desenhar();

$("#mic").addEventListener("click", async e => {
  const btn = e.currentTarget, hint = $("#micHint");
  if (an) { location.reload(); return; }
  try {
    const st = await navigator.mediaDevices.getUserMedia({audio: true});
    const ctx = new AudioContext(), src = ctx.createMediaStreamSource(st);
    an = ctx.createAnalyser(); an.fftSize = 512; buf = new Uint8Array(an.fftSize); src.connect(an);
    btn.classList.add("on"); btn.textContent = "Parar microfone"; hint.textContent = "Fale algo. Sua voz move a onda e não sai do seu aparelho.";
  } catch { hint.textContent = "Não foi possível acessar o microfone. Verifique a permissão do navegador."; }
});

/* Triagem (Python: /api/triagem) */
$("#formTriagem").addEventListener("submit", async e => {
  e.preventDefault(); const f = new FormData(e.target), out = $("#resTriagem");
  if (!f.get("perfil") || !f.get("queixa")) { out.className = "resultado erro"; out.textContent = "Responda as duas perguntas."; return; }
  let r; try { r = await post("/api/triagem", Object.fromEntries(f)); } catch { r = {servico: "avaliacao", mensagem: "Servidor offline. Uma avaliação inicial é o melhor primeiro passo."}; }
  out.className = "resultado"; out.textContent = r.mensagem;
  document.querySelectorAll(".card").forEach(c => c.classList.toggle("sel", c.dataset.id === r.servico));
  $("#s-" + r.servico)?.scrollIntoView({behavior: "smooth", block: "center"});
  $("#selServico").value = r.servico;
});

/* Agendamento (Python: /api/dias, /api/horarios, /api/agendar) */
const sel = $("#selServico"), horas = $("#horas"), dias = $("#dias");
document.querySelectorAll(".card").forEach(c => sel.add(new Option($("h3", c).textContent, c.dataset.id)));
let dia = "", hora = "";
const fmt = d => new Date(d + "T12:00").toLocaleDateString("pt-BR", {weekday: "short", day: "2-digit", month: "short"});
const chip = (txt, on, fn) => { const b = document.createElement("button"); b.type = "button"; b.textContent = txt; b.onclick = fn; return b; };
const msg = (t, erro) => { const o = $("#resAgenda"); o.className = "resultado" + (erro ? " erro" : ""); o.textContent = t; };

async function carregarDias() {
  try {
    (await (await fetch("/api/dias")).json()).forEach(d => dias.append(chip(fmt(d), 0, async ev => {
      dia = d; hora = ""; [...dias.children].forEach(b => b.classList.toggle("on", b === ev.currentTarget));
      const hs = await (await fetch("/api/horarios?data=" + d)).json(); horas.replaceChildren();
      if (!hs.length) horas.textContent = "Sem horários neste dia. Escolha outro.";
      hs.forEach(h => horas.append(chip(h, 0, e2 => { hora = h; [...horas.children].forEach(b => b.classList.toggle("on", b === e2.currentTarget)); })));
    })));
  } catch { dias.textContent = "Execute o servidor Python (python app.py) para ver os horários."; }
}
carregarDias();

$("#formAgenda").addEventListener("submit", async e => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
  try {
    const r = await post("/api/agendar", {...f, data: dia, hora});
    if (r.ok) { msg(`Agendado para ${fmt(dia)} às ${hora}. Entraremos em contato para confirmar.`); e.target.reset(); horas.replaceChildren(); [...dias.children].forEach(b => b.classList.remove("on")); dia = hora = ""; }
    else msg(r.erro, true);
  } catch { msg("Não foi possível enviar. Verifique se o servidor Python está rodando.", true); }
});
