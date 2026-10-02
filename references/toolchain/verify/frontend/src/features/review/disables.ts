// eslint-disable-next-line
export const blanket = 3 * 7;
// eslint-disable-next-line no-magic-numbers
export const noReason = 3 * 7;
// eslint-disable-next-line no-magic-numbers -- the vendor API encodes "settled" as status 7
export const isSettled = (status: number): boolean => status === 7;
// eslint-disable-next-line id-length -- nothing on the next line breaks id-length
export const unusedDisable = 1;
// @ts-ignore
export const ignored: number = 1;
// @ts-expect-error
export const bare: number = 1;
// @ts-expect-error -- the vendor typings declare a number, the API sends a string
export const describedTs: number = 1;
