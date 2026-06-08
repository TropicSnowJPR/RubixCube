import {Piece} from "./Piece";
import {Sticker} from "./Sticker";
import type {Side} from "./Side";
import type {Direction} from "./Direction";

export class Cube {

    size: number;
    state: Piece[] = [];

    constructor(size?: number, empty = false) {

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
                            stickers.push(new Sticker(-1, "ORANGE" , "WEST" ));
                        }

                        if (x === this.size - 1) {
                            stickers.push(new Sticker(-1, "RED" , "EAST"));
                        }

                        if (z === 0) {
                            stickers.push(new Sticker(-1, "GREEN" , "NORTH"));
                        }

                        if (z === this.size - 1) {
                            stickers.push(new Sticker(-1, "BLUE" , "SOUTH"));
                        }

                        if (y === 0) {
                            stickers.push(new Sticker(-1, "WHITE" , "DOWN"));
                        }

                        if (y === this.size - 1) {
                            stickers.push(new Sticker(-1, "YELLOW" , "UP"));
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
        unformatedIndex: number
    ): Piece[] {

        const layerPieces: Piece[] = [];

        const index = Math.abs(unformatedIndex);

        for (const piece of this.state) {
            if (
                ( side === "NORTH" && piece.position.z === index ) ||
                ( side === "EAST" && piece.position.x === this.size - 1 - index ) ||
                ( side === "WEST" && piece.position.x === index ) ||
                ( side === "SOUTH" && piece.position.z === this.size - 1 - index ) ||
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
                if (direction === "COUNTERCLOCKWISE") {
                    piece.position.x = relY + mid;
                    piece.position.y = -relX + mid;
                } else {
                    piece.position.x = -relY + mid;
                    piece.position.y = relX + mid;
                }

            } else if (side === "SOUTH") {
                const relX = oldX - mid;
                const relY = oldY - mid;
                if (direction === "CLOCKWISE") {
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
                    this.updatePositionRotationOffset(sticker)
                    continue;
                }
                const newSide = Cube.rotateSide(side, sticker.side, direction);
                if (!newSide) {
                    throw new Error(`Invalid side rotation: ${sticker.side} with direction ${direction}`);
                }
                this.updatePositionRotationOffset(sticker)
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
            EAST: {
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
            SOUTH: {
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
            NORTH: {
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
            UP: {
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
            },
            DOWN: {
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
                    sticker.color,
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

    isSolvedLike(other: Cube): boolean {
        if (this.size !== other.size || this.state.length !== other.state.length) {
            return false;
        }

        const otherById = new Map<number, Piece>();
        for (const piece of other.state) {
            otherById.set(piece.id, piece);
        }

        for (const piece of this.state) {
            const target = otherById.get(piece.id);
            if (!target) {
                return false;
            }

            if (
                piece.position.x !== target.position.x ||
                piece.position.y !== target.position.y ||
                piece.position.z !== target.position.z
            ) {
                return false;
            }

            const pieceSides = piece.stickers.map((sticker) => sticker.side).sort().join("|");
            const targetSides = target.stickers.map((sticker) => sticker.side).sort().join("|");

            if (pieceSides !== targetSides) {
                return false;
            }
        }

        return true;
    }

    updatePositionRotationOffset( sticker: Sticker ): void {

        switch (sticker.side) {

            case "NORTH": {

                sticker.positionOffset = { x: 0, y: 0, z: -0.5 };
                sticker.rotationOffset = { pitch: 0, yaw: 180, roll: 0 };

                break;

            }

            case "EAST": {

                sticker.positionOffset = { x: 0.5, y: 0, z: 0 };
                sticker.rotationOffset = { pitch: 0, yaw: 90, roll: 0 };

                break;

            }

            case "WEST": {

                sticker.positionOffset = { x: -0.5, y: 0, z: 0 };
                sticker.rotationOffset = { pitch: 0, yaw: -90, roll: 0 };

                break;

            }

            case "SOUTH": {

                sticker.positionOffset = { x: 0, y: 0, z: 0.5 };
                sticker.rotationOffset = { pitch: 0, yaw: 0, roll: 0 };

                break;

            }

            case "UP": {

                sticker.positionOffset = { x: 0, y: 0.5, z: 0 };
                sticker.rotationOffset = { pitch: -90, yaw: 0, roll: 0 };

                break;

            }

            case "DOWN": {

                sticker.positionOffset = { x: 0, y: -0.5, z: 0 };
                sticker.rotationOffset = { pitch: 90, yaw: 0, roll: 0 };

                break;

            }

            default: {

                break;

            }

        }

    }

    setStateFromJSON(json: any): void {
        const arr = Array.isArray(json) ? json : json?.state;

        if (!Array.isArray(arr)) {
            throw new TypeError("Invalid cube JSON: expected array or {state: []}");
        }

        this.state = arr.map((p: any) => {
            const stickers: Sticker[] = (p.stickers || []).map((s: any) => {
                const sticker = new Sticker(s.id ?? -1, s.color, s.side);

                sticker.positionOffset = s.positionOffset ?? { x: 0, y: 0, z: 0 };
                sticker.rotationOffset = s.rotationOffset ?? { pitch: 0, yaw: 0, roll: 0 };

                return sticker;
            });

            return new Piece(
                p.id,
                p.position?.x ?? 0,
                p.position?.y ?? 0,
                p.position?.z ?? 0,
                p.rotation?.pitch ?? 0,
                p.rotation?.yaw ?? 0,
                p.rotation?.roll ?? 0,
                p.type ?? "UNKNOWN",
                stickers
            );
        });
    }
}