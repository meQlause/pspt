export const fee = (hours: number): number => hours * 24;
export const codes = ['E-VALIDATION', 'E-VALIDATION', 'E-VALIDATION'];
export const shortName = (val: number): number => val;
export const loose = (input: any): unknown => input;
export function work(): number {
  // TODO finish this
  return 1;
}
export const tiny = (x: number): number => x;
export function lonely(flag: boolean, other: boolean): number {
  if (flag) {
    return 1;
  } else {
    if (other) {
      return 2;
    }
  }
  return 0;
}
