/**
 * helper to remove leading zero from string
 * e.g. 02 -> 2
 * @param {string} str
 */
export const removeLeadingZero = (str: string) =>
  str[0] === '0' ? str[1] : str;

export const capitalizeFirst = (str: string) => {
  const split = str.split('');
  return split[0].toUpperCase() + split.slice(1).join('');
};
