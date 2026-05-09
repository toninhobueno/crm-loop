import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  makeStyles,
  Paper,
  Button,
  TextField,
  Grid,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from "@material-ui/core";
import {
  WhatsApp,
  Instagram,
  Facebook,
  Refresh,
  Add,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error as ErrorIcon,
  FileCopy,
} from "@material-ui/icons";
import { Alert } from "@material-ui/lab";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(3),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  tokenSection: {
    marginBottom: theme.spacing(4),
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.default,
    borderRadius: 8,
  },
  channelsSection: {
    marginTop: theme.spacing(3),
  },
  channelCard: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: theme.shadows[8],
    },
  },
  channelCardContent: {
    flexGrow: 1,
  },
  channelIcon: {
    fontSize: 48,
    marginBottom: theme.spacing(1),
  },
  whatsappIcon: {
    color: "#25D366",
  },
  instagramIcon: {
    color: "#E4405F",
  },
  facebookIcon: {
    color: "#1877F2",
  },
  telegramIcon: {
    color: "#0088cc",
  },
  statusChip: {
    marginTop: theme.spacing(1),
  },
  tokenField: {
    marginBottom: theme.spacing(2),
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing(4),
  },
  emptyState: {
    textAlign: "center",
    padding: theme.spacing(4),
  },
  connectedBadge: {
    backgroundColor: "#4caf50",
    color: "white",
  },
  availableBadge: {
    backgroundColor: "#2196f3",
    color: "white",
  },
}));

const NotificameHub = () => {
  const classes = useStyles();

  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channels, setChannels] = useState([]);
  const [hasToken, setHasToken] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  const [existingConnections, setExistingConnections] = useState([]);

  // Modal para criar conexão
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [connectionName, setConnectionName] = useState("");
  const [connectionToken, setConnectionToken] = useState("");
  const [creatingConnection, setCreatingConnection] = useState(false);

  // Buscar status do token ao carregar
  useEffect(() => {
    fetchTokenStatus();
    fetchExistingConnections();
  }, []);

  const fetchTokenStatus = async () => {
    try {
      const { data } = await api.get("/notificamehub/token");
      setHasToken(data.hasToken);
      if (data.hasToken) {
        setTokenValid(true);
      }
    } catch (err) {
      console.error("Erro ao buscar status do token:", err);
    }
  };

  const fetchExistingConnections = async () => {
    try {
      const { data } = await api.get("/whatsapp?session=0");
      // Filtrar apenas conexões NotificameHub
      const notificamehubConnections = data.filter(
        (w) => w.provider === "notificamehub"
      );
      setExistingConnections(notificamehubConnections);
    } catch (err) {
      console.error("Erro ao buscar conexões existentes:", err);
    }
  };

  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const { data } = await api.get("/notificamehub/channels");
      setChannels(data || []);
      setTokenValid(true);
    } catch (err) {
      console.error("Erro ao buscar canais:", err);
      if (err.response?.status === 400) {
        toast.warning("Configure o token NotificameHub primeiro");
      } else if (err.response?.status === 401) {
        setTokenValid(false);
        toast.error("Token inválido ou expirado");
      }
      setChannels([]);
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  // Buscar canais quando tiver token válido
  useEffect(() => {
    if (hasToken && tokenValid) {
      fetchChannels();
    }
  }, [hasToken, tokenValid, fetchChannels]);

  const handleSaveToken = async () => {
    if (!token.trim()) {
      toast.error("Insira um token válido");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/notificamehub/token", { token: token.trim() });
      
      if (data.connectionsUpdated > 0) {
        toast.success(`Token salvo com sucesso! ${data.connectionsUpdated} conexões foram atualizadas automaticamente.`);
      } else {
        toast.success("Token salvo com sucesso!");
      }
      
      setHasToken(true);
      setTokenValid(true);
      setToken("");
      fetchChannels();
      fetchExistingConnections(); // Atualizar lista de conexões
    } catch (err) {
      toastError(err);
      setTokenValid(false);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateToken = async () => {
    if (!token.trim()) {
      toast.error("Insira um token para validar");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/notificamehub/validate-token", {
        token: token.trim(),
      });
      if (data.valid) {
        toast.success("Token válido!");
        setTokenValid(true);
        // Buscar canais com o token fornecido
        const channelsResponse = await api.post("/notificamehub/channels", {
          token: token.trim(),
        });
        setChannels(channelsResponse.data || []);
      } else {
        toast.error("Token inválido");
        setTokenValid(false);
      }
    } catch (err) {
      toastError(err);
      setTokenValid(false);
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (type) => {
    switch (type) {
      case "whatsapp":
        return <WhatsApp className={`${classes.channelIcon} ${classes.whatsappIcon}`} />;
      case "instagram":
        return <Instagram className={`${classes.channelIcon} ${classes.instagramIcon}`} />;
      case "facebook":
        return <Facebook className={`${classes.channelIcon} ${classes.facebookIcon}`} />;
      default:
        return <WhatsApp className={`${classes.channelIcon}`} />;
    }
  };

  const getChannelTypeName = (type) => {
    switch (type) {
      case "whatsapp":
        return "WhatsApp";
      case "instagram":
        return "Instagram";
      case "facebook":
        return "Facebook Messenger";
      case "telegram":
        return "Telegram";
      default:
        return type;
    }
  };

  const isChannelConnected = (channelId) => {
    return existingConnections.some(
      (conn) => conn.notificamehubChannelId === channelId
    );
  };

  const handleOpenCreateModal = (channel) => {
    setSelectedChannel(channel);
    setConnectionName(channel.name || `${getChannelTypeName(channel.type)} - NotificameHub`);
    setConnectionToken(token || ""); // Usar o token atual se disponível
    setCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
    setSelectedChannel(null);
    setConnectionName("");
    setConnectionToken("");
  };

  const handleCreateConnection = async () => {
    if (!connectionName.trim()) {
      toast.error("Insira um nome para a conexão");
      return;
    }

    if (!connectionToken.trim()) {
      toast.error("Insira o token NotificameHub");
      return;
    }

    setCreatingConnection(true);
    try {
      // Determinar o tipo de canal corretamente
      const channelType = selectedChannel.type || selectedChannel.channel || "whatsapp";
      console.log("🔍 Criando conexão NotificameHub:", {
        selectedChannel,
        channelType,
        name: connectionName.trim(),
        token: connectionToken.substring(0, 8) + "..."
      });

      const response = await api.post("/whatsapp", {
        name: connectionName.trim(),
        channel: channelType,
        provider: "notificamehub",
        notificamehubChannelId: selectedChannel.id,
        notificamehubToken: connectionToken.trim(),
        isDefault: false,
        greetingMessage: "",
        farewellMessage: "",
        status: "CONNECTED",
      });

      // Gerar URL do webhook para exibir
      const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin.replace(':3000', ':8080');
      const newWhatsappId = response.data?.id || response.data?.whatsapp?.id;
      const webhookUrl = `${backendUrl}/webhooks/notificamehub/${newWhatsappId}`;

      toast.success(
        <div>
          <p><strong>Conexão criada com sucesso!</strong></p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            Configure o webhook no NotificameHub:<br/>
            <code style={{ background: '#f5f5f5', padding: '2px 4px', fontSize: '11px' }}>
              {webhookUrl}
            </code>
          </p>
        </div>,
        { autoClose: 10000 }
      );

      handleCloseCreateModal();
      fetchExistingConnections();
    } catch (err) {
      toastError(err);
    } finally {
      setCreatingConnection(false);
    }
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>NotificameHub - Canais de Comunicação</Title>
      </MainHeader>

      <Paper className={classes.mainPaper}>
        {/* Seção de Token */}
        <div className={classes.tokenSection}>
          <Typography variant="h6" gutterBottom>
            Configuração do Token
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Insira seu token da API NotificameHub para listar os canais disponíveis.
            Você pode encontrar o token no painel do NotificameHub.
          </Typography>

          {hasToken && tokenValid && (
            <Alert severity="success" style={{ marginBottom: 16 }}>
              Token configurado e válido. Os canais estão sendo listados abaixo.
            </Alert>
          )}

          {hasToken && tokenValid === false && (
            <Alert severity="error" style={{ marginBottom: 16 }}>
              Token inválido ou expirado. Por favor, insira um novo token.
            </Alert>
          )}

          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Token da API NotificameHub"
                variant="outlined"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type={showToken ? "text" : "password"}
                placeholder="Insira seu token da API"
                className={classes.tokenField}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowToken(!showToken)}
                        edge="end"
                      >
                        {showToken ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    onClick={handleValidateToken}
                    disabled={loading || !token.trim()}
                  >
                    {loading ? <CircularProgress size={24} /> : "Validar"}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleSaveToken}
                    disabled={loading || !token.trim()}
                  >
                    {loading ? <CircularProgress size={24} /> : "Salvar"}
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {hasToken && (
            <Button
              startIcon={<Refresh />}
              onClick={fetchChannels}
              disabled={loadingChannels}
              style={{ marginTop: 16 }}
            >
              Atualizar Canais
            </Button>
          )}
        </div>

        {/* Seção de Canais */}
        <div className={classes.channelsSection}>
          <Typography variant="h6" gutterBottom>
            Canais Disponíveis
          </Typography>

          {loadingChannels ? (
            <div className={classes.loadingContainer}>
              <CircularProgress />
              <Typography variant="body2" style={{ marginLeft: 16 }}>
                Carregando canais...
              </Typography>
            </div>
          ) : channels.length === 0 ? (
            <div className={classes.emptyState}>
              <Typography variant="body1" color="textSecondary">
                {hasToken
                  ? "Nenhum canal encontrado. Verifique se você tem canais configurados no NotificameHub."
                  : "Insira e salve seu token para ver os canais disponíveis."}
              </Typography>
            </div>
          ) : (
            <Grid container spacing={3}>
              {channels.map((channel) => {
                const connected = isChannelConnected(channel.id);
                return (
                  <Grid item xs={12} sm={6} md={4} key={channel.id}>
                    <Card className={classes.channelCard}>
                      <CardContent className={classes.channelCardContent}>
                        <div style={{ textAlign: "center" }}>
                          {getChannelIcon(channel.type)}
                        </div>
                        <Typography variant="h6" align="center" gutterBottom>
                          {channel.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          align="center"
                        >
                          {getChannelTypeName(channel.type)}
                        </Typography>
                        {channel.phone && (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            align="center"
                          >
                            {channel.phone}
                          </Typography>
                        )}
                        <div style={{ textAlign: "center", marginTop: 8 }}>
                          <Chip
                            size="small"
                            icon={connected ? <CheckCircle /> : null}
                            label={connected ? "Conectado" : "Disponível"}
                            className={
                              connected
                                ? classes.connectedBadge
                                : classes.availableBadge
                            }
                          />
                        </div>
                        {channel.id && (
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            align="center"
                            display="block"
                            style={{ marginTop: 8, wordBreak: "break-all" }}
                          >
                            ID: {channel.id}
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions style={{ justifyContent: "center" }}>
                        {!connected ? (
                          <Button
                            size="small"
                            color="primary"
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => handleOpenCreateModal(channel)}
                          >
                            Criar Conexão
                          </Button>
                        ) : (
                          <Button size="small" disabled>
                            Já Conectado
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </div>

        {/* Conexões Existentes */}
        {existingConnections.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <Typography variant="h6" gutterBottom>
              Conexões NotificameHub Ativas
            </Typography>
            <Grid container spacing={2}>
              {existingConnections.map((conn) => {
                const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin.replace(':3000', ':8080');
                const webhookUrl = `${backendUrl}/webhooks/notificamehub/${conn.id}`;

                return (
                  <Grid item xs={12} sm={6} md={6} key={conn.id}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1">{conn.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Canal: {conn.channel || "whatsapp"}
                        </Typography>
                        <Chip
                          size="small"
                          label={conn.status}
                          color={conn.status === "CONNECTED" ? "primary" : "default"}
                          style={{ marginTop: 8, marginBottom: 8 }}
                        />
                        <Typography variant="caption" display="block" style={{ marginTop: 8 }}>
                          <strong>URL do Webhook:</strong>
                        </Typography>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: '#f5f5f5',
                          padding: '4px 8px',
                          borderRadius: 4,
                          marginTop: 4
                        }}>
                          <Typography
                            variant="caption"
                            style={{
                              flex: 1,
                              wordBreak: 'break-all',
                              fontFamily: 'monospace',
                              fontSize: '10px'
                            }}
                          >
                            {webhookUrl}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(webhookUrl);
                              toast.success("URL copiada!");
                            }}
                          >
                            <FileCopy fontSize="small" />
                          </IconButton>
                        </div>
                        <Alert severity="info" style={{ marginTop: 8, padding: '4px 8px' }}>
                          <Typography variant="caption">
                            Configure esta URL no painel do NotificameHub para receber mensagens.
                          </Typography>
                        </Alert>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </div>
        )}
      </Paper>

      {/* Modal para criar conexão */}
      <Dialog
        open={createModalOpen}
        onClose={handleCloseCreateModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Criar Conexão - {selectedChannel?.name}</DialogTitle>
        <DialogContent>
          <Alert severity="info" style={{ marginBottom: 16 }}>
            Você está criando uma conexão para o canal{" "}
            <strong>{getChannelTypeName(selectedChannel?.type)}</strong>.
          </Alert>
          <TextField
            fullWidth
            label="Nome da Conexão"
            variant="outlined"
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            margin="normal"
            autoFocus
          />
          <TextField
            fullWidth
            label="Token NotificameHub"
            variant="outlined"
            value={connectionToken}
            onChange={(e) => setConnectionToken(e.target.value)}
            margin="normal"
            placeholder="Insira o token da API NotificameHub"
            helperText="Token necessário para conectar com a API do NotificameHub"
          />
          {selectedChannel?.phone && (
            <TextField
              fullWidth
              label="Número/ID"
              variant="outlined"
              value={selectedChannel.phone}
              margin="normal"
              disabled
            />
          )}
          <TextField
            fullWidth
            label="ID do Canal"
            variant="outlined"
            value={selectedChannel?.id || ""}
            margin="normal"
            disabled
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateModal} disabled={creatingConnection}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreateConnection}
            color="primary"
            variant="contained"
            disabled={creatingConnection || !connectionName.trim() || !connectionToken.trim()}
          >
            {creatingConnection ? <CircularProgress size={24} /> : "Criar Conexão"}
          </Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default NotificameHub;
