import { createEasing } from './easing';
import bonzo from 'bonzo';
import fastdom from 'fastdom';

const scrollTo = (
  offset: number,
  duration: number = 0,
  easeFn: string = 'easeOutQuad',
  container: HTMLElement = document.body,
): void => {
  const $container = bonzo(container);
  const from = $container.scrollTop();
  const distance = offset - from;
  const ease = createEasing(easeFn, duration);
  const scrollFn = () => {
    fastdom.write(() => $container.scrollTop(from + ease() * distance));
  };
  const interval = setInterval(scrollFn, 15);

  setTimeout(() => {
    clearInterval(interval);
    fastdom.write(() => $container.scrollTop(offset));
  }, duration);
};

const scrollToElement = (
  element: HTMLElement,
  duration: number = 0,
  easeFn: string,
  container?: HTMLElement,
): void => {
  const top = bonzo(element).offset().top;
  scrollTo(top, duration, easeFn, container);
};

export { scrollTo, scrollToElement };
