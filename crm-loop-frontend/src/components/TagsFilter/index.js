import { Box, Chip, TextField, CircularProgress, Typography } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useEffect, useState } from "react";
import toastError from "../../errors/toastError";
import api from "../../services/api";

export function TagsFilter({ onFiltered }) {
  const [tags, setTags] = useState([]);
  const [selecteds, setSelecteds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      await loadTags();
    }
    fetchData();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      console.log('TagsFilter - Carregando tags...');
      const { data } = await api.get(`/tags/list`, {
        params: { kanban: 0 }
      });
      console.log('TagsFilter - Tags carregadas:', data);
      console.log('TagsFilter - Total:', data.length);
      setTags(data);
      setLoading(false);
    } catch (err) {
      console.error('TagsFilter - Erro ao carregar tags:', err);
      toastError(err);
      setLoading(false);
    }
  };

  const onChange = async (value) => {
    console.log('TagsFilter - Tags selecionadas:', value);
    setSelecteds(value);
    onFiltered(value);
  };

  console.log('TagsFilter RENDER - Tags disponíveis:', tags.length);
  console.log('TagsFilter RENDER - Tags selecionadas:', selecteds.length);

  return (
    <Box style={{ padding: 10, minWidth: 250 }}>
      <Autocomplete
        multiple
        size="small"
        options={tags}
        value={selecteds}
        loading={loading}
        onChange={(e, v, r) => onChange(v)}
        getOptionLabel={(option) => option.name || ''}
        getOptionSelected={(option, value) => option.id === value.id}
        filterOptions={(options, state) => {
          const inputValue = state.inputValue.toLowerCase().trim();
          if (!inputValue) return options;
          return options.filter(option => 
            option.name.toLowerCase().includes(inputValue)
          );
        }}
        renderOption={(option) => (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '8px 12px',
            width: '100%',
            cursor: 'pointer'
          }}>
            <Chip
              size="small"
              label={option.name}
              style={{
                backgroundColor: option.color || '#2196f3',
                color: '#FFF',
                fontWeight: 'bold',
                fontSize: '0.85em',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            />
          </div>
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              style={{
                backgroundColor: option.color || "#2196f3",
                textShadow: "1px 1px 1px #000",
                color: "white",
                fontWeight: 'bold',
                border: 'none'
              }}
              label={option.name}
              {...getTagProps({ index })}
              size="small"
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="🔍 Filtrar por Tags"
            placeholder={loading ? "Carregando..." : tags.length > 0 ? "Clique para ver as tags" : "Nenhuma tag"}
            helperText={
              loading 
                ? "Carregando tags..." 
                : tags.length > 0 
                  ? `${tags.length} tags disponíveis`
                  : "Nenhuma tag cadastrada"
            }
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <React.Fragment>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
          />
        )}
        PaperComponent={({ children }) => (
          <Box
            style={{ 
              maxHeight: 350,
              overflow: 'auto',
              border: '2px solid #1976d2',
              borderRadius: 4,
              marginTop: 4,
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
          >
            {children}
          </Box>
        )}
        noOptionsText={
          <Typography variant="body2" style={{ padding: 16, textAlign: 'center', color: '#666' }}>
            {loading ? "Carregando..." : "Nenhuma tag encontrada"}
          </Typography>
        }
        loadingText="Carregando tags..."
        openOnFocus
        autoHighlight
        disableCloseOnSelect
      />
    </Box>
  );
}
