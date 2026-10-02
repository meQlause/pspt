export function deep(alpha, beta, gamma) {
    if (alpha) {
        if (beta) {
            if (gamma) {
                return 1;
            }
        }
    }
    return 0;
}
export const label = (count) => (count > 1 ? 'many' : count > 0 ? 'one' : 'none');
export function braces(flag) {
    if (flag)
        return 1;
    return 0;
}
export function elseAfter(flag, other) {
    if (flag) {
        return 1;
    }
    else if (other) {
        return 2;
    }
    return 0;
}
export function negated(flag) {
    if (!flag) {
        return 'off';
    }
    else {
        return 'on';
    }
}
export const redundant = (flag) => flag === true;
