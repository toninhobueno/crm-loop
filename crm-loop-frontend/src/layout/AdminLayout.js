import React, { useContext, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Hidden,
  Button,
  makeStyles,
  useTheme,
  Container,
} from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import DashboardIcon from "@material-ui/icons/Dashboard";
import CreditCardIcon from "@material-ui/icons/CreditCard";
import PeopleOutlineIcon from "@material-ui/icons/PeopleOutline";
import VpnKeyOutlined from "@material-ui/icons/VpnKeyOutlined";
import SettingsIcon from "@material-ui/icons/Settings";
import DeviceHubIcon from "@material-ui/icons/DeviceHub";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import PaletteIcon from "@material-ui/icons/Palette";
import AssessmentOutlined from "@material-ui/icons/AssessmentOutlined";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";

import { AuthContext } from "../context/Auth/AuthContext";

const drawerWidth = 260;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    width: "100%",
    overflow: "hidden",
    backgroundColor:
      theme.palette.type === "dark" ? theme.palette.background.default : "#eef2f7",
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    boxShadow: "0 2px 12px rgba(15, 23, 42, 0.1)",
    background: `linear-gradient(92deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
  },
  toolbarMain: {
    justifyContent: "space-between",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    minHeight: 64,
  },
  toolbarSpacer: theme.mixins.toolbar,
  bodyRow: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  drawerDesktop: {
    width: drawerWidth,
    flexShrink: 0,
    display: "flex",
  },
  drawerPaper: {
    width: drawerWidth,
    position: "relative",
    borderRight: "none",
    boxShadow: "4px 0 28px rgba(15, 23, 42, 0.06)",
    borderRight: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15, 23, 42, 0.06)"
    }`,
  },
  drawerHeader: {
    padding: theme.spacing(2, 2.5, 1.5),
    background:
      theme.palette.type === "dark"
        ? "linear-gradient(160deg, rgba(59,130,246,0.12) 0%, transparent 90%)"
        : "linear-gradient(160deg, rgba(59, 130, 246, 0.08) 0%, transparent 90%)",
  },
  drawerSubtitle: {
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 600,
    opacity: 0.75,
    marginBottom: theme.spacing(0.25),
  },
  drawerBrand: {
    fontWeight: 800,
    letterSpacing: "-0.03em",
    fontSize: "1.05rem",
    lineHeight: 1.28,
  },
  main: {
    flex: 1,
    minWidth: 0,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    paddingBottom: theme.spacing(3),
  },
  mainInner: {
    paddingTop: theme.spacing(2.5),
    paddingBottom: theme.spacing(2),
    [theme.breakpoints.down("xs")]: {
      paddingTop: theme.spacing(2),
    },
  },
  brand: {
    fontWeight: 700,
    letterSpacing: "-0.02em",
    fontSize: "1.02rem",
    maxWidth: "min(100%, 520px)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    minWidth: 0,
    flex: 1,
  },
  navItem: {
    borderRadius: theme.spacing(1.25),
    margin: theme.spacing(0.25, 1),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  activeItem: {
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    paddingLeft: theme.spacing(2) - 3,
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(59, 130, 246, 0.12)"
        : "rgba(59, 130, 246, 0.09)",
  },
}));

const NAV = [
  { to: "/admin", exact: true, label: "Painel", Icon: DashboardIcon },
  { to: "/admin/auditoria", label: "Auditoria / resumo", Icon: AssessmentOutlined },
  { to: "/admin/usuarios-master", label: "Usuários master", Icon: VpnKeyOutlined },
  { to: "/admin/planos", label: "Planos e licenças", Icon: CreditCardIcon },
  { to: "/admin/clientes", label: "Clientes", Icon: PeopleOutlineIcon },
  { to: "/admin/conexoes", label: "Conexões na rede", Icon: DeviceHubIcon },
  { to: "/admin/configuracoes", label: "Configurações", Icon: SettingsIcon },
  { to: "/admin/ajudas", label: "Central de ajudas", Icon: HelpOutlineIcon },
  { to: "/admin/whitelabel", label: "Whitelabel", Icon: PaletteIcon },
];

const AdminLayout = ({ children }) => {
  const classes = useStyles();
  const theme = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, handleLogout } = useContext(AuthContext);

  const drawer = (
    <>
      <Box className={classes.drawerHeader}>
        <Typography variant="caption" className={classes.drawerSubtitle} color="textSecondary">
          Gestão da plataforma
        </Typography>
        <Typography className={classes.drawerBrand} color="textPrimary" component="div">
          Backoffice
        </Typography>
        <Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 4 }}>
          {user?.company?.name || ""}
        </Typography>
      </Box>
      <Divider />
      <Box py={0.5}>
        <List disablePadding>
          {NAV.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            const IconComponent = item.Icon;
            return (
              <RouterLink key={item.to} to={item.to} style={{ textDecoration: "none", color: "inherit" }}>
                <ListItem
                  button
                  className={`${classes.navItem} ${active ? classes.activeItem : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <ListItemIcon style={{ minWidth: 40 }}>
                    <IconComponent color={active ? "primary" : "inherit"} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{ variant: "body2", style: { fontWeight: active ? 600 : 500 } }}
                    primary={item.label}
                  />
                </ListItem>
              </RouterLink>
            );
          })}
        </List>
      </Box>
    </>
  );

  return (
    <Box className={classes.root}>
      <CssBaseline />
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar className={classes.toolbarMain}>
          <Box display="flex" alignItems="center" className={classes.logoRow}>
            <Hidden mdUp implementation="css">
              <IconButton edge="start" color="inherit" onClick={() => setMobileOpen(true)} aria-label="abrir menu">
                <MenuIcon />
              </IconButton>
            </Hidden>
            <Typography variant="subtitle1" className={classes.brand} color="inherit" title={user?.name || ""}>
              Olá, {user?.name || "Admin"}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" style={{ gap: 8, flexShrink: 0 }}>
            <Button
              color="inherit"
              size="small"
              component={RouterLink}
              to="/tickets"
              onClick={() => setMobileOpen(false)}
              style={{ textTransform: "none", fontWeight: 600 }}
            >
              Ir para atendimento
            </Button>
            <Button
              color="inherit"
              size="small"
              startIcon={<ExitToAppIcon />}
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              style={{ textTransform: "none", fontWeight: 600 }}
            >
              Sair
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <div className={classes.toolbarSpacer} />

      <Box className={classes.bodyRow}>
        <Hidden smDown implementation="css">
          <Drawer
            variant="permanent"
            className={classes.drawerDesktop}
            classes={{ paper: classes.drawerPaper }}
          >
            {drawer}
          </Drawer>
        </Hidden>

        <Hidden mdUp implementation="css">
          <Drawer
            variant="temporary"
            anchor={theme.direction === "rtl" ? "right" : "left"}
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            classes={{ paper: classes.drawerPaper }}
            ModalProps={{ keepMounted: true }}
          >
            {drawer}
          </Drawer>
        </Hidden>

        <Box component="main" className={classes.main}>
          <Container maxWidth={false} className={classes.mainInner}>
            {children}
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
