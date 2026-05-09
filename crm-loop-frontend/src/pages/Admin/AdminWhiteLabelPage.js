import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@material-ui/core";
import Whitelabel from "../../components/Settings/Whitelabel";
import api from "../../services/api";
import toastError from "../../errors/toastError";

/** Mesmos dados globais da aba Whitelabel em Configurações */
const AdminWhiteLabelPage = () => {
  const [oldSettings, setOldSettings] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/settings");
        setOldSettings(data);
      } catch (e) {
        toastError(e);
        setOldSettings([]);
      }
    })();
  }, []);

  if (oldSettings === null) {
    return (
      <Box py={10} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom style={{ fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
        Whitelabel
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph style={{ maxWidth: 760 }}>
        Identidade visual (logos, cores e marca) aplicada aos fluxos institucionais da organização atual.
      </Typography>
      <Whitelabel settings={oldSettings} />
    </Box>
  );
};

export default AdminWhiteLabelPage;
