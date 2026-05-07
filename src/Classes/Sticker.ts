import type {Position} from "./Position";
import type {Side} from "./Side";

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

    setSide( Side: Side, AnimationSide?: Side ): void {
        this.side = Side;

        if (AnimationSide) {
            this.updatePositionOffset(Side, AnimationSide);
        } else {
            this.updatePositionOffset(Side);
        }

    }

    updatePositionOffset( Side: Side, AnimationSide?: Side ): void {
        if (AnimationSide) {
            switch (AnimationSide) {
                case "NORTH": {
                    this.positionOffset = { x: 0, y: -0.5, z: 0 };
                    break;
                }
                case "EAST": {
                    this.positionOffset = { x: 0.5, y: 0, z: 0 };
                    break;
                }
                case "WEST": {
                    this.positionOffset = { x: 0, y: 0, z: 0 };
                    break;
                }
                case "SOUTH": {
                    this.positionOffset = { x: 0, y: 0.5, z: 0 };
                    break;
                }
                case "UP": {
                    this.positionOffset = { x: 0, y: 0, z: 0.5 };
                    break;
                }
                case "DOWN": {
                    this.positionOffset = { x: 0, y: 0, z: -0.5 };
                    break;
                }
                default: {
                    break;
                }
            }
        } else {
            switch (Side) {
                case "NORTH": {
                    this.positionOffset = { x: 0, y: -0.5, z: 0 };
                    break;
                }
                case "EAST": {
                    this.positionOffset = { x: 0.5, y: 0, z: 0 };
                    break;
                }
                case "WEST": {
                    this.positionOffset = { x: 0, y: 0, z: 0 };
                    break;
                }
                case "SOUTH": {
                    this.positionOffset = { x: 0, y: 0.5, z: 0 };
                    break;
                }
                case "UP": {
                    this.positionOffset = { x: 0, y: 0, z: 0.5 };
                    break;
                }
                case "DOWN": {
                    this.positionOffset = { x: 0, y: 0, z: -0.5 };
                    break;
                }
                default: {
                    break;
                }
            }
        }

    }


}