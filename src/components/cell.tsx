import React from 'react';
import { gridSize } from '../lib/helpers';
import { constants } from '../lib/constants';
import { classNames } from '../lib/classNames';

interface CellProps {
  x: number;
  y: number;
  value: string;
  number?: number;
  isFocussed: boolean;
  isHighlighted: boolean;
  isError: boolean;
  handleSelect: (x: number, y: number) => void;
}

const Cell: React.FC<CellProps> = ({
  x,
  y,
  value,
  number,
  isFocussed,
  isHighlighted,
  isError,
  handleSelect,
}) => {
  const top = gridSize(y);
  const left = gridSize(x);

  const onClick = (event: React.MouseEvent<SVGGElement, MouseEvent>) => {
    event.preventDefault();
    handleSelect(x, y);
  };

  return (
    <g onClick={onClick}>
      <rect
        x={left}
        y={top}
        width={constants.cellSize}
        height={constants.cellSize}
        className={classNames({
          crossword__cell: true,
          'crossword__cell--focussed': isFocussed,
          'crossword__cell--highlighted': isHighlighted,
        })}
      />
      {number !== undefined && (
        <text
          x={left + 1}
          y={top + constants.numberSize}
          key="number"
          className="crossword__cell-number"
        >
          {number}
        </text>
      )}
      {value !== undefined && (
        <text
          x={left + constants.cellSize * 0.5}
          y={top + constants.cellSize * 0.675}
          key="entry"
          className={classNames({
            'crossword__cell-text': true,
            'crossword__cell-text--focussed': isFocussed,
            'crossword__cell-text--error': isError,
          })}
          textAnchor="middle"
        >
          {value}
        </text>
      )}
    </g>
  );
};

export default Cell;
