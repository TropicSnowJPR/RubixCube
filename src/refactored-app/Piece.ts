import {MathUtils, Mesh, Quaternion, Vector3} from "three";
import {Rotation} from "./Rotation";
import {Position} from "./Position";

export class Piece {
    private id: number;
    private threeJSElement: Mesh;

    constructor(
        id: number,
        threeJSElement: Mesh,

    ) {
        this.id = id;
        this.threeJSElement = threeJSElement;

    }

    setPitchRotation(rotation: number) {
        const axis = new Vector3(1, 0, 0); // NORTH
        const q = new Quaternion().setFromAxisAngle(axis, rotation);

        this.threeJSElement.quaternion.multiply(q);
    }

    setYawRotation(rotation: number) {
        const axis = new Vector3(0, 1, 0); // NORTH
        const q = new Quaternion().setFromAxisAngle(axis, rotation);

        this.threeJSElement.quaternion.multiply(q);
    }

    setRollRotation(rotation: number) {
        const axis = new Vector3(0, 0, 1); // NORTH
        const q = new Quaternion().setFromAxisAngle(axis, rotation);

        this.threeJSElement.quaternion.multiply(q);
    }

    setRotation( pitch: number, yaw: number, roll: number ): void {
        this.threeJSElement.rotation.set(
            pitch,
            yaw,
            roll
        );
    }

    setXPosition( x: number ): void {
        this.threeJSElement.position.x = x;
    }

    setYPosition( y: number ): void {
        this.threeJSElement.position.y = y;
    }

    setZPosition( z: number ): void {
        this.threeJSElement.position.z = z;
    }

    setPosition( x: number, y: number, z: number ): void {
        this.threeJSElement.position.set(
            x,
            y,
            z
        );
    }

    getPosition(): Position {
        return this.threeJSElement.position;
    }

    getRotation(): Rotation {
        return {
            pitch: this.threeJSElement.rotation.x,
            yaw: this.threeJSElement.rotation.y,
            roll: this.threeJSElement.rotation.z
        };
    }

    getThreeJSElement() {
        return this.threeJSElement;
    }
}