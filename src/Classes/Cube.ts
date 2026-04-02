import { Piece } from './Piece';
import * as THREE from 'three';
import { rotateFlatMatrix90, rotateFlatMatrix90Counter} from '../Helper';

export class Cube {
    readonly size: number;
    state: Piece[];

    constructor( size: number ) {
        this.size = Math.round(size);
        this.state = [];

        for (let x = 0; x < this.size; x += 1) {

            for (let y = 0; y < this.size; y += 1) {

                for (let z = 0; z < this.size; z += 1) {

                    if (!(
                        (x === 0 || x === this.size - 1) ||
                        (y === 0 || y === this.size - 1) ||
                        (z === 0 || z === this.size - 1)
                    )) {
                        continue;
                    }

                    this.state.push(new Piece( undefined , x, y, z, 0, 0, 0));

                }
            }
        }
    }

    getPieceById(id: number): Piece | undefined {
        const state_len = this.state.length
        for (let i = 0; i < state_len; i += 1) {
            if (this.state[i].id === id) {
                return this.state[i];
            }
        }
        return undefined;
    }

    getPiecesByPosition(x?: number, y?: number, z?: number): Piece[] {
        return this.state.filter(piece => (
                (x === undefined || piece.position.x === x) &&
                (y === undefined || piece.position.y === y) &&
                (z === undefined || piece.position.z === z)
            )
        );
    }

    setRotation(id: number, pitch: number, yaw: number, roll: number): void {
        const piece = this.getPieceById(id);
        if (!piece) {
            return undefined;
        }
        piece.rotation = { pitch: THREE.MathUtils.degToRad(pitch), yaw: THREE.MathUtils.degToRad(yaw), roll: THREE.MathUtils.degToRad(roll) };
    }

    setTargetPosition(id: number, x: number, y: number, z: number): void {
        const piece = this.getPieceById(id);
        if (!piece) {
            return undefined;
        }
        piece.position = { x: x, y: y, z: z };
    }

    rotateFace(face: string, angle: "clockwise" | "counterclockwise", depth = 0): void {

        let PieceList: Piece[] = [];
        let RotationAxis: "pitch" | "yaw" | "roll" = undefined;
        let RotationAngleClock: 90 | -90 = undefined;
        let RotationAngleCounterClock: 90 | -90 = undefined;

        switch ( face ) {

            case "R": {
                PieceList = this.getPiecesByPosition(this.size - 1 - depth);
                RotationAxis = "pitch";
                RotationAngleClock = 90
                RotationAngleCounterClock = -90
                break;
            }

            case "L": {
                PieceList = this.getPiecesByPosition(depth);
                RotationAxis = "pitch";
                RotationAngleClock = -90
                RotationAngleCounterClock = 90
                break;
            }

            case "T": {
                PieceList = this.getPiecesByPosition(undefined, this.size - 1 - depth);
                RotationAxis = "yaw";
                RotationAngleClock = 90
                RotationAngleCounterClock = -90
                break;
            }

            case "D": {
                PieceList = this.getPiecesByPosition(undefined, depth);
                RotationAxis = "yaw";
                RotationAngleClock = -90
                RotationAngleCounterClock = 90
                break;
            }

            case "F": {
                PieceList = this.getPiecesByPosition(undefined, undefined, this.size - 1 - depth);
                RotationAxis = "roll";
                RotationAngleClock = 90
                RotationAngleCounterClock = -90
                break;
            }

            case "B": {
                PieceList = this.getPiecesByPosition(undefined, undefined, depth);
                RotationAxis = "roll";
                RotationAngleClock = -90
                RotationAngleCounterClock = 90
                break;
            }

            default: {
                return;
            }

        }

        switch (face) {

            case "F":
            case "B": {
                PieceList.sort((a, b) => {
                    if (a.position.y !== b.position.y) {
                        return b.position.y - a.position.y;
                    }
                    return a.position.x - b.position.x;
                });
                break;
            }

            case "R":
            case "L": {
                PieceList.sort((a, b) => {
                    if (a.position.y !== b.position.y) {
                        return b.position.y - a.position.y;
                    }
                    return a.position.z - b.position.z;
                });
                break;
            }

            case "T":
            case "D": {
                PieceList.sort((a, b) => {
                    if (a.position.z !== b.position.z) {
                        return b.position.z - a.position.z;
                    }
                    return a.position.x - b.position.x;
                });
                break;
            }

            default: {
                return;
            }

        }

        switch ( angle ) {

            case "clockwise": {
                const NewPositions = rotateFlatMatrix90(PieceList.map((piece) => piece.position));

                for (let i = 0; i < NewPositions.length; i += 1) {
                    this.setTargetPosition(
                        PieceList[i].id,
                        NewPositions[i].x,
                        NewPositions[i].y,
                        NewPositions[i].z);
                }

                for (const piece of PieceList) {
                    piece.rotation[RotationAxis] -= THREE.MathUtils.degToRad(RotationAngleClock);
                }

                break;
            }

            case "counterclockwise": {
                const NewPositions = rotateFlatMatrix90Counter(PieceList.map((piece) => piece.position));

                for (let i = 0; i < NewPositions.length; i += 1) {
                    this.setTargetPosition(PieceList[i].id, NewPositions[i].x, NewPositions[i].y, NewPositions[i].z);
                }

                for (const piece of PieceList) {
                    piece.rotation[RotationAxis] -= THREE.MathUtils.degToRad(RotationAngleCounterClock);
                }

                break;
            }

            default: {
                return;
            }

        }
    }
}