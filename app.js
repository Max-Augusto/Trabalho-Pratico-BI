/* =========================================================
   Cafeterias de Betim — Business Intelligence | PUC Minas
   app.js — dados, KPIs, análises e interações
   ========================================================= */

"use strict";

/* ---------------------------------------------------------
   CONFIGURAÇÃO
   Link direto para a página de análise no Power BI Service.
   A abertura exige acesso ao relatório.
   --------------------------------------------------------- */
const POWER_BI_URL = "https://app.powerbi.com/groups/me/reports/9ffbf44e-73de-4eb8-b84b-d2356a246e92/4b4de60277d36389e563?experience=power-bi";

const DATA = Array.isArray(window.CAFETERIAS_BETIM) ? window.CAFETERIAS_BETIM : [];

const nfInt = new Intl.NumberFormat("pt-BR");
const nfDec1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nfDec2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ----------------------------- Helpers ----------------------------- */

const media = (valores) => {
  const validos = valores.filter((v) => typeof v === "number" && Number.isFinite(v));
  return validos.length ? validos.reduce((a, b) => a + b, 0) / validos.length : null;
};

const contarPor = (chave) => {
  const mapa = new Map();
  DATA.forEach((item) => {
    const valor = item[chave] || "Não informado";
    mapa.set(valor, (mapa.get(valor) || 0) + 1);
  });
  return [...mapa.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
};

const escapeHtml = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function animarNumero(elemento, valorFinal, formatador, duracao = 900) {
  if (!elemento) return;
  if (semMovimento || !Number.isFinite(valorFinal)) {
    elemento.textContent = Number.isFinite(valorFinal) ? formatador.format(valorFinal) : "—";
    return;
  }
  const inicio = performance.now();
  const passo = (agora) => {
    const progresso = Math.min((agora - inicio) / duracao, 1);
    const suavizado = 1 - Math.pow(1 - progresso, 3);
    elemento.textContent = formatador.format(valorFinal * suavizado);
    if (progresso < 1) requestAnimationFrame(passo);
    else elemento.textContent = formatador.format(valorFinal);
  };
  requestAnimationFrame(passo);
}

/* ----------------------------- Métricas ----------------------------- */

const METRICAS = (() => {
  const notas = DATA.map((d) => d.nota_google).filter((v) => typeof v === "number");
  const reviews = DATA.map((d) => d.num_avaliacoes).filter((v) => typeof v === "number");
  const horas = DATA.map((d) => d.horas_semana).filter((v) => typeof v === "number");
  return {
    total: DATA.length,
    mediaNota: media(notas),
    totalReviews: reviews.reduce((a, b) => a + b, 0),
    mediaHoras: media(horas),
    semHoras: DATA.length - horas.length,
  };
})();

/* ----------------------------- KPIs ----------------------------- */

function preencherKPIs() {
  animarNumero(document.getElementById("heroTotal"), METRICAS.total, nfInt);
  animarNumero(document.getElementById("kpiTotal"), METRICAS.total, nfInt);
  animarNumero(document.getElementById("heroNota"), METRICAS.mediaNota, nfDec1);
  animarNumero(document.getElementById("kpiNota"), METRICAS.mediaNota, nfDec1);
  animarNumero(document.getElementById("heroReviews"), METRICAS.totalReviews, nfInt);
  animarNumero(document.getElementById("kpiReviews"), METRICAS.totalReviews, nfInt);

  const baseData = document.getElementById("baseData");
  if (baseData) {
    if (window.BASE_ATUALIZADA_EM) {
      const data = new Date(window.BASE_ATUALIZADA_EM);
      baseData.textContent = Number.isNaN(data.getTime())
        ? "—"
        : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } else {
      baseData.textContent = "—";
    }
  }
}

/* ----------------------------- Chart.js padrões ----------------------------- */

/* ----------------------------- Insights ----------------------------- */

function nomeMaisAvaliado() {
  return [...DATA].sort((a, b) => (b.num_avaliacoes || 0) - (a.num_avaliacoes || 0))[0];
}

function renderizarInsights() {
  const rankingBairros = contarPor("bairro");
  const rankingSegmentos = contarPor("segmento");
  const topoBairro = rankingBairros[0];
  const topoSegmento = rankingSegmentos[0];
  const melhorNota = [...DATA].sort(
    (a, b) => (b.nota_google || 0) - (a.nota_google || 0) || (b.num_avaliacoes || 0) - (a.num_avaliacoes || 0)
  )[0];
  const maisAvaliada = nomeMaisAvaliado();
  const topBairroPct = topoBairro ? Math.round((topoBairro[1] / METRICAS.total) * 100) : 0;
  const topSegPct = topoSegmento ? Math.round((topoSegmento[1] / METRICAS.total) * 100) : 0;

  const set = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  if (melhorNota && maisAvaliada) {
    set(
      "insightScatter",
      `<strong>${escapeHtml(melhorNota.nome)}</strong> lidera em reputação (${nfDec1.format(melhorNota.nota_google)}), enquanto <strong>${escapeHtml(maisAvaliada.nome)}</strong> concentra ${nfInt.format(maisAvaliada.num_avaliacoes)} avaliações. Nota alta não significa, necessariamente, grande volume de reviews.`
    );
  }

  if (topoBairro) {
    set(
      "insightBairro",
      `<strong>${escapeHtml(topoBairro[0])}</strong> reúne ${topoBairro[1]} de ${METRICAS.total} cafeterias (${topBairroPct}% da base), evidenciando forte concentração no centro da cidade.`
    );
  }

  if (topoSegmento) {
    set(
      "insightSegmento",
      `O segmento <strong>${escapeHtml(topoSegmento[0])}</strong> representa ${topSegPct}% do mercado mapeado, seguido por ${escapeHtml(rankingSegmentos[1]?.[0] || "—")} (${rankingSegmentos[1]?.[1] || 0}) e ${escapeHtml(rankingSegmentos[2]?.[0] || "—")} (${rankingSegmentos[2]?.[1] || 0}).`
    );
  }

  const horasPorTipo = new Map();
  DATA.forEach((d) => {
    if (typeof d.horas_semana !== "number") return;
    const lista = horasPorTipo.get(d.tipo) || [];
    lista.push(d.horas_semana);
    horasPorTipo.set(d.tipo, lista);
  });
  const tipoHoras = [...horasPorTipo.entries()]
    .map(([tipo, valores]) => ({ tipo, media: media(valores), n: valores.length }))
    .sort((a, b) => b.media - a.media)[0];

  if (tipoHoras) {
    set(
      "insightHoras",
      `<strong>${escapeHtml(tipoHoras.tipo)}</strong> tem a maior disponibilidade média: <strong>${nfDec1.format(tipoHoras.media)} h</strong> por semana. Média geral da base: ${nfDec1.format(METRICAS.mediaHoras)} h (${METRICAS.semHoras} registros sem horário informado).`
    );
  }

  const independentes = DATA.filter((d) => d.propriedade === "Independente").length;
  const rua = DATA.filter((d) => d.localizacao_simplificada === "Loja de rua").length;
  set(
    "insightTreemap",
    `Operações <strong>independentes</strong> somam ${independentes} de ${METRICAS.total} (${Math.round((independentes / METRICAS.total) * 100)}%), e <strong>${Math.round((rua / METRICAS.total) * 100)}%</strong> do mercado está em lojas de rua — o shopping é canal residual, típico de redes.`
  );

  const faixaPrincipal = contarPor("faixa_preco")[0];
  if (faixaPrincipal) {
    set(
      "insightPreco",
      `A faixa <strong>${escapeHtml(faixaPrincipal[0])}</strong> concentra ${faixaPrincipal[1]} de ${METRICAS.total} cafeterias (${Math.round((faixaPrincipal[1] / METRICAS.total) * 100)}%); faixas mais altas tendem a sustentar notas médias superiores.`
    );
  }

  const listaInsights = document.getElementById("insightList");
  if (listaInsights) {
    const itens = [
      `Mercado concentrado: <strong>${topoBairro?.[0] || "—"}</strong> lidera com ${topoBairro?.[1] || 0} estabelecimentos.`,
      `Reputação sólida: média de <strong>${nfDec2.format(METRICAS.mediaNota)}</strong> no Google.`,
      `<strong>${escapeHtml(maisAvaliada?.nome || "—")}</strong> é a referência em volume de avaliações.`,
      `Segmento dominante: <strong>${topoSegmento?.[0] || "—"}</strong> (${topSegPct}%).`,
      `Independência marca o setor: <strong>${Math.round((independentes / METRICAS.total) * 100)}%</strong> não pertencem a redes.`,
    ];
    listaInsights.innerHTML = itens.map((item) => `<li>${item}</li>`).join("");
  }
}

/* ----------------------------- Navegação / UI ----------------------------- */

function configurarNavegacao() {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("menu");
  const header = document.querySelector(".site-header");

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (evento) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      if (href === "#topo") {
        evento.preventDefault();
        window.scrollTo({ top: 0, behavior: semMovimento ? "auto" : "smooth" });
        return;
      }

      const alvo = document.getElementById(href.slice(1));
      if (!alvo) return;

      evento.preventDefault();
      const titulo = alvo.querySelector(".section-head") || alvo;
      const headerH = header?.offsetHeight || 72;
      const destino = Math.max(
        0,
        titulo.getBoundingClientRect().top + window.scrollY - headerH - 28
      );
      window.scrollTo({ top: destino, behavior: semMovimento ? "auto" : "smooth" });
      history.replaceState(null, "", href);
    });
  });

  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const aberto = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(aberto));
    toggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function configurarModalMapa() {
  const modal = document.getElementById("mapModal");
  const abrir = document.getElementById("openMapa");
  const fechar = document.getElementById("closeMapa");
  if (!modal || !abrir) return;

  abrir.addEventListener("click", () => {
    if (typeof modal.showModal === "function") modal.showModal();
    else window.open("assets/mapa2.pdf", "_blank", "noopener");
  });

  fechar?.addEventListener("click", () => modal.close());

  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) modal.close();
  });
}

function configurarPowerBI() {
  const botao = document.getElementById("btnPowerBI");
  const status = document.getElementById("powerbiStatus");
  if (!botao || !status) return;

  if (POWER_BI_URL) {
    botao.href = POWER_BI_URL;
    status.textContent = "O Power BI exige login e acesso ao relatório.";
  } else {
    botao.href = "#";
    status.innerHTML = "Link a configurar em <code>app.js</code> (veja powerbi_setup.md)";
    botao.addEventListener("click", (evento) => {
      evento.preventDefault();
      window.alert(
        "O link do Power BI ainda não foi configurado.\n\n" +
          "Configure o link da página do relatório em POWER_BI_URL no arquivo app.js."
      );
    });
  }
}

function configurarReveal() {
  const elementos = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || semMovimento) {
    elementos.forEach((el) => el.classList.add("in"));
    return;
  }
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("in");
          observador.unobserve(entrada.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  elementos.forEach((el) => observador.observe(el));
}

/* ----------------------------- Bootstrap ----------------------------- */

function iniciar() {
  preencherKPIs();
  configurarNavegacao();
  configurarModalMapa();
  configurarPowerBI();
  configurarReveal();

  if (!DATA.length) {
    console.warn("Base de cafeterias não encontrada. Rode etl_cafeterias.py.");
    return;
  }

  renderizarInsights();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
