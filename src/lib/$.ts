import bonzo from 'bonzo';
import qwery from 'qwery';

// Warning: side effect. This patches the bonzo module for use everywhere
bonzo.aug({
  height() {
    return this.dim().height;
  },
});

type BonzoElement = bonzo.BonzoElement;
type QweryElement = qwery.QweryElement;

const $ = (selector: string, context?: Element): BonzoElement => bonzo(qwery(selector, context));

$.create = (s: string): BonzoElement => bonzo(bonzo.create(s));

$.ancestor = (el: Element | null, className: string): Element | null => {
  if (
    el === null
        || el === undefined
        || el.nodeName.toLowerCase() === 'html'
  ) {
    return null;
  }
  if (!el.parentNode || bonzo(el.parentNode).hasClass(className)) {
    return el.parentNode as Element;
  }
  return $.ancestor(el.parentNode as Element, className);
};

$.forEachElement = (selector: string, fn: (el: Element) => void): Element[] => {
  const els = qwery(selector);
  els.forEach(fn);
  return els;
};

export default $;
