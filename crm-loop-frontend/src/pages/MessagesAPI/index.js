import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Box from "@material-ui/core/Box";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Chip from "@material-ui/core/Chip";
import CodeIcon from "@material-ui/icons/Code";
import MessageIcon from "@material-ui/icons/Message";
import ImageIcon from "@material-ui/icons/Image";
import SendIcon from "@material-ui/icons/Send";
import InfoIcon from "@material-ui/icons/Info";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import DescriptionIcon from "@material-ui/icons/Description";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";

import { i18n } from "../../translate/i18n";
import {
  Button,
  CircularProgress,
  Grid,
  TextField,
  Typography,
  Collapse,
  IconButton,
} from "@material-ui/core";
import { Field, Form, Formik } from "formik";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";

import axios from "axios";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    minHeight: "100vh",
    paddingBottom: theme.spacing(4),
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: theme.spacing(3),
  },
  headerCard: {
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    color: theme.palette.primary.contrastText,
    padding: theme.spacing(4),
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(4),
    boxShadow: theme.shadows[4],
  },
  infoCard: {
    marginBottom: theme.spacing(3),
    borderLeft: `4px solid ${theme.palette.info.main}`,
    backgroundColor: theme.palette.type === "dark" 
      ? "rgba(33, 150, 243, 0.1)" 
      : "rgba(33, 150, 243, 0.05)",
  },
  stepCard: {
    marginBottom: theme.spacing(3),
    transition: "all 0.3s ease",
    "&:hover": {
      boxShadow: theme.shadows[4],
      transform: "translateY(-2px)",
    },
  },
  formCard: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(4),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[2],
  },
  codeBlock: {
    backgroundColor: theme.palette.type === "dark" ? "#1e1e1e" : "#f5f5f5",
    padding: theme.spacing(2.5),
    borderRadius: theme.shape.borderRadius,
    fontFamily: "'Courier New', monospace",
    fontSize: "0.875rem",
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    overflowX: "auto",
    border: `1px solid ${theme.palette.divider}`,
    lineHeight: 1.8,
    position: "relative",
  },
  copyButton: {
    position: "absolute",
    top: theme.spacing(1),
    right: theme.spacing(1),
  },
  fileInput: {
    display: "none",
  },
  fileInputLabel: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    padding: theme.spacing(3),
    border: `2px dashed ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    cursor: "pointer",
    transition: "all 0.3s ease",
    backgroundColor: theme.palette.action.hover,
    "&:hover": {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.action.selected,
      transform: "scale(1.01)",
    },
  },
  submitButton: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(1.5, 5),
    fontSize: "1rem",
    fontWeight: 600,
  },
  stepIcon: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    borderRadius: "50%",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing(2),
  },
  expandIcon: {
    transition: "transform 0.3s",
  },
  expandIconOpen: {
    transform: "rotate(180deg)",
  },
  badge: {
    marginLeft: theme.spacing(1),
  },
  tabContent: {
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
  },
}));

const MessagesAPI = () => {
  const classes = useStyles();
  const history = useHistory();

  const [formMessageTextData] = useState({
    token: "",
    number: "",
    body: "",
    userId: "",
    queueId: "",
  });
  const [formMessageMediaData] = useState({
    token: "",
    number: "",
    medias: "",
    body: "",
    userId: "",
    queueId: "",
  });
  const [formGroupMessageData] = useState({
    token: "",
    groupId: "",
    body: "",
    userId: "",
    queueId: "",
  });
  const [file, setFile] = useState({});
  const [fileName, setFileName] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [expandedDoc, setExpandedDoc] = useState(true);
  const { user } = useContext(AuthContext);

  const { getPlanCompany } = usePlans();

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useExternalApi) {
        toast.error(
          "Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando."
        );
        setTimeout(() => {
          history.push(`/`);
        }, 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getEndpoint = () => {
    return process.env.REACT_APP_BACKEND_URL + "/api/messages/send";
  };

  const getGroupEndpoint = () => {
    return process.env.REACT_APP_BACKEND_URL + "/api/messages/send/group";
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const handleSendTextMessage = async (values) => {
    const { number, body, userId, queueId } = values;
    const data = { number, body, userId, queueId };
    try {
      await axios.request({
        url: getEndpoint(),
        method: "POST",
        data,
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${values.token}`,
        },
      });
      toast.success("✅ Mensagem enviada com sucesso!");
    } catch (err) {
      toastError(err);
    }
  };

  const handleSendGroupMessage = async (values) => {
    const { groupId, body, userId, queueId } = values;
    const data = { groupId, body, userId, queueId };
    try {
      await axios.request({
        url: getGroupEndpoint(),
        method: "POST",
        data,
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${values.token}`,
        },
      });
      toast.success("✅ Mensagem enviada para o grupo com sucesso!");
    } catch (err) {
      toastError(err);
    }
  };

  const handleSendMediaMessage = async (values) => {
    try {
      const firstFile = file[0];
      if (!firstFile) {
        toast.error("Por favor, selecione um arquivo");
        return;
      }
      const data = new FormData();
      data.append("number", values.number);
      data.append("body", values.body ? values.body : firstFile.name);
      data.append("userId", values.userId);
      data.append("queueId", values.queueId);
      data.append("medias", firstFile);
      await axios.request({
        url: getEndpoint(),
        method: "POST",
        data,
        headers: {
          "Content-type": "multipart/form-data",
          Authorization: `Bearer ${values.token}`,
        },
      });
      toast.success("✅ Mensagem com mídia enviada com sucesso!");
    } catch (err) {
      toastError(err);
    }
  };

  const renderFormMessageText = () => {
    return (
      <Formik
        initialValues={formMessageTextData}
        enableReinitialize={true}
        onSubmit={(values, actions) => {
          setTimeout(async () => {
            await handleSendTextMessage(values);
            actions.setSubmitting(false);
            actions.resetForm();
          }, 400);
        }}
      >
        {({ isSubmitting, values }) => (
          <Form>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Field
                  as={TextField}
                  label="Token de Autenticação"
                  name="token"
                  variant="outlined"
                  fullWidth
                  required
                  helperText="Token cadastrado no sistema para autenticação"
                  InputProps={{
                    style: { fontFamily: "monospace" }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Field
                  as={TextField}
                  label="Número do Destinatário"
                  name="number"
                  variant="outlined"
                  fullWidth
                  required
                  placeholder="5585999999999"
                  helperText="Formato: código do país + código de área + número (ex: 5585999999999)"
                  InputProps={{
                    startAdornment: <span style={{ marginRight: 8, color: "#999" }}>+</span>
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Field
                  as={TextField}
                  label="Mensagem"
                  name="body"
                  variant="outlined"
                  fullWidth
                  required
                  multiline
                  rows={5}
                  helperText={`${values.body?.length || 0} caracteres`}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  as={TextField}
                  label="ID do Usuário/Atendente"
                  name="userId"
                  variant="outlined"
                  fullWidth
                  helperText="Opcional - ID do atendente que enviará a mensagem"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  as={TextField}
                  label="ID do departamento"
                  name="queueId"
                  variant="outlined"
                  fullWidth
                  helperText="Opcional - ID do departamento de atendimento"
                />
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" mt={2}>
                  <Button
                    type="submit"
                    color="primary"
                    variant="contained"
                    size="large"
                    className={classes.submitButton}
                    startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    disabled={isSubmitting || !values.token || !values.number || !values.body}
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Mensagem"}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>
    );
  };

  const renderFormGroupMessage = () => {
    return (
      <Formik
        initialValues={formGroupMessageData}
        enableReinitialize={true}
        onSubmit={(values, actions) => {
          setTimeout(async () => {
            await handleSendGroupMessage(values);
            actions.setSubmitting(false);
            actions.resetForm();
          }, 400);
        }}
      >
        {({ isSubmitting, values }) => (
          <Form>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Field
                  as={TextField}
                  label="Token de Autenticação"
                  name="token"
                  variant="outlined"
                  fullWidth
                  required
                  helperText="Token cadastrado no sistema para autenticação"
                  InputProps={{
                    style: { fontFamily: "monospace" }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Field
                  as={TextField}
                  label="ID do Grupo"
                  name="groupId"
                  variant="outlined"
                  fullWidth
                  required
                  placeholder="120363123456789012@g.us ou 120363123456789012"
                  helperText="ID do grupo WhatsApp (com ou sem @g.us)"
                  InputProps={{
                    startAdornment: <span style={{ marginRight: 8, color: "#999" }}>🏷️</span>
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Field
                  as={TextField}
                  label="Mensagem"
                  name="body"
                  variant="outlined"
                  fullWidth
                  required
                  multiline
                  rows={5}
                  helperText={`${values.body?.length || 0} caracteres`}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  as={TextField}
                  label="ID do Usuário/Atendente"
                  name="userId"
                  variant="outlined"
                  fullWidth
                  helperText="Opcional - ID do atendente que enviará a mensagem"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  as={TextField}
                  label="ID do departamento"
                  name="queueId"
                  variant="outlined"
                  fullWidth
                  helperText="Opcional - ID do departamento de atendimento"
                />
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" mt={2}>
                  <Button
                    type="submit"
                    color="primary"
                    variant="contained"
                    size="large"
                    className={classes.submitButton}
                    startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    disabled={isSubmitting || !values.token || !values.groupId || !values.body}
                  >
                    {isSubmitting ? "Enviando..." : "Enviar para Grupo"}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>
    );
  };

  const renderFormMessageMedia = () => {
    return (
      <Formik
        initialValues={formMessageMediaData}
        enableReinitialize={true}
        onSubmit={(values, actions) => {
          setTimeout(async () => {
            await handleSendMediaMessage(values);
            actions.setSubmitting(false);
            actions.resetForm();
            setFile({});
            setFileName("");
            if (document.getElementById("medias")) {
              document.getElementById("medias").files = null;
              document.getElementById("medias").value = null;
            }
          }, 400);
        }}
      >
        {({ isSubmitting, values }) => (
          <Form>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Field
                  as={TextField}
                  label="Token de Autenticação"
                  name="token"
                  variant="outlined"
                  fullWidth
                  required
                  helperText="Token cadastrado no sistema para autenticação"
                  InputProps={{
                    style: { fontFamily: "monospace" }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Field
                  as={TextField}
                  label="Número do Destinatário"
                  name="number"
                  variant="outlined"
                  fullWidth
                  required
                  placeholder="5585999999999"
                  helperText="Formato: código do país + código de área + número"
                  InputProps={{
                    startAdornment: <span style={{ marginRight: 8, color: "#999" }}>+</span>
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Field
                  as={TextField}
                  label="Legenda da Mídia"
                  name="body"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={3}
                  helperText="Opcional - Texto que acompanhará a mídia"
                />
              </Grid>
              <Grid item xs={12}>
                <input
                  type="file"
                  name="medias"
                  id="medias"
                  required
                  className={classes.fileInput}
                  accept="image/*,video/*,audio/*,application/pdf"
                  onChange={(e) => {
                    setFile(e.target.files);
                    setFileName(e.target.files[0]?.name || "");
                  }}
                />
                <label htmlFor="medias" className={classes.fileInputLabel}>
                  <ImageIcon color="primary" style={{ fontSize: 32 }} />
                  <Box flex={1}>
                    <Typography variant="body1" style={{ fontWeight: 500 }}>
                      {fileName || "Clique para selecionar um arquivo"}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Formatos aceitos: Imagem, Vídeo, Áudio ou PDF
                    </Typography>
                  </Box>
                  <Button
                    component="span"
                    variant="contained"
                    color="primary"
                    size="medium"
                  >
                    Escolher arquivo
                  </Button>
                </label>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  as={TextField}
                  label="ID do Usuário/Atendente"
                  name="userId"
                  variant="outlined"
                  fullWidth
                  helperText="Opcional"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field
                  as={TextField}
                  label="ID do departamento"
                  name="queueId"
                  variant="outlined"
                  fullWidth
                  helperText="Opcional"
                />
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" mt={2}>
                  <Button
                    type="submit"
                    color="primary"
                    variant="contained"
                    size="large"
                    className={classes.submitButton}
                    startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    disabled={isSubmitting || !values.token || !values.number || !fileName}
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Mídia"}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>
    );
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setExpandedDoc(true);
  };

  const steps = [
    "Configure o Token",
    "Informe o Número",
    "Digite a Mensagem",
    "Envie"
  ];

  return (
    <div className={classes.root}>
      <MainContainer>
        <MainHeader>
          <Title>
            <CodeIcon style={{ marginRight: 8, verticalAlign: "middle" }} />
            {i18n.t("messagesAPI.API.title") || "API de Mensagens"}
          </Title>
        </MainHeader>
        
        <div className={classes.container}>
          {/* Header Card */}
          <Card className={classes.headerCard}>
            <Box display="flex" alignItems="center" mb={2}>
              <InfoIcon style={{ fontSize: 32, marginRight: 16 }} />
              <Box>
                <Typography variant="h4" style={{ fontWeight: 700, marginBottom: 8 }}>
                  Bem-vindo à API de Mensagens
                </Typography>
                <Typography variant="body1" style={{ opacity: 0.9 }}>
                  Envie mensagens de texto ou mídia através da nossa API de forma simples e rápida
                </Typography>
              </Box>
            </Box>
          </Card>

          {/* Info Card */}
          <Card className={classes.infoCard}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CheckCircleIcon color="info" style={{ marginRight: 8 }} />
                <Typography variant="h6" style={{ fontWeight: 600 }}>
                  Informações Importantes
                </Typography>
              </Box>
              <Box pl={4}>
                <Typography variant="body2" component="div" style={{ lineHeight: 2 }}>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li style={{ marginBottom: 8 }}>
                      O número deve estar no formato internacional completo (ex: 5585999999999)
                    </li>
                    <li style={{ marginBottom: 8 }}>
                      Formato do número:
                      <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                        <li>Código do país (ex: 55 para Brasil)</li>
                        <li>Código de área (ex: 85)</li>
                        <li>Número do telefone (ex: 999999999)</li>
                      </ul>
                    </li>
                    <li>Certifique-se de ter um token válido cadastrado no sistema</li>
                  </ul>
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Paper elevation={2} style={{ marginBottom: 24 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab
                icon={<MessageIcon />}
                label={
                  <Box>
                    Mensagem de Texto
                    <Chip 
                      label="Simples" 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      className={classes.badge}
                    />
                  </Box>
                }
              />
              <Tab
                icon={<ImageIcon />}
                label={
                  <Box>
                    Mensagem com Mídia
                    <Chip 
                      label="Avançado" 
                      size="small" 
                      color="secondary" 
                      variant="outlined"
                      className={classes.badge}
                    />
                  </Box>
                }
              />
              <Tab
                icon={<MessageIcon />}
                label={
                  <Box>
                    Mensagem para Grupo
                    <Chip 
                      label="Grupo" 
                      size="small" 
                      style={{ backgroundColor: "#4caf50", color: "white" }}
                      className={classes.badge}
                    />
                  </Box>
                }
              />
            </Tabs>
          </Paper>

          {/* Tab Content */}
          <Box className={classes.tabContent}>
            {tabValue === 0 && (
              <>
                {/* Steps */}
                <Card className={classes.stepCard}>
                  <CardContent>
                    <Stepper activeStep={-1} alternativeLabel>
                      {steps.map((label) => (
                        <Step key={label}>
                          <StepLabel>{label}</StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  </CardContent>
                </Card>

                {/* Documentation */}
                <Card className={classes.stepCard}>
                  <CardContent>
                    <Box 
                      display="flex" 
                      justifyContent="space-between" 
                      alignItems="center"
                      style={{ cursor: "pointer" }}
                      onClick={() => setExpandedDoc(!expandedDoc)}
                    >
                      <Box display="flex" alignItems="center">
                        <DescriptionIcon color="primary" style={{ marginRight: 8 }} />
                        <Typography variant="h6" style={{ fontWeight: 600 }}>
                          Documentação da API
                        </Typography>
                      </Box>
                      <IconButton size="small">
                        <ExpandMoreIcon 
                          className={`${classes.expandIcon} ${expandedDoc ? classes.expandIconOpen : ""}`}
                        />
                      </IconButton>
                    </Box>
                    <Collapse in={expandedDoc}>
                      <Box mt={2}>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          {i18n.t("messagesAPI.API.text.instructions") || 
                           "Envie mensagens de texto através da nossa API REST. Use o endpoint abaixo com método POST."}
                        </Typography>
                        <Box className={classes.codeBlock}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Endpoint:</strong>
                            </Typography>
                            <Button 
                              size="small" 
                              onClick={() => copyToClipboard(getEndpoint())}
                            >
                              Copiar
                            </Button>
                          </Box>
                          <Typography variant="body2" component="div" style={{ fontFamily: "monospace" }}>
                            {getEndpoint()}
                          </Typography>
                          <Box mt={2} pt={2} className={classes.dividerLine}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Método:</strong> POST
                            </Typography>
                          </Box>
                          <Box mt={1}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Headers:</strong>
                            </Typography>
                            <Typography variant="body2" component="div" style={{ fontFamily: "monospace", marginTop: 4 }}>
                              Authorization: Bearer {"{"}token{"}"}
                              <br />
                              Content-Type: application/json
                            </Typography>
                          </Box>
                          <Box mt={2} pt={2} className={classes.dividerLine}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Body (JSON):</strong>
                            </Typography>
                            <Typography variant="body2" component="pre" style={{ fontFamily: "monospace", marginTop: 8, whiteSpace: "pre-wrap" }}>
{`{
  "number": "5585999999999",
  "body": "Sua mensagem aqui",
  "userId": "ID do usuário ou \"\"",
  "queueId": "ID do departamento ou \"\"",
  "sendSignature": true,
  "closeTicket": false
}`}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>

                {/* Form */}
                <Card className={classes.formCard}>
                  <Box display="flex" alignItems="center" mb={3}>
                    <SendIcon color="primary" style={{ fontSize: 28, marginRight: 12 }} />
                    <Typography variant="h5" style={{ fontWeight: 600 }}>
                      Teste de Envio
                    </Typography>
                  </Box>
                  {renderFormMessageText()}
                </Card>
              </>
            )}

            {tabValue === 1 && (
              <>
                {/* Steps */}
                <Card className={classes.stepCard}>
                  <CardContent>
                    <Stepper activeStep={-1} alternativeLabel>
                      {["Configure o Token", "Informe o Número", "Selecione a Mídia", "Envie"].map((label) => (
                        <Step key={label}>
                          <StepLabel>{label}</StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  </CardContent>
                </Card>

                {/* Documentation */}
                <Card className={classes.stepCard}>
                  <CardContent>
                    <Box 
                      display="flex" 
                      justifyContent="space-between" 
                      alignItems="center"
                      style={{ cursor: "pointer" }}
                      onClick={() => setExpandedDoc(!expandedDoc)}
                    >
                      <Box display="flex" alignItems="center">
                        <DescriptionIcon color="primary" style={{ marginRight: 8 }} />
                        <Typography variant="h6" style={{ fontWeight: 600 }}>
                          Documentação da API
                        </Typography>
                      </Box>
                      <IconButton size="small">
                        <ExpandMoreIcon 
                          className={`${classes.expandIcon} ${expandedDoc ? classes.expandIconOpen : ""}`}
                        />
                      </IconButton>
                    </Box>
                    <Collapse in={expandedDoc}>
                      <Box mt={2}>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          {i18n.t("messagesAPI.API.media.instructions") || 
                           "Envie mensagens com mídia (imagens, vídeos, áudios ou PDFs) através da nossa API."}
                        </Typography>
                        <Box className={classes.codeBlock}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Endpoint:</strong>
                            </Typography>
                            <Button 
                              size="small" 
                              onClick={() => copyToClipboard(getEndpoint())}
                            >
                              Copiar
                            </Button>
                          </Box>
                          <Typography variant="body2" component="div" style={{ fontFamily: "monospace" }}>
                            {getEndpoint()}
                          </Typography>
                          <Box mt={2} pt={2} className={classes.dividerLine}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Método:</strong> POST
                            </Typography>
                          </Box>
                          <Box mt={1}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Headers:</strong>
                            </Typography>
                            <Typography variant="body2" component="div" style={{ fontFamily: "monospace", marginTop: 4 }}>
                              Authorization: Bearer {"{"}token{"}"}
                              <br />
                              Content-Type: multipart/form-data
                            </Typography>
                          </Box>
                          <Box mt={2} pt={2} className={classes.dividerLine}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>FormData:</strong>
                            </Typography>
                            <Typography variant="body2" component="div" style={{ fontFamily: "monospace", marginTop: 8 }}>
                              number: 5585999999999
                              <br />
                              body: "Legenda (opcional)"
                              <br />
                              userId: "ID do usuário ou \"\""
                              <br />
                              queueId: "ID do departamento ou \"\""
                              <br />
                              medias: arquivo (obrigatório)
                              <br />
                              sendSignature: true/false
                              <br />
                              closeTicket: true/false
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>

                {/* Form */}
                <Card className={classes.formCard}>
                  <Box display="flex" alignItems="center" mb={3}>
                    <SendIcon color="primary" style={{ fontSize: 28, marginRight: 12 }} />
                    <Typography variant="h5" style={{ fontWeight: 600 }}>
                      Teste de Envio
                    </Typography>
                  </Box>
                  {renderFormMessageMedia()}
                </Card>
              </>
            )}

            {tabValue === 2 && (
              <>
                {/* Steps */}
                <Card className={classes.stepCard}>
                  <CardContent>
                    <Stepper activeStep={-1} alternativeLabel>
                      {["Configure o Token", "Informe o ID do Grupo", "Digite a Mensagem", "Envie"].map((label) => (
                        <Step key={label}>
                          <StepLabel>{label}</StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  </CardContent>
                </Card>

                {/* Documentation */}
                <Card className={classes.stepCard}>
                  <CardContent>
                    <Box 
                      display="flex" 
                      justifyContent="space-between" 
                      alignItems="center"
                      style={{ cursor: "pointer" }}
                      onClick={() => setExpandedDoc(!expandedDoc)}
                    >
                      <Box display="flex" alignItems="center">
                        <DescriptionIcon color="primary" style={{ marginRight: 8 }} />
                        <Typography variant="h6" style={{ fontWeight: 600 }}>
                          Documentação da API - Grupos
                        </Typography>
                      </Box>
                      <IconButton size="small">
                        <ExpandMoreIcon 
                          className={`${classes.expandIcon} ${expandedDoc ? classes.expandIconOpen : ""}`}
                        />
                      </IconButton>
                    </Box>
                    <Collapse in={expandedDoc}>
                      <Box mt={2}>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          Envie mensagens para grupos WhatsApp através da nossa API REST. Use o endpoint abaixo com método POST.
                        </Typography>
                        <Box className={classes.codeBlock}>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Endpoint:</strong>
                            </Typography>
                            <Button 
                              size="small" 
                              onClick={() => copyToClipboard(getGroupEndpoint())}
                            >
                              Copiar
                            </Button>
                          </Box>
                          <Typography variant="body2" component="div" style={{ fontFamily: "monospace" }}>
                            {getGroupEndpoint()}
                          </Typography>
                          <Box mt={2} pt={2} className={classes.dividerLine}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Método:</strong> POST
                            </Typography>
                          </Box>
                          <Box mt={1}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Headers:</strong>
                            </Typography>
                            <Typography variant="body2" component="div" style={{ fontFamily: "monospace", marginTop: 4 }}>
                              Authorization: Bearer {"{"}token{"}"}
                              <br />
                              Content-Type: application/json
                            </Typography>
                          </Box>
                          <Box mt={2} pt={2} className={classes.dividerLine}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Body (JSON):</strong>
                            </Typography>
                            <Typography variant="body2" component="pre" style={{ fontFamily: "monospace", marginTop: 8, whiteSpace: "pre-wrap" }}>
{`{
  "groupId": "120363123456789012@g.us",
  "body": "Sua mensagem para o grupo aqui",
  "userId": "ID do usuário ou \"\"",
  "queueId": "ID do departamento ou \"\"",
  "sendSignature": true,
  "noRegister": false
}`}
                            </Typography>
                          </Box>
                          <Box mt={2} pt={2} className={classes.dividerLine}>
                            <Typography variant="caption" color="textSecondary">
                              <strong>Como obter o ID do grupo:</strong>
                            </Typography>
                            <Typography variant="body2" component="div" style={{ marginTop: 8, lineHeight: 1.6 }}>
                              1. Abra o grupo no WhatsApp Web<br />
                              2. Copie o ID da URL (ex: 120363123456789012)<br />
                              3. Use com ou sem @g.us (será adicionado automaticamente)
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>

                {/* Form */}
                <Card className={classes.formCard}>
                  <Box display="flex" alignItems="center" mb={3}>
                    <SendIcon color="primary" style={{ fontSize: 28, marginRight: 12 }} />
                    <Typography variant="h5" style={{ fontWeight: 600 }}>
                      Teste de Envio para Grupo
                    </Typography>
                  </Box>
                  {renderFormGroupMessage()}
                </Card>
              </>
            )}
          </Box>
        </div>
      </MainContainer>
    </div>
  );
};

export default MessagesAPI;
