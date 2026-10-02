export const fee = (hours) => hours * 24;
export const codes = ['E-VALIDATION', 'E-VALIDATION', 'E-VALIDATION'];
export const tiny = (x) => x;
export function braces(flag) {
    if (flag)
        return 1;
    return 0;
}
export function negated(flag) {
    if (!flag) {
        return 'off';
    }
    return 'on';
}
export function work() {
    // TODO finish this
    return 1;
}
