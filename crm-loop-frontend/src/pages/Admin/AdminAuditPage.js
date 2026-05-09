import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  makeStyles,
} from "@material-ui/core";
import BusinessIcon from "@material-ui/icons/Business";
import VpnKeyOutlined from "@material-ui/icons/VpnKeyOutlined";
import DeviceHubOutlined from "@material-ui/icons/DeviceHubOutlined";
import AssessmentOutlined from "@material-ui/icons/AssessmentOutlined";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    maxWidth: 960,
    marginLeft: "auto",
    marginRight: "auto",
  },
  intro: {
    marginBottom: theme.spacing(3),
  },
  card: {
    padding: theme.spacing(2.5),
    borderRadius: 14,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(1),
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"
    }`,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(0.5),
  },
  metric: {
    fontSize: "2rem",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1.15,
  },
  caption: {
    fontSize: "0.8125rem",
    color: theme.palette.text.secondary,
    lineHeight: 1.5,
  },
  footer: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2),
    borderRadius: 12,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
  },
}));

const AdminAuditPage = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get("/backoffice/audit-summary");
      setData(res);
    } catch (e) {
      toastError(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <Box py={8} display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box py={4}>
        <Typography color="textSecondary">
          Não foi possível carregar o resumo. Verifique sua sessão master e tente novamente.
        </Typography>
      </Box>
    );
  }

  const fmt = (n) => (typeof n === "number" ? n.toLocaleString("pt-BR") : "—");
  const generated = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleString("pt-BR")
    : "—";

  return (
    <Box className={classes.root}>
      <Box display="flex" alignItems="center" className={classes.intro} style={{ gap: 12 }}>
        <AssessmentOutlined color="primary" style={{ fontSize: 36 }} />
        <Box>
          <Typography variant="h5" style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            Auditoria / resumo
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Visão somente leitura com totais globais da plataforma (todas as organizações).
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper className={classes.card} variant="outlined" elevation={0}>
            <div className={classes.iconWrap}>
              <BusinessIcon />
            </div>
            <Typography variant="overline" color="textSecondary">
              Clientes cadastrados
            </Typography>
            <Typography className={classes.metric} component="p" color="textPrimary">
              {fmt(data?.totalCompanies)}
            </Typography>
            <Typography className={classes.caption}>
              Registros na tabela de empresas (organizações).
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Paper className={classes.card} variant="outlined" elevation={0}>
            <div className={classes.iconWrap}>
              <VpnKeyOutlined />
            </div>
            <Typography variant="overline" color="textSecondary">
              Usuários master
            </Typography>
            <Typography className={classes.metric} component="p" color="textPrimary">
              {fmt(data?.totalMasters)}
            </Typography>
            <Typography className={classes.caption}>
              Contas com flag <code>super</code> em todo o sistema.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Paper className={classes.card} variant="outlined" elevation={0}>
            <div className={classes.iconWrap}>
              <DeviceHubOutlined />
            </div>
            <Typography variant="overline" color="textSecondary">
              Conexões WhatsApp
            </Typography>
            <Typography className={classes.metric} component="p" color="textPrimary">
              {fmt(data?.connections?.active)}
              <Typography
                component="span"
                variant="body2"
                color="textSecondary"
                style={{ fontWeight: 500, marginLeft: 8 }}
              >
                ativas
              </Typography>
            </Typography>
            <Typography className={classes.caption}>
              Total de canais: {fmt(data?.connections?.total)} · Inativas / outro status:{" "}
              {fmt(data?.connections?.inactive)}
            </Typography>
            <Typography className={classes.caption} style={{ marginTop: 4 }}>
              “Ativa” = status <code>CONNECTED</code> no cadastro do canal.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box className={classes.footer}>
        <Typography variant="caption" color="textSecondary" display="block">
          Dados agregados diretamente do banco. Atualizado em: <strong>{generated}</strong>.
        </Typography>
        <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 6 }}>
          Esta página não altera dados; para detalhes use Clientes, Conexões ou Usuários master no menu.
        </Typography>
      </Box>
    </Box>
  );
};

export default AdminAuditPage;
