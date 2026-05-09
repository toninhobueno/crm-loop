import React, { useState, useContext, useEffect, useMemo, useCallback } from "react";
import clsx from "clsx";
import {
  makeStyles,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  Button,
  MenuItem,
  IconButton,
  Menu,
  useTheme,
  useMediaQuery,
  Avatar,
  Badge,
  withStyles,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  InputAdornment,
} from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import NotificationsIcon from "@material-ui/icons/Notifications";
import CachedIcon from "@material-ui/icons/Cached";
import api from "../services/api";
import MainListItems from "./MainListItems";
import NotificationsPopOver from "../components/NotificationsPopOver";
import NotificationsVolume from "../components/NotificationsVolume";
import UserModal from "../components/UserModal";
import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";
import { i18n } from "../translate/i18n";
import toastError from "../errors/toastError";
import { toast } from "react-toastify";
import AnnouncementsPopover from "../components/AnnouncementsPopover";
import BirthdayModal from "../components/BirthdayModal";
import logo from "../assets/logo.png";
import logoDark from "../assets/logo-black.png";
import ChatPopover from "../pages/Chat/ChatPopover";
import { useDate } from "../hooks/useDate";
import ColorModeContext from "../layout/themeContext";
import Brightness4Icon from "@material-ui/icons/Brightness4";
import Brightness7Icon from "@material-ui/icons/Brightness7";
import { getBackendUrl } from "../config";
import useSettings from "../hooks/useSettings";
import useSocketListener from "../hooks/useSocketListener";
import { FaGlobe } from "react-icons/fa";
import PhoneIcon from "@material-ui/icons/Phone";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import DialogContentText from "@material-ui/core/DialogContentText";
import WavoipPhoneWidget from "../components/WavoipCall";

const backendUrl = getBackendUrl();
const drawerWidth = 240;


const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "100vh",
    [theme.breakpoints.down("sm")]: {
      height: "calc(100vh - 56px)",
    },
    background:
      theme.mode === "light"
        ? "linear-gradient(165deg, #f8fafc 0%, #f1f5f9 42%, #e8eef5 100%)"
        : "linear-gradient(165deg, #0f172a 0%, #121c2f 55%, #0b1220 100%)",
    backgroundAttachment: "fixed",
    "& .MuiButton-outlinedPrimary": {
      color: theme.palette.primary.main, // Usa cor do tema
      border: `1px solid ${theme.palette.primary.main}40`,
      borderRadius: "12px",
      fontWeight: 600,
      textTransform: "none",
      transition: "all 0.3s ease",
      "&:hover": {
        backgroundColor: `${theme.palette.primary.main}10`,
        borderColor: theme.palette.primary.main,
        transform: "translateY(-1px)",
        boxShadow: `0 4px 12px ${theme.palette.primary.main}30`,
      },
    },
    "& .MuiTab-textColorPrimary.Mui-selected": {
      color: theme.palette.primary.main, // Usa cor do tema
      fontWeight: 700,
    },
  },

  chip: {
    background: "red",
    color: "white",
  },

  avatar: {
    width: "100%",
  },

  toolbar: {
    paddingRight: "16px",
    paddingLeft: "8px",
    minHeight: "64px !important",
    height: "64px",
    color: "#ffffff",
    background: `linear-gradient(145deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark || theme.palette.primary.main} 55%, ${theme.palette.primary.main}DD 100%)`,
    boxShadow:
      theme.mode === "light"
        ? "0 8px 32px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.22)"
        : "0 12px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: "8%",
      right: "8%",
      height: "42%",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.12) 40%, transparent 100%)",
      borderRadius: "0 0 40% 40%",
      pointerEvents: "none",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "1px",
      background:
        theme.mode === "light"
          ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)"
          : "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
    },
    "& > *": {
      position: "relative",
      zIndex: 1,
    },
  },

  toolbarIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 8px",
    minHeight: "56px",
    [theme.breakpoints.down("sm")]: {
      height: "52px",
    },
    background:
      theme.mode === "light"
        ? "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)"
        : "linear-gradient(180deg, #1e293b 0%, #172033 100%)",
    borderBottom:
      theme.mode === "light"
        ? "1px solid rgba(148, 163, 184, 0.2)"
        : "1px solid rgba(255, 255, 255, 0.06)",
    boxShadow:
      theme.mode === "light"
        ? "inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 3px rgba(15,23,42,0.06)"
        : "inset 0 1px 0 rgba(255,255,255,0.06)",
    transition: "all 0.3s ease",
    position: "relative",
    "&::after": {
      content: '""',
      position: "absolute",
      bottom: 0,
      left: "12%",
      right: "12%",
      height: "1px",
      background:
        theme.mode === "light"
          ? "linear-gradient(90deg, transparent, rgba(59,130,246,0.12), transparent)"
          : "linear-gradient(90deg, transparent, rgba(96,165,250,0.15), transparent)",
    },
  },

  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },

  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },

  menuButtonHidden: {
    display: "none",
  },

  title: {
    flexGrow: 1,
    fontSize: "15px",
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: 500,
    letterSpacing: "0.01em",
    marginLeft: "12px",
    display: "flex",
    alignItems: "center",
    "& b": {
      fontWeight: 600,
      color: "#ffffff",
      margin: "0 4px",
    },
    [theme.breakpoints.down("sm")]: {
      fontSize: "13px",
      marginLeft: "8px",
    },
  },

  drawerPaper: {
    position: "relative",
    whiteSpace: "nowrap",
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: "hidden",
    overflowY: "hidden",
    background:
      theme.mode === "light"
        ? "linear-gradient(175deg, #ffffff 0%, #f8fafc 45%, #f1f5f9 100%)"
        : "linear-gradient(175deg, #1e293b 0%, #172033 50%, #0f172a 100%)",
    borderRight:
      theme.mode === "light"
        ? "1px solid rgba(148, 163, 184, 0.22)"
        : "1px solid rgba(255, 255, 255, 0.06)",
    boxShadow:
      theme.mode === "light"
        ? "12px 0 40px rgba(15, 23, 42, 0.06), inset -1px 0 0 rgba(255,255,255,0.6)"
        : "16px 0 48px rgba(0, 0, 0, 0.35), inset -1px 0 0 rgba(255,255,255,0.04)",
  },

  drawerPaperClose: {
    overflowX: "hidden",
    overflowY: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing(7),
    [theme.breakpoints.up("sm")]: {
      width: "90px",
    },
  },

  appBarSpacer: {
    minHeight: "64px",
  },

  content: {
    flex: 1,
    overflow: "auto",
    padding: 0,
    margin: 0,
  },

  container: {
    padding: 0,
    margin: 0,
    maxWidth: "none",
    width: "100%",
  },

  containerWithScroll: {
    flex: 1,
    overflowY: "scroll",
    overflowX: "hidden",
    ...theme.scrollbarStyles,
    borderRadius: "8px",
    border: "2px solid transparent",
    "&::-webkit-scrollbar": {
      display: "none",
    },
    "-ms-overflow-style": "none",
    "scrollbar-width": "none",
  },

  NotificationsPopOver: {
    // Mantém original
  },

  logo: {
    width: "100%",
    height: "45px",
    maxWidth: 180,
    [theme.breakpoints.down("sm")]: {
      width: "auto",
      height: "100%",
      maxWidth: 180,
    },
    logo: theme.logo,
    content:
      "url(" +
      (theme.mode === "light"
        ? theme.calculatedLogoLight()
        : theme.calculatedLogoDark()) +
      ")",
    transition: "all 0.3s ease", // Transição suave
    "&:hover": {
      transform: "scale(1.02)", // Pequeno zoom no hover
    },
  },

  hideLogo: {
    display: "none",
  },

  avatar2: {
    width: "40px",
    height: "40px",
    cursor: "pointer",
    borderRadius: "50%",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    "&:hover": {
      transform: "scale(1.08)",
      borderColor: "rgba(255, 255, 255, 0.6)",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
    },
  },
  
  userMenuWrapper: {
    position: "relative",
    marginLeft: "8px",
  },

  updateDiv: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  // Botões da toolbar melhorados
  toolbarButton: {
    color: "rgba(255, 255, 255, 0.9)",
    borderRadius: "12px",
    padding: "8px",
    margin: "0 2px",
    transition: "all 0.3s ease",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.14)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      transform: "translateY(-1px)",
    },
    "&:active": {
      transform: "translateY(0)",
    },
  },

  // Menu hambúrguer modernizado
  menuButton: {
    color: "rgba(255, 255, 255, 0.95)",
    marginRight: "8px",
    padding: "10px",
    borderRadius: "14px",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.16)",
      transform: "scale(1.04)",
      boxShadow:
        "0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.28)",
    },
    "& .MuiSvgIcon-root": {
      transition: "transform 0.3s ease",
      fontSize: "24px",
    },
    "&:hover .MuiSvgIcon-root": {
      transform: "rotate(90deg)",
    },
  },
  
  // Container de ações da toolbar
  toolbarActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginLeft: "auto",
  },
  
  // Botões de ação modernizados
  actionButton: {
    color: "rgba(255, 255, 255, 0.9)",
    padding: "10px",
    borderRadius: "14px",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.16)",
      color: "#ffffff",
      transform: "translateY(-2px)",
      boxShadow:
        "0 8px 24px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255,255,255,0.25)",
    },
    "& .MuiSvgIcon-root": {
      fontSize: "20px",
      transition: "transform 0.25s ease",
    },
    "&:hover .MuiSvgIcon-root": {
      transform: "scale(1.08)",
    },
  },

  // Seletor de idioma modernizado
  languageSelector: {
    position: "relative",
    display: "inline-block",
    "& > button": {
      background: "rgba(255, 255, 255, 0.1)",
      border: "none",
      borderRadius: "10px",
      color: "rgba(255, 255, 255, 0.95)",
      fontSize: "20px",
      padding: "10px 14px",
      cursor: "pointer",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      "&:hover": {
        background: "rgba(255, 255, 255, 0.2)",
        transform: "translateY(-2px)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      },
    },
    "& > div": {
      position: "absolute",
      top: "50px",
      right: "0",
      background: "#ffffff",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
      borderRadius: "12px",
      padding: "8px",
      zIndex: 1000,
      minWidth: "140px",
      border: "1px solid rgba(0, 0, 0, 0.05)",
      "& button": {
        background: "none",
        border: "none",
        color: "#475569",
        display: "block",
        width: "100%",
        padding: "10px 14px",
        textAlign: "left",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 500,
        transition: "all 0.2s ease",
        cursor: "pointer",
        "&:hover": {
          background: `${theme.palette.primary.main}08`,
          color: theme.palette.primary.main,
          transform: "translateX(4px)",
        },
      },
    },
  },

  drawerCollapseButton: {
    borderRadius: "14px",
    padding: "8px",
    color: theme.mode === "light" ? "#475569" : "#e2e8f0",
    backgroundColor:
      theme.mode === "light"
        ? "rgba(148, 163, 184, 0.14)"
        : "rgba(255, 255, 255, 0.08)",
    boxShadow:
      theme.mode === "light"
        ? "inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(15,23,42,0.06)"
        : "inset 0 1px 0 rgba(255,255,255,0.1)",
    transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      backgroundColor:
        theme.mode === "light"
          ? "rgba(59, 130, 246, 0.12)"
          : "rgba(255, 255, 255, 0.12)",
      transform: "scale(1.05)",
    },
  },

  // Badge animado
  animatedBadge: {
    "& .MuiBadge-badge": {
      animation: "$heartbeat 2s infinite",
    },
  },

  "@keyframes heartbeat": {
    "0%": { transform: "scale(1)" },
    "14%": { transform: "scale(1.1)" },
    "28%": { transform: "scale(1)" },
    "42%": { transform: "scale(1.1)" },
    "70%": { transform: "scale(1)" },
  },
}));

const StyledBadge = withStyles((theme) => ({
  badge: {
    backgroundColor: "#44b700",
    color: "#44b700",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "$ripple 1.2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": {
      transform: "scale(.8)",
      opacity: 1,
    },
    "100%": {
      transform: "scale(2.4)",
      opacity: 0,
    },
  },
}))(Badge);

const SmallAvatar = withStyles((theme) => ({
  root: {
    width: 22,
    height: 22,
    border: `2px solid ${theme.palette.background.paper}`,
  },
}))(Avatar);

const LoggedInLayout = ({ children, themeToggle, hideMenu = false }) => {
  const classes = useStyles();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { handleLogout, loading, user, socket } = useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVariant, setDrawerVariant] = useState("permanent");

  const [showOptions, setShowOptions] = useState(false);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);

  const theme = useTheme();
  const { colorMode } = useContext(ColorModeContext);
  const greaterThenSm = useMediaQuery(theme.breakpoints.up("sm"));

  const [volume, setVolume] = useState(localStorage.getItem("volume") || 1);

  const { dateToClient } = useDate();
  const [profileUrl, setProfileUrl] = useState(null);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [wavoipToken, setWavoipToken] = useState(null);
  const [whatsappData, setWhatsappData] = useState(null);
  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loadingContacts, setLoadingContacts] = useState(false);


  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mainListItems = useMemo(
    () => <MainListItems drawerOpen={drawerOpen} collapsed={!drawerOpen} />,
    [user, drawerOpen]
  );

  const settings = useSettings();

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data } = await api.get("/announcements/for-company", {
          params: {
            status: true,
            pageNumber: "1"
          }
        });

        // Filtra apenas os informativos ativos e não expirados
        const activeAnnouncements = data.records.filter(announcement => {
          const isActive = announcement.status === true || announcement.status === "true";
          const isNotExpired = !announcement.expiresAt || new Date(announcement.expiresAt) > new Date();
          return isActive && isNotExpired;
        });

        setAnnouncements(activeAnnouncements);

        // Mostra o modal apenas se houver informativos ativos
        if (activeAnnouncements.length > 0) {
          setShowAnnouncementsModal(true);
        }
      } catch (err) {
        toastError(err);
      }
    };

    if (user?.id) {
      fetchAnnouncements();
    }
  }, [user?.id]);

  useEffect(() => {
    // if (localStorage.getItem("public-token") === null) {
    //   handleLogout()
    // }

    if (document.body.offsetWidth > 600) {
      if (user.defaultMenu === "closed") {
        setDrawerOpen(false);
      } else {
        setDrawerOpen(true);
      }
    }
    if (user.defaultTheme === "dark" && theme.mode === "light") {
      colorMode.toggleColorMode();
    }
  }, [user.defaultMenu, document.body.offsetWidth]);

  useEffect(() => {
    if (document.body.offsetWidth < 600) {
      setDrawerVariant("temporary");
    } else {
      setDrawerVariant("permanent");
    }
  }, [drawerOpen]);

  useEffect(() => {
    const companyId = user?.companyId;

    if (companyId) {
      const buildProfileUrl = () => {
        const savedProfileImage = localStorage.getItem("profileImage");
        const currentProfileImage = savedProfileImage || user.profileImage;

        if (currentProfileImage) {
          return `${backendUrl}/public/company${companyId}/user/${currentProfileImage}`;
        }
        return `${backendUrl}/public/app/noimage.png`;
      };

      setProfileUrl(buildProfileUrl());
    }
  }, [user?.companyId, user?.profileImage, backendUrl]);

  // Callbacks dos eventos
  const handleAuthEvent = useCallback((data) => {
    if (data.user.id === +user?.id) {
      toastError("Sua conta foi acessada em outro computador.");
      setTimeout(() => {
        localStorage.clear();
        window.location.reload();
      }, 1000);
    }
  }, [user?.id]);

  const handleUserUpdate = useCallback((data) => {
    if (data.action === "update" && data.user.id === +user?.id) {
      if (data.user.profileImage) {
        const newProfileUrl = `${backendUrl}/public/company${user?.companyId}/user/${data.user.profileImage}`;
        setProfileUrl(newProfileUrl);
        localStorage.setItem("profileImage", data.user.profileImage);
      }
    }
  }, [user?.companyId, user?.id, backendUrl]);

  // Callbacks para eventos de aniversário
  const handleUserBirthday = useCallback((data) => {
    console.log("🎂 Evento de aniversário de usuário recebido:", data);
    if (data.userId === +user?.id) {
      setShowBirthdayModal(true);
    }
  }, [user?.id]);

  const handleContactBirthday = useCallback((data) => {
    console.log("🎂 Evento de aniversário de contato recebido:", data);
    // Para contatos, apenas logamos por enquanto
    // A mensagem já foi enviada automaticamente pelo backend
  }, []);

  // Verificar aniversários no login
  const checkBirthdaysOnLogin = useCallback(async () => {
    if (user?.id && user?.companyId) {
      try {
        const { data } = await api.get("/birthdays/today");
        const birthdayData = data.data;

        // Verificar se o usuário atual faz aniversário hoje
        const userBirthday = birthdayData.users.find(u => u.id === +user.id);
        if (userBirthday) {
          console.log("🎂 Usuário faz aniversário hoje! Mostrando modal...");
          setShowBirthdayModal(true);
        }

        // Se há aniversariantes, mostrar notificação
        if (birthdayData.users.length > 0 || birthdayData.contacts.length > 0) {
          console.log("🎂 Há aniversariantes hoje:", birthdayData);
        }
      } catch (error) {
        console.error("Erro ao verificar aniversários:", error);
      }
    }
  }, [user?.id, user?.companyId]);

  // Registrar listeners
  useSocketListener(socket, user, 'auth', handleAuthEvent);
  useSocketListener(socket, user, 'user', handleUserUpdate);
  useSocketListener(socket, user, 'user-birthday', handleUserBirthday);
  useSocketListener(socket, user, 'contact-birthday', handleContactBirthday);

  // Verificar aniversários quando o usuário faz login
  useEffect(() => {
    if (user?.id && user?.companyId) {
      // Pequeno delay para garantir que o socket esteja conectado
      const timer = setTimeout(() => {
        checkBirthdaysOnLogin();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user?.id, user?.companyId, checkBirthdaysOnLogin]);

  // Status do usuário
  useEffect(() => {
    if (socket?.emit && user?.companyId) {
      socket.emit("userStatus");

      const interval = setInterval(() => {
        socket?.emit && socket.emit("userStatus");
      }, 1000 * 60 * 5);

      return () => clearInterval(interval);
    }
  }, [socket, user?.companyId]);


  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuOpen(false);
  };

  const handleOpenUserModal = () => {
    setUserModalOpen(true);
    handleCloseMenu();
  };

  const handleClickLogout = () => {
    handleCloseMenu();
    handleLogout();
  };

  const drawerClose = () => {
    if (document.body.offsetWidth < 600 || user.defaultMenu === "closed") {
      setDrawerOpen(false);
    }
  };

  const handleRefreshPage = () => {
    window.location.reload(false);
  };

  const handleMenuItemClick = () => {
    const { innerWidth: width } = window;
    if (width <= 600) {
      setDrawerOpen(false);
    }
  };

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
    window.location.reload();
  };

  const LANGUAGE_OPTIONS = [
    { code: "pt-BR", label: "Português" },
    { code: "en", label: "English" },
    { code: "es", label: "Spanish" },
    { code: "ar", label: "عربي" },
  ];

  const [enabledLanguages, setEnabledLanguages] = useState(["pt-BR", "en"]);
  const { getAll } = useSettings();
  useEffect(() => {
    async function fetchSettings() {
      try {
        const settings = await getAll();
        const enabledLanguagesSetting = settings.find(
          (s) => s.key === "enabledLanguages"
        )?.value;
        let langs = ["pt-BR", "en"];
        try {
          if (enabledLanguagesSetting) {
            langs = JSON.parse(enabledLanguagesSetting);
          }
        } catch { }
        console.log(
          "Layout - enabledLanguages carregadas:",
          langs,
          "para companyId:",
          user?.companyId
        );
        setEnabledLanguages(langs);
      } catch (error) {
        console.log("Layout - erro ao carregar enabledLanguages:", error);
      }
    }
    fetchSettings();
  }, [user?.companyId]);

  const filteredLanguageOptions = LANGUAGE_OPTIONS.filter((lang) =>
    enabledLanguages.includes(lang.code)
  );

  if (loading) {
    return <BackdropLoading />;
  }

  return (
    <div className={clsx(classes.root, "logged-in-layout")}>
      {!hideMenu && (
        <Drawer
          variant={drawerVariant}
          className={drawerOpen ? classes.drawerPaper : classes.drawerPaperClose}
          classes={{
            paper: clsx(
              classes.drawerPaper,
              !drawerOpen && classes.drawerPaperClose
            ),
          }}
          open={drawerOpen}
        >
          <div className={classes.toolbarIcon}>
            <img
              className={drawerOpen ? classes.logo : classes.hideLogo}
              style={{
                display: "block",
                margin: "0 auto",
                height: "50px",
                width: "100%",
              }}
              alt="logo"
            />
            <IconButton
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={classes.drawerCollapseButton}
              aria-label={drawerOpen ? "Recolher menu" : "Expandir menu"}
            >
              <ChevronLeftIcon />
            </IconButton>
          </div>
          <List className={classes.containerWithScroll}>
            {/* {mainListItems} */}
            <MainListItems collapsed={!drawerOpen} />
          </List>
          <Divider />
        </Drawer>
      )}

      <AppBar
        position="absolute"
        className={clsx(classes.appBar, !hideMenu && drawerOpen && classes.appBarShift)}
        color="primary"
      >
        <Toolbar variant="dense" className={classes.toolbar}>
          {!hideMenu && (
            <IconButton
              edge="start"
              aria-label="open drawer"
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={clsx(classes.menuButton, drawerOpen && classes.menuButtonHidden)}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            component="h2"
            variant="h6"
            color="inherit"
            noWrap
            className={classes.title}
          >
            {/* {greaterThenSm && user?.profile === "admin" && getDateAndDifDays(user?.company?.dueDate).difData < 7 ? ( */}
            {greaterThenSm &&
              user?.profile === "admin" &&
              user?.company?.dueDate ? (
              <>
                {i18n.t("mainDrawer.appBar.user.message")} <b>{user.name}</b>,{" "}
                {i18n.t("mainDrawer.appBar.user.messageEnd")}{" "}
                <b>{user?.company?.name}</b>! (
                {i18n.t("mainDrawer.appBar.user.active")}{" "}
                {dateToClient(user?.company?.dueDate)})
              </>
            ) : (
              <>
                {i18n.t("mainDrawer.appBar.user.message")} <b>{user.name}</b>,{" "}
                {i18n.t("mainDrawer.appBar.user.messageEnd")}{" "}
                <b>{user?.company?.name}</b>!
              </>
            )}
          </Typography>

          {!hideMenu && (
            <div className={classes.toolbarActions}>
              {/* Botão de Telefone */}
              <IconButton
                onClick={async () => {
                  try {
                    const { data } = await api.get("/call/whatsapp/wavoip");
                    if (data?.whatsapp) {
                      setWhatsappData(data.whatsapp); // Armazena name, number, wavoip
                      setWavoipToken(data.whatsapp.wavoip || null);
                      setPhoneModalOpen(true);
                    } else {
                      toastError("Token Wavoip não encontrado. Configure o token no WhatsApp.");
                    }
                  } catch (err) {
                    toastError("Erro: Token Wavoip não encontrado. Configure o token no WhatsApp.");
                  }
                }}
                className={classes.actionButton}
                aria-label="fazer ligação"
              >
                <PhoneIcon />
              </IconButton>

              {/* Seletor de Idioma */}
              <div className={classes.languageSelector}>
                <button
                  onClick={() => setShowOptions(!showOptions)}
                >
                  <FaGlobe />
                </button>

                {showOptions && (
                  <div>
                    {filteredLanguageOptions.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggle de Tema */}
              <IconButton 
                onClick={colorMode.toggleColorMode}
                className={classes.actionButton}
                aria-label="toggle theme"
              >
                {theme.mode === "dark" ? (
                  <Brightness7Icon />
                ) : (
                  <Brightness4Icon />
                )}
              </IconButton>

              {/* Volume de Notificações */}
              <NotificationsVolume setVolume={setVolume} volume={volume} />

              {/* Botão de Refresh */}
              <IconButton
                onClick={handleRefreshPage}
                aria-label={i18n.t("mainDrawer.appBar.refresh")}
                className={classes.actionButton}
              >
                <CachedIcon />
              </IconButton>

              {/* Notificações */}
              {user.id && <NotificationsPopOver volume={volume} />}

              {/* Anúncios */}
              <AnnouncementsPopover />

              {/* Chat */}
              <ChatPopover />

              {/* Avatar do Usuário */}
              <div className={classes.userMenuWrapper}>
                <StyledBadge
                  overlap="circular"
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                  }}
                  variant="dot"
                  onClick={handleMenu}
                >
                  <Avatar
                    alt={user.name || "User"}
                    className={classes.avatar2}
                    src={profileUrl}
                  />
                </StyledBadge>

                <UserModal
                  open={userModalOpen}
                  onClose={() => setUserModalOpen(false)}
                  onImageUpdate={(newProfileUrl) => setProfileUrl(newProfileUrl)}
                  userId={user?.id}
                />

                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  getContentAnchorEl={null}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  open={menuOpen}
                  onClose={handleCloseMenu}
                  PaperProps={{
                    style: {
                      minWidth: "180px",
                      maxWidth: "220px",
                      width: "auto",
                      borderRadius: "12px",
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                      border: "1px solid rgba(0, 0, 0, 0.05)",
                      marginTop: "8px",
                    },
                  }}
                  MenuListProps={{
                    style: {
                      padding: "8px",
                    },
                  }}
                >
                  <MenuItem 
                    onClick={handleOpenUserModal}
                    style={{
                      borderRadius: "8px",
                      marginBottom: "4px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {i18n.t("mainDrawer.appBar.user.profile")}
                  </MenuItem>
                  <MenuItem 
                    onClick={handleClickLogout}
                    style={{
                      borderRadius: "8px",
                      color: "#ef4444",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {i18n.t("mainDrawer.appBar.user.logout")}
                  </MenuItem>
                </Menu>
              </div>
            </div>
          )}
        </Toolbar>
      </AppBar>
      <main className={classes.content}>
        <div className={classes.appBarSpacer} />
        {children ? children : null}
      </main>

      {/* Modal de Informativos */}
      <Dialog
        open={showAnnouncementsModal}
        onClose={() => setShowAnnouncementsModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Informativos</DialogTitle>
        <DialogContent dividers>
          {selectedAnnouncement ? (
            <div>
              <Typography variant="h6" gutterBottom>
                {selectedAnnouncement.title}
              </Typography>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {selectedAnnouncement.text}
              </Typography>
              {selectedAnnouncement.mediaPath && (
                <div style={{ marginTop: 16 }}>
                  <img
                    src={`${backendUrl}/public/company${user.companyId}${selectedAnnouncement.mediaPath}`}
                    alt="Anexo"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              )}
              <Button
                onClick={() => setSelectedAnnouncement(null)}
                style={{ marginTop: 16 }}
                variant="outlined"
              >
                Voltar para lista
              </Button>
            </div>
          ) : (
            <List>
              {announcements.map((announcement) => (
                <ListItem
                  button
                  key={announcement.id}
                  onClick={() => setSelectedAnnouncement(announcement)}
                >
                  <ListItemAvatar>
                    <Avatar>
                      <NotificationsIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={announcement.title}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="textPrimary"
                        >
                          Prioridade: {announcement.priority === 1 ? 'Alta' : announcement.priority === 2 ? 'Média' : 'Baixa'}
                        </Typography>
                        {` — ${new Date(announcement.createdAt).toLocaleDateString()}`}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowAnnouncementsModal(false)}
            color="primary"
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Telefone */}
      <Dialog
        open={phoneModalOpen}
        onClose={() => {
          setPhoneModalOpen(false);
          setContactSearch("");
          setContacts([]);
          setSelectedContact(null);
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          style: {
            maxHeight: '90vh',
            overflow: 'hidden',
            backgroundColor: '#ddd',
            background: '#ddd'
          }
        }}
        BackdropProps={{
          style: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }
        }}
      >
        {wavoipToken ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#ddd',
            padding: '10px',
            gap: '12px'
          }}>
            {/* Busca de Contatos com Autocomplete */}
            <div style={{ 
              position: 'relative',
              zIndex: 10000
            }}>
              <Autocomplete
                fullWidth
                freeSolo
                clearOnEscape
                options={contacts}
                loading={loadingContacts}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option.name || option.number || '';
                }}
                renderOption={(option) => (
                  <div style={{ 
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer'
                  }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      {option.name || 'Sem nome'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {option.number}
                    </span>
                  </div>
                )}
                onChange={(event, newValue) => {
                  if (newValue && typeof newValue === 'object') {
                    setSelectedContact(newValue);
                  } else {
                    setSelectedContact(null);
                  }
                }}
                onInputChange={async (event, newInputValue) => {
                  setContactSearch(newInputValue);
                  if (newInputValue && newInputValue.length >= 2) {
                    setLoadingContacts(true);
                    try {
                      const { data } = await api.get("/contacts/list", {
                        params: { name: newInputValue }
                      });
                      setContacts(data || []);
                    } catch (err) {
                      console.error("Erro ao buscar contatos:", err);
                      setContacts([]);
                    } finally {
                      setLoadingContacts(false);
                    }
                  } else {
                    setContacts([]);
                    setSelectedContact(null);
                  }
                }}
                inputValue={contactSearch}
                value={selectedContact}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Buscar contato..."
                    variant="outlined"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <React.Fragment>
                          {loadingContacts ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                    style={{ backgroundColor: 'white' }}
                  />
                )}
                PaperComponent={(props) => (
                  <Paper 
                    {...props} 
                    style={{
                      ...props.style,
                      marginTop: '4px',
                      maxHeight: '250px'
                    }}
                  />
                )}
              />
            </div>

            {/* Widget de Telefone */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              position: 'relative'
            }}>
              <WavoipPhoneWidget
                token={wavoipToken}
                position="static"
                name={whatsappData?.name || whatsappData?.number || user?.company?.name || "Telefone"}
                country="BR"
                autoConnect={true}
                initialNumber={selectedContact?.number?.replace(/\D/g, "") || ""}
                onCallStart={(data) => {
                  console.log("Chamada iniciada:", data);
                  toast.success("Chamada iniciada!");
                }}
                onCallEnd={(data) => {
                  console.log("Chamada finalizada:", data);
                  toast.info("Chamada finalizada!");
                }}
                onConnectionStatus={(status) => {
                  console.log("Status conexão:", status);
                }}
                onError={(error) => {
                  console.error("Erro:", error);
                  toastError(error);
                }}
              />
              
              {/* Botão de Fechar */}
              <IconButton
                aria-label="close"
                onClick={() => {
                  setPhoneModalOpen(false);
                  setContactSearch("");
                  setContacts([]);
                  setSelectedContact(null);
                }}
                style={{
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  backgroundColor: 'white',
                  zIndex: 10002,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                ×
              </IconButton>
            </div>
          </div>
        ) : (
          <DialogContent style={{ backgroundColor: 'white', borderRadius: '8px', padding: 20 }}>
            <DialogContentText style={{ textAlign: 'center' }}>
              ⚠️ Token Wavoip não encontrado. Configure o token no WhatsApp.
            </DialogContentText>
          </DialogContent>
        )}
      </Dialog>

      {/* Modal de Aniversário */}
      <BirthdayModal
        open={showBirthdayModal}
        onClose={() => setShowBirthdayModal(false)}
        user={user}
      />

    </div>
  );
};

export default LoggedInLayout;