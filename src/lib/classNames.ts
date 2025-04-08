export const classNames = (props: { [key: string]: boolean }): string =>
  Object.keys(props)
    .filter((key) => props[key])
    .join(' ');
