import React, { useContext, useEffect, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { Box, Paper, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import PhoneInTalkOutlinedIcon from "@mui/icons-material/PhoneInTalkOutlined";

import { AuthContext } from "../../context/Auth/AuthContext";
import usePlans from "../../hooks/usePlans";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    marginBottom: theme.spacing(2),
    flexShrink: 0,
  },
  paper: {
    padding: theme.spacing(0.75, 1),
    borderRadius: 12,
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
    }`,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.04)" : theme.palette.grey[50],
    boxShadow:
      theme.palette.type === "dark"
        ? "none"
        : "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(0.75),
    paddingLeft: theme.spacing(0.5),
    paddingRight: theme.spacing(0.5),
  },
  title: {
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: theme.palette.text.secondary,
  },
  tabsRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: theme.spacing(0.75),
    overflowX: "auto",
    overflowY: "hidden",
    paddingBottom: 2,
    WebkitOverflowScrolling: "touch",
    "&::-webkit-scrollbar": {
      height: 6,
    },
    "&::-webkit-scrollbar-thumb": {
      borderRadius: 8,
      backgroundColor:
        theme.palette.type === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
    },
  },
  tabBtn: {
    flex: "0 0 auto",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.8125rem",
    padding: "8px 14px",
    minHeight: 40,
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)"
    }`,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    textDecoration: "none",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    "&:hover": {
      borderColor: theme.palette.primary.light,
      backgroundColor:
        theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : theme.palette.grey[100],
    },
  },
  tabBtnActive: {
    color: theme.palette.primary.contrastText + " !important",
    backgroundColor: `${theme.palette.primary.main} !important`,
    borderColor: `${theme.palette.primary.main} !important`,
    boxShadow: `0 2px 8px ${theme.palette.primary.main}40`,
    "&:hover": {
      backgroundColor: `${theme.palette.primary.dark} !important`,
      borderColor: `${theme.palette.primary.dark} !important`,
    },
  },
  tabIcon: {
    fontSize: 18,
    opacity: 0.9,
  },
}));

const iconFor = (to, label) => {
  if (to === "/kanban") return ViewWeekIcon;
  if (to === "/tags") return LabelOutlinedIcon;
  if (to === "/contacts") return ContactsOutlinedIcon;
  if (to === "/wallets") return AccountBalanceWalletOutlinedIcon;
  if (to === "/call-historicals") return PhoneInTalkOutlinedIcon;
  return LabelOutlinedIcon;
};

const CrmSectionTabs = () => {
  const classes = useStyles();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { getPlanCompany } = usePlans();
  const { get: getSetting } = useCompanySettings();

  const [showKanban, setShowKanban] = useState(false);
  const [showWallets, setShowWallets] = useState(false);
  const [showWavoipCall, setShowWavoipCall] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadPlan() {
      if (!user?.companyId) return;
      try {
        const planConfigs = await getPlanCompany(undefined, user.companyId);
        if (mounted) {
          setShowKanban(!!planConfigs?.plan?.useKanban);
          setShowWavoipCall(!!planConfigs?.plan?.wavoip);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadPlan();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.companyId]);

  useEffect(() => {
    let mounted = true;
    async function loadWalletsSetting() {
      try {
        const setting = await getSetting({ column: "DirectTicketsToWallets" });
        if (mounted) setShowWallets(!!setting.DirectTicketsToWallets);
      } catch (err) {
        toastError(err);
      }
    }
    loadWalletsSetting();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const path = `${location.pathname}`.toLowerCase();

  const tabActive = (to) => {
    const prefix = `${to}`.toLowerCase();
    if (prefix === "/kanban") return path === "/kanban" || path === "/kanban/";
    if (prefix === "/tags") {
      const p = path.split("?")[0];
      return p === "/tags" || p.startsWith("/tags/");
    }
    if (prefix === "/contacts") return path.startsWith("/contacts");
    if (prefix === "/wallets") return path.startsWith("/wallets");
    if (prefix === "/call-historicals") return path.startsWith("/call-historicals");
    return false;
  };

  const tabs = [];
  if (showKanban) {
    tabs.push({
      to: "/kanban",
      label: i18n.t("mainDrawer.listItems.kanban"),
      active: tabActive("/kanban"),
    });
  }
  tabs.push({
    to: "/tags",
    label: i18n.t("mainDrawer.listItems.tags"),
    active: tabActive("/tags"),
  });
  if (user?.showContacts === "enabled") {
    tabs.push({
      to: "/contacts",
      label: i18n.t("mainDrawer.listItems.contacts"),
      active: tabActive("/contacts"),
    });
  }
  if (user?.profile === "admin" && showWallets) {
    tabs.push({
      to: "/wallets",
      label: i18n.t("mainDrawer.listItems.wallets"),
      active: tabActive("/wallets"),
    });
  }
  if (showWavoipCall) {
    tabs.push({
      to: "/call-historicals",
      label: "H. Ligações",
      active: tabActive("/call-historicals"),
    });
  }

  return (
    <Box className={classes.root}>
      <Paper className={classes.paper} elevation={0} variant="outlined">
        <div className={classes.titleRow}>
          <Typography className={classes.title} variant="caption" color="textSecondary">
            CRM
          </Typography>
        </div>
        <div className={classes.tabsRow}>
          {tabs.map((tab) => {
            const Icon = iconFor(tab.to, tab.label);
            const active = tab.active;
            return (
              <Box
                key={tab.to}
                component={RouterLink}
                to={tab.to}
                className={`${classes.tabBtn} ${active ? classes.tabBtnActive : ""}`}
              >
                <Icon className={classes.tabIcon} />
                <span>{tab.label}</span>
              </Box>
            );
          })}
        </div>
      </Paper>
    </Box>
  );
};

export default CrmSectionTabs;
