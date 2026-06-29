import { Piece } from "./Piece";
import { AnimationQueue } from "./AnimationQueue";
import { Animation } from "./Animation";
import type { Texture } from "three";
import {
    TextureLoader,
    MeshStandardMaterial,
    BoxGeometry,
    Mesh,
    SRGBColorSpace,
    Vector3,
    Quaternion
} from "three";

export class Cube {
    private readonly Size: number;
    private Pieces: Piece[] = [];

    private readonly TextureLoader = new TextureLoader();
    private readonly Textures: Texture[] = [
        this.TextureLoader.load("../textures/orange.png"),
        this.TextureLoader.load("../textures/red.png"),
        this.TextureLoader.load("../textures/yellow.png"),
        this.TextureLoader.load("../textures/white.png"),
        this.TextureLoader.load("../textures/green.png"),
        this.TextureLoader.load("../textures/blue.png"),
    ];
    private readonly Materials: MeshStandardMaterial[] = this.Textures.map(
        (texture) =>
            new MeshStandardMaterial({
                map: texture,
            }),
    );
    private readonly Geometry: BoxGeometry = new BoxGeometry(1, 1, 1);
    private readonly ThreeJSPieceElement: Mesh = new Mesh(
        this.Geometry,
        this.Materials,
    );

    readonly AnimationQueue = new AnimationQueue();

    private readonly AXIS = {
        X: new Vector3(1, 0, 0),
        Y: new Vector3(0, 1, 0),
        Z: new Vector3(0, 0, 1),
    };

    private readonly FACE_ROTATION_MAP = {
        NORTH: { axis: "Z", dir: 1 },
        SOUTH: { axis: "Z", dir: -1 },

        EAST: { axis: "X", dir: -1 },
        WEST: { axis: "X", dir: 1 },

        UP: { axis: "Y", dir: -1 },
        DOWN: { axis: "Y", dir: 1 },
    } as const;

    constructor(CubeSize = 3, InitialState?: Piece[]) {
        this.Size = CubeSize;

        for (const texture of this.Textures) {
            texture.colorSpace = SRGBColorSpace;
            texture.needsUpdate = true;
        }

        if (InitialState) {
            if (InitialState.length !== CubeSize * CubeSize * CubeSize) {
                throw new Error(
                    "Initial state must have the same number of pieces as the cube size.",
                );
            }

            for (const piece of InitialState) {
                this.Pieces.push(piece);
            }
        } else {
            for (let x = 0; x < this.Size; x += 1) {
                for (let y = 0; y < this.Size; y += 1) {
                    for (let z = 0; z < this.Size; z += 1) {
                        const ClonedThreeJSPieceElement =
                            this.ThreeJSPieceElement.clone(true);
                        ClonedThreeJSPieceElement.position.set(x, y, z);

                        const newPiece = new Piece(
                            x * this.Size * this.Size + y * this.Size + z,
                            ClonedThreeJSPieceElement,
                        );

                        this.Pieces.push(newPiece);
                    }
                }
            }
        }
    }

    getPieces(): Piece[] {
        return this.Pieces;
    }

    private getLayer(
        face: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN",
        depth: number,
        pieceList: Piece[] = this.Pieces
    ): Piece[] {
        const layerPieces: Piece[] = [];

        for (const piece of pieceList) {
            if (
                (face === "NORTH" && piece.getPosition().z === depth) ||
                (face === "EAST" &&
                    piece.getPosition().x === this.Size - 1 - depth) ||
                (face === "WEST" && piece.getPosition().x === depth) ||
                (face === "SOUTH" &&
                    piece.getPosition().z === this.Size - 1 - depth) ||
                (face === "UP" &&
                    piece.getPosition().y === this.Size - 1 - depth) ||
                (face === "DOWN" && piece.getPosition().y === depth)
            ) {
                layerPieces.push(piece);
            }
        }

        return layerPieces;
    }

    rotateFace(
        face: keyof typeof this.FACE_ROTATION_MAP,
        depth: number,
        direction: "CLOCKWISE" | "COUNTERCLOCKWISE",
    ): void {
        const { axis, dir: initialDir } = this.FACE_ROTATION_MAP[face];
        let dir = initialDir;
        if (direction === "CLOCKWISE") {
            dir = dir === -1 ? 1 : -1;
        }
        const mid = (this.Size - 1) / 2;

        const PieceList: Piece[] = [];

        let Pieces = this.getPieces();

        if (this.AnimationQueue.getLastAnimation() === null) {
            Pieces = this.AnimationQueue.getLastAnimation().goalState;
        }

        for ( const Piece of Pieces ) {
            PieceList.push(Piece.clone());
        }

        const layer = this.getLayer(face, depth, PieceList);

        const goalState = []
        for (const piece of layer) {
            goalState.push(this.rotatePiece(piece, axis, dir, mid));
        }

        
        const NewAnimation = new Animation(Math.random(), this.getPieces(), goalState, new Quaternion(), 0.05);
        this.AnimationQueue.addAnimation( NewAnimation )


    }

    rotatePiece(piece: Piece, axis: "X" | "Y" | "Z", dir: 1 | -1, mid: number): Piece {
        const pos = piece.getPosition();
        const centered = new Vector3(pos.x - mid, pos.y - mid, pos.z - mid); // < --- Center the piece around the origin for rotation
        const rotated = Cube.rotateVec3(centered, axis, dir);

        piece.setPosition(rotated.x + mid, rotated.y + mid, rotated.z + mid);

        const q = new Quaternion().setFromAxisAngle(
            this.AXIS[axis],
            dir * (Math.PI / 2),
        );

        piece.getThreeJSElement().quaternion.premultiply(q);

        return piece
    }

    static rotateVec3(v: Vector3, axis: "X" | "Y" | "Z", dir: 1 | -1): Vector3 {
        const { x, y, z } = v;

        // 90° rotation only (Rubik constraint)
        switch (axis) {
            case "X": {
                return new Vector3(x, dir * -z, dir * y);
            }

            case "Y": {
                return new Vector3(dir * z, y, dir * -x);
            }

            case "Z": {
                return new Vector3(dir * -y, dir * x, z);
            }

            default: {
                throw new Error("Invalid rotation axis.");
            }
        }
    }
}
