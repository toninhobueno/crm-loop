import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = { blue: [2, 34, 74] as [number, number, number] };
const GREY = { text: [90, 102, 120] as [number, number, number] };
const margin = 12;

/* ---------------------- fontes (Montserrat) ---------------------- */
async function loadFontAsBase64(url: string) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function registerFonts(doc: jsPDF) {
  const regular = await loadFontAsBase64("/fonts/Montserrat-Regular.ttf");
  const bold = await loadFontAsBase64("/fonts/Montserrat-Bold.ttf");
  doc.addFileToVFS("Montserrat-Regular.ttf", regular);
  doc.addFont("Montserrat-Regular.ttf", "montserrat", "normal");
  doc.addFileToVFS("Montserrat-Bold.ttf", bold);
  doc.addFont("Montserrat-Bold.ttf", "montserrat", "bold");
}

/* ------------------------- helpers visuais ------------------------ */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawLogoScaled(
  doc: jsPDF,
  img: HTMLImageElement,
  x: number,
  y: number,
  maxW: number,
  maxH: number
) {
  const { width, height } = img;
  if (!width || !height) return;
  const ratio = Math.min(maxW / width, maxH / height);
  doc.addImage(img, "PNG", x, y, width * ratio, height * ratio);
}

function title(doc: jsPDF, txt: string, x: number, y: number) {
  doc
    .setTextColor(...BRAND.blue)
    .setFont("montserrat", "bold")
    .setFontSize(13);
  doc.text(txt, x, y);
}

function label(doc: jsPDF, txt: string, x: number, y: number) {
  doc
    .setTextColor(...GREY.text)
    .setFont("montserrat", "normal")
    .setFontSize(8);
  doc.text(txt, x, y);
}

function value(doc: jsPDF, txt: string, x: number, y: number) {
  doc.setTextColor(0, 0, 0).setFont("montserrat", "bold").setFontSize(11);
  doc.text(txt, x, y);
}

function kpiCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  labelTxt: string,
  valueTxt: string
) {
  doc.setDrawColor(220, 220, 220).setFillColor(255, 255, 255);
  (doc as any).roundedRect(x, y, w, h, 3, 3, "FD");
  const paddingX = 6;
  label(doc, labelTxt, x + paddingX, y + 7.5);
  value(doc, valueTxt, x + paddingX, y + 15.5);
}

function fmtMoney(n?: number) {
  if (typeof n !== "number" || isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ---------------------- gerar PDF Home Equity --------------------- */
const DEFAULT_FOOTER = "www.crmloop.com.br | contato@crmloop.com.br";

export async function gerarPDFHomeEquity({
  paramsHomeEquity,
  parcelasHomeEquity,
  marcaEmpresa = "Loop",
  logoUrl,
  empresaFooter,
  nomeUsuarioLogado = "",
}: {
  paramsHomeEquity: any;
  parcelasHomeEquity: {
    parcela: number;
    amortizacao: number;
    juros: number;
    seguroMIP: number;
    seguroDFI: number;
    valorParcela: number;
    saldoDevedorHome: number;
  }[];
  marcaEmpresa?: string;
  logoUrl?: string;
  empresaFooter?: string;
  nomeUsuarioLogado?: string;
}) {
  const doc = new jsPDF();
  await registerFonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  let y = margin;

  // Header
  if (logoUrl) {
    try {
      const img = await loadImage(logoUrl);
      drawLogoScaled(doc, img, margin, y - 2, 30, 18);
    } catch {}
  }
  doc
    .setFont("montserrat", "normal")
    .setFontSize(9)
    .setTextColor(...GREY.text);
  doc.text(`Parceiro ${marcaEmpresa}`, margin + 38, y + 2);
  doc.text("Data da simulação", pageW - margin, y + 2, { align: "right" });
  doc.setFont("montserrat", "bold").setFontSize(12).setTextColor(0, 0, 0);
  doc.text(new Date().toLocaleDateString("pt-BR"), pageW - margin, y + 9, {
    align: "right",
  });
  doc.text(nomeUsuarioLogado || "Simulação PF", margin + 38, y + 12);

  y += 24;
  doc.setDrawColor(...BRAND.blue);
  doc.line(margin, y, pageW - margin, y);
  y += 9;

  // Título
  doc.setFont("montserrat", "bold").setFontSize(14).setTextColor(0, 0, 0);
  const titulo =
    "Informações da sua simulação de crédito com imóvel em garantia no valor de " +
    fmtMoney(Number(paramsHomeEquity?.valorImovel || 0));
  const titleLines = doc.splitTextToSize(titulo, pageW - margin * 2);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6.2 + 6;

  // KPIs — 3 col x N linhas
  const colGapX = 8;
  const colW = (pageW - margin * 2 - colGapX * 2) / 3;
  const rowH = 22;
  const rowGapY = 6;
  const cardsTopY = y;

  const prazo = Number(paramsHomeEquity?.prazo || 0);
  const taxa = Number(paramsHomeEquity?.taxa || 0);
  const amort = String(paramsHomeEquity?.tabelaAmortizacao || "PRICE");
  const carencia = Number(paramsHomeEquity?.carencia || 0);
  const valorEmp = Number(paramsHomeEquity?.valorCredito || 0);

  // ➜ parcela inicial DEPOIS da carência
  let parcelaInicial = 0;
  if (Array.isArray(parcelasHomeEquity) && parcelasHomeEquity.length > 0) {
    const mesAposCarencia = (carencia || 0) + 1;
    const rowCarencia =
      parcelasHomeEquity.find((p) => Number(p.parcela) === mesAposCarencia) ??
      parcelasHomeEquity[Math.min(carencia, parcelasHomeEquity.length - 1)];
    parcelaInicial = Number(rowCarencia?.valorParcela || 0);
  }

  const parcelaFinal =
    parcelasHomeEquity?.[parcelasHomeEquity.length - 1]?.valorParcela ?? 0;
  const totalDevido = parcelasHomeEquity?.[0]?.saldoDevedorHome ?? valorEmp;

  const cards: [string, string][] = [
    ["Valor do empréstimo", fmtMoney(valorEmp)],
    ["Valor total devido*", fmtMoney(totalDevido)],
    ["Quantidade de prestações", `${prazo} meses`],
    ["Valor do imóvel", fmtMoney(Number(paramsHomeEquity?.valorImovel || 0))],
    ["Carência", carencia ? `${carencia} meses` : "Sem carência"],
    ["Sistema de amortização", amort.toUpperCase()],
    ["Taxa efetiva de juros", `${taxa.toFixed(2)}% a.m + IPCA`],
    ["CET", `${(taxa + 0.06).toFixed(2)}% a.m`],
    ["Parcela inicial", fmtMoney(parcelaInicial)],
    ["Parcela final", fmtMoney(parcelaFinal)],
  ];

  const rows = Math.ceil(cards.length / 3);
  for (let i = 0; i < cards.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + (colW + colGapX) * col;
    const yCard = cardsTopY + row * (rowH + rowGapY);
    kpiCard(doc, x, yCard, colW, rowH, cards[i][0], cards[i][1]);
  }
  y = cardsTopY + rows * rowH + (rows - 1) * rowGapY + 8;

  // Avisos – CAIXA (aviso 2) primeiro, depois aviso 1
  const reservedBottom = pageH - 22;
  let avisoFont = 9;

  const measure = (fsize: number) => {
    const step = fsize * 0.5;
    doc.setFont("montserrat", "normal").setFontSize(fsize);

    const a2Lines = doc.splitTextToSize(
      "ℹ️ Esses valores são simulados e passíveis de alteração, por isso não tem valor legal.",
      pageW - margin * 2 - 12
    );
    const a2BoxH = a2Lines.length * step + 10;

    const a1Lines = doc.splitTextToSize(
      "ℹ️ O valor total devido considera os custos aproximados com taxa efetiva de juros, avaliação do imóvel, seguro que garante cobertura em caso de morte ou invalidez permanente (MIP), seguro que garante o imóvel em caso de danos físicos (DFI) e custos cartoriais.",
      pageW - margin * 2
    );
    const a1H = a1Lines.length * step;

    return { a1Lines, a1H, a2Lines, a2BoxH, step };
  };

  let { a1Lines, a1H, a2Lines, a2BoxH } = measure(avisoFont);
  if (y + a2BoxH + 8 + a1H > reservedBottom) {
    avisoFont = 8;
    ({ a1Lines, a1H, a2Lines, a2BoxH } = measure(avisoFont));
  }

  // Aviso 2 (caixa) primeiro
  doc.setFillColor(245, 246, 248);
  (doc as any).roundedRect(margin, y, pageW - margin * 2, a2BoxH, 3, 3, "F");
  doc
    .setTextColor(50, 60, 80)
    .setFont("montserrat", "normal")
    .setFontSize(avisoFont);
  doc.text(a2Lines, margin + 6, y + 6);
  y += a2BoxH + 8;

  // Aviso 1 em texto simples embaixo
  doc.text(a1Lines, margin, y);
  y += a1H;

  // Rodapé primeira página
  doc.setFillColor(...BRAND.blue);
  doc.rect(margin, pageH - 18, pageW - margin * 2, 10, "F");
  doc.setFont("montserrat", "bold").setFontSize(8).setTextColor(255);
  doc.text(
    empresaFooter ?? DEFAULT_FOOTER,
    pageW / 2,
    pageH - 11,
    { align: "center" }
  );

  // Segunda página – demonstrativo
  doc.addPage();
  let y2 = margin;
  title(doc, "Demonstrativo de pagamento mês a mês", margin, y2);

  autoTable(doc, {
    startY: y2 + 6,
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
    body: (parcelasHomeEquity || []).map((p) => [
      p.parcela,
      fmtMoney(p.amortizacao),
      fmtMoney(p.juros),
      fmtMoney(p.seguroMIP),
      fmtMoney(p.seguroDFI),
      fmtMoney(25),
      fmtMoney(p.valorParcela),
      fmtMoney(p.saldoDevedorHome),
    ]),
    styles: { font: "montserrat", fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND.blue as any, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { left: margin, right: margin, bottom: 36 },
    didDrawPage: () => {
      const pageW2 = doc.internal.pageSize.getWidth();
      const pageH2 = doc.internal.pageSize.getHeight();
      doc.setFillColor(...BRAND.blue);
      doc.rect(margin, pageH2 - 18, pageW2 - margin * 2, 10, "F");
      doc.setFont("montserrat", "bold").setFontSize(8).setTextColor(255);
      doc.text(
        empresaFooter ?? DEFAULT_FOOTER,
        pageW2 / 2,
        pageH2 - 11,
        { align: "center" }
      );
    },
  });

  return doc.output("datauristring").split(",")[1];
}
