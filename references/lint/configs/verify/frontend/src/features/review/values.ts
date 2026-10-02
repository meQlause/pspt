export const fee = (hours: number): number => hours * 24;
export const codes = ['E-VALIDATION', 'E-VALIDATION', 'E-VALIDATION'];
export const tiny = (x: number): number => x;
export function braces(flag: boolean): number {
  if (flag) return 1;
  return 0;
}
export function negated(flag: boolean): string {
  if (!flag) {
    return 'off';
  }
  return 'on';
}
export function work(): number {
  // TODO finish this
  return 1;
}
