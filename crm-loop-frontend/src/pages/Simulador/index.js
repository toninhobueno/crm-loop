import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useContext,
} from "react";
import MainContainer from "../../components/MainContainer";
import { AuthContext } from "../../context/Auth/AuthContext";
import { toast } from "react-toastify";
import { gerarPDFSimulacao } from "simulator/SimuladorPDF";
import { gerarPDFHomeEquity } from "simulator/new-simulator";
import {
  calcularLanceCompleto,
  calcularParcelasConsorcioReduzido,
  calcularParcelasHomeEquity,
  calcularSimulacaoLance,
  simuladorConsorcioLanceFixo,
  simuladorConsorcioUnificado,
} from "simulator/simuladores";
import { buildConsorcioMonthlyRows } from "simulator/consorcioTableBuilder";

import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import Pagination from "@material-ui/lab/Pagination";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";

const useStyles = makeStyles(theme => ({
  root: { paddingBottom: theme.spacing(2) },
  header: {
    marginBottom: theme.spacing(3),
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  panel: { padding: theme.spacing(2) },
}));

function formatMoney(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function downloadPdfBase64(b64, filename) {
  const byteCharacters = atob(b64);
  const byteArrays = [];
  for (let i = 0; i < byteCharacters.length; i += 512) {
    const slice = byteCharacters.slice(i, i + 512);
    const byteNumbers = new Array(slice.length);
    for (let j = 0; j < slice.length; j++) {
      byteNumbers[j] = slice.charCodeAt(j);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  const blob = new Blob(byteArrays, { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function resolveCreditoUnit(params) {
  if (!params) return 0;
  return Number(
    params.creditoUnitario != null ? params.creditoUnitario : params.credito ?? 0
  );
}

const Simulador = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [tab, setTab] = useState(0);
  const [tipoConsorcio, setTipoConsorcio] = useState("lance-fixo");

  const [paramsLanceFixo, setParamsLanceFixo] = useState({
    creditoUnitario: 100000,
    qtdParcelas: 120,
    taxaParcela: 24,
    acrescentarSeguro: false,
    juncaoDeCotas: 1,
    percentualParcelaReduzida: 100,
    parcelaContemplacao: 48,
    mesContemplacao: 0,
    acrescentarINCC: false,
    vendaDaCota: 30,
  });

  const [paramsSorteio, setParamsSorteio] = useState({
    credito: 100000,
    qtdParcelas: 120,
    taxaParcela: 20,
    acrescentarSeguro: false,
    juncaoDeCotas: 1,
  });

  const [paramsLanceVar, setParamsLanceVar] = useState({
    credito: 100000,
    qtdParcelas: 120,
    taxaParcela: 22,
    parcelasPagas: 0,
    parcelasEmbutidas: 0,
    acrescentarSeguro: false,
    usarINCC: false,
    juncaoDeCotas: 1,
  });

  const [paramsLance, setParamsLance] = useState({
    tipoLance: "lance-livre",
    lancePagoParcela: 0,
    lanceEmbutidoParcela: 0,
    taxaParcela: 24,
    qtdParcelas: 120,
    creditoUnitario: 0,
  });

  const [resultLanceFixo, setResultLanceFixo] = useState(null);
  const [resultSorteio, setResultSorteio] = useState(null);

  const [paramsHomeEquity, setParamsHomeEquity] = useState({
    valorImovel: 500000,
    valorCredito: 200000,
    prazo: 240,
    tabelaAmortizacao: "PRICE",
    taxa: 1.05,
    tipoTaxa: "Mensal",
    carencia: 0,
  });
  const [parcelasHomeEquity, setParcelasHomeEquity] = useState([]);
  const [resumoHomeEquity, setResumoHomeEquity] = useState(null);

  const [loadingReduced, setLoadingReduced] = useState(false);
  const [loadingLanceFixoCompleto, setLoadingLanceFixoCompleto] = useState(
    false
  );
  const [loadingHE, setLoadingHE] = useState(false);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfMarca, setPdfMarca] = useState("Loop");
  const [pdfLogo, setPdfLogo] = useState("");

  const [hePdfOpen, setHePdfOpen] = useState(false);

  const [page, setPage] = useState(1);
  const rowsPerPage = 12;

  const activeParams =
    tipoConsorcio === "lance-fixo"
      ? paramsLanceFixo
      : tipoConsorcio === "sorteio"
        ? paramsSorteio
        : paramsLanceVar;

  const dadosTabelaConsorcio = useMemo(() => {
    if (!resultSorteio || !paramsLanceFixo.qtdParcelas) return [];
    try {
      return buildConsorcioMonthlyRows({
        tipoConsorcio,
        paramsLanceFixo,
        paramsSorteio,
        paramsLanceVar,
        resultSorteio,
        resultLanceFixo,
        paramsLance,
      });
    } catch (e) {
      console.warn(e);
      return [];
    }
  }, [
    tipoConsorcio,
    paramsLanceFixo,
    paramsSorteio,
    paramsLanceVar,
    resultSorteio,
    resultLanceFixo,
    paramsLance,
  ]);

  const resultadoLance = useMemo(() => {
    try {
      return calcularSimulacaoLance({
        creditoUnitario: Number(
          resultLanceFixo?.creditoContratado ??
            resolveCreditoUnit(activeParams) ??
            paramsLance.creditoUnitario ??
            0
        ),
        taxaParcela: Number(paramsLance.taxaParcela ?? activeParams.taxaParcela ?? 0),
        qtdParcelas: Number(
          paramsLance.qtdParcelas ?? paramsLanceFixo.qtdParcelas ?? 0
        ),
        lancePagoParcela: Number(paramsLance.lancePagoParcela ?? 0),
        lanceEmbutidoParcela: Number(paramsLance.lanceEmbutidoParcela ?? 0),
      });
    } catch (_) {
      return null;
    }
  }, [
    paramsLance,
    resultLanceFixo,
    activeParams,
    paramsLanceFixo.qtdParcelas,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    dadosTabelaConsorcio.length,
    tipoConsorcio,
    paramsLanceFixo,
    resultSorteio,
  ]);

  const handleLanceFixoBasico = useCallback(() => {
    try {
      setResultLanceFixo(simuladorConsorcioLanceFixo(paramsLanceFixo));
      toast.success("Lance fixo (referência) calculado.");
    } catch (_) {
      setResultLanceFixo({ erro: "Parâmetros inválidos" });
      toast.error("Erro ao calcular lance fixo.");
    }
  }, [paramsLanceFixo]);

  const handleConsorcioUnificadoClick = useCallback(() => {
    try {
      const params = activeParams;
      const cu = Number(
        resultLanceFixo?.creditoContratado ??
          resolveCreditoUnit(params) ??
          0
      );
      const safeParams = {
        creditoUnitario: cu,
        qtdParcelas: Number(params.qtdParcelas ?? 0),
        taxaParcela: Number(params.taxaParcela ?? 0),
        acrescentarSeguro: params.acrescentarSeguro === true,
        juncaoDeCotas: Number(params.juncaoDeCotas ?? 1),
        percentualParcelaReduzida: Number(params.percentualParcelaReduzida ?? 100),
        parcelaContemplacao: params.parcelaContemplacao
          ? Number(params.parcelaContemplacao)
          : undefined,
        mesContemplacao: params.mesContemplacao
          ? Number(params.mesContemplacao)
          : undefined,
      };
      const r = simuladorConsorcioUnificado(safeParams);
      setResultSorteio(prev => ({
        ...r,
        parcelaDepois: r.parcelaDepois ?? r.parcelaApos,
      }));
      toast.success("Simulação unificada atualizada nos resultados.");
    } catch (_) {
      toast.error("Erro no cálculo unificado.");
    }
  }, [activeParams, resultLanceFixo]);

  const handleConsorcioReduzido = () => {
    setLoadingReduced(true);
    const tid = toast.loading("Calculando consórcio…");
    try {
      const params = activeParams;
      const cu = Number(
        resultLanceFixo?.creditoContratado ??
          resolveCreditoUnit(params) ??
          0
      );
      const safeParams = {
        creditoUnitario: cu,
        qtdParcelas: Number(params.qtdParcelas ?? 0),
        taxaParcela: Number(params.taxaParcela ?? 0),
        opcaoParcela: Number(
          params.percentualParcelaReduzida ?? params.opcaoParcela ?? 100
        ),
        parcelaContemplacao:
          Number(params.parcelaContemplacao) > 0
            ? Number(params.parcelaContemplacao)
            : 1,
        mesContemplacao: Number(params.mesContemplacao ?? 1),
      };
      const r = calcularParcelasConsorcioReduzido(safeParams);
      setResultSorteio({
        ...r,
        valorPago: r.valorPago,
      });
      toast.update(tid, {
        render: "Simulação concluída",
        type: "success",
        isLoading: false,
        autoClose: 2300,
      });
    } catch (e) {
      toast.update(tid, {
        render: "Falha no cálculo",
        type: "error",
        isLoading: false,
        autoClose: 3500,
      });
    } finally {
      setLoadingReduced(false);
    }
  };

  const handleCalculoLanceFixoCompleto = () => {
    setLoadingLanceFixoCompleto(true);
    const tid = toast.loading("Calculando lance fixo completo…");
    try {
      const creditoContratado =
        tipoConsorcio === "lance-fixo"
          ? Number(paramsLanceFixo.creditoUnitario ?? 0)
          : resolveCreditoUnit(activeParams);
      const taxaAdministrativaPct = Number(
        activeParams.taxaParcela ?? paramsLanceFixo.taxaParcela ?? 0
      );
      const totalParcelas = Number(
        activeParams.qtdParcelas ?? paramsLanceFixo.qtdParcelas ?? 0
      );
      const lancePagoParcela = Number(paramsLance.lancePagoParcela ?? 0);
      const lanceEmbutidoParcela = Number(
        paramsLance.lanceEmbutidoParcela ?? 0
      );
      const valorParcelaOriginal = resultSorteio?.parcelaAntes ?? 0;

      let tipoLc = "misto";
      if (lancePagoParcela > 0 && lanceEmbutidoParcela === 0) tipoLc = "dinheiro";
      else if (lancePagoParcela === 0 && lanceEmbutidoParcela > 0)
        tipoLc = "embutido";

      const resultado = calcularLanceCompleto({
        tipo: tipoLc,
        creditoContratado,
        taxaAdministrativaPct,
        valorParcelaOriginal,
        totalParcelas,
        parcelasEmbutidas: lanceEmbutidoParcela,
        parcelasDinheiro: lancePagoParcela,
        parcelaContemplacao: Number(
          paramsLanceFixo.parcelaContemplacao ?? 1
        ),
        valorEmbutidoNoCredito:
          lanceEmbutidoParcela * (resultSorteio?.parcelaDepois ?? resultSorteio?.parcelaApos ?? 0),
        valorEmbutidoNoDinheiro:
          lancePagoParcela * (resultSorteio?.parcelaDepois ?? resultSorteio?.parcelaApos ?? 0),
      });
      setResultLanceFixo(resultado);
      toast.update(tid, {
        render: "Lance fixo atualizado",
        type: "success",
        isLoading: false,
        autoClose: 2200,
      });
    } catch (e) {
      console.error(e);
      toast.update(tid, {
        render: "Erro ao calcular lance fixo",
        type: "error",
        isLoading: false,
        autoClose: 4500,
      });
    } finally {
      setLoadingLanceFixoCompleto(false);
    }
  };

  const confirmPdfConsorcio = () => {
    try {
      const b64 = gerarPDFSimulacao({
        tipoSimulacao: tipoConsorcio,
        paramsLanceFixo,
        resultSorteio,
        resultLanceFixo,
        paramsLance,
        dadosTabela: dadosTabelaConsorcio,
        marcaEmpresa: pdfMarca || user?.company?.name || "Loop",
        logoUrl: pdfLogo || undefined,
        empresaConfig: {},
        returnBase64: true,
      });
      if (b64) {
        downloadPdfBase64(b64, "Simulacao-Consorcio.pdf");
        toast.success("PDF gerado.");
      }
      setPdfOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF.");
    }
  };

  const runHomeEquity = () => {
    setLoadingHE(true);
    const tid = toast.loading("Calculando Home Equity…");
    try {
      const result = calcularParcelasHomeEquity({
        valorImovel: Number(paramsHomeEquity.valorImovel ?? 0),
        valorCredito: Number(paramsHomeEquity.valorCredito ?? 0),
        prazo: Number(paramsHomeEquity.prazo ?? 0),
        tabelaAmortizacao:
          paramsHomeEquity.tabelaAmortizacao === "SAC" ? "SAC" : "PRICE",
        taxa: Number(paramsHomeEquity.taxa ?? 0),
        tipoTaxa: paramsHomeEquity.tipoTaxa === "Anual" ? "Anual" : "Mensal",
        carencia: Number(paramsHomeEquity.carencia ?? 0),
      });
      if (result.erro) {
        toast.update(tid, {
          render: result.erro,
          type: "error",
          isLoading: false,
          autoClose: 5500,
        });
        setResumoHomeEquity(null);
        setParcelasHomeEquity([]);
      } else {
        setParcelasHomeEquity(result.parcelas || []);
        setResumoHomeEquity(result.resumo);
        toast.update(tid, {
          render: "Cálculo concluído",
          type: "success",
          isLoading: false,
          autoClose: 2200,
        });
      }
    } catch (e) {
      toast.update(tid, {
        render: "Erro no Home Equity",
        type: "error",
        isLoading: false,
        autoClose: 4500,
      });
    } finally {
      setLoadingHE(false);
    }
  };

  const confirmHePdf = async () => {
    try {
      const pub = process.env.PUBLIC_URL || "";
      const logoAbs = `${typeof window !== "undefined" ? window.location.origin : ""}${pub}/central.png`;
      const b64 = await gerarPDFHomeEquity({
        paramsHomeEquity,
        parcelasHomeEquity,
        marcaEmpresa: user?.company?.name || "Loop",
        logoUrl: logoAbs,
        nomeUsuarioLogado: user?.name || "",
        empresaFooter: undefined,
      });
      if (b64) {
        downloadPdfBase64(b64, "Simulacao-Home-Equity.pdf");
        toast.success("PDF Home Equity gerado.");
      }
      setHePdfOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF.");
    }
  };

  const pagedRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return dadosTabelaConsorcio.slice(start, start + rowsPerPage);
  }, [dadosTabelaConsorcio, page]);

  const pageCount =
    dadosTabelaConsorcio.length > 0
      ? Math.max(1, Math.ceil(dadosTabelaConsorcio.length / rowsPerPage))
      : 1;

  return (
    <MainContainer>
      <div className={classes.root}>
        <div className={classes.header}>
          <div>
            <Typography variant="h4" component="h1">
              Simuladores Financeiros
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Consórcio e Home Equity (importado CRM-BAIEYS — Automações)
            </Typography>
          </div>
          <CalculateOutlinedIcon color="primary" style={{ fontSize: 42 }} />
        </div>

        <Paper variant="outlined" className={classes.panel}>
          <Tabs
            value={tab}
            indicatorColor="primary"
            textColor="primary"
            onChange={(e, v) => setTab(v)}
          >
            <Tab label="Consórcio" />
            <Tab label="Home Equity" />
          </Tabs>
          <Box mt={2} />
          {tab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <InputLabel shrink>Tipo</InputLabel>
                <Select
                  fullWidth
                  displayEmpty
                  value={tipoConsorcio}
                  onChange={e => setTipoConsorcio(e.target.value)}
                >
                  <MenuItem value="lance-fixo">Lance fixo</MenuItem>
                  <MenuItem value="sorteio">Sorteio</MenuItem>
                  <MenuItem value="lance-variavel">Lance variável</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Parâmetros principais
                </Typography>
                <Divider />
              </Grid>
              {tipoConsorcio === "lance-fixo" && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Crédito unitário (R$)"
                      fullWidth
                      type="number"
                      value={paramsLanceFixo.creditoUnitario}
                      onChange={e =>
                        setParamsLanceFixo(p => ({
                          ...p,
                          creditoUnitario: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      label="Qtd parcelas"
                      fullWidth
                      type="number"
                      value={paramsLanceFixo.qtdParcelas}
                      onChange={e =>
                        setParamsLanceFixo(p => ({
                          ...p,
                          qtdParcelas: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      label="Taxa adm. %"
                      fullWidth
                      type="number"
                      inputProps={{ step: "any" }}
                      value={paramsLanceFixo.taxaParcela}
                      onChange={e =>
                        setParamsLanceFixo(p => ({
                          ...p,
                          taxaParcela: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      label="% parcela reduzida"
                      fullWidth
                      type="number"
                      value={paramsLanceFixo.percentualParcelaReduzida}
                      onChange={e =>
                        setParamsLanceFixo(p => ({
                          ...p,
                          percentualParcelaReduzida: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      label="Junção cotas"
                      fullWidth
                      type="number"
                      value={paramsLanceFixo.juncaoDeCotas}
                      onChange={e =>
                        setParamsLanceFixo(p => ({
                          ...p,
                          juncaoDeCotas: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      label="Parcela contemplação (mês)"
                      fullWidth
                      type="number"
                      value={paramsLanceFixo.parcelaContemplacao}
                      onChange={e =>
                        setParamsLanceFixo(p => ({
                          ...p,
                          parcelaContemplacao: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      label="% venda da cota (ex.: 30)"
                      fullWidth
                      type="number"
                      value={paramsLanceFixo.vendaDaCota}
                      onChange={e =>
                        setParamsLanceFixo(p => ({
                          ...p,
                          vendaDaCota: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!paramsLanceFixo.acrescentarSeguro}
                          onChange={e =>
                            setParamsLanceFixo(p => ({
                              ...p,
                              acrescentarSeguro: e.target.checked,
                            }))
                          }
                        />
                      }
                      label="Acrescentar seguro"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!paramsLanceFixo.acrescentarINCC}
                          onChange={e =>
                            setParamsLanceFixo(p => ({
                              ...p,
                              acrescentarINCC: e.target.checked,
                            }))
                          }
                        />
                      }
                      label="Acrescentar INCC (aprox.)"
                    />
                  </Grid>
                </>
              )}
              {tipoConsorcio === "sorteio" && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Crédito"
                      fullWidth
                      type="number"
                      value={paramsSorteio.credito}
                      onChange={e =>
                        setParamsSorteio(p => ({
                          ...p,
                          credito: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      label="Qtd parcelas"
                      type="number"
                      fullWidth
                      value={paramsSorteio.qtdParcelas}
                      onChange={e =>
                        setParamsSorteio(p => ({
                          ...p,
                          qtdParcelas: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      label="Taxa %"
                      fullWidth
                      type="number"
                      value={paramsSorteio.taxaParcela}
                      onChange={e =>
                        setParamsSorteio(p => ({
                          ...p,
                          taxaParcela: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      label="Junção cotas % (venda)"
                      helperText="% para projeção de venda na tabela"
                      fullWidth
                      type="number"
                      value={paramsSorteio.juncaoDeCotas}
                      onChange={e =>
                        setParamsSorteio(p => ({
                          ...p,
                          juncaoDeCotas: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!paramsSorteio.acrescentarSeguro}
                          onChange={e =>
                            setParamsSorteio(p => ({
                              ...p,
                              acrescentarSeguro: e.target.checked,
                            }))
                          }
                        />
                      }
                      label="Seguro"
                    />
                  </Grid>
                </>
              )}
              {tipoConsorcio === "lance-variavel" && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Crédito"
                      type="number"
                      fullWidth
                      value={paramsLanceVar.credito}
                      onChange={e =>
                        setParamsLanceVar(p => ({
                          ...p,
                          credito: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      label="Parcelas pagas"
                      type="number"
                      fullWidth
                      value={paramsLanceVar.parcelasPagas}
                      onChange={e =>
                        setParamsLanceVar(p => ({
                          ...p,
                          parcelasPagas: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      label="Parcelas embutidas"
                      type="number"
                      fullWidth
                      value={paramsLanceVar.parcelasEmbutidas}
                      onChange={e =>
                        setParamsLanceVar(p => ({
                          ...p,
                          parcelasEmbutidas: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <TextField
                      label="Taxa %"
                      type="number"
                      fullWidth
                      value={paramsLanceVar.taxaParcela}
                      onChange={e =>
                        setParamsLanceVar(p => ({
                          ...p,
                          taxaParcela: Number(e.target.value),
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!paramsLanceVar.usarINCC}
                          onChange={e =>
                            setParamsLanceVar(p => ({
                              ...p,
                              usarINCC: e.target.checked,
                            }))
                          }
                        />
                      }
                      label="INCC no lance variável"
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2">Lances (livre / misto)</Typography>
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField
                  label="Parcelas de lance (dinheiro)"
                  type="number"
                  fullWidth
                  value={paramsLance.lancePagoParcela}
                  onChange={e =>
                    setParamsLance(p => ({
                      ...p,
                      lancePagoParcela: Number(e.target.value),
                    }))
                  }
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField
                  label="Parcelas de lance (embutido)"
                  type="number"
                  fullWidth
                  value={paramsLance.lanceEmbutidoParcela}
                  onChange={e =>
                    setParamsLance(p => ({
                      ...p,
                      lanceEmbutidoParcela: Number(e.target.value),
                    }))
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" flexWrap="wrap" style={{ gap: 8 }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleLanceFixoBasico}
                  >
                    Calcular Lance fixo (referência)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleConsorcioUnificadoClick}
                  >
                    Unificado (sorteio)
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={loadingReduced}
                    onClick={handleConsorcioReduzido}
                  >
                    Calcular parcelas reduzidas
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    disabled={loadingLanceFixoCompleto || !resultSorteio}
                    onClick={handleCalculoLanceFixoCompleto}
                  >
                    Calcular Lance fixo (completo)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setPdfOpen(true)}
                  >
                    Exportar PDF
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2">Resultados rápidos</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" style={{ padding: 16 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Lance fixo (referência)
                  </Typography>
                  <Typography variant="body2">
                    {resultLanceFixo && resultLanceFixo.erro
                      ? JSON.stringify(resultLanceFixo)
                      : resultLanceFixo
                      ? <>
                          Crédito: {formatMoney(resultLanceFixo.creditoContratado)}
                          <br />Parc. antes: {formatMoney(resultLanceFixo.parcelaAntes)}
                          <br />Parc. após : {formatMoney(resultLanceFixo.parcelaApos ?? resultLanceFixo.novaParcela)}
                        </>
                      : "—"}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" style={{ padding: 16 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Simulação de lances
                  </Typography>
                  <Typography variant="body2">
                    {resultadoLance && resultadoLance.erro
                      ? resultadoLance.erro
                      : resultadoLance
                      ? <>
                          Valor total lance: {formatMoney(resultadoLance.valorTotalLance)}
                          <br />
                          Parcela base: {formatMoney(resultadoLance.valorParcela)}
                        </>
                      : "—"}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Tabela mês a mês</Typography>
              </Grid>
              <Grid item xs={12}>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  style={{ maxHeight: 420 }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Mês</TableCell>
                        <TableCell align="right">Parcela</TableCell>
                        <TableCell align="right">Investido</TableCell>
                        <TableCell align="right">Lucro bruto</TableCell>
                        <TableCell align="right">% mês</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagedRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5}>
                            Calcule &quot;parcelas reduzidas&quot; primeiro.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pagedRows.map(row => (
                          <TableRow key={row.mes}>
                            <TableCell>{row.mes}</TableCell>
                            <TableCell align="right">
                              {formatMoney(row.parcela)}
                            </TableCell>
                            <TableCell align="right">
                              {formatMoney(row.valorInvestido)}
                            </TableCell>
                            <TableCell align="right">
                              {formatMoney(row.lucroBruto)}
                            </TableCell>
                            <TableCell align="right">
                              {typeof row.percLucroMes === "number"
                                ? `${(row.percLucroMes * 100).toFixed(4).replace(
                                    ".",
                                    ","
                                  )} %`
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box mt={2} display="flex" justifyContent="flex-end">
                  <Pagination
                    count={pageCount}
                    page={page}
                    onChange={(e, p) => setPage(p)}
                    color="primary"
                  />
                </Box>
              </Grid>
            </Grid>
          )}

          {tab === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Valor do imóvel"
                  fullWidth
                  type="number"
                  value={paramsHomeEquity.valorImovel}
                  onChange={e =>
                    setParamsHomeEquity(p => ({
                      ...p,
                      valorImovel: Number(e.target.value),
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Valor do crédito"
                  fullWidth
                  type="number"
                  value={paramsHomeEquity.valorCredito}
                  onChange={e =>
                    setParamsHomeEquity(p => ({
                      ...p,
                      valorCredito: Number(e.target.value),
                    }))
                  }
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  label="Prazo (meses)"
                  fullWidth
                  type="number"
                  value={paramsHomeEquity.prazo}
                  onChange={e =>
                    setParamsHomeEquity(p => ({
                      ...p,
                      prazo: Number(e.target.value),
                    }))
                  }
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <InputLabel>Tabela</InputLabel>
                <Select
                  fullWidth
                  value={paramsHomeEquity.tabelaAmortizacao}
                  onChange={e =>
                    setParamsHomeEquity(p => ({
                      ...p,
                      tabelaAmortizacao: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="PRICE">PRICE</MenuItem>
                  <MenuItem value="SAC">SAC</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label='Taxa (%) — ex.: 1,05 se mensal'
                  helperText="Alinhe com o campo Tipo taxa (Mensal/Anual)"
                  fullWidth
                  type="number"
                  inputProps={{ step: "any" }}
                  value={paramsHomeEquity.taxa}
                  onChange={e =>
                    setParamsHomeEquity(p => ({
                      ...p,
                      taxa: Number(e.target.value),
                    }))
                  }
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <InputLabel>Tipo taxa</InputLabel>
                <Select
                  fullWidth
                  value={paramsHomeEquity.tipoTaxa}
                  onChange={e =>
                    setParamsHomeEquity(p => ({
                      ...p,
                      tipoTaxa: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="Mensal">Mensal</MenuItem>
                  <MenuItem value="Anual">Anual</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label="Carência (0–6)"
                  fullWidth
                  type="number"
                  value={paramsHomeEquity.carencia}
                  onChange={e =>
                    setParamsHomeEquity(p => ({
                      ...p,
                      carencia: Number(e.target.value),
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" style={{ gap: 8 }} flexWrap="wrap">
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={loadingHE}
                    onClick={runHomeEquity}
                  >
                    Calcular
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={
                      !parcelasHomeEquity || parcelasHomeEquity.length === 0
                    }
                    onClick={() => setHePdfOpen(true)}
                  >
                    PDF Home Equity
                  </Button>
                </Box>
              </Grid>
              {resumoHomeEquity && (
                <Grid item xs={12}>
                  <Paper variant="outlined" style={{ padding: 16 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Resumo
                    </Typography>
                    <Typography variant="body2" component="div">
                      Crédito: {formatMoney(resumoHomeEquity.valorCredito)}
                      <br />
                      Total financiado: {formatMoney(
                        resumoHomeEquity.totalFinanciado
                      )}
                      <br />
                      Prazo: {resumoHomeEquity.prazo} meses
                    </Typography>
                  </Paper>
                </Grid>
              )}
              <Grid item xs={12}>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  style={{ maxHeight: 380 }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell align="right">Parcela</TableCell>
                        <TableCell align="right">Juros</TableCell>
                        <TableCell align="right">Amortização</TableCell>
                        <TableCell align="right">Saldo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parcelasHomeEquity.slice(0, 60).map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>{p.parcela}</TableCell>
                          <TableCell align="right">
                            {formatMoney(p.valorParcela)}
                          </TableCell>
                          <TableCell align="right">{formatMoney(p.juros)}</TableCell>
                          <TableCell align="right">
                            {formatMoney(p.amortizacao)}
                          </TableCell>
                          <TableCell align="right">
                            {formatMoney(p.saldoDevedorHome)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {parcelasHomeEquity.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            Execute o cálculo para ver as parcelas.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                {parcelasHomeEquity.length > 60 && (
                  <Typography variant="caption" color="textSecondary">
                    Mostrando 60 linhas — exporte o PDF para o demonstrativo completo.
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
        </Paper>

        <Dialog open={pdfOpen} onClose={() => setPdfOpen(false)}>
          <DialogTitle>PDF — Consórcio</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Nome da empresa (marca no PDF)"
                  fullWidth
                  value={pdfMarca}
                  onChange={e => setPdfMarca(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="URL do logo (opcional)"
                  fullWidth
                  placeholder="https://..."
                  value={pdfLogo}
                  onChange={e => setPdfLogo(e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPdfOpen(false)}>Fechar</Button>
            <Button color="primary" variant="contained" onClick={confirmPdfConsorcio}>
              Gerar PDF
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={hePdfOpen} onClose={() => setHePdfOpen(false)}>
          <DialogTitle>PDF Home Equity</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              Gerar relatório usando o usuário atual ({user?.name || "—"})
              {" "}e logo em {`${(process.env.PUBLIC_URL || "")}/central.png`}.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHePdfOpen(false)}>Cancelar</Button>
            <Button color="primary" variant="contained" onClick={confirmHePdf}>
              Gerar
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </MainContainer>
  );
};

export default Simulador;
