import React, { useState, useCallback, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { add, format, parseISO } from "date-fns";

import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
// import { SocketContext } from "../../context/Socket/SocketContext";
import { makeStyles } from "@material-ui/core/styles";
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
  Box,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem as MuiMenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
} from "@material-ui/core";
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
  Sync,
  Phone,
} from "@material-ui/icons";
import WebhookIcon from '@mui/icons-material/Webhook';
import FacebookLogin from "react-facebook-login/dist/facebook-login-render-props";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";

import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";
import formatSerializedId from '../../utils/formatSerializedId';
import { AuthContext } from "../../context/Auth/AuthContext";
import usePlans from "../../hooks/usePlans";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import ForbiddenPage from "../../components/ForbiddenPage";
import { Can } from "../../components/Can";

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
    alignItems: "center",
    marginBottom: theme.spacing(2),
    paddingBottom: theme.spacing(1.5),
    borderBottom: `2px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
    flexWrap: "wrap",
    gap: theme.spacing(1),
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
  headerButtons: {
    display: "flex",
    gap: theme.spacing(1),
    flexWrap: "wrap",
  },
  actionButton: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 500,
    padding: theme.spacing(0.75, 1.5),
    fontSize: "0.875rem",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
    transition: "all 0.2s ease",
    "&:hover": {
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      transform: "translateY(-1px)",
    },
  },
  statusCard: {
    padding: theme.spacing(1.5),
    borderRadius: 12,
    backgroundColor: theme.palette.background.paper,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)",
    transition: "all 0.2s ease",
    height: "100%",
    "&:hover": {
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
      transform: "translateY(-2px)",
    },
  },
  statusCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(1),
  },
  statusCardValue: {
    fontSize: "1.5rem",
    fontWeight: 700,
    marginBottom: theme.spacing(0.25),
  },
  statusCardLabel: {
    fontSize: "0.75rem",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: theme.palette.text.secondary,
  },
  tableContainer: {
    marginTop: theme.spacing(2),
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
    },
  },
  tableRow: {
    "&:hover": {
      backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
    },
  },
  tableCell: {
    borderBottom: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'}`,
  },
  statusChip: {
    fontWeight: 500,
    borderRadius: 8,
    padding: "4px 12px",
    fontSize: "0.75rem",
  },
  channelIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    fontSize: "18px",
  },
  actionIconButton: {
    padding: theme.spacing(0.5),
    margin: theme.spacing(0, 0.5),
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
    headerButtons: {
      gap: theme.spacing(0.5),
    },
    actionButton: {
      padding: theme.spacing(0.5, 1),
      fontSize: "0.75rem",
    },
    statusCard: {
      padding: theme.spacing(1.25),
    },
    statusCardIcon: {
      width: 36,
      height: 36,
      marginBottom: theme.spacing(0.75),
    },
    statusCardValue: {
      fontSize: "1.25rem",
    },
    statusCardLabel: {
      fontSize: "0.7rem",
    },
    tableHead: {
      "& .MuiTableCell-head": {
        fontSize: "0.75rem",
        padding: theme.spacing(1),
      },
    },
    tableCell: {
      padding: theme.spacing(1),
      fontSize: "0.875rem",
    },
    channelIcon: {
      width: 28,
      height: 28,
      fontSize: "16px",
    },
    actionIconButton: {
      padding: theme.spacing(0.4),
      margin: theme.spacing(0, 0.25),
    },
  },
  [theme.breakpoints.down("sm")]: {
    mainPaper: {
      padding: theme.spacing(1),
    },
    headerContainer: {
      flexDirection: "column",
      alignItems: "flex-start",
      gap: theme.spacing(1.5),
    },
    headerTitle: {
      fontSize: "1.125rem",
      width: "100%",
    },
    headerButtons: {
      width: "100%",
      justifyContent: "flex-start",
      gap: theme.spacing(0.75),
    },
    actionButton: {
      padding: theme.spacing(0.5, 0.75),
      fontSize: "0.7rem",
      flex: "1 1 auto",
      minWidth: "auto",
    },
    statusCard: {
      padding: theme.spacing(1),
    },
    statusCardIcon: {
      width: 32,
      height: 32,
      marginBottom: theme.spacing(0.5),
    },
    statusCardValue: {
      fontSize: "1.125rem",
    },
    statusCardLabel: {
      fontSize: "0.65rem",
    },
    tableContainer: {
      marginTop: theme.spacing(1.5),
      borderRadius: 8,
    },
    tableHead: {
      "& .MuiTableCell-head": {
        fontSize: "0.7rem",
        padding: theme.spacing(0.75),
        whiteSpace: "nowrap",
      },
    },
    tableCell: {
      padding: theme.spacing(0.75),
      fontSize: "0.8rem",
    },
    statusChip: {
      fontSize: "0.65rem",
      padding: "2px 8px",
    },
    channelIcon: {
      width: 24,
      height: 24,
      fontSize: "14px",
    },
    actionIconButton: {
      padding: theme.spacing(0.3),
      margin: theme.spacing(0, 0.2),
      "& svg": {
        fontSize: "18px",
      },
    },
  },
  [theme.breakpoints.down("xs")]: {
    headerButtons: {
      flexDirection: "column",
      width: "100%",
    },
    actionButton: {
      width: "100%",
      justifyContent: "center",
    },
    tableHead: {
      "& .MuiTableCell-head": {
        fontSize: "0.65rem",
        padding: theme.spacing(0.5),
      },
    },
    tableCell: {
      padding: theme.spacing(0.5),
      fontSize: "0.75rem",
    },
  },
}));

function CircularProgressWithLabel(props) {
  return (
    <Box position="relative" display="inline-flex">
      <CircularProgress variant="determinate" {...props} />
      <Box
        top={0}
        left={0}
        bottom={0}
        right={0}
        position="absolute"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Typography
          variant="caption"
          component="div"
          color="textSecondary"
        >{`${Math.round(props.value)}%`}</Typography>
      </Box>
    </Box>
  );
}

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
      return <Facebook style={{ color: "#3b5998" }} />;
    case "instagram":
      return <Instagram style={{ color: "#e1306c" }} />;
    case "whatsapp":
      return <WhatsApp style={{ color: "#25d366" }} />;
    case "whatsapp_oficial":
      return <WhatsApp style={{ color: "#25d366" }} />;
    default:
      return <WhatsApp style={{ color: "#25d366" }} />; // Ícone padrão ao invés de "error"
  }
};

const Connections = () => {
  const classes = useStyles();

  const { whatsApps, loading } = useContext(WhatsAppsContext);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [statusImport, setStatusImport] = useState([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
  const [channel, setChannel] = useState("whatsapp");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const history = useHistory();
  const confirmationModalInitialState = {
    action: "",
    title: "",
    message: "",
    whatsAppId: "",
    open: false,
  };
  const [confirmModalInfo, setConfirmModalInfo] = useState(confirmationModalInitialState);
  const [planConfig, setPlanConfig] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [sourceConnection, setSourceConnection] = useState("");
  const [targetConnection, setTargetConnection] = useState("");
  const [preDeleteModalOpen, setPreDeleteModalOpen] = useState(false);
  const [whatsAppToDelete, setWhatsAppToDelete] = useState(null);
  const [transferProgressModalOpen, setTransferProgressModalOpen] = useState(false);
  const [transferProgress, setTransferProgress] = useState({ current: 0, total: 0, percentage: 0 });

  //   const socketManager = useContext(SocketContext);
  const { user, socket } = useContext(AuthContext);

  const companyId = user.companyId;

  const { getPlanCompany } = usePlans();

  useEffect(() => {
    async function fetchData() {
      const planConfigs = await getPlanCompany(undefined, companyId);
      setPlanConfig(planConfigs)
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    // const socket = socketManager.GetSocket();

    socket.on(`importMessages-${user.companyId}`, (data) => {
      if (data.action === "refresh") {
        setStatusImport([]);
        history.go(0);
      }
      if (data.action === "update") {
        setStatusImport(data.status);
      }
    });

    socket.on(`transferTickets-${user.companyId}`, (data) => {
      if (data.action === "progress") {
        setTransferProgress({
          current: data.current,
          total: data.total,
          percentage: Math.round((data.current / data.total) * 100)
        });
      }
      if (data.action === "completed") {
        setTransferProgressModalOpen(false);
        setTransferProgress({ current: 0, total: 0, percentage: 0 });
        toast.success(`Transferência concluída! ${data.transferred} tickets transferidos com sucesso.`);
        handleCloseTransferModal();
      }
      if (data.action === "error") {
        setTransferProgressModalOpen(false);
        setTransferProgress({ current: 0, total: 0, percentage: 0 });
        toast.error("Erro na transferência de tickets.");
      }
    });

    /* return () => {
      socket.disconnect();
    }; */
  }, [whatsApps]);

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

  const handleOpenWhatsAppModal = (channel, provider) => {
    console.log("🔍 handleOpenWhatsAppModal - channel:", channel, "provider:", provider);
    
    // IMPORTANTE: Definir o sessionStorage ANTES de abrir o modal
    // para que o useEffect do modal possa ler o valor correto
    sessionStorage.removeItem("selectedProvider");
    if (provider) {
      sessionStorage.setItem("selectedProvider", provider);
      console.log("🔍 sessionStorage.setItem - selectedProvider:", provider);
    }
    
    setChannel(channel || "whatsapp")
    setSelectedWhatsApp(null);
    setWhatsAppModalOpen(true);
  };

  const handleCloseWhatsAppModal = useCallback(() => {
    setWhatsAppModalOpen(false);
    setSelectedWhatsApp(null);
    // Limpar sessionStorage ao fechar o modal para evitar conflitos
    sessionStorage.removeItem("selectedProvider");
  }, [setSelectedWhatsApp, setWhatsAppModalOpen]);

  const handleOpenQrModal = (whatsApp) => {
    setSelectedWhatsApp(whatsApp);
    setQrModalOpen(true);
  };

  const handleCloseQrModal = useCallback(() => {
    setSelectedWhatsApp(null);
    setQrModalOpen(false);
  }, [setQrModalOpen, setSelectedWhatsApp]);

  const handleEditWhatsApp = (whatsApp) => {
    setChannel(whatsApp.channel)
    setSelectedWhatsApp(whatsApp);
    setWhatsAppModalOpen(true);
  };

  const handleSyncTemplates = async (whatsAppId) => {
    await api.get(`/whatsapp/sync-templates/${whatsAppId}`);
  }

  const handleCopyWebhook = (url) => {
    navigator.clipboard.writeText(url); // Copia o token para a área de transferência    
  };

  const openInNewTab = url => {
    window.open(url, '_blank', 'noopener,noreferrer');
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
    if (action === "closedImported") {
      setConfirmModalInfo({
        action: action,
        title: i18n.t("connections.confirmationModal.closedImportedTitle"),
        message: i18n.t("connections.confirmationModal.closedImportedMessage"),
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
    if (confirmModalInfo.action === "closedImported") {
      try {
        await api.post(`/closedimported/${confirmModalInfo.whatsAppId}`);
        toast.success(i18n.t("connections.toasts.closedimported"));
      } catch (err) {
        toastError(err);
      }
    }


    setConfirmModalInfo(confirmationModalInitialState);
  };


  const renderImportButton = (whatsApp) => {
    if (whatsApp?.statusImportMessages === "renderButtonCloseTickets") {
      return (
        <Button
          style={{ marginLeft: 12 }}
          size="small"
          variant="outlined"
          color="primary"
          onClick={() => {
            handleOpenConfirmationModal("closedImported", whatsApp.id);
          }}
        >
          {i18n.t("connections.buttons.closedImported")}
        </Button>
      );
    }

    if (whatsApp?.importOldMessages) {
      let isTimeStamp = !isNaN(
        new Date(Math.floor(whatsApp?.statusImportMessages)).getTime()
      );

      if (isTimeStamp) {
        const ultimoStatus = new Date(
          Math.floor(whatsApp?.statusImportMessages)
        ).getTime();
        const dataLimite = +add(ultimoStatus, { seconds: +35 }).getTime();
        if (dataLimite > new Date().getTime()) {
          return (
            <>
              <Button
                disabled
                style={{ marginLeft: 12 }}
                size="small"
                endIcon={
                  <CircularProgress
                    size={12}
                    className={classes.buttonProgress}
                  />
                }
                variant="outlined"
                color="primary"
              >
                {i18n.t("connections.buttons.preparing")}
              </Button>
            </>
          );
        }
      }
    }
  };

  const renderActionButtons = (whatsApp) => {
    return (
      <>
        {whatsApp.channel === "whatsapp" && whatsApp.status === "qrcode" && (
          <Can
            role={user.profile === "user" && user.allowConnections === "enabled" ? "admin" : user.profile}
            perform="connections-page:addConnection"
            yes={() => (
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={() => handleOpenQrModal(whatsApp)}
              >
                {i18n.t("connections.buttons.qrcode")}
              </Button>
            )}
          />
        )}
        {whatsApp.channel === "whatsapp" && whatsApp.status === "DISCONNECTED" && (
          <Can
            role={user.profile === "user" && user.allowConnections === "enabled" ? "admin" : user.profile}
            perform="connections-page:addConnection"
            yes={() => (
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
          />
        )}
        {(whatsApp.channel === "whatsapp" && (whatsApp.status === "CONNECTED" ||
          whatsApp.status === "PAIRING" ||
          whatsApp.status === "TIMEOUT")) && (
            <Can
              role={user.profile}
              perform="connections-page:addConnection"
              yes={() => (
                <>
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

                  {renderImportButton(whatsApp)}
                </>
              )}
            />
          )}
        {(whatsApp.channel === "whatsapp" && whatsApp.status === "OPENING") && (
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

  const restartWhatsapps = async () => {

    try {
      await api.post(`/whatsapp-restart/`);
      toast.success(i18n.t("connections.waitConnection"));
    } catch (err) {
      toastError(err);
    }
  }

  const handleOpenTransferModal = () => {
    setTransferModalOpen(true);
  };

  const handleCloseTransferModal = () => {
    setTransferModalOpen(false);
    setSourceConnection("");
    setTargetConnection("");
  };

  const handleCloseTransferProgressModal = () => {
    setTransferProgressModalOpen(false);
    setTransferProgress({ current: 0, total: 0, percentage: 0 });
  };

  const handleTransferTickets = async () => {
    if (!sourceConnection || !targetConnection) {
      toast.error("Selecione as conexões de origem e destino");
      return;
    }

    if (sourceConnection === targetConnection) {
      toast.error("As conexões de origem e destino devem ser diferentes");
      return;
    }

    try {
      const response = await api.post(`/transfer-tickets`, {
        sourceConnectionId: sourceConnection,
        targetConnectionId: targetConnection
      });

      if (response.data.requiresProgress) {
        setTransferModalOpen(false);
        setTransferProgressModalOpen(true);
        setTransferProgress({ current: 0, total: response.data.totalTickets, percentage: 0 });
      } else {
        toast.success(`Tickets transferidos com sucesso! ${response.data.transferred || 0} tickets transferidos.`);
        handleCloseTransferModal();
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenPreDeleteModal = (whatsAppId) => {
    setWhatsAppToDelete(whatsAppId);
    setPreDeleteModalOpen(true);
  };

  const handleClosePreDeleteModal = () => {
    setPreDeleteModalOpen(false);
    setWhatsAppToDelete(null);
  };

  const handleConfirmTransferDone = () => {
    setPreDeleteModalOpen(false);
    handleOpenConfirmationModal("delete", whatsAppToDelete);
    setWhatsAppToDelete(null);
  };

  // Calcular estatísticas de conexões
  const getConnectionStats = () => {
    const connected = whatsApps.filter(
      (wa) => wa.status === "CONNECTED"
    ).length;
    const disconnected = whatsApps.filter(
      (wa) => wa.status === "DISCONNECTED" || wa.status === "TIMEOUT" || wa.status === "PAIRING"
    ).length;
    const awaitingQR = whatsApps.filter(
      (wa) => wa.status === "qrcode"
    ).length;

    return { connected, disconnected, awaitingQR };
  };

  const stats = getConnectionStats();

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
      {qrModalOpen && (
        <QrcodeModal
          open={qrModalOpen}
          onClose={handleCloseQrModal}
          whatsAppId={!whatsAppModalOpen && selectedWhatsApp?.id}
        />
      )}
      <WhatsAppModal
        open={whatsAppModalOpen}
        onClose={handleCloseWhatsAppModal}
        whatsAppId={!qrModalOpen && selectedWhatsApp?.id}
        channel={channel}
      />
      <Dialog
        open={transferModalOpen}
        onClose={handleCloseTransferModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Transferência de Tickets</DialogTitle>
        <DialogContent>
          <Typography variant="body1" style={{ marginBottom: 24, lineHeight: 1.6 }}>
            Para transferir os tickets, selecione a conexão de <strong>origem</strong> (de onde os tickets serão movidos) 
            e a conexão de <strong>destino</strong> (para onde os tickets serão transferidos). 
            Todos os atendimentos ativos da conexão de origem serão movidos para a conexão de destino.
          </Typography>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
            <FormControl fullWidth>
              <InputLabel>Origem</InputLabel>
              <Select
                value={sourceConnection}
                onChange={(e) => setSourceConnection(e.target.value)}
                label="Origem"
              >
                {whatsApps.map((whatsApp) => (
                  <MuiMenuItem key={whatsApp.id} value={whatsApp.id}>
                    {whatsApp.name}
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>

            <div style={{ fontSize: 24, color: '#4caf50', fontWeight: 'bold' }}>
              →
            </div>

            <FormControl fullWidth>
              <InputLabel>Destino</InputLabel>
              <Select
                value={targetConnection}
                onChange={(e) => setTargetConnection(e.target.value)}
                label="Destino"
              >
                {whatsApps.map((whatsApp) => (
                  <MuiMenuItem key={whatsApp.id} value={whatsApp.id}>
                    {whatsApp.name}
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTransferModal} color="default">
            CANCELAR
          </Button>
          <Button onClick={handleTransferTickets} color="primary" variant="contained">
            TRANSFERIR
                     </Button>
         </DialogActions>
       </Dialog>
       <Dialog
         open={transferProgressModalOpen}
         onClose={handleCloseTransferProgressModal}
         maxWidth="sm"
         fullWidth
         disableBackdropClick
         disableEscapeKeyDown
       >
         <DialogTitle>Transferindo Tickets</DialogTitle>
         <DialogContent>
           <div style={{ textAlign: 'center', padding: '20px 0' }}>
             <Typography variant="h6" style={{ marginBottom: 16 }}>
               Progresso da Transferência
             </Typography>
             
             <Box position="relative" display="inline-flex" marginBottom={2}>
               <CircularProgress 
                 variant="determinate" 
                 value={transferProgress.percentage} 
                 size={80}
                 thickness={4}
               />
               <Box
                 top={0}
                 left={0}
                 bottom={0}
                 right={0}
                 position="absolute"
                 display="flex"
                 alignItems="center"
                 justifyContent="center"
               >
                 <Typography variant="caption" component="div" color="textSecondary" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                   {transferProgress.percentage}%
                 </Typography>
               </Box>
             </Box>

             <Typography variant="body1" style={{ marginTop: 16 }}>
               {transferProgress.current} de {transferProgress.total} tickets transferidos
             </Typography>
             
             <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
               Por favor, aguarde enquanto os tickets são transferidos...
             </Typography>
           </div>
         </DialogContent>
       </Dialog>
       <Dialog
         open={preDeleteModalOpen}
         onClose={handleClosePreDeleteModal}
         maxWidth="sm"
         fullWidth
       >
         <DialogTitle>Transferência de Tickets</DialogTitle>
         <DialogContent>
           <Typography variant="body1" style={{ marginBottom: 16 }}>
             Antes de excluir esta conexão, você já fez a transferência dos tickets para outra conexão?
           </Typography>
         </DialogContent>
         <DialogActions>
           <Button onClick={handleClosePreDeleteModal} color="default">
             NÃO
           </Button>
           <Button onClick={handleConfirmTransferDone} color="primary" variant="contained">
             SIM
           </Button>
         </DialogActions>
          </Dialog>
      

      {user.profile === "user" && user.allowConnections === "disabled" ?
        <ForbiddenPage />
        :
        <>
          <Box className={classes.headerContainer}>
            <Typography className={classes.headerTitle}>
              {i18n.t("connections.title")} ({whatsApps.length})
            </Typography>
            <Box className={classes.headerButtons}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleOpenTransferModal}
                className={classes.actionButton}
                startIcon={<Sync />}
              >
                Transferir Tickets
              </Button>

              <Button
                variant="contained"
                style={{ backgroundColor: "#22c55e", color: "#fff" }}
                onClick={restartWhatsapps}
                className={classes.actionButton}
                startIcon={<Sync />}
              >
                {i18n.t("connections.restartConnections")}
              </Button>

              <Button
                variant="contained"
                style={{ backgroundColor: "#3b82f6", color: "#fff" }}
                onClick={() => openInNewTab(`https://wa.me/${process.env.REACT_APP_NUMBER_SUPPORT}`)}
                className={classes.actionButton}
              >
                {i18n.t("connections.callSupport")}
              </Button>
              <PopupState variant="popover" popupId="demo-popup-menu">
                {(popupState) => (
                  <React.Fragment>
                    <Can
                      role={user.profile}
                      perform="connections-page:addConnection"
                      yes={() => (
                        <>
                          <Button
                            variant="contained"
                            style={{ backgroundColor: "#000", color: "#fff" }}
                            {...bindTrigger(popupState)}
                            className={classes.actionButton}
                          >
                            {i18n.t("connections.newConnection")}
                          </Button>
                          <Menu {...bindMenu(popupState)}>
                            {/* 1- WHATSAPP BETA */}
                            <MenuItem
                              disabled={planConfig?.plan?.useWhatsapp ? false : true}
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
                              WhatsApp Beta
                            </MenuItem>
                            {/* 2- WHATSAPP STABLE */}
                            <MenuItem
                              disabled={planConfig?.plan?.useWhatsapp ? false : true}
                              onClick={() => {
                                handleOpenWhatsAppModal("whatsapp", "stable");
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
                              WhatsApp Stable
                            </MenuItem>
                            {/* 3- WHATSAPP UAZAPI */}
                            <MenuItem
                              disabled={planConfig?.plan?.useWhatsapp ? false : true}
                              onClick={() => {
                                handleOpenWhatsAppModal("whatsapp", "uazapi");
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
                              WhatsApp UAZApi
                            </MenuItem>
                            {/* 4- WHATSAPP OFICIAL */}
                            <MenuItem
                              disabled={planConfig?.plan?.useWhatsappOfficial ? false : true}
                              onClick={() => {
                                handleOpenWhatsAppModal("whatsapp_oficial");
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
                              WhatsApp Oficial
                            </MenuItem>
                            {/* FACEBOOK */}
                            <FacebookLogin
                              appId={process.env.REACT_APP_FACEBOOK_APP_ID}
                              autoLoad={false}
                              fields="name,email,picture"
                              version="9.0"
                              scope={process.env.REACT_APP_REQUIRE_BUSINESS_MANAGEMENT?.toUpperCase() === "TRUE" ?
                                "public_profile,pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement,business_management"
                                : "public_profile,pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement"}
                              callback={responseFacebook}
                              render={(renderProps) => (
                                <MenuItem
                                  disabled={planConfig?.plan?.useFacebook ? false : true}
                                  onClick={renderProps.onClick}
                                >
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
                            {/* INSTAGRAM */}
                            <FacebookLogin
                              appId={process.env.REACT_APP_FACEBOOK_APP_ID}
                              autoLoad={false}
                              fields="name,email,picture"
                              version="9.0"
                              scope={process.env.REACT_APP_REQUIRE_BUSINESS_MANAGEMENT?.toUpperCase() === "TRUE" ?
                                "public_profile,instagram_basic,instagram_manage_messages,pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement,business_management"
                                : "public_profile,instagram_basic,instagram_manage_messages,pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement"}
                              callback={responseInstagram}
                              render={(renderProps) => (
                                <MenuItem
                                  disabled={planConfig?.plan?.useInstagram ? false : true}
                                  onClick={renderProps.onClick}
                                >
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
                        </>
                      )}
                    />
                  </React.Fragment>
                )}
              </PopupState>
            </Box>
          </Box>

          {/* Cards de Status */}
          <Grid container spacing={2} style={{ marginBottom: 16, marginLeft: 0, marginRight: 0, width: "100%" }}>
            <Grid item xs={12} sm={4}>
              <Paper 
                className={classes.statusCard}
                style={{ borderColor: "#22c55e" }}
              >
                <Box 
                  className={classes.statusCardIcon}
                  style={{ backgroundColor: "#22c55e15", color: "#22c55e" }}
                >
                  <CheckCircle style={{ fontSize: "clamp(20px, 2.5vw, 24px)" }} />
                </Box>
                <Typography className={classes.statusCardValue} style={{ color: "#22c55e" }}>
                  {stats.connected}
                </Typography>
                <Typography className={classes.statusCardLabel}>
                  Conectadas
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper 
                className={classes.statusCard}
                style={{ borderColor: "#ef4444" }}
              >
                <Box 
                  className={classes.statusCardIcon}
                  style={{ backgroundColor: "#ef444415", color: "#ef4444" }}
                >
                  <SignalCellularConnectedNoInternet0Bar style={{ fontSize: "clamp(20px, 2.5vw, 24px)" }} />
                </Box>
                <Typography className={classes.statusCardValue} style={{ color: "#ef4444" }}>
                  {stats.disconnected}
                </Typography>
                <Typography className={classes.statusCardLabel}>
                  Desconectadas
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper 
                className={classes.statusCard}
                style={{ borderColor: "#f97316" }}
              >
                <Box 
                  className={classes.statusCardIcon}
                  style={{ backgroundColor: "#f9731615", color: "#f97316" }}
                >
                  <CropFree style={{ fontSize: "clamp(20px, 2.5vw, 24px)" }} />
                </Box>
                <Typography className={classes.statusCardValue} style={{ color: "#f97316" }}>
                  {stats.awaitingQR}
                </Typography>
                <Typography className={classes.statusCardLabel}>
                  Aguardando QR
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {
            statusImport?.all ? (
              <>
                <div style={{ margin: "auto", marginBottom: 12 }}>
                  <Card className={classes.root}>
                    <CardContent className={classes.content}>
                      <Typography component="h5" variant="h5">

                        {statusImport?.this === -1 ? i18n.t("connections.buttons.preparing") : i18n.t("connections.buttons.importing")}

                      </Typography>
                      {statusImport?.this === -1 ?
                        <Typography component="h6" variant="h6" align="center">

                          <CircularProgress
                            size={24}
                          />

                        </Typography>
                        :
                        <>
                          <Typography component="h6" variant="h6" align="center">
                            {`${i18n.t(`connections.typography.processed`)} ${statusImport?.this} ${i18n.t(`connections.typography.in`)} ${statusImport?.all}  ${i18n.t(`connections.typography.date`)}: ${statusImport?.date} `}
                          </Typography>
                          <Typography align="center">
                            <CircularProgressWithLabel
                              style={{ margin: "auto" }}
                              value={(statusImport?.this / statusImport?.all) * 100}
                            />
                          </Typography>
                        </>
                      }
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null
          }

          <Paper className={classes.tableContainer}>
            <Table>
              <TableHead className={classes.tableHead}>
                <TableRow>
                  <TableCell align="left" className={classes.tableCell}>Canal</TableCell>
                  <TableCell align="center" className={classes.tableCell}>{i18n.t("connections.table.status")}</TableCell>
                  <TableCell align="center" className={classes.tableCell}>{i18n.t("connections.table.session")}</TableCell>
                  <TableCell align="center" className={classes.tableCell}>{i18n.t("connections.table.number")}</TableCell>
                  <TableCell align="center" className={classes.tableCell}>Tipo</TableCell>
                  <TableCell align="center" className={classes.tableCell}>{i18n.t("connections.table.lastUpdate")}</TableCell>
                  <Can
                    role={user.profile === "user" && user.allowConnections === "enabled" ? "admin" : user.profile}
                    perform="connections-page:addConnection"
                    yes={() => (
                      <TableCell align="center" className={classes.tableCell}>{i18n.t("connections.table.actions")}</TableCell>
                    )}
                  />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRowSkeleton />
                ) : (
                  <>
                    {whatsApps?.length > 0 &&
                      whatsApps.map((whatsApp) => {
                        const getStatusChip = () => {
                          if (whatsApp.status === "CONNECTED") {
                            return <Chip label="Conectado" className={classes.statusChip} style={{ backgroundColor: "#22c55e15", color: "#22c55e" }} icon={<CheckCircle style={{ color: "#22c55e" }} />} />;
                          }
                          if (whatsApp.status === "qrcode") {
                            return <Chip label="QR Code" className={classes.statusChip} style={{ backgroundColor: "#f9731615", color: "#f97316" }} icon={<CropFree style={{ color: "#f97316" }} />} />;
                          }
                          if (whatsApp.status === "DISCONNECTED") {
                            return <Chip label="Desconectado" className={classes.statusChip} style={{ backgroundColor: "#ef444415", color: "#ef4444" }} icon={<SignalCellularConnectedNoInternet0Bar style={{ color: "#ef4444" }} />} />;
                          }
                          if (whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") {
                            return <Chip label="Timeout" className={classes.statusChip} style={{ backgroundColor: "#ef444415", color: "#ef4444" }} />;
                          }
                          if (whatsApp.status === "OPENING") {
                            return <CircularProgress size={20} />;
                          }
                          return <Chip label={whatsApp.status} className={classes.statusChip} />;
                        };

                        const getTypeChip = () => {
                          if (whatsApp.channel === "whatsapp_oficial") {
                            return <Chip label="Oficial" className={classes.statusChip} style={{ backgroundColor: "#3b82f615", color: "#3b82f6" }} size="small" />;
                          }
                          return <Chip label="Não oficial" className={classes.statusChip} style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }} size="small" />;
                        };

                        return (
                          <TableRow key={whatsApp.id} className={classes.tableRow}>
                            <TableCell align="left" className={classes.tableCell}>
                              <Box display="flex" alignItems="center">
                                <Box className={classes.channelIcon} style={{ marginRight: 12 }}>
                                  {IconChannel(whatsApp.channel)}
                                </Box>
                                <Box>
                                  <Typography variant="body2" style={{ fontWeight: 600 }}>
                                    {whatsApp.name}
                                  </Typography>
                                  {whatsApp.isDefault && (
                                    <Chip 
                                      label="Padrão" 
                                      size="small" 
                                      style={{ 
                                        backgroundColor: "#22c55e15", 
                                        color: "#22c55e",
                                        height: 20,
                                        fontSize: "0.65rem",
                                        marginTop: 4
                                      }} 
                                    />
                                  )}
                                  <Typography variant="caption" style={{ color: "#6b7280", display: "block", marginTop: 2 }}>
                                    {whatsApp.channel === "whatsapp" || whatsApp.channel === "whatsapp_oficial" ? "WhatsApp" : 
                                     whatsApp.channel === "facebook" ? "Facebook" : 
                                     whatsApp.channel === "instagram" ? "Instagram" : whatsApp.channel}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell align="center" className={classes.tableCell}>
                              {getStatusChip()}
                            </TableCell>
                            <TableCell align="center" className={classes.tableCell}>
                              {renderActionButtons(whatsApp)}
                            </TableCell>
                            <TableCell align="center" className={classes.tableCell}>
                              <Typography variant="body2" style={{ color: "#6b7280" }}>
                                {whatsApp.number && whatsApp.channel === 'whatsapp' ? formatSerializedId(whatsApp.number) : whatsApp.number || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" className={classes.tableCell}>
                              {getTypeChip()}
                            </TableCell>
                            <TableCell align="center" className={classes.tableCell}>
                              <Typography variant="body2" style={{ color: "#6b7280" }}>
                                {format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm")}
                              </Typography>
                            </TableCell>
                            <Can
                              role={user.profile}
                              perform="connections-page:addConnection"
                              yes={() => (
                                <TableCell align="center" className={classes.tableCell}>
                                  <IconButton
                                    size="small"
                                    className={classes.actionIconButton}
                                    onClick={() => handleEditWhatsApp(whatsApp)}
                                  >
                                    <Edit />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    className={classes.actionIconButton}
                                    onClick={(e) => {
                                      handleOpenPreDeleteModal(whatsApp.id);
                                    }}
                                    style={{ color: "#ef4444" }}
                                  >
                                    <DeleteOutline />
                                  </IconButton>
                                  {whatsApp.wavoip && (
                                    <Tooltip title="Abrir QR Code Wavoip em nova aba">
                                      <IconButton
                                        size="small"
                                        className={classes.actionIconButton}
                                        aria-label="wavoip-qr"
                                        onClick={() => {
                                          const qrUrl = `https://devices.wavoip.com/${whatsApp.wavoip}/whatsapp/qr-image`;
                                          window.open(qrUrl, '_blank', 'noopener,noreferrer');
                                        }}
                                        style={{ color: "#00339E" }}
                                      >
                                        <Phone />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {whatsApp.channel === "whatsapp_oficial" && (
                                    <>
                                      <Tooltip title="Sincronizar templates">
                                        <IconButton
                                          size="small"
                                          className={classes.actionIconButton}
                                          aria-label="sync-templates"
                                          onClick={(e) => {
                                            handleSyncTemplates(whatsApp.id);
                                          }}
                                        >
                                          <Sync />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Copiar webhook para Meta">
                                        <IconButton
                                          size="small"
                                          className={classes.actionIconButton}
                                          aria-label="copy-webhook"
                                          onClick={(e) => {
                                            handleCopyWebhook(whatsApp.waba_webhook);
                                            toast.success("Webhook copiado!");
                                          }}
                                        >
                                          <WebhookIcon />
                                        </IconButton>
                                      </Tooltip>
                                    </>
                                  )}
                                </TableCell>
                              )}
                            />
                          </TableRow>
                        );
                      })}
                  </>
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      }
    </MainContainer >

  );
};

export default Connections;