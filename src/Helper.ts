export const rotate90Clockwise = function rotate90Clockwise<T>(matrix: T[]): T[] {
    const size = Math.sqrt(matrix.length);

    if (typeof(size) !== "number") {
        throw new TypeError("Matrix must represent a square matrix");
    }

    const result = new Array<T>(matrix.length);

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const from = row * size + col;
            const to = col * size + (size - 1 - row);

            result[to] = matrix[from];
        }
    }

    return result;
}

export const rotate90CounterClockwise = function rotate90CounterClockwise<T>(matrix: T[]): T[] {
    const size = Math.sqrt(matrix.length);

    if (typeof(size) !== "number") {
        throw new TypeError("Matrix must represent a square matrix");
    }

    const result = new Array<T>(matrix.length);

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const from = row * size + col;
            const to = (size - 1 - col) * size + row;

            result[to] = matrix[from];
        }
    }

    return result;
}