import React from "react";
import { Box, Typography, Paper } from "@material-ui/core";

import CompaniesManager from "../../components/CompaniesManager";

const AdminCompaniesMgmt = () => (
  <Box style={{ maxWidth: "100%", marginLeft: "auto", marginRight: "auto" }}>
    <Typography variant="h5" gutterBottom style={{ fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
      Clientes
    </Typography>
    <Typography variant="body2" color="textSecondary" paragraph style={{ maxWidth: 720 }}>
      Lista de organizações cadastradas na plataforma. Aqui você vincula planos, vencimento e outros dados administrativos
      para cada cliente.
    </Typography>
    <Paper variant="outlined" style={{ borderRadius: 14, overflow: "hidden" }}>
      <CompaniesManager />
    </Paper>
  </Box>
);

export default AdminCompaniesMgmt;
