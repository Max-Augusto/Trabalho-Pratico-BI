/* =========================================================
   Cafeterias de Betim — Business Intelligence | PUC Minas
   app.js — dados, KPIs, gráficos (Chart.js) e interações
   ========================================================= */

"use strict";

/* ---------------------------------------------------------
   CONFIGURAÇÃO
   Cole aqui o link público do relatório publicado no Power BI
   (Publish to web → https://app.powerbi.com/view?r=...)
   --------------------------------------------------------- */
const POWER_BI_URL = "";

const DATA = Array.isArray(window.CAFETERIAS_BETIM) ? window.CAFETERIAS_BETIM : [];

const CORES = {
  popular: "#f4b400",
  intermediaria: "#34d0c8",
  premium: "#7fb2ff",
  barraAlta: "#34d0c8",
  barraBaixa: "rgba(255, 255, 255, 0.20)",
  texto: "#cfe0ef",
  grade: "rgba(255, 255, 255, 0.07)",
};

const SEGMENTO_COR = {
  Popular: CORES.popular,
  Intermediária: CORES.intermediaria,
  "Intermediaria": CORES.intermediaria,
  Premium: CORES.premium,
};

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

function configurarChartJS() {
  if (!window.Chart) return false;
  Chart.defaults.font.family = '"Inter", system-ui, sans-serif';
  Chart.defaults.font.size = 11;
  Chart.defaults.color = CORES.texto;
  Chart.defaults.borderColor = CORES.grade;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.legend.labels.padding = 14;
  Chart.defaults.plugins.tooltip.backgroundColor = "rgba(7, 30, 53, 0.96)";
  Chart.defaults.plugins.tooltip.borderColor = "rgba(52, 208, 200, 0.35)";
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.titleFont = { weight: "600" };
  return true;
}

/* Plugin simples para exibir valores ao final das barras */
const rotulosValor = {
  id: "rotulosValor",
  afterDatasetsDraw(chart, _args, opcoes) {
    if (!opcoes || opcoes.display === false) return;
    const { ctx } = chart;
    const horizontal = chart.options.indexAxis === "y";
    const formatador = opcoes.formatador || ((v) => nfInt.format(v));
    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (meta.hidden) return;
      meta.data.forEach((elemento, indice) => {
        const valor = dataset.data[indice];
        if (typeof valor !== "number") return;
        ctx.save();
        ctx.fillStyle = opcoes.color || "#dce9f5";
        ctx.font = '600 10.5px "Inter", sans-serif';
        if (horizontal) {
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(formatador(valor), elemento.x + 7, elemento.y);
        } else {
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(formatador(valor), elemento.x, elemento.y - 6);
        }
        ctx.restore();
      });
    });
  },
};

/* Texto central da rosca */
const textoCentroRosca = {
  id: "textoCentroRosca",
  afterDraw(chart) {
    const opcoes = chart.options.plugins?.textoCentroRosca;
    if (!opcoes || opcoes.display === false) return;
    const { ctx, chartArea } = chart;
    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = '700 26px "Sora", "Inter", sans-serif';
    ctx.fillText(opcoes.valor, x, y + 2);
    ctx.fillStyle = "#93aec8";
    ctx.font = '500 11px "Inter", sans-serif';
    ctx.fillText(opcoes.rotulo, x, y + 22);
    ctx.restore();
  },
};

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

/* ----------------------------- Gráficos ----------------------------- */

function criarGraficoDispersao() {
  const canvas = document.getElementById("chartScatter");
  if (!canvas) return;

  const segmentos = [...new Set(DATA.map((d) => d.segmento))];
  const datasets = segmentos.map((segmento) => ({
    label: segmento,
    data: DATA.filter((d) => d.segmento === segmento)
      .filter((d) => typeof d.nota_google === "number" && typeof d.num_avaliacoes === "number")
      .map((d) => ({ x: d.nota_google, y: d.num_avaliacoes, nome: d.nome })),
    backgroundColor: `${SEGMENTO_COR[segmento] || CORES.intermediaria}cc`,
    borderColor: "#071e35",
    borderWidth: 1.5,
    pointRadius: 7,
    pointHoverRadius: 10,
  }));

  new Chart(canvas, {
    type: "scatter",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 3.7,
          max: 5,
          title: { display: true, text: "Nota Google", color: "#93aec8" },
          grid: { color: CORES.grade },
          ticks: { stepSize: 0.2 },
        },
        y: {
          type: "logarithmic",
          min: 1,
          title: { display: true, text: "Nº de avaliações (escala log)", color: "#93aec8" },
          grid: { color: CORES.grade },
          ticks: { callback: (v) => nfInt.format(v) },
        },
      },
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const p = ctx.raw;
              return `${p.nome} — nota ${nfDec1.format(p.x)} · ${nfInt.format(p.y)} avaliações`;
            },
          },
        },
      },
    },
  });
}

function criarGraficoBairro() {
  const canvas = document.getElementById("chartBairro");
  if (!canvas) return;
  const ranking = contarPor("bairro");
  const destaque = new Set(["Centro", "Angola", "Ingá", "São João"]);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: ranking.map(([bairro]) => bairro),
      datasets: [
        {
          label: "Estabelecimentos",
          data: ranking.map(([, total]) => total),
          backgroundColor: ranking.map(([bairro]) =>
            destaque.has(bairro) ? CORES.barraAlta : CORES.barraBaixa
          ),
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 16,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 26 } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: CORES.grade },
          title: { display: true, text: "Nº de cafeterias", color: "#93aec8" },
        },
        y: { grid: { display: false } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw} cafeteria(s) · ${Math.round((ctx.raw / METRICAS.total) * 100)}% da base`,
          },
        },
        rotulosValor: { color: "#dce9f5" },
      },
    },
    plugins: [rotulosValor],
  });
}

function criarGraficoRosca() {
  const canvas = document.getElementById("chartSegmento");
  if (!canvas) return;
  const ranking = contarPor("segmento");

  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ranking.map(([segmento]) => segmento),
      datasets: [
        {
          data: ranking.map(([, total]) => total),
          backgroundColor: ranking.map(
            ([segmento]) => SEGMENTO_COR[segmento] || CORES.intermediaria
          ),
          borderColor: "#0c2946",
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.raw} (${Math.round((ctx.raw / METRICAS.total) * 100)}%)`,
          },
        },
        textoCentroRosca: { valor: String(METRICAS.total), rotulo: "cafeterias" },
      },
    },
    plugins: [textoCentroRosca],
  });
}

function criarGraficoHoras() {
  const canvas = document.getElementById("chartHoras");
  if (!canvas) return;

  const mapa = new Map();
  DATA.forEach((d) => {
    if (typeof d.horas_semana !== "number") return;
    const lista = mapa.get(d.tipo) || [];
    lista.push(d.horas_semana);
    mapa.set(d.tipo, lista);
  });

  const dados = [...mapa.entries()]
    .map(([tipo, valores]) => ({ tipo, media: Number(media(valores).toFixed(1)) }))
    .sort((a, b) => b.media - a.media);

  const encurtar = (texto) => texto.replace(/\s*\/\s*/g, "/").replace("Cafeteria/", "Caf./");

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: dados.map((d) => encurtar(d.tipo)),
      datasets: [
        {
          label: "Horas por semana",
          data: dados.map((d) => d.media),
          backgroundColor: dados.map((_, i) =>
            i === 0 ? CORES.barraAlta : "rgba(52, 208, 200, 0.42)"
          ),
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 34,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 22 } },
      scales: {
        x: {
          ticks: { autoSkip: false, maxRotation: 42, minRotation: 30, font: { size: 9 } },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Média de horas/semana", color: "#93aec8" },
          grid: { color: CORES.grade },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (itens) => dados[itens[0].dataIndex].tipo,
            label: (ctx) => `${nfDec1.format(ctx.raw)} h por semana (média)`,
          },
        },
        rotulosValor: { color: "#dce9f5", formatador: (v) => `${nfDec1.format(v)}h` },
      },
    },
    plugins: [rotulosValor],
  });
}

function criarTreemap() {
  const container = document.getElementById("treemap");
  if (!container) return;

  const grupos = new Map();
  DATA.forEach((d) => {
    const propriedade = d.propriedade || "Não informado";
    const local = d.localizacao_simplificada || "Não informado";
    if (!grupos.has(propriedade)) grupos.set(propriedade, new Map());
    const locais = grupos.get(propriedade);
    locais.set(local, (locais.get(local) || 0) + 1);
  });

  const gruposOrdenados = [...grupos.entries()].sort((a, b) => {
    const totalA = [...a[1].values()].reduce((x, y) => x + y, 0);
    const totalB = [...b[1].values()].reduce((x, y) => x + y, 0);
    return totalB - totalA;
  });

  container.innerHTML = "";

  gruposOrdenados.forEach(([propriedade, locais]) => {
    const totalGrupo = [...locais.values()].reduce((a, b) => a + b, 0);
    const grupo = document.createElement("div");
    grupo.className = "tm-group";
    grupo.style.flexGrow = String(totalGrupo);

    const head = document.createElement("div");
    head.className = "tm-group-head";
    head.innerHTML = `<span>${escapeHtml(propriedade)}</span><small>${totalGrupo}</small>`;

    const tiles = document.createElement("div");
    tiles.className = "tm-tiles";

    [...locais.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([local, total]) => {
        const tile = document.createElement("div");
        tile.className = `tm-tile ${
          propriedade === "Rede" ? "tm-tile-rede" : "tm-tile-indep"
        }`;
        tile.style.flexGrow = String(total);
        tile.title = `${propriedade} · ${local}: ${total} cafeteria(s)`;
        const rotulo = document.createElement("span");
        rotulo.textContent = local;
        const valor = document.createElement("strong");
        valor.textContent = total;
        tile.append(rotulo, valor);
        tiles.appendChild(tile);
      });

    grupo.append(head, tiles);
    container.appendChild(grupo);
  });
}

/* ----------------------------- Integrantes ----------------------------- */

const STORAGE_KEY = "bi-betim-integrantes-v1";
let estadoMembros = [];

function lerMembrosDoDOM() {
  return [...document.querySelectorAll("#membros .membro")].map((card, indice) => {
    const nome = card.querySelector(".membro-nome")?.textContent.trim() || "";
    const matricula = card.querySelector(".membro-matricula")?.textContent.trim() || "";
    return {
      nome: /^nome do integrante$/i.test(nome) ? "" : nome,
      matricula: /^matr[íi]cula$/i.test(matricula) ? "" : matricula,
      indice,
    };
  });
}

function carregarMembros() {
  try {
    const salvo = window.localStorage.getItem(STORAGE_KEY);
    if (salvo) {
      const dados = JSON.parse(salvo);
      if (Array.isArray(dados) && dados.length) {
        return dados.map((m) => ({ nome: String(m.nome || ""), matricula: String(m.matricula || "") }));
      }
    }
  } catch (_erro) {
    /* armazenamento indisponível — segue com padrão */
  }
  return lerMembrosDoDOM();
}

function salvarMembros() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoMembros));
  } catch (_erro) {
    /* ignora falha de armazenamento */
  }
}

function renderizarMembros() {
  const container = document.getElementById("membros");
  if (!container) return;
  container.innerHTML = "";

  estadoMembros.forEach((membro, indice) => {
    const card = document.createElement("div");
    card.className = "membro reveal in";

    const avatar = document.createElement("div");
    avatar.className = "membro-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = String(indice + 1).padStart(2, "0");

    const nome = document.createElement("span");
    nome.className = "membro-nome";
    nome.contentEditable = "true";
    nome.setAttribute("role", "textbox");
    nome.setAttribute("aria-label", `Nome do integrante ${indice + 1}`);
    nome.dataset.field = "Nome do integrante";
    nome.textContent = membro.nome;

    const matricula = document.createElement("span");
    matricula.className = "membro-matricula";
    matricula.contentEditable = "true";
    matricula.setAttribute("role", "textbox");
    matricula.setAttribute("aria-label", `Matrícula do integrante ${indice + 1}`);
    matricula.dataset.field = "Matrícula";
    matricula.textContent = membro.matricula;

    const aoEditar = () => {
      estadoMembros[indice] = {
        nome: nome.textContent.trim(),
        matricula: matricula.textContent.trim(),
      };
      salvarMembros();
    };

    nome.addEventListener("input", aoEditar);
    matricula.addEventListener("input", aoEditar);
    [nome, matricula].forEach((campo) => {
      campo.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") {
          evento.preventDefault();
          campo.blur();
        }
      });
    });

    card.append(avatar, nome, matricula);
    container.appendChild(card);
  });
}

function configurarMembros() {
  estadoMembros = carregarMembros();
  renderizarMembros();

  document.getElementById("addMembro")?.addEventListener("click", () => {
    estadoMembros.push({ nome: "", matricula: "" });
    salvarMembros();
    renderizarMembros();
    const cards = document.querySelectorAll("#membros .membro");
    const ultimo = cards[cards.length - 1]?.querySelector(".membro-nome");
    ultimo?.focus();
  });

  document.getElementById("resetMembros")?.addEventListener("click", () => {
    if (!window.confirm("Restaurar os campos para o padrão? Os nomes salvos serão apagados.")) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (_erro) {
      /* ignora */
    }
    estadoMembros = Array.from({ length: 4 }, () => ({ nome: "", matricula: "" }));
    salvarMembros();
    renderizarMembros();
  });
}

/* ----------------------------- Navegação / UI ----------------------------- */

function configurarNavegacao() {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("menu");
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
    status.textContent = "Relatório publicado e pronto para consulta";
  } else {
    botao.href = "#";
    status.innerHTML = "Link a configurar em <code>app.js</code> (veja powerbi_setup.md)";
    botao.addEventListener("click", (evento) => {
      evento.preventDefault();
      window.alert(
        "O link do Power BI ainda não foi configurado.\n\n" +
          "Publique o relatório (Publish to web) e cole a URL em POWER_BI_URL no arquivo app.js."
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
  configurarMembros();
  configurarModalMapa();
  configurarPowerBI();
  configurarReveal();

  if (!DATA.length) {
    console.warn("Base de cafeterias não encontrada. Rode etl_cafeterias.py.");
    return;
  }

  renderizarInsights();
  criarTreemap();

  if (configurarChartJS()) {
    criarGraficoDispersao();
    criarGraficoBairro();
    criarGraficoRosca();
    criarGraficoHoras();
  } else {
    document.querySelectorAll(".chart-box").forEach((box) => {
      box.innerHTML =
        '<p style="display:grid;place-items:center;height:100%;color:#93aec8;font-size:.85rem;text-align:center">' +
        "Chart.js não carregou (verifique a conexão).<br/>Os KPIs e o treemap continuam disponíveis.</p>";
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
