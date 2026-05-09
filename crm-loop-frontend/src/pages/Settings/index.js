import React, { useState, useEffect, useContext } from "react";
import MainContainer from "../../components/MainContainer";
import { 
  makeStyles, 
  Paper, 
  Tabs, 
  Tab, 
  Box, 
  Typography,
  useTheme 
} from "@material-ui/core";
import {
  Settings as SettingsIcon,
  Schedule,
  Business,
  CreditCard,
  Help,
  Palette,
  CheckCircle,
} from "@material-ui/icons";

import SchedulesForm from "../../components/SchedulesForm";
import CompaniesManager from "../../components/CompaniesManager";
import PlansManager from "../../components/PlansManager";
import HelpsManager from "../../components/HelpsManager";
import Options from "../../components/Settings/Options";
import Whitelabel from "../../components/Settings/Whitelabel";
import FinalizacaoAtendimento from "../../components/Settings/FinalizacaoAtendimento";

import { i18n } from "../../translate/i18n";
import { toast } from "react-toastify";

import useCompanies from "../../hooks/useCompanies";
import { AuthContext } from "../../context/Auth/AuthContext";

import useCompanySettings from "../../hooks/useSettings/companySettings";
import useSettings from "../../hooks/useSettings";
import ForbiddenPage from "../../components/ForbiddenPage";

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
  },
  headerContainer: {
    marginBottom: theme.spacing(2),
    paddingBottom: theme.spacing(1.5),
    borderBottom: `2px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
    letterSpacing: '-0.5px',
    fontFamily: "'Inter', sans-serif",
    marginBottom: theme.spacing(0.5),
  },
  headerSubtitle: {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
    fontWeight: 400,
  },
  mainPaper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
    border: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'}`,
    overflow: 'hidden',
  },
  tabsContainer: {
    borderBottom: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'}`,
    backgroundColor: theme.palette.mode === 'light' ? '#f8f9fa' : 'rgba(255, 255, 255, 0.02)',
    padding: theme.spacing(0, 2),
  },
  tab: {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.875rem',
    minHeight: 48,
    padding: theme.spacing(1, 2),
    '&.Mui-selected': {
      color: theme.palette.primary.main,
    },
  },
  tabIcon: {
    marginRight: theme.spacing(1),
    fontSize: '1.2rem',
  },
  contentPaper: {
    flex: 1,
    ...theme.scrollbarStyles,
    overflowY: 'auto',
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.paper,
  },
  container: {
    width: "100%",
    maxWidth: '100%',
    margin: '0 auto',
  },
}));

const SettingsCustom = () => {
  const classes = useStyles();
  const theme = useTheme();
  const [tab, setTab] = useState("options");
  const [schedules, setSchedules] = useState([]);
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [settings, setSettings] = useState({});
  const [oldSettings, setOldSettings] = useState({});
  const [schedulesEnabled, setSchedulesEnabled] = useState(false);

  const { find, updateSchedules } = useCompanies();

  const { getAll: getAllSettings } = useCompanySettings();
  const { getAll: getAllSettingsOld } = useSettings();
  const { user, socket } = useContext(AuthContext);

  useEffect(() => {
    async function findData() {
      if (!user || !user.companyId) {
        return;
      }

      setLoading(true);
      try {
        const companyId = user.companyId;

        const company = await find(companyId);
        const settingList = await getAllSettings(companyId);
        const settingListOld = await getAllSettingsOld();

        setCompany(company);
        setSchedules(company.schedules);
        setSettings(settingList);
        setOldSettings(settingListOld);
        setSchedulesEnabled(settingList.scheduleType === "company");
        setCurrentUser(user);
      } catch (e) {
        toast.error(e);
      }
      setLoading(false);
    }
    findData();
  }, []);

  useEffect(() => {
    if (!socket || !user || !user.companyId) return;
    const onSettingsEvent = () => {
      getAllSettingsOld().then(setOldSettings);
    };
    socket.on(`company-${user.companyId}-settings`, onSettingsEvent);
    return () => {
      socket.off(`company-${user.companyId}-settings`, onSettingsEvent);
    };
  }, [socket, user]);

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleSubmitSchedules = async (data) => {
    setLoading(true);
    try {
      setSchedules(data);
      await updateSchedules({ id: company.id, schedules: data });
      toast.success("Horários atualizados com sucesso.");
    } catch (e) {
      toast.error(e);
    }
    setLoading(false);
  };

  const isSuper = () => {
    return currentUser && currentUser.super;
  };

  return (
    <MainContainer className={classes.root}>
      {user.profile === "user" ? (
        <ForbiddenPage />
      ) : (
        <>
          <Box className={classes.headerContainer}>
            <Typography className={classes.headerTitle}>
              {i18n.t("settings.title")}
            </Typography>
            <Typography className={classes.headerSubtitle}>
              Configure as opções e preferências do sistema
            </Typography>
          </Box>
          <Paper className={classes.mainPaper} variant="outlined">
            <Box className={classes.tabsContainer}>
              <Tabs
                value={tab}
                indicatorColor="primary"
                textColor="primary"
                scrollButtons="auto"
                variant="scrollable"
                onChange={handleTabChange}
              >
                <Tab 
                  icon={<SettingsIcon className={classes.tabIcon} />}
                  label={i18n.t("settings.tabs.options")} 
                  value={"options"}
                  className={classes.tab}
                />
                {schedulesEnabled && (
                  <Tab 
                    icon={<Schedule className={classes.tabIcon} />}
                    label="Horários" 
                    value={"schedules"}
                    className={classes.tab}
                  />
                )}
                {user.profile === "admin" &&
                  user.finalizacaoComValorVendaAtiva && (
                    <Tab
                      icon={<CheckCircle className={classes.tabIcon} />}
                      label="Finalização do Atendimento"
                      value={"finalizacao"}
                      className={classes.tab}
                    />
                  )}
                {isSuper() && (
                  <Tab
                    icon={<Business className={classes.tabIcon} />}
                    label={i18n.t("settings.tabs.companies")}
                    value={"companies"}
                    className={classes.tab}
                  />
                )}
                {isSuper() && (
                  <Tab 
                    icon={<CreditCard className={classes.tabIcon} />}
                    label={i18n.t("settings.tabs.plans")} 
                    value={"plans"}
                    className={classes.tab}
                  />
                )}
                {isSuper() && (
                  <Tab 
                    icon={<Help className={classes.tabIcon} />}
                    label={i18n.t("settings.tabs.helps")} 
                    value={"helps"}
                    className={classes.tab}
                  />
                )}
                {isSuper() && (
                  <Tab 
                    icon={<Palette className={classes.tabIcon} />}
                    label="Whitelabel" 
                    value={"whitelabel"}
                    className={classes.tab}
                  />
                )}
              </Tabs>
            </Box>
            <Box className={classes.contentPaper}>
              {/* Renderização condicional simples - apenas a aba ativa renderiza */}
              {tab === "schedules" && (
                <div className={classes.container}>
                  <SchedulesForm
                    loading={loading}
                    onSubmit={handleSubmitSchedules}
                    initialValues={schedules}
                  />
                </div>
              )}

              {tab === "companies" && isSuper() && (
                <div className={classes.container}>
                  <CompaniesManager />
                </div>
              )}

              {tab === "plans" && isSuper() && (
                <div className={classes.container}>
                  <PlansManager />
                </div>
              )}

              {tab === "helps" && isSuper() && (
                <div className={classes.container}>
                  <HelpsManager />
                </div>
              )}

              {tab === "whitelabel" && isSuper() && (
                <div className={classes.container}>
                  <Whitelabel settings={oldSettings} />
                </div>
              )}

              {tab === "finalizacao" && (
                <div className={classes.container}>
                  <FinalizacaoAtendimento
                    settings={settings}
                    onSettingsChange={(newSettings) => setSettings(newSettings)}
                  />
                </div>
              )}

              {tab === "options" && (
                <div className={classes.container}>
                  <Options
                    settings={settings}
                    oldSettings={oldSettings}
                    user={currentUser}
                    scheduleTypeChanged={(value) =>
                      setSchedulesEnabled(value === "company")
                    }
                  />
                </div>
              )}
            </Box>
          </Paper>
        </>
      )}
    </MainContainer>
  );
};

export default SettingsCustom;