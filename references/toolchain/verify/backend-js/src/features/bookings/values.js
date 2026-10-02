export const fee = (hours) => hours * 24;
export const codes = ['E-VALIDATION', 'E-VALIDATION', 'E-VALIDATION'];
export const shortName = (val) => val;
export const loose = (input) => input;
export function work() {
    // TODO finish this
    return 1;
}
export const tiny = (x) => x;
export function lonely(flag, other) {
    if (flag) {
        return 1;
    }
    else {
        if (other) {
            return 2;
        }
    }
    return 0;
}
