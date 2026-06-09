import type {Position} from "./Position";
import type {Side} from "./Side";
import type {Rotation} from "./Rotation";
import type {Color} from "./Color";

export class Sticker {

    id: number;
    color: Color;
    side: Side;
    positionOffset: Position;
    rotationOffset: Rotation;

    constructor(

        id: number,
        color: Color,
        side: Side,
        positionOffset?: Position | undefined,
        rotationOffset?: Rotation | undefined

    ) {

        this.id = id;
        this.color = color
        this.side = side;

        this.positionOffset = positionOffset ? positionOffset : { x: 0, y: 0, z: 0 }

        this.rotationOffset = rotationOffset ? rotationOffset : { pitch: 0, yaw: 0, roll: 0 }


    }

}