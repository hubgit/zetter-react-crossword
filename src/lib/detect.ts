import { throttle } from "lodash";

// These should match those defined in:
//   stylesheets/main.css
//   common/app/layout/Breakpoint.scala
interface Breakpoint {
  name: string;
  isTweakpoint: boolean;
  width: number;
  mql?: MediaQueryList;
  listener?: (mql: MediaQueryListEvent) => void;
}

const breakpoints: Breakpoint[] = [
  {
    name: "mobile",
    isTweakpoint: false,
    width: 0,
  },
  {
    name: "mobileMedium",
    isTweakpoint: true,
    width: 375,
  },
  {
    name: "mobileLandscape",
    isTweakpoint: true,
    width: 480,
  },
  {
    name: "phablet",
    isTweakpoint: true,
    width: 660,
  },
  {
    name: "tablet",
    isTweakpoint: false,
    width: 740,
  },
  {
    name: "desktop",
    isTweakpoint: false,
    width: 980,
  },
  {
    name: "leftCol",
    isTweakpoint: true,
    width: 1140,
  },
  {
    name: "wide",
    isTweakpoint: false,
    width: 1300,
  },
];

let currentBreakpoint: string;
let currentTweakpoint: string;
let supportsPushState: boolean | undefined;
let pageVisibility: string = document.visibilityState ||
  // $FlowFixMe
  document.webkitVisibilityState ||
  // $FlowFixMe
  document.mozVisibilityState ||
  // $FlowFixMe
  document.msVisibilityState ||
  "visible";

const breakpointNames: string[] = breakpoints.map((breakpoint) => breakpoint.name);

const findBreakpoint = (tweakpoint: string): string => {
  let breakpointIndex = breakpointNames.indexOf(tweakpoint);
  let breakpoint = breakpoints[breakpointIndex];
  while (breakpointIndex >= 0 && breakpoint.isTweakpoint) {
    breakpointIndex -= 1;
    breakpoint = breakpoints[breakpointIndex];
  }
  return breakpoint.name;
};

const updateBreakpoint = (breakpoint: Breakpoint): void => {
  currentTweakpoint = breakpoint.name;

  if (breakpoint.isTweakpoint) {
    currentBreakpoint = findBreakpoint(currentTweakpoint);
  } else {
    currentBreakpoint = currentTweakpoint;
  }
};

// this function has a Breakpoint as context, so we can't use fat arrows
const onMatchingBreakpoint = function onMatchingBreakpoint(this: Breakpoint, mql: MediaQueryListEvent): void {
  if (mql && mql.matches) {
    updateBreakpoint(this);
  }
};

const updateBreakpoints = (): void => {
  // The implementation for browsers that don't support window.matchMedia is simpler,
  // but relies on (1) the resize event, (2) layout and (3) hidden generated content
  // on a pseudo-element
  const bodyStyle = window.getComputedStyle(document.body, "::after");
  const breakpointName = bodyStyle.content.substring(
    1,
    bodyStyle.content.length - 1,
  );
  const breakpointIndex = breakpointNames.indexOf(breakpointName);
  updateBreakpoint(breakpoints[breakpointIndex]);
};

const initMediaQueryListeners = (): void => {
  breakpoints.forEach((bp, index, bps) => {
    // We create mutually exclusive (min-width) and (max-width) media queries
    // to facilitate the breakpoint/tweakpoint logic.
    const minWidth = `(min-width: ${bp.width}px)`;

    bp.mql = index < bps.length - 1
      ? window.matchMedia(
        `${minWidth} and (max-width: ${
          bps[index + 1].width -
          1
        }px)`,
      )
      : window.matchMedia(minWidth);

    bp.listener = onMatchingBreakpoint.bind(bp);

    if (bp.mql) {
      bp.mql.addListener(bp.listener);
    }

    if (bp.mql && bp.listener) {
      bp.listener(bp.mql);
    }
  });
};

const initBreakpoints = (): void => {
  if ("matchMedia" in window) {
    initMediaQueryListeners();
  } else {
    updateBreakpoints();
    window.addEventListener("resize", throttle(updateBreakpoints, 200));
  }
};

interface Viewport {
  width: number;
  height: number;
}

const getViewport = (): Viewport => {
  if (
    !window.innerWidth ||
    !(document && document.body && document.body.clientWidth)
  ) {
    return {
      height: 0,
      width: 0,
    };
  }

  return {
    width: window.innerWidth || document.body.clientWidth,
    height: window.innerHeight || document.body.clientHeight,
  };
};

const getBreakpoint = (
  includeTweakpoint: boolean,
): string => (includeTweakpoint ? currentTweakpoint : currentBreakpoint);

interface BreakpointCriteria {
  min?: string;
  max?: string;
}

const isBreakpoint = (criteria: BreakpointCriteria): boolean => {
  const indexMin = criteria.min ? breakpointNames.indexOf(criteria.min) : 0;
  const indexMax = criteria.max
    ? breakpointNames.indexOf(criteria.max)
    : breakpointNames.length - 1;
  const indexCur = breakpointNames.indexOf(
    currentTweakpoint || currentBreakpoint,
  );

  return indexMin <= indexCur && indexCur <= indexMax;
};

const hasCrossedBreakpoint = (includeTweakpoint: boolean) => {
  let was = getBreakpoint(includeTweakpoint);

  return (callback: (is: string, was: string) => void) => {
    const is = getBreakpoint(includeTweakpoint);

    if (is !== was) {
      callback(is, was);
      was = is;
    }
  };
};

const isIOS = (): boolean => /(iPad|iPhone|iPod touch)/i.test(navigator.userAgent);

const isAndroid = (): boolean => /Android/i.test(navigator.userAgent);

const hasTouchScreen = (): boolean =>
  "ontouchstart" in window ||
  (window.DocumentTouch && document instanceof window.DocumentTouch);

const hasPushStateSupport = (): boolean => {
  if (supportsPushState !== undefined) {
    return supportsPushState;
  }

  if (window.history && window.history.pushState) {
    supportsPushState = true;
    // Android stock browser lies about its HistoryAPI support.
    if (window.navigator.userAgent.match(/Android/i)) {
      supportsPushState = !!window.navigator.userAgent.match(
        /(Chrome|Firefox)/i,
      );
    }
  }

  return supportsPushState;
};

const initPageVisibility = (): void => {
  const onchange = (evt: Event = window.event as Event): void => {
    const v = "visible";
    const evtMap: { [key: string]: string } = {
      focus: v,
      focusin: v,
      pageshow: v,
      blur: "hidden",
      focusout: "hidden",
      pagehide: "hidden",
    };

    if (evt.type in evtMap) {
      pageVisibility = evtMap[evt.type];
    } else {
      pageVisibility = window && window.hidden ? "hidden" : "visible";
    }
  };

  // Standards:
  if ("hidden" in document) {
    document.addEventListener("visibilitychange", onchange);
  } else if ("msHidden" in document) {
    document.addEventListener("msvisibilitychange", onchange);
  } else if ("onfocusin" in document) {
    // IE 9 and lower:
    window.onfocusout = onchange;
    window.onfocusin = onchange;
  } else {
    // All others:
    window.onpageshow = onchange;
    window.onpagehide = onchange;
    window.onfocus = onchange;
    window.onblur = onchange;
  }
};

const pageVisible = (): boolean => pageVisibility === "visible";

const isEnhanced = (): boolean => window.guardian.isEnhanced;

const getReferrer = (): string => document.referrer || "";

interface UserAgent {
  browser: string;
  version: string;
}

const getUserAgent: UserAgent = (() => {
  if (!navigator && !navigator.userAgent) {
    return { browser: "", version: "" };
  }

  const ua = navigator.userAgent;
  let tem: RegExpExecArray | null;
  let M = ua.match(
    /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i,
  ) || [];

  if (M && M[1] && /trident/i.test(M[1])) {
    tem = /\brv[ :]+(\d+)/g.exec(ua);

    if (tem && tem[1]) {
      return { browser: "IE", version: tem[1] };
    }
  }

  if (M && M[1] === "Chrome") {
    tem = ua.match(/\bOPR\/(\d+)/);

    if (tem && tem[1]) {
      return { browser: "Opera", version: tem[1] };
    }
  }

  M = M && M[2]
    ? [M[1], M[2]]
    : [navigator.appName, navigator.appVersion, "-?"];
  tem = ua.match(/version\/(\d+)/i);

  if (tem && tem[1]) {
    M.splice(1, 1, tem[1]);
  }

  return {
    browser: M[0],
    version: M[1],
  };
})();

initBreakpoints();

export {
  breakpoints,
  getBreakpoint,
  getReferrer,
  getUserAgent,
  getViewport,
  hasCrossedBreakpoint,
  hasPushStateSupport,
  hasTouchScreen,
  initPageVisibility,
  isAndroid,
  isBreakpoint,
  isEnhanced,
  isIOS,
  pageVisible,
};
