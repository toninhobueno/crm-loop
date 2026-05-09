import React, { useState, useCallback, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { format, parseISO, set } from "date-fns";

import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import { Stack, Box, Chip } from "@mui/material";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { useHistory } from "react-router-dom";
import { green } from "@material-ui/core/colors";
import {
  Button,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Table,
  TableHead,
  Paper,
  Tooltip,
  Typography,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@material-ui/core";
import Grid2 from "@mui/material/Unstable_Grid2/Grid2";
import {
  Edit,
  CheckCircle,
  SignalCellularConnectedNoInternet2Bar,
  SignalCellularConnectedNoInternet0Bar,
  SignalCellular4Bar,
  CropFree,
  DeleteOutline,
  Facebook,
  Instagram,
  WhatsApp,
  MoreVert,
  PersonAdd,
  Settings,
  Close,
} from "@material-ui/icons";

import FacebookLogin from "react-facebook-login/dist/facebook-login-render-props";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import { AuthContext } from "../../context/Auth/AuthContext";
import useCompanies from "../../hooks/useCompanies";
import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import WhatsAppModalCompany from "../../components/CompanyWhatsapps";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";
import ForbiddenPage from "../../components/ForbiddenPage";

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
  customTableCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tooltip: {
    backgroundColor: "#f5f5f9",
    color: "rgba(0, 0, 0, 0.87)",
    fontSize: theme.typography.pxToRem(14),
    border: "1px solid #dadde9",
    maxWidth: 450,
  },
  tooltipPopper: {
    textAlign: "center",
  },
  buttonProgress: {
    color: green[500],
  },
  headerContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing(3),
    paddingBottom: theme.spacing(2),
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
    marginBottom: theme.spacing(0.5),
  },
  headerSubtitle: {
    fontSize: "0.875rem",
    color: theme.palette.text.secondary,
    fontWeight: 400,
  },
  tableContainer: {
    borderRadius: 12,
    overflow: "hidden",
    overflowX: "auto",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)",
    border: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'}`,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  tableHead: {
    backgroundColor: theme.palette.mode === 'light' ? '#f8f9fa' : 'rgba(255, 255, 255, 0.03)',
    "& .MuiTableCell-head": {
      fontWeight: 600,
      fontSize: "0.875rem",
      color: theme.palette.text.primary,
      borderBottom: `2px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
      padding: theme.spacing(1.5),
      whiteSpace: "nowrap",
    },
  },
  tableHeadTotal: {
    backgroundColor: theme.palette.primary.main,
    "& .MuiTableCell-root": {
      color: "#fff",
      fontWeight: 700,
      fontSize: "0.875rem",
      padding: theme.spacing(1.5),
    },
  },
  tableRow: {
    "&:hover": {
      backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
    },
    transition: "background-color 0.2s ease",
  },
  tableCell: {
    borderBottom: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'}`,
    padding: theme.spacing(1.5),
    fontSize: "0.875rem",
  },
  companyName: {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  actionIconButton: {
    padding: theme.spacing(0.5),
    margin: theme.spacing(0, 0.25),
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
      transform: "scale(1.1)",
    },
  },
  // Responsividade
  [theme.breakpoints.down("md")]: {
    mainPaper: {
      padding: theme.spacing(1.5),
    },
    headerTitle: {
      fontSize: "1.25rem",
    },
    tableHead: {
      "& .MuiTableCell-head": {
        fontSize: "0.75rem",
        padding: theme.spacing(1),
      },
    },
    tableCell: {
      padding: theme.spacing(1),
      fontSize: "0.8rem",
    },
  },
  [theme.breakpoints.down("sm")]: {
    mainPaper: {
      padding: theme.spacing(1),
    },
    headerContainer: {
      flexDirection: "column",
      alignItems: "flex-start",
      gap: theme.spacing(1),
    },
    headerTitle: {
      fontSize: "1.125rem",
      width: "100%",
    },
    headerSubtitle: {
      fontSize: "0.8rem",
    },
    tableContainer: {
      borderRadius: 8,
    },
    tableHead: {
      "& .MuiTableCell-head": {
        fontSize: "0.7rem",
        padding: theme.spacing(0.75),
      },
    },
    tableCell: {
      padding: theme.spacing(0.75),
      fontSize: "0.75rem",
    },
    actionIconButton: {
      padding: theme.spacing(0.4),
      margin: theme.spacing(0, 0.2),
    },
  },
}));

const CustomToolTip = ({ title, content, children }) => {
  const classes = useStyles();

  return (
    <Tooltip
      arrow
      classes={{
        tooltip: classes.tooltip,
        popper: classes.tooltipPopper,
      }}
      title={
        <React.Fragment>
          <Typography gutterBottom color="inherit">
            {title}
          </Typography>
          {content && <Typography>{content}</Typography>}
        </React.Fragment>
      }
    >
      {children}
    </Tooltip>
  );
};

const IconChannel = (channel) => {
  switch (channel) {
    case "facebook":
      return <Facebook />;
    case "instagram":
      return <Instagram />;
    case "whatsapp":
      return <WhatsApp />;
    default:
      return "error";
  }
};

const CreateUserForm = ({ onSubmit, loading, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box display="flex" flexDirection="column" gap={2} p={2}>
        <TextField
          label="Nome *"
          name="name"
          value={formData.name}
          onChange={handleChange}
          fullWidth
          required
          variant="outlined"
          disabled={loading}
        />
        <TextField
          label="Email *"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          fullWidth
          required
          variant="outlined"
          disabled={loading}
        />
        <TextField
          label="Senha *"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          fullWidth
          required
          variant="outlined"
          disabled={loading}
          helperText="Mínimo de 5 caracteres"
        />
        <TextField
          label="Telefone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          fullWidth
          variant="outlined"
          disabled={loading}
          placeholder="(00) 00000-0000"
        />
        <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
          <Button
            onClick={onCancel}
            disabled={loading}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Criar Usuário"}
          </Button>
        </Box>
      </Box>
    </form>
  );
};

const AllConnections = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { user, socket } = useContext(AuthContext);
  const { list } = useCompanies();
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);
  const [loadingComp, setLoadingComp] = useState(false);
  const [whats, setWhats] = useState([]);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [filterConnections, setFilterConnections] = useState([]);
  const [companyWhatsApps, setCompanyWhatsApps] = useState(null);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [selectedCompanyForUser, setSelectedCompanyForUser] = useState(null);
  const [loadingCreateUser, setLoadingCreateUser] = useState(false);
  const confirmationModalInitialState = {
    action: "",
    title: "",
    message: "",
    whatsAppId: "",
    open: false,
  };
  const [confirmModalInfo, setConfirmModalInfo] = useState(
    confirmationModalInitialState
  );

  const history = useHistory();
  if (!user.super) {
    history.push("/tickets");
  }

  useEffect(() => {
    setLoadingWhatsapp(true);
    const fetchSession = async () => {
      try {
        const { data } = await api.get("/whatsapp/all/?session=0");
        setWhats(data);
        setLoadingWhatsapp(false);
      } catch (err) {
        setLoadingWhatsapp(false);
        toastError(err);
      }
    };
    fetchSession();
  }, []);

  const responseFacebook = (response) => {
    if (response.status !== "unknown") {
      const { accessToken, id } = response;

      api
        .post("/facebook", {
          facebookUserId: id,
          facebookUserToken: accessToken,
        })
        .then((response) => {
          toast.success(i18n.t("connections.facebook.success"));
        })
        .catch((error) => {
          toastError(error);
        });
    }
  };
  useEffect(() => {
    loadCompanies();
  }, []);
  const loadCompanies = async () => {
    setLoadingComp(true);
    try {
      const companyList = await list();
      setCompanies(companyList);
    } catch (e) {
      toast.error("Não foi possível carregar a lista de registros");
    }
    setLoadingComp(false);
  };

  const responseInstagram = (response) => {
    if (response.status !== "unknown") {
      const { accessToken, id } = response;

      api
        .post("/facebook", {
          addInstagram: true,
          facebookUserId: id,
          facebookUserToken: accessToken,
        })
        .then((response) => {
          toast.success(i18n.t("connections.facebook.success"));
        })
        .catch((error) => {
          toastError(error);
        });
    }
  };

  const handleStartWhatsAppSession = async (whatsAppId) => {
    try {
      await api.post(`/whatsappsession/${whatsAppId}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleRequestNewQrCode = async (whatsAppId) => {
    try {
      await api.put(`/whatsappsession/${whatsAppId}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenWhatsAppModal = (whatsappsFilter, comp) => {
    setSelectedWhatsApp(null);
    setWhatsAppModalOpen(true);
    if (whatsappsFilter?.length > 0) {
      setFilterConnections(whatsappsFilter);
      setCompanyWhatsApps(comp);
    }
  };

  const handleCloseWhatsAppModal = useCallback(() => {
    setWhatsAppModalOpen(false);
    setSelectedWhatsApp(null);
    setFilterConnections([]);
    setCompanyWhatsApps(null);
  }, [setSelectedWhatsApp, setWhatsAppModalOpen]);

  const handleOpenCreateUserModal = (company) => {
    setSelectedCompanyForUser(company);
    setCreateUserModalOpen(true);
  };

  const handleCloseCreateUserModal = useCallback(() => {
    setCreateUserModalOpen(false);
    setSelectedCompanyForUser(null);
  }, []);

  const handleCreateUser = async (userData) => {
    if (!selectedCompanyForUser) return;
    
    setLoadingCreateUser(true);
    try {
      const response = await api.post("/users", {
        ...userData,
        companyId: selectedCompanyForUser.id,
        profile: "admin"
      });
      toast.success(`Usuário ${response.data.user.name} criado com sucesso!`);
      handleCloseCreateUserModal();
    } catch (err) {
      toastError(err);
    }
    setLoadingCreateUser(false);
  };

  const handleOpenQrModal = (whatsApp) => {
    setSelectedWhatsApp(whatsApp);
    setQrModalOpen(true);
  };

  const handleCloseQrModal = useCallback(() => {
    setSelectedWhatsApp(null);
    setQrModalOpen(false);
  }, [setQrModalOpen, setSelectedWhatsApp]);

  const handleEditWhatsApp = (whatsApp) => {
    setSelectedWhatsApp(whatsApp);
    setWhatsAppModalOpen(true);
  };

  const handleOpenConfirmationModal = (action, whatsAppId) => {
    if (action === "disconnect") {
      setConfirmModalInfo({
        action: action,
        title: i18n.t("connections.confirmationModal.disconnectTitle"),
        message: i18n.t("connections.confirmationModal.disconnectMessage"),
        whatsAppId: whatsAppId,
      });
    }

    if (action === "delete") {
      setConfirmModalInfo({
        action: action,
        title: i18n.t("connections.confirmationModal.deleteTitle"),
        message: i18n.t("connections.confirmationModal.deleteMessage"),
        whatsAppId: whatsAppId,
      });
    }
    setConfirmModalOpen(true);
  };

  const handleSubmitConfirmationModal = async () => {
    if (confirmModalInfo.action === "disconnect") {
      try {
        await api.delete(`/whatsappsession/${confirmModalInfo.whatsAppId}`);
      } catch (err) {
        toastError(err);
      }
    }

    if (confirmModalInfo.action === "delete") {
      try {
        await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
        toast.success(i18n.t("connections.toasts.deleted"));
      } catch (err) {
        toastError(err);
      }
    }

    setConfirmModalInfo(confirmationModalInitialState);
  };

  const renderActionButtons = (whatsApp) => {
    return (
      <>
        {whatsApp.status === "qrcode" && (
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => handleOpenQrModal(whatsApp)}
          >
            {i18n.t("connections.buttons.qrcode")}
          </Button>
        )}
        {whatsApp.status === "DISCONNECTED" && (
          <>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => handleStartWhatsAppSession(whatsApp.id)}
            >
              {i18n.t("connections.buttons.tryAgain")}
            </Button>{" "}
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={() => handleRequestNewQrCode(whatsApp.id)}
            >
              {i18n.t("connections.buttons.newQr")}
            </Button>
          </>
        )}
        {(whatsApp.status === "CONNECTED" ||
          whatsApp.status === "PAIRING" ||
          whatsApp.status === "TIMEOUT") && (
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            onClick={() => {
              handleOpenConfirmationModal("disconnect", whatsApp.id);
            }}
          >
            {i18n.t("connections.buttons.disconnect")}
          </Button>
        )}
        {whatsApp.status === "OPENING" && (
          <Button size="small" variant="outlined" disabled color="default">
            {i18n.t("connections.buttons.connecting")}
          </Button>
        )}
      </>
    );
  };

  const renderStatusToolTips = (whatsApp) => {
    return (
      <div className={classes.customTableCell}>
        {whatsApp.status === "DISCONNECTED" && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.disconnected.title")}
            content={i18n.t("connections.toolTips.disconnected.content")}
          >
            <SignalCellularConnectedNoInternet0Bar color="secondary" />
          </CustomToolTip>
        )}
        {whatsApp.status === "OPENING" && (
          <CircularProgress size={24} className={classes.buttonProgress} />
        )}
        {whatsApp.status === "qrcode" && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.qrcode.title")}
            content={i18n.t("connections.toolTips.qrcode.content")}
          >
            <CropFree />
          </CustomToolTip>
        )}
        {whatsApp.status === "CONNECTED" && (
          <CustomToolTip title={i18n.t("connections.toolTips.connected.title")}>
            <SignalCellular4Bar style={{ color: green[500] }} />
          </CustomToolTip>
        )}
        {(whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.timeout.title")}
            content={i18n.t("connections.toolTips.timeout.content")}
          >
            <SignalCellularConnectedNoInternet2Bar color="secondary" />
          </CustomToolTip>
        )}
      </div>
    );
  };
  return (
    <MainContainer>
      <ConfirmationModal
        title={confirmModalInfo.title}
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={handleSubmitConfirmationModal}
      >
        {confirmModalInfo.message}
      </ConfirmationModal>
      <QrcodeModal
        open={qrModalOpen}
        onClose={handleCloseQrModal}
        whatsAppId={!whatsAppModalOpen && selectedWhatsApp?.id}
      />
      <WhatsAppModalCompany
        open={whatsAppModalOpen}
        onClose={handleCloseWhatsAppModal}
        filteredWhatsapps={filterConnections}
        companyInfos={companyWhatsApps}
        whatsAppId={!qrModalOpen && selectedWhatsApp?.id}
      />

      <Dialog
        open={createUserModalOpen}
        onClose={handleCloseCreateUserModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Gerar Usuário Admin - {selectedCompanyForUser?.name || ""}
            </Typography>
            <IconButton onClick={handleCloseCreateUserModal} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <CreateUserForm 
            onSubmit={handleCreateUser}
            loading={loadingCreateUser}
            onCancel={handleCloseCreateUserModal}
          />
        </DialogContent>
      </Dialog>

      {user.profile === "user" ? (
        <ForbiddenPage />
      ) : (
        <>
          <Paper
            className={classes.mainPaper}
            variant="outlined"
          >
            <Box className={classes.headerContainer}>
              <Box>
                <Typography className={classes.headerTitle}>
                  {i18n.t("connections.title")}
                </Typography>
                <Typography className={classes.headerSubtitle}>
                  {i18n.t(
                    "connections.connectYourServiceChannelsToReceiveMessagesAndStartConversationsWithYourCustomers"
                  )}
                </Typography>
              </Box>
              <MainHeaderButtonsWrapper>
                <PopupState variant="popover" popupId="demo-popup-menu">
                  {(popupState) => (
                    <React.Fragment>

                      <Menu {...bindMenu(popupState)}>
                        <MenuItem
                          onClick={() => {
                            handleOpenWhatsAppModal();
                            popupState.close();
                          }}
                        >
                          <WhatsApp
                            fontSize="small"
                            style={{
                              marginRight: "10px",
                              color: "#25D366",
                            }}
                          />
                          WhatsApp
                        </MenuItem>
                        <FacebookLogin
                          appId={process.env.REACT_APP_FACEBOOK_APP_ID}
                          autoLoad={false}
                          fields="name,email,picture"
                          version="13.0"
                          scope="public_profile,pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement,business_management"
                          callback={responseFacebook}
                          render={(renderProps) => (
                            <MenuItem onClick={renderProps.onClick}>
                              <Facebook
                                fontSize="small"
                                style={{
                                  marginRight: "10px",
                                  color: "#3b5998",
                                }}
                              />
                              Facebook
                            </MenuItem>
                          )}
                        />
                        <FacebookLogin
                          appId={process.env.REACT_APP_FACEBOOK_APP_ID}
                          autoLoad={false}
                          fields="name,email,picture"
                          version="13.0"
                          scope="public_profile,instagram_basic,instagram_manage_messages,pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement,business_management"
                          callback={responseInstagram}
                          render={(renderProps) => (
                            <MenuItem onClick={renderProps.onClick}>
                              <Instagram
                                fontSize="small"
                                style={{
                                  marginRight: "10px",
                                  color: "#e1306c",
                                }}
                              />
                              Instagram
                            </MenuItem>
                          )}
                        />
                      </Menu>
                    </React.Fragment>
                  )}
                </PopupState>
              </MainHeaderButtonsWrapper>
            </Box>

            <Paper className={classes.tableContainer}>
              <Table>
                <TableHead className={classes.tableHead}>
                  <TableRow>
                    <TableCell align="left" className={classes.tableCell}>
                      {i18n.t("connections.client")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableCell}>
                      {i18n.t("connections.connectedConnections")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableCell}>
                      {i18n.t("connections.disconnectedConnections")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableCell}>
                      {i18n.t("connections.totalConnections")}
                    </TableCell>
                    {user.profile === "admin" && (
                      <TableCell align="center" className={classes.tableCell}>
                        {i18n.t("connections.table.actions")}
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingWhatsapp ? (
                    <TableRowSkeleton columns={user.profile === "admin" ? 5 : 4} />
                  ) : (
                    <>
                      {companies?.length > 0 &&
                        companies.map((company) => {
                          const connectedCount = whats?.length
                            ? whats.filter(
                                (item) =>
                                  item?.companyId === company?.id &&
                                  item?.status === "CONNECTED"
                              ).length
                            : 0;
                          const disconnectedCount = whats?.length
                            ? whats.filter(
                                (item) =>
                                  item?.companyId === company?.id &&
                                  item?.status !== "CONNECTED"
                              ).length
                            : 0;
                          const totalCount = whats?.length
                            ? whats.filter(
                                (item) => item?.companyId === company?.id
                              ).length
                            : 0;

                          return (
                            <TableRow key={company.id} className={classes.tableRow}>
                              <TableCell className={classes.tableCell} align="left">
                                <Typography variant="body2" className={classes.companyName}>
                                  {company?.name}
                                </Typography>
                              </TableCell>
                              <TableCell className={classes.tableCell} align="center">
                                <Chip
                                  label={connectedCount}
                                  size="small"
                                  style={{
                                    backgroundColor: "#22c55e15",
                                    color: "#22c55e",
                                    fontWeight: 600,
                                  }}
                                />
                              </TableCell>
                              <TableCell className={classes.tableCell} align="center">
                                <Chip
                                  label={disconnectedCount}
                                  size="small"
                                  style={{
                                    backgroundColor: "#ef444415",
                                    color: "#ef4444",
                                    fontWeight: 600,
                                  }}
                                />
                              </TableCell>
                              <TableCell className={classes.tableCell} align="center">
                                <Typography variant="body2" style={{ fontWeight: 600 }}>
                                  {totalCount}
                                </Typography>
                              </TableCell>
                              {user.profile === "admin" && (
                                <TableCell className={classes.tableCell} align="center">
                                  <PopupState variant="popover" popupId={`company-menu-${company.id}`}>
                                    {(popupState) => (
                                      <React.Fragment>
                                        <IconButton
                                          size="small"
                                          className={classes.actionIconButton}
                                          {...bindTrigger(popupState)}
                                        >
                                          <MoreVert />
                                        </IconButton>
                                        <Menu {...bindMenu(popupState)}>
                                          <MenuItem
                                            onClick={() => {
                                              handleOpenWhatsAppModal(
                                                whats.filter(
                                                  (item) =>
                                                    item?.companyId === company?.id
                                                ),
                                                company
                                              );
                                              popupState.close();
                                            }}
                                          >
                                            <Edit
                                              fontSize="small"
                                              style={{
                                                marginRight: theme.spacing(1),
                                                color: theme.palette.primary.main,
                                              }}
                                            />
                                            Editar Conexões
                                          </MenuItem>
                                          <MenuItem
                                            onClick={() => {
                                              handleOpenCreateUserModal(company);
                                              popupState.close();
                                            }}
                                          >
                                            <PersonAdd
                                              fontSize="small"
                                              style={{
                                                marginRight: theme.spacing(1),
                                                color: theme.palette.success.main,
                                              }}
                                            />
                                            Gerar Usuário
                                          </MenuItem>
                                          <MenuItem
                                            onClick={() => {
                                              toast.info(`Carregando configurações da empresa ${company.name}...`);
                                              history.push(`/companies?companyId=${company.id}`);
                                              popupState.close();
                                            }}
                                          >
                                            <Settings
                                              fontSize="small"
                                              style={{
                                                marginRight: theme.spacing(1),
                                                color: theme.palette.text.secondary,
                                              }}
                                            />
                                            Configurações da Empresa
                                          </MenuItem>
                                        </Menu>
                                      </React.Fragment>
                                    )}
                                  </PopupState>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      <TableRow className={classes.tableHeadTotal}>
                        <TableCell align="left" style={{ color: "#fff", fontWeight: 700 }}>
                          {i18n.t("connections.total")}
                        </TableCell>
                        <TableCell align="center" style={{ color: "#fff", fontWeight: 700 }}>
                          {whats?.length
                            ? whats.filter((item) => item?.status === "CONNECTED").length
                            : 0}
                        </TableCell>
                        <TableCell align="center" style={{ color: "#fff", fontWeight: 700 }}>
                          {whats?.length
                            ? whats.filter((item) => item?.status !== "CONNECTED").length
                            : 0}
                        </TableCell>
                        <TableCell align="center" style={{ color: "#fff", fontWeight: 700 }}>
                          {whats?.length ? whats.length : 0}
                        </TableCell>
                        {user.profile === "admin" && (
                          <TableCell align="center" style={{ color: "#fff", fontWeight: 700 }}>
                            -
                          </TableCell>
                        )}
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Paper>
        </>
      )}
    </MainContainer>
  );
};

export default AllConnections;
