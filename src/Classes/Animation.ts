// oxlint-disable no-console
import type {Cube} from "./Cube";
import * as THREE from "three";

export class Animation {

    side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN";
    depth: number;
    angle: 90 | 180 | 270 | number;
    direction: "CLOCKWISE" | "COUNTERCLOCKWISE";
    duration: number;
    isFinished: boolean;
    size: number;

    constructor(
        side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN",
        depth: number,
        angle: 90 | 180 | 270 | number,
        direction: "CLOCKWISE" | "COUNTERCLOCKWISE",
        duration: number,
        size: number
    ) {
        this.side = side;
        this.depth = depth;
        this.angle = angle;
        this.direction = direction;
        this.duration = duration; // Will not be applied currently
        this.size = size
    }

    update(Cube: Cube, _delta: number): ({
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
            if (this.side === "NORTH") {return state.position.z === Cube.size - 1 - layerIndex;}
            if (this.side === "SOUTH") {return state.position.z === layerIndex;}
            if (this.side === "EAST") {return state.position.x === Cube.size - 1 - layerIndex;}
            if (this.side === "WEST") {return state.position.x === layerIndex;}
            if (this.side === "UP") {return state.position.y === Cube.size - 1 - layerIndex;}
            return state.position.y === layerIndex;
        };

        for (const state of Cube.state) {
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

        const signedAngle = this.direction === "CLOCKWISE" ? this.angle : -this.angle;

        return StickerOrbitList.map(sticker => {
            if (this.side === "NORTH" || this.side === "SOUTH") {
                const newPosition = this.orbitTransform(sticker.position.x, sticker.position.y, signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.yaw));
                return {
                    position: {x: newPosition.x, y: newPosition.y, z: sticker.position.z},
                    rotation: {pitch: sticker.rotation.pitch, yaw: newPosition.rotation, roll: sticker.rotation.roll},
                    id: sticker.id,
                    side: sticker.side
                };
            } else if (this.side === "EAST" || this.side === "WEST") {
                const newPosition = this.orbitTransform(sticker.position.y, sticker.position.z, signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.pitch));
                return {
                    position: {x: sticker.position.x, y: newPosition.x, z: newPosition.y},
                    rotation: {pitch: newPosition.rotation, yaw: sticker.rotation.yaw, roll: sticker.rotation.roll},
                    id: sticker.id,
                    side: sticker.side
                };
            }

            const newPosition = this.orbitTransform(sticker.position.x, sticker.position.z, signedAngle, THREE.MathUtils.radToDeg(sticker.rotation.yaw));
            return {
                position: {x: newPosition.x, y: sticker.position.y, z: newPosition.y},
                rotation: {pitch: sticker.rotation.pitch, yaw: newPosition.rotation, roll: sticker.rotation.roll},
                id: sticker.id,
                side: sticker.side
            };

        });
    }

    orbitTransform(x: number, y: number, alphaDeg: number, baseRotationDeg = 0): { x: number, y: number, rotation: number } {
        const alpha = alphaDeg * Math.PI / 180;

        if (alphaDeg === this.angle) {
            this.isFinished = true;
        }

        const mid = (this.size - 1) / 2;

        const relX = x - mid;
        const relY = y - mid;

        const xPrime = mid + relX * Math.cos(alpha) - relY * Math.sin(alpha);
        const yPrime = mid + relX * Math.sin(alpha) + relY * Math.cos(alpha);

        const rotation = baseRotationDeg - alphaDeg;

        if (x > this.size - 1 || x < 0 || y > this.size - 1 || y < 0) {
            console.error(`Invalid point (${x}, ${y}) for orbit transformation. Must be within the range [0, 3] for a 4x4 cube.`);
            return { x: 0, y: 0, rotation: baseRotationDeg };
        }

        return {
            x: Math.round(xPrime),
            y: Math.round(yPrime),
            rotation
        };
    }
}