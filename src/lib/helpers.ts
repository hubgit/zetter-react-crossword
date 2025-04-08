import { constants } from "./constants";
import flattenDeep from "lodash/flattenDeep";
import range from "lodash/range";
import uniqBy from "lodash/uniqBy";

type Clue = {
  id: string;
  number: number;
  humanNumber: string;
  clue: string;
  direction: 'across' | 'down';
  length: number;
  group: string[];
  position: { x: number; y: number };
  separatorLocations: { [key: string]: number[] };
  solution?: string;
};

type Cell = {
  isHighlighted: boolean;
  isEditable: boolean;
  isError: boolean;
  isAnimating: boolean;
  value: string;
  number?: number;
};

type Grid = Cell[][];

const isAcross = (clue: Clue): boolean => clue.direction === "across";

const getLastCellInClue = (clue: Clue): { x: number; y: number } => {
  const ax = {
    true: "x",
    false: "y",
  };
  const axis = ax[String(isAcross(clue))];
  const otherAxis = ax[String(!isAcross(clue))];
  const cell = {
    [axis]: clue.position[axis] + (clue.length - 1),
    [otherAxis]: clue.position[otherAxis],
  };

  return cell;
};

const isFirstCellInClue = (cell: { x: number; y: number }, clue: Clue): boolean => {
  const axis = isAcross(clue) ? "x" : "y";

  return cell[axis] === clue.position[axis];
};

const isLastCellInClue = (cell: { x: number; y: number }, clue: Clue): boolean => {
  const axis = isAcross(clue) ? "x" : "y";

  return cell[axis] === clue.position[axis] + (clue.length - 1);
};

const getNextClueInGroup = (entries: Clue[], clue: Clue): Clue | undefined => {
  const newClueId =
    clue.group[clue.group.findIndex((id) => id === clue.id) + 1];

  return entries.find((entry) => entry.id === newClueId);
};

const getPreviousClueInGroup = (entries: Clue[], clue: Clue): Clue | undefined => {
  const newClueId =
    clue.group[clue.group.findIndex((id) => id === clue.id) - 1];

  return entries.find((entry) => entry.id === newClueId);
};

const getGroupEntriesForClue = (entries: Clue[], group: string[]): Clue[] =>
  group.reduce((acc, clueId) => {
    const entry = entries.find((e) => e.id === clueId);

    if (entry) {
      acc.push(entry);
    }

    return acc;
  }, [] as Clue[]);

const clueIsInGroup = (clue: Clue): boolean => clue.group.length !== 1;

const getAllSeparatorsForGroup = (clues: Clue[]): { [key: string]: number[] } => {
  const k: { [key: string]: number[] } = {};

  [",", "-"].forEach((separator) => {
    let cnt = 0;
    const flattenedSeparators = flattenDeep(
      clues.map((clue) => {
        const separatorLocations = clue.separatorLocations[separator] || [];
        const seps = separatorLocations.map((s) => s + cnt);

        cnt += clue.length;

        return seps;
      }),
    );
    k[separator] = flattenedSeparators;
  });

  return k;
};

const getClueForGroupedEntries = (clueGroup: Clue[]): string => clueGroup[0].clue;

const getNumbersForGroupedEntries = (clueGroup: Clue[]): string => clueGroup[0].humanNumber;

const getTtotalLengthOfGroup = (clueGroup: Clue[]): number =>
  clueGroup.reduce((total, clue) => total + clue.length, 0);

const cluesAreInGroup = (clue: Clue, otherClue: Clue): boolean => otherClue.group.includes(clue.id);

const cellsForEntry = (entry: Clue): { x: number; y: number }[] =>
  isAcross(entry)
    ? range(entry.position.x, entry.position.x + entry.length).map((x) => ({
        x,
        y: entry.position.y,
      }))
    : range(entry.position.y, entry.position.y + entry.length).map((y) => ({
        x: entry.position.x,
        y,
      }));

const checkClueHasBeenAnswered = (grid: Grid, entry: Clue): boolean =>
  cellsForEntry(entry).every((position) =>
    /^.$/.test(grid[position.x][position.y].value)
  );

const otherDirection = (direction: 'across' | 'down'): 'across' | 'down' =>
  direction === "across" ? "down" : "across";

/** Hash key for the cell at x, y in the clue map */
const clueMapKey = (x: number, y: number): string => `${x}_${y}`;

const cluesFor = (clueMap: { [key: string]: { across?: Clue; down?: Clue } }, x: number, y: number): { across?: Clue; down?: Clue } =>
  clueMap[clueMapKey(x, y)];

const getClearableCellsForEntry = (grid: Grid, clueMap: { [key: string]: { across?: Clue; down?: Clue } }, entries: Clue[], entry: Clue): { x: number; y: number }[] => {
  const direction = otherDirection(entry.direction);

  return cellsForEntry(entry).filter((cell) => {
    const clues = cluesFor(clueMap, cell.x, cell.y);
    const otherClue = clues[direction];

    if (otherClue) {
      return (
        cluesAreInGroup(entry, otherClue) ||
        !checkClueHasBeenAnswered(grid, otherClue)
      );
    }

    return true;
  });
};

const getClearableCellsForClue = (grid: Grid, clueMap: { [key: string]: { across?: Clue; down?: Clue } }, entries: Clue[], clue: Clue): { x: number; y: number }[] => {
  if (clueIsInGroup(clue)) {
    const entriesForClue = getGroupEntriesForClue(entries, clue.group);
    return uniqBy(
      flattenDeep(
        entriesForClue.map((entry) =>
          getClearableCellsForEntry(grid, clueMap, entries, entry)
        ),
      ),
      (cell) => [cell.x, cell.y].join(),
    );
  }
  return getClearableCellsForEntry(grid, clueMap, entries, clue);
};

/**
 * Builds the initial state of the grid given the number of rows, columns, and a list of clues.
 */
const buildGrid = (rows: number, columns: number, entries: Clue[], savedState?: string[][]): Grid => {
  const grid = range(columns).map((x) =>
    range(rows).map((y) => ({
      isHighlighted: false,
      isEditable: false,
      isError: false,
      isAnimating: false,
      value: savedState && savedState[x] && savedState[x][y]
        ? savedState[x][y]
        : "",
    }))
  );

  entries.forEach((entry) => {
    const { x, y } = entry.position;

    grid[x][y].number = entry.number;

    cellsForEntry(entry).forEach((cell) => {
      grid[cell.x][cell.y].isEditable = true;
    });
  });

  return grid;
};

/** A map for looking up clues that a given cell relates to */
const buildClueMap = (clues: Clue[]): { [key: string]: { across?: Clue; down?: Clue } } => {
  const map: { [key: string]: { across?: Clue; down?: Clue } } = {};

  clues.forEach((clue) => {
    cellsForEntry(clue).forEach((cell) => {
      const key = clueMapKey(cell.x, cell.y);

      if (map[key] === undefined) {
        map[key] = {};
      }

      if (isAcross(clue)) {
        map[key].across = clue;
      } else {
        map[key].down = clue;
      }
    });
  });

  return map;
};

/** A map for looking up separators (i.e word or hyphen) that a given cell relates to */
const buildSeparatorMap = (clues: Clue[]): { [key: string]: { key: string; direction: 'across' | 'down'; separator: string } } => {
  const flattenReducer = (acc: any[], curr: any[]): any[] => {
    let flattened = curr;

    if (Array.isArray(flattened) && flattened.length) {
      flattened = flattened.reduce(flattenReducer, []);
    }

    return acc.concat(flattened);
  };

  return clues
    .map((clue) =>
      Object.keys(clue.separatorLocations).map((separatorStr) => {
        const separator = separatorStr;
        const locations = clue.separatorLocations[separator];

        return locations.map((location) => {
          const key = isAcross(clue)
            ? clueMapKey(
              clue.position.x + location,
              clue.position.y,
            )
            : clueMapKey(
              clue.position.x,
              clue.position.y + location,
            );

          return {
            key,
            direction: clue.direction,
            separator,
          };
        });
      })
    )
    .reduce(flattenReducer, [])
    .reduce((map, d) => {
      if (!d) {
        return map;
      }

      if (map[d.key] === undefined) {
        map[d.key] = {};
      }

      map[d.key] = d;

      return map;
    }, {});
};

const entryHasCell = (entry: Clue, x: number, y: number): boolean =>
  cellsForEntry(entry).some((cell) => cell.x === x && cell.y === y);

/** Can be used for width or height, as the cell height == cell width */
const gridSize = (cells: number): number =>
  cells * (constants.cellSize + constants.borderSize) + constants.borderSize;

const mapGrid = (grid: Grid, f: (cell: Cell, x: number, y: number) => Cell): Grid =>
  grid.map((col, x) => col.map((cell, y) => f(cell, x, y)));

export {
  buildClueMap,
  buildGrid,
  buildSeparatorMap,
  cellsForEntry,
  checkClueHasBeenAnswered,
  clueIsInGroup,
  clueMapKey,
  cluesAreInGroup,
  cluesFor,
  entryHasCell,
  getAllSeparatorsForGroup,
  getClearableCellsForClue,
  getClueForGroupedEntries,
  getGroupEntriesForClue,
  getLastCellInClue,
  getNextClueInGroup,
  getNumbersForGroupedEntries,
  getPreviousClueInGroup,
  getTtotalLengthOfGroup,
  gridSize,
  isAcross,
  isFirstCellInClue,
  isLastCellInClue,
  mapGrid,
  otherDirection,
};
