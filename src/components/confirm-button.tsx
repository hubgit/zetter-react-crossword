import React, { useState } from 'react';
import { classNames } from '../lib/classNames';

const timeout = 2000;

interface ConfirmButtonProps {
  text: string;
  className: string;
  'data-link-name': string;
  onClick: () => void;
}

const ConfirmButton: React.FC<ConfirmButtonProps> = (props) => {
  const [confirming, setConfirming] = useState(false);

  const confirm = () => {
    if (confirming) {
      setConfirming(false);
      props.onClick();
    } else {
      setConfirming(true);
      setTimeout(() => {
        setConfirming(false);
      }, timeout);
    }
  };

  const inner = confirming
    ? `Confirm ${props.text.toLowerCase()}`
    : props.text;

  const classes = {};
  const className = classNames(
    ((classes[
      'crossword__controls__button--confirm'
    ] = confirming),
    (classes[props.className] = true),
    classes),
  );
  const buttonProps = {
    'data-link-name': props['data-link-name'],
    onClick: confirm,
    className,
  };

  return <button {...buttonProps}>{inner}</button>;
};

export { ConfirmButton };
