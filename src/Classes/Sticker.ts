import type {Position} from "./Position";
import type {Side} from "./Side";
import type {Rotation} from "./Rotation";



export class Sticker {

    id: number;
    side: Side;
    positionOffset: Position;
    rotationOffset: Rotation;

    constructor(

        id: number,
        side: Side

    ) {

        this.id = id;
        this.side = side;

        this.updatePositionRotationOffset( side );

    }

    setSide( Side: Side): void {

        this.side = Side;
        this.updatePositionRotationOffset( Side );

    }

    updatePositionRotationOffset( Side: Side ): void {

        switch (Side) {

            case "NORTH": {

                this.positionOffset = { x: 0, y: 0, z: 0.5 };
                this.rotationOffset = { pitch: 0, yaw: 0, roll: 0 };

                break;

            }

            case "EAST": {

                this.positionOffset = { x: 0.5, y: 0, z: 0 };
                this.rotationOffset = { pitch: 0, yaw: 90, roll: 0 };

                break;

            }

            case "WEST": {

                this.positionOffset = { x: -0.5, y: 0, z: 0 };
                this.rotationOffset = { pitch: 0, yaw: -90, roll: 0 };

                break;

            }

            case "SOUTH": {

                this.positionOffset = { x: 0, y: 0, z: -0.5 };
                this.rotationOffset = { pitch: 0, yaw: 180, roll: 0 };

                break;

            }

            case "UP": {

                this.positionOffset = { x: 0, y: 0.5, z: 0 };
                this.rotationOffset = { pitch: -90, yaw: 0, roll: 0 };

                break;

            }

            case "DOWN": {

                this.positionOffset = { x: 0, y: -0.5, z: 0 };
                this.rotationOffset = { pitch: 90, yaw: 0, roll: 0 };

                break;

            }

            default: {

                break;

            }

        }

    }

}