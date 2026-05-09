import React from 'react';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import KanbanColumn from './KanbanColumn';

const useStyles = makeStyles(() => ({
  board: {
    // Estilos “visuais” só; direção horizontal vem mergeada por cima dos droppableProps inline
    boxSizing: 'border-box',
  },
}));

const KanbanBoard = ({ lanes, onCardMove, onLaneReorder, updateTicket, isAdmin }) => {
  const classes = useStyles();
  const theme = useTheme();

  const mergeBoardStyle = droppableStyle => ({
    ...(droppableStyle || {}),
    // react-beautiful-dnd sobrescreve com flex-direction: column por padrão — forçamos linha igual CRM
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: theme.spacing(2),
    width: 'max-content',
    minWidth: 'min-content',
    padding: theme.spacing(0.5),
    minHeight: 'calc(100vh - 280px)',
    maxHeight: 720,
    boxSizing: 'border-box',
  });

  const handleDragEnd = result => {
    if (!result.destination) return;

    const { source, destination, draggableId, type } = result;

    // Se for reordenação de lane
    if (type === 'LANE') {
      if (source.index !== destination.index) {
        onLaneReorder(source.index, destination.index);
      }
      return;
    }

    // Se for movimentação de card
    if (
      source.droppableId !== destination.droppableId ||
      source.index !== destination.index
    ) {
      onCardMove(
        draggableId,
        destination.droppableId,
        source.droppableId,
        source.index,
        destination.index
      );
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="lanes" direction="horizontal" type="LANE">
        {provided => {
          const {
            style: droppableStyle,
            ...droppableRest
          } = provided.droppableProps;
          return (
            <div
              className={classes.board}
              ref={provided.innerRef}
              {...droppableRest}
              style={mergeBoardStyle(droppableStyle)}
            >
              {lanes.map((lane, index) => (
                <KanbanColumn
                  key={lane.id}
                  id={lane.id}
                  title={lane.title}
                  tickets={lane.tickets}
                  color={lane.color}
                  index={index}
                  updateTicket={updateTicket}
                  isAdmin={isAdmin}
                />
              ))}
              {provided.placeholder}
            </div>
          );
        }}
      </Droppable>
    </DragDropContext>
  );
};

export default KanbanBoard;
