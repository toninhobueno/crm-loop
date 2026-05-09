import React, { useContext, useState, useEffect } from "react";

import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
// import {  Button, Grid } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { useTheme } from "@material-ui/core/styles";
import { IconButton } from "@mui/material";
import { Groups, SaveAlt } from "@mui/icons-material";

import CallIcon from "@material-ui/icons/Call";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import GroupAddIcon from "@material-ui/icons/GroupAdd";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import FilterListIcon from "@material-ui/icons/FilterList";
import ClearIcon from "@material-ui/icons/Clear";
import SendIcon from "@material-ui/icons/Send";
import MessageIcon from "@material-ui/icons/Message";
import AccessAlarmIcon from "@material-ui/icons/AccessAlarm";
import TimerIcon from "@material-ui/icons/Timer";
import * as XLSX from "xlsx";
import CheckCircleOutlineIcon from "@material-ui/icons/RecordVoiceOver";
import ErrorOutlineIcon from "@material-ui/icons/RecordVoiceOver";

import { grey, blue } from "@material-ui/core/colors";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import TabPanel from "../../components/TabPanel";
import TableAttendantsStatus from "../../components/Dashboard/TableAttendantsStatus";
import { isArray } from "lodash";

import { AuthContext } from "../../context/Auth/AuthContext";

import useDashboard from "../../hooks/useDashboard";
import useContacts from "../../hooks/useContacts";
import useMessages from "../../hooks/useMessages";
import { ChatsUser } from "./ChartsUser";

import Filters from "./Filters";
import { isEmpty } from "lodash";
import moment from "moment";
import { ChartsDate } from "./ChartsDate";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  Container,
  SvgIcon,
  Tab,
  Tabs,
  LinearProgress,
  Box,
} from "@mui/material";
import { i18n } from "../../translate/i18n";
import Grid2 from "@mui/material/Unstable_Grid2/Grid2";
import ForbiddenPage from "../../components/ForbiddenPage";
import DashboardSectionTabs from "../../components/DashboardSectionTabs";
import { ArrowDownward, ArrowUpward } from "@material-ui/icons";

const useStyles = makeStyles((theme) => ({
  overline: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: theme.palette.text.secondary,
    letterSpacing: "0.8px",
    lineHeight: 2,
    textTransform: "uppercase",
    fontFamily: "'Inter', sans-serif",
  },
  h4: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    fontSize: "1.75rem",
    lineHeight: 1.2,
    color: theme.palette.text.primary,
  },
  tab: {
    minWidth: "auto",
    width: "auto",
    padding: theme.spacing(0.75, 1.5),
    borderRadius: 10,
    transition: "all 0.2s ease",
    marginRight: theme.spacing(0.5),
    marginLeft: theme.spacing(0.5),
    fontWeight: 500,
    "&:hover": {
      backgroundColor: "rgba(59, 130, 246, 0.08)",
      transform: "translateY(-1px)",
    },
    "&$selected": {
      color: theme.palette.primary.contrastText,
      backgroundColor: theme.palette.primary.main,
      boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
    },
  },
  tabIndicator: {
    display: "none",
  },
  container: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
  nps: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.padding,
  },
  fixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    height: 240,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  cardAvatar: {
    fontSize: "48px",
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
    width: theme.spacing(7),
    height: theme.spacing(7),
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  cardSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "13px",
    fontWeight: 400,
  },
  alignRight: {
    textAlign: "right",
  },
  fullWidth: {
    width: "100%",
  },
  selectContainer: {
    width: "100%",
    textAlign: "left",
  },
  iframeDashboard: {
    width: "100%",
    height: "calc(100vh - 64px)",
    border: "none",
  },
  customFixedHeightPaperLg: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(3),
    letterSpacing: "-0.5px",
    fontFamily: "'Inter', sans-serif",
  },
  mainPaper: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    ...theme.scrollbarStyles,
    backgroundColor: "transparent !important",
    borderRadius: 0,
  },
  paper: {
    padding: theme.spacing(2.5),
    borderRadius: 16,
    backgroundColor: theme.palette.background.paper,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)",
    border: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'}`,
    transition: "all 0.2s ease",
    height: "100%",
    "&:hover": {
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
      transform: "translateY(-2px)",
    },
  },
  indicatorCard: {
    padding: theme.spacing(2.5),
    borderRadius: 16,
    backgroundColor: theme.palette.background.paper,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)",
    border: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'}`,
    transition: "all 0.2s ease",
    height: "100%",
    "&:hover": {
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
      transform: "translateY(-2px)",
    },
  },
  indicatorIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing(2),
    fontSize: "24px",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  barContainer: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.5),
  },
  progressBar: {
    flex: 1,
    borderRadius: 8,
    height: 12,
    overflow: "hidden",
  },
  progressLabel: {
    minWidth: 80,
    textAlign: "left",
    fontWeight: 600,
    fontSize: "0.875rem",
    color: theme.palette.text.primary,
    fontFamily: "'Inter', sans-serif",
  },
  progressValue: {
    minWidth: 45,
    textAlign: "right",
    fontWeight: 600,
    fontSize: "0.875rem",
    color: theme.palette.text.secondary,
    fontFamily: "'Inter', sans-serif",
  },
  infoCard: {
    padding: theme.spacing(2.5),
    borderRadius: 16,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)",
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'}`,
    transition: "all 0.2s ease",
    height: "100%",
    "&:hover": {
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
      transform: "translateY(-2px)",
    },
  },
  infoIcon: {
    fontSize: "28px",
    marginRight: theme.spacing(1.5),
    borderRadius: 10,
    padding: theme.spacing(1),
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  sectionHeader: {
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(4),
    paddingBottom: theme.spacing(1),
    borderBottom: `2px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
  },
  filterButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 500,
    padding: theme.spacing(1, 2),
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
    "&:hover": {
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      transform: "translateY(-1px)",
    },
  },
}));

const Dashboard = () => {
  const theme = useTheme();
  const classes = useStyles();
  const [counters, setCounters] = useState({});
  const [attendants, setAttendants] = useState([]);
  const [filterType, setFilterType] = useState(1);
  const [period, setPeriod] = useState(0);
  const [dateFrom, setDateFrom] = useState(
    moment("1", "D").format("YYYY-MM-DD")
  );
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);
  const { find } = useDashboard();

  //FILTROS NPS
  const [tab, setTab] = useState("Indicadores");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedQueues, setSelectedQueues] = useState([]);

  let newDate = new Date();
  let date = newDate.getDate();
  let month = newDate.getMonth() + 1;
  let year = newDate.getFullYear();
  let nowIni = `${year}-${month < 10 ? `0${month}` : `${month}`}-01`;

  let now = `${year}-${month < 10 ? `0${month}` : `${month}`
    }-${date < 10 ? `0${date}` : `${date}`}`;

  const [showFilter, setShowFilter] = useState(false);
  const [dateStartTicket, setDateStartTicket] = useState(nowIni);
  const [dateEndTicket, setDateEndTicket] = useState(now);
  const [queueTicket, setQueueTicket] = useState(false);
  const [fetchDataFilter, setFetchDataFilter] = useState(false);

  const { user } = useContext(AuthContext);

  const exportarGridParaExcel = () => {
    const ws = XLSX.utils.table_to_sheet(
      document.getElementById("grid-attendants")
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RelatorioDeAtendentes");
    XLSX.writeFile(wb, "relatorio-de-atendentes.xlsx");
  };

  var userQueueIds = [];

  if (user.queues && user.queues.length > 0) {
    userQueueIds = user.queues.map((q) => q.id);
  }

  useEffect(() => {
    let isMounted = true;
    
    async function firstLoad() {
      if (isMounted) {
        console.log('Executando firstLoad...');
        await fetchData();
      }
    }
    
    const timeoutId = setTimeout(() => {
      firstLoad();
    }, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDataFilter]);

  async function fetchData() {
    setLoading(true);
    console.log('Iniciando fetchData...');
  
    let params = {};
  
    // Construir parâmetros de filtro
    if (period > 0) {
      params = {
        days: period,
      };
      console.log('Usando filtro por dias:', period);
    } else {
      // Se não há período específico, usar as datas
      if (!isEmpty(dateStartTicket) && moment(dateStartTicket).isValid()) {
        params = {
          ...params,
          date_from: moment(dateStartTicket).format("YYYY-MM-DD"),
        };
        console.log('Data de início:', dateStartTicket);
      }
  
      if (!isEmpty(dateEndTicket) && moment(dateEndTicket).isValid()) {
        params = {
          ...params,
          date_to: moment(dateEndTicket).format("YYYY-MM-DD"),
        };
        console.log('Data de fim:', dateEndTicket);
      }
    }
  
    // Se nenhum parâmetro foi definido, usar período padrão de 30 dias
    if (Object.keys(params).length === 0) {
      console.log('Nenhum filtro definido, usando 30 dias como padrão');
      params = { days: 30 };
    }
  
    console.log('Parâmetros finais para busca:', params);
  
    try {
      const data = await find(params);
      console.log('Dados recebidos no componente:', data);
  
      // Garantir que counters sempre tenha valores válidos
      const safeCounters = data.counters || {};
      
      // Verificar especificamente o campo tickets
      console.log('Campo tickets recebido:', safeCounters.tickets);
      
      setCounters(safeCounters);
      
      if (isArray(data.attendants)) {
        setAttendants(data.attendants);
      } else {
        console.warn('Attendants não é um array:', data.attendants);
        setAttendants([]);
      }
  
      console.log('Estado atualizado - Counters:', safeCounters);
      console.log('Estado atualizado - Attendants:', data.attendants);
      
      // Log específico para verificar se o campo tickets está presente
      console.log('Valor de tickets no estado:', safeCounters.tickets);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados do dashboard');
      
      // Definir valores padrão em caso de erro
      setCounters({
        avgSupportTime: 0,
        avgWaitTime: 0,
        supportFinished: 0,
        supportHappening: 0,
        supportPending: 0,
        supportGroups: 0,
        leads: 0,
        activeTickets: 0,
        passiveTickets: 0,
        tickets: 0,
        waitRating: 0,
        withoutRating: 0,
        withRating: 0,
        percRating: 0,
        npsPromotersPerc: 0,
        npsPassivePerc: 0,
        npsDetractorsPerc: 0,
        npsScore: 0
      });
      setAttendants([]);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectedUsers = (selecteds) => {
    const users = selecteds.map((t) => t.id);
    setSelectedUsers(users);
  };

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  function formatTime(minutes) {
    return moment().startOf("day").add(minutes, "minutes").format("HH[h] mm[m]");
  }

  const GetUsers = () => {
    let count;
    let userOnline = 0;
    attendants.forEach((user) => {
      if (user.online === true) {
        userOnline = userOnline + 1;
      }
    });
    count = userOnline === 0 ? 0 : userOnline;
    return count;
  };

  const GetContacts = (all) => {
    let props = {};
    if (all) {
      props = {};
    } else {
      props = {
        dateStart: dateStartTicket,
        dateEnd: dateEndTicket,
      };
    }
    const { count } = useContacts(props);
    return count;
  };

  const GetMessages = (all, fromMe) => {
    let props = {};
    if (all) {
      if (fromMe) {
        props = {
          fromMe: true,
        };
      } else {
        props = {
          fromMe: false,
        };
      }
    } else {
      if (fromMe) {
        props = {
          fromMe: true,
          dateStart: dateStartTicket,
          dateEnd: dateEndTicket,
        };
      } else {
        props = {
          fromMe: false,
          dateStart: dateStartTicket,
          dateEnd: dateEndTicket,
        };
      }
    }
    const { count } = useMessages(props);
    return count;
  };

  function toggleShowFilter() {
    setShowFilter(!showFilter);
  }

  return (
    <>
      {user.profile === "user" && user.showDashboard === "disabled" ? (
        <ForbiddenPage />
      ) : (
        <MainContainer>
          <DashboardSectionTabs showFollowup={user.profile === "admin"} />
          <Paper
            className={classes.mainPaper}
            variant="outlined"
          >
            <Container maxWidth={false} className={classes.container} style={{ padding: '24px 16px', maxWidth: '100%', overflowX: 'hidden' }}>
              <Grid2 container spacing={3} className={classes.container} style={{ margin: 0, width: '100%' }}>
                {/* FILTROS */}
                <Grid2 xs={12} container justifyContent="flex-end" style={{ marginBottom: 8 }}>
                  <Button
                    onClick={toggleShowFilter}
                    color="primary"
                    variant="contained"
                    startIcon={!showFilter ? <FilterListIcon /> : <ClearIcon />}
                    className={classes.filterButton}
                  >
                    {showFilter ? "Ocultar Filtros" : "Mostrar Filtros"}
                  </Button>
                </Grid2>

                {showFilter && (
                  <Grid2 item xs={12} style={{ marginBottom: 24 }}>
                    <Paper className={classes.paper}>
                      <Filters
                        classes={classes}
                        setDateStartTicket={setDateStartTicket}
                        setDateEndTicket={setDateEndTicket}
                        dateStartTicket={dateStartTicket}
                        dateEndTicket={dateEndTicket}
                        setQueueTicket={setQueueTicket}
                        queueTicket={queueTicket}
                        fetchData={setFetchDataFilter}
                      />
                    </Paper>
                  </Grid2>
                )}

                {/* Indicadores Gerais */}
                <Grid2 item xs={12} className={classes.sectionHeader}>
                  <Typography variant="h5" className={classes.sectionTitle}>
                    Indicadores
                  </Typography>
                </Grid2>
                {[
                  { label: "Em Atendimento", value: counters.supportHappening || 0, icon: <CallIcon style={{ color: "#01BBAC" }} />, color: "#01BBAC" },
                  { label: "Aguardando", value: counters.supportPending || 0, icon: <HourglassEmptyIcon style={{ color: "#47606e" }} />, color: "#47606e" },
                  { label: "Finalizados", value: counters.supportFinished || 0, icon: <CheckCircleIcon style={{ color: "#5852ab" }} />, color: "#5852ab" },
                  { label: "Grupos", value: counters.supportGroups || 0, icon: <Groups style={{ color: "#01BBAC" }} />, color: "#01BBAC" },
                  { label: "Atendentes Ativos", value: `${GetUsers()}/${attendants.length}`, icon: <RecordVoiceOverIcon style={{ color: "#805753" }} />, color: "#805753" },
                  { label: "Novos Contatos", value: counters.leads || 0, icon: <GroupAddIcon style={{ color: "#8c6b19" }} />, color: "#8c6b19" },
                  { label: "Mensagens Recebidas", value: `${GetMessages(false, false)}/${GetMessages(true, false)}`, icon: <MessageIcon style={{ color: "#333133" }} />, color: "#333133" },
                  { label: "Mensagens Enviadas", value: `${GetMessages(false, true)}/${GetMessages(true, true)}`, icon: <SendIcon style={{ color: "#558a59" }} />, color: "#558a59" },
                  { label: "T.M. de Atendimento", value: formatTime(counters.avgSupportTime), icon: <AccessAlarmIcon style={{ color: "#F79009" }} />, color: "#F79009" },
                  { label: "T.M. de Espera", value: formatTime(counters.avgWaitTime), icon: <TimerIcon style={{ color: "#8a2c40" }} />, color: "#8a2c40" },
                  { label: "Tickets Ativos", value: counters.activeTickets || 0, icon: <ArrowUpward style={{ color: "#EE4512" }} />, color: "#EE4512" },
                  { label: "Tickets Passivos", value: counters.passiveTickets || 0, icon: <ArrowDownward style={{ color: "#28C037" }} />, color: "#28C037" },
                ].map((indicator, index) => (
                  <Grid2 item xs={12} sm={6} md={4} lg={3} key={index}>
                    <Paper className={classes.indicatorCard}>
                      <Box display="flex" alignItems="center">
                        <Box 
                          className={classes.indicatorIcon}
                          style={{ 
                            backgroundColor: `${indicator.color}15`,
                            color: indicator.color 
                          }}
                        >
                          {indicator.icon}
                        </Box>
                        <Box flex={1}>
                          <Typography variant="h6" style={{ fontWeight: 600, fontSize: '1.5rem', marginBottom: 4 }}>
                            {indicator.value}
                          </Typography>
                          <Typography variant="body2" style={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>
                            {indicator.label}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid2>
                ))}

                {/* Pesquisa de Satisfação (NPS) */}
                <Grid2 item xs={12} className={classes.sectionHeader}>
                  <Typography variant="h5" className={classes.sectionTitle}>
                    Pesquisa de Satisfação
                  </Typography>
                </Grid2>
                {["Score", "Promotores", "Neutros", "Detratores"].map((label, index) => {
                  const value = label === "Score" ? counters.npsScore || 0 :
                    label === "Promotores" ? counters.npsPromotersPerc || 0 :
                      label === "Neutros" ? counters.npsPassivePerc || 0 :
                        counters.npsDetractorsPerc || 0;
                  const bgColor = label === "Promotores" ? "#2EA85A" :
                    label === "Neutros" ? "#F7EC2C" :
                      label === "Detratores" ? "#F73A2C" : "#3b82f6";
                  
                  return (
                    <Grid2 item xs={12} md={6} lg={3} key={index}>
                      <Paper className={classes.paper}>
                        <Box className={classes.barContainer}>
                          <Typography className={classes.progressLabel} style={{ minWidth: 100 }}>
                            {label}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={value}
                            className={classes.progressBar}
                            style={{
                              backgroundColor: `${bgColor}20`,
                              "& .MuiLinearProgress-bar": {
                                backgroundColor: bgColor,
                              },
                            }}
                            sx={{
                              "& .MuiLinearProgress-bar": {
                                backgroundColor: bgColor,
                              },
                            }}
                          />
                          <Typography className={classes.progressValue}>
                            {value}%
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid2>
                  );
                })}

                {/* Informações de Atendimento */}
                <Grid2 item xs={12} className={classes.sectionHeader}>
                  <Typography variant="h5" className={classes.sectionTitle}>
                    Atendimentos
                  </Typography>
                </Grid2>
                {[
                  { label: "Total de Atendimentos", value: counters.tickets || 0, icon: <CallIcon style={{ color: '#01BBAC' }} />, color: '#01BBAC' },
                  { label: "Aguardando avaliação", value: counters.waitRating || 0, icon: <HourglassEmptyIcon style={{ color: '#47606e' }} />, color: '#47606e' },
                  { label: "Sem avaliação", value: counters.withoutRating || 0, icon: <ErrorOutlineIcon style={{ color: '#8a2c40' }} />, color: '#8a2c40' },
                  { label: "Avaliados", value: counters.withRating || 0, icon: <CheckCircleOutlineIcon style={{ color: '#805753' }} />, color: '#805753' },
                ].map((attInfo, index) => (
                  <Grid2 item xs={12} sm={6} md={3} key={index}>
                    <Paper className={classes.infoCard}>
                      <Box display="flex" alignItems="center">
                        <Box 
                          className={classes.infoIcon}
                          style={{ 
                            backgroundColor: `${attInfo.color}15`,
                            color: attInfo.color 
                          }}
                        >
                          {attInfo.icon}
                        </Box>
                        <Box flex={1}>
                          <Typography variant="h6" style={{ fontWeight: 600, fontSize: '1.5rem', marginBottom: 4 }}>
                            {attInfo.value}
                          </Typography>
                          <Typography variant="body2" style={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>
                            {attInfo.label}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid2>
                ))}

                {/* Índice de Avaliação */}
                <Grid2 item xs={12} className={classes.sectionHeader}>
                  <Typography variant="h5" className={classes.sectionTitle}>
                    Índice de Avaliação
                  </Typography>
                  <Grid2 container alignItems="center" spacing={2} style={{ marginTop: 16 }}>
                    <Grid2 item xs={12} sm={3} md={2}>
                      <Paper 
                        className={classes.infoCard} 
                        style={{ 
                          textAlign: 'center', 
                          padding: '16px',
                          background: 'linear-gradient(135deg, #FFE3B3 0%, #FFD89B 100%)',
                          border: 'none',
                        }}
                      >
                        <Typography variant="h5" style={{ color: '#F79009', fontWeight: 700 }}>
                          {Number(counters.percRating / 100).toLocaleString(undefined, { style: 'percent' }) || "0%"}
                        </Typography>
                      </Paper>
                    </Grid2>
                    <Grid2 item xs={12} sm={9} md={10}>
                      <LinearProgress
                        variant="determinate"
                        value={counters.percRating || 0}
                        className={classes.progressBar}
                        style={{ 
                          backgroundColor: theme.palette.mode === 'light' ? "#e0e0e0" : "rgba(255, 255, 255, 0.1)", 
                          height: 12, 
                          borderRadius: 8 
                        }}
                        sx={{
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: "#F79009",
                            borderRadius: 8,
                          },
                        }}
                      />
                    </Grid2>
                  </Grid2>
                </Grid2>

                {/* Tabela de Atendentes */}
                <Grid2 item xs={12} className={classes.sectionHeader}>
                  <Typography variant="h5" className={classes.sectionTitle}>
                    Atendentes
                  </Typography>
                  <Paper className={classes.paper} style={{ marginTop: 8 }}>
                    <TableAttendantsStatus
                      attendants={attendants}
                      loading={loading}
                    />
                  </Paper>
                </Grid2>

                {/* Gráficos */}
                <Grid2 item xs={12} className={classes.sectionHeader}>
                  <Typography variant="h5" className={classes.sectionTitle}>
                    Análises e Gráficos
                  </Typography>
                </Grid2>
                <Grid2 container spacing={3} item xs={12}>
                  <Grid2 item xs={12} md={6}>
                    <Paper className={classes.paper}>
                      <ChatsUser />
                    </Paper>
                  </Grid2>
                  <Grid2 item xs={12} md={6}>
                    <Paper className={classes.paper}>
                      <ChartsDate />
                    </Paper>
                  </Grid2>
                </Grid2>
              </Grid2>
            </Container>
          </Paper>
        </MainContainer>
      )}
    </>
  );
};

export default Dashboard;