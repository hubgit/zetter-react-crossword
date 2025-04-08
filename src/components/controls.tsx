import React from 'react';
import { ConfirmButton } from './confirm-button';

const buttonClassName = 'button button--primary';
const buttonCurrentClassName = 'button--crossword--current';
const buttonGenericClassName = 'button--secondary';

interface ControlsProps {
  hasSolutions: boolean;
  clueInFocus: boolean;
  crossword: {
    onClearAll: () => void;
    onCheckAll: () => void;
    onClearSingle: () => void;
    onCheck: () => void;
  };
}

const Controls: React.FC<ControlsProps> = ({ hasSolutions, clueInFocus, crossword }) => {
  const controls = {
    clue: [],
    grid: [],
  };

  // GRID CONTROLS
  controls.grid.unshift(
    <ConfirmButton
      className={`${buttonClassName} ${buttonGenericClassName}`}
      onClick={crossword.onClearAll.bind(crossword)}
      key="clear"
      data-link-name="Clear all"
      text="Clear all"
    />,
  );

  if (hasSolutions) {
    controls.grid.unshift(
      <ConfirmButton
        className={`${buttonClassName} ${buttonGenericClassName}`}
        onClick={crossword.onCheckAll.bind(crossword)}
        key="checkAll"
        data-link-name="Check all"
        text="Check all"
      />,
    );
  }

  // HIGHLIGHTED CLUE CONTROLS  - published solution
  if (clueInFocus) {
    controls.clue.unshift(
      <button
        className={`${buttonClassName} ${buttonCurrentClassName}`}
        onClick={crossword.onClearSingle.bind(crossword)}
        key="clear-single"
        data-link-name="Clear this"
      >
        Clear this
      </button>,
    );

    if (hasSolutions) {
      controls.clue.unshift(
        <button
          className={`${buttonClassName} ${buttonCurrentClassName}`}
          onClick={crossword.onCheck.bind(crossword)}
          key="check"
          data-link-name="Check this"
        >
          Check this
        </button>,
      );
    }
  }

  return (
    <div className="crossword__controls">
      <div className="crossword__controls__clue">{controls.clue}</div>
      <div className="crossword__controls__grid">{controls.grid}</div>
    </div>
  );
};

export { Controls };
