// oxlint-disable no-console
import type {Cube} from "./Cube";
import * as THREE from "three";

export class Animation {

    side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN";
    depth: number;
    angle: 90 | 180 | 270 | number;
    direction: "CLOCKWISE" | "COUNTERCLOCKWISE";
    duration: number;
    isFinished = false;
    size: number;
    private elapsed = 0;
    private cube: Cube;

    constructor(
        cube: Cube,
        side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN",
        depth: number,
        angle: 90 | 180 | 270 | number,
        direction: "CLOCKWISE" | "COUNTERCLOCKWISE",
        duration: number,
        size: number
    ) {
        this.cube = cube;
        this.side = side;
        this.depth = depth;
        this.angle = angle;
        this.direction = direction;
        this.duration = duration; // Will not be applied currently
        this.size = size

        for (const piece of this.cube.state) {
            for (const sticker of piece.stickers) {
                console.log(sticker)
                sticker.setSide(this.rotateSide(this.side, sticker.side, this.direction));
            }
        }

    }

    update(delta: number): ({
        position: { x: number; y: number; z: number };
        rotation: { pitch: number; yaw: number; roll: number };
        id: number;
        side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN";
    })[] {
        const StickerOrbitList: {
            position: { x: number; y: number; z: number };
            rotation: { pitch: number; yaw: number; roll: number };
            id: number;
            side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN";
        }[] = [];

        const layerIndex = this.depth - 1;


        const inLayer = (state: { position: { x: number; y: number; z: number } }): boolean => {
            if (this.side === "NORTH") {return state.position.z === this.cube.size - 1 - layerIndex;}
            if (this.side === "SOUTH") {return state.position.z === layerIndex;}
            if (this.side === "EAST") {return state.position.x === this.cube.size - 1 - layerIndex;}
            if (this.side === "WEST") {return state.position.x === layerIndex;}
            if (this.side === "UP") {return state.position.y === this.cube.size - 1 - layerIndex;}
            return state.position.y === layerIndex;
        };

        for (const state of this.cube.state) {
            if (!inLayer(state)) {continue;}
            for (const sticker of state.stickers) {
                StickerOrbitList.push({
                    position: { x: state.position.x, y: state.position.y, z: state.position.z },
                    rotation: state.rotation,
                    id: sticker.id,
                    side: sticker.side
                });
            }
        }

        // console.log(`Animating ${StickerOrbitList.length} stickers in layer ${this.depth} on side ${this.side} with angle ${this.angle} and direction ${this.direction}.`);

        this.elapsed = Math.min(this.elapsed + delta, this.duration);
        const t = this.duration <= 0 ? 1 : this.elapsed / this.duration;
        const signedAngle = (this.direction === "CLOCKWISE" ? this.angle : -this.angle) * t;
        if (t >= 1) {
            this.isFinished = true;
        }

        return StickerOrbitList.map(sticker => {
            if (this.side === "NORTH") {
                const newPosition = this.orbitTransform(sticker.position.x, sticker.position.y, -signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.roll));
                return {
                    position: {x: newPosition.x, y: newPosition.y, z: sticker.position.z},
                    rotation: {pitch: sticker.rotation.pitch, yaw: sticker.rotation.yaw, roll: newPosition.rotation},
                    id: sticker.id,
                    side: sticker.side
                };
            } else if (this.side === "SOUTH") {
                const newPosition = this.orbitTransform(sticker.position.x, sticker.position.y, signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.roll));
                return {
                    position: {x: newPosition.x, y: newPosition.y, z: sticker.position.z},
                    rotation: {pitch: sticker.rotation.pitch, yaw: sticker.rotation.yaw, roll: -newPosition.rotation},
                    id: sticker.id,
                    side: sticker.side
                };
            } else if (this.side === "EAST") {
                const newPosition = this.orbitTransform(sticker.position.y, sticker.position.z, -signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.pitch));
                return {
                    position: {x: sticker.position.x, y: newPosition.x, z: newPosition.y},
                    rotation: {pitch: newPosition.rotation, yaw: sticker.rotation.yaw, roll: sticker.rotation.roll},
                    id: sticker.id,
                    side: sticker.side
                };
            } else if (this.side === "WEST") {
                const newPosition = this.orbitTransform(sticker.position.y, sticker.position.z, signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.pitch));
                return {
                    position: {x: sticker.position.x, y: newPosition.x, z: newPosition.y},
                    rotation: {pitch: newPosition.rotation, yaw: sticker.rotation.yaw, roll: sticker.rotation.roll},
                    id: sticker.id,
                    side: sticker.side
                };
            } else if (this.side === "UP") {
                const newPosition = this.orbitTransform(sticker.position.x, sticker.position.z, signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.yaw));
                return {
                    position: {x: newPosition.x, y: sticker.position.y, z: newPosition.y},
                    rotation: {pitch: sticker.rotation.pitch, yaw: sticker.rotation.yaw, roll: -newPosition.rotation},
                    id: sticker.id,
                    side: sticker.side
                };
            } else if ( this.side === "DOWN") {
                const newPosition = this.orbitTransform(sticker.position.x, sticker.position.z, signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.yaw));
                return {
                    position: {x: newPosition.x, y: sticker.position.y, z: newPosition.y},
                    rotation: {pitch: sticker.rotation.pitch, yaw: sticker.rotation.yaw, roll: newPosition.rotation},
                    id: sticker.id,
                    side: sticker.side
                };
            }

            throw new Error(`Invalid side ${this.side} for animation. Must be one of "NORTH", "EAST", "WEST", "SOUTH", "UP", or "DOWN".`);

        });
    }

    /*
        * Applies a 2D rotation transformation to the given (x, y) coordinates based on the provided angle and base rotation.
        * The transformation is performed around the center of the cube layer, which is calculated as (size - 1) / 2.
        * The function returns the new (x, y) coordinates and the updated rotation angle after applying the transformation.
     */
    private orbitTransform(
        x: number, // Object X Position
        y: number, // Object Y Position
        alphaDeg: number,
        baseRotationDeg = 0
    ): { x: number, y: number, rotation: number } {
        const alpha = alphaDeg * Math.PI / 180;

        const mid = (this.size - 1) / 2;

        const relX = x - mid;
        const relY = y - mid;

        const xPrime = mid + relX * Math.cos(alpha) - relY * Math.sin(alpha);
        const yPrime = mid + relX * Math.sin(alpha) + relY * Math.cos(alpha);

        const rotation = -(baseRotationDeg - alphaDeg);

        return {
            x: xPrime,
            y: yPrime,
            rotation
        };
    }

    private rotateSide(
        rotatingFace: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN",
        stickerSide: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN",
        direction: "CLOCKWISE" | "COUNTERCLOCKWISE" = "CLOCKWISE"
    ): "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN" {

        const rotations = {
            WEST: {
                CLOCKWISE: { UP: "NORTH", DOWN: "SOUTH", NORTH: "DOWN", SOUTH: "UP" },
                COUNTERCLOCKWISE: { UP: "SOUTH", DOWN: "NORTH", NORTH: "UP", SOUTH: "DOWN" }
            },
            EAST: {
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