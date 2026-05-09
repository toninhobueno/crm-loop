import React from "react";
import { Box, Typography, Paper } from "@material-ui/core";
import HelpsManager from "../../components/HelpsManager";

const AdminHelpPage = () => (
  <Box>
    <Typography variant="h5" gutterBottom style={{ fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
      Central de ajudas
    </Typography>
    <Typography variant="body2" color="textSecondary" paragraph style={{ maxWidth: 720 }}>
      Conteúdos exibidos no aplicativo para administradores das organizações cadastradas.
    </Typography>
    <Paper variant="outlined" style={{ borderRadius: 14, overflow: "hidden" }}>
      <HelpsManager />
    </Paper>
  </Box>
);

export default AdminHelpPage;
