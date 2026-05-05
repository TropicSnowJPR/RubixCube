import type { Position } from "./Position";
import type { Rotation } from "./Rotation";

export class Piece {

    public readonly position: Position;
    public readonly rotation: Rotation;
    public readonly type: "CORNER" | "EDGE" | "CENTER" | "CORE";
    public readonly stickers: { id: number; side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN"; color: string }[];

    constructor(
        x: number,
        y: number,
        z: number,
        pitch: number,
        yaw: number,
        roll: number,
        type: "CORNER" | "EDGE" | "CENTER" | "CORE",
        stickers: { id: number; side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN"; color: string }[]
    ) {
        this.position = { x, y, z };
        this.rotation = { pitch, yaw, roll };
        this.type = type
        this.stickers = stickers;
    }

}