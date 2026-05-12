import type { Position } from "./Position";
import type { Rotation } from "./Rotation";
import type { Sticker } from "./Sticker";

export class Piece {

    public readonly position: Position;
    public readonly rotation: Rotation;
    public readonly type: "CORNER" | "EDGE" | "CENTER" | "CORE";
    public readonly stickers: Sticker[];
    public readonly id: number;

    constructor(
        id: number,
        x: number,
        y: number,
        z: number,
        pitch: number,
        yaw: number,
        roll: number,
        type: "CORNER" | "EDGE" | "CENTER" | "CORE",
        stickers: Sticker[],
    ) {
        this.position = { x, y, z };
        this.rotation = { pitch, yaw, roll };
        this.type = type
        this.stickers = stickers;
        this.id = id
    }

}