import React, { useState, useMemo, useContext } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  makeStyles,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from "@material-ui/core";
import CreditCardOutlined from "@material-ui/icons/CreditCardOutlined";
import PeopleOutline from "@material-ui/icons/PeopleOutline";
import DeviceHubOutlined from "@material-ui/icons/DeviceHubOutlined";
import SettingsOutlined from "@material-ui/icons/SettingsOutlined";
import HelpOutlineRounded from "@material-ui/icons/HelpOutlineRounded";
import PaletteOutlined from "@material-ui/icons/PaletteOutlined";
import VpnKeyOutlined from "@material-ui/icons/VpnKeyOutlined";
import AssessmentOutlined from "@material-ui/icons/AssessmentOutlined";

import { AuthContext } from "../../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  hero: {
    borderRadius: 16,
    padding: theme.spacing(2.5, 3),
    marginBottom: theme.spacing(3),
    overflow: "hidden",
    position: "relative",
    color: "#fff",
    boxShadow: "0 12px 40px rgba(15, 23, 42, 0.22)",
    "&::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      background:
        theme.palette.type === "dark"
          ? "radial-gradient(circle at 80% -20%, rgba(255,255,255,0.12), transparent 50%)"
          : "radial-gradient(circle at 90% -10%, rgba(255,255,255,0.25), transparent 45%)",
      pointerEvents: "none",
    },
  },
  heroInner: { position: "relative", zIndex: 1 },
  eyebrow: {
    fontSize: "0.7rem",
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    opacity: 0.88,
    fontWeight: 700,
    marginBottom: theme.spacing(0.5),
  },
  card: {
    height: "100%",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    transition: "box-shadow 0.25s ease, transform 0.2s ease, border-color 0.2s ease",
    border: `1px solid ${theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)"}`,
    cursor: "pointer",
    "&:hover": {
      boxShadow: theme.shadows[8],
      transform: "translateY(-4px)",
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(1.25),
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.09)",
    color: theme.palette.primary.main,
  },
}));

const CARD_LINKS = [
  {
    to: "/admin/auditoria",
    title: "Auditoria / resumo",
    text: "Totais globais da plataforma: empresas, masters e conexões WhatsApp ativas (somente leitura).",
    detail:
      "Números agregados direto do banco para visão rápida. Não substitui relatórios detalhados; use Clientes e Conexões para aprofundar.",
    Icon: AssessmentOutlined,
  },
  {
    to: "/admin/usuarios-master",
    title: "Usuários master",
    text: "Cadastrar novas contas com permissão master (backoffice e recursos exclusivos).",
    detail:
      "Apenas quem já é master pode criar outro usuário com a flag super. O novo login fica na mesma organização da sua sessão e pode acessar /admin/login com e-mail e senha definidos aqui.",
    Icon: VpnKeyOutlined,
  },
  {
    to: "/admin/planos",
    title: "Planos e licenças",
    text: "Criar ou editar planos, limites e recursos habilitados para cada oferta.",
    detail:
      "Utilize esta área para alinhar o que cada plano permite (filas, conexões, campanhas, etc.). As alterações impactam novas associações e renovações conforme sua regra de negócio.",
    Icon: CreditCardOutlined,
  },
  {
    to: "/admin/clientes",
    title: "Clientes",
    text: "Listar organizações cadastradas, planos associados e ações administrativas.",
    detail:
      "Visualize todas as empresas (clientes) da plataforma, edite vínculos com planos, datas de vencimento e demais dados que o módulo de empresas oferecer.",
    Icon: PeopleOutline,
  },
  {
    to: "/admin/conexoes",
    title: "Conexões na rede",
    text: "Visão consolidada de canais WhatsApp por cliente (ativos e inativos).",
    detail:
      "Acompanhe sessões por organização para suporte técnico e auditoria, sem entrar na fila de atendimento.",
    Icon: DeviceHubOutlined,
  },
  {
    to: "/admin/configuracoes",
    title: "Configurações globais",
    text: "Opções do sistema como LGPD, Asaas, Wavoip, mensagens padrão e integrações ligadas ao tenant atual.",
    detail:
      "As alterações são aplicadas no contexto da empresa ativa na sua conta master. Confira antes em ambiente seguro quando houver mensagens automatizadas em produção.",
    Icon: SettingsOutlined,
  },
  {
    to: "/admin/ajudas",
    title: "Central de ajudas",
    text: "Conteúdos de ajuda exibidos para administradores dentro do aplicativo.",
    detail:
      "Mantenha artigos atualizados para reduzir dúvidas na operação das equipes de cada cliente.",
    Icon: HelpOutlineRounded,
  },
  {
    to: "/admin/whitelabel",
    title: "Whitelabel",
    text: "Logos, tema e arquivo visual exibidos no login e na primeira impressão.",
    detail:
      "Envio de marca e cores para personalização institucional; alguns elementos exigem permissão exclusiva master.",
    Icon: PaletteOutlined,
  },
];

const AdminOverview = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const [dialog, setDialog] = useState(null);

  const heroGradientFix = useMemo(() => {
    const sec = theme.palette.secondary?.main;
    const tail = sec || theme.palette.primary.light || theme.palette.primary.main;
    return `linear-gradient(118deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 48%, ${tail} 100%)`;
  }, [theme]);

  return (
    <Box style={{ maxWidth: 1320, marginLeft: "auto", marginRight: "auto" }}>
      <Paper elevation={0} className={classes.hero} style={{ background: heroGradientFix }}>
        <Box className={classes.heroInner}>
          <Typography className={classes.eyebrow}>Painel do backoffice</Typography>
          <Typography variant="h4" component="h1" gutterBottom style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            Olá, {user?.name || "Administrador"}
          </Typography>
        </Box>
      </Paper>

      <Typography variant="h6" style={{ fontWeight: 700, letterSpacing: "-0.01em", marginBottom: theme.spacing(2) }}>
        O que você pode fazer
      </Typography>

      <Grid container spacing={3}>
        {CARD_LINKS.map((c) => {
          const IconComp = c.Icon;
          return (
            <Grid item xs={12} sm={6} lg={4} key={c.to}>
              <Card
                className={classes.card}
                elevation={2}
                onClick={() => setDialog(c)}
                tabIndex={0}
                role="button"
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setDialog(c);
                  }
                }}
              >
                <CardContent>
                  <div className={classes.cardIcon}>
                    <IconComp style={{ fontSize: 26 }} />
                  </div>
                  <Typography variant="subtitle1" gutterBottom style={{ fontWeight: 700 }}>
                    {c.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" style={{ lineHeight: 1.55 }}>
                    {c.text}
                  </Typography>
                </CardContent>
                <CardActions style={{ justifyContent: "flex-end", paddingTop: 0, gap: 8 }}>
                  <Button
                    size="small"
                    variant="text"
                    color="primary"
                    component={RouterLink}
                    to={c.to}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDialog(null);
                    }}
                    style={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Ir agora
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDialog(c);
                    }}
                    style={{ textTransform: "none", borderRadius: 10, fontWeight: 600 }}
                  >
                    Saiba mais
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        maxWidth="sm"
        fullWidth
        scroll="paper"
        aria-labelledby="admin-overview-modal-title"
      >
        <DialogTitle id="admin-overview-modal-title" style={{ fontWeight: 800, paddingBottom: 8 }}>
          {dialog?.title}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" paragraph style={{ color: theme.palette.text.secondary, lineHeight: 1.65 }}>
            {dialog?.detail}
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block" style={{ lineHeight: 1.55 }}>
            Dica: use &quot;Abrir esta secção&quot; para seguir ao módulo. Você sempre pode voltar ao painel com o item
            &quot;Painel&quot; no menu lateral.
          </Typography>
        </DialogContent>
        <DialogActions style={{ padding: theme.spacing(1.5, 2), gap: theme.spacing(1) }}>
          <Button onClick={() => setDialog(null)} style={{ textTransform: "none" }}>
            Fechar
          </Button>
          <Button
            variant="contained"
            color="primary"
            component={RouterLink}
            to={dialog?.to || "/admin"}
            onClick={() => setDialog(null)}
            style={{ textTransform: "none", borderRadius: 10, fontWeight: 700 }}
          >
            Abrir esta secção
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminOverview;
