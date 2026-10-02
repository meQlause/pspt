export function tooMany(alpha, beta, gamma, delta, omega) {
    return alpha + beta + gamma + delta + omega;
}
export class First {
}
export class Second {
}
export const nested = (list) => list.map((one) => one.map((two) => two.map((three) => three.map((four) => four + 1)))).flat(3);
