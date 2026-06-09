import type { Position } from "./Position";
import type { Rotation } from "./Rotation";
import type { Piece } from "./Piece";
import type { Texture } from "three";
import {TextureLoader, MeshBasicMaterial, BoxGeometry, Mesh} from "three";

class Cube {

    private readonly Size: number;
    private Position: Position;
    private Rotation: Rotation;
    private Pieces: Piece[];

    private readonly TextureLoader = new TextureLoader();

    private readonly Textures: Texture<HTMLImageElement>[] = [
        this.TextureLoader.load("../assets/textures/white.png"),
        this.TextureLoader.load("../assets/textures/yellow.png"),
        this.TextureLoader.load("../assets/textures/red.png"),
        this.TextureLoader.load("../assets/textures/orange.png"),
        this.TextureLoader.load("../assets/textures/blue.png"),
        this.TextureLoader.load("../assets/textures/green.png")
    ]

    private readonly Materials: MeshBasicMaterial[] = this.Textures.map(
        texture => new MeshBasicMaterial(
            {
                map: texture
            }
        )
    );

    private readonly Geometry: BoxGeometry = new BoxGeometry(1, 1, 1);

    private readonly ThreeJSPieceElement: Mesh = new Mesh(this.Geometry, this.Materials)

    constructor(

        CubeSize = 3,
        CubePosition = {
            x: 0,
            y: 0,
            z: 0
        },
        CubeRotation = {
            pitch: 0,
            yaw: 0,
            roll: 0
        }

    ) {

        this.Size = CubeSize;
        this.Position = CubePosition;
        this.Rotation = CubeRotation;

        for ( let x = 0; x < this.Size; x += 1 ) {

            for ( let y = 0; y < this.Size; y += 1 ) {

                for ( let z = 0; z < this.Size; z += 1 ) {

                    const ClonedThreeJSPieceElement = this.ThreeJSPieceElement.clone(true);
                    ClonedThreeJSPieceElement.position.set( this.Position.x + x - 1, this.Position.y + y - 1, this.Position.z + z - this.Size)

                    const Piece: Piece = {
                        id: x * this.Size * this.Size + y * this.Size + z,
                        threeJSElement: ClonedThreeJSPieceElement,
                        relPosition: { x, y, z },
                        relRotation: { pitch: 0, yaw: 0, roll: 0 },

                    }

                    this.Pieces.push(Piece);

                }

            }

        }

    }

    getPieces() {
        return this.Pieces;
    }

    getPosition() {
        return this.Position;
    }

    getRotation() {
        return this.Rotation;
    }

    getSize() {
        return this.Size;
    }

}