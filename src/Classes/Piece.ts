import type { Position } from "./Position";
import type { Rotation } from "./Rotation";

export class Piece {
    id: number | undefined;
    position: Position;
    rotation: Rotation;

    constructor(
        id: number,
        x: number,
        y: number,
        z: number,
        pitch: number,
        yaw: number,
        roll: number
    ) {
        this.id = id;
        this.position = { x, y, z };
        this.rotation = { pitch, yaw, roll };
    }
}