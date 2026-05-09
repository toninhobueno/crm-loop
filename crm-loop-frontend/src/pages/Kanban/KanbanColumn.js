import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import KanbanCard from './KanbanCard';
import { Typography, Chip } from '@material-ui/core';
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';

/** Largura das colunas alinhada ao CRM-BAIEYS (`w-[280px]` / `sm:w-72`) */
const KANBAN_COLUMN_WIDTH = 280;

const useStyles = makeStyles(theme => ({
  column: {
    flex: `0 0 ${KANBAN_COLUMN_WIDTH}px`,
    width: KANBAN_COLUMN_WIDTH,
    minWidth: KANBAN_COLUMN_WIDTH,
    maxWidth: KANBAN_COLUMN_WIDTH,
    padding: 0,
    marginRight: 0,
    borderRadius: 12,
    border:
      theme.palette.type === 'dark'
        ? '1px solid rgba(148,163,184,0.25)'
        : '1px solid #e5e7eb',
    backgroundColor: theme.palette.type === 'dark' ? theme.palette.background.paper : '#ffffff',
    boxShadow:
      theme.palette.type === 'dark'
        ? '0 4px 14px rgba(0,0,0,0.35)'
        : '0 1px 3px rgba(15, 23, 42, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
  },
  colorDot: props => ({
    width: 16,
    height: 16,
    borderRadius: '50%',
    flexShrink: 0,
    backgroundColor: props.accent || theme.palette.primary.main,
    border: '2px solid rgba(255,255,255,0.9)',
    boxShadow: '0 0 0 1px rgba(15,23,42,0.08)',
  }),
  titleBlock: {
    flex: 1,
    minWidth: 0,
    marginLeft: theme.spacing(1),
  },
  columnTitle: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: theme.palette.type === 'dark' ? theme.palette.grey[100] : '#111827',
    lineHeight: 1.25,
  },
  totalSub: {
    fontSize: '0.75rem',
    color: theme.palette.type === 'dark' ? theme.palette.grey[400] : '#6b7280',
    marginTop: 2,
    fontWeight: 500,
  },
  cardList: {
    flexGrow: 1,
    overflowY: 'auto',
    ...theme.scrollbarStyles,
    maxHeight: 'calc(100vh - 300px)',
    padding: theme.spacing(1.5),
    paddingTop: theme.spacing(1),
  },
  countBadge: {
    height: 24,
    fontWeight: 600,
    fontSize: '0.75rem',
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(148,163,184,0.2)' : '#f3f4f6',
    color: theme.palette.type === 'dark' ? theme.palette.grey[200] : '#374151',
    '& .MuiChip-label': {
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
    },
  },
  columnHeader: {
    padding: theme.spacing(1.5),
    paddingBottom: theme.spacing(1.25),
    borderBottom:
      theme.palette.type === 'dark' ? '1px solid rgba(148,163,184,0.2)' : '1px solid #f3f4f6',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    minWidth: 0,
    flex: 1,
  },
  dragHandle: {
    cursor: 'grab',
    color:
      theme.palette.type === 'dark' ? 'rgba(248, 250, 252, 0.55)' : 'rgba(15, 23, 42, 0.45)',
    padding: theme.spacing(0.5),
    marginRight: theme.spacing(0.25),
    '&:hover': {
      color:
        theme.palette.type === 'dark' ? '#fff' : 'rgba(15, 23, 42, 0.85)',
    },
  },
}));

const normalizeHex = hex => {
  if (!hex || typeof hex !== 'string') return null;
  const t = hex.trim();
  if (!t.startsWith('#')) return null;
  const h = t.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return full.length === 6 ? `#${full}` : null;
};

const KanbanColumn = ({ id, title, tickets, color, index, updateTicket, isAdmin }) => {
  const accent = normalizeHex(color) || '#3b82f6';
  const classes = useStyles({ accent });

  const totalValue = tickets.reduce((acc, ticket) => {
    if (!ticket.contact || !ticket.contact.extraInfo) return acc;
    const customFields = ticket.contact.extraInfo || [];
    const valueField = customFields.find(field => field.name === 'valor');
    if (!valueField || !valueField.value) return acc;
    const opportunityValue = parseFloat(valueField.value) || 0;
    return acc + opportunityValue;
  }, 0);

  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => (
        <div
          className={classes.column}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <div className={classes.columnHeader}>
            <div className={classes.headerLeft}>
              {isAdmin && (
                <div
                  {...provided.dragHandleProps}
                  className={classes.dragHandle}
                >
                  <DragIndicatorIcon fontSize="small" />
                </div>
              )}
              <div className={classes.colorDot} aria-hidden />
              <div className={classes.titleBlock}>
                <Typography className={classes.columnTitle} noWrap title={title}>
                  {title}
                </Typography>
                <Typography className={classes.totalSub} component="div">
                  Total{' '}
                  {totalValue.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </Typography>
              </div>
            </div>
            <Chip
              size="small"
              label={tickets.length}
              className={classes.countBadge}
            />
          </div>
          <Droppable droppableId={id} type="CARD">
            {(provided, snapshot) => (
              <div
                className={classes.cardList}
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {tickets.map((ticket, index) => (
                  <KanbanCard
                    key={ticket.id}
                    ticket={ticket}
                    index={index}
                    updateTicket={updateTicket}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanColumn;
