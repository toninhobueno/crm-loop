/**
 * Gera mes a mes para PDF / grid (origem CRM-BAIEYS dashboard/simulador).
 */
export function buildConsorcioMonthlyRows({
  tipoConsorcio,
  paramsLanceFixo = {},
  paramsSorteio = {},
  paramsLanceVar = {},
  resultSorteio,
  resultLanceFixo,
  paramsLance = {},
}) {
  const parcelaContemplacaoRaw = Number(paramsLanceFixo.parcelaContemplacao ?? 0);
  const qtdParcelas = Number(paramsLanceFixo.qtdParcelas ?? 0);
  const parcelaContemplacaoLocal =
    parcelaContemplacaoRaw > 0 ? parcelaContemplacaoRaw : qtdParcelas;

  const parcelaAntes = Number(resultSorteio?.parcelaAntes ?? 0);
  const parcelaDepois = Number(
    resultSorteio?.parcelaDepois ?? resultSorteio?.parcelaApos ?? 0
  );
  const creditoUnitario = Number(paramsLanceFixo.creditoUnitario ?? 0);

  const lancePagoParcela = Number(paramsLance.lancePagoParcela ?? 0);
  const lanceEmbutidoParcela = Number(paramsLance.lanceEmbutidoParcela ?? 0);
  const acrescentarINCC = paramsLanceFixo.acrescentarINCC ?? false;
  const acrescentarSeguro = paramsLanceFixo.acrescentarSeguro ?? false;
  const fatorSeguro = acrescentarSeguro ? 1.0034 : 1;

  const porcentagemVendaCota =
    tipoConsorcio === "lance-fixo"
      ? Number(paramsLanceFixo.vendaDaCota ?? 0) / 100
      : tipoConsorcio === "sorteio"
        ? Number(paramsSorteio.juncaoDeCotas ?? 0) / 100
        : tipoConsorcio === "lance-variavel"
          ? Number(paramsLanceVar.juncaoDeCotas ?? 0) / 100
          : 0;

  const dados = [];

  for (let mes = 1; mes <= qtdParcelas; mes++) {
    let valorParcela = parcelaAntes;
    let valorInvestidoMes = 0;
    let creditoContempladoMes = 0;
    let lucroBrutoMes = 0;
    let percLucroTotalMes = 0;
    let percLucroMesMes = 0;
    let lancePagoTotal = 0;
    let lanceEmbutidoTotal = 0;

    let fatorINCC = 1;
    if (acrescentarINCC && mes >= 13) {
      const anosDecorridos = Math.floor((mes - 1) / 12);
      fatorINCC = Math.pow(1.06, anosDecorridos);
    }

    if (mes < parcelaContemplacaoLocal) {
      valorParcela = parcelaAntes * fatorINCC * fatorSeguro;
      valorInvestidoMes = parcelaAntes * mes * fatorSeguro;
      creditoContempladoMes = 0;
      lucroBrutoMes = 0;
      percLucroTotalMes = 0;
      percLucroMesMes = 0;
    } else {
      valorParcela =
        (resultLanceFixo?.novaParcela ?? parcelaDepois) * fatorINCC * fatorSeguro;

      const parcelasPagasAntes =
        parcelaAntes * (parcelaContemplacaoLocal - 1) * fatorSeguro;
      lancePagoTotal =
        lancePagoParcela *
        (resultLanceFixo?.novaParcela ?? parcelaDepois);
      lanceEmbutidoTotal =
        lanceEmbutidoParcela *
        (resultLanceFixo?.novaParcela ?? parcelaDepois);
      const parcelasPagasDepois =
        (resultLanceFixo?.novaParcela ?? parcelaDepois) *
        (mes - parcelaContemplacaoLocal + 1) *
        fatorINCC *
        fatorSeguro;

      valorInvestidoMes = parcelasPagasAntes + parcelasPagasDepois;
      creditoContempladoMes =
        (resultLanceFixo?.creditoContratado ?? creditoUnitario) * fatorINCC;
    }

    const creditoContempladoHipotetico =
      (resultLanceFixo?.creditoContratado ?? creditoUnitario) * fatorINCC;
    const valorVendaCotaCalculado =
      creditoContempladoHipotetico * porcentagemVendaCota;

    const valorDoLance =
      mes >= parcelaContemplacaoLocal && lanceEmbutidoParcela > 0
        ? creditoContempladoMes - (lancePagoTotal + lanceEmbutidoTotal)
        : 0;

    const valorEmbutidoCreditoMes =
      lanceEmbutidoParcela *
      (resultLanceFixo?.novaParcela ?? parcelaDepois) *
      fatorINCC;

    lucroBrutoMes = valorVendaCotaCalculado - valorInvestidoMes;

    percLucroTotalMes =
      valorInvestidoMes > 0 ? lucroBrutoMes / valorInvestidoMes : 0;

    percLucroMesMes =
      mes > 0 ? Math.pow(1 + percLucroTotalMes, 1 / mes) - 1 : 0;

    dados.push({
      mes,
      credito:
        (resultLanceFixo?.creditoContratado ?? creditoUnitario) * fatorINCC,
      parcela: valorParcela,
      valorInvestido: valorInvestidoMes,
      valorDoLance,
      valorEmbutidoCredito: valorEmbutidoCreditoMes,
      creditoLiberado:
        (resultLanceFixo?.creditoContratado ?? creditoUnitario) *
          fatorINCC -
        valorEmbutidoCreditoMes,
      creditoContemplado: creditoContempladoMes,
      valorVendaCota: valorVendaCotaCalculado,
      lucroBruto: lucroBrutoMes,
      percLucroTotal: percLucroTotalMes,
      percLucroMes: percLucroMesMes,
    });
  }

  return dados;
}
