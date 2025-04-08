import '../../stylesheets/main.css';
import React, { useState, useEffect, useRef } from 'react';
import fastdom from 'fastdom';
import $ from '../lib/$';
import { isBreakpoint } from '../lib/detect';
import { scrollTo } from '../lib/scroller';
import debounce from 'lodash/debounce';
import zip from 'lodash/zip';
import { Clues } from './clues';
import { Controls } from './controls';
import { HiddenInput } from './hidden-input';
import { Grid } from './grid';
import {
  buildClueMap,
  buildGrid,
  otherDirection,
  entryHasCell,
  cluesFor,
  mapGrid,
  getClearableCellsForClue,
  getLastCellInClue,
  getPreviousClueInGroup,
  isFirstCellInClue,
  getNextClueInGroup,
  isLastCellInClue,
  gridSize,
  checkClueHasBeenAnswered,
  buildSeparatorMap,
  cellsForEntry,
} from '../lib/helpers';
import { keycodes } from '../lib/keycodes';
import { classNames } from '../lib/classNames';

interface CrosswordProps {
  data: any;
  id: string;
  loadGrid: (id: string) => any;
  saveGrid: (id: string, grid: any) => void;
  onMove?: (move: any) => void;
  onFocusClue?: (focus: any) => void;
}

const Crossword: React.FC<CrosswordProps> = ({
  data,
  id,
  loadGrid,
  saveGrid,
  onMove = () => {},
  onFocusClue = () => {},
}) => {
  const dimensions = data.dimensions;
  const columns = dimensions.cols;
  const rows = dimensions.rows;
  const clueMap = buildClueMap(data.entries);

  const [grid, setGrid] = useState(
    buildGrid(dimensions.rows, dimensions.cols, data.entries, loadGrid(id))
  );
  const [cellInFocus, setCellInFocus] = useState<any>(null);
  const [directionOfEntry, setDirectionOfEntry] = useState<string | null>(null);

  const stickyClueWrapper = useRef<HTMLDivElement>(null);
  const game = useRef<HTMLDivElement>(null);
  const gridWrapper = useRef<HTMLDivElement>(null);
  const hiddenInputComponent = useRef<any>(null);

  useEffect(() => {
    const $stickyClueWrapper = $(stickyClueWrapper.current);
    const $game = $(game.current);

    const handleResize = debounce(setGridHeight, 200);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    setGridHeight();

    const handleScroll = () => {
      const gameOffset = $game.offset();
      const stickyClueWrapperOffset = $stickyClueWrapper.offset();
      const scrollY = window.scrollY;

      const scrollYPastGame = scrollY - gameOffset.top;

      if (scrollYPastGame >= 0) {
        const gameOffsetBottom = gameOffset.top + gameOffset.height;

        if (scrollY > gameOffsetBottom - stickyClueWrapperOffset.height) {
          $stickyClueWrapper.css({ top: 'auto', bottom: 0 });
        } else {
          $stickyClueWrapper.css({ top: scrollYPastGame, bottom: '' });
        }
      } else {
        $stickyClueWrapper.css({ top: '', bottom: '' });
      }
    };

    window.addEventListener('scroll', handleScroll);

    const entryId = window.location.hash.replace('#', '');
    focusFirstCellInClueById(entryId);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
      if (event.keyCode === keycodes.backspace || event.keyCode === keycodes.delete) {
        event.preventDefault();
        if (cellInFocus) {
          if (cellIsEmpty(cellInFocus.x, cellInFocus.y)) {
            focusPrevious();
          } else {
            setCellValue(cellInFocus.x, cellInFocus.y, '');
            saveGridState();
          }
        }
      } else if (event.keyCode === keycodes.left) {
        event.preventDefault();
        moveFocus(-1, 0);
      } else if (event.keyCode === keycodes.up) {
        event.preventDefault();
        moveFocus(0, -1);
      } else if (event.keyCode === keycodes.right) {
        event.preventDefault();
        moveFocus(1, 0);
      } else if (event.keyCode === keycodes.down) {
        event.preventDefault();
        moveFocus(0, 1);
      }
    }
  };

  const onSelect = (x: number, y: number) => {
    const clue = cluesFor(clueMap, x, y);
    const focussedClue = clueInFocus();
    let newDirection: string | null = null;

    const isInsideFocussedClue = () => (focussedClue ? entryHasCell(focussedClue, x, y) : false);

    if (cellInFocus && cellInFocus.x === x && cellInFocus.y === y && directionOfEntry) {
      newDirection = otherDirection(directionOfEntry);

      if (clue[newDirection]) {
        focusClue(x, y, newDirection);
      }
    } else if (isInsideFocussedClue() && directionOfEntry) {
      focusClue(x, y, directionOfEntry);
    } else {
      setCellInFocus({ x, y });

      const isStartOfClue = (sourceClue: any) =>
        !!sourceClue && sourceClue.position.x === x && sourceClue.position.y === y;

      if (!isStartOfClue(clue.across) && isStartOfClue(clue.down)) {
        newDirection = 'down';
      } else if (clue.across) {
        newDirection = 'across';
      } else {
        newDirection = 'down';
      }
      focusClue(x, y, newDirection);
    }
  };

  const onCheck = () => {
    allHighlightedClues().forEach((clue) => check(clue));
    saveGridState();
  };

  const onCheckAll = () => {
    data.entries.forEach((clue: any) => check(clue));
    saveGridState();
  };

  const onClearAll = () => {
    setGrid(
      mapGrid(grid, (cell, gridX, gridY) => {
        const previousValue = cell.value;
        cell.value = '';
        onMove({ x: gridX, y: gridY, value: '', previousValue });
        return cell;
      })
    );
    saveGridState();
  };

  const onClearSingle = () => {
    const clueInFocus = clueInFocus();

    if (clueInFocus) {
      const cellsInFocus = getClearableCellsForClue(grid, clueMap, data.entries, clueInFocus);

      setGrid(
        mapGrid(grid, (cell, gridX, gridY) => {
          if (cellsInFocus.some((c) => c.x === gridX && c.y === gridY)) {
            const previousValue = cell.value;
            cell.value = '';
            onMove({ x: gridX, y: gridY, value: '', previousValue });
          }
          return cell;
        })
      );
      saveGridState();
    }
  };

  const onClickHiddenInput = (event: React.MouseEvent | React.TouchEvent) => {
    if (cellInFocus) {
      onSelect(cellInFocus.x, cellInFocus.y);
    }

    if (event.type === 'touchstart') {
      event.preventDefault();
    }
  };

  const setGridHeight = () => {
    if (!gridWrapper.current) return;

    if (
      isBreakpoint({
        max: 'tablet',
      })
    ) {
      fastdom.read(() => {
        fastdom.write(() => {
          gridWrapper.current!.style.height = `${gridWrapper.current!.offsetWidth}px`;
        });
      });
    } else {
      gridWrapper.current!.style.height = '';
    }
  };

  const setCellValue = (x: number, y: number, value: string, triggerOnMoveCallback = true) => {
    setGrid(
      mapGrid(grid, (cell, gridX, gridY) => {
        if (gridX === x && gridY === y) {
          const previousValue = cell.value;
          cell.value = value;
          cell.isError = false;
          if (triggerOnMoveCallback) {
            onMove({ x, y, value, previousValue });
          }
        }
        return cell;
      })
    );
  };

  const getCellValue = (x: number, y: number) => {
    return grid[x][y].value;
  };

  const setReturnPosition = (position: number) => {
    (window as any).returnPosition = position;
  };

  const updateGrid = (gridState: any) => {
    setGrid(buildGrid(rows, columns, data.entries, gridState));
  };

  const insertCharacter = (character: string) => {
    const characterUppercase = character.toUpperCase();
    if (/[A-Za-zÀ-ÿ0-9]/.test(characterUppercase) && characterUppercase.length === 1 && cellInFocus) {
      setCellValue(cellInFocus.x, cellInFocus.y, characterUppercase);
      saveGridState();
      focusNext();
    }
  };

  const cellIsEmpty = (x: number, y: number) => {
    return !getCellValue(x, y);
  };

  const goToReturnPosition = () => {
    if (
      isBreakpoint({
        max: 'mobile',
      })
    ) {
      if ((window as any).returnPosition) {
        scrollTo((window as any).returnPosition, 250, 'easeOutQuad');
      }
      (window as any).returnPosition = null;
    }
  };

  const indexOfClueInFocus = () => {
    return data.entries.indexOf(clueInFocus());
  };

  const focusPreviousClue = () => {
    const i = indexOfClueInFocus();
    const entries = data.entries;

    if (i !== -1) {
      const newClue = entries[i === 0 ? entries.length - 1 : i - 1];
      focusClue(newClue.position.x, newClue.position.y, newClue.direction);
    }
  };

  const focusNextClue = () => {
    const i = indexOfClueInFocus();
    const entries = data.entries;

    if (i !== -1) {
      const newClue = entries[i === entries.length - 1 ? 0 : i + 1];
      focusClue(newClue.position.x, newClue.position.y, newClue.direction);
    }
  };

  const findNextEditableCell = (deltaX: number, deltaY: number) => {
    if (!cellInFocus || !grid[cellInFocus.x] || !grid[cellInFocus.x][cellInFocus.y]) {
      return null;
    }

    let x = cellInFocus.x;
    let y = cellInFocus.y;
    let cell: any = null;

    const nextPos = (i: number, amount: number, max: number) => {
      i += amount;

      if (i === -1) {
        return max - 1;
      }
      if (i === max) {
        return 0;
      }

      return i;
    };

    while (!cell) {
      if (deltaY === 1 || deltaY === -1) {
        y = nextPos(y, deltaY, rows);
      } else if (deltaX === 1 || deltaX === -1) {
        x = nextPos(x, deltaX, columns);
      }

      const tempCell = grid[x][y];
      if (tempCell && tempCell.isEditable) {
        cell = { x, y };
      }
    }

    return cell;
  };

  const moveFocus = (deltaX: number, deltaY: number) => {
    const cell = findNextEditableCell(deltaX, deltaY);

    if (!cell) {
      return;
    }

    const clue = cluesFor(clueMap, cell.x, cell.y);
    let direction = 'down';

    if ((deltaX !== 0 && clue.across) || (deltaY !== 0 && !clue.down)) {
      direction = 'across';
    }

    focusClue(cell.x, cell.y, direction);
  };

  const isAcross = () => {
    return directionOfEntry === 'across';
  };

  const focusPrevious = () => {
    if (cellInFocus && clueInFocus()) {
      if (isFirstCellInClue(cellInFocus, clueInFocus())) {
        const newClue = getPreviousClueInGroup(data.entries, clueInFocus());
        if (newClue) {
          const newCell = getLastCellInClue(newClue);
          focusClue(newCell.x, newCell.y, newClue.direction);
        }
      } else if (isAcross()) {
        moveFocus(-1, 0);
      } else {
        moveFocus(0, -1);
      }
    }
  };

  const focusNext = () => {
    if (cellInFocus && clueInFocus()) {
      if (isLastCellInClue(cellInFocus, clueInFocus())) {
        const newClue = getNextClueInGroup(data.entries, clueInFocus());
        if (newClue) {
          focusClue(newClue.position.x, newClue.position.y, newClue.direction);
        }
      } else if (isAcross()) {
        moveFocus(1, 0);
      } else {
        moveFocus(0, 1);
      }
    }
  };

  const asPercentage = (x: number, y: number) => {
    const width = gridSize(columns);
    const height = gridSize(rows);

    return {
      x: (100 * x) / width,
      y: (100 * y) / height,
    };
  };

  const focusHiddenInput = (x: number, y: number) => {
    const wrapper = hiddenInputComponent.current.wrapper;
    const left = gridSize(x);
    const top = gridSize(y);
    const position = asPercentage(left, top);

    wrapper.style.left = `${position.x}%`;
    wrapper.style.top = `${position.y}%`;

    const hiddenInputNode = hiddenInputComponent.current.input;

    if (document.activeElement !== hiddenInputNode) {
      hiddenInputNode.focus();
    }
  };

  const focusClue = (x: number, y: number, direction: string) => {
    const clues = cluesFor(clueMap, x, y);
    const clue = clues[direction];

    if (clues && clue) {
      focusHiddenInput(x, y);

      setCellInFocus({ x, y });
      setDirectionOfEntry(direction);

      window.history.replaceState(undefined, document.title, `#${clue.id}`);

      onFocusClue({ x, y, clueId: clue.id });
    }
  };

  const focusFirstCellInClue = (entry: any) => {
    focusClue(entry.position.x, entry.position.y, entry.direction);
  };

  const focusFirstCellInClueById = (clueId: string) => {
    const newEntry = data.entries.find((val: any) => val.id === clueId);
    if (newEntry) {
      focusFirstCellInClue(newEntry);
    }
  };

  const focusCurrentCell = () => {
    if (cellInFocus) {
      focusHiddenInput(cellInFocus.x, cellInFocus.y);
    }
  };

  const clueInFocus = () => {
    if (cellInFocus) {
      const cluesForCell = cluesFor(clueMap, cellInFocus.x, cellInFocus.y);

      if (directionOfEntry) {
        return cluesForCell[directionOfEntry];
      }
    }
    return null;
  };

  const allHighlightedClues = () => {
    return data.entries.filter((clue: any) => clueIsInFocusGroup(clue));
  };

  const clueIsInFocusGroup = (clue: any) => {
    if (cellInFocus) {
      const cluesForCell = cluesFor(clueMap, cellInFocus.x, cellInFocus.y);

      if (directionOfEntry && cluesForCell[directionOfEntry]) {
        return cluesForCell[directionOfEntry].group.includes(clue.id);
      }
    }
    return false;
  };

  const cluesData = () => {
    return data.entries.map((entry: any) => {
      const hasAnswered = checkClueHasBeenAnswered(grid, entry);
      return {
        entry,
        hasAnswered,
        isSelected: clueIsInFocusGroup(entry),
      };
    });
  };

  const check = (entry: any) => {
    const cells = cellsForEntry(entry);

    if (entry.solution) {
      const badCells = zip(cells, entry.solution.split(''))
        .filter((cellAndSolution) => {
          const coords = cellAndSolution[0];
          const cell = grid[coords.x][coords.y];
          const solution = cellAndSolution[1];
          return /^.$/.test(cell.value) && cell.value !== solution;
        })
        .map((cellAndSolution) => cellAndSolution[0]);

      setGrid(
        mapGrid(grid, (cell, gridX, gridY) => {
          if (badCells.some((bad) => bad.x === gridX && bad.y === gridY)) {
            const previousValue = cell.value;
            cell.value = '';
            onMove({ x: gridX, y: gridY, value: '', previousValue });
          }
          return cell;
        })
      );
    }
  };

  const hiddenInputValue = () => {
    if (cellInFocus) {
      return grid[cellInFocus.x][cellInFocus.y].value || '';
    }
    return '';
  };

  const hasSolutions = () => {
    return 'solution' in data.entries[0];
  };

  const isHighlighted = (x: number, y: number) => {
    const focused = clueInFocus();
    return focused
      ? focused.group.some((id: string) => {
          const entry = data.entries.find((e: any) => e.id === id);
          return entryHasCell(entry, x, y);
        })
      : false;
  };

  const saveGridState = () => {
    const entries = grid.map((row) => row.map((cell) => cell.value));
    saveGrid(id, entries);
  };

  const gridProps = {
    rows,
    columns,
    cells: grid,
    separators: buildSeparatorMap(data.entries),
    crossword: {
      onSelect,
      isHighlighted,
    },
    focussedCell: cellInFocus,
  };

  const focused = clueInFocus();

  return (
    <div
      className={`crossword__container crossword__container--${data.crosswordType} crossword__container--react`}
      data-link-name="Crosswords"
    >
      <div className="crossword__container__game" ref={game}>
        <div className="crossword__sticky-clue-wrapper" ref={stickyClueWrapper}>
          <div className={classNames({ 'crossword__sticky-clue': true, 'is-hidden': !focused })}>
            {focused && (
              <div className="crossword__sticky-clue__inner">
                <div className="crossword__sticky-clue__inner__inner">
                  <strong>
                    {focused.number} <span className="crossword__sticky-clue__direction">{focused.direction}</span>
                  </strong>{' '}
                  {focused.clue}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="crossword__container__grid-wrapper" ref={gridWrapper}>
          <Grid {...gridProps} />
          <HiddenInput
            crossword={{
              onClickHiddenInput,
              onKeyDown,
              goToReturnPosition,
              insertCharacter,
            }}
            value={hiddenInputValue()}
            ref={hiddenInputComponent}
          />
        </div>
      </div>
      <Controls hasSolutions={hasSolutions()} clueInFocus={focused} crossword={{ onClearAll, onCheckAll, onClearSingle, onCheck }} />
      <Clues
        clues={cluesData()}
        focussed={focused}
        focusFirstCellInClueById={focusFirstCellInClueById}
        setReturnPosition={setReturnPosition}
      />
    </div>
  );
};

export default Crossword;
