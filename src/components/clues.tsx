import React, { useEffect, useRef, useState } from 'react';
import { classNames } from '../lib/classNames';
import { isBreakpoint } from '../lib/detect';
import { scrollTo } from '../lib/scroller';

interface ClueProps {
  id: string;
  humanNumber: string;
  clue: string;
  hasAnswered: boolean;
  isSelected: boolean;
  number: number;
  focusFirstCellInClueById: (id: string) => void;
  setReturnPosition: (position: number) => void;
}

const Clue: React.FC<ClueProps> = ({
  id,
  humanNumber,
  clue,
  hasAnswered,
  isSelected,
  number,
  focusFirstCellInClueById,
  setReturnPosition,
}) => {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setReturnPosition(window.scrollY);
    focusFirstCellInClueById(id);
  };

  return (
    <li>
      <a
        href={`#${id}`}
        onClick={onClick}
        className={classNames({
          crossword__clue: true,
          'crossword__clue--answered': hasAnswered,
          'crossword__clue--selected': isSelected,
          'crossword__clue--display-group-order': JSON.stringify(number) !== humanNumber,
        })}
      >
        <div className="crossword__clue__number">{humanNumber}</div>
        <div className="crossword__clue__text" dangerouslySetInnerHTML={{ __html: clue }} />
      </a>
    </li>
  );
};

interface CluesProps {
  clues: {
    entry: {
      id: string;
      number: number;
      humanNumber: string;
      clue: string;
      direction: string;
    };
    hasAnswered: boolean;
    isSelected: boolean;
  }[];
  focussed: {
    id: string;
  } | null;
  focusFirstCellInClueById: (id: string) => void;
  setReturnPosition: (position: number) => void;
}

const Clues: React.FC<CluesProps> = ({
  clues,
  focussed,
  focusFirstCellInClueById,
  setReturnPosition,
}) => {
  const [showGradient, setShowGradient] = useState(true);
  const cluesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const $cluesNode = cluesRef.current;

    if ($cluesNode) {
      const height = $cluesNode.scrollHeight - $cluesNode.clientHeight;

      const handleScroll = (e: Event) => {
        const target = e.currentTarget as HTMLDivElement;
        const showGradient = height - target.scrollTop > 25;

        if (showGradient !== showGradient) {
          setShowGradient(showGradient);
        }
      };

      $cluesNode.addEventListener('scroll', handleScroll);

      return () => {
        $cluesNode.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  useEffect(() => {
    if (
      isBreakpoint({
        min: 'tablet',
        max: 'leftCol',
      }) &&
      focussed
    ) {
      const node = document.getElementById(focussed.id);
      if (node) {
        const buffer = 100;
        const visible =
          node.offsetTop - buffer > cluesRef.current!.scrollTop &&
          node.offsetTop + buffer < cluesRef.current!.scrollTop + cluesRef.current!.clientHeight;

        if (!visible) {
          const offset = node.offsetTop - cluesRef.current!.clientHeight / 2;
          scrollTo(offset, 250, 'easeOutQuad', cluesRef.current!);
        }
      }
    }
  }, [focussed]);

  const cluesByDirection = (direction: string) =>
    clues
      .filter((clue) => clue.entry.direction === direction)
      .map((clue) => (
        <Clue
          key={clue.entry.id}
          id={clue.entry.id}
          number={clue.entry.number}
          humanNumber={clue.entry.humanNumber}
          clue={clue.entry.clue}
          hasAnswered={clue.hasAnswered}
          isSelected={clue.isSelected}
          focusFirstCellInClueById={focusFirstCellInClueById}
          setReturnPosition={setReturnPosition}
        />
      ));

  return (
    <div className={`crossword__clues--wrapper ${showGradient ? '' : 'hide-gradient'}`}>
      <div className="crossword__clues" ref={cluesRef}>
        <div className="crossword__clues--across">
          <h3 className="crossword__clues-header">Across</h3>
          <ol className="crossword__clues-list">{cluesByDirection('across')}</ol>
        </div>
        <div className="crossword__clues--down">
          <h3 className="crossword__clues-header">Down</h3>
          <ol className="crossword__clues-list">{cluesByDirection('down')}</ol>
        </div>
      </div>
      <div className="crossword__clues__gradient" />
    </div>
  );
};

export { Clues };
