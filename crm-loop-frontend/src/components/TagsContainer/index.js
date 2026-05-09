import { Chip, Paper, TextField, CircularProgress, Typography } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import React, { useEffect, useRef, useState } from "react";
import { isArray, isString } from "lodash";
import toastError from "../../errors/toastError";
import api from "../../services/api";

export function TagsContainer({ contact }) {

    const [tags, setTags] = useState([]);
    const [selecteds, setSelecteds] = useState([]);
    const [loadingTags, setLoadingTags] = useState(false);
    const [showAllTags, setShowAllTags] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false
        }
    }, [])

    useEffect(() => {
        const loadData = async () => {
            if (isMounted.current) {
                await loadTags();
                
                if (contact && contact.id && Array.isArray(contact.tags)) {
                    setSelecteds(contact.tags);
                } else {
                    setSelecteds([]);
                }
            }
        };
        loadData();
    }, [contact, contact?.id]);

    const createTag = async (data) => {
        try {
            const { data: responseData } = await api.post(`/tags`, data);
            return responseData;
        } catch (err) {
            toastError(err);
        }
    }

    const loadTags = async () => {
        try {
            setLoadingTags(true);
            const response = await api.get(`/tags/list`, {
                params: { kanban: 0 }
            });
            
            const tagsData = Array.isArray(response.data) ? response.data : [];
            setTags(tagsData);
            setLoadingTags(false);
        } catch (err) {
            toastError(err);
            setTags([]);
            setLoadingTags(false);
        }
    }

    const syncTags = async (data) => {
        try {
            const { data: responseData } = await api.post(`/tags/sync`, data);
            return responseData;
        } catch (err) {
            toastError(err);
        }
    }

    const onChange = async (value, reason) => {
        let optionsChanged = []
        
        if (reason === 'create-option') {
            if (isArray(value)) {
                for (let item of value) {
                    if (isString(item)) {
                        // Verificar se a tag já existe
                        const existingTag = tags.find(tag => 
                            tag.name.toLowerCase().trim() === item.toLowerCase().trim()
                        );
                        
                        if (existingTag) {
                            optionsChanged.push(existingTag);
                        } else {
                            // Validar tamanho mínimo
                            if (item.trim().length < 3) {
                                toastError("Tag muito curta! Mínimo 3 caracteres.");
                                return;
                            }
                            const newTag = await createTag({ 
                                name: item.trim(), 
                                kanban: 0, 
                                color: getRandomHexColor() 
                            });
                            if (newTag) {
                                optionsChanged.push(newTag);
                            }
                        }
                    } else {
                        optionsChanged.push(item);
                    }
                }
            }
            await loadTags();
        } else {
            optionsChanged = value;
        }
        
        setSelecteds(optionsChanged);
        
        if (contact && contact.id) {
            await syncTags({ contactId: contact.id, tags: optionsChanged });
        }
    }

    function getRandomHexColor() {
        // Gerar valores aleatórios para os componentes de cor
        const red = Math.floor(Math.random() * 256); // Valor entre 0 e 255
        const green = Math.floor(Math.random() * 256); // Valor entre 0 e 255
        const blue = Math.floor(Math.random() * 256); // Valor entre 0 e 255
      
        // Converter os componentes de cor em uma cor hexadecimal
        const hexColor = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
      
        return hexColor;
    }

    return (
        <div style={{ width: '100%', position: 'relative', padding: 0, margin: 0 }}>
            <Paper 
                elevation={0}
                style={{ 
                    padding: 0, 
                    marginTop: 0,
                    marginBottom: 0,
                    borderRadius: 0,
                    backgroundColor: '#fff',
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    boxSizing: 'border-box',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
                }}
            >
                {/* Campo de autocomplete simplificado */}
                <Autocomplete
                    multiple
                    size="small"
                    options={tags}
                    value={selecteds}
                    loading={loadingTags}
                    freeSolo
                    autoHighlight
                    autoComplete
                    filterSelectedOptions={false}
                    onChange={(e, v, r) => onChange(v, r)}
                    getOptionLabel={(option) => {
                        if (typeof option === 'string') {
                            return option;
                        }
                        return option.name || '';
                    }}
                    getOptionSelected={(option, value) => {
                        if (typeof option === 'string' || typeof value === 'string') {
                            return false;
                        }
                        return option.id === value.id;
                    }}
                    filterOptions={(options, state) => {
                        const inputValue = state.inputValue.toLowerCase().trim();
                        if (!inputValue) {
                            return options;
                        }
                        return options.filter(option => 
                            option.name.toLowerCase().includes(inputValue)
                        );
                    }}
                    renderOption={(option) => (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '8px 12px',
                            cursor: 'pointer',
                        }}>
                            <Chip
                                size="small"
                                label={option.name}
                                style={{
                                    backgroundColor: option.color || '#2196f3',
                                    color: '#FFF',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                }}
                            />
                        </div>
                    )}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                            <Chip
                                variant="outlined"
                                style={{
                                    backgroundColor: option.color || '#eee',
                                    color: "#FFF",
                                    fontWeight: 600,
                                    fontSize: "0.65rem",
                                    height: 20,
                                    margin: 1
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
                            placeholder="Buscar ou criar..."
                            size="small"
                            InputProps={{
                                ...params.InputProps,
                                style: { fontSize: '0.8rem', padding: '2px' },
                                endAdornment: (
                                    <React.Fragment>
                                        {loadingTags ? <CircularProgress color="primary" size={16} /> : null}
                                        {params.InputProps.endAdornment}
                                    </React.Fragment>
                                ),
                            }}
                        />
                    )}
                    PaperComponent={({ children }) => (
                        <Paper
                            elevation={8}
                            style={{ 
                                width: '100%',
                                maxWidth: 350, 
                                marginTop: 4,
                                maxHeight: 180, 
                                overflow: 'auto',
                                zIndex: 1300,
                                position: 'absolute'
                            }}
                        >
                            {children}
                        </Paper>
                    )}
                    noOptionsText="Pressione Enter para criar"
                    loadingText="Carregando..."
                    openOnFocus
                    disableClearable={false}
                    clearOnBlur={false}
                    selectOnFocus
                    handleHomeEndKeys
                />
        </Paper>
        </div>
    )
}