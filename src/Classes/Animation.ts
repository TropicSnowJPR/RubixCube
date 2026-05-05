import type {Cube} from "./Cube";
import type {Position} from "./Position";
import {RubixCube} from "../old/RubixCube";
import * as THREE from "three";

export class Animation {

    side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN";
    depth: number;
    angle: 90 | 180 | 270 | number;
    direction: "CLOCKWISE" | "COUNTERCLOCKWISE";
    duration: number;
    private position: Position;
    isFinished: boolean;
    private globalCenter: { x: number; y: number };

    constructor(
        side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN",
        depth: number,
        angle: 90 | 180 | 270 | number,
        direction: "CLOCKWISE" | "COUNTERCLOCKWISE",
        duration: number
    ) {
        this.side = side;
        this.depth = depth;
        this.angle = angle;
        this.direction = direction;
        this.duration = duration; // Will not be applied currently
        this.globalCenter = { x: 0, y: 0 };
    }

    update(Cube: Cube, delta: number): ({
        position: { x: number; y: number; z: number };
        rotation: { pitch: number; yaw: number; roll: number };
        id: number
        side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN"
    })[] {
        const StickerOrbitList = []
        console.log("Cube.state", Cube.state);
        console.log("this.side", this.side);
        for (const state of Cube.state) {
            for(const sticker of state.stickers) {
                if (
                    this.side === "NORTH" && (
                        sticker.side === "NORTH" ||
                        (sticker.side === "EAST" && state.position.z === Cube.size - 1) ||
                        (sticker.side === "WEST" && state.position.z === Cube.size - 1) ||
                        (sticker.side === "UP" && state.position.z === Cube.size - 1) ||
                        (sticker.side === "DOWN" && state.position.z === Cube.size - 1)
                    )
                )
                {
                    StickerOrbitList.push({ position: { x: state.position.x, y: state.position.y }, rotation: state.rotation, id: sticker.id });
                } else if (
                    this.side === "EAST" && (
                        sticker.side === "EAST" ||
                        (sticker.side === "UP" && state.position.x === Cube.size - 1) ||
                        (sticker.side === "DOWN" && state.position.x === Cube.size - 1) ||
                        (sticker.side === "SOUTH" && state.position.x === Cube.size - 1) ||
                        (sticker.side === "NORTH" && state.position.x === Cube.size - 1)
                    )
                )
                {
                    StickerOrbitList.push({ position: state.position, rotation: state.rotation, id: sticker.id });
                } else if (
                    this.side === "WEST" && (
                        sticker.side === "WEST" ||
                        (sticker.side === "UP" && state.position.x === 0) ||
                        (sticker.side === "DOWN" && state.position.x === 0) ||
                        (sticker.side === "SOUTH" && state.position.x === 0) ||
                        (sticker.side === "NORTH" && state.position.x === 0)
                    )
                )
                {
                    StickerOrbitList.push({ position: state.position, rotation: state.rotation, id: sticker.id });
                } else if (
                    this.side === "SOUTH" && (
                        sticker.side === "SOUTH" ||
                        (sticker.side === "EAST" && state.position.z === 0) ||
                        (sticker.side === "WEST" && state.position.z === 0) ||
                        (sticker.side === "UP" && state.position.z === 0) ||
                        (sticker.side === "DOWN" && state.position.z === 0)
                    )
                )
                {
                    StickerOrbitList.push({ position: state.position, rotation: state.rotation, id: sticker.id });
                } else if (
                    this.side === "UP" && (
                        sticker.side === "UP" ||
                        (sticker.side === "EAST" && state.position.y === Cube.size - 1) ||
                        (sticker.side === "WEST" && state.position.y === Cube.size - 1) ||
                        (sticker.side === "SOUTH" && state.position.y === Cube.size - 1) ||
                        (sticker.side === "NORTH" && state.position.y === Cube.size - 1)
                    )
                )
                {
                    StickerOrbitList.push({ position: state.position, rotation: state.rotation, id: sticker.id });
                } else if (
                    this.side === "DOWN" && (
                        sticker.side === "DOWN" ||
                        (sticker.side === "EAST" && state.position.y === 0) ||
                        (sticker.side === "WEST" && state.position.y === 0) ||
                        (sticker.side === "SOUTH" && state.position.y === 0) ||
                        (sticker.side === "NORTH" && state.position.y === 0)
                    )
                )
                {
                    StickerOrbitList.push({ position: state.position, rotation: state.rotation, id: sticker.id });
                } else {
                    //StickerOrbitList.push({ position: state.position, rotation: state.rotation, id: sticker.id });
                    //console.error(`Invalid sticker side ${sticker.side} on piece at position (${state.position.x}, ${state.position.y}, ${state.position.z}) for animation on side ${this.side}`);
                    break
                }
                //console.log("No match for sticker", sticker, "on piece", state);
            }
        }

        // console.log("StickerOrbitList", StickerOrbitList);

        const UpdatedStickerOrbitList = StickerOrbitList.map(sticker => {
            if (this.side === "NORTH" || this.side === "SOUTH") {
                const newPosition = this.orbitTransform(sticker.position.x, sticker.position.y, this.angle, THREE.MathUtils.radToDeg(sticker.rotation.yaw));
                return {
                    position: { x: newPosition.x, y: newPosition.y, z: sticker.position.z },
                    rotation: { pitch: sticker.rotation.pitch, yaw: newPosition.rotation, roll: sticker.rotation.yaw },
                    id: sticker.id,
                    side: sticker.side
                }
            } else if (this.side === "EAST" || this.side === "WEST") {
                const newPosition = this.orbitTransform(sticker.position.x, sticker.position.y, this.angle, THREE.MathUtils.radToDeg(sticker.rotation.pitch));
                return {
                    position: { x: sticker.position.x, y: newPosition.y, z: newPosition.x },
                    rotation: { pitch: newPosition.rotation, yaw: sticker.rotation.pitch, roll: sticker.rotation.roll },
                    id: sticker.id,
                    side: sticker.side
                }
            } else if (this.side === "UP" || this.side === "DOWN") {
                const newPosition = this.orbitTransform(sticker.position.x, sticker.position.y, this.angle, THREE.MathUtils.radToDeg(sticker.rotation.yaw));
                return {
                    position: { x: newPosition.x, y: sticker.position.y, z: newPosition.y },
                    rotation: { pitch: sticker.rotation.pitch, yaw: newPosition.rotation, roll: sticker.rotation.roll },
                    id: sticker.id,
                    side: sticker.side
                }
            }
            throw new Error("StickerOrbitList");
        });

        // console.log("UpdatedStickerOrbitList", UpdatedStickerOrbitList);


        return UpdatedStickerOrbitList

    }

    orbitTransform(x: number, y: number, alphaDeg, baseRotationDeg = 0): { x: number, y: number, rotation: number }  {

        console.log(`Orbiting point (${x}, ${y}) by ${alphaDeg} degrees around center (${this.globalCenter.x}, ${this.globalCenter.y}) with base rotation ${baseRotationDeg} degrees`);

        const alpha = alphaDeg * Math.PI / 180;

        if (baseRotationDeg === this.angle) {
            this.isFinished = true;
        }

        const dx = x - this.globalCenter.x;
        const dy = y - this.globalCenter.y;

        const xPrime = this.globalCenter.x + dx * Math.cos(alpha) - dy * Math.sin(alpha);
        const yPrime = this.globalCenter.y + dx * Math.sin(alpha) + dy * Math.cos(alpha);

        const rotation = baseRotationDeg - alphaDeg;

        return {
            x: xPrime,
            y: yPrime,
            rotation
        };
    }
}