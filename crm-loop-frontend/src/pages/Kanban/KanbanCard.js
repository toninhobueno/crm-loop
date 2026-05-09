import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Avatar,
  Button,
  Tooltip,
  Typography,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import AttachMoneyIcon from '@material-ui/icons/AttachMoney';
import NoteIcon from '@material-ui/icons/Note';
import AddIcon from '@material-ui/icons/Add';
import VisibilityIcon from '@material-ui/icons/Visibility';
import WhatsApp from '@material-ui/icons/WhatsApp';
import AppsIcon from '@material-ui/icons/Apps';
import AccessTimeIcon from '@material-ui/icons/AccessTime';
import Chip from '@material-ui/core/Chip';
import Box from '@material-ui/core/Box';
import { format, parseISO, isSameDay } from 'date-fns';
import { useHistory } from 'react-router-dom';
import { Draggable } from 'react-beautiful-dnd';
import api from '../../services/api';

const useStyles = makeStyles(theme => ({
  card: {
    padding: 0,
    background: theme.palette.type === 'dark' ? '#1e293b' : '#ffffff',
    borderRadius: 8,
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
    marginBottom: theme.spacing(1.5),
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    marginRight: theme.spacing(0.5),
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
    border:
      theme.palette.type === 'dark'
        ? '1px solid rgba(148,163,184,0.25)'
        : '1px solid #e5e7eb',
    borderLeftWidth: 4,
    borderLeftStyle: 'solid',
    borderLeftColor: theme.palette.primary.main,
    overflow: 'hidden',
    '&:hover': {
      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.1)',
      borderColor:
        theme.palette.type === 'dark' ? 'rgba(148,163,184,0.35)' : '#d1d5db',
      borderLeftColor: theme.palette.primary.dark,
    },
  },
  headerBar: {
    backgroundColor: '#6b7280',
    color: '#fff',
    padding: theme.spacing(1, 1.5),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  statusText: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#fff',
  },
  headerValue: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: '4px 10px',
    borderRadius: 6,
  },
  cardContent: {
    padding: theme.spacing(1.5),
    paddingTop: theme.spacing(1.75),
  },
  contactHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
    gap: theme.spacing(1),
    justifyContent: 'space-between',
  },
  avatar: {
    width: theme.spacing(4.5),
    height: theme.spacing(4.5),
    border: '2px solid rgba(0, 0, 0, 0.08)',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: theme.palette.type === 'dark' ? theme.palette.grey[50] : '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  },
  statusChip: {
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(59,130,246,0.25)' : '#dbeafe',
    color: theme.palette.type === 'dark' ? '#93c5fd' : '#1d4ed8',
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 6,
    marginLeft: theme.spacing(1),
    flexShrink: 0,
    border: 'none',
    height: 22,
  },
  ticketNumber: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: 6,
    whiteSpace: 'nowrap',
  },
  divider: {
    background: "linear-gradient(90deg, transparent, #e5e7eb, transparent)",
    height: 1,
    margin: theme.spacing(1, 0),
  },
  lastMessageTime: {
    fontSize: '0.75rem',
    color: "#9ca3af",
    fontWeight: 500,
  },
  lastMessageTimeUnread: {
    fontSize: '0.75rem',
    color: theme.palette.success.main,
    fontWeight: 600,
  },
  cardDescription: {
    fontSize: '0.85rem',
    color: "#6b7280",
    flexGrow: 1,
    marginRight: theme.spacing(1),
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  valueRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
  },
  descriptionRow: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    gap: theme.spacing(0.5),
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5),
    width: '100%',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    flex: 1,
    minWidth: 0,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
    paddingTop: theme.spacing(1),
    borderTop:
      theme.palette.type === 'dark' ? '1px solid rgba(148,163,184,0.2)' : '1px solid #f3f4f6',
    width: '100%',
    minWidth: 0,
  },
  footerValue: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#14b8a6',
  },
  footerIcons: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  cardButton: {
    minWidth: 'auto',
    padding: '8px 16px',
    color: '#fff',
    backgroundColor: theme.palette.primary.main,
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    fontSize: '0.85rem',
    fontWeight: 500,
    textTransform: 'none',
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
    },
  },
  connectionTag: {
    backgroundColor: '#10b981',
    color: '#FFF',
    padding: '4px 10px',
    fontWeight: 600,
    borderRadius: 6,
    fontSize: '0.7rem',
    maxWidth: '150px',
    minWidth: 0,
    flexShrink: 1,
    '& .MuiChip-label': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      padding: '0 4px',
      maxWidth: '100%',
    },
  },
  userTag: {
    backgroundColor: '#3b82f6',
    color: '#FFF',
    padding: '4px 10px',
    fontWeight: 600,
    borderRadius: 6,
    fontSize: '0.7rem',
    maxWidth: '150px',
    minWidth: 0,
    flexShrink: 1,
    '& .MuiChip-label': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      padding: '0 4px',
      maxWidth: '100%',
    },
  },
  messageRow: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  messageText: {
    fontSize: '0.85rem',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userTimeRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    flexWrap: 'wrap',
  },
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginTop: theme.spacing(0.5),
  },
  valueChip: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontSize: '0.8rem',
    fontWeight: 600,
    height: 28,
    cursor: 'pointer',
    border: '1px solid #a7f3d0',
    '&:hover': {
      backgroundColor: '#d1fae5',
    },
    '& .MuiChip-icon': {
      color: '#059669',
    },
  },
  valueChipEmpty: {
    backgroundColor: '#f0f9ff',
    color: theme.palette.primary.main,
    fontSize: '0.8rem',
    fontWeight: 500,
    height: 28,
    cursor: 'pointer',
    border: '1px solid #bae6fd',
    '&:hover': {
      backgroundColor: '#e0f2fe',
    },
  },
  observationChip: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
    fontSize: '0.75rem',
    fontWeight: 500,
    height: 26,
    cursor: 'pointer',
    border: '1px solid #fde68a',
    maxWidth: '100%',
    '&:hover': {
      backgroundColor: '#fde68a',
    },
    '& .MuiChip-label': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: '200px',
    },
  },
  observationChipEmpty: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    fontSize: '0.75rem',
    fontWeight: 500,
    height: 26,
    cursor: 'pointer',
    border: '1px solid #e5e7eb',
    '&:hover': {
      backgroundColor: '#e5e7eb',
    },
  },
  removeValueButton: {
    padding: 4,
    marginLeft: theme.spacing(0.5),
    color: '#ef4444',
    '&:hover': {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
  },
  observationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
  },
  tagChip: {
    fontSize: '0.7rem',
    fontWeight: 600,
    height: 22,
    color: '#fff',
    marginTop: theme.spacing(0.5),
    '& .MuiChip-label': {
      padding: '0 8px',
    },
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
  },
  textField: {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
    },
  },
  dialogPaper: {
    borderRadius: '10px',
  },
  dialogButton: {
    borderRadius: '10px',
  },
}));

const KanbanCard = ({ ticket, index, updateTicket }) => {
  const classes = useStyles();
  const history = useHistory();

  const [open, setOpen] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [openObservation, setOpenObservation] = useState(false);
  const [newObservation, setNewObservation] = useState('');

  const handleCardClick = () => {
    history.push(`/tickets/${ticket.uuid}`);
  };

  const lastMessageTimeClass =
    Number(ticket.unreadMessages) > 0
      ? classes.lastMessageTimeUnread
      : classes.lastMessageTime;

  const customFields = ticket.contact.extraInfo || [];
  const valueFieldIndex = customFields.findIndex(field => field.name === 'valor');
  const valueField = valueFieldIndex !== -1 ? customFields[valueFieldIndex] : null;
  const opportunityValue = valueField ? parseFloat(valueField.value) : null;
  
  const observationFieldIndex = customFields.findIndex(field => field.name === 'observacao');
  const observationField = observationFieldIndex !== -1 ? customFields[observationFieldIndex] : null;
  const observation = observationField ? observationField.value : null;

  const contactTags = ticket?.contact?.tags || [];

  // Obter o nome da instância WhatsApp
  const whatsappInstanceName = ticket.whatsapp?.name || ticket.contact?.whatsapp?.name || 'Sem instância';
  
  // Abreviar o nome da conexão se for muito longo
  const abbreviateConnectionName = (name) => {
    if (name.length > 15) {
      return name.substring(0, 12) + '...';
    }
    return name;
  };

  const handleOpenModal = () => {
    setNewValue(valueField ? valueField.value.toString() : '');
    setOpen(true);
  };

  const handleCloseModal = () => {
    setOpen(false);
  };

  const handleOpenObservationModal = () => {
    setNewObservation(observationField ? observationField.value : '');
    setOpenObservation(true);
  };

  const handleCloseObservationModal = () => {
    setOpenObservation(false);
  };

  const updateContactValue = async (contactId, value) => {
    try {
      const currentExtraInfo = ticket.contact.extraInfo || [];
      const updatedExtraInfo = [...currentExtraInfo];
      
      const valueIndex = updatedExtraInfo.findIndex(field => field.name === 'valor');
      if (valueIndex !== -1) {
        updatedExtraInfo[valueIndex] = { name: 'valor', value: value.toString() };
      } else {
        updatedExtraInfo.push({ name: 'valor', value: value.toString() });
      }

      await api.put(`/contacts/${contactId}`, {
        extraInfo: updatedExtraInfo,
      });
    } catch (error) {
      console.error('Erro ao atualizar o valor:', error);
    }
  };

  const updateContactObservation = async (contactId, observation) => {
    try {
      const currentExtraInfo = ticket.contact.extraInfo || [];
      const updatedExtraInfo = [...currentExtraInfo];
      
      const observationIndex = updatedExtraInfo.findIndex(field => field.name === 'observacao');
      if (observationIndex !== -1) {
        updatedExtraInfo[observationIndex] = { name: 'observacao', value: observation };
      } else {
        updatedExtraInfo.push({ name: 'observacao', value: observation });
      }

      await api.put(`/contacts/${contactId}`, {
        extraInfo: updatedExtraInfo,
      });
    } catch (error) {
      console.error('Erro ao atualizar a observação:', error);
    }
  };

  const removeContactValue = async () => {
    try {
      const currentExtraInfo = ticket.contact.extraInfo || [];
      const updatedExtraInfo = currentExtraInfo.filter(field => field.name !== 'valor');

      await api.put(`/contacts/${ticket.contact.id}`, {
        extraInfo: updatedExtraInfo,
      });

      if (valueFieldIndex !== -1) {
        customFields.splice(valueFieldIndex, 1);
      }

      updateTicket({ ...ticket });

    } catch (error) {
      console.error('Erro ao remover o valor:', error);
    }
  };

  const removeContactObservation = async () => {
    try {
      const currentExtraInfo = ticket.contact.extraInfo || [];
      const updatedExtraInfo = currentExtraInfo.filter(field => field.name !== 'observacao');

      await api.put(`/contacts/${ticket.contact.id}`, {
        extraInfo: updatedExtraInfo,
      });

      if (observationFieldIndex !== -1) {
        customFields.splice(observationFieldIndex, 1);
      }

      updateTicket({ ...ticket });

    } catch (error) {
      console.error('Erro ao remover a observação:', error);
    }
  };

  const handleSaveValue = async () => {
    await updateContactValue(ticket.contact.id, newValue);

    if (valueField) {
      valueField.value = newValue;
    } else {
      if (!ticket.contact.extraInfo) {
        ticket.contact.extraInfo = [];
      }
      ticket.contact.extraInfo.push({ name: 'valor', value: newValue });
    }

    updateTicket({ ...ticket });

    setOpen(false);
  };

  const handleSaveObservation = async () => {
    await updateContactObservation(ticket.contact.id, newObservation);

    if (observationField) {
      observationField.value = newObservation;
    } else {
      if (!ticket.contact.extraInfo) {
        ticket.contact.extraInfo = [];
      }
      ticket.contact.extraInfo.push({ name: 'observacao', value: newObservation });
    }

    updateTicket({ ...ticket });

    setOpenObservation(false);
  };

  return (
    <Draggable draggableId={ticket.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          className={classes.card}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <div className={classes.cardContent}>
            <div className={classes.contactHeader}>
              <Tooltip title={ticket.contact.name}>
                <Typography className={classes.cardTitle}>
                  {ticket.contact.name || 'Sem nome'}
                </Typography>
              </Tooltip>
              <Chip
                label="ABERTO"
                className={classes.statusChip}
                size="small"
              />
            </div>

            <Box className={classes.valueRow}>
              <Chip
                icon={opportunityValue !== null ? <AttachMoneyIcon /> : <AddIcon />}
                label={opportunityValue !== null 
                  ? `R$ ${opportunityValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'Atribuir Valor'}
                onClick={handleOpenModal}
                className={opportunityValue !== null ? classes.valueChip : classes.valueChipEmpty}
                size="small"
                onDelete={opportunityValue !== null ? () => removeContactValue() : undefined}
                deleteIcon={<CloseIcon />}
              />
            </Box>

            <Box className={classes.observationRow}>
              <Tooltip title={observation || 'Clique para adicionar uma observação'} arrow>
                <Chip
                  icon={observation ? <NoteIcon /> : <AddIcon />}
                  label={observation 
                    ? (observation.length > 25 ? `${observation.substring(0, 25)}...` : observation)
                    : 'Adicionar Observação'}
                  onClick={handleOpenObservationModal}
                  className={observation ? classes.observationChip : classes.observationChipEmpty}
                  size="small"
                  onDelete={observation ? () => removeContactObservation() : undefined}
                  deleteIcon={<CloseIcon />}
                />
              </Tooltip>
            </Box>

            <div className={classes.messageRow}>
              <Typography className={classes.messageText}>
                {ticket.lastMessage || 'Sem mensagens'}
              </Typography>
            </div>

            <Box className={classes.tagsContainer}>
              {contactTags && Array.isArray(contactTags) && contactTags.length > 0 ? (
                contactTags.map((tag) => {
                  if (!tag || !tag.id) return null;
                  return (
                    <Chip
                      key={tag.id}
                      label={tag.name || 'Tag sem nome'}
                      className={classes.tagChip}
                      size="small"
                      style={{
                        backgroundColor: tag.color || '#757575',
                      }}
                    />
                  );
                })
              ) : (
                <Chip
                  label="Sem tags"
                  className={classes.tagChip}
                  size="small"
                  style={{
                    backgroundColor: '#e5e7eb',
                    color: '#6b7280',
                  }}
                />
              )}
            </Box>

            <div className={classes.userTimeRow}>
              <div className={classes.userRow}>
                <WhatsApp style={{ fontSize: 18, color: '#10b981' }} />
                <Tooltip title={whatsappInstanceName}>
                  <Chip
                    label={`Conexão: ${abbreviateConnectionName(whatsappInstanceName).toUpperCase()}`}
                    className={classes.connectionTag}
                    size="small"
                  />
                </Tooltip>
                {ticket.user && (
                  <Tooltip title={ticket.user.name}>
                    <Chip
                      label={ticket.user.name.toUpperCase()}
                      className={classes.userTag}
                      size="small"
                    />
                  </Tooltip>
                )}
              </div>
              <div className={classes.timeRow}>
                <AccessTimeIcon style={{ fontSize: 14, color: '#9ca3af' }} />
                <Typography className={lastMessageTimeClass}>
                  {isSameDay(parseISO(ticket.updatedAt), new Date())
                    ? format(parseISO(ticket.updatedAt), 'HH:mm')
                    : format(parseISO(ticket.updatedAt), 'dd/MM/yy HH:mm')}
                </Typography>
              </div>
            </div>

            <Box className={classes.footer}>
              <div className={classes.footerIcons}>
                <IconButton
                  size="small"
                  onClick={handleCardClick}
                  style={{ padding: 4, color: '#6b7280' }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </div>
            </Box>
          </div>
          <Dialog
            open={open}
            onClose={handleCloseModal}
            classes={{ paper: classes.dialogPaper }}
          >
            <DialogTitle>{valueField ? 'Editar' : 'Atribuir'} Valor da Oportunidade</DialogTitle>
            <DialogContent>
              <TextField
                label="Valor"
                type="number"
                fullWidth
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                variant="outlined"
                size="small"
                className={classes.textField}
              />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={handleCloseModal}
                color="secondary"
                variant="outlined"
                className={classes.dialogButton}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveValue}
                color="primary"
                variant="outlined"
                className={classes.dialogButton}
              >
                Salvar
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={openObservation}
            onClose={handleCloseObservationModal}
            classes={{ paper: classes.dialogPaper }}
          >
            <DialogTitle>{observationField ? 'Editar' : 'Adicionar'} Observação</DialogTitle>
            <DialogContent>
              <TextField
                label="Observação"
                multiline
                rows={4}
                fullWidth
                value={newObservation}
                onChange={(e) => setNewObservation(e.target.value)}
                variant="outlined"
                size="small"
                className={classes.textField}
                placeholder="Digite suas observações sobre o cliente..."
              />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={handleCloseObservationModal}
                color="secondary"
                variant="outlined"
                className={classes.dialogButton}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveObservation}
                color="primary"
                variant="outlined"
                className={classes.dialogButton}
              >
                Salvar
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanCard;
