import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from "@material-ui/core";
import {
  MoreVert,
  Add,
  Edit,
  Payment,
  Receipt,
  Close,
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import moment from "moment";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  dialog: {
    "& .MuiDialog-paper": {
      maxWidth: "90vw",
      width: "1000px",
      maxHeight: "80vh",
    },
  },
  dialogTitle: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  titleText: {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  companyInfo: {
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(2),
    borderRadius: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  tableContainer: {
    maxHeight: "400px",
    overflow: "auto",
  },
  statusChip: {
    fontWeight: 500,
    borderRadius: 8,
  },
  actionButton: {
    marginLeft: theme.spacing(1),
  },
  addButton: {
    marginBottom: theme.spacing(2),
  },
  formContainer: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  formField: {
    marginBottom: theme.spacing(2),
  },
}));

const InvoiceModal = ({ open, onClose, company }) => {
  const classes = useStyles();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editForm, setEditForm] = useState({
    dueDate: "",
    detail: "",
    value: "",
    users: "",
    connections: "",
    queues: "",
    linkInvoice: "",
  });

  useEffect(() => {
    if (open && company) {
      fetchInvoices();
    }
  }, [open, company]);

  const fetchInvoices = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    try {
      const { data } = await api.get(`/invoices/all`, {
        params: { companyId: company.id }
      });
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error("Erro ao buscar faturas:", err);
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  };

  const handleStatusChange = async (invoice, newStatus) => {
    try {
      await api.put(`/invoices/${invoice.id}`, {
        status: newStatus,
      });
      
      setInvoices(prev => 
        prev.map(inv => 
          inv.id === invoice.id 
            ? { ...inv, status: newStatus }
            : inv
        )
      );
      
      toast.success(
        newStatus === "paid" 
          ? i18n.t("invoices.modal.messages.invoicePaid")
          : i18n.t("invoices.modal.messages.statusUpdated")
      );
    } catch (err) {
      toastError(err);
    }
    handleMenuClose();
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setEditForm({
      dueDate: moment(invoice.dueDate).format("YYYY-MM-DD"),
      detail: invoice.detail,
      value: invoice.value.toString(),
      users: invoice.users.toString(),
      connections: invoice.connections.toString(),
      queues: invoice.queues.toString(),
      linkInvoice: invoice.linkInvoice || "",
    });
    handleMenuClose();
  };

  const handleSaveEdit = async () => {
    try {
      const invoiceData = {
        ...editForm,
        value: parseFloat(editForm.value),
        users: parseInt(editForm.users),
        connections: parseInt(editForm.connections),
        queues: parseInt(editForm.queues),
      };

      await api.put(`/invoices/${editingInvoice.id}`, invoiceData);
      
      setInvoices(prev => 
        prev.map(inv => 
          inv.id === editingInvoice.id 
            ? { ...inv, ...invoiceData }
            : inv
        )
      );
      
      toast.success("Fatura atualizada com sucesso!");
      setEditingInvoice(null);
      setEditForm({
        dueDate: "",
        detail: "",
        value: "",
        users: "",
        connections: "",
        queues: "",
        linkInvoice: "",
      });
    } catch (err) {
      toastError(err);
    }
  };

  const handleCancelEdit = () => {
    setEditingInvoice(null);
    setEditForm({
      dueDate: "",
      detail: "",
      value: "",
      users: "",
      connections: "",
      queues: "",
      linkInvoice: "",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return { backgroundColor: "#22c55e15", color: "#22c55e" };
      case "pending":
        return { backgroundColor: "#f59e0b15", color: "#f59e0b" };
      case "overdue":
        return { backgroundColor: "#ef444415", color: "#ef4444" };
      default:
        return { backgroundColor: "#6b728015", color: "#6b7280" };
    }
  };

  const getStatusText = (invoice) => {
    const hoje = moment();
    const vencimento = moment(invoice.dueDate);
    
    if (invoice.status === "paid") return i18n.t("invoices.modal.status.paid");
    if (hoje.isAfter(vencimento)) return i18n.t("invoices.modal.status.overdue");
    return i18n.t("invoices.modal.status.pending");
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (!company) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className={classes.dialog}
      maxWidth={false}
    >
      <DialogTitle className={classes.dialogTitle}>
        <Box>
          <Typography className={classes.titleText}>
            <Receipt style={{ verticalAlign: "middle", marginRight: 8 }} />
            {i18n.t("invoices.modal.title")} - {company.name}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box className={classes.companyInfo}>
          <Typography variant="subtitle2" color="textSecondary">
            Empresa: {company.name} | ID: #{company.id} | Email: {company.email}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<Edit />}
          className={classes.addButton}
          onClick={() => setEditingInvoice(editingInvoice ? null : {})}
          disabled={invoices.length === 0}
        >
          {editingInvoice ? "Cancelar Edição" : "Editar Faturas"}
        </Button>

        {editingInvoice && (
          <Paper className={classes.formContainer}>
            <Typography variant="h6" gutterBottom>
              Editar Fatura #{editingInvoice.id}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Data de Vencimento"
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm({...editForm, dueDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Valor"
                  type="number"
                  value={editForm.value}
                  onChange={(e) => setEditForm({...editForm, value: e.target.value})}
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descrição"
                  value={editForm.detail}
                  onChange={(e) => setEditForm({...editForm, detail: e.target.value})}
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Usuários"
                  type="number"
                  value={editForm.users}
                  onChange={(e) => setEditForm({...editForm, users: e.target.value})}
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Conexões"
                  type="number"
                  value={editForm.connections}
                  onChange={(e) => setEditForm({...editForm, connections: e.target.value})}
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Departamentos"
                  type="number"
                  value={editForm.queues}
                  onChange={(e) => setEditForm({...editForm, queues: e.target.value})}
                  className={classes.formField}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Link da Fatura"
                  value={editForm.linkInvoice}
                  onChange={(e) => setEditForm({...editForm, linkInvoice: e.target.value})}
                  className={classes.formField}
                />
              </Grid>
            </Grid>
            <Box style={{ marginTop: 16 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveEdit}
                style={{ marginRight: 8 }}
              >
                Salvar Alterações
              </Button>
              <Button
                variant="outlined"
                onClick={handleCancelEdit}
              >
                Cancelar
              </Button>
            </Box>
          </Paper>
        )}

        <Paper className={classes.tableContainer}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell align="center">Usuários</TableCell>
                <TableCell align="center">Conexões</TableCell>
                <TableCell align="center">Departamentos</TableCell>
                <TableCell align="center">Valor</TableCell>
                <TableCell align="center">Vencimento</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    {i18n.t("invoices.modal.loading")}
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    {i18n.t("invoices.modal.noInvoices")}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id}
                    style={{
                      backgroundColor: editingInvoice?.id === invoice.id ? '#f5f5f5' : 'transparent'
                    }}
                  >
                    <TableCell>#{invoice.id}</TableCell>
                    <TableCell>{invoice.detail}</TableCell>
                    <TableCell align="center">{invoice.users}</TableCell>
                    <TableCell align="center">{invoice.connections}</TableCell>
                    <TableCell align="center">{invoice.queues}</TableCell>
                    <TableCell align="center" style={{ fontWeight: 600 }}>
                      {formatCurrency(invoice.value)}
                    </TableCell>
                    <TableCell align="center">
                      {moment(invoice.dueDate).format("DD/MM/YYYY")}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={getStatusText(invoice)}
                        className={classes.statusChip}
                        style={getStatusColor(invoice.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, invoice)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => handleEditInvoice(selectedInvoice)}>
            <Edit style={{ marginRight: 8 }} fontSize="small" />
            Editar Fatura
          </MenuItem>
          {selectedInvoice?.status !== "paid" && (
            <MenuItem onClick={() => handleStatusChange(selectedInvoice, "paid")}>
              <Payment style={{ marginRight: 8 }} fontSize="small" />
              {i18n.t("invoices.modal.status.markAsPaid")}
            </MenuItem>
          )}
          {selectedInvoice?.status === "paid" && (
            <MenuItem onClick={() => handleStatusChange(selectedInvoice, "pending")}>
              <Edit style={{ marginRight: 8 }} fontSize="small" />
              {i18n.t("invoices.modal.status.markAsPending")}
            </MenuItem>
          )}
        </Menu>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          {i18n.t("invoices.modal.actions.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceModal;