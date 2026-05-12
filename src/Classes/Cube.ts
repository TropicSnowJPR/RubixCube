import {Piece} from "./Piece";
import {Sticker} from "./Sticker";
import type {Side} from "./Side";
import type {Direction} from "./Direction";
import * as THREE from 'three';


export class Cube {

    readonly size: number;
    state: Piece[] = [];
    private Scene: THREE.Scene;

    constructor(
        size?: number,
        empty: boolean = false,
        Scene?: THREE.Scene
    ) {
        if (Scene) {
            this.Scene = Scene;
        }
        
        if (!size || size <= 1) {
            this.size = 3;
        } else if (size > 1) {
            this.size = size;
        }

        if (!empty) {
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

                        const stickers: Sticker[] = [];

                        if (x === 0) {
                            stickers.push(new Sticker(-1, "WEST"));
                        }

                        if (x === this.size - 1) {
                            stickers.push(new Sticker(-1, "EAST"));
                        }

                        if (z === 0) {
                            stickers.push(new Sticker(-1, "SOUTH"));
                        }

                        if (z === this.size - 1) {
                            stickers.push(new Sticker(-1, "NORTH"));
                        }

                        if (y === 0) {
                            stickers.push(new Sticker(-1, "DOWN"));
                        }

                        if (y === this.size - 1) {
                            stickers.push(new Sticker(-1, "UP"));
                        }

                        const cubePiece = new Piece(
                            x+y+z+Math.random()+Math.random(),
                            x,
                            y,
                            z,
                            0,
                            0,
                            0,
                            type,
                            stickers
                        );

                        this.state.push(cubePiece);

                    }
                }
            }

            console.log( this.state )
        }

    }

    getLayer(
        side:
            "NORTH" |
            "EAST" |
            "WEST" |
            "SOUTH" |
            "UP" |
            "DOWN",
        index: number
    ): Piece[] {

        const layerPieces: Piece[] = [];

        index = Math.abs(index);

        for (const piece of this.state) {
            if (
                ( side === "NORTH" && piece.position.z === this.size - 1 - index ) ||
                ( side === "EAST" && piece.position.x === this.size - 1 - index ) ||
                ( side === "WEST" && piece.position.x === index ) ||
                ( side === "SOUTH" && piece.position.z === index ) ||
                ( side === "UP" && piece.position.y === this.size - 1 - index ) ||
                ( side === "DOWN" && piece.position.y === index )
            ) {
                layerPieces.push(piece);
            }
        }

        return layerPieces;

    }

    rotateLayer(
        side:
            "NORTH" |
            "EAST" |
            "WEST" |
            "SOUTH" |
            "UP" |
            "DOWN",
        index: number,
        direction:
            "CLOCKWISE" |
            "COUNTERCLOCKWISE"
    ): Piece[] {

        const Layer = this.getLayer(side, index)

        for ( const piece of Layer ) {

            const oldX = piece.position.x;
            const oldY = piece.position.y;
            const oldZ = piece.position.z;

            const mid = (this.size - 1) / 2;

            if (side === "NORTH") {
                const relX = oldX - mid;
                const relY = oldY - mid;
                if (direction === "CLOCKWISE") {
                    piece.position.x = relY + mid;
                    piece.position.y = -relX + mid;
                } else {
                    piece.position.x = -relY + mid;
                    piece.position.y = relX + mid;
                }

            } else if (side === "SOUTH") {
                const relX = oldX - mid;
                const relY = oldY - mid;
                if (direction === "COUNTERCLOCKWISE") {
                    piece.position.x = relY + mid;
                    piece.position.y = -relX + mid;
                } else {
                    piece.position.x = -relY + mid;
                    piece.position.y = relX + mid;
                }

            } else if (side === "EAST") {
                const relY = oldY - mid;
                const relZ = oldZ - mid;
                if (direction === "CLOCKWISE") {
                    piece.position.y = relZ + mid;
                    piece.position.z = -relY + mid;
                } else {
                    piece.position.y = -relZ + mid;
                    piece.position.z = relY + mid;
                }

            } else if (side === "WEST") {
                const relY = oldY - mid;
                const relZ = oldZ - mid;
                if (direction === "COUNTERCLOCKWISE") {
                    piece.position.y = relZ + mid;
                    piece.position.z = -relY + mid;
                } else {
                    piece.position.y = -relZ + mid;
                    piece.position.z = relY + mid;
                }

            } else if (side === "UP") {
                const relX = oldX - mid;
                const relZ = oldZ - mid;
                if (direction === "CLOCKWISE") {
                    piece.position.x = relZ + mid;
                    piece.position.z = -relX + mid;
                } else {
                    piece.position.x = -relZ + mid;
                    piece.position.z = relX + mid;
                }

            } else if (side === "DOWN") {
                const relX = oldX - mid;
                const relZ = oldZ - mid;
                if (direction === "COUNTERCLOCKWISE") {
                    piece.position.x = relZ + mid;
                    piece.position.z = -relX + mid;
                } else {
                    piece.position.x = -relZ + mid;
                    piece.position.z = relX + mid;
                }

            }

            for ( const sticker of piece.stickers ) {
                if (sticker.side === side) {
                    sticker.setSide(sticker.side);
                    continue;
                }
                const newSide = Cube.rotateSide(side, sticker.side, direction);
                if (!newSide) {
                    throw new Error(`Invalid side rotation: ${sticker.side} with direction ${direction}`);
                }
                sticker.setSide(newSide);
            }

            const updatedPiece = new Piece(
                piece.id,
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
                if (p.id === piece.id) {
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

    static rotateSide(
        rotatingFace: Side,
        stickerSide: Side,
        direction: Direction = "CLOCKWISE"
    ): Side {

        const rotations = {
            WEST: {
                CLOCKWISE: {
                    UP: "NORTH",
                    DOWN: "SOUTH",
                    NORTH: "DOWN",
                    SOUTH: "UP"
                },
                COUNTERCLOCKWISE: {
                    UP: "SOUTH",
                    DOWN: "NORTH",
                    NORTH: "UP",
                    SOUTH: "DOWN"
                }
            },
            EAST: {
                CLOCKWISE: {
                    UP: "SOUTH",
                    DOWN: "NORTH",
                    NORTH: "UP",
                    SOUTH: "DOWN"
                },
                COUNTERCLOCKWISE: {
                    UP: "NORTH",
                    DOWN: "SOUTH",
                    NORTH: "DOWN",
                    SOUTH: "UP"
                }
            },
            SOUTH: {
                CLOCKWISE: {
                    UP: "WEST",
                    DOWN: "EAST",
                    EAST: "UP",
                    WEST: "DOWN"
                },
                COUNTERCLOCKWISE: {
                    UP: "EAST",
                    DOWN: "WEST",
                    EAST: "DOWN",
                    WEST: "UP"
                }
            },
            NORTH: {
                CLOCKWISE: {
                    UP: "EAST",
                    DOWN: "WEST",
                    EAST: "DOWN",
                    WEST: "UP"
                },
                COUNTERCLOCKWISE: {
                    UP: "WEST",
                    DOWN: "EAST",
                    EAST: "UP",
                    WEST: "DOWN"
                }
            },
            UP: {
                CLOCKWISE: {
                    NORTH: "EAST",
                    SOUTH: "WEST",
                    EAST: "SOUTH",
                    WEST: "NORTH"
                },
                COUNTERCLOCKWISE: {
                    NORTH: "WEST",
                    SOUTH: "EAST",
                    EAST: "NORTH",
                    WEST: "SOUTH"
                }
            },
            DOWN: {
                CLOCKWISE: {
                    NORTH: "WEST",
                    SOUTH: "EAST",
                    EAST: "NORTH",
                    WEST: "SOUTH"
                },
                COUNTERCLOCKWISE: {
                    NORTH: "EAST",
                    SOUTH: "WEST",
                    EAST: "SOUTH",
                    WEST: "NORTH"
                }
            }
        };

        return rotations[rotatingFace][direction][stickerSide] || stickerSide;
    }

    clone(): Cube {
        const cubeCopy = new Cube(this.size, true);

        cubeCopy.state = this.state.map(piece => {

            const clonedStickers = piece.stickers.map(sticker => {

                const newSticker = new Sticker(
                    sticker.id,
                    sticker.side
                );

                newSticker.positionOffset = {
                    x: sticker.positionOffset.x,
                    y: sticker.positionOffset.y,
                    z: sticker.positionOffset.z
                };

                return newSticker;

            });

            return new Piece(

                piece.id,
                piece.position.x,
                piece.position.y,
                piece.position.z,
                piece.rotation.pitch,
                piece.rotation.yaw,
                piece.rotation.roll,
                piece.type,
                clonedStickers

            );

        });

        return cubeCopy;
    }

}