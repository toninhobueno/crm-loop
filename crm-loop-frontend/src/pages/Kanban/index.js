import React, { useState, useEffect, useContext } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import api from '../../services/api';
import { AuthContext } from '../../context/Auth/AuthContext';
import { toast } from 'react-toastify';
import { i18n } from '../../translate/i18n';
import { useHistory } from 'react-router-dom';
import { setKanbanLaneOrder, getKanbanLaneOrder } from '../../services/companyKanbanService';
import { Button, TextField, Paper, FormControl, InputLabel, Select, Box } from '@material-ui/core';
import { format } from 'date-fns';
import { Can } from '../../components/Can';
import MainContainer from '../../components/MainContainer';
import KanbanBoard from './KanbanBoard';
import CrmSectionTabs from '../../components/CrmSectionTabs';

const useStyles = makeStyles(theme => ({
  pageRoot: {
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.background.default : '#F9FAFB',
    marginTop: theme.spacing(-0.5),
    paddingBottom: theme.spacing(1),
    borderRadius: 0,
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  toolbarPaper: {
    padding: theme.spacing(1.75, 2),
    marginBottom: theme.spacing(2),
    borderRadius: 12,
    border: 'none',
    background:
      theme.palette.type === 'dark'
        ? 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,118,110,0.15) 45%, rgba(161,98,7,0.15) 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #ecfeff 45%, #fef3c7 100%)',
    boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
    flexShrink: 0,
  },
  toolbarRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: theme.spacing(1.25),
  },
  boardShell: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 0,
    overflow: 'visible',
    border: 'none',
    boxShadow: 'none',
    backgroundColor: 'transparent',
  },
  boardScroll: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflowX: 'auto',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: theme.spacing(0, 0, 3, 0),
    ...theme.scrollbarStyles,
    backgroundColor: 'transparent',
  },
  boardTrack: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    width: 'max-content',
    minWidth: 'min-content',
  },
  button: {
    borderRadius: 10,
    textTransform: 'none',
    fontWeight: 600,
  },
  dateInput: {
    '& .MuiOutlinedInput-root': {
      borderRadius: 10,
    },
    marginRight: 0,
    minWidth: 160,
  },
  sortSelect: {
    minWidth: 200,
    '& .MuiOutlinedInput-root': {
      borderRadius: 10,
    },
  },
}));

const Kanban = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user, socket } = useContext(AuthContext);
  const [tags, setTags] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [lanes, setLanes] = useState([]);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queueIds = user.queues.map(queue => queue.UserQueue.queueId);

  const [sortOrder, setSortOrder] = useState(() => {
    return localStorage.getItem('sortOrder') || 'ticketNumber';
  });

  const [laneOrder, setLaneOrder] = useState(null);
  const [loadingLaneOrder, setLoadingLaneOrder] = useState(true);

  useEffect(() => {
    localStorage.setItem('sortOrder', sortOrder);
  }, [sortOrder]);

  // Carregar ordem das lanes do banco de dados
  useEffect(() => {
    const loadLaneOrder = async () => {
      try {
        const savedOrder = await getKanbanLaneOrder();
        setLaneOrder(savedOrder);
      } catch (error) {
        console.error('Erro ao carregar ordem das lanes:', error);
      } finally {
        setLoadingLaneOrder(false);
      }
    };

    if (user && user.id) {
      loadLaneOrder();
    }
  }, [user]);

  useEffect(() => {
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTags = async () => {
    try {
      const response = await api.get('/tag/kanban/');
      const fetchedTags = response.data.lista || [];
      setTags(fetchedTags);
      fetchTickets(fetchedTags);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchTickets = async (fetchedTags = tags) => {
    try {
      const { data } = await api.get('/ticket/kanban', {
        params: {
          queueIds: JSON.stringify(queueIds),
          startDate: startDate,
          endDate: endDate,
        },
      });
      setTickets(data.tickets);
      organizeLanes(fetchedTags, data.tickets);
    } catch (err) {
      console.log(err);
      setTickets([]);
    }
  };

  useEffect(() => {
    const companyId = user.companyId;

    const onAppMessage = data => {
      if (['create', 'update', 'delete'].includes(data.action)) {
        fetchTickets();
      }
    };

    socket.on(`company-${companyId}-ticket`, onAppMessage);
    socket.on(`company-${companyId}-appMessage`, onAppMessage);

    return () => {
      socket.off(`company-${companyId}-ticket`, onAppMessage);
      socket.off(`company-${companyId}-appMessage`, onAppMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user.companyId]);

  const handleSearchClick = () => {
    fetchTickets();
  };

  const handleStartDateChange = event => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = event => {
    setEndDate(event.target.value);
  };

  const updateTicket = updatedTicket => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      )
    );
  };

  const getOpportunityValue = (ticket) => {
    const customFields = ticket.contact.extraInfo || [];
    const valueField = customFields.find(field => field.name === 'valor');
    const opportunityValue = valueField ? parseFloat(valueField.value) : 0;
    return opportunityValue;
  };

  const organizeLanes = (fetchedTags = tags, fetchedTickets = tickets) => {
    const sortedTickets = [...fetchedTickets];

    if (sortOrder === 'ticketNumber') {
      sortedTickets.sort((a, b) => a.id - b.id);
    } else if (sortOrder === 'lastMessageTime') {
      sortedTickets.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    } else if (sortOrder === 'valorDesc') {
      sortedTickets.sort((a, b) => {
        const valorA = getOpportunityValue(a);
        const valorB = getOpportunityValue(b);
        return valorB - valorA;
      });
    }

    const defaultTickets = sortedTickets.filter(
      ticket => ticket.tags.length === 0
    );

    const lanesData = [
      {
        id: 'lane0',
        title: i18n.t('tagsKanban.laneDefault'),
        tickets: defaultTickets,
        color: '#757575',
      },
      ...fetchedTags.map(tag => {
        const taggedTickets = sortedTickets.filter(ticket =>
          ticket.tags.some(t => t.id === tag.id)
        );
        return {
          id: tag.id.toString(),
          title: tag.name,
          tickets: taggedTickets,
          color: tag.color || '#757575',
        };
      }),
    ];

    // Aplicar ordem personalizada se existir
    if (laneOrder && laneOrder.length > 0) {
      const orderedLanes = [];
      const laneMap = new Map(lanesData.map(lane => [lane.id, lane]));
      
      // Adicionar lanes na ordem salva
      laneOrder.forEach(laneId => {
        if (laneMap.has(laneId)) {
          orderedLanes.push(laneMap.get(laneId));
          laneMap.delete(laneId);
        }
      });
      
      // Adicionar lanes restantes (novas lanes que não estavam na ordem salva)
      laneMap.forEach(lane => orderedLanes.push(lane));
      
      setLanes(orderedLanes);
    } else {
      setLanes(lanesData);
    }
  };

  useEffect(() => {
    if (!loadingLaneOrder) {
      organizeLanes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags, tickets, sortOrder, laneOrder, loadingLaneOrder]);

  const handleCardMove = async (ticketId, targetLaneId) => {
    ticketId = parseInt(ticketId, 10);
    try {
      await api.delete(`/ticket-tags/${ticketId}`);

      if (targetLaneId !== 'lane0') {
        await api.put(`/ticket-tags/${ticketId}/${targetLaneId}`);
        toast.success('Ticket Tag atualizado com sucesso!');
      } else {
        toast.success('Ticket Tag removido!');
      }

      fetchTickets();
    } catch (err) {
      console.log(err);
    }
  };

  const handleAddColumnClick = () => {
    history.push('/tagsKanban');
  };

  const handleSortOrderChange = event => {
    setSortOrder(event.target.value);
  };

  const handleLaneReorder = async (sourceIndex, destinationIndex) => {
    // Verificar se o usuário é admin
    if (user.profile !== 'admin') {
      toast.error('Apenas administradores podem reordenar as lanes do Kanban');
      return;
    }

    const newLanes = Array.from(lanes);
    const [reorderedLane] = newLanes.splice(sourceIndex, 1);
    newLanes.splice(destinationIndex, 0, reorderedLane);
    
    setLanes(newLanes);
    
    // Salvar nova ordem no banco de dados
    const newLaneOrder = newLanes.map(lane => lane.id);
    setLaneOrder(newLaneOrder);
    
    try {
      await setKanbanLaneOrder(newLaneOrder);
      toast.success('Ordem das lanes atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao salvar ordem das lanes:', error);
      toast.error('Erro ao salvar ordem das lanes');
    }
  };

  return (
    <MainContainer crm>
      <Box className={classes.pageRoot}>
      <CrmSectionTabs />
      <Paper className={classes.toolbarPaper} elevation={0}>
          <Box className={classes.toolbarRow}>
            <FormControl
              variant="outlined"
              size="small"
              className={classes.sortSelect}
            >
              <InputLabel htmlFor="sort-order-select">Ordenar por</InputLabel>
              <Select
                native
                value={sortOrder}
                onChange={handleSortOrderChange}
                label="Ordenar por"
                inputProps={{
                  name: 'sortOrder',
                  id: 'sort-order-select',
                }}
              >
                <option value="ticketNumber">Número do Ticket</option>
                <option value="lastMessageTime">Última Mensagem</option>
                <option value="valorDesc">Valor (maior para menor)</option>
              </Select>
            </FormControl>
            <TextField
              label="Data de início"
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              InputLabelProps={{
                shrink: true,
              }}
              variant="outlined"
              className={classes.dateInput}
              size="small"
            />
            <TextField
              label="Data de fim"
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              InputLabelProps={{
                shrink: true,
              }}
              variant="outlined"
              className={classes.dateInput}
              size="small"
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSearchClick}
              className={classes.button}
            >
              Buscar
            </Button>
            <Box flexGrow={1} />
            <Can
              role={user.profile}
              perform="dashboard:view"
              yes={() => (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleAddColumnClick}
                  className={classes.button}
                >
                  + Adicionar colunas
                </Button>
              )}
            />
          </Box>
      </Paper>
      <Paper className={classes.boardShell} variant="outlined" elevation={0}>
        <div className={classes.boardScroll}>
          <div className={classes.boardTrack}>
            <KanbanBoard
              lanes={lanes}
              onCardMove={handleCardMove}
              onLaneReorder={handleLaneReorder}
              updateTicket={updateTicket}
              isAdmin={user.profile === 'admin'}
            />
          </div>
        </div>
      </Paper>
      </Box>
    </MainContainer>
  );
};

export default Kanban;
