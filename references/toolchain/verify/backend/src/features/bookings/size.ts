export function tooMany(alpha: number, beta: number, gamma: number, delta: number, omega: number): number {
  return alpha + beta + gamma + delta + omega;
}
export class First {}
export class Second {}
export const nested = (list: number[][][][]): number[] =>
  list.map((one) => one.map((two) => two.map((three) => three.map((four) => four + 1)))).flat(3);
