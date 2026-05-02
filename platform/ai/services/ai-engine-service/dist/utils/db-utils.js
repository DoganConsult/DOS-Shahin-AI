export function getFirstRow(result) {
    return result?.rows?.[0] ?? null;
}
export function getFirstRowOrThrow(result, message = 'Row not found') {
    const row = result?.rows?.[0];
    if (!row)
        throw new Error(message);
    return row;
}
//# sourceMappingURL=db-utils.js.map