import type {Mesh, Object3D} from "three";
import type {Position} from "./HelperClasses/Position";

export class Piece {
    private readonly id: number;
    private readonly threeJSElement: Mesh;

    constructor(id: number, threeJSElement: Mesh) {
        this.id = id;
        this.threeJSElement = threeJSElement;
    }

    getPosition(): Position {
        return this.threeJSElement.position
    }

    setPosition(position: Position): void {
        this.threeJSElement.position.set(position.x, position.y, position.z);
    }
    getThreeJSElement(): Object3D {
        return this.threeJSElement;
    }

}
