import React from "react";
import { Box, Typography, Paper } from "@material-ui/core";
import PlansManager from "../../components/PlansManager";

const AdminPlansPage = () => (
  <Box>
    <Typography variant="h5" gutterBottom style={{ fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
      Planos e licenças
    </Typography>
    <Typography variant="body2" color="textSecondary" paragraph style={{ maxWidth: 720 }}>
      Defina e edite planos comerciais, limites e flags de recurso usados na hora de associar clientes.
    </Typography>
    <Paper variant="outlined" style={{ borderRadius: 14, overflow: "hidden" }}>
      <PlansManager />
    </Paper>
  </Box>
);

export default AdminPlansPage;
