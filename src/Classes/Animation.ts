// oxlint-disable no-console
import {Cube} from "./Cube";
import * as THREE from "three";
import {Position} from "./Position";
import {Rotation} from "./Rotation";
import {Side} from "./Side";
import {Direction} from "./Direction";

export class Animation {

    side: Side;
    depth: number;
    angle: 90 | 180 | 270 | number;
    direction: Direction;
    duration: number;
    isFinished = false;
    size: number;
    private elapsed = 0;
    private cube: Cube;

    constructor(
        cube: Cube,
        side: Side,
        depth: number,
        angle: 90 | 180 | 270 | number,
        direction: Direction,
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
                sticker.setSide(Cube.rotateSide(this.side, sticker.side, this.direction));
            }
        }
    }

    update(delta: number): ({
        position:   Position;
        rotation:   Rotation;
        id:         number;
        side:       Side;

    })[] {

        const StickerOrbitList: {
            position:   Position;
            rotation:   Rotation;
            id:         number;
            side:       Side;
        }[] = [];

        const layerIndex = this.depth - 1;

        const inLayer = (state: { position: Position }): boolean => {
            if (this.side === "NORTH")  { return state.position.z === this.cube.size - 1 - layerIndex; }
            if (this.side === "SOUTH")  { return state.position.z === layerIndex; }
            if (this.side === "EAST")   { return state.position.x === this.cube.size - 1 - layerIndex; }
            if (this.side === "WEST")   { return state.position.x === layerIndex; }
            if (this.side === "UP")     { return state.position.y === this.cube.size - 1 - layerIndex; }
            return state.position.y === layerIndex;
        };

        for (const state of this.cube.state) {
            if (!inLayer(state)) {continue;}
            for (const sticker of state.stickers) {
                StickerOrbitList.push({
                    position:   {
                                x: state.position.x + sticker.positionOffset.x,
                                y: state.position.y + sticker.positionOffset.y,
                                z: state.position.z + sticker.positionOffset.z
                    },
                    rotation:   state.rotation,
                    id:         sticker.id,
                    side:       sticker.side
                });
            }
        }

        this.elapsed = Math.min(this.elapsed + delta, this.duration);
        const t = this.duration <= 0 ? 1 : this.elapsed / this.duration;
        const signedAngle = (this.direction === "CLOCKWISE" ? this.angle : -this.angle) * t;
        if (t >= 1) {
            this.isFinished = true;
        }

        return StickerOrbitList.map(sticker => {
            if ( this.side === "NORTH") {
                const newPosition = this.orbitTransform(sticker.position.x, sticker.position.y, -signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.roll));
                return {
                    position:   {x: newPosition.x, y: newPosition.y, z: sticker.position.z},
                    rotation:   {pitch: sticker.rotation.pitch, yaw: sticker.rotation.yaw, roll: newPosition.rotation},
                    id:         sticker.id,
                    side:       sticker.side
                };
            } else if ( this.side === "SOUTH") {
                const newPosition = this.orbitTransform(sticker.position.x, sticker.position.y, signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.roll));
                return {
                    position:   {x: newPosition.x, y: newPosition.y, z: sticker.position.z},
                    rotation:   {pitch: sticker.rotation.pitch, yaw: sticker.rotation.yaw, roll: -newPosition.rotation},
                    id:         sticker.id,
                    side:       sticker.side
                };
            } else if ( this.side === "EAST") {
                const newPosition = this.orbitTransform(sticker.position.y, sticker.position.z, -signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.pitch));
                return {
                    position:   {x: sticker.position.x, y: newPosition.x, z: newPosition.y},
                    rotation:   {pitch: newPosition.rotation, yaw: sticker.rotation.yaw, roll: sticker.rotation.roll},
                    id:         sticker.id,
                    side:       sticker.side
                };
            } else if ( this.side === "WEST") {
                const newPosition = this.orbitTransform(sticker.position.y, sticker.position.z, signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.pitch));
                return {
                    position:   {x: sticker.position.x, y: newPosition.x, z: newPosition.y},
                    rotation:   {pitch: newPosition.rotation, yaw: sticker.rotation.yaw, roll: sticker.rotation.roll},
                    id:         sticker.id,
                    side:       sticker.side
                };
            } else if ( this.side === "UP") {
                const newPosition = this.orbitTransform(sticker.position.x, sticker.position.z, signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.yaw));
                return {
                    position:   {x: newPosition.x, y: sticker.position.y+0.5, z: newPosition.y},
                    rotation:   {pitch: sticker.rotation.pitch, yaw: sticker.rotation.yaw, roll: -newPosition.rotation},
                    id:         sticker.id,
                    side:       sticker.side
                };
            } else if ( this.side === "DOWN") {
                const newPosition = this.orbitTransform(sticker.position.x, sticker.position.z, signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.yaw));
                return {
                    position:   {x: newPosition.x, y: sticker.position.y, z: newPosition.y},
                    rotation:   {pitch: sticker.rotation.pitch, yaw: sticker.rotation.yaw, roll: newPosition.rotation},
                    id:         sticker.id,
                    side:       sticker.side
                };
            }

            throw new Error(`Invalid side ${this.side} for animation. Must be one of "NORTH", "EAST", "WEST", "SOUTH", "UP", or "DOWN".`);

        });
    }

    private orbitTransform(
        x: number, // Object X Position
        y: number, // Object Y Position
        alphaDeg: number,
        baseRotationDeg = 0
    ): { x: number, y: number, rotation: number } {
        const alpha = alphaDeg * Math.PI / 180;

        const mid = (this.size-1) / 2;

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

}