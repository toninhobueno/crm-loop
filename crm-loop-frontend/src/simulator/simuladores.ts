// Simulador 1: Consórcio - Lance Fixo
export function simuladorConsorcioLanceFixo(params: {
  creditoUnitario: number;
  qtdParcelas: number;
  taxaParcela: number;
  acrescentarSeguro: boolean;
  juncaoDeCotas: number;
  percentualParcelaReduzida: number; // será usado como opção de parcela: 100, 75, 50, 25
  parcelaContemplacao?: number; // valor opcional
  mesContemplacao?: number; // novo campo: mês em que foi contemplado
  lancePagoEmDinheiro?: number;
  lanceEmbutidoNaCarta?: number;
}) {
  const {
    creditoUnitario,
    qtdParcelas,
    taxaParcela,
    acrescentarSeguro,
    juncaoDeCotas,
    percentualParcelaReduzida,
    parcelaContemplacao,
    mesContemplacao = 0,
    lancePagoEmDinheiro = 0,
    lanceEmbutidoNaCarta = 0,
  } = params;

  // Crédito total contratado
  const creditoContratado = creditoUnitario * juncaoDeCotas;
  // Taxa administrativa total
  const taxaTotal = creditoContratado * (taxaParcela / 100);
  // Valor total a ser pago (crédito + taxa administrativa)
  const valorTotal = creditoContratado + taxaTotal;

  // Opção de parcela: 100, 75, 50, 25 (em %)
  const opcaoParcela = percentualParcelaReduzida / 100;

  // --- Parcela Antes da Contemplação ---
  let parcelaAntes: number;
  const percentual = percentualParcelaReduzida / 100;
  parcelaAntes = ((creditoContratado + taxaTotal) * percentual) / qtdParcelas;
  // Acrescentar seguro se necessário (0,38% sobre a parcela)
  if (acrescentarSeguro) {
    parcelaAntes += parcelaAntes * 0.0038;
  }

  // --- Parcela Após a Contemplação ---
  let parcelaApos: number;
  if (parcelaContemplacao && parcelaContemplacao > 0) {
    parcelaApos = parcelaContemplacao;
  } else if (opcaoParcela === 1) {
    parcelaApos = parcelaAntes;
  } else {
    // Calcular conforme as fórmulas fornecidas
    // 1. Valor Pago = Parcela Antes * Meses pagos até a contemplação
    const valorPago = parcelaAntes * mesContemplacao;
    // 2. Saldo Devedor = Valor Total - Valor Pago
    const saldoDevedor = valorTotal - valorPago;
    // 3. Nova parcela = Saldo Devedor / (Prazo do Consórcio - Meses pagos até a contemplação)
    const parcelasRestantes = qtdParcelas - mesContemplacao;
    parcelaApos = saldoDevedor / parcelasRestantes;
    if (acrescentarSeguro) {
      parcelaApos += parcelaApos * 0.0038;
    }
  }

  // Valor do seguro (apenas para referência, não usado diretamente)
  let valorSeguro = 0;
  if (acrescentarSeguro) {
    valorSeguro = parcelaAntes * 0.0038;
  }

  return {
    creditoContratado: Number(creditoContratado.toFixed(2)),
    valorTotal: Number(valorTotal.toFixed(2)),
    parcelaAntes: Number(parcelaAntes.toFixed(2)),
    parcelaApos: Number(parcelaApos.toFixed(2)),
    valorSeguro: Number(valorSeguro.toFixed(2)),
  };
}

// Simulador 2: Consórcio - Sorteio
export function simuladorConsorcioSorteio(params: {
  credito: number;
  qtdParcelas: number;
  taxaParcela: number;
  acrescentarSeguro: boolean;
  juncaoDeCotas: number;
}) {
  const {
    credito,
    qtdParcelas,
    taxaParcela,
    acrescentarSeguro,
    juncaoDeCotas,
  } = params;
  const creditoTotal = credito * juncaoDeCotas;
  const parcelaBase = creditoTotal / qtdParcelas;
  const parcelaComTaxa = parcelaBase + parcelaBase * (taxaParcela / 100);
  const valorSeguro = creditoTotal * 0.0004645;
  const parcelaFinal = parcelaComTaxa + (acrescentarSeguro ? valorSeguro : 0);
  return {
    creditoContratado: Number(creditoTotal.toFixed(2)),
    creditoLiberado: Number(creditoTotal.toFixed(2)),
    valorLance: 0,
    parcelaBase: Number(parcelaBase.toFixed(2)),
    parcelaFinal: Number(parcelaFinal.toFixed(2)),
  };
}

// Simulador 3: Consórcio - Lance Variável
export function simuladorConsorcioLanceVariavel(params: {
  credito: number;
  qtdParcelas: number;
  taxaParcela: number;
  parcelasPagas: number;
  parcelasEmbutidas: number;
  acrescentarSeguro: boolean;
  usarINCC: boolean;
}) {
  const {
    credito,
    qtdParcelas,
    taxaParcela,
    parcelasPagas,
    parcelasEmbutidas,
    acrescentarSeguro,
    usarINCC,
  } = params;
  const parcelaBase = credito / qtdParcelas;
  const parcelaComTaxa = parcelaBase + parcelaBase * (taxaParcela / 100);
  const valorSeguro = acrescentarSeguro ? credito * 0.0004645 : 0;
  const fatorINCC = usarINCC ? 1.0503 : 1;
  const valorLance = (parcelasPagas + parcelasEmbutidas) * parcelaComTaxa;
  const creditoLiberado = credito - parcelasEmbutidas * parcelaBase;
  const parcelaAntes = parcelaComTaxa + valorSeguro;
  const parcelaDepois = parcelaAntes * 0.33 * fatorINCC;
  return {
    creditoContratado: Number(credito.toFixed(2)),
    creditoLiberado: Number(creditoLiberado.toFixed(2)),
    valorLance: Number(valorLance.toFixed(2)),
    parcelaAntes: Number(parcelaAntes.toFixed(2)),
    parcelaDepois: Number(parcelaDepois.toFixed(2)),
  };
}

// Função única para cálculo de consórcio (Lance Fixo, Sorteio, Lance Variável)
export function simuladorConsorcioUnificado(params: {
  creditoUnitario: number;
  qtdParcelas: number;
  taxaParcela: number;
  acrescentarSeguro: boolean;
  juncaoDeCotas: number;
  percentualParcelaReduzida: number; // opção de parcela: 100, 75, 50, 25
  parcelaContemplacao?: number; // valor opcional
  mesContemplacao?: number; // mês em que foi contemplado
}) {
  const {
    creditoUnitario,
    qtdParcelas,
    taxaParcela,
    acrescentarSeguro,
    juncaoDeCotas,
    percentualParcelaReduzida,
    parcelaContemplacao,
    mesContemplacao = 0,
  } = params;

  // Crédito total contratado
  const creditoContratado = creditoUnitario * juncaoDeCotas;
  // Taxa administrativa total
  const taxaTotal = creditoContratado * (taxaParcela / 100);
  // Valor total a ser pago (crédito + taxa administrativa)
  const valorTotal = creditoContratado + taxaTotal;

  // Opção de parcela: 100, 75, 50, 25 (em %)
  const opcaoParcela = percentualParcelaReduzida / 100;

  // --- Parcela Antes da Contemplação ---
  let parcelaAntes: number;
  const percentual = percentualParcelaReduzida / 100;
  parcelaAntes = ((creditoContratado + taxaTotal) * percentual) / qtdParcelas;
  // Acrescentar seguro se necessário (0,38% sobre a parcela)
  if (acrescentarSeguro) {
    parcelaAntes += parcelaAntes * 0.0038;
  }

  // --- Parcela Após a Contemplação ---
  let parcelaApos: number;
  if (parcelaContemplacao && parcelaContemplacao > 0) {
    parcelaApos = parcelaContemplacao;
  } else if (opcaoParcela === 1) {
    parcelaApos = parcelaAntes;
  } else {
    // Calcular conforme as fórmulas fornecidas
    // 1. Valor Pago = Parcela Antes * Meses pagos até a contemplação
    const valorPago = parcelaAntes * mesContemplacao;
    // 2. Saldo Devedor = Valor Total - Valor Pago
    const saldoDevedor = valorTotal - valorPago;
    // 3. Nova parcela = Saldo Devedor / (Prazo do Consórcio - Meses pagos até a contemplação)
    const parcelasRestantes = qtdParcelas - mesContemplacao;
    parcelaApos = saldoDevedor / parcelasRestantes;
    if (acrescentarSeguro) {
      parcelaApos += parcelaApos * 0.0038;
    }
  }

  // Valor do seguro (apenas para referência, não usado diretamente)
  let valorSeguro = 0;
  if (acrescentarSeguro) {
    valorSeguro = parcelaAntes * 0.0038;
  }

  // Calcular saldo devedor para Lance Fixo
  const valorPago = parcelaAntes * mesContemplacao;
  const saldoDevedor = valorTotal - valorPago;

  return {
    creditoContratado: Number(creditoContratado.toFixed(2)),
    valorTotal: Number(valorTotal.toFixed(2)),
    parcelaAntes: Number(parcelaAntes.toFixed(2)),
    parcelaApos: Number(parcelaApos.toFixed(2)),
    valorSeguro: Number(valorSeguro.toFixed(2)),
    saldoDevedor: Number(saldoDevedor.toFixed(2)),
  };
}

// Função para cálculo de parcelas reduzidas até a contemplação
export function calcularParcelasConsorcioReduzido(params: {
  creditoUnitario: number;
  qtdParcelas: number;
  taxaParcela: number;
  opcaoParcela: number; // 25, 50, 75, 100
  parcelaContemplacao: number | null; // agora pode ser nulo
}) {
  const {
    creditoUnitario,
    qtdParcelas,
    taxaParcela,
    opcaoParcela,
    parcelaContemplacao,
  } = params;

  // 1. Calcular taxa e valor total
  const taxaTotal = creditoUnitario * (taxaParcela / 100);
  const valorTotal = creditoUnitario + taxaTotal;

  // 2. Calcular crédito proporcional antes da contemplação
  const percentual = opcaoParcela / 100;
  const creditoAntes = creditoUnitario * percentual;

  // 3. Parcela antes da contemplação (taxa sempre integral)
  const valorAntes = creditoAntes + taxaTotal;
  const parcelaAntes = valorAntes / qtdParcelas;

  // 4. Se não houver mês de contemplação, campos dependentes ficam nulos
  let parcelasPagas = null;
  let valorPago = null;
  let saldoDevedor = null;
  let parcelasRestantes = null;
  let parcelaDepois = null;
  if (parcelaContemplacao && parcelaContemplacao > 0) {
    parcelasPagas = parcelaContemplacao - 1;
    valorPago = parcelaAntes * parcelasPagas;
    saldoDevedor = valorTotal - valorPago;
    parcelasRestantes = qtdParcelas - parcelasPagas;
    parcelaDepois = saldoDevedor / parcelasRestantes;
  }

  return {
    taxaTotal: Number(taxaTotal.toFixed(2)),
    valorTotal: Number(valorTotal.toFixed(2)),
    creditoAntes: Number(creditoAntes.toFixed(2)),
    parcelaAntes: Number(parcelaAntes.toFixed(2)),
    valorPago: valorPago !== null ? Number(valorPago.toFixed(2)) : null,
    saldoDevedor:
      saldoDevedor !== null ? Number(saldoDevedor.toFixed(2)) : null,
    parcelaDepois:
      parcelaDepois !== null ? Number(parcelaDepois.toFixed(2)) : null,
    parcelasPagas,
    parcelasRestantes,
    qtdParcelas, // novo campo para uso no frontend
  };
}

// Função para cálculo de simulação de lance
export function calcularSimulacaoLance(params: {
  creditoUnitario: number;
  taxaParcela: number;
  qtdParcelas: number;
  lancePagoParcela: number;
  lanceEmbutidoParcela: number;
}) {
  const {
    creditoUnitario,
    taxaParcela,
    qtdParcelas,
    lancePagoParcela,
    lanceEmbutidoParcela,
  } = params;

  // 1. Calcular valor total com taxa
  const totalComTaxa = creditoUnitario * (1 + taxaParcela / 100);

  // 2. Calcular valor da parcela padrão
  const valorParcela = totalComTaxa / qtdParcelas;

  // 3. Calcular valor total do lance
  const totalParcelasLance = lancePagoParcela + lanceEmbutidoParcela;
  if (totalParcelasLance > qtdParcelas) {
    return {
      erro: "O total de parcelas do lance não pode ultrapassar o total de parcelas do consórcio.",
    };
  }
  const valorTotalLance = totalParcelasLance * valorParcela;

  return {
    totalComTaxa: Number(totalComTaxa.toFixed(2)),
    valorParcela: Number(valorParcela.toFixed(2)),
    totalParcelasLance,
    valorTotalLance: Number(valorTotalLance.toFixed(2)),
    erro: undefined,
  };
}

// Simulador 4: Home Equity
export function simuladorHomeEquity(params: {
  valorImovel: number;
  valorCredito: number;
  prazoMeses: number;
  tabelaAmortizacao: "PRICE" | "SAC";
  taxa: number;
  tipoDaTaxa: "a.a" | "a.m";
}) {
  const {
    valorImovel,
    valorCredito,
    prazoMeses,
    tabelaAmortizacao,
    taxa,
    tipoDaTaxa,
  } = params;
  const despesas = valorCredito * 0.03;
  const iof = valorCredito * 0.011;
  const totalFinanciado = valorCredito + despesas + iof;
  const taxaMensal =
    tipoDaTaxa === "a.a" ? Math.pow(1 + taxa / 100, 1 / 12) - 1 : taxa / 100;
  const taxaAnual =
    tipoDaTaxa === "a.m" ? Math.pow(1 + taxa / 100, 12) - 1 : taxa / 100;
  const mip = 0.000036;
  const dfi = 0.000034;
  let parcelas: any[] = [];
  let saldoDevedor = totalFinanciado;
  if (tabelaAmortizacao === "PRICE") {
    const coef =
      (taxaMensal * Math.pow(1 + taxaMensal, prazoMeses)) /
      (Math.pow(1 + taxaMensal, prazoMeses) - 1);
    const prestacao = totalFinanciado * coef;
    for (let mes = 1; mes <= prazoMeses; mes++) {
      const juros = saldoDevedor * taxaMensal;
      const amortizacao = prestacao - juros;
      const mipVal = saldoDevedor * mip;
      const dfiVal = saldoDevedor * dfi;
      const totalParcela = prestacao + mipVal + dfiVal;
      parcelas.push({
        mes,
        saldoDevedor: Number(saldoDevedor.toFixed(2)),
        amortizacao: Number(amortizacao.toFixed(2)),
        juros: Number(juros.toFixed(2)),
        mip: Number(mipVal.toFixed(2)),
        dfi: Number(dfiVal.toFixed(2)),
        totalParcela: Number(totalParcela.toFixed(2)),
      });
      saldoDevedor -= amortizacao;
    }
  } else {
    // SAC
    const amortizacao = totalFinanciado / prazoMeses;
    for (let mes = 1; mes <= prazoMeses; mes++) {
      const juros = saldoDevedor * taxaMensal;
      const mipVal = saldoDevedor * mip;
      const dfiVal = saldoDevedor * dfi;
      const totalParcela = amortizacao + juros + mipVal + dfiVal;
      parcelas.push({
        mes,
        saldoDevedor: Number(saldoDevedor.toFixed(2)),
        amortizacao: Number(amortizacao.toFixed(2)),
        juros: Number(juros.toFixed(2)),
        mip: Number(mipVal.toFixed(2)),
        dfi: Number(dfiVal.toFixed(2)),
        totalParcela: Number(totalParcela.toFixed(2)),
      });
      saldoDevedor -= amortizacao;
    }
  }
  return {
    totalFinanciado: Number(totalFinanciado.toFixed(2)),
    taxaMensal: Number((taxaMensal * 100).toFixed(4)),
    taxaAnual: Number((taxaAnual * 100).toFixed(4)),
    parcelas,
  };
}

// Função para calcular parcela fixa usando fórmula Price
export function calcularParcelaPrice(
  saldoDevedor: number,
  taxaMensal: number,
  numeroParcelas: number
): number {
  if (taxaMensal === 0) {
    return saldoDevedor / numeroParcelas;
  }

  const coef =
    (taxaMensal * Math.pow(1 + taxaMensal, numeroParcelas)) /
    (Math.pow(1 + taxaMensal, numeroParcelas) - 1);

  return saldoDevedor * coef;
}

// Função para aplicar carência (sem juros)
export function aplicarCarencia(
  saldoInicial: number,
  taxaMensal: number,
  mesesCarencia: number
): { saldoFinal: number; parcelasCarencia: any[] } {
  const parcelasCarencia: any[] = [];
  let saldoAtual = saldoInicial;

  for (let mes = 1; mes <= mesesCarencia; mes++) {
    // Durante a carência, o saldo permanece o mesmo (sem juros)
    parcelasCarencia.push({
      parcela: mes,
      saldoDevedorHome: Number(saldoAtual.toFixed(2)),
      amortizacao: 0,
      juros: 0,
      valorParcela: 0,
      seguroMIP: 0,
      seguroDFI: 0,
      correcao: 0,
      periodo: "Carência",
    });
  }

  return {
    saldoFinal: Number(saldoAtual.toFixed(2)),
    parcelasCarencia,
  };
}

// Função para calcular seguros MIP e DFI
export function calcularSeguros(saldoDevedor: number): {
  seguroMIP: number;
  seguroDFI: number;
} {
  const taxaSeguroMIP = 0.00022; // 0,022% ao mês
  const taxaSeguroDFI = 0.00011; // 0,011% ao mês

  return {
    seguroMIP: Number((saldoDevedor * taxaSeguroMIP).toFixed(2)),
    seguroDFI: Number((saldoDevedor * taxaSeguroDFI).toFixed(2)),
  };
}

// Função para gerar tabela de amortização completa
export function gerarTabelaAmortizacao(params: {
  valorCredito: number;
  taxaMensal: number;
  prazoTotal: number;
  carencia: number;
  tabelaAmortizacao: "PRICE" | "SAC";
}): any[] {
  const { valorCredito, taxaMensal, prazoTotal, carencia, tabelaAmortizacao } =
    params;

  const parcelas: any[] = [];
  let saldoDevedor = valorCredito;

  // Aplicar carência se houver
  if (carencia > 0) {
    const resultadoCarencia = aplicarCarencia(
      valorCredito,
      taxaMensal,
      carencia
    );
    saldoDevedor = resultadoCarencia.saldoFinal;
    parcelas.push(...resultadoCarencia.parcelasCarencia);
  }

  const prazoAmortizacao = prazoTotal - carencia;
  let valorParcelaBase = 0;

  if (tabelaAmortizacao === "PRICE") {
    valorParcelaBase = calcularParcelaPrice(
      saldoDevedor,
      taxaMensal,
      prazoAmortizacao
    );
  } else {
    // SAC - amortização fixa
    valorParcelaBase = saldoDevedor / prazoAmortizacao;
  }

  // Gerar parcelas de amortização
  for (let mes = carencia + 1; mes <= prazoTotal; mes++) {
    const juros = saldoDevedor * taxaMensal;
    let amortizacao: number;

    if (tabelaAmortizacao === "PRICE") {
      amortizacao = valorParcelaBase - juros;
      if (mes === prazoTotal) {
        amortizacao = saldoDevedor; // zera saldo na última
      }
    } else {
      // SAC
      amortizacao = valorParcelaBase;
      if (mes === prazoTotal) {
        amortizacao = saldoDevedor;
      }
    }

    const seguros = calcularSeguros(saldoDevedor);
    const taxaADM = 25; // fixa
    const valorParcelaFinal =
      amortizacao + juros + seguros.seguroMIP + seguros.seguroDFI + taxaADM;

    // Saldo após amortização (esse é o que o cliente espera ver)
    const saldoAposAmortizacao = Math.max(
      0,
      Number((saldoDevedor - amortizacao).toFixed(2))
    );

    parcelas.push({
      parcela: mes,
      saldoDevedorHome: saldoAposAmortizacao, // <-- AJUSTE AQUI
      amortizacao: Number(amortizacao.toFixed(2)),
      juros: Number(juros.toFixed(2)),
      valorParcela: Number(valorParcelaFinal.toFixed(2)),
      seguroMIP: seguros.seguroMIP,
      seguroDFI: seguros.seguroDFI,
      correcao: "+IPCA",
      periodo: "Amortização",
    });

    saldoDevedor = saldoAposAmortizacao;
  }

  return parcelas;
}

// Nova função para calcular parcelas de Home Equity conforme especificações
export function calcularParcelasHomeEquity(params: {
  valorImovel: number;
  valorCredito: number;
  prazo: number;
  tabelaAmortizacao: "PRICE" | "SAC";
  taxa: number;
  tipoTaxa: "Mensal" | "Anual";
  carencia?: number;
}) {
  const {
    valorImovel,
    valorCredito,
    prazo,
    tabelaAmortizacao,
    taxa,
    tipoTaxa,
    carencia = 0,
  } = params;

  // Validação dos campos
  if (!valorImovel || !valorCredito || !prazo || !taxa) {
    return { erro: "Todos os campos são obrigatórios" };
  }

  if (valorCredito > valorImovel) {
    return {
      erro: "O valor do crédito não pode ser maior que o valor do imóvel",
    };
  }

  if (valorCredito > valorImovel * 0.6) {
    return {
      erro: "O valor do crédito não pode ser superior a 60% do valor do imóvel",
    };
  }

  if (prazo <= 0 || taxa <= 0) {
    return { erro: "Prazo e taxa devem ser valores positivos" };
  }

  if (carencia < 0 || carencia > 6) {
    return { erro: "A carência deve ser entre 0 e 6 meses" };
  }

  // Taxa sempre será mensal
  const taxaMensal = taxa / 100;

  // Calcular custos adicionais
  const custoEmissao = valorCredito * 0.03; // 3% do valor do crédito
  const iof = valorCredito * 0.011; // 1,1% do valor do crédito
  const totalFinanciado = valorCredito + custoEmissao + iof;

  // Gerar tabela de amortização
  const parcelas = gerarTabelaAmortizacao({
    valorCredito: totalFinanciado,
    taxaMensal,
    prazoTotal: prazo,
    carencia,
    tabelaAmortizacao,
  });

  return {
    parcelas,
    resumo: {
      valorImovel: Number(valorImovel.toFixed(2)),
      valorCredito: Number(valorCredito.toFixed(2)),
      custoEmissao: Number(custoEmissao.toFixed(2)),
      iof: Number(iof.toFixed(2)),
      totalFinanciado: Number(totalFinanciado.toFixed(2)),
      prazo: prazo,
      carencia: carencia,
      taxaMensal: Number((taxaMensal * 100).toFixed(4)),
      tabelaAmortizacao: tabelaAmortizacao,
      prazoTotal: prazo,
    },
  };
}

// lib/simuladores.ts

export function calcularLanceCompleto(params: {
  tipo: "embutido" | "dinheiro" | "misto";
  creditoContratado: number; // Valor total contratado (Ex: 100_000)
  taxaAdministrativaPct: number; // Percentual da taxa administrativa (Ex: 24)
  valorParcelaOriginal: number; // Valor da parcela original antes de lance (Ex: 620)
  totalParcelas: number; // Total de parcelas (Ex: 200)
  parcelasEmbutidas?: number; // Nº de parcelas usadas no lance embutido
  parcelasDinheiro?: number; // Nº de parcelas usadas no lance em dinheiro
  parcelaContemplacao?: number; // Mês de contemplação
  valorEmbutidoNoCredito?: number;
  valorEmbutidoNoDinheiro?: number;
}) {
  const {
    tipo,
    creditoContratado,
    taxaAdministrativaPct,
    valorParcelaOriginal,
    totalParcelas,
    parcelasEmbutidas = 0,
    parcelasDinheiro = 0,
    parcelaContemplacao = 1, // Padrão é mês 1
    valorEmbutidoNoCredito,
    valorEmbutidoNoDinheiro,
  } = params;

  // 1. Taxa administrativa (sempre integral, independente da opção de parcela)
  const taxaAdministrativa = creditoContratado * (taxaAdministrativaPct / 100);

  // 2. Saldo devedor inicial (crédito + taxa administrativa total)
  const saldoDevedorInicial = creditoContratado + taxaAdministrativa;

  // 3. Inicializa variáveis
  let creditoLiberado = creditoContratado;
  let saldoDevedorFinal = saldoDevedorInicial;
  const valorLanceTotal =
    (valorEmbutidoNoCredito ?? 0) + (valorEmbutidoNoDinheiro ?? 0);

  // 4. Tipos de lance
  if (tipo === "embutido") {
    const lance = parcelasEmbutidas * valorParcelaOriginal;
    creditoLiberado -= lance; // Reduz o crédito liberado
    saldoDevedorFinal -= lance; // Reduz o saldo devedor
  } else if (tipo === "dinheiro") {
    const lance = parcelasDinheiro * valorParcelaOriginal;
    saldoDevedorFinal -= lance; // Reduz apenas o saldo devedor
  } else if (tipo === "misto") {
    const embutido = parcelasEmbutidas * valorParcelaOriginal;
    const dinheiro = parcelasDinheiro * valorParcelaOriginal;
    creditoLiberado -= embutido; // Reduz o crédito liberado pelo lance embutido
    saldoDevedorFinal -= embutido + dinheiro; // Reduz o saldo devedor pelo total do lance
  }

  // 5. Nova parcela (saldo devedor final / parcelas restantes)
  const parcelasRestantes = totalParcelas - parcelaContemplacao; // Total de parcelas menos a parcela de contemplação
  const novaParcela = saldoDevedorFinal / parcelasRestantes;

  return {
    creditoContratado: Number(creditoContratado.toFixed(2)),
    taxaAdministrativa: Number(taxaAdministrativa.toFixed(2)),
    saldoDevedorInicial: Number(saldoDevedorInicial.toFixed(2)),
    creditoLiberado: Number(creditoLiberado.toFixed(2)),
    saldoDevedorFinal: Number(saldoDevedorFinal.toFixed(2)),
    novaParcela: Number(novaParcela.toFixed(2)),
    valorLanceTotal: Number(valorLanceTotal.toFixed(2)),
    parcelasRestantes,
  };
}
