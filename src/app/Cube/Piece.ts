import type {Mesh, Object3D} from "three";
import type {Rotation} from "./HelperClasses/Rotation";
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

    // clone(): Piece {
    //     const original = this.threeJSElement;
    //
    //     const clonedMesh = original.clone(true); // true = recursive children (safe default)
    //
    //     if ((original as Mesh).geometry) {
    //         (clonedMesh as Mesh).geometry = (original as Mesh).geometry.clone();
    //     }
    //
    //     const mat = (original as Mesh).material;
    //
    //     if (Array.isArray(mat)) {
    //         (clonedMesh as Mesh).material = mat.map(m => m.clone());
    //     } else if (mat) {
    //         (clonedMesh as Mesh).material = mat.clone();
    //     }
    //
    //     clonedMesh.uuid = crypto.randomUUID?.() ?? clonedMesh.uuid;
    //
    //     return new Piece(this.id, clonedMesh as Mesh);
    // }

}
