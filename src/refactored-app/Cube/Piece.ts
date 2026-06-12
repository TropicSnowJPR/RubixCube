import type { Mesh, Object3D } from "three";
import type { Rotation } from "./HelperClasses/Rotation";
import type { Position } from "./HelperClasses/Position";

export class Piece {
    private id: number;
    private Position: Position;
    private Rotation: Rotation;
    private readonly threeJSElement: Mesh;

    constructor(id: number, threeJSElement: Mesh) {
        this.id = id;
        this.threeJSElement = threeJSElement;
    }

    setPosition(x: number, y: number, z: number): void {
        this.threeJSElement.position.set(x, y, z);
    }

    getPosition(): Position {
        return this.threeJSElement.position;
    }

    getThreeJSElement(): Object3D {
        return this.threeJSElement;
    }
}
