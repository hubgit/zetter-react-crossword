import React, { useState, useEffect, useRef } from 'react';

interface HiddenInputProps {
  crossword: {
    onClickHiddenInput: (event: React.MouseEvent<HTMLInputElement>) => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    goToReturnPosition: (event: React.FocusEvent<HTMLInputElement>) => void;
    focusPreviousClue: () => void;
    focusNextClue: () => void;
    insertCharacter: (value: string) => void;
  };
  value: string;
}

const HiddenInput: React.FC<HiddenInputProps> = ({ crossword, value }) => {
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const onClick = (event: React.MouseEvent<HTMLInputElement>) => {
    crossword.onClickHiddenInput(event);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    crossword.onKeyDown(event);
  };

  const onBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    crossword.goToReturnPosition(event);
  };

  const onFocusPrevious = () => {
    crossword.focusPreviousClue();
  };

  const onFocusNext = () => {
    crossword.focusNextClue();
  };

  const touchStart = (event: React.TouchEvent<HTMLInputElement>) => {
    crossword.onClickHiddenInput(event);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    crossword.insertCharacter(event.target.value);
    setInputValue('');
  };

  return (
    <div
      className="crossword__hidden-input-wrapper"
      ref={wrapperRef}
    >
      <input
        key="1"
        type="text"
        className="crossword__hidden-input-prev-next"
        onFocus={onFocusPrevious}
      />
      <input
        key="2"
        type="text"
        className="crossword__hidden-input"
        maxLength={1}
        onClick={onClick}
        onChange={handleChange}
        onTouchStart={touchStart}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        value={inputValue}
        autoComplete="off"
        spellCheck="false"
        autoCorrect="off"
        ref={inputRef}
      />
      <input
        key="3"
        type="text"
        className="crossword__hidden-input-prev-next"
        onFocus={onFocusNext}
      />
    </div>
  );
};

export { HiddenInput };
