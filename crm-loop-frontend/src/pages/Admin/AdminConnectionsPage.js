import React from "react";
import { Box, Typography } from "@material-ui/core";
import AllConnections from "../AllConnections";

/** Mesma tela “Todas as conexões” do master, com texto de contexto no backoffice. */
const AdminConnectionsPage = () => (
  <>
    <Typography variant="h5" gutterBottom style={{ fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
      Conexões na rede
    </Typography>
    <Typography variant="body2" color="textSecondary" paragraph style={{ maxWidth: 760 }}>
      Visão agregada de canais por cliente. Todas as ações da tabela original continuam disponíveis.
    </Typography>
    <Box style={{ marginTop: 12 }}>
      <AllConnections />
    </Box>
  </>
);

export default AdminConnectionsPage;
