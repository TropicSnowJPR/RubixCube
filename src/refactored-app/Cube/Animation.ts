import type { Quaternion } from "three";
import { Timer } from "three";
import type { Piece } from "./Piece";

export class Animation {
    private id: number;
    readonly startState: Piece[];
    readonly currentState: Piece[];
    readonly goalState: Piece[];
    private readonly quaternion: Quaternion;
    private readonly duration: number;
    private lastDelta: number;
    firstRun = true
    isFinished = false;
    private timer: Timer

    constructor(
        id: number,
        startState: Piece[],
        goalState: Piece[],
        quaternion: Quaternion,
        duration: number,
    ) {
        this.id = id;
        this.startState = startState;
        this.goalState = goalState;
        this.quaternion = quaternion;
        this.duration = duration;
    }

    update(): void {
        if (this.firstRun) {
            this.timer = new Timer();
            this.timer.connect( document );
            this.firstRun = false;
        }
        if (this.currentState === this.goalState) {
            this.isFinished = true;
            return;
        }
        for (const piece of this.startState) {
            const goalPiece = this.goalState.find((p) => p.getThreeJSElement().uuid === piece.getThreeJSElement().uuid,);
            if (goalPiece) {
                goalPiece.getThreeJSElement().quaternion.slerp(this.quaternion, ( this.duration - this.timer.getElapsed() ) );
            }

            // this.threeJSElement.quaternion.slerp(this.quaternion, this.duration);
        }
    }
}
