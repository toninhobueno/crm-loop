import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Tooltip
} from "@material-ui/core";
import { Alert } from "@material-ui/lab";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import { FileCopy, OpenInNew, Refresh } from "@material-ui/icons";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
  card: {
    marginBottom: theme.spacing(2),
  },
  statusChip: {
    marginLeft: theme.spacing(1),
  },
  calendarContainer: {
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 650,
    backgroundColor: '#fff'
  },
  iframe: {
    width: '100%',
    height: 650,
    border: 'none'
  },
  linkBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: theme.spacing(1, 2),
    borderRadius: 4,
    marginTop: theme.spacing(1)
  },
  linkText: {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }
}));

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
      {value === index && children}
    </div>
  );
}

const CalComIntegration = () => {
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);
  const [integration, setIntegration] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.cal.com/v2");
  const [eventTypes, setEventTypes] = useState([]);
  const [selectedEventType, setSelectedEventType] = useState("");
  const [calUsername, setCalUsername] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    fetchIntegrationStatus();
  }, []);

  useEffect(() => {
    if (integration && integration.configured) {
      fetchEventTypes();
      if (tabValue === 2) {
        fetchBookings();
      }
    }
  }, [integration, tabValue]);

  const fetchIntegrationStatus = async () => {
    try {
      const { data } = await api.get("/calcom/status");
      setIntegration(data);
    } catch (error) {
      // Integração não configurada
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      // Primeiro verificar se a integração está funcionando
      const statusResponse = await api.get("/calcom/status");
      if (!statusResponse.data.configured) {
        toast.error("Integração Cal.com não configurada");
        return;
      }

      // Buscar reservas diretamente do Cal.com
      const { data } = await api.get("/calcom/calcom-bookings");
      const bookingsArray = data.bookings || [];
      setBookings(bookingsArray);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("Endpoint não encontrado - verifique se o backend foi atualizado");
      } else if (error.response?.status === 500) {
        toast.error("Erro interno do servidor: " + (error.response?.data?.message || error.message));
      } else {
        toast.error("Erro ao buscar reservas: " + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchEventTypes = async () => {
    setLoadingEventTypes(true);
    try {
      const { data } = await api.get("/calcom/event-types");
      
      const types = data.eventTypes || [];
      const username = data.username || '';
      
      setEventTypes(types);
      setCalUsername(username);
      
      if (types.length > 0 && !selectedEventType) {
        setSelectedEventType(types[0].slug);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("Integração Cal.com não configurada");
      } else {
        toast.error("Erro ao buscar tipos de evento: " + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoadingEventTypes(false);
    }
  };

  const handleConfigureIntegration = async () => {
    if (!apiKey.trim()) {
      toast.error("API Key é obrigatória");
      return;
    }

    setLoading(true);
    try {
      await api.post("/calcom/configure", { apiKey, baseUrl });
      toast.success("Integração configurada com sucesso!");
      await fetchIntegrationStatus();
      setTabValue(0);
    } catch (error) {
      toast.error("Erro ao configurar: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const getBookingUrl = () => {
    if (calUsername && selectedEventType) {
      return `https://cal.com/${calUsername}/${selectedEventType}`;
    }
    return null;
  };

  const getEmbedUrl = () => {
    const url = getBookingUrl();
    return url ? `${url}?embed=true&theme=light&hideEventTypeDetails=false` : null;
  };

  return (
    <div className={classes.root}>
      <Typography variant="h4" gutterBottom>
        Cal Agenda
      </Typography>

      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
        <Tab label="Calendário" />
        <Tab label="Configuração" />
        <Tab label="Reservas" />
      </Tabs>

      {/* Aba Calendário */}
      <TabPanel value={tabValue} index={0}>
        {!integration?.configured ? (
          <Alert severity="info">
            Configure a integração na aba "Configuração" para visualizar o calendário.
          </Alert>
        ) : (
          <>
            <Paper className={classes.paper}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Calendário de Agendamento
                </Typography>
                <IconButton onClick={fetchEventTypes} size="small" disabled={loadingEventTypes}>
                  {loadingEventTypes ? <CircularProgress size={20} /> : <Refresh />}
                </IconButton>
              </Box>

              {loadingEventTypes ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : eventTypes.length === 0 ? (
                <Alert severity="warning">
                  Nenhum tipo de evento encontrado. Crie eventos no Cal.com primeiro.
                </Alert>
              ) : (
                <>
                  <FormControl fullWidth style={{ marginBottom: 16 }}>
                    <InputLabel>Selecione o Tipo de Evento</InputLabel>
                    <Select
                      value={selectedEventType}
                      onChange={(e) => setSelectedEventType(e.target.value)}
                    >
                      {eventTypes.map((eventType) => (
                        <MenuItem key={eventType.id} value={eventType.slug}>
                          {eventType.title} ({eventType.length} min)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {getBookingUrl() && (
                    <Box className={classes.linkBox} mb={2}>
                      <Typography className={classes.linkText}>
                        {getBookingUrl()}
                      </Typography>
                      <Tooltip title="Copiar link">
                        <IconButton size="small" onClick={() => handleCopyLink(getBookingUrl())}>
                          <FileCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Abrir em nova aba">
                        <IconButton size="small" onClick={() => window.open(getBookingUrl(), '_blank')}>
                          <OpenInNew fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}

                  {getEmbedUrl() ? (
                    <Box className={classes.calendarContainer}>
                      <iframe
                        key={selectedEventType}
                        src={getEmbedUrl()}
                        className={classes.iframe}
                        title="Cal.com Booking Calendar"
                        allow="payment"
                      />
                    </Box>
                  ) : (
                    <Alert severity="warning">
                      Não foi possível carregar o calendário. Verifique a configuração.
                    </Alert>
                  )}
                </>
              )}
            </Paper>

            {eventTypes.length > 0 && (
              <Paper className={classes.paper}>
                <Typography variant="h6" gutterBottom>
                  Links de Agendamento
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Compartilhe estes links com seus clientes.
                </Typography>
                
                {eventTypes.map((eventType) => (
                  <Card key={eventType.id} variant="outlined" style={{ marginBottom: 8 }}>
                    <CardContent style={{ padding: 12 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2">{eventType.title}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {eventType.length} minutos
                          </Typography>
                        </Box>
                        <Box>
                          <Tooltip title="Copiar link">
                            <IconButton 
                              size="small" 
                              onClick={() => handleCopyLink(eventType.bookingLink || `https://cal.com/${calUsername}/${eventType.slug}`)}
                            >
                              <FileCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Abrir">
                            <IconButton 
                              size="small" 
                              onClick={() => window.open(eventType.bookingLink || `https://cal.com/${calUsername}/${eventType.slug}`, '_blank')}
                            >
                              <OpenInNew fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Paper>
            )}
          </>
        )}
      </TabPanel>

      {/* Aba Configuração */}
      <TabPanel value={tabValue} index={1}>
        <Paper className={classes.paper}>
          <Typography variant="h6" gutterBottom>
            Configurar Integração
          </Typography>
          
          {integration?.configured && (
            <Alert severity="success" style={{ marginBottom: 16 }}>
              Integração configurada e ativa!
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Key do Cal.com"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="cal_live_..."
                helperText="Obtenha em: Settings > Developer > API Keys no Cal.com"
                type="password"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Base URL da API"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                helperText="Padrão: https://api.cal.com/v2"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleConfigureIntegration}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : "Salvar Configuração"}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {integration?.configured && (
          <Paper className={classes.paper}>
            <Typography variant="h6" gutterBottom>
              Status da Integração
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Status
                    </Typography>
                    <Chip
                      label={integration.active ? "Ativo" : "Inativo"}
                      color={integration.active ? "primary" : "default"}
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Usuário Cal.com
                    </Typography>
                    <Typography variant="body2">
                      {calUsername || "Não identificado"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Tipos de Evento
                    </Typography>
                    <Typography variant="body2">
                      {eventTypes.length} evento(s) configurado(s)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      URL Base
                    </Typography>
                    <Typography variant="body2" style={{ fontSize: '0.85rem' }}>
                      {integration.baseUrl}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        )}
      </TabPanel>

      {/* Aba Reservas */}
      <TabPanel value={tabValue} index={2}>
        {!integration?.configured ? (
          <Alert severity="info">
            Configure a integração na aba "Configuração" para visualizar as reservas.
          </Alert>
        ) : (
          <Paper className={classes.paper}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Reservas do Cal.com
              </Typography>
              <IconButton onClick={fetchBookings} size="small" disabled={loadingBookings}>
                {loadingBookings ? <CircularProgress size={20} /> : <Refresh />}
              </IconButton>
            </Box>

            {loadingBookings ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : bookings.length === 0 ? (
              <Alert severity="info">
                Nenhuma reserva encontrada no Cal.com.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {bookings.map((booking) => (
                  <Grid item xs={12} key={booking.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Box flex={1}>
                            <Typography variant="h6" gutterBottom>
                              {booking.title || 'Agendamento'}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              <strong>Data:</strong> {new Date(booking.startTime).toLocaleDateString('pt-BR')}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              <strong>Horário:</strong> {new Date(booking.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                            {booking.attendees && booking.attendees.length > 0 && (
                              <Typography variant="body2" color="textSecondary" gutterBottom>
                                <strong>Participante:</strong> {booking.attendees[0].name} ({booking.attendees[0].email})
                              </Typography>
                            )}
                            {booking.meetingUrl && (
                              <Box mt={1}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  startIcon={<OpenInNew />}
                                  onClick={() => window.open(booking.meetingUrl, '_blank')}
                                >
                                  Entrar na Reunião
                                </Button>
                              </Box>
                            )}
                          </Box>
                          <Box>
                            <Chip
                              label={booking.status === 'ACCEPTED' ? 'Confirmado' : 
                                     booking.status === 'PENDING' ? 'Pendente' :
                                     booking.status === 'CANCELLED' ? 'Cancelado' : booking.status}
                              color={booking.status === 'ACCEPTED' ? 'primary' : 
                                     booking.status === 'PENDING' ? 'default' :
                                     booking.status === 'CANCELLED' ? 'secondary' : 'default'}
                              size="small"
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        )}
      </TabPanel>
    </div>
  );
};

export default CalComIntegration;