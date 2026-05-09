import React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { Box, Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  tabsWrap: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  tabBtn: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 600,
    padding: "6px 14px",
    border: `1px solid ${theme.palette.primary.main}55`,
  },
  activeTab: {
    color: "#fff !important",
    backgroundColor: `${theme.palette.primary.main} !important`,
    borderColor: `${theme.palette.primary.main} !important`,
  },
}));

const DashboardSectionTabs = ({ showFollowup = false }) => {
  const classes = useStyles();
  const location = useLocation();

  const tabs = [
    { to: "/dashboard", label: "Dashboard", active: location.pathname === "/dashboard" },
    { to: "/", label: "Painel", active: location.pathname === "/" },
    { to: "/reports", label: "Relatórios", active: location.pathname.startsWith("/reports") },
  ];

  if (showFollowup) {
    tabs.push({
      to: "/plugins/floup/dashboard",
      label: "Painel FollowUP",
      active: location.pathname.startsWith("/plugins/floup/dashboard"),
    });
  }

  return (
    <Box className={classes.tabsWrap}>
      {tabs.map((tab) => (
        <Button
          key={tab.to}
          component={RouterLink}
          to={tab.to}
          variant={tab.active ? "contained" : "outlined"}
          color="primary"
          size="small"
          className={`${classes.tabBtn} ${tab.active ? classes.activeTab : ""}`}
        >
          {tab.label}
        </Button>
      ))}
    </Box>
  );
};

export default DashboardSectionTabs;
