import type {Vector3} from "three";
import {Quaternion} from "three";
import type {Piece} from "./Piece";
import {Cube} from "./Cube";
import {radToDeg} from "three/src/math/MathUtils";

export class Animation {

    private readonly startState: Piece[];
    private duration: number;
    isFinished = false;
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

    update(fps = 60): void {

        if ( ( radToDeg(this.currentAngle) > radToDeg(this.angle) - 0.001 && radToDeg(this.currentAngle) < radToDeg(this.angle) + 0.001 ) || radToDeg(Math.abs(this.currentAngle)) > radToDeg(Math.abs(this.angle))) {

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



        let trueAngle = this.angle / (this.duration * fps) // <-- Make this live frame based
        if ( Math.abs(this.currentAngle) === 0 && Math.abs(trueAngle) > Math.abs(this.angle) ) {
            trueAngle = this.angle
        } else if ( Math.abs(this.currentAngle) > 0 && Math.abs(trueAngle) + Math.abs(this.currentAngle) > Math.abs(this.angle) ) {
            trueAngle = this.angle - this.currentAngle;
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
