import React, { useState, useContext } from "react";
import { Link as RouterLink, Redirect } from "react-router-dom";
import {
  Button,
  TextField,
  Typography,
  Box,
  Paper,
  makeStyles,
} from "@material-ui/core";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { i18n } from "../../../translate/i18n";
import CssBaseline from "@material-ui/core/CssBaseline";
import CircularProgress from "@material-ui/core/CircularProgress";

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(2),
    background:
      theme.palette.type === "dark"
        ? "#0f172a"
        : "linear-gradient(165deg,#f8fafc 0%,#eef2ff 100%)",
  },
  paper: {
    padding: theme.spacing(3),
    maxWidth: 420,
    width: "100%",
    borderRadius: 16,
  },
  submit: {
    marginTop: theme.spacing(2),
    textTransform: "none",
    fontWeight: 600,
    borderRadius: 10,
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  linkRegular: {
    display: "block",
    marginTop: theme.spacing(2),
    textAlign: "center",
    fontSize: "0.875rem",
  },
  center: {
    minHeight: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}));

const AdminLogin = () => {
  const classes = useStyles();
  const { handleLogin, isAuth, loading, user } = useContext(AuthContext);
  const [form, setForm] = useState({ email: "", password: "" });

  if (loading) {
    return (
      <Box className={classes.root}>
        <CircularProgress />
      </Box>
    );
  }

  if (isAuth && user?.super) {
    return <Redirect to="/admin" />;
  }

  if (isAuth && !user?.super) {
    return <Redirect to="/" />;
  }

  const submit = (e) => {
    e.preventDefault();
    handleLogin(form, { redirectTo: "/admin", requireSuper: true });
  };

  return (
    <>
      <CssBaseline />
      <Box className={classes.root}>
        <Paper className={classes.paper} elevation={3}>
          <Typography variant="h5" component="h1" gutterBottom>
            {i18n.t("adminLogin.title")}
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            {i18n.t("adminLogin.subtitle")}
          </Typography>
          <form onSubmit={submit}>
            <TextField
              label={i18n.t("adminLogin.form.email")}
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              variant="outlined"
              margin="normal"
              fullWidth
              required
              autoComplete="username"
              autoFocus
            />
            <TextField
              label={i18n.t("adminLogin.form.password")}
              name="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              variant="outlined"
              margin="normal"
              fullWidth
              required
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              className={classes.submit}
              disabled={loading}
            >
              {loading ? "…" : i18n.t("adminLogin.button")}
            </Button>
          </form>
          <RouterLink className={classes.linkRegular} to="/login">
            {i18n.t("adminLogin.linkRegular")}
          </RouterLink>
        </Paper>
      </Box>
    </>
  );
};

export default AdminLogin;
