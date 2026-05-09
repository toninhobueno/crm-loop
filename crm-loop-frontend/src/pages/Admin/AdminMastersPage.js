import React, { useState, useCallback, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  TableContainer,
  IconButton,
  InputAdornment,
  Tooltip,
} from "@material-ui/core";
import PersonAddOutlined from "@material-ui/icons/PersonAddOutlined";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import DeleteOutline from "@material-ui/icons/DeleteOutline";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";
import ConfirmationModal from "../../components/ConfirmationModal";

const EMPTY_FORM = Object.freeze({
  name: "",
  email: "",
  password: "",
  confirm: "",
});

const cloneEmptyForm = () => ({ ...EMPTY_FORM });

const AdminMastersPage = () => {
  const { user: loggedInUser } = useContext(AuthContext);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** Objeto literal inicial — não passar função para useState (evita ambiguidade do lazy init no RR17/cra). */
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM }));
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users", {
        params: { pageNumber: 1, superOnly: true },
      });
      setList(data.users || []);
    } catch (e) {
      toastError(e);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const closeDialog = () => {
    if (submitting) return;
    setShowPw(false);
    setShowPw2(false);
    setForm(cloneEmptyForm());
    setOpen(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 5) {
      toast.error("A senha deve ter pelo menos 5 caracteres.");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/users", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        profile: "admin",
        super: true,
      });
      toast.success("Usuário master criado com sucesso.");
      setShowPw(false);
      setShowPw2(false);
      setForm(cloneEmptyForm());
      // Fechar o Dialog depois de limpar estado evita glitch do MUI lendo inputs desmontados
      setTimeout(() => setOpen(false), 0);
      await load();
    } catch (err) {
      toastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMaster = async () => {
    if (!deletingUser?.id) return;
    try {
      await api.delete(`/users/${deletingUser.id}`);
      toast.success("Usuário master removido.");
      setDeletingUser(null);
      setConfirmOpen(false);
      await load();
    } catch (err) {
      toastError(err);
    }
  };

  const isSelf = (u) =>
    loggedInUser && Number(u.id) === Number(loggedInUser.id);

  return (
    <Box>
      <Box
        display="flex"
        flexWrap="wrap"
        alignItems="flex-start"
        justifyContent="space-between"
        gridGap={16}
        marginBottom={2}
      >
        <Box>
          <Typography variant="h5" style={{ fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Usuários master
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ maxWidth: 720 }}>
            Contas com acesso total ao backoffice e às funções reservadas ao perfil master (flag{" "}
            <code>super</code> no sistema). Novos masters ficam na mesma organização da sua sessão atual.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PersonAddOutlined />}
          onClick={() => setOpen(true)}
          style={{ textTransform: "none", fontWeight: 700, borderRadius: 10 }}
        >
          Novo usuário master
        </Button>
      </Box>

      <ConfirmationModal
        title={
          deletingUser
            ? `Excluir usuário master ${deletingUser.name}?`
            : ""
        }
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setDeletingUser(null);
        }}
        onConfirm={handleDeleteMaster}
      >
        Esta ação não pode ser desfeita. O usuário perderá o acesso master e à plataforma conforme as regras do seu ambiente.
      </ConfirmationModal>

      <Paper variant="outlined" style={{ borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <Box py={6} display="flex" justifyContent="center">
            <CircularProgress size={32} />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>E-mail</TableCell>
                  <TableCell align="right">Perfil</TableCell>
                  <TableCell align="right" width={120}>
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="textSecondary">
                        Nenhum usuário master listado para esta organização nesta página. Use “Novo usuário master” para
                        cadastrar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell align="right">
                        <Typography component="span" variant="caption" style={{ fontWeight: 600 }}>
                          Master
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {isSelf(u) ? (
                          <Typography variant="caption" color="textSecondary">
                            Você
                          </Typography>
                        ) : (
                          <Tooltip title="Excluir usuário master">
                            <IconButton
                              size="small"
                              aria-label="Excluir"
                              onClick={() => {
                                setDeletingUser(u);
                                setConfirmOpen(true);
                              }}
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={open} onClose={() => closeDialog()} maxWidth="xs" fullWidth aria-labelledby="admin-master-dialog-title">
        <form onSubmit={submit}>
          <DialogTitle id="admin-master-dialog-title" style={{ fontWeight: 800 }}>
            Cadastrar usuário master
          </DialogTitle>
          <DialogContent dividers style={{ paddingTop: 16 }}>
            <TextField
              label="Nome completo"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              value={form.name}
              onChange={(e) => {
                const v = e.target.value;
                setForm((prev) => ({ ...prev, name: v }));
              }}
              autoFocus
            />
            <TextField
              label="E-mail (login)"
              type="email"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              value={form.email}
              autoComplete="off"
              onChange={(e) => {
                const v = e.target.value;
                setForm((prev) => ({ ...prev, email: v }));
              }}
            />
            <TextField
              label="Senha inicial"
              type={showPw ? "text" : "password"}
              variant="outlined"
              margin="normal"
              fullWidth
              required
              value={form.password}
              autoComplete="new-password"
              onChange={(e) => {
                const v = e.target.value;
                setForm((prev) => ({ ...prev, password: v }));
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={showPw ? "Ocultar" : "Mostrar"}>
                      <IconButton size="small" tabIndex={-1} onClick={() => setShowPw((v) => !v)} edge="end">
                        {showPw ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Confirmar senha"
              type={showPw2 ? "text" : "password"}
              variant="outlined"
              margin="normal"
              fullWidth
              required
              value={form.confirm}
              autoComplete="new-password"
              onChange={(e) => {
                const v = e.target.value;
                setForm((prev) => ({ ...prev, confirm: v }));
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={showPw2 ? "Ocultar" : "Mostrar"}>
                      <IconButton size="small" tabIndex={-1} onClick={() => setShowPw2((v) => !v)} edge="end">
                        {showPw2 ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 12, lineHeight: 1.5 }}>
              O novo usuário recebe perfil administrativo e permissão master. Oriente-o a alterar a senha no primeiro acesso
              se desejar.
            </Typography>
          </DialogContent>
          <DialogActions style={{ padding: 16, gap: 8 }}>
            <Button onClick={closeDialog} disabled={submitting} style={{ textTransform: "none" }}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={submitting} style={{ textTransform: "none", borderRadius: 10, fontWeight: 700 }}>
              {submitting ? "Salvando…" : "Criar usuário master"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default AdminMastersPage;
