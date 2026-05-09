import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Função para formatar moeda
// function formatCurrency(value: number | undefined) {
//   if (typeof value !== "number" || isNaN(value)) return "-";
//   return value.toLocaleString("pt-BR", {
//     style: "currency",
//     currency: "BRL",
//   });
// }
// ---- helpers visuais para "cards" ------------------------------------------
type RGB = [number, number, number];

function drawTag(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  bg: RGB,
  fg: RGB
) {
  const padX = 2.8;
  const padY = 1.6;
  const h = 6;
  const w = doc.getTextWidth(text) + padX * 2;
  doc.setFillColor(...bg);
  doc.setDrawColor(...bg);
  doc.roundedRect(x, y - h + 1.5, w, h, 2, 2, "F");
  doc.setTextColor(...fg);
  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text(text, x + padX, y - 1.6);
}

// function drawSummaryCard(opts: {
//   doc: jsPDF;
//   x: number;
//   y: number;
//   w: number;
//   title: string;
//   items: Array<[string, string, RGB?]>; // [label, valor, (opcional) cor do valor]
//   accent?: RGB; // corzinha do "ponto" do título
//   tags?: Array<{ text: string; bg: RGB; fg: RGB }>;
// }) {
//   const {
//     doc,
//     x,
//     y,
//     w,
//     title,
//     items,
//     accent = [41, 128, 185],
//     tags = [],
//   } = opts;

//   const pad = 7;
//   const line = 6.2;
//   const headerH = 16;
//   const rowsH = items.length * line + 6;
//   const h = headerH + rowsH + pad; // altura total do card

//   // Card container
//   doc.setDrawColor(225).setFillColor(255, 255, 255);
//   doc.roundedRect(x, y, w, h, 4, 4, "S");

//   // Título + “bolinha” de acento
//   doc.setFillColor(...accent);
//   doc.circle(x + pad - 2, y + 8.5, 2, "F");

//   doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(33);
//   doc.text(title, x + pad + 4, y + 11);

//   // Tags (badges) no topo-direita
//   let tagRight = x + w - pad;
//   tags
//     .slice()
//     .reverse()
//     .forEach((t) => {
//       const width = doc.getTextWidth(t.text) + 5.6;
//       tagRight -= width + 2;
//       drawTag(doc, t.text, tagRight, y + 12.5, t.bg, t.fg);
//     });

//   // Linhas (label esquerda / valor direita)
//   let cy = y + headerH + 3;
//   items.forEach(([label, value, valColor]) => {
//     doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100);
//     doc.text(label, x + pad, cy);

//     doc.setFont("helvetica", "bold").setTextColor(...(valColor ?? [0, 0, 0]));
//     doc.text(value || "-", x + w - pad, cy, { align: "right" });

//     cy += line;
//   });

//   return h;
// }

export interface EmpresaConfigPDF {
  nomeEmpresa?: string;
  site?: string;
  email?: string;
  rodapePdf?: string;
}

interface SimuladorPDFProps {
  tipoSimulacao: string;
  paramsLanceFixo: any;
  resultSorteio: any;
  resultLanceFixo: any;
  paramsLance: any;
  dadosTabela: any[];
  marcaEmpresa?: string;
  logoUrl?: string;
  returnBase64?: boolean;
  empresaConfig?: EmpresaConfigPDF;
}

// ====== Utils de layout (NOVO) ===============================================
function mmH(doc: jsPDF) {
  return doc.internal.pageSize.height;
}
function mmW(doc: jsPDF) {
  return doc.internal.pageSize.width;
}

/** Garante espaço antes de desenhar um bloco. Se não couber, abre nova página. */
function ensureSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  MARGIN_TOP: number,
  MARGIN_BOTTOM: number
) {
  const limit = mmH(doc) - MARGIN_BOTTOM;
  if (y + needed <= limit) return y;
  doc.addPage();
  return MARGIN_TOP;
}

/** Desenha título de seção e devolve a nova posição Y */
function drawSectionTitle(
  doc: jsPDF,
  title: string,
  x: number,
  y: number,
  color: [number, number, number]
) {
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...color);
  doc.text(title, x, y);
  return y + 9;
}

/** Linha separadora discreta */
function drawHr(
  doc: jsPDF,
  x1: number,
  x2: number,
  y: number,
  color = [41, 128, 185]
) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.5);
  doc.line(x1, y, x2, y);
}

/** Formatação BRL consistente */
function formatCurrency(value?: number) {
  if (typeof value !== "number" || isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function drawLogoFitted(
  doc: jsPDF,
  img: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number
) {
  try {
    // cria uma imagem em memória para descobrir o tamanho real
    const image = new Image();
    image.src = img;

    // proporção original
    const iw = image.width;
    const ih = image.height;
    if (!iw || !ih) {
      doc.addImage(img, "PNG", x, y, maxW, maxH);
      return;
    }

    const ratio = Math.min(maxW / iw, maxH / ih);
    const w = iw * ratio;
    const h = ih * ratio;

    // centraliza no espaço disponível (opcional)
    const offsetX = x + (maxW - w) / 2;
    const offsetY = y + (maxH - h) / 2;

    doc.addImage(img, "PNG", offsetX, offsetY, w, h);
  } catch (e) {
    console.log("Erro ao carregar logo", e);
  }
}

/** Escala a imagem mantendo proporção, cabendo em maxW x maxH */
type FitStrategy = "contain" | "width" | "height" | "stretch";

function detectImgFormat(img: string): "PNG" | "JPEG" | "WEBP" {
  if (img.startsWith("data:image/jpeg") || img.startsWith("data:image/jpg"))
    return "JPEG";
  if (img.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}

function drawImageFitted(
  doc: jsPDF,
  img: string,
  x: number,
  y: number,
  opts?: {
    // tamanhos em milímetros (unidade do jsPDF que você definiu)
    width?: number; // largura alvo
    height?: number; // altura alvo
    maxWidth?: number; // largura máxima (caixa)
    maxHeight?: number; // altura máxima (caixa)
    strategy?: FitStrategy; // "contain" (padrão), "width", "height", "stretch"
    align?: "left" | "center" | "right";
    valign?: "top" | "middle" | "bottom";
    format?: "PNG" | "JPEG" | "WEBP";
    compression?: "FAST" | "MEDIUM" | "SLOW";
    alias?: string;
  }
) {
  const {
    width,
    height,
    maxWidth,
    maxHeight,
    strategy = "contain",
    align = "left",
    valign = "top",
    format = detectImgFormat(img),
    compression = "FAST",
    alias,
  } = opts ?? {};

  // Dimensões reais (px) – síncrono
  let iw = 0,
    ih = 0;
  try {
    const p = doc.getImageProperties(img);
    iw = p.width;
    ih = p.height;
  } catch {
    // fallback se algo der errado; mantém proporção 1:1
    iw = 100;
    ih = 100;
  }

  // Define a "caixa" alvo
  let boxW = width ?? maxWidth ?? 0;
  let boxH = height ?? maxHeight ?? 0;

  // Se veio só width ou só height, calcula a outra mantendo proporção
  if (width && !height) boxH = (width * ih) / iw;
  if (height && !width) boxW = (height * iw) / ih;

  // Se veio só max*, usa como caixa
  if (!boxW && maxWidth) boxW = maxWidth;
  if (!boxH && maxHeight) boxH = maxHeight;

  // Tamanho final a desenhar
  let w = boxW || (iw * 25.4) / 96; // fallback: px→mm aprox. (96 DPI)
  let h = boxH || (ih * 25.4) / 96;

  if (strategy === "contain" && boxW && boxH) {
    const s = Math.min(boxW / iw, boxH / ih);
    w = iw * s;
    h = ih * s;
  } else if (strategy === "width" && width) {
    w = width;
    h = (width * ih) / iw;
  } else if (strategy === "height" && height) {
    h = height;
    w = (height * iw) / ih;
  } else if (strategy === "stretch" && boxW && boxH) {
    w = boxW;
    h = boxH;
  }

  // Alinhamento dentro da caixa
  let dx = 0,
    dy = 0;
  if (boxW && w < boxW) {
    if (align === "center") dx = (boxW - w) / 2;
    else if (align === "right") dx = boxW - w;
  }
  if (boxH && h < boxH) {
    if (valign === "middle") dy = (boxH - h) / 2;
    else if (valign === "bottom") dy = boxH - h;
  }

  doc.addImage(img, format as any, x + dx, y + dy, w, h, alias, compression);
  return { w, h, x: x + dx, y: y + dy };
}

/** Texto multi-linha com largura fixa (sem sobrepor) */
function drawTextBlock(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize = 9,
  color: [number, number, number] = [0, 0, 0],
  bold = false
) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  const h = lines.length * (fontSize * 0.5 + 2.2); // altura aproximada por linha
  return y + h;
}

/** Card de resumo (NOVO): mede alturas e nunca ultrapassa borda */
function drawSummaryCard(opts: {
  doc: jsPDF;
  x: number;
  y: number;
  w: number;
  title: string;
  accent: [number, number, number];
  items: Array<
    [string, string | number | undefined, [number, number, number]?]
  >;
  tags?: Array<{
    text: string;
    bg: [number, number, number];
    fg: [number, number, number];
  }>;
}) {
  const { doc, x, y, w, title, accent, items, tags } = opts;
  const padding = 6;
  const lineH = 5;
  let innerY = y + padding + 6;

  // título
  doc.setFillColor(245, 248, 255);
  doc.setDrawColor(235, 240, 250);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, 10 + padding, "S"); // faixa do título
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accent);
  doc.text(title, x + padding, y + padding + 7);

  // corpo
  let contentY = y + 10 + padding + 2;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 20);

  const labelW = Math.min(0.55 * w, 70); // reservas coerentes
  const valueW = w - padding * 2 - labelW;

  items.forEach(([label, value, color]) => {
    const labelLines = doc.splitTextToSize(label, labelW);
    const valueStr =
      typeof value === "number"
        ? formatCurrency(value)
        : (value ?? "-").toString();
    const valueLines = doc.splitTextToSize(valueStr, valueW);

    const rowH = Math.max(labelLines.length, valueLines.length) * (lineH - 1);

    // linhas-guia (opcional)
    doc.setDrawColor(245, 245, 245);
    doc.setLineWidth(0.2);
    doc.line(x, contentY + rowH, x + w, contentY + rowH);

    // label
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text(labelLines, x + padding, contentY + 3);

    // value
    doc.setFont("helvetica", "bold");
    if (color) doc.setTextColor(color[0], color[1], color[2]);
    else doc.setTextColor(30, 30, 30);

    // alinhar valor à direita dentro da coluna direita
    const valueX = x + padding + labelW + valueW;
    valueLines.forEach((ln: any, i: any) => {
      doc.text(ln, valueX, contentY + 3 + i * (lineH - 1), { align: "right" });
    });

    contentY += rowH + 2;
  });

  // tags (se houver)
  if (tags && tags.length) {
    let tx = x + padding;
    const ty = contentY + 4;
    tags.forEach((t) => {
      const text = ` ${t.text} `;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const tw = doc.getTextWidth(text) + 4;
      doc.setFillColor(...t.bg);
      doc.setTextColor(...t.fg);
      doc.rect(tx, ty - 4.5, tw, 6.5, "F");
      doc.text(text, tx + 2, ty);
      tx += tw + 4;
    });
    contentY = ty + 8;
  }

  // borda geral do card
  doc.setDrawColor(230, 235, 245);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, contentY - y + padding, "S");

  return contentY - y + padding; // altura total
}

// ====== Função principal (SUBSTITUIR SUA VERSÃO POR ESTA) ====================
export function gerarPDFSimulacao({
  tipoSimulacao,
  paramsLanceFixo,
  resultSorteio,
  resultLanceFixo,
  paramsLance,
  dadosTabela,
  marcaEmpresa = "Loop",
  logoUrl,
  returnBase64,
  empresaConfig,
}: SimuladorPDFProps) {
  const footerData = {
    site: empresaConfig?.site ?? "www.crmloop.com.br",
    email: empresaConfig?.email ?? "contato@crmloop.com.br",
    rodape: empresaConfig?.rodapePdf ?? "Este documento mostra os resultados de uma simulação e não tem valor legal. Os dados contidos nesta simulação serão utilizados de acordo com a nossa política de privacidade.",
  };
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Metadados
  doc.setProperties({
    title: "Simulador de Consórcio",
    subject: "Relatório de Simulação",
    author: marcaEmpresa,
    creator: marcaEmpresa,
    keywords: "consórcio, simulação, lance, sorteio",
  });

  // Margens e layout
  const MARGIN_LR = 18;
  const MARGIN_TOP = 22; // área útil começa aqui
  const MARGIN_BOTTOM = 22; // área útil termina antes disso
  const CONTENT_W = mmW(doc) - MARGIN_LR * 2;

  let y = MARGIN_TOP;

  // ===== Header (logo + título + data) =======================================
  const headerH = 18; // reserva fixa para não colidir
  // barra superior discreta
  doc.setFillColor(245, 248, 255);
  doc.rect(0, 0, mmW(doc), headerH, "F");
  if (logoUrl) {
    drawImageFitted(doc, logoUrl, MARGIN_LR, 4, {
      width: 22,
      height: 10,
      strategy: "contain",
      align: "left", // pode ser "center" ou "right"
      valign: "middle", // pode ser "top" ou "bottom"
    }); //contain, width, height
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(41, 128, 185);
  doc.text("Simulador de Consórcio", MARGIN_LR + 26, 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Data: ${new Date().toLocaleDateString("pt-BR")}`,
    MARGIN_LR + 26,
    15
  );

  // avança para baixo do header
  y = headerH + 6;

  // ===== Cards de Resumo =====================================================
  const gap = 8;
  const cardW = (CONTENT_W - gap) / 2;

  // Valores base
  const credito =
    Number(dadosTabela?.[0]?.credito) ??
    Number(
      resultLanceFixo?.creditoContratado ??
        paramsLanceFixo?.creditoUnitario ??
        0
    );

  const taxaPct = Number(paramsLanceFixo?.taxaParcela ?? 0);
  const taxaValor = credito * (taxaPct / 100);
  const saldoInicialCalculado = credito + taxaValor;
  const saldoInicialRight = Number(
    resultLanceFixo?.saldoDevedorInicial ?? saldoInicialCalculado
  );

  const parcelaAntes = Number(resultSorteio?.parcelaAntes ?? 0);
  const parcelaApos =
    Number(dadosTabela?.[0]?.parcela) ||
    Number(resultSorteio?.parcelaDepois ?? resultLanceFixo?.novaParcela ?? 0);

  const totalParcelas =
    Number(
      paramsLanceFixo?.qtdParcelas ??
        resultSorteio?.qtdParcelas ??
        dadosTabela?.length ??
        0
    ) || 0;

  const parcelaContemplacaoReal = Math.max(
    1,
    Math.min(
      totalParcelas || 1,
      Number(paramsLanceFixo?.parcelaContemplacao ?? 1)
    )
  );
  const parcelasRestantes = Math.max(
    0,
    (totalParcelas || 0) - parcelaContemplacaoReal
  );

  const pagoParc = Number(paramsLance?.lancePagoParcela ?? 0);
  const embParc = Number(paramsLance?.lanceEmbutidoParcela ?? 0);

  const valorTotalLance =
    Number(resultLanceFixo?.valorLanceTotal) ||
    (pagoParc + embParc) * (parcelaApos || 0);

  const valorEmbutidoCredito = embParc * (parcelaApos || 0);
  const creditoLiberadoNoMes =
    Number(dadosTabela?.[0]?.creditoLiberado) ||
    Math.max(0, (credito || 0) - valorEmbutidoCredito);

  const saldoFinalRight = Math.max(
    0,
    (saldoInicialRight || 0) - (valorTotalLance || 0)
  );

  // Garante espaço para os dois cards (estimativa bem segura)
  y = ensureSpace(doc, y, 68, MARGIN_TOP, MARGIN_BOTTOM);

  const leftH = drawSummaryCard({
    doc,
    x: MARGIN_LR,
    y,
    w: cardW,
    title: "Sorteio",
    accent: [41, 128, 185],
    items: [
      ["Crédito contratado", formatCurrency(credito)],
      ["Taxa Administrativa", formatCurrency(taxaValor)],
      ["Saldo Devedor Inicial", formatCurrency(saldoInicialCalculado)],
      [
        "Parcela antes da contemplação",
        formatCurrency(parcelaAntes),
        [0, 92, 194],
      ],
      [
        "Parcela após contemplação",
        formatCurrency(parcelaApos),
        [46, 204, 113],
      ],
      ["Saldo devedor", formatCurrency(resultSorteio?.saldoDevedor)],
      [
        "Valor investido até contemplação",
        formatCurrency(resultSorteio?.valorPago),
      ],
      ["Parcelas Restantes", String(parcelasRestantes)],
    ],
  });

  const tituloLance =
    (paramsLance?.tipoLance ?? "lance-livre") === "lance-fixo"
      ? "Lance fixo"
      : "Lance livre";

  const parcelaAposDireita =
    (paramsLance?.tipoLance ?? "lance-livre") === "lance-livre"
      ? parcelasRestantes > 0
        ? saldoFinalRight / parcelasRestantes
        : 0
      : parcelaApos;

  const rightH = drawSummaryCard({
    doc,
    x: MARGIN_LR + cardW + gap,
    y,
    w: cardW,
    title: tituloLance,
    accent: [108, 117, 125],
    items: [
      ["Crédito contratado", formatCurrency(credito)],
      [
        "Taxa Administrativa",
        formatCurrency(
          typeof resultLanceFixo?.taxaAdministrativa === "number" &&
            !isNaN(resultLanceFixo.taxaAdministrativa)
            ? resultLanceFixo.taxaAdministrativa
            : taxaValor
        ),
      ],
      ["Saldo Devedor Inicial", formatCurrency(saldoInicialRight)],
      ["Valor Total do Lance", formatCurrency(valorTotalLance)],
      [
        "Crédito Liberado (no mês)",
        formatCurrency(creditoLiberadoNoMes),
        [46, 204, 113],
      ],
      ["Saldo Devedor Final", formatCurrency(saldoFinalRight)],
      [
        "Parcela antes da contemplação",
        formatCurrency(parcelaAntes),
        [0, 92, 194],
      ],
      [
        "Parcela após contemplação",
        formatCurrency(parcelaAposDireita),
        [46, 204, 113],
      ],
      ["Parcelas Restantes", String(parcelasRestantes)],
    ],
    tags: [
      { text: `Pago: ${pagoParc}`, bg: [220, 252, 231], fg: [21, 128, 61] },
      { text: `Emb: ${embParc}`, bg: [254, 226, 226], fg: [220, 38, 38] },
    ],
  });

  y += Math.max(leftH, rightH) + 10;

  // ===== Separador ============================================================
  y = ensureSpace(doc, y, 8, MARGIN_TOP, MARGIN_BOTTOM);
  drawHr(doc, MARGIN_LR, mmW(doc) - MARGIN_LR, y, [41, 128, 185]);
  y += 6;

  // ===== Parâmetros da Simulação =============================================
  y = drawSectionTitle(
    doc,
    "Parâmetros da Simulação",
    MARGIN_LR,
    y,
    [41, 128, 185]
  );
  y += 2;

  const paramsData = [
    ["Crédito Unitário", formatCurrency(paramsLanceFixo?.creditoUnitario)],
    ["Quantidade de Parcelas", `${paramsLanceFixo?.qtdParcelas || "-"} meses`],
    ["Taxa Administrativa", `${paramsLanceFixo?.taxaParcela || "-"}%`],
    [
      "Opção de Parcela",
      `${paramsLanceFixo?.percentualParcelaReduzida || "-"}%`,
    ],
    [
      "Parcela de Contemplação",
      `${paramsLanceFixo?.parcelaContemplacao || "-"}`,
    ],
    ["Acrescentar Seguro", paramsLanceFixo?.acrescentarSeguro ? "Sim" : "Não"],
    ["Junção de Cotas", `${paramsLanceFixo?.juncaoDeCotas || "1"}`],
  ];

  // tabelas sempre checam página pelo autoTable
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_LR, right: MARGIN_LR, bottom: MARGIN_BOTTOM + 6 },
    head: [["Parâmetro", "Valor"]],
    body: paramsData,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    pageBreak: "auto",
    rowPageBreak: "auto",
    tableWidth: CONTENT_W,
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ===== Resultados da Simulação =============================================
  y = drawSectionTitle(
    doc,
    "Resultados da Simulação",
    MARGIN_LR,
    y,
    [41, 128, 185]
  );
  y += 4;

  // --- Sorteio
  if (resultSorteio) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(52, 152, 219);
    doc.text("Simulação por Sorteio", MARGIN_LR, y);
    y += 6;

    const sorteioData = [
      [
        "Parcela antes da contemplação",
        formatCurrency(resultSorteio?.parcelaAntes),
      ],
      [
        "Parcela após contemplação",
        formatCurrency(resultSorteio?.parcelaDepois),
      ],
      ["Saldo devedor", formatCurrency(resultSorteio?.saldoDevedor)],
      ["Valor pago até contemplação", formatCurrency(resultSorteio?.valorPago)],
      ["Valor total a pagar", formatCurrency(resultSorteio?.valorTotal)],
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_LR, right: MARGIN_LR, bottom: MARGIN_BOTTOM + 6 },
      body: sorteioData,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 3, overflow: "linebreak" },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      pageBreak: "auto",
      rowPageBreak: "auto",
      tableWidth: CONTENT_W,
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- Lance Fixo
  if (resultLanceFixo && !resultLanceFixo.erro) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(46, 204, 113);
    doc.text("Simulação por Lance Fixo", MARGIN_LR, y);
    y += 6;

    const lanceFixoData = [
      [
        "Crédito Contratado",
        formatCurrency(resultLanceFixo?.creditoContratado),
      ],
      [
        "Taxa Administrativa",
        formatCurrency(resultLanceFixo?.taxaAdministrativa),
      ],
      [
        "Saldo Devedor Inicial",
        formatCurrency(resultLanceFixo?.saldoDevedorInicial),
      ],
      ["Crédito Liberado", formatCurrency(resultLanceFixo?.creditoLiberado)],
      [
        "Saldo Devedor Final",
        formatCurrency(resultLanceFixo?.saldoDevedorFinal),
      ],
      [
        "Nova Parcela",
        resultLanceFixo?.novaParcela
          ? `R$ ${resultLanceFixo.novaParcela.toFixed(2).replace(".", ",")}`
          : "-",
      ],
      [
        "Valor Total do Lance",
        formatCurrency(resultLanceFixo?.valorLanceTotal),
      ],
      ["Parcelas Restantes", `${resultLanceFixo?.parcelasRestantes || "-"}`],
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_LR, right: MARGIN_LR, bottom: MARGIN_BOTTOM + 6 },
      body: lanceFixoData,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 3, overflow: "linebreak" },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      pageBreak: "auto",
      rowPageBreak: "auto",
      tableWidth: CONTENT_W,
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- Detalhes do Lance
  if (
    paramsLance &&
    (paramsLance.lancePagoParcela || paramsLance.lanceEmbutidoParcela)
  ) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(155, 89, 182);
    doc.text("Detalhes do Lance", MARGIN_LR, y);
    y += 6;

    const lanceData = [
      [
        "Lance Pago em Dinheiro",
        `${paramsLance.lancePagoParcela || 0} parcelas`,
      ],
      [
        "Lance Embutido na Carta",
        `${paramsLance.lanceEmbutidoParcela || 0} parcelas`,
      ],
      [
        "Total de Parcelas do Lance",
        `${
          (paramsLance.lancePagoParcela || 0) +
          (paramsLance.lanceEmbutidoParcela || 0)
        } parcelas`,
      ],
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_LR, right: MARGIN_LR, bottom: MARGIN_BOTTOM + 6 },
      body: lanceData,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 3, overflow: "linebreak" },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      pageBreak: "auto",
      rowPageBreak: "auto",
      tableWidth: CONTENT_W,
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ===== Tabela de Simulação (todas as parcelas) =============================
  if (dadosTabela && dadosTabela.length > 0) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("Tabela de Simulação", MARGIN_LR, y);
    y += 6;

    const contemplacaoMes =
      Math.max(
        1,
        Math.min(
          totalParcelas || 1,
          Number(paramsLanceFixo?.parcelaContemplacao ?? 1)
        )
      ) || 1;

    const columns = [
      { header: "Mês", dataKey: "mes" },
      { header: "Crédito", dataKey: "creditoFmt" },
      { header: "Parcela", dataKey: "parcelaFmt" },
      { header: "Valor Investido", dataKey: "valorInvestidoFmt" },
      {
        header: "Valor embutido do crédito",
        dataKey: "valorEmbutidoCreditoFmt",
      },
      { header: "Crédito Liberado", dataKey: "creditoLiberadoFmt" },
      { header: "Valor de Venda da Cota", dataKey: "valorVendaCotaFmt" },
      { header: "Lucro", dataKey: "lucroBrutoFmt" },
      { header: "% Lucro ao Mês", dataKey: "percLucroMesFmt" },
    ] as const;

    const body = dadosTabela.map((item: any) => {
      const isContemplacao = item.mes === contemplacaoMes;
      return {
        mes: isContemplacao ? `${item.mes}*` : String(item.mes),
        creditoFmt: formatCurrency(item.credito),
        parcelaFmt: formatCurrency(item.parcela),
        valorInvestidoFmt: formatCurrency(item.valorInvestido),
        valorEmbutidoCreditoFmt: formatCurrency(item.valorEmbutidoCredito),
        creditoLiberadoFmt: formatCurrency(item.creditoLiberado),
        valorVendaCotaFmt:
          item.mes >= contemplacaoMes
            ? formatCurrency(item.valorVendaCota)
            : "-",
        lucroBrutoFmt: formatCurrency(item.lucroBruto),
        percLucroMesFmt:
          typeof item.percLucroMes === "number"
            ? `${(item.percLucroMes * 100).toFixed(2).replace(".", ",")}%`
            : "-",
        _mesNum: Number(item.mes) || 0,
        _lucroNum: Number(item.lucroBruto) || 0,
        _percMesNum: Number(item.percLucroMes) || 0,
      };
    });

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_LR, right: MARGIN_LR, bottom: MARGIN_BOTTOM + 6 },
      columns: columns as any,
      body,
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 1.2, right: 2, bottom: 1.2, left: 2 },
        overflow: "linebreak",
        halign: "right",
        valign: "middle",
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: {
        mes: { cellWidth: 10, halign: "center" },
        creditoFmt: { cellWidth: 20 },
        parcelaFmt: { cellWidth: 18 },
        valorInvestidoFmt: { cellWidth: 22 },
        valorEmbutidoCreditoFmt: { cellWidth: 22 },
        creditoLiberadoFmt: { cellWidth: 22 },
        valorVendaCotaFmt: { cellWidth: 24 },
        lucroBrutoFmt: { cellWidth: 18 },
        percLucroMesFmt: { cellWidth: 14 },
      },
      pageBreak: "auto",
      rowPageBreak: "auto",
      tableWidth: CONTENT_W,
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const raw: any = data.row.raw;

        if (data.column.dataKey === "mes" && raw._mesNum === contemplacaoMes) {
          data.cell.styles.fillColor = [232, 244, 255];
          data.cell.styles.textColor = [30, 64, 175];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "center";
        }
        if (data.column.dataKey === "parcelaFmt") {
          const isAntes = raw._mesNum < contemplacaoMes;
          data.cell.styles.textColor = isAntes ? [0, 92, 194] : [46, 204, 113];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.dataKey === "lucroBrutoFmt") {
          const positive = (raw._lucroNum ?? 0) > 0;
          data.cell.styles.textColor = positive
            ? [39, 174, 96]
            : [100, 100, 100];
          data.cell.styles.fontStyle = positive ? "bold" : "normal";
        }
        if (data.column.dataKey === "percLucroMesFmt") {
          const positive = (raw._percMesNum ?? 0) > 0;
          data.cell.styles.textColor = positive
            ? [39, 174, 96]
            : [100, 100, 100];
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // legenda da tabela (checa espaço antes)
    y = ensureSpace(doc, y, 10, MARGIN_TOP, MARGIN_BOTTOM);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(
      "* Mês de contemplação  •  Parcela antes = azul  •  Parcela após = verde",
      MARGIN_LR,
      y
    );
    if (paramsLanceFixo?.acrescentarINCC) {
      y += 4;
      doc.text(
        "+6% de INCC aplicado a cada 12 meses (a partir do mês 13).",
        MARGIN_LR,
        y
      );
    }
    y += 6;
  }

  // ===== Observações =========================================================
  y = ensureSpace(doc, y, 30, MARGIN_TOP, MARGIN_BOTTOM);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(41, 128, 185);
  doc.text("Observações:", MARGIN_LR, y);
  y += 5;

  const obs =
    "• Esta simulação é baseada nos parâmetros informados e pode variar conforme condições de mercado.\n" +
    "• A taxa administrativa é sempre calculada sobre o crédito total contratado.\n" +
    "• O lance embutido reduz tanto o crédito liberado quanto o saldo devedor.\n" +
    "• O lance em dinheiro reduz apenas o saldo devedor.\n" +
    "• Para mais informações, entre em contato conosco.";
  y = drawTextBlock(
    doc,
    obs,
    MARGIN_LR + 2,
    y,
    CONTENT_W - 4,
    9,
    [0, 0, 0],
    false
  );

  // ===== Rodapé em todas as páginas =========================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageW = mmW(doc);
    const pageH = mmH(doc);

    // linha acima do rodapé
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(
      MARGIN_LR,
      pageH - MARGIN_BOTTOM + 4,
      pageW - MARGIN_LR,
      pageH - MARGIN_BOTTOM + 4
    );

    // número da página
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Página ${i} de ${pageCount}`, pageW - MARGIN_LR, pageH - 7, {
      align: "right",
    });

    // empresa e carimbo
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text(`${marcaEmpresa}`, MARGIN_LR, pageH - 9);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Simulador de Consórcio - Gerado em: ${new Date().toLocaleString(
        "pt-BR"
      )}`,
      MARGIN_LR,
      pageH - 5
    );
  }

  // ===== Salvar / retornar ===================================================
  const fileName = `simulacao-consorcio-${marcaEmpresa
    .replace(/\s+/g, "-")
    .toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;

  if (returnBase64) {
    const dataUri = doc.output("datauristring");
    return dataUri.split(",")[1] || "";
  }

  doc.save(fileName);

  // opcional: abrir numa aba e iniciar download (igual seu fluxo original)
  try {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  } catch {
    // ambiente sem window
  }
}

// Interface para Home Equity PDF
interface HomeEquityPDFProps {
  paramsHomeEquity: any;
  resultHomeEquity: any;
  parcelasHomeEquity: any[];
  marcaEmpresa?: string;
  logoUrl?: string;
  nomeUsuarioLogado?: string;
  empresaConfig?: EmpresaConfigPDF;
}
function pct(n?: number) {
  const v = typeof n === "number" && !isNaN(n) ? n : 0;
  return `${v.toFixed(2).replace(".", ",")}%`;
}
export function gerarPDFHomeEquity({
  paramsHomeEquity,
  parcelasHomeEquity,
  resultHomeEquity, // opcional
  marcaEmpresa = "Loop",
  logoUrl,
  nomeUsuarioLogado = "",
  empresaConfig,
}: HomeEquityPDFProps) {
  const footerData = {
    site: empresaConfig?.site ?? "www.crmloop.com.br",
    email: empresaConfig?.email ?? "contato@crmloop.com.br",
    rodape: empresaConfig?.rodapePdf ?? "Este documento mostra os resultados de uma simulação e não tem valor legal. Os dados contidos nesta simulação serão utilizados de acordo com a nossa política de privacidade.",
  };
  const PRIMARY: [number, number, number] = [2, 34, 74]; // azul escuro
  const LIGHT_TEXT: [number, number, number] = [100, 100, 100];
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const M = 36; // margin

  // ——— dados base
  const vImovel = Number(paramsHomeEquity?.valorImovel ?? 0);
  const vCredito = Number(paramsHomeEquity?.valorCredito ?? 0);
  const prazo = Number(paramsHomeEquity?.prazo ?? 0);
  const taxa = Number(paramsHomeEquity?.taxa ?? 0);
  const carencia = Number(paramsHomeEquity?.carencia ?? 0);
  const amort = paramsHomeEquity?.tabelaAmortizacao ?? "PRICE";
  const taxaAdmValor = 25; // ajuste se quiser parametrizar

  // parcela "inicial" = 1ª parcela após carência (se existir)
  const parcelaInicial =
    parcelasHomeEquity?.[
      Math.min(carencia, Math.max(parcelasHomeEquity.length - 1, 0))
    ]?.valorParcela ??
    parcelasHomeEquity?.[0]?.valorParcela ??
    0;

  const parcelaFinal =
    parcelasHomeEquity?.[parcelasHomeEquity.length - 1]?.valorParcela ?? 0;

  // "Valor total devido*" de destaque no resumo: usamos o saldo do 1º mês pós-carência (ou do 1º mês)
  const valorTotalDevidoResumo =
    parcelasHomeEquity?.[
      Math.min(carencia, Math.max(parcelasHomeEquity.length - 1, 0))
    ]?.saldoDevedorHome ??
    parcelasHomeEquity?.[0]?.saldoDevedorHome ??
    0;

  // renda mínima (regra simples/visível): 3x parcela inicial — ajuste se necessário
  const rendaMinima = parcelaInicial * 3;

  // CET (ilustrativo): pequena sobretaxa sobre a taxa efetiva (ex.: +0,06 p.p. a.m.)
  const cetMensal = Math.max(0, taxa + 0.06);

  // ——— header
  let y = M;

  // logo
  if (logoUrl) {
    try {
      // largura ~110px, altura proporcional (~80px)
      doc.addImage(logoUrl, "PNG", M, y, 110, 40, undefined, "FAST");
    } catch {}
  }

  // parceiro / data no topo direito
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10).setTextColor(...LIGHT_TEXT);
  doc.text(`Parceiro ${marcaEmpresa}`, pageWidth - M, y + 10, {
    align: "right",
  });
  doc.text("Data da simulação", pageWidth - M, y + 28, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12).setTextColor(0, 0, 0);
  doc.text(new Date().toLocaleDateString("pt-BR"), pageWidth - M, y + 44, {
    align: "right",
  });

  // nome do atendente / usuário
  if (nomeUsuarioLogado) {
    doc.setFontSize(11).setTextColor(0, 0, 0).setFont("helvetica", "bold");
    doc.text(nomeUsuarioLogado, M + 140, y + 22);
    doc
      .setFont("helvetica", "normal")
      .setFontSize(9)
      .setTextColor(...LIGHT_TEXT);
    doc.text("Simulação PF", M + 140, y + 10);
  }

  y += 64;

  // Título da simulação (grande)
  doc.setFont("helvetica", "bold").setTextColor(...PRIMARY);
  doc.setFontSize(14);
  doc.text(
    "Informações da sua simulação de crédito com imóvel em garantia no valor de",
    M,
    y
  );
  y += 10;
  doc.setFontSize(20).setTextColor(0, 0, 0);
  doc.text(formatCurrency(vImovel), M, y);
  y += 20;

  // ——— blocos-resumo (2 colunas, depois +2 colunas)
  // primeiro par (esq/dir)
  const colW = (pageWidth - M * 2 - 12) / 2;
  const startY1 = y;

  autoTable(doc, {
    startY: startY1,
    margin: { left: M, right: M },
    tableWidth: colW,
    head: [["Campo", "Valor"]],
    body: [
      ["Valor do empréstimo", formatCurrency(vCredito)],
      ["Valor total devido*", formatCurrency(valorTotalDevidoResumo)],
      ["Quantidade de prestações", `${prazo} meses`],
    ],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: PRIMARY as any, textColor: 255 },
    theme: "grid",
  });

  autoTable(doc, {
    startY: startY1,
    margin: { left: M + colW + 12, right: M },
    tableWidth: colW,
    head: [["Campo", "Valor"]],
    body: [
      ["Valor do imóvel", formatCurrency(vImovel)],
      ["Renda mínima necessária", formatCurrency(rendaMinima)],
      ["Carência", carencia ? `${carencia} meses` : "Sem carência"],
    ],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: PRIMARY as any, textColor: 255 },
    theme: "grid",
  });

  const afterTopTablesY = (doc as any).lastAutoTable.finalY + 10;

  // segundo par (esq/dir)
  autoTable(doc, {
    startY: afterTopTablesY,
    margin: { left: M, right: M },
    tableWidth: colW,
    head: [["Campo", "Valor"]],
    body: [
      ["Sistema de amortização", amort],
      ["Taxa efetiva de juros", `${pct(taxa)} a.m + IPCA`],
      ["Custo efetivo total (CET)", `${pct(cetMensal)} a.m`],
    ],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: PRIMARY as any, textColor: 255 },
    theme: "grid",
  });

  autoTable(doc, {
    startY: afterTopTablesY,
    margin: { left: M + colW + 12, right: M },
    tableWidth: colW,
    head: [["Campo", "Valor"]],
    body: [
      ["Parcela inicial", formatCurrency(parcelaInicial)],
      ["Parcela final", formatCurrency(parcelaFinal)],
      ["Indexador", "IPCA"],
    ],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: PRIMARY as any, textColor: 255 },
    theme: "grid",
  });

  // subtítulo tabela
  const startTableY = (doc as any).lastAutoTable.finalY + 22;
  doc
    .setFont("helvetica", "bold")
    .setFontSize(12)
    .setTextColor(...PRIMARY);
  doc.text("Demonstrativo de pagamento mês a mês", M, startTableY);

  // ——— tabela de parcelas
  autoTable(doc, {
    startY: startTableY + 8,
    margin: { left: M, right: M, bottom: 64 },
    head: [
      [
        "Mês",
        "Amortização",
        "Encargos",
        "MIP",
        "DFI",
        "Taxa de admin.",
        "Valor da parcela",
        "Valor total devido",
      ],
    ],
    body: (parcelasHomeEquity || []).map((p, idx) => [
      (p.parcela ?? idx + 1).toString(),
      formatCurrency(p.amortizacao),
      formatCurrency(p.juros),
      formatCurrency(p.seguroMIP),
      formatCurrency(p.seguroDFI),
      formatCurrency(taxaAdmValor),
      formatCurrency(p.valorParcela),
      formatCurrency(p.saldoDevedorHome),
    ]),
    styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
    headStyles: { fillColor: PRIMARY as any, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    theme: "grid",

    // rodapé por página
    didDrawPage: () => {
      const footerY = pageHeight - 48;
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(60);
      const split = doc.splitTextToSize(footerData.rodape, pageWidth - M * 2);
      doc.text(split, M, footerY - 18);
      doc.setFillColor(...PRIMARY);
      doc.rect(M, footerY, pageWidth - M * 2, 18, "F");
      doc.setFontSize(9).setTextColor(255);
      doc.text(footerData.site, M + 8, footerY + 12);
      doc.text(footerData.email, pageWidth - M - 8, footerY + 12, { align: "right" });

      // paginação
      const pageNumber = doc.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8).setTextColor(120);
      doc.text(
        `Página ${currentPage} de ${pageNumber}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    },
  });

  // ——— retorno em base64 (sem forçar download aqui)
  return doc.output("datauristring").split(",")[1];
}
export default gerarPDFSimulacao;
