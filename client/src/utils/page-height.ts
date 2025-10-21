// Style function for q-page to explicitly set its height
export const pageStyleFn = (offset: number, height: number) => {
  // This follows the Quasar default, but you can tweak as needed
  return { height: offset ? `calc(${height}px - ${offset}px)` : `${height}px` };
};
