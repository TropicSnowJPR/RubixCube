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
        side: Side

    ) {

        this.id = id;
        this.color = color
        this.side = side;

    }

}