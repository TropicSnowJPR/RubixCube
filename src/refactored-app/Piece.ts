import type { Position } from "./Position";
import type { Rotation } from "./Rotation";
import type { Mesh } from "three";

export interface Piece {
    id: number;
    threeJSElement: Mesh;
    relPosition: Position;
    relRotation: Rotation;
}