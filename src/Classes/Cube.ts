import { Piece } from './Piece';
import * as THREE from 'three';
import { rotate90Clockwise, rotate90CounterClockwise } from '../Helper';

export class Cube {
    readonly size: number;
    state: Piece[];

    constructor( size: number ) {
        this.size = size
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
        if ( x === undefined && y === undefined && z === undefined ) {
            return [];
        }

        const pieces: Piece[] = [];
        const state_len = this.state.length
        for (let i = 0; i < state_len; i += 1) {
            if ( ( x && y && z ) && this.state[i].position.x === x && this.state[i].position.y === y && this.state[i].position.z === z) {
                pieces.push(this.state[i]);
            } else if ( ( x && y && !z ) && this.state[i].position.x === x && this.state[i].position.y === y ) {
                pieces.push(this.state[i]);
            } else if ( ( x && !y && z ) && this.state[i].position.x === x && this.state[i].position.z === z ) {
                pieces.push(this.state[i]);
            } else if ( ( !x && y && z ) && this.state[i].position.y === y && this.state[i].position.z === z ) {
                pieces.push(this.state[i]);
            } else if ( ( x && !y && !z ) && this.state[i].position.x === x ) {
                pieces.push(this.state[i]);
            } else if ( ( !x && y && !z ) && this.state[i].position.y === y ) {
                pieces.push(this.state[i]);
            } else if ( ( !x && !y && z ) && this.state[i].position.z === z ) {
                pieces.push(this.state[i]);
            }
        }
        return pieces;
    }

    getRotationById(id: number): { pitch: number; yaw: number; roll: number } {
        const piece = this.getPieceById(id);
        if (!piece) {
            return undefined;
        }
        return piece.rotation;
    }

    getRotationByPosition(x: number, y: number, z: number): { pitch: number; yaw: number; roll: number } {
        const pieces = this.getPiecesByPosition(x, y, z);
        if (!pieces) {
            return undefined;
        }
        if (pieces.length > 0) {
            return { pitch: THREE.MathUtils.radToDeg( pieces[0].rotation.pitch), yaw: THREE.MathUtils.radToDeg(pieces[0].rotation.yaw), roll: THREE.MathUtils.radToDeg(pieces[0].rotation.roll) };
        }
        return { pitch: 0, yaw: 0, roll: 0 };
    }

    setRotation(id: number, pitch: number, yaw: number, roll: number): void {
        const piece = this.getPieceById(id);
        if (!piece) {
            return undefined;
        }
        piece.rotation = { pitch: THREE.MathUtils.degToRad(pitch), yaw: THREE.MathUtils.degToRad(yaw), roll: THREE.MathUtils.degToRad(roll) };
    }

    setPosition(id: number, x: number, y: number, z: number): void {
        const piece = this.getPieceById(id);
        if (!piece) {
            return undefined;
        }
        piece.position = { x: x, y: y, z: z };
    }

    rotateFace(face: string, depth: number, angle: "clockwise" | "counterclockwise"): void {
        switch (face) {
            case "R": {

                for (const piece of this.getPiecesByPosition(this.size - 1)) {
                    if (angle === "clockwise") {
                        piece.rotation.pitch -= THREE.MathUtils.degToRad(90);

                    } else if (angle === "counterclockwise") {
                        piece.rotation.pitch += THREE.MathUtils.degToRad(90);

                    }
                }



                break;
            }
            case "L": {
                for (const piece of this.getPiecesByPosition(0)) {
                    if (angle === "clockwise") {
                        piece.rotation.pitch -= THREE.MathUtils.degToRad(90);

                        const newPositions: { id: number; x: number; y: number; z: number }[] = rotate90CounterClockwise(this.getPiecesByPosition(this.size - 1).map(piece => ({ id: piece.id, x: piece.position.x, y: piece.position.y, z: piece.position.z })));

                        for (const newPosition of newPositions) {
                            this.setPosition(newPosition.id, newPosition.x, newPosition.y, newPosition.z);
                        }

                    } else if (angle === "counterclockwise") {
                        piece.rotation.pitch += THREE.MathUtils.degToRad(90);

                        const newPositions: { id: number; x: number; y: number; z: number }[] = rotate90Clockwise(this.getPiecesByPosition(this.size - 1).map(piece => ({ id: piece.id, x: piece.position.x, y: piece.position.y, z: piece.position.z })));

                        for (const newPosition of newPositions) {
                            this.setPosition(newPosition.id, newPosition.x, newPosition.y, newPosition.z);
                        }
                    }
                }
                break;
            }
            case "T": {
                for (const piece of this.getPiecesByPosition(undefined, this.size - 1)) {
                    if (angle === "clockwise") {
                        piece.rotation.yaw -= THREE.MathUtils.degToRad(90);

                        const newPositions: { id: number; x: number; y: number; z: number }[] = rotate90CounterClockwise(this.getPiecesByPosition(this.size - 1).map(piece => ({ id: piece.id, x: piece.position.x, y: piece.position.y, z: piece.position.z })));

                        for (const newPosition of newPositions) {
                            this.setPosition(newPosition.id, newPosition.x, newPosition.y, newPosition.z);
                        }

                    } else if (angle === "counterclockwise") {
                        piece.rotation.yaw += THREE.MathUtils.degToRad(90);

                        const newPositions: { id: number; x: number; y: number; z: number }[] = rotate90Clockwise(this.getPiecesByPosition(this.size - 1).map(piece => ({ id: piece.id, x: piece.position.x, y: piece.position.y, z: piece.position.z })));

                        for (const newPosition of newPositions) {
                            this.setPosition(newPosition.id, newPosition.x, newPosition.y, newPosition.z);
                        }
                    }
                }
                break;
            }
            case "D": {
                for (const piece of this.getPiecesByPosition(undefined, 0)) {
                    if (angle === "clockwise") {
                        piece.rotation.yaw -= THREE.MathUtils.degToRad(90);

                        const newPositions: { id: number; x: number; y: number; z: number }[] = rotate90CounterClockwise(this.getPiecesByPosition(this.size - 1).map(piece => ({ id: piece.id, x: piece.position.x, y: piece.position.y, z: piece.position.z })));

                        for (const newPosition of newPositions) {
                            this.setPosition(newPosition.id, newPosition.x, newPosition.y, newPosition.z);
                        }

                    } else if (angle === "counterclockwise") {
                        piece.rotation.yaw += THREE.MathUtils.degToRad(90);

                        const newPositions: { id: number; x: number; y: number; z: number }[] = rotate90Clockwise(this.getPiecesByPosition(this.size - 1).map(piece => ({ id: piece.id, x: piece.position.x, y: piece.position.y, z: piece.position.z })));

                        for (const newPosition of newPositions) {
                            this.setPosition(newPosition.id, newPosition.x, newPosition.y, newPosition.z);
                        }
                    }
                }
                break;
            }
            case "F": {
                for (const piece of this.getPiecesByPosition(undefined, undefined, this.size - 1)) {
                    if (angle === "clockwise") {
                        piece.rotation.roll -= THREE.MathUtils.degToRad(90);

                        const newPositions: { id: number; x: number; y: number; z: number }[] = rotate90CounterClockwise(this.getPiecesByPosition(this.size - 1).map(piece => ({ id: piece.id, x: piece.position.x, y: piece.position.y, z: piece.position.z })));

                        for (const newPosition of newPositions) {
                            this.setPosition(newPosition.id, newPosition.x, newPosition.y, newPosition.z);
                        }

                    } else if (angle === "counterclockwise") {
                        piece.rotation.roll += THREE.MathUtils.degToRad(90);

                        const newPositions: { id: number; x: number; y: number; z: number }[] = rotate90Clockwise(this.getPiecesByPosition(this.size - 1).map(piece => ({ id: piece.id, x: piece.position.x, y: piece.position.y, z: piece.position.z })));

                        for (const newPosition of newPositions) {
                            this.setPosition(newPosition.id, newPosition.x, newPosition.y, newPosition.z);
                        }
                    }
                }
                break;
            }
            case "B": {
                for (const piece of this.getPiecesByPosition(undefined, undefined, 0)) {
                    if (angle === "clockwise") {
                        piece.rotation.roll -= THREE.MathUtils.degToRad(90);

                        const newPositions: { id: number; x: number; y: number; z: number }[] = rotate90CounterClockwise(this.getPiecesByPosition(this.size - 1).map(piece => ({ id: piece.id, x: piece.position.x, y: piece.position.y, z: piece.position.z })));

                        for (const newPosition of newPositions) {
                            this.setPosition(newPosition.id, newPosition.x, newPosition.y, newPosition.z);
                        }

                    } else if (angle === "counterclockwise") {
                        piece.rotation.roll += THREE.MathUtils.degToRad(90);

                        const newPositions: { id: number; x: number; y: number; z: number }[] = rotate90Clockwise(this.getPiecesByPosition(this.size - 1).map(piece => ({ id: piece.id, x: piece.position.x, y: piece.position.y, z: piece.position.z })));

                        for (const newPosition of newPositions) {
                            this.setPosition(newPosition.id, newPosition.x, newPosition.y, newPosition.z);
                        }
                    }
                }
                break;
            }
            default: {
                break;
            }
        }
    }
}