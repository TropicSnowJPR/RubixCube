import type {Position} from "./HelperClasses/Position";
import type {Rotation} from "./HelperClasses/Rotation";

export interface PieceState {
    id: string;
    position: Position;
    rotation: Rotation;
}