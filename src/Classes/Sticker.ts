import type {Position} from "./Position";

export class Sticker {
    id: number;
    side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN";
    positionOffset: Position;

    constructor(
        id: number,
        side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN"
    ) {
        this.id = id;
        this.side = side;

        this.updatePositionOffset(side);
    }

    setSide(side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN"): void {
        this.side = side;

        this.updatePositionOffset(side);
    }

    updatePositionOffset(side: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN"): void {
        switch (side) {
            case "NORTH": {
                this.positionOffset = { x: 0, y: 0, z: 0.5 };
                break;
            }
            case "EAST": {
                this.positionOffset = { x: 0.5, y: 0, z: 0 };
                break;
            }
            case "WEST": {
                this.positionOffset = { x: -0.5, y: 0, z: 0 };
                break;
            }
            case "SOUTH": {
                this.positionOffset = { x: 0, y: 0, z: -0.5 };
                break;
            }
            case "UP": {
                this.positionOffset = { x: 0, y: 0.5, z: 0 };
                break;
            }
            case "DOWN": {
                this.positionOffset = { x: 0, y: -0.5, z: 0 };
                break;
            }
            default: {
                break;
            }
        }
    }


}