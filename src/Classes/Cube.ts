import {Piece} from "./Piece";
import "core-js/es/array/find";


export class Cube {

    readonly size: number;
    state: Piece[] = [];

    constructor(size: number) {

        this.size = size;

        for (let x = 0; x < this.size; x += 1) {
            for (let y = 0; y < this.size; y += 1) {
                for (let z = 0; z < this.size; z += 1) {

                    let type: "CORNER" | "EDGE" | "CENTER" | "CORE" | "UNKNOWN" = "UNKNOWN";

                    const surfaceCount = [
                        x === 0 || x === this.size - 1,
                        y === 0 || y === this.size - 1,
                        z === 0 || z === this.size - 1
                    ].filter(Boolean).length;

                    if (surfaceCount === 3) {
                        type = "CORNER";
                    } else if (surfaceCount === 2) {
                        type = "EDGE";
                    } else if (surfaceCount === 1) {
                        type = "CENTER";
                    } else {
                        type = "CORE";
                    }

                    const stickers: { id: number; side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN"; color: string }[] = [];

                    if (x === 0) {
                        stickers.push({ id: -1, side: "WEST", color: "#009B48" });
                    }

                    if (x === this.size - 1) {
                        stickers.push({ id: -1, side: "EAST", color: "#B90000" });
                    }

                    if (z === 0) {
                        stickers.push({ id: -1, side: "SOUTH", color: "#0045AD" });
                    }

                    if (z === this.size - 1) {
                        stickers.push({ id: -1, side: "NORTH", color: "#FF5900" });
                    }

                    if (y === 0) {
                        stickers.push({ id: -1, side: "DOWN", color: "#FFD500" });
                    }

                    if (y === this.size - 1) {
                        stickers.push({ id: -1, side: "UP", color: "#FFFFFF" });
                    }

                    const cubePiece = new Piece(x, y, z, 0, 0, 0, type, stickers);

                    this.state.push(cubePiece);

                }
            }
        }

        console.log( this.state )

    }

    getLayer(side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN", index: number): Piece[] {

        const layerPieces: Piece[] = [];

        for (const piece of this.state) {
            if ((side === "NORTH" && piece.position.z === this.size - 1 - index) || (side === "EAST" && piece.position.x === this.size - 1 - index) || (side === "WEST" && piece.position.x === index) || (side === "SOUTH" && piece.position.z === index) || (side === "UP" && piece.position.y === this.size - 1 - index) || (side === "DOWN" && piece.position.y === index)) {
                layerPieces.push(piece);
            }
        }

        return layerPieces;

    }

    rotateLayer(side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN", index: number, direction: "CLOCKWISE" | "COUNTERCLOCKWISE"): Piece[] {

        //console.log( side );
        //console.log(JSON.stringify(this.state, null, 2));

        for ( const piece of this.getLayer(side, index) ) {

            const oldX = piece.position.x;
            const oldY = piece.position.y;
            const oldZ = piece.position.z;


            const mid = (this.size - 1) / 2;

            if (side === "NORTH" || side === "SOUTH") {
                const relX = oldX - mid;
                const relY = oldY - mid;
                if (direction === "CLOCKWISE") {
                    piece.position.x = relY + mid;
                    piece.position.y = -relX + mid;
                } else {
                    piece.position.x = -relY + mid;
                    piece.position.y = relX + mid;
                }

            } else if (side === "EAST" || side === "WEST") {
                const relY = oldY - mid;
                const relZ = oldZ - mid;
                if (direction === "CLOCKWISE") {
                    piece.position.y = relZ + mid;
                    piece.position.z = -relY + mid;
                } else {
                    piece.position.y = -relZ + mid;
                    piece.position.z = relY + mid;
                }

            } else if (side === "UP" || side === "DOWN") {
                const relX = oldX - mid;
                const relZ = oldZ - mid;
                if (direction === "CLOCKWISE") {
                    piece.position.x = relZ + mid;
                    piece.position.z = -relX + mid;
                } else {
                    piece.position.x = -relZ + mid;
                    piece.position.z = relX + mid;
                }
            }

            for (const sticker of piece.stickers) {
                const newSide = this.rotateSide(sticker.side, side, direction);
                if (!newSide) {
                    throw new Error(`Invalid side rotation: ${sticker.side} with direction ${direction}`);
                }
                sticker.side = newSide;
            }

            const updatedPiece = new Piece(
                piece.position.x,
                piece.position.y,
                piece.position.z,
                piece.rotation.pitch,
                piece.rotation.yaw,
                piece.rotation.roll,
                piece.type,
                piece.stickers
            );
            let pieceIndex = -1;
            for (let i = 0; i < this.state.length; i+=1) {
                const p = this.state[i];
                if (p.position.x === oldX && p.position.y === oldY && p.position.z === oldZ) {
                    pieceIndex = i;
                    break;
                }
            }
            if (pieceIndex !== -1) {
                this.state[pieceIndex] = updatedPiece;
            }
        }

        return this.state

    }

    private rotateSide(
        rotatingFace: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN",
        stickerSide: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN",
        direction: "CLOCKWISE" | "COUNTERCLOCKWISE" = "CLOCKWISE"
    ): "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN" {

        const rotations = {
            EAST: {
                CLOCKWISE: { UP: "NORTH", DOWN: "SOUTH", NORTH: "DOWN", SOUTH: "UP" },
                COUNTERCLOCKWISE: { UP: "SOUTH", DOWN: "NORTH", NORTH: "UP", SOUTH: "DOWN" }
            },
            WEST: {
                CLOCKWISE: { UP: "SOUTH", DOWN: "NORTH", NORTH: "UP", SOUTH: "DOWN" },
                COUNTERCLOCKWISE: { UP: "NORTH", DOWN: "SOUTH", NORTH: "DOWN", SOUTH: "UP" }
            },
            SOUTH: {
                CLOCKWISE: { UP: "EAST", DOWN: "WEST", EAST: "DOWN", WEST: "UP" },
                COUNTERCLOCKWISE: { UP: "WEST", DOWN: "EAST", EAST: "UP", WEST: "DOWN" }
            },
            NORTH: {
                CLOCKWISE: { UP: "WEST", DOWN: "EAST", EAST: "UP", WEST: "DOWN" },
                COUNTERCLOCKWISE: { UP: "EAST", DOWN: "WEST", EAST: "DOWN", WEST: "UP" }
            },
            UP: {
                CLOCKWISE: { NORTH: "EAST", SOUTH: "WEST", EAST: "SOUTH", WEST: "NORTH" },
                COUNTERCLOCKWISE: { NORTH: "WEST", SOUTH: "EAST", EAST: "NORTH", WEST: "SOUTH" }
            },
            DOWN: {
                CLOCKWISE: { NORTH: "WEST", SOUTH: "EAST", EAST: "NORTH", WEST: "SOUTH" },
                COUNTERCLOCKWISE: { NORTH: "EAST", SOUTH: "WEST", EAST: "SOUTH", WEST: "NORTH" }
            }
        };

        return rotations[rotatingFace][direction][stickerSide] || stickerSide;
    }

}