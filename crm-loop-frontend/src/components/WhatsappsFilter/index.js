import { Box, Chip, TextField } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useContext, useEffect, useState } from "react";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

export function WhatsappsFilter({ onFiltered, initialWhatsapps }) {
  const { user } = useContext(AuthContext);
  const [whatsapps, setWhatsapps] = useState([]);
  const [selecteds, setSelecteds] = useState([]);
  const isRestrictedUser =
    user?.profile !== "admin" && Boolean(user?.whatsappId);

  useEffect(() => {
    async function fetchData() {
      await loadWhatsapps();
    }
    fetchData();
  }, []);

  useEffect(() => {
    setSelecteds([]);
    if (
      Array.isArray(initialWhatsapps) &&
      Array.isArray(whatsapps) &&
      whatsapps.length > 0
    ) {
      onChange(initialWhatsapps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWhatsapps, whatsapps]);

  const loadWhatsapps = async () => {
    try {
      const { data } = await api.get(`/whatsapp`);
      let whatsappList = data.map((w) => ({
        id: w.id,
        name: w.name,
        channel: w.channel,
      }));
      if (isRestrictedUser) {
        whatsappList = whatsappList.filter((w) => w.id === user.whatsappId);
      }
      setWhatsapps(whatsappList);
    } catch (err) {
      toastError(err);
    }
  };

  const onChange = async (value) => {
    const normalized = Array.isArray(value) ? value : value ? [value] : [];
    setSelecteds(normalized);
    onFiltered(normalized);
  };

  return (
    <Box style={{ padding: "0px 10px 10px" }}>
      <Autocomplete
        multiple={!isRestrictedUser}
        size="small"
        options={whatsapps}
        value={selecteds}
        disabled={isRestrictedUser && whatsapps.length <= 1}
        onChange={(e, v, r) => onChange(v)}
        getOptionLabel={(option) => option.name}
        getOptionSelected={(option, value) => {
          return (
            option?.id === value?.id ||
            option?.name.toLowerCase() === value?.name.toLowerCase()
          );
        }}
        renderTags={(value, getWhatsappProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              style={{
                backgroundColor: "#bfbfbf",
                textShadow: "1px 1px 1px #000",
                color: "white",
              }}
              label={option.name}
              {...getWhatsappProps({ index })}
              size="small"
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder={i18n.t("tickets.search.filterConections")}
          />
        )}
      />
    </Box>
  );
}
