import {Piece} from "./Piece";
import {AnimationQueue} from "./AnimationQueue";
import {Animation} from "./Animation";
import type {Texture} from "three";
import {BoxGeometry, Mesh, MeshStandardMaterial, SRGBColorSpace, TextureLoader, Vector3} from "three";

export class Cube {

    private readonly Size: number;

    private Pieces: Piece[] = [];

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

    constructor(
        CubeSize = 3,
        InitialState?: Piece[]
    ) {

        this.Size = CubeSize;

        const TL = new TextureLoader();

        const Textures: Texture[] = [
                TL.load("../textures/orange.png"),
                TL.load("../textures/red.png"),
                TL.load("../textures/yellow.png"),
                TL.load("../textures/white.png"),
                TL.load("../textures/green.png"),
                TL.load("../textures/blue.png"),
            ];

        const Materials: MeshStandardMaterial[] = Textures.map(
            (texture) =>
                new MeshStandardMaterial({
                    map: texture,
                }),
        );

        const Geometry: BoxGeometry = new BoxGeometry(1, 1, 1);

        const ThreeJSPieceElement: Mesh = new Mesh(
            Geometry,
            Materials,
        );


        for (const texture of Textures) {
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
                            ThreeJSPieceElement.clone(true);
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

    static getLayer(
        face: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN",
        depth: number,
        cubeSize: number,
        pieceList: Piece[]
    ): Piece[] {

        const layerPieces: Piece[] = [];

        for (const piece of pieceList) {
            if (
                ( face === "NORTH" && Math.round( piece.getPosition().z ) === depth) ||
                ( face === "EAST"  && Math.round( piece.getPosition().x ) === cubeSize - 1 - depth) ||
                ( face === "WEST"  && Math.round( piece.getPosition().x ) === depth) ||
                ( face === "SOUTH" && Math.round( piece.getPosition().z ) === cubeSize - 1 - depth) ||
                ( face === "UP"    && Math.round( piece.getPosition().y ) === cubeSize - 1 - depth) ||
                ( face === "DOWN"  && Math.round( piece.getPosition().y ) === depth)
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
        duration = 0.2
    ): void {

        const { axis, dir: initialDir } = this.FACE_ROTATION_MAP[face];
        let dir = initialDir;

        if (direction === "COUNTERCLOCKWISE") {

            dir = dir === -1 ? 1 : -1;

        }

        const axisVec = this.AXIS[axis];
        const angle = dir * Math.PI / 2;

        const FaceAnimation = new Animation(this.Size, depth, face, this.Pieces, axisVec, angle, new Vector3((this.Size-1)/2, (this.Size-1)/2, (this.Size-1)/2), duration)

        this.AnimationQueue.addAnimation(FaceAnimation)

    }

}
