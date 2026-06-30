import type { Vector3 } from "three";
import { Quaternion, Timer } from "three";
import type { Piece } from "./Piece";

export class Animation {

    private readonly startState: Piece[];
    private duration: number;
    private firstRun = true
    isFinished = false;
    private timer: Timer
    private readonly axisVec: Vector3;
    private readonly angle: number;
    private readonly Pivot: Vector3;
    private currentAngle = 0

    constructor(

        startState: Piece[],
        axisVec: Vector3,
        angle: number,
        pivot: Vector3,
        duration: number,

    ) {

        this.startState = startState;
        this.axisVec = axisVec;
        this.angle = angle;
        this.Pivot = pivot;
        this.duration = duration;

    }

    update(): void {

        if (this.firstRun) {

            this.timer = new Timer();
            this.timer.connect( document );
            this.firstRun = false;

        }

        if ( Math.round(this.currentAngle * 10_000_000) / 10_000_000 === Math.round(this.angle * 10_000_000) / 10_000_000 ) {

            this.isFinished = true;

            for ( const piece of this.startState ) {

                piece.setPosition({
                    x: Math.round( piece.getThreeJSElement().position.x ),
                    y: Math.round( piece.getThreeJSElement().position.y ),
                    z: Math.round( piece.getThreeJSElement().position.z )
                });

            }

            return;

        }

        for (const piece of this.startState) {

            const mesh = piece.getThreeJSElement();

            mesh.position.sub(this.Pivot);

            mesh.position.applyAxisAngle( this.axisVec, this.angle / (5 * 60) );

            mesh.position.add(this.Pivot);

            mesh.quaternion.premultiply(
                new Quaternion().setFromAxisAngle( this.axisVec, this.angle / (5 * 60) )
            );

        }

        this.currentAngle += this.angle / (5 * 60);

    }

}
