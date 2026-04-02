export const rotateFlatMatrix90 = function rotateFlatMatrix90<T>(list: T[]): T[] {
    const size = Math.sqrt(list.length);

    // if (
    //     typeof size === 'number'
    // ) {
    //     throw new Error("List length must form a square matrix");
    // }

    const result: T[] = new Array(list.length);

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const oldIndex = row * size + col;
            const newIndex = col * size + (size - 1 - row);

            result[newIndex] = list[oldIndex];
        }
    }

    return result;
}

export const rotateFlatMatrix90Counter = function rotateFlatMatrix90Counter<T>(list: T[]): T[] {
    const size = Math.sqrt(list.length);

    // if (
    //     typeof size === 'number'
    // ) {
    //     throw new Error("List length must form a square matrix");
    // }

    const result: T[] = new Array(list.length);

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const oldIndex = row * size + col;
            const newIndex = (size - 1 - col) * size + row;

            result[newIndex] = list[oldIndex];
        }
    }

    return result;
}