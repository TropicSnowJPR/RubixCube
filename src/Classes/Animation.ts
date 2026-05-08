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
                sticker.setSide(Cube.rotateSide(this.side, sticker.side, this.direction), this.side);
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
                    rotation:   {
                                pitch: state.rotation.pitch + THREE.MathUtils.degToRad(sticker.rotationOffset.pitch),
                                yaw: state.rotation.yaw + THREE.MathUtils.degToRad(sticker.rotationOffset.yaw),
                                roll: state.rotation.roll + THREE.MathUtils.degToRad(sticker.rotationOffset.roll)
                    },
                    id:         sticker.id,
                    side:       sticker.side
                });
            }
        }

        this.elapsed = Math.min(this.elapsed + delta, this.duration);
        const t = this.duration <= 0 ? 1 : this.elapsed / this.duration;
        const signedAngle = (this.direction === "CLOCKWISE" ? -this.angle : this.angle) * t;
        if (t >= 1) {
            this.isFinished = true;
        }

        return StickerOrbitList.map(sticker => {

            const CurrentPosition: Position = {
                x: sticker.position.x,
                y: sticker.position.y,
                z: sticker.position.z
            };

            const CurrentRotation: Rotation = {
                pitch: THREE.MathUtils.radToDeg(sticker.rotation.pitch),
                yaw: THREE.MathUtils.radToDeg(sticker.rotation.yaw),
                roll: THREE.MathUtils.radToDeg(sticker.rotation.roll)
            }

            switch ( this.side ) {
                case "NORTH": { // Rotation Around the Z-Axis (Roll)

                    const TransformedData = this.orbitTransform(CurrentPosition.x, CurrentPosition.y, signedAngle, CurrentRotation.roll);

                    const UpdatedRotation: Rotation = {
                        pitch: CurrentRotation.pitch,
                        yaw: CurrentRotation.yaw,
                        roll: TransformedData.rotation
                    }

                    const UpdatedPosition: Position = {
                        x: TransformedData.x,
                        y: TransformedData.y,
                        z: CurrentPosition.z,
                    };

                    return {
                        position:   UpdatedPosition,
                        rotation:   UpdatedRotation,
                        id:         sticker.id,
                        side:       sticker.side
                    };
                }
                case "EAST": { // Rotation Around the X-Axis (Pitch)

                    const TransformedData = this.orbitTransform(CurrentPosition.y, CurrentPosition.z, -signedAngle, CurrentRotation.pitch);

                    const UpdatedRotation: Rotation = {
                        pitch: -TransformedData.rotation,
                        yaw: CurrentRotation.yaw,
                        roll: CurrentRotation.pitch
                    }

                    const UpdatedPosition: Position = {
                        x: CurrentPosition.x,
                        y: TransformedData.y,
                        z: TransformedData.x,
                    };

                    return {
                        position:   UpdatedPosition,
                        rotation:   UpdatedRotation,
                        id:         sticker.id,
                        side:       sticker.side
                    };
                }
                case "SOUTH": { // Rotation Around the Z-Axis (Roll)


                    const TransformedData = this.orbitTransform(CurrentPosition.x, CurrentPosition.y, -signedAngle, CurrentRotation.roll);

                    const UpdatedRotation: Rotation = {
                        pitch: CurrentRotation.pitch,
                        yaw: CurrentRotation.yaw,
                        roll: TransformedData.rotation
                    }

                    const UpdatedPosition: Position = {
                        x: TransformedData.x,
                        y: TransformedData.y,
                        z: CurrentPosition.z,
                    };

                    return {
                        position:   UpdatedPosition,
                        rotation:   UpdatedRotation,
                        id:         sticker.id,
                        side:       sticker.side
                    };
                }
                case "WEST": { // Rotation Around the X-Axis (Pitch)

                    const TransformedData = this.orbitTransform(CurrentPosition.y, CurrentPosition.z, signedAngle, CurrentRotation.pitch);

                    const UpdatedRotation: Rotation = {
                        pitch: -TransformedData.rotation,
                        yaw: CurrentRotation.yaw,
                        roll: CurrentRotation.pitch
                    }

                    const UpdatedPosition: Position = {
                        x: CurrentPosition.x,
                        y: TransformedData.y,
                        z: TransformedData.x,
                    };

                    return {
                        position:   UpdatedPosition,
                        rotation:   UpdatedRotation,
                        id:         sticker.id,
                        side:       sticker.side
                    };
                }
                case "UP": { // Rotation Around the Y-Axis (Yaw)

                    const TransformedData = this.orbitTransform(CurrentPosition.x, CurrentPosition.z, signedAngle, CurrentRotation.pitch);

                    const UpdatedRotation: Rotation = {
                        pitch: CurrentRotation.pitch,
                        yaw: TransformedData.rotation,
                        roll: CurrentRotation.pitch
                    }

                    const UpdatedPosition: Position = {
                        x: TransformedData.x,
                        y: CurrentPosition.y,
                        z: TransformedData.y,
                    };

                    return {
                        position:   UpdatedPosition,
                        rotation:   UpdatedRotation,
                        id:         sticker.id,
                        side:       sticker.side
                    };
                }
                case "DOWN": { // Rotation Around the Y-Axis (Yaw)

                    const TransformedData = this.orbitTransform(CurrentPosition.x, CurrentPosition.z, signedAngle, CurrentRotation.pitch);

                    const UpdatedRotation: Rotation = {
                        pitch: CurrentRotation.pitch,
                        yaw: TransformedData.rotation,
                        roll: CurrentRotation.pitch
                    }

                    const UpdatedPosition: Position = {
                        x: TransformedData.x,
                        y: CurrentPosition.y,
                        z: TransformedData.y,
                    };

                    return {
                        position:   UpdatedPosition,
                        rotation:   UpdatedRotation,
                        id:         sticker.id,
                        side:       sticker.side
                    };
                }
                default: {
                    throw new Error(`Invalid side ${this.side} for animation. Must be one of "NORTH", "EAST", "WEST", "SOUTH", "UP", or "DOWN".`);
                }
            }

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