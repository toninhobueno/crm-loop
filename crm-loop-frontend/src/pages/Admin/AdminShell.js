import React, { useContext } from "react";
import {
  Switch,
  Route,
  Redirect,
  useRouteMatch,
} from "react-router-dom";
import { Box, CircularProgress } from "@material-ui/core";

import { AuthContext } from "../../context/Auth/AuthContext";
import AdminLayout from "../../layout/AdminLayout";
import AdminOverview from "./AdminOverview";
import AdminPlansPage from "./AdminPlansPage";
import AdminCompaniesMgmt from "./AdminCompaniesMgmt";
import AdminConnectionsPage from "./AdminConnectionsPage";
import AdminHelpPage from "./AdminHelpPage";
import AdminWhiteLabelPage from "./AdminWhiteLabelPage";
import AdminMastersPage from "./AdminMastersPage";
import AdminAuditPage from "./AdminAuditPage";
import SettingsPage from "../Settings";

/** Rotas sob `/admin` — só usuários com flag `super` da API */
const AdminShell = () => {
  const { path } = useRouteMatch();
  const { loading, isAuth, user } = useContext(AuthContext);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuth) {
    return <Redirect to="/admin/login" />;
  }

  if (!user?.super) {
    return <Redirect to="/" />;
  }

  return (
    <AdminLayout>
      <Switch>
        <Route exact path={path} component={AdminOverview} />
        <Route exact path={`${path}/auditoria`} component={AdminAuditPage} />
        <Route exact path={`${path}/usuarios-master`} component={AdminMastersPage} />
        <Route exact path={`${path}/planos`} component={AdminPlansPage} />
        <Route
          exact
          path={`${path}/empresas`}
          render={() => <Redirect to={`${path}/clientes`} />}
        />
        <Route exact path={`${path}/clientes`} component={AdminCompaniesMgmt} />
        <Route exact path={`${path}/conexoes`} component={AdminConnectionsPage} />
        <Route exact path={`${path}/configuracoes`} component={SettingsPage} />
        <Route exact path={`${path}/ajudas`} component={AdminHelpPage} />
        <Route exact path={`${path}/whitelabel`} component={AdminWhiteLabelPage} />
        <Redirect to={path} />
      </Switch>
    </AdminLayout>
  );
};

export default AdminShell;
