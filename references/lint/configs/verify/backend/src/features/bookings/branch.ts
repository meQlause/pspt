export function deep(alpha: boolean, beta: boolean, gamma: boolean): number {
  if (alpha) {
    if (beta) {
      if (gamma) {
        return 1;
      }
    }
  }
  return 0;
}
export const label = (count: number): string => (count > 1 ? 'many' : count > 0 ? 'one' : 'none');
export function braces(flag: boolean): number {
  if (flag) return 1;
  return 0;
}
export function elseAfter(flag: boolean, other: boolean): number {
  if (flag) {
    return 1;
  } else if (other) {
    return 2;
  }
  return 0;
}
export function negated(flag: boolean): string {
  if (!flag) {
    return 'off';
  } else {
    return 'on';
  }
}
export const redundant = (flag: boolean): boolean => flag === true;
