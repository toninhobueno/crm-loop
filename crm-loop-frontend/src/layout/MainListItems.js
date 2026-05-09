import React, { useContext, useEffect, useReducer, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import useHelps from "../hooks/useHelps";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ListSubheader from "@material-ui/core/ListSubheader";
import Divider from "@material-ui/core/Divider";
import Avatar from "@material-ui/core/Avatar";
import Badge from "@material-ui/core/Badge";
import Collapse from "@material-ui/core/Collapse";
import List from "@material-ui/core/List";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";

// Ícones modernos e consistentes
import DashboardIcon from "@mui/icons-material/Dashboard";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import PeopleIcon from "@mui/icons-material/People";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BoltIcon from "@mui/icons-material/Bolt";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CodeIcon from "@mui/icons-material/Code";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CallIcon from "@mui/icons-material/Call";
import CampaignIcon from "@mui/icons-material/Campaign";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CakeIcon from "@mui/icons-material/Cake";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AnnouncementIcon from "@mui/icons-material/Announcement";
import ForumIcon from "@mui/icons-material/Forum";
// import LocalAtmIcon from "@mui/icons-material/LocalAtm"; /* menu Financeiro (reativar ao descomentar o item) */
import BusinessIcon from "@mui/icons-material/Business";
import {
  AllInclusive,
  AttachFile,
  Description,
  DeviceHub,
  GridView,
  PhoneAndroid,
  Analytics,
  ManageAccounts,
} from "@mui/icons-material";

import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import { useActiveMenu } from "../context/ActiveMenuContext";
import ColorModeContext from "./themeContext";

import { Can } from "../components/Can";

import { isArray } from "lodash";
import api from "../services/api";
import toastError from "../errors/toastError";
import usePlans from "../hooks/usePlans";
import useVersion from "../hooks/useVersion";
import { i18n } from "../translate/i18n";
import { Campaign, Timeline, Webhook, AutoAwesome, BarChart, Assessment, PlaylistAdd, ContactMail, Tune, AutoGraph, SmartToy, IntegrationInstructions, CloudQueue, CalculateOutlined } from "@mui/icons-material";


const useStyles = makeStyles((theme) => ({
  listItem: {
    minHeight: "48px",
    height: "auto",
    margin: "4px 10px",
    borderRadius: "14px",
    padding: "8px 12px",
    position: "relative",
    overflow: "hidden",
    transition: "all 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
    backgroundColor: "transparent", // Estado normal sem cor
    "&::before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: "4px",
      backgroundColor: "transparent",
      transition: "all 0.28s ease",
      borderRadius: "0 4px 4px 0",
      boxShadow: "none",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "38%",
      background:
        theme.mode === "light"
          ? "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 100%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
      opacity: 0,
      pointerEvents: "none",
      borderRadius: "14px 14px 0 0",
      transition: "opacity 0.28s ease",
    },
    "&:hover": {
      backgroundColor: (props) => `${props.listItemBgColor || (theme.mode === "light" 
        ? "rgba(0, 0, 0, 0.045)" 
        : "rgba(255, 255, 255, 0.06)")} !important`,
      transform: "translateX(3px)",
      boxShadow:
        theme.mode === "light"
          ? "0 4px 16px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.7)"
          : "0 6px 20px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.06)",
      "&::before": {
        backgroundColor: theme.palette.primary.main,
        boxShadow: `0 0 14px ${theme.palette.primary.main}88`,
      },
      "&::after": {
        opacity: 1,
      },
      "& $iconContainer": {
        backgroundColor: theme.palette.primary.main,
        color: "#fff",
        transform: "scale(1.04)",
        boxShadow: `0 6px 18px ${theme.palette.primary.main}55, inset 0 1px 0 rgba(255,255,255,0.35)`,
      },
      "& $listItemText": {
        color: theme.palette.primary.main,
        fontWeight: 600,
      },
    },
    "&.active": {
      backgroundColor: (props) => `${props.listItemBgColor || (theme.mode === "light"
        ? `${theme.palette.primary.main}0D`
        : `${theme.palette.primary.main}26`)} !important`,
      boxShadow:
        theme.mode === "light"
          ? `inset 0 1px 0 rgba(255,255,255,0.85), 0 1px 0 ${theme.palette.primary.main}33`
          : `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px ${theme.palette.primary.main}40`,
      "&::before": {
        backgroundColor: theme.palette.primary.main,
      },
      "&::after": {
        opacity: 0.75,
      },
      "& $iconContainer": {
        backgroundColor: theme.palette.primary.main,
        color: "#fff",
        boxShadow: `0 8px 22px ${theme.palette.primary.main}66, inset 0 1px 0 rgba(255,255,255,0.35)`,
      },
      "& $listItemText": {
        color: theme.palette.primary.main,
        fontWeight: 600,
      },
    },
    // Estilos específicos para menu colapsado
    "&.collapsed": {
      margin: "6px 12px",
      padding: "12px 8px",
      justifyContent: "center",
      "&:hover": {
        transform: "none",
      },
    },
  },

  listItemText: {
    fontSize: "14px",
    color: theme.mode === "light" ? "#64748b" : "#e2e8f0",
    transition: "all 0.25s ease",
    fontWeight: 500,
    letterSpacing: "0.01em",
    "& .MuiTypography-root": {
      fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
      fontSize: "14px",
    }
  },

  iconContainer: {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "12px",
    height: 40,
    width: 40,
    minWidth: 40,
    overflow: "hidden",
    backgroundColor: theme.mode === "light"
      ? "rgba(15, 23, 42, 0.05)"
      : "rgba(255, 255, 255, 0.08)",
    boxShadow:
      theme.mode === "light"
        ? "inset 0 1px 0 rgba(255,255,255,0.85)"
        : "inset 0 1px 0 rgba(255,255,255,0.1)",
    color: theme.mode === "light" ? "#475569" : "#cbd5e1",
    transition: "all 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "46%",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 100%)",
      pointerEvents: "none",
      borderRadius: "inherit",
      opacity: theme.mode === "light" ? 1 : 0.35,
    },
    "& .MuiSvgIcon-root": {
      fontSize: "20px",
      transition: "transform 0.25s ease",
      position: "relative",
      zIndex: 1,
    },
    "&.active": {
      backgroundColor: `${theme.palette.primary.main} !important`,
      color: "#fff",
      boxShadow: `0 6px 18px ${theme.palette.primary.main}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
    },
  },

  badge: {
    "& .MuiBadge-badge": {
      backgroundColor: "#ef4444",
      color: "#fff",
      fontSize: "0.7rem",
      fontWeight: 700,
      minWidth: "18px",
      height: "18px",
      padding: "0 4px",
      animation: "$pulse 2s infinite",
      boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)",
    }
  },

  "@keyframes pulse": {
    "0%, 100%": {
      opacity: 1,
      transform: "scale(1)",
    },
    "50%": {
      opacity: 0.8,
      transform: "scale(1.05)",
    }
  },

  submenuContainer: {
    backgroundColor: theme.mode === "light"
      ? "rgba(0, 0, 0, 0.02)"
      : "rgba(255, 255, 255, 0.03)",
    paddingLeft: "1px",
    marginLeft: "2px",
    borderLeft: `2px solid ${theme.mode === "light" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.1)"}`,
  },

  submenuItem: {
    minHeight: "40px",
    margin: "2px 10px",
    borderRadius: "12px",
    paddingLeft: "16px !important",
    backgroundColor: "transparent", // Estado normal
    "&:hover": {
      backgroundColor: (props) => `${props.listItemBgColor || (theme.mode === "light"
        ? "rgba(0, 0, 0, 0.03)"
        : "rgba(255, 255, 255, 0.06)")} !important`,
    },
    "&.active": {
      backgroundColor: (props) => `${props.listItemBgColor || (theme.mode === "light"
        ? "rgba(0, 0, 0, 0.05)"
        : "rgba(255, 255, 255, 0.08)")} !important`,
    },
  },

  customTooltip: {
    backgroundColor: theme.mode === "light" ? "#1e293b" : "#0f172a",
    color: "#fff",
    fontSize: "0.8125rem",
    fontWeight: 500,
    borderRadius: "8px",
    padding: "6px 12px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
    "& .MuiTooltip-arrow": {
      color: theme.mode === "light" ? "#1e293b" : "#0f172a",
    }
  },

  versionContainer: {
    textAlign: "center",
    padding: "16px",
    color: theme.mode === "light" ? "#94a3b8" : "#64748b",
    fontSize: "11px",
    fontWeight: 600,
    borderTop: `1px solid ${theme.mode === "light" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.1)"}`,
    marginTop: "auto",
    letterSpacing: "0.5px",
  },

  adminSection: {
    marginTop: "8px",
    "& .MuiListSubheader-root": {
      color: theme.mode === "light" ? "#64748b" : "#94a3b8",
      fontSize: "0.75rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "1px",
      padding: "16px 16px 8px",
      lineHeight: 1.5,
    }
  },

  expandIcon: {
    transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    color: theme.mode === "light" ? "#64748b" : "#94a3b8",
    fontSize: "20px !important",
    "&.expanded": {
      transform: "rotate(180deg)",
    }
  },

  menuSection: {
    marginBottom: "8px",
  },

  menuContainer: {
    overflowY: "auto",
    padding: "8px 0",
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      background: theme.mode === "light"
        ? "rgba(0, 0, 0, 0.12)"
        : "rgba(255, 255, 255, 0.12)",
      borderRadius: "3px",
      "&:hover": {
        background: theme.mode === "light"
          ? "rgba(0, 0, 0, 0.2)"
          : "rgba(255, 255, 255, 0.2)",
      }
    },
  },

  divider: {
    margin: "12px 16px",
    borderColor: theme.mode === "light" 
      ? "rgba(0, 0, 0, 0.08)" 
      : "rgba(255, 255, 255, 0.1)",
  },
}));

function ListItemLink(props) {
  const { icon, primary, to, tooltip, showBadge, small } = props;
  const { colorMode } = useContext(ColorModeContext);
  const classes = useStyles({ listItemBgColor: colorMode.listItemBgColor });
  const { activeMenu } = useActiveMenu();
  const location = useLocation();
  
  // Verificar se está ativo: tanto pelo activeMenu quanto pelo pathname
  const isActive = activeMenu === to || location.pathname === to || location.pathname.startsWith(to + '/');

  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <RouterLink to={to} ref={ref} {...itemProps} />
      )),
    [to]
  );

  const ConditionalTooltip = ({ children, tooltipEnabled }) =>
    tooltipEnabled ? (
      <Tooltip title={primary} placement="right">
        {children}
      </Tooltip>
    ) : (
      children
    );

  return (
    <ConditionalTooltip tooltipEnabled={!!tooltip}>
      <li>
        <ListItem 
          button 
          component={renderLink} 
          className={`${small ? classes.submenuItem : classes.listItem} ${isActive ? "active" : ""} ${tooltip ? "collapsed" : ""}`}
        >
          {icon ? (
            <ListItemIcon style={{ minWidth: tooltip ? "auto" : "56px", justifyContent: "center" }}>
              {showBadge ? (
                <Badge
                  badgeContent="!"
                  color="error"
                  overlap="circular"
                  className={classes.badge}
                >
                  <div
                    className={`${classes.iconContainer} ${isActive ? "active" : ""}`}
                  >
                    {icon}
                  </div>
                </Badge>
              ) : (
                <div
                  className={`${classes.iconContainer} ${isActive ? "active" : ""}`}
                >
                  {icon}
                </div>
              )}
            </ListItemIcon>
          ) : null}
          {!tooltip && (
            <ListItemText
              primary={
                <Typography className={classes.listItemText}>
                  {primary}
                </Typography>
              }
            />
          )}
        </ListItem>
      </li>
    </ConditionalTooltip>
  );
}

const reducer = (state, action) => {
  if (action.type === "LOAD_CHATS") {
    const chats = action.payload;
    const newChats = [];

    if (isArray(chats)) {
      chats.forEach((chat) => {
        const chatIndex = state.findIndex((u) => u.id === chat.id);
        if (chatIndex !== -1) {
          state[chatIndex] = chat;
        } else {
          newChats.push(chat);
        }
      });
    }

    return [...state, ...newChats];
  }

  if (action.type === "UPDATE_CHATS") {
    const chat = action.payload;
    const chatIndex = state.findIndex((u) => u.id === chat.id);

    if (chatIndex !== -1) {
      state[chatIndex] = chat;
      return [...state];
    } else {
      return [chat, ...state];
    }
  }

  if (action.type === "DELETE_CHAT") {
    const chatId = action.payload;

    const chatIndex = state.findIndex((u) => u.id === chatId);
    if (chatIndex !== -1) {
      state.splice(chatIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }

  if (action.type === "CHANGE_CHAT") {
    const changedChats = state.map((chat) => {
      if (chat.id === action.payload.chat.id) {
        return action.payload.chat;
      }
      return chat;
    });
    return changedChats;
  }
};

const MainListItems = ({ collapsed, drawerClose }) => {
  const theme = useTheme();
  const { colorMode } = useContext(ColorModeContext);
  const classes = useStyles({ listItemBgColor: colorMode.listItemBgColor });
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user, socket } = useContext(AuthContext);

  const { setActiveMenu } = useActiveMenu();
  const location = useLocation();

  const [connectionWarning, setConnectionWarning] = useState(false);
  const [openCampaignSubmenu, setOpenCampaignSubmenu] = useState(false);
  const [openSchedulingSubmenu, setOpenSchedulingSubmenu] = useState(false);
  const [openConnectionsSubmenu, setOpenConnectionsSubmenu] = useState(false);
  const [openConfiguracoesSubmenu, setOpenConfiguracoesSubmenu] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [showKanban, setShowKanban] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showWavoipCall, setShowWavoipCall] = useState(false);

  // novas features
  const [showSchedules, setShowSchedules] = useState(false);
  const [showInternalChat, setShowInternalChat] = useState(false);
  const [showExternalApi, setShowExternalApi] = useState(false);

  const [invisible, setInvisible] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam] = useState("");
  const [chats, dispatch] = useReducer(reducer, []);
  const [version, setVersion] = useState(false);
  const [managementHover, setManagementHover] = useState(false);
  const [campaignHover, setCampaignHover] = useState(false);
  const [connectionsHover, setConnectionsHover] = useState(false);
  const [crmHover, setCrmHover] = useState(false);
  const [configuracoesHover, setConfiguracoesHover] = useState(false);
  const { list } = useHelps(); // INSERIR
  const [hasHelps, setHasHelps] = useState(false);

  const [openFlowSubmenu, setOpenFlowSubmenu] = useState(false);
  const [flowHover, setFlowHover] = useState(false);
  const [schedulingHover, setSchedulingHover] = useState(false);
  const [conversationsHover, setConversationsHover] = useState(false);

  const isFlowbuilderRouteActive =
    location.pathname.startsWith("/phrase-lists") ||
    location.pathname.startsWith("/flowbuilders") ||
    location.pathname.startsWith("/plugins/floup") ||
    location.pathname === "/quick-messages" ||
    location.pathname === "/simulador";

  useEffect(() => {
    // INSERIR ESSE EFFECT INTEIRO
    async function checkHelps() {
      const helps = await list();
      setHasHelps(helps.length > 0);
    }
    checkHelps();
  }, []);

  const isManagementActive =
    location.pathname === "/" ||
    location.pathname === "/dashboard" ||
    location.pathname.startsWith("/reports") ||
    location.pathname.startsWith("/moments");

  const isCampaignRouteActive =
    location.pathname === "/campaigns" ||
    location.pathname.startsWith("/contact-lists") ||
    location.pathname.startsWith("/campaigns-config");

  const isConversationsActive =
    location.pathname.startsWith("/tickets") ||
    location.pathname.startsWith("/chats");

  const isSchedulingActive =
    location.pathname.startsWith("/schedules") ||
    location.pathname.startsWith("/calcom-integration");

  const isConnectionsActive =
    location.pathname.startsWith("/connections") ||
    location.pathname.startsWith("/notificamehub");

  const isCrmActive =
    location.pathname.toLowerCase().startsWith("/kanban") ||
    location.pathname.startsWith("/tags") ||
    location.pathname.startsWith("/contacts") ||
    location.pathname.startsWith("/wallets") ||
    location.pathname.startsWith("/call-historicals");

  const isConfiguracoesActive =
    location.pathname.startsWith("/settings") ||
    location.pathname.startsWith("/users") ||
    location.pathname.startsWith("/queue-integration") ||
    location.pathname.startsWith("/messages-api") ||
    location.pathname.startsWith("/prompts") ||
    location.pathname.startsWith("/backup") ||
    location.pathname.startsWith("/files");

  useEffect(() => {
    if (location.pathname.startsWith("/tickets") || location.pathname.startsWith("/chats")) {
      setActiveMenu("/tickets");
    } else if (location.pathname.startsWith("/schedules") || location.pathname.startsWith("/calcom-integration")) {
      setOpenSchedulingSubmenu(true);
    } else if (location.pathname.startsWith("/connections") || location.pathname.startsWith("/notificamehub")) {
      setOpenConnectionsSubmenu(true);
    } else if (isConfiguracoesActive) {
      setOpenConfiguracoesSubmenu(true);
    } else {
      setActiveMenu("");
    }
  }, [location, setActiveMenu, isConfiguracoesActive]);

  const { getPlanCompany } = usePlans();

  const { getVersion } = useVersion();

  useEffect(() => {
    async function fetchVersion() {
      const _version = await getVersion();
      setVersion(_version.version);
    }
    fetchVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);

      setShowCampaigns(planConfigs.plan.useCampaigns);
      setShowKanban(planConfigs.plan.useKanban);
      setShowOpenAi(planConfigs.plan.useOpenAi);
      setShowIntegrations(planConfigs.plan.useIntegrations);
      setShowSchedules(planConfigs.plan.useSchedules);
      setShowInternalChat(planConfigs.plan.useInternalChat);
      setShowExternalApi(planConfigs.plan.useExternalApi);
      setShowWavoipCall(planConfigs.plan.wavoip);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchChats();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam, pageNumber]);

  useEffect(() => {
    if (user.id && socket && typeof socket.on === 'function') {
      const companyId = user.companyId;

      const onCompanyChatMainListItems = (data) => {
        if (data.action === "new-message") {
          dispatch({ type: "CHANGE_CHAT", payload: data });
        }
        if (data.action === "update") {
          dispatch({ type: "CHANGE_CHAT", payload: data });
        }
      };

      const eventName = `company-${companyId}-chat`;
      console.log('Registrando listener para:', eventName);

      socket.on(eventName, onCompanyChatMainListItems);

      return () => {
        if (socket && typeof socket.off === 'function') {
          console.log('Removendo listener para:', eventName);
          socket.off(eventName, onCompanyChatMainListItems);
        }
      };
    }
  }, [socket, user.id, user.companyId]);

  useEffect(() => {
    let unreadsCount = 0;
    if (chats.length > 0) {
      for (let chat of chats) {
        for (let chatUser of chat.users) {
          if (chatUser.userId === user.id) {
            unreadsCount += chatUser.unreads;
          }
        }
      }
    }
    if (unreadsCount > 0) {
      setInvisible(false);
    } else {
      setInvisible(true);
    }
  }, [chats, user.id]);

  // useEffect(() => {
  //   if (localStorage.getItem("cshow")) {
  //     setShowCampaigns(true);
  //   }
  // }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (whatsApps.length > 0) {
        const offlineWhats = whatsApps.filter((whats) => {
          return (
            whats.status === "qrcode" ||
            whats.status === "PAIRING" ||
            whats.status === "DISCONNECTED" ||
            whats.status === "TIMEOUT" ||
            whats.status === "OPENING"
          );
        });
        if (offlineWhats.length > 0) {
          setConnectionWarning(true);
        } else {
          setConnectionWarning(false);
        }
      }
    }, 2000);
    return () => clearTimeout(delayDebounceFn);
  }, [whatsApps]);

  const fetchChats = async () => {
    try {
      const { data } = await api.get("/chats/", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_CHATS", payload: data.records });
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div onClick={drawerClose}>
      <Can
        role={
          (user.profile === "user" && user.showDashboard === "enabled") ||
            user.allowRealTime === "enabled"
            ? "admin"
            : user.profile
        }
        perform={"drawer-admin-items:view"}
        yes={() => (
          <>
            <Tooltip title={collapsed ? "Dashboard" : ""} placement="right">
              <ListItem
                dense
                button
                component={RouterLink}
                to="/dashboard"
                onMouseEnter={() => setManagementHover(true)}
                onMouseLeave={() => setManagementHover(false)}
                className={`${classes.listItem} ${isManagementActive || managementHover ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
                style={{
                  margin: collapsed ? "6px 12px" : "4px 8px",
                  padding: collapsed ? "12px 8px" : "8px 12px",
                  justifyContent: collapsed ? "center" : "flex-start"
                }}
              >
                <ListItemIcon style={{ minWidth: collapsed ? "auto" : "56px", justifyContent: "center" }}>
                  <div className={`${classes.iconContainer} ${isManagementActive || managementHover ? "active" : ""}`}>
                    <DashboardIcon />
                  </div>
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={
                      <Typography className={classes.listItemText}>
                        Dashboard
                      </Typography>
                    }
                  />
                )}
              </ListItem>
            </Tooltip>
          </>
        )}
      />
      
      {/* Conversas de Atendimento (abre direto em Atendimento) */}
      <Tooltip
        title={collapsed ? "Aendimento" : ""}
        placement="right"
      >
        <ListItem
          dense
          button
          component={RouterLink}
          to="/tickets"
          onMouseEnter={() => setConversationsHover(true)}
          onMouseLeave={() => setConversationsHover(false)}
          className={`${classes.listItem} ${isConversationsActive || conversationsHover ? "active" : ""}`}
          style={{ 
            margin: collapsed ? "6px 12px" : "4px 8px",
            padding: collapsed ? "12px 8px" : "8px 12px",
            justifyContent: collapsed ? "center" : "flex-start"
          }}
        >
          <ListItemIcon style={{ minWidth: collapsed ? "auto" : "56px", justifyContent: "center" }}>
            <div
              className={`${classes.iconContainer} ${isConversationsActive || conversationsHover ? "active" : ""}`}
            >
              <ForumIcon />
            </div>
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary={
                <Typography className={classes.listItemText}>
                  Atendimento
                </Typography>
              }
            />
          )}
        </ListItem>
      </Tooltip>
      {/*
        Chat interno desativado por solicitação:
        {showInternalChat && (
          <ListItemLink
            to="/chats"
            primary="Chat Interno"
            icon={
              <Badge color="secondary" variant="dot" invisible={invisible}>
                <ForumIcon />
              </Badge>
            }
            tooltip={collapsed}
          />
        )}
      */}

      {/* CRM — abre direto no Kanban (ou Tags); demais seções nas abas da página */}
      <Tooltip
        title={collapsed ? "CRM" : ""}
        placement="right"
      >
        <ListItem
          dense
          button
          component={RouterLink}
          to={showKanban ? "/kanban" : "/tags"}
          onMouseEnter={() => setCrmHover(true)}
          onMouseLeave={() => setCrmHover(false)}
          className={`${classes.listItem} ${isCrmActive || crmHover ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
          style={{
            margin: collapsed ? "6px 12px" : "4px 8px",
            padding: collapsed ? "12px 8px" : "8px 12px",
            justifyContent: collapsed ? "center" : "flex-start"
          }}
        >
          <ListItemIcon style={{ minWidth: collapsed ? "auto" : "56px", justifyContent: "center" }}>
            <div
              className={`${classes.iconContainer} ${isCrmActive || crmHover ? "active" : ""}`}
            >
              <ManageAccounts />
            </div>
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary={
                <Typography className={classes.listItemText}>
                  CRM
                </Typography>
              }
            />
          )}
        </ListItem>
      </Tooltip>

      {/* Submenu Agendamentos */}
      <Tooltip
        title={collapsed ? "Agendamentos" : ""}
        placement="right"
      >
        <ListItem
          dense
          button
          onClick={() => setOpenSchedulingSubmenu((prev) => !prev)}
          onMouseEnter={() => setSchedulingHover(true)}
          onMouseLeave={() => setSchedulingHover(false)}
          className={`${classes.listItem} ${isSchedulingActive || schedulingHover ? "active" : ""}`}
          style={{ 
            margin: collapsed ? "6px 12px" : "4px 8px",
            padding: collapsed ? "12px 8px" : "8px 12px",
            justifyContent: collapsed ? "center" : "flex-start"
          }}
        >
          <ListItemIcon style={{ minWidth: collapsed ? "auto" : "56px", justifyContent: "center" }}>
            <div
              className={`${classes.iconContainer} ${isSchedulingActive || schedulingHover ? "active" : ""}`}
            >
              <ScheduleIcon />
            </div>
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary={
                <Typography className={classes.listItemText}>
                  Agendamentos
                </Typography>
              }
            />
          )}
          {!collapsed && (
            <ExpandMoreIcon 
              className={`${classes.expandIcon} ${openSchedulingSubmenu ? "expanded" : ""}`}
            />
          )}
        </ListItem>
      </Tooltip>
      <Collapse
        in={openSchedulingSubmenu}
        timeout="auto"
        unmountOnExit
        className={classes.submenuContainer}
      >
        <List dense component="div" disablePadding className={classes.submenuContainer}>
          {showSchedules && (
            <ListItemLink
              to="/schedules"
              primary="WhatsApp"
              icon={<WhatsAppIcon />}
              tooltip={collapsed}
            />
          )}
          <ListItemLink
            to="/calcom-integration"
            primary="Cal Agenda"
            icon={<ScheduleIcon />}
            tooltip={collapsed}
          />
        </List>
      </Collapse>

      {hasHelps && (
        <ListItemLink
          to="/helps"
          primary={i18n.t("mainDrawer.listItems.helps")}
          icon={<HelpOutlineIcon />}
          tooltip={collapsed}
        />
      )}

      {user?.showCampaign === "enabled" && showCampaigns && (
        <>
          <Tooltip
            title={collapsed ? i18n.t("mainDrawer.listItems.campaigns") : ""}
            placement="right"
          >
            <ListItem
              dense
              button
              onClick={() => setOpenCampaignSubmenu((prev) => !prev)}
              onMouseEnter={() => setCampaignHover(true)}
              onMouseLeave={() => setCampaignHover(false)}
              className={`${classes.listItem} ${isCampaignRouteActive || campaignHover ? "active" : ""}`}
              style={{ 
                margin: collapsed ? "6px 12px" : "4px 8px",
                padding: collapsed ? "12px 8px" : "8px 12px",
                justifyContent: collapsed ? "center" : "flex-start"
              }}
            >
              <ListItemIcon style={{ minWidth: collapsed ? "auto" : "56px", justifyContent: "center" }}>
                <div
                  className={`${classes.iconContainer} ${isCampaignRouteActive || campaignHover ? "active" : ""}`}
                >
                  <CampaignIcon />
                </div>
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={
                    <Typography className={classes.listItemText}>
                      {i18n.t("mainDrawer.listItems.campaigns")}
                    </Typography>
                  }
                />
              )}
              {!collapsed && (
                <ExpandMoreIcon 
                  className={`${classes.expandIcon} ${openCampaignSubmenu ? "expanded" : ""}`}
                />
              )}
            </ListItem>
          </Tooltip>
          <Collapse
            in={openCampaignSubmenu}
            timeout="auto"
            unmountOnExit
            className={classes.submenuContainer}
          >
            <List dense component="div" disablePadding className={classes.submenuContainer}>
              <ListItemLink
                to="/campaigns"
                primary={i18n.t("campaigns.subMenus.list")}
                icon={<PlaylistAdd />}
                tooltip={collapsed}
              />
              <ListItemLink
                to="/contact-lists"
                primary={i18n.t("campaigns.subMenus.listContacts")}
                icon={<ContactMail />}
                tooltip={collapsed}
              />
              <ListItemLink
                to="/campaigns-config"
                primary={i18n.t("campaigns.subMenus.settings")}
                icon={<Tune />}
                tooltip={collapsed}
              />
            </List>
          </Collapse>
        </>
      )}

      {/* FLOWBUILDER */}
      {user.showFlow === "enabled" && (
        <>
          <Tooltip
            title={
              collapsed ? i18n.t("mainDrawer.listItems.campaigns") : ""
            }
            placement="right"
          >
            <ListItem
              dense
              button
              onClick={() => setOpenFlowSubmenu((prev) => !prev)}
              onMouseEnter={() => setFlowHover(true)}
              onMouseLeave={() => setFlowHover(false)}
              className={`${classes.listItem} ${isFlowbuilderRouteActive || flowHover ? "active" : ""}`}
              style={{ 
                margin: collapsed ? "6px 12px" : "4px 8px",
                padding: collapsed ? "12px 8px" : "8px 12px",
                justifyContent: collapsed ? "center" : "flex-start"
              }}
            >
              <ListItemIcon style={{ minWidth: collapsed ? "auto" : "56px", justifyContent: "center" }}>
                <div
                  className={`${classes.iconContainer} ${isFlowbuilderRouteActive || flowHover ? "active" : ""}`}
                >
                  <AutoAwesome />
                </div>
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={
                    <Typography className={classes.listItemText}>
                      {i18n.t("mainDrawer.listItems.automations")}
                    </Typography>
                  }
                />
              )}
              {!collapsed && (
                <ExpandMoreIcon 
                  className={`${classes.expandIcon} ${openFlowSubmenu ? "expanded" : ""}`}
                />
              )}
            </ListItem>
          </Tooltip>

          <Collapse
            in={openFlowSubmenu}
            timeout="auto"
            unmountOnExit
            className={classes.submenuContainer}
          >
            <List dense component="div" disablePadding className={classes.submenuContainer}>
              <ListItemLink
                to="/phrase-lists"
                primary={"Fluxo de Campanha"}
                icon={<AutoGraph />}
                tooltip={collapsed}
              />

              <ListItemLink
                to="/flowbuilders"
                primary={"Fluxo de conversa"}
                icon={<SmartToy />}
                tooltip={collapsed}
              />
              <ListItemLink
                to="/quick-messages"
                primary={i18n.t("mainDrawer.listItems.quickMessages")}
                icon={<BoltIcon />}
                tooltip={collapsed}
              />

              <ListItemLink
                to="/simulador"
                primary={"Simulador"}
                icon={<CalculateOutlined />}
                tooltip={collapsed}
              />

              <ListItemLink
                to="/plugins/floup"
                primary={"Config. Follow UP"}
                icon={<IntegrationInstructions />}
                tooltip={collapsed}
              />
            </List>
          </Collapse>
        </>
      )}

      {/* Submenu WhatsApps */}
      <Can
        role={
          user.profile === "user" && user.allowConnections === "enabled"
            ? "admin"
            : user.profile
        }
        perform={"drawer-admin-items:view"}
        yes={() => (
          <>
            <Tooltip
              title={collapsed ? "WhatsApps" : ""}
              placement="right"
            >
              <ListItem
                dense
                button
                component={RouterLink}
                to="/connections"
                onMouseEnter={() => setConnectionsHover(true)}
                onMouseLeave={() => setConnectionsHover(false)}
                className={`${classes.listItem} ${isConnectionsActive || connectionsHover ? "active" : ""}`}
                style={{ 
                  margin: collapsed ? "6px 12px" : "4px 8px",
                  padding: collapsed ? "12px 8px" : "8px 12px",
                  justifyContent: collapsed ? "center" : "flex-start"
                }}
              >
                <ListItemIcon style={{ minWidth: collapsed ? "auto" : "56px", justifyContent: "center" }}>
                  {connectionWarning ? (
                    <Badge
                      badgeContent="!"
                      color="error"
                      overlap="circular"
                      className={classes.badge}
                    >
                      <div
                        className={`${classes.iconContainer} ${isConnectionsActive || connectionsHover ? "active" : ""}`}
                      >
                        <SyncAltIcon />
                      </div>
                    </Badge>
                  ) : (
                    <div
                      className={`${classes.iconContainer} ${isConnectionsActive || connectionsHover ? "active" : ""}`}
                    >
                      <SyncAltIcon />
                    </div>
                  )}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={
                      <Typography className={classes.listItemText}>
                        WhatsApps
                      </Typography>
                    }
                  />
                )}
              </ListItem>
            </Tooltip>
            {/*
              NotificameHub comentado por solicitação:
              <ListItemLink
                small
                to="/notificamehub"
                primary="NotificameHub"
                icon={<DeviceHub />}
                tooltip={collapsed}
              />
            */}
          </>
        )}
      />

      {/* Submenu Configurações */}
      <Can
        role={
          user.profile === "user" && user.allowConnections === "enabled"
            ? "admin"
            : user.profile
        }
        perform="dashboard:view"
        yes={() => (
          <>
            <Tooltip
              title={collapsed ? "Configurações" : ""}
              placement="right"
            >
              <ListItem
                dense
                button
                onClick={() => setOpenConfiguracoesSubmenu((prev) => !prev)}
                onMouseEnter={() => setConfiguracoesHover(true)}
                onMouseLeave={() => setConfiguracoesHover(false)}
                className={`${classes.listItem} ${isConfiguracoesActive || configuracoesHover ? "active" : ""}`}
                style={{ 
                  margin: collapsed ? "6px 12px" : "4px 8px",
                  padding: collapsed ? "12px 8px" : "8px 12px",
                  justifyContent: collapsed ? "center" : "flex-start"
                }}
              >
                <ListItemIcon style={{ minWidth: collapsed ? "auto" : "56px", justifyContent: "center" }}>
                  <div
                    className={`${classes.iconContainer} ${isConfiguracoesActive || configuracoesHover ? "active" : ""}`}
                  >
                    <SettingsIcon />
                  </div>
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={
                      <Typography className={classes.listItemText}>
                        Configurações
                      </Typography>
                    }
                  />
                )}
                {!collapsed && (
                  <ExpandMoreIcon 
                    className={`${classes.expandIcon} ${openConfiguracoesSubmenu ? "expanded" : ""}`}
                  />
                )}
              </ListItem>
            </Tooltip>
            <Collapse
              in={openConfiguracoesSubmenu}
              timeout="auto"
              unmountOnExit
              className={classes.submenuContainer}
            >
              <List dense component="div" disablePadding className={classes.submenuContainer}>
                <Can
                  role={user.profile}
                  perform="dashboard:view"
                  yes={() => (
                    <ListItemLink
                      small
                      to="/settings"
                      primary="Geral"
                      icon={<SettingsIcon />}
                      tooltip={collapsed}
                    />
                  )}
                />
                <Can
                  role={user.profile}
                  perform="dashboard:view"
                  yes={() => (
                    <ListItemLink
                      small
                      to="/users"
                      primary="Usuários"
                      icon={<PeopleIcon />}
                      tooltip={collapsed}
                    />
                  )}
                />
                {showIntegrations && (
                  <Can
                    role={user.profile}
                    perform="dashboard:view"
                    yes={() => (
                      <ListItemLink
                        small
                        to="/queue-integration"
                        primary="Integrações"
                        icon={<DeviceHub />}
                        tooltip={collapsed}
                      />
                    )}
                  />
                )}
                <Can
                  role={user.profile}
                  perform="dashboard:view"
                  yes={() => (
                    <ListItemLink
                      small
                      to="/queues"
                      primary="Departamentos"
                      icon={<AccountTreeIcon />}
                      tooltip={collapsed}
                    />
                  )}
                />
                {showExternalApi && (
                  <Can
                    role={user.profile}
                    perform="dashboard:view"
                    yes={() => (
                      <ListItemLink
                        small
                        to="/messages-api"
                        primary="API"
                        icon={<CodeIcon />}
                        tooltip={collapsed}
                      />
                    )}
                  />
                )}
                {showOpenAi && (
                  <Can
                    role={user.profile}
                    perform="dashboard:view"
                    yes={() => (
                      <ListItemLink
                        small
                        to="/prompts"
                        primary="Talk.IA"
                        icon={<AllInclusive />}
                        tooltip={collapsed}
                      />
                    )}
                  />
                )}
                <Can
                  role={user.profile}
                  perform="dashboard:view"
                  yes={() => (
                    <ListItemLink
                      small
                      to="/backup"
                      primary="Backup"
                      icon={<CloudQueue />}
                      tooltip={collapsed}
                    />
                  )}
                />
                <Can
                  role={user.profile}
                  perform="dashboard:view"
                  yes={() => (
                    <ListItemLink
                      small
                      to="/files"
                      primary="Lista de Arquivos"
                      icon={<AttachFile />}
                      tooltip={collapsed}
                    />
                  )}
                />
              </List>
            </Collapse>
          </>
        )}
      />

      <Can
        role={
          user.profile === "user" && user.allowConnections === "enabled"
            ? "admin"
            : user.profile
        }
        perform="dashboard:view"
        yes={() => (
          <>
            <Divider className={classes.divider} />

            {user.super && (
              <ListItemLink
                to="/announcements"
                primary={i18n.t("mainDrawer.listItems.annoucements")}
                icon={<AnnouncementIcon />}
                tooltip={collapsed}
              />
            )}

            {user.super && (
              <ListItemLink
                to="/allConnections"
                primary={i18n.t("mainDrawer.listItems.allConnections")}
                icon={<PhoneAndroid />}
                tooltip={collapsed}
              />
            )}

            {/* Financeiro — oculto temporariamente
            <Can
              role={user.profile}
              perform="dashboard:view"
              yes={() => (
                <ListItemLink
                  to="/financeiro"
                  primary={i18n.t("mainDrawer.listItems.financeiro")}
                  icon={<LocalAtmIcon />}
                  tooltip={collapsed}
                />
              )}
            />
            */}

            {user.super && (
              <ListItemLink
                to="/companies"
                primary={i18n.t("mainDrawer.listItems.companies")}
                icon={<BusinessIcon />}
                tooltip={collapsed}
              />
            )}
          </>
        )}
      />
      {!collapsed && (
        <React.Fragment>
          <Divider />
          <Typography
            style={{
              fontSize: "12px",
              padding: "10px",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
          </Typography>
        </React.Fragment>
      )}
    </div>
  );
};

export default MainListItems;