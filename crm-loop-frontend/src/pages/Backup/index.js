import React, { useState, useEffect, useContext } from "react";
import MainContainer from "../../components/MainContainer";
import { 
  makeStyles, 
  Paper, 
  Tabs, 
  Tab, 
  Box, 
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tooltip,
  FormControlLabel
} from "@material-ui/core";
import {
  CloudUpload,
  CloudDownload,
  Delete,
  Refresh,
  CloudQueue,
  Storage,
  SettingsBackupRestore,
  Schedule,
  CheckCircle,
  Error as ErrorIcon,
  Folder,
  InsertDriveFile,
  PlayArrow,
  CloudOff,
  Restore
} from "@material-ui/icons";

import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
    height: '100%',
    overflow: 'hidden',
  },
  headerContainer: {
    marginBottom: theme.spacing(1.5),
    paddingBottom: theme.spacing(1),
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  headerSubtitle: {
    fontSize: '0.85rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.25),
  },
  mainPaper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    minHeight: 0,
  },
  tabsContainer: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.mode === 'light' ? '#fafafa' : 'rgba(255, 255, 255, 0.02)',
    padding: theme.spacing(0, 2),
    minHeight: 48,
  },
  tab: {
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.9rem',
    minHeight: 48,
    padding: theme.spacing(0.5, 2),
    '&.Mui-selected': {
      color: theme.palette.primary.main,
    },
  },
  contentPaper: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: theme.spacing(2),
    minHeight: 0,
    '&::-webkit-scrollbar': {
      width: 8,
    },
    '&::-webkit-scrollbar-track': {
      background: theme.palette.mode === 'light' ? '#f1f1f1' : 'rgba(255,255,255,0.1)',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.mode === 'light' ? '#888' : 'rgba(255,255,255,0.3)',
      borderRadius: 4,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: theme.palette.mode === 'light' ? '#555' : 'rgba(255,255,255,0.5)',
    },
  },
  card: {
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
    marginBottom: theme.spacing(1.5),
  },
  statusCard: {
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    color: '#fff',
    borderRadius: 10,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1.5),
  },
  statusIcon: {
    fontSize: 36,
    opacity: 0.9,
  },
  backupButton: {
    textTransform: 'none',
    fontWeight: 600,
    padding: theme.spacing(1, 2),
    borderRadius: 8,
    fontSize: '0.875rem',
  },
  backupItem: {
    borderRadius: 6,
    marginBottom: theme.spacing(0.5),
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  chip: {
    fontWeight: 600,
    borderRadius: 6,
    height: 24,
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: theme.spacing(1.5),
    marginTop: theme.spacing(1),
    color: theme.palette.text.primary,
    display: 'flex',
    alignItems: 'center',
  },
}));

const Backup = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    backupEnabled: false,
    backupFrequency: "daily",
    backupTime: "02:00",
    backupDatabase: true,
    backupFiles: true,
    backupRetentionDays: 30,
    backupCloudProvider: "local",
    backupCloudConfig: {},
    backupLastRun: null,
    backupLastStatus: null,
    backupLastError: null,
  });
  const [backups, setBackups] = useState({ database: [], files: [] });
  const [runningBackup, setRunningBackup] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState({ open: false, type: null, fileName: null });
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchBackups();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get("/backup/settings");
      
      // Se data for null ou não existir, usar valores padrão
      if (!data) {
        console.warn('[BACKUP] Nenhuma configuração encontrada, usando padrões');
        return;
      }

      // Garantir que backupCloudConfig seja um objeto ou null
      const cleanedData = {
        ...data,
        backupCloudConfig: data.backupCloudConfig || {},
        backupCloudProvider: data.backupCloudProvider || "local"
      };

      setSettings(cleanedData);
    } catch (err) {
      console.error("Erro ao buscar configurações:", err);
      if (err.response?.status === 404) {
        toast.warn("Configurações não encontradas. Configure agora.");
      } else {
        toast.error("Erro ao carregar configurações de backup");
      }
    }
  };

  const fetchBackups = async () => {
    try {
      const { data } = await api.get("/backup/list");
      setBackups(data);
    } catch (err) {
      console.error("Erro ao buscar backups:", err);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Preparar dados para envio, limpando campos vazios
      const dataToSend = {
        backupEnabled: settings.backupEnabled,
        backupFrequency: settings.backupFrequency,
        backupTime: settings.backupTime,
        backupDatabase: settings.backupDatabase,
        backupFiles: settings.backupFiles,
        backupRetentionDays: settings.backupRetentionDays,
        backupCloudProvider: settings.backupCloudProvider || null,
        backupCloudConfig: (settings.backupCloudConfig && Object.keys(settings.backupCloudConfig).length > 0) 
          ? settings.backupCloudConfig 
          : null
      };

      console.log('[BACKUP] Enviando dados:', dataToSend);

      await api.put("/backup/settings", dataToSend);
      toast.success("Configurações salvas com sucesso!");
      fetchSettings();
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      console.error("Detalhes do erro:", err.response?.data);
      toast.error(err.response?.data?.error || "Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleRunBackup = async () => {
    setRunningBackup(true);
    try {
      const { data } = await api.post("/backup/run?force=true");
      if (data.success) {
        toast.success("Backup executado com sucesso!");
        fetchSettings();
        fetchBackups();
      } else {
        toast.error(`Backup falhou: ${data.errors.join(", ")}`);
      }
    } catch (err) {
      console.error("Erro ao executar backup:", err);
      toast.error("Erro ao executar backup");
    } finally {
      setRunningBackup(false);
    }
  };

  const handleDownload = async (type, fileName) => {
    const toastId = toast.info("📥 Preparando download... Aguarde, isso pode levar alguns minutos para arquivos grandes.", {
      autoClose: false,
      closeButton: false
    });

    try {
      const response = await api.get(`/backup/download/${type}/${fileName}`, {
        responseType: 'blob',
        timeout: 600000, // 10 minutos de timeout para arquivos grandes
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          toast.update(toastId, {
            render: `📥 Baixando: ${percentCompleted}%`,
            type: "info"
          });
        }
      });
      
      toast.update(toastId, {
        render: "💾 Salvando arquivo...",
        type: "info"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Liberar memória
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
      
      toast.update(toastId, {
        render: "✅ Download concluído com sucesso!",
        type: "success",
        autoClose: 5000,
        closeButton: true
      });
    } catch (err) {
      console.error("Erro ao fazer download:", err);
      toast.update(toastId, {
        render: err.message.includes('timeout') 
          ? "⏱️ Timeout: arquivo muito grande. Tente novamente ou baixe diretamente do servidor."
          : "❌ Erro ao fazer download do backup",
        type: "error",
        autoClose: 5000,
        closeButton: true
      });
    }
  };

  const handleDelete = async (type, fileName) => {
    if (!window.confirm("Tem certeza que deseja deletar este backup?")) {
      return;
    }

    try {
      await api.delete(`/backup/delete/${type}/${fileName}`);
      toast.success("Backup deletado com sucesso!");
      fetchBackups();
    } catch (err) {
      console.error("Erro ao deletar backup:", err);
      toast.error("Erro ao deletar backup");
    }
  };

  const handleRestore = async () => {
    if (!window.confirm("⚠️ ATENÇÃO! Restaurar um backup irá SOBRESCREVER os dados atuais. Esta ação não pode ser desfeita. Deseja continuar?")) {
      setRestoreDialog({ open: false, type: null, fileName: null });
      return;
    }

    setLoading(true);
    try {
      const { type, fileName } = restoreDialog;
      const { data } = await api.post(`/backup/restore/${type}/${fileName}`);
      toast.success(data.message || "Backup restaurado com sucesso!");
      setRestoreDialog({ open: false, type: null, fileName: null });
    } catch (err) {
      console.error("Erro ao restaurar backup:", err);
      toast.error("Erro ao restaurar backup");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadRestore = async () => {
    if (!uploadFile) {
      toast.error("Selecione um arquivo para upload");
      return;
    }

    if (!window.confirm("⚠️ ATENÇÃO! Restaurar este backup irá SOBRESCREVER os dados atuais. Deseja continuar?")) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const { data } = await api.post("/backup/restore/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success(data.message || "Backup restaurado com sucesso!");
      setUploadDialog(false);
      setUploadFile(null);
      fetchBackups();
    } catch (err) {
      console.error("Erro ao fazer upload e restaurar:", err);
      toast.error("Erro ao fazer upload do backup");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return format(parseISO(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
    }
  };

  const renderStatusChip = (status) => {
    const statusConfig = {
      success: { label: "Sucesso", color: "primary", icon: <CheckCircle /> },
      failed: { label: "Falhou", color: "secondary", icon: <ErrorIcon /> },
      running: { label: "Executando", color: "default", icon: <Schedule /> },
    };

    const config = statusConfig[status] || { label: "N/A", color: "default" };
    
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        className={classes.chip}
      />
    );
  };

  const renderSettingsTab = () => (
    <Box>
      <Card className={classes.statusCard}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <CloudQueue className={classes.statusIcon} />
          </Grid>
          <Grid item xs>
            <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 4 }}>
              Status do Backup
            </Typography>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="caption" style={{ opacity: 0.9 }}>
                <strong>Último:</strong> {formatDate(settings.backupLastRun)}
              </Typography>
              {settings.backupLastStatus && renderStatusChip(settings.backupLastStatus)}
            </Box>
            {settings.backupLastError && (
              <Typography variant="caption" style={{ marginTop: 4, opacity: 0.9, display: 'block' }}>
                <strong>Erro:</strong> {settings.backupLastError}
              </Typography>
            )}
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={runningBackup ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
              onClick={handleRunBackup}
              disabled={runningBackup}
              className={classes.backupButton}
              style={{ backgroundColor: '#fff', color: '#1976d2' }}
            >
              {runningBackup ? "Executando..." : "Executar Agora"}
            </Button>
          </Grid>
        </Grid>
      </Card>

      <Card className={classes.card}>
        <CardContent style={{ padding: 16 }}>
          <Typography className={classes.sectionTitle}>
            <SettingsBackupRestore style={{ marginRight: 6, fontSize: 20 }} />
            Configurações Gerais
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.backupEnabled}
                    onChange={(e) => setSettings({ ...settings, backupEnabled: e.target.checked })}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" style={{ fontWeight: 600 }}>
                      Habilitar Backup Automático
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Executa backup automaticamente no horário configurado
                    </Typography>
                  </Box>
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Frequência</InputLabel>
                <Select
                  value={settings.backupFrequency}
                  onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                  label="Frequência"
                  disabled={!settings.backupEnabled}
                >
                  <MenuItem value="daily">Diário</MenuItem>
                  <MenuItem value="weekly">Semanal</MenuItem>
                  <MenuItem value="monthly">Mensal</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Horário"
                type="time"
                value={settings.backupTime}
                onChange={(e) => setSettings({ ...settings, backupTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                disabled={!settings.backupEnabled}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.backupDatabase}
                    onChange={(e) => setSettings({ ...settings, backupDatabase: e.target.checked })}
                    color="primary"
                    size="small"
                  />
                }
                label={<Typography variant="body2">Backup do Banco de Dados</Typography>}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.backupFiles}
                    onChange={(e) => setSettings({ ...settings, backupFiles: e.target.checked })}
                    color="primary"
                    size="small"
                  />
                }
                label={<Typography variant="body2">Backup de Arquivos</Typography>}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Dias de Retenção"
                type="number"
                value={settings.backupRetentionDays}
                onChange={(e) => setSettings({ ...settings, backupRetentionDays: parseInt(e.target.value) })}
                variant="outlined"
                helperText="Dias para manter os backups"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Armazenamento</InputLabel>
                <Select
                  value={settings.backupCloudProvider || "local"}
                  onChange={(e) => setSettings({ ...settings, backupCloudProvider: e.target.value })}
                  label="Armazenamento"
                >
                  <MenuItem value="local">
                    <Box display="flex" alignItems="center">
                      <Storage style={{ marginRight: 8 }} /> Local
                    </Box>
                  </MenuItem>
                  <MenuItem value="s3">
                    <Box display="flex" alignItems="center">
                      <CloudQueue style={{ marginRight: 8 }} /> Amazon S3
                    </Box>
                  </MenuItem>
                  <MenuItem value="google-drive" disabled>
                    <Box display="flex" alignItems="center">
                      <CloudOff style={{ marginRight: 8 }} /> Google Drive (Em breve)
                    </Box>
                  </MenuItem>
                  <MenuItem value="dropbox" disabled>
                    <Box display="flex" alignItems="center">
                      <CloudOff style={{ marginRight: 8 }} /> Dropbox (Em breve)
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Configurações S3 */}
            {settings.backupCloudProvider === "s3" && (
              <>
                <Grid item xs={12}>
                  <Divider style={{ margin: '8px 0' }} />
                  <Typography variant="subtitle2" style={{ fontWeight: 600, marginTop: 8, marginBottom: 8 }}>
                    ☁️ Configurações do Amazon S3
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Access Key ID"
                    value={settings.backupCloudConfig?.accessKeyId || ""}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      backupCloudConfig: { 
                        ...settings.backupCloudConfig, 
                        accessKeyId: e.target.value 
                      }
                    })}
                    variant="outlined"
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Secret Access Key"
                    type="password"
                    value={settings.backupCloudConfig?.secretAccessKey || ""}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      backupCloudConfig: { 
                        ...settings.backupCloudConfig, 
                        secretAccessKey: e.target.value 
                      }
                    })}
                    variant="outlined"
                    placeholder="wJalrXUtnFEMI/K7MDENG..."
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Região"
                    value={settings.backupCloudConfig?.region || "us-east-1"}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      backupCloudConfig: { 
                        ...settings.backupCloudConfig, 
                        region: e.target.value 
                      }
                    })}
                    variant="outlined"
                    placeholder="us-east-1"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nome do Bucket"
                    value={settings.backupCloudConfig?.bucket || ""}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      backupCloudConfig: { 
                        ...settings.backupCloudConfig, 
                        bucket: e.target.value 
                      }
                    })}
                    variant="outlined"
                    placeholder="meu-sistema-backups"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Endpoint Customizado (opcional)"
                    value={settings.backupCloudConfig?.endpoint || ""}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      backupCloudConfig: { 
                        ...settings.backupCloudConfig, 
                        endpoint: e.target.value 
                      }
                    })}
                    variant="outlined"
                    placeholder="Para MinIO, DigitalOcean Spaces, etc"
                    helperText="Deixe vazio para AWS S3 padrão"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
        <CardActions style={{ padding: '8px 16px', justifyContent: 'flex-end', backgroundColor: '#fafafa' }}>
          <Button
            variant="contained"
            color="primary"
            size="medium"
            onClick={handleSaveSettings}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} /> : <CheckCircle />}
            className={classes.backupButton}
          >
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardActions>
      </Card>
    </Box>
  );

  const renderBackupsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
          Backups Disponíveis
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CloudUpload />}
            onClick={() => setUploadDialog(true)}
          >
            Upload
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={fetchBackups}
          >
            Atualizar
          </Button>
        </Box>
      </Box>

      <Card className={classes.card}>
        <CardContent style={{ padding: 12 }}>
          <Typography className={classes.sectionTitle}>
            <Storage style={{ marginRight: 6, fontSize: 20 }} />
            Backups do Banco de Dados
          </Typography>
          
          {backups.database.length === 0 ? (
            <Typography variant="caption" color="textSecondary" style={{ textAlign: 'center', padding: 16, display: 'block' }}>
              Nenhum backup de banco de dados encontrado
            </Typography>
          ) : (
            <List>
              {backups.database.map((backup, index) => (
                <React.Fragment key={backup.fileName}>
                  <ListItem className={classes.backupItem}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          <Storage style={{ marginRight: 6, color: '#1976d2', fontSize: 18 }} />
                          <Typography variant="body2" style={{ fontWeight: 500 }}>
                            {backup.fileName}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="textSecondary" style={{ marginLeft: 24 }}>
                          {formatBytes(backup.size)} • {formatDate(backup.createdAt)}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Download">
                        <IconButton size="small" edge="end" onClick={() => handleDownload('database', backup.fileName)}>
                          <CloudDownload fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Restaurar">
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => setRestoreDialog({ open: true, type: 'database', fileName: backup.fileName })}
                        >
                          <Restore fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Deletar">
                        <IconButton size="small" edge="end" onClick={() => handleDelete('database', backup.fileName)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < backups.database.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <Card className={classes.card}>
        <CardContent style={{ padding: 12 }}>
          <Typography className={classes.sectionTitle}>
            <Folder style={{ marginRight: 6, fontSize: 20 }} />
            Backups de Arquivos
          </Typography>
          
          {backups.files.length === 0 ? (
            <Typography variant="caption" color="textSecondary" style={{ textAlign: 'center', padding: 16, display: 'block' }}>
              Nenhum backup de arquivos encontrado
            </Typography>
          ) : (
            <List>
              {backups.files.map((backup, index) => (
                <React.Fragment key={backup.fileName}>
                  <ListItem className={classes.backupItem}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          <InsertDriveFile style={{ marginRight: 6, color: '#f57c00', fontSize: 18 }} />
                          <Typography variant="body2" style={{ fontWeight: 500 }}>
                            {backup.fileName}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="textSecondary" style={{ marginLeft: 24 }}>
                          {formatBytes(backup.size)} • {formatDate(backup.createdAt)}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Download">
                        <IconButton size="small" edge="end" onClick={() => handleDownload('files', backup.fileName)}>
                          <CloudDownload fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Restaurar">
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => setRestoreDialog({ open: true, type: 'files', fileName: backup.fileName })}
                        >
                          <Restore fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Deletar">
                        <IconButton size="small" edge="end" onClick={() => handleDelete('files', backup.fileName)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < backups.files.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Restauração */}
      <Dialog
        open={restoreDialog.open}
        onClose={() => setRestoreDialog({ open: false, type: null, fileName: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <ErrorIcon style={{ color: '#f44336', marginRight: 8 }} />
            Confirmar Restauração
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            ⚠️ <strong>ATENÇÃO:</strong> Esta ação irá <strong>SOBRESCREVER</strong> os dados atuais com o backup selecionado.
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
            Arquivo: <strong>{restoreDialog.fileName}</strong>
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
            Tipo: <strong>{restoreDialog.type === 'database' ? 'Banco de Dados' : 'Arquivos'}</strong>
          </Typography>
          <Typography variant="body2" style={{ marginTop: 16, color: '#f44336' }}>
            Esta ação <strong>NÃO PODE SER DESFEITA</strong>!
          </Typography>
        </DialogContent>
        <DialogActions style={{ padding: 16 }}>
          <Button onClick={() => setRestoreDialog({ open: false, type: null, fileName: null })}>
            Cancelar
          </Button>
          <Button
            onClick={handleRestore}
            variant="contained"
            color="secondary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Restore />}
          >
            {loading ? "Restaurando..." : "Confirmar Restauração"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Upload */}
      <Dialog
        open={uploadDialog}
        onClose={() => setUploadDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload e Restaurar Backup</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Selecione um arquivo de backup (.zip, .dump ou .sql) para fazer upload e restaurar.
          </Typography>
          <Box mt={2}>
            <input
              accept=".zip,.dump,.sql"
              style={{ display: 'none' }}
              id="upload-backup-file"
              type="file"
              onChange={(e) => setUploadFile(e.target.files[0])}
            />
            <label htmlFor="upload-backup-file">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
                fullWidth
              >
                {uploadFile ? uploadFile.name : "Selecionar Arquivo"}
              </Button>
            </label>
          </Box>
        </DialogContent>
        <DialogActions style={{ padding: 16 }}>
          <Button onClick={() => setUploadDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleUploadRestore}
            variant="contained"
            color="primary"
            disabled={!uploadFile || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />}
          >
            {loading ? "Enviando..." : "Upload & Restaurar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return (
    <MainContainer>
      <div className={classes.root}>
        <div className={classes.headerContainer}>
          <Typography className={classes.headerTitle}>
            <CloudQueue style={{ fontSize: 28 }} />
            Sistema de Backup
          </Typography>
          <Typography className={classes.headerSubtitle}>
            Gerencie backups automáticos e restaurações
          </Typography>
        </div>

        <Paper className={classes.mainPaper}>
          <div className={classes.tabsContainer}>
            <Tabs
              value={tab}
              onChange={(e, newValue) => setTab(newValue)}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Configurações" className={classes.tab} />
              <Tab label="Backups" className={classes.tab} />
            </Tabs>
          </div>

          <div className={classes.contentPaper}>
            {tab === 0 && renderSettingsTab()}
            {tab === 1 && renderBackupsTab()}
          </div>
        </Paper>
      </div>
    </MainContainer>
  );
};

export default Backup;

