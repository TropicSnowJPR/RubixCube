import type {Vector3} from "three";
import {Quaternion, Timer} from "three";
import type {Piece} from "./Piece";
import {Cube} from "./Cube";
import {radToDeg} from "three/src/math/MathUtils";

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
    private depth: number;
    private face: "NORTH" | "SOUTH" | "EAST" | "WEST" | "UP" | "DOWN";
    private cubesize: number;

    constructor(cubesize: number, depth: number, face: "NORTH" | "SOUTH" | "EAST" | "WEST" | "UP" | "DOWN", startState: Piece[], axisVec: Vector3, angle: number, pivot: Vector3, duration: number,) {

        this.depth = depth;
        this.face = face
        this.startState = startState;
        this.axisVec = axisVec;
        this.angle = angle;
        this.Pivot = pivot;
        this.duration = duration;
        this.cubesize = cubesize;

    }

    update(): void {

        if (this.firstRun) {

            this.timer = new Timer();
            this.timer.connect( document );
            this.firstRun = false;

        }

        if ( radToDeg(this.currentAngle) === radToDeg(this.angle) || radToDeg(this.currentAngle) > radToDeg(this.angle)) {

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

        let trueAngle

        if (this.duration > 0.1) {
            trueAngle = this.angle / (this.duration * 60)
        } else {
            trueAngle = Math.PI / 2
        }



        for (const piece of Cube.getLayer(this.face, this.depth, this.cubesize, this.startState)) {

            const mesh = piece.getThreeJSElement();

            mesh.position.sub(this.Pivot);

            mesh.position.applyAxisAngle( this.axisVec, trueAngle );

            mesh.position.add(this.Pivot);

            mesh.quaternion.premultiply(
                new Quaternion().setFromAxisAngle( this.axisVec, trueAngle )
            );

        }

        this.currentAngle += trueAngle;

    }

}
