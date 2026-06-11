import {MathUtils, Mesh, Quaternion, Vector3} from "three";
import {Rotation} from "./Rotation";
import {Position} from "./Position";

export class Piece {
    private id: number;
    private threeJSElement: Mesh;

    constructor(
        id: number,
        threeJSElement: Mesh,

    ) {
        this.id = id;
        this.threeJSElement = threeJSElement;

    }

    setPosition( x: number, y: number, z: number ): void {
        this.threeJSElement.position.set(
            x,
            y,
            z
        );
    }

    getPosition(): Position {
        return this.threeJSElement.position;
    }

    getThreeJSElement() {
        return this.threeJSElement;
    }
}