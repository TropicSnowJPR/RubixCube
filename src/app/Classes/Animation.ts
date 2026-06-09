// oxlint-disable no-console
import {Cube} from "./Cube";
import * as THREE from "three";
import type {Position} from "./Position";
import type {Rotation} from "./Rotation";
import type {Side} from "./Side";
import type {Direction} from "./Direction";

export class Animation {

    SCENE: THREE.Scene;
    side: Side;
    depth: number;
    angle: 90 | 180 | 270 | number;
    direction: Direction;
    duration: number;
    isFinished = false;
    size: number;
    private elapsed = 0;
    private cube: Cube;
    private stickerTargetSide: Record<number, Side> = {};

    constructor(
        cube: Cube,
        side: Side,
        depth: number,
        angle: 90 | 180 | 270 | number,
        direction: Direction,
        duration: number,
        size: number,
        SCENE?: THREE.Scene
    ) {
        this.SCENE = SCENE
        this.cube = cube;
        this.side = side;
        this.depth = depth;
        this.angle = angle;
        this.direction = direction;
        this.duration = duration; // Will not be applied currently
        this.size = size;

        for (const piece of this.cube.state) {
            for (const sticker of piece.stickers) {
                this.stickerTargetSide[sticker.id] = Cube.rotateSide(this.side, sticker.side, this.direction);
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

            if (this.side === "NORTH")  { return state.position.z === layerIndex; }
            if (this.side === "SOUTH")  { return state.position.z === this.cube.size - 1 - layerIndex; }
            if (this.side === "EAST")   { return state.position.x === this.cube.size - 1 - layerIndex; }
            if (this.side === "WEST")   { return state.position.x === layerIndex; }
            if (this.side === "UP")     { return state.position.y === this.cube.size - 1 - layerIndex; }

            return state.position.y === layerIndex;

        };

        for (const piece of this.cube.state) {

            if (!inLayer(piece)) { continue; }
            for (const sticker of piece.stickers) {

                this.stickerTargetSide[sticker.id] = Cube.rotateSide(this.side, sticker.side, this.direction);

            }

        }

        for (const state of this.cube.state) {

            if (!inLayer(state)) {continue;}

            for (const sticker of state.stickers) {

                console.log(this.cube.state)

                StickerOrbitList.push({
                    position: {
                        x: state.position.x + sticker.positionOffset.x,
                        y: state.position.y + sticker.positionOffset.y,
                        z: state.position.z + sticker.positionOffset.z
                    },
                    rotation: {
                        pitch: state.rotation.pitch + THREE.MathUtils.degToRad(sticker.rotationOffset.pitch),
                        yaw: state.rotation.yaw + THREE.MathUtils.degToRad(sticker.rotationOffset.yaw),
                        roll: state.rotation.roll + THREE.MathUtils.degToRad(sticker.rotationOffset.roll)
                    },
                    id: sticker.id,
                    side: sticker.side
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

                case "SOUTH": { // Rotation Around the Z-Axis (Roll)

                    const TransformedData = this.orbitTransform( CurrentPosition.x, CurrentPosition.y, signedAngle, CurrentRotation.roll );

                    let UpdatedRotation: Rotation = {
                        pitch: 0,
                        yaw: 0,
                        roll: 0
                    };

                    if ( sticker.side === "SOUTH" ) {

                        UpdatedRotation = {
                            pitch: 0,
                            yaw: 0,
                            roll: TransformedData.rotation
                        };

                    } else if ( sticker.side === "UP" || sticker.side === "DOWN" ) {

                        UpdatedRotation = {
                            pitch: 90,
                            yaw: TransformedData.rotation,
                            roll: 0,
                        };

                    } else {

                        UpdatedRotation = {
                            pitch: 90,
                            yaw: TransformedData.rotation + 90,
                            roll: 0,
                        };

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

                    const TransformedData = this.orbitTransform( CurrentPosition.z, CurrentPosition.y, -signedAngle, CurrentRotation.pitch );

                    const UpdatedRotation: Rotation = {
                        pitch: -TransformedData.rotation,
                        yaw: CurrentRotation.yaw,
                        roll: CurrentRotation.roll
                    };

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

                case "NORTH": { // Rotation Around the Z-Axis (Roll)

                    const TransformedData = this.orbitTransform( CurrentPosition.x, CurrentPosition.y, -signedAngle, -CurrentRotation.roll );

                    let UpdatedRotation: Rotation = {
                        pitch: 0,
                        yaw: 0,
                        roll: 0
                    };

                    if ( sticker.side === "NORTH" ) {

                        UpdatedRotation = {
                            pitch: 0,
                            yaw: 0,
                            roll: TransformedData.rotation
                        };

                    } else if ( sticker.side === "UP" || sticker.side === "DOWN" ) {

                        UpdatedRotation = {
                            pitch: 90,
                            yaw: TransformedData.rotation,
                            roll: 0,
                        };

                    } else {

                        UpdatedRotation = {
                            pitch: 90,
                            yaw: TransformedData.rotation - 90,
                            roll: 0,
                        };

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

                    const TransformedData = this.orbitTransform( CurrentPosition.z, CurrentPosition.y, signedAngle, CurrentRotation.pitch );

                    const UpdatedRotation: Rotation = {
                        pitch: -TransformedData.rotation,
                        yaw: CurrentRotation.yaw,
                        roll: CurrentRotation.roll
                    };

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

                    const TransformedData = this.orbitTransform( CurrentPosition.x, CurrentPosition.z, signedAngle, CurrentRotation.yaw );

                    const UpdatedRotation = sticker.side === "UP"
                        ? {
                            pitch: -90,
                            yaw: 0,
                            roll: -TransformedData.rotation
                        }
                        : {
                            pitch: CurrentRotation.pitch,
                            yaw: -TransformedData.rotation,
                            roll: CurrentRotation.roll
                        };


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

                    const TransformedData = this.orbitTransform( CurrentPosition.z, CurrentPosition.x, signedAngle, CurrentRotation.yaw );

                    const UpdatedRotation = sticker.side === "DOWN"
                        ? {
                            pitch: 90,
                            yaw: 0,
                            roll: -TransformedData.rotation
                        }
                        : {
                            pitch: CurrentRotation.pitch,
                            yaw: TransformedData.rotation,
                            roll: CurrentRotation.roll
                        };


                    const UpdatedPosition: Position = {
                        x: TransformedData.y,
                        y: CurrentPosition.y,
                        z: TransformedData.x,
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

        x: number,
        y: number,
        alphaDeg: number,
        baseRotationDeg = 0,

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