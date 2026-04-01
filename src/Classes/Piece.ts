export class Piece {
    id: number | undefined;
    position: { x: number; y: number; z: number };
    rotation: { pitch: number; yaw: number; roll: number };

    constructor(id: number | undefined, x: number, y: number, z: number, pitch: number, yaw: number, roll: number ) {
        this.id = id;
        this.position = { x: x, y: y, z: z };
        this.rotation = { pitch: pitch, yaw: yaw, roll: roll };
    }
}