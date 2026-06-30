import type { Position } from "./HelperClasses/Position";
import type { Rotation } from "./HelperClasses/Rotation";

export type PieceState = {
    id: string;
    position: Position;
    rotation: Rotation;
}