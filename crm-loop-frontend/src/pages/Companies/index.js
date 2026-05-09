import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
// import { SocketContext } from "../../context/Socket/SocketContext";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import { 
  Box, 
  Typography, 
  Chip, 
  Card, 
  CardContent, 
  IconButton, 
  Menu, 
  MenuItem, 
  TextField,
  InputAdornment,
  Tooltip,
  Divider,
} from "@material-ui/core";
import {
  MoreVert,
  Edit,
  Block,
  CheckCircle,
  TrendingUp,
  Search,
  Business,
  Email,
  CalendarToday,
  Storage,
  AttachFile,
  Update,
  Receipt,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";

import Title from "../../components/Title";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import CompanyModal from "../../components/CompaniesModal";
import InvoiceModal from "../../components/InvoiceModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useDate } from "../../hooks/useDate";
import usePlans from "../../hooks/usePlans";
import moment from "moment";
import ColorModeContext from "../../layout/themeContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_COMPANIES") {
    const companies = action.payload;
    const newCompanies = [];

    companies.forEach((company) => {
      const companyIndex = state.findIndex((u) => u.id === company.id);
      if (companyIndex !== -1) {
        state[companyIndex] = company;
      } else {
        newCompanies.push(company);
      }
    });

    return [...state, ...newCompanies];
  }

  if (action.type === "UPDATE_COMPANIES") {
    const company = action.payload;
    const companyIndex = state.findIndex((u) => u.id === company.id);

    if (companyIndex !== -1) {
      state[companyIndex] = company;
      return [...state];
    } else {
      return [company, ...state];
    }
  }

  if (action.type === "DELETE_COMPANIES") {
    const companyId = action.payload;

    const companyIndex = state.findIndex((u) => u.id === companyId);
    if (companyIndex !== -1) {
      state.splice(companyIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "auto",
    overflowX: "hidden",
    ...theme.scrollbarStyles,
    backgroundColor: "transparent",
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "100%",
  },
  headerContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(2),
    paddingBottom: theme.spacing(1.5),
    borderBottom: `2px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
    width: "100%",
    boxSizing: "border-box",
  },
  headerTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: theme.palette.text.primary,
    letterSpacing: "-0.5px",
    fontFamily: "'Inter', sans-serif",
  },
  searchContainer: {
    marginBottom: theme.spacing(2),
  },
  searchField: {
    '& .MuiOutlinedInput-root': {
      borderRadius: 12,
      backgroundColor: theme.palette.background.paper,
    },
  },
  cardsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      gridTemplateColumns: '1fr',
    },
  },
  companyCard: {
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
    border: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'}`,
    transition: 'all 0.2s ease',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
      transform: 'translateY(-2px)',
    },
    position: 'relative',
    overflow: 'visible',
  },
  cardWarning: {
    borderLeft: `4px solid #fbbf24`,
  },
  cardExpired: {
    borderLeft: `4px solid #ef4444`,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(1.5),
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  cardActions: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
  },
  cardContent: {
    padding: theme.spacing(2),
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
    fontSize: '0.875rem',
  },
  infoLabel: {
    color: theme.palette.text.secondary,
    minWidth: 100,
    fontSize: '0.875rem',
  },
  infoValue: {
    color: theme.palette.text.primary,
    fontWeight: 500,
    fontSize: '0.875rem',
  },
  planBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: theme.spacing(0.5, 1),
    borderRadius: 8,
    backgroundColor: theme.palette.primary.main + '15',
    color: theme.palette.primary.main,
    fontSize: '0.75rem',
    fontWeight: 600,
    marginTop: theme.spacing(1),
  },
  metricsContainer: {
    display: 'flex',
    gap: theme.spacing(2),
    marginTop: theme.spacing(1.5),
    paddingTop: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'}`,
  },
  metricItem: {
    flex: 1,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  metricLabel: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
  },
  actionButtons: {
    display: 'flex',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'}`,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: '1 1 auto',
    minWidth: '80px',
    textTransform: 'none',
    borderRadius: 8,
    padding: theme.spacing(0.75),
    fontSize: '0.875rem',
  },
  statusChip: {
    fontWeight: 500,
    borderRadius: 8,
    padding: "4px 12px",
    fontSize: "0.75rem",
  },
}));

const Companies = () => {
  const classes = useStyles();
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [deletingCompany, setDeletingCompany] = useState(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedCompanyForInvoices, setSelectedCompanyForInvoices] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [companies, dispatch] = useReducer(reducer, []);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCompanyForAction, setSelectedCompanyForAction] = useState(null);
  const { dateToClient, datetimeToClient } = useDate();

  // const { getPlanCompany } = usePlans();
  //   const socketManager = useContext(SocketContext);
  const { user, socket } = useContext(AuthContext);
  const { mode } = useContext(ColorModeContext);
  const theme = useTheme();

  useEffect(() => {
    async function fetchData() {
      if (!user.super) {
        toast.error(
          "Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando."
        );
        setTimeout(() => {
          history.push(`/`);
        }, 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchCompanies = async () => {
        try {
          const { data } = await api.get("/companiesPlan/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_COMPANIES", payload: data.companies });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchCompanies();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  const handleOpenCompanyModal = () => {
    setSelectedCompany(null);
    setCompanyModalOpen(true);
  };

  const handleCloseCompanyModal = () => {
    setSelectedCompany(null);
    setCompanyModalOpen(false);
    // Recarregar empresas após fechar o modal
    dispatch({ type: "RESET" });
    setPageNumber(1);
    const fetchCompanies = async () => {
      try {
        const { data } = await api.get("/companiesPlan/", {
          params: { searchParam, pageNumber: 1 },
        });
        dispatch({ type: "LOAD_COMPANIES", payload: data.companies });
        setHasMore(data.hasMore);
      } catch (err) {
        toastError(err);
      }
    };
    fetchCompanies();
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleMenuOpen = (event, company) => {
    setAnchorEl(event.currentTarget);
    setSelectedCompanyForAction(company);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCompanyForAction(null);
  };

  const handleToggleStatus = async (company) => {
    if (!company) return;
    
    try {
      // Determinar o status atual (considerando null/undefined como ativo)
      const currentStatus = company.status === false ? false : true;
      const newStatus = !currentStatus;
      
      await api.put(`/companies/${company.id}`, {
        status: newStatus,
      });
      
      // Atualizar o estado local
      const updatedCompany = { ...company, status: newStatus };
      dispatch({ 
        type: "UPDATE_COMPANIES", 
        payload: updatedCompany
      });
      
      toast.success(
        newStatus 
          ? "Empresa ativada com sucesso!" 
          : "Empresa desativada com sucesso!"
      );
    } catch (err) {
      toastError(err);
      toast.error("Erro ao alterar status da empresa");
    }
    handleMenuClose();
  };

  const handleUpgradePlan = (company) => {
    setSelectedCompany(company);
    setCompanyModalOpen(true);
    handleMenuClose();
  };

  const handleViewInvoices = (company) => {
    setSelectedCompanyForInvoices(company);
    setInvoiceModalOpen(true);
    handleMenuClose();
  };

  const handleCloseInvoiceModal = () => {
    setSelectedCompanyForInvoices(null);
    setInvoiceModalOpen(false);
  };

  const handleEditCompany = (company) => {
    setSelectedCompany(company);
    setCompanyModalOpen(true);
  };

  const handleDeleteCompany = async (companyId) => {
    try {
      await api.delete(`/companies/${companyId}`);
      dispatch({ type: "DELETE_COMPANIES", payload: companyId });
      toast.success(i18n.t("compaies.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingCompany(null);
    setConfirmModalOpen(false);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const renderStatus = (row) => {
    return row.status === false ? "Não" : "Sim";
  };

  const renderPlanValue = (row) => {
    return row.planId !== null
      ? row.plan.amount
        ? row.plan.amount.toLocaleString("pt-br", { minimumFractionDigits: 2 })
        : "00.00"
      : "-";
  };

  const renderWhatsapp = (row) => {
    return row.useWhatsapp === false ? "Não" : "Sim";
  };

  const renderFacebook = (row) => {
    return row.useFacebook === false ? "Não" : "Sim";
  };

  const renderInstagram = (row) => {
    return row.useInstagram === false ? "Não" : "Sim";
  };

  const renderCampaigns = (row) => {
    return row.useCampaigns === false ? "Não" : "Sim";
  };

  const renderSchedules = (row) => {
    return row.useSchedules === false ? "Não" : "Sim";
  };

  const renderInternalChat = (row) => {
    return row.useInternalChat === false ? "Não" : "Sim";
  };

  const renderExternalApi = (row) => {
    return row.useExternalApi === false ? "Não" : "Sim";
  };


  const formatFolderSize = (size) => {
    if (!size || size === 0) return '0 Bytes';
    
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    let formattedSize = size;

    while (formattedSize >= 1024 && index < units.length - 1) {
        formattedSize /= 1024;
        index++;
    }

    return `${formattedSize.toFixed(2)} ${units[index]}`;
};

  const getCardClassName = (company) => {
    if (moment(company.dueDate).isValid()) {
      const now = moment();
      const dueDate = moment(company.dueDate);
      const diff = dueDate.diff(now, "days");
      if (diff >= 1 && diff <= 5) {
        return classes.cardWarning;
      }
      if (diff <= 0) {
        return classes.cardExpired;
      }
    }
    return "";
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingCompany &&
          `${i18n.t("compaies.confirmationModal.deleteTitle")} ${
            deletingCompany.name
          }?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteCompany(deletingCompany.id)}
      >
        {i18n.t("compaies.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <CompanyModal
        open={companyModalOpen}
        onClose={handleCloseCompanyModal}
        aria-labelledby="form-dialog-title"
        companyId={selectedCompany && selectedCompany.id}
      />
      <InvoiceModal
        open={invoiceModalOpen}
        onClose={handleCloseInvoiceModal}
        company={selectedCompanyForInvoices}
      />
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleEditCompany(selectedCompanyForAction)}>
          <Edit style={{ marginRight: theme.spacing(1) }} fontSize="small" />
          Editar Empresa
        </MenuItem>
        <MenuItem onClick={() => handleViewInvoices(selectedCompanyForAction)}>
          <Receipt style={{ marginRight: theme.spacing(1) }} fontSize="small" />
          {i18n.t("invoices.modal.actions.viewInvoices")}
        </MenuItem>
        <MenuItem onClick={() => handleUpgradePlan(selectedCompanyForAction)}>
          <TrendingUp style={{ marginRight: theme.spacing(1) }} fontSize="small" />
          Alterar Plano
        </MenuItem>
        <MenuItem onClick={() => handleToggleStatus(selectedCompanyForAction)}>
          {(selectedCompanyForAction?.status === true || selectedCompanyForAction?.status === null || selectedCompanyForAction?.status === undefined) ? (
            <>
              <Block style={{ marginRight: theme.spacing(1) }} fontSize="small" />
              Desativar
            </>
          ) : (
            <>
              <CheckCircle style={{ marginRight: theme.spacing(1) }} fontSize="small" />
              Ativar
            </>
          )}
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => {
            setDeletingCompany(selectedCompanyForAction);
            setConfirmModalOpen(true);
            handleMenuClose();
          }}
          style={{ color: theme.palette.error.main }}
        >
          Excluir
        </MenuItem>
      </Menu>

      <Box className={classes.headerContainer}>
        <Typography className={classes.headerTitle}>
          {i18n.t("compaies.title")} ({companies.length})
        </Typography>
      </Box>

      <Box className={classes.searchContainer}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar empresas..."
          value={searchParam}
          onChange={handleSearch}
          className={classes.searchField}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Box className={classes.cardsContainer}>
          {companies.map((company) => {
            const isActive = company.status === true || company.status === null || company.status === undefined;
            const cardClassName = `${classes.companyCard} ${getCardClassName(company)}`;

            return (
              <Card key={company.id} className={cardClassName}>
                <CardContent className={classes.cardContent}>
                  <Box className={classes.cardHeader}>
                    <Box className={classes.cardTitle}>
                      <Business fontSize="small" />
                      <Typography variant="h6" style={{ fontWeight: 600 }}>
                        {company.name}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      className={classes.cardActions}
                      onClick={(e) => handleMenuOpen(e, company)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  <Chip
                    label={isActive ? "Ativo" : "Inativo"}
                    className={classes.statusChip}
                    style={{
                      backgroundColor: isActive ? "#22c55e15" : "#ef444415",
                      color: isActive ? "#22c55e" : "#ef4444",
                    }}
                  />

                  <Box style={{ marginTop: theme.spacing(1.5) }}>
                    <Box className={classes.infoRow}>
                      <Email fontSize="small" style={{ color: theme.palette.text.secondary }} />
                      <Typography className={classes.infoValue}>
                        {company.email}
                      </Typography>
                    </Box>

                    <Box className={classes.infoRow}>
                      <Typography className={classes.infoLabel}>ID:</Typography>
                      <Typography className={classes.infoValue}>
                        #{company.id}
                      </Typography>
                    </Box>

                    <Box className={classes.infoRow}>
                      <Typography className={classes.infoLabel}>Plano:</Typography>
                      <Typography className={classes.infoValue}>
                        {company?.plan?.name || "Sem plano"}
                      </Typography>
                    </Box>

                    <Box className={classes.infoRow}>
                      <Typography className={classes.infoLabel}>Valor:</Typography>
                      <Typography className={classes.infoValue} style={{ fontWeight: 600, color: theme.palette.primary.main }}>
                        R$ {renderPlanValue(company)}
                      </Typography>
                    </Box>

                    <Box className={classes.infoRow}>
                      <CalendarToday fontSize="small" style={{ color: theme.palette.text.secondary }} />
                      <Typography className={classes.infoValue}>
                        Vencimento: {dateToClient(company.dueDate)}
                      </Typography>
                    </Box>

                    {company.recurrence && (
                      <Box className={classes.infoRow}>
                        <Typography variant="caption" style={{ color: theme.palette.text.secondary }}>
                          {company.recurrence}
                        </Typography>
                      </Box>
                    )}

                    <Box className={classes.metricsContainer}>
                      <Box className={classes.metricItem}>
                        <Typography className={classes.metricValue}>
                          {formatFolderSize(company?.metrics?.folderSize || 0)}
                        </Typography>
                        <Typography className={classes.metricLabel}>
                          <Storage fontSize="small" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          Armazenamento
                        </Typography>
                      </Box>
                      <Box className={classes.metricItem}>
                        <Typography className={classes.metricValue}>
                          {company?.metrics?.numberOfFiles || 0}
                        </Typography>
                        <Typography className={classes.metricLabel}>
                          <AttachFile fontSize="small" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          Arquivos
                        </Typography>
                      </Box>
                    </Box>

                    <Box className={classes.infoRow} style={{ marginTop: theme.spacing(1) }}>
                      <Update fontSize="small" style={{ color: theme.palette.text.secondary }} />
                      <Typography variant="caption" style={{ color: theme.palette.text.secondary }}>
                        Último login: {datetimeToClient(company.lastLogin)}
                      </Typography>
                    </Box>

                    <Box className={classes.actionButtons}>
                      <Button
                        variant="outlined"
                        size="small"
                        className={classes.actionButton}
                        startIcon={<Edit />}
                        onClick={() => handleEditCompany(company)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        className={classes.actionButton}
                        startIcon={<Receipt />}
                        onClick={() => handleViewInvoices(company)}
                      >
                        Faturas
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        className={classes.actionButton}
                        startIcon={<TrendingUp />}
                        onClick={() => handleUpgradePlan(company)}
                      >
                        Plano
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
          {loading && (
            <Card className={classes.companyCard}>
              <CardContent>
                <Typography>Carregando...</Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Paper>
    </MainContainer>
  );
};

export default Companies;