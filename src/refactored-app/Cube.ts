import { Piece } from "./Piece";
import type { Texture } from "three";
import { TextureLoader, MeshBasicMaterial, MeshStandardMaterial, BoxGeometry, Mesh, SRGBColorSpace } from "three";

export class Cube {

    private readonly Size: number;
    private Pieces: Piece[] = [];

    private readonly TextureLoader = new TextureLoader();
    private readonly Textures: Texture[] = [
        this.TextureLoader.load("../assets/textures/orange.png"),
        this.TextureLoader.load("../assets/textures/red.png"),
        this.TextureLoader.load("../assets/textures/yellow.png"),
        this.TextureLoader.load("../assets/textures/white.png"),
        this.TextureLoader.load("../assets/textures/green.png"),
        this.TextureLoader.load("../assets/textures/blue.png")
    ]
    private readonly Materials: MeshStandardMaterial[] = this.Textures.map(texture => new MeshStandardMaterial({
        map: texture
    }));
    private readonly Geometry: BoxGeometry = new BoxGeometry(1, 1, 1);
    private readonly ThreeJSPieceElement: Mesh = new Mesh(this.Geometry, this.Materials)

    constructor(CubeSize = 3, InitialState?: Piece[]) {

        this.Size = CubeSize;

        this.Textures.forEach(texture => {
            texture.colorSpace = SRGBColorSpace;
            texture.needsUpdate = true;
        });

        if (InitialState) {

            if (InitialState.length !== CubeSize * CubeSize * CubeSize) {
                throw new Error("Initial state must have the same number of pieces as the cube size.");
            }

            for ( const piece of InitialState ) {
                this.Pieces.push(piece);
            }

        } else {

            for (let x = 0; x < this.Size; x += 1) {

                for (let y = 0; y < this.Size; y += 1) {

                    for (let z = 0; z < this.Size; z += 1) {

                        const ClonedThreeJSPieceElement = this.ThreeJSPieceElement.clone(true);
                        ClonedThreeJSPieceElement.position.set(x, y, z)

                        const newPiece = new Piece(
                            x * this.Size * this.Size + y * this.Size + z,
                            ClonedThreeJSPieceElement
                        )

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
        depth: number

    ): Piece[] {

        const layerPieces: Piece[] = [];

        for (const piece of this.Pieces) {
            if (
                ( face === "NORTH" && piece.getPosition().z === depth ) ||
                ( face === "EAST" && piece.getPosition().x === this.Size - 1 - depth ) ||
                ( face === "WEST" && piece.getPosition().x === depth ) ||
                ( face === "SOUTH" && piece.getPosition().z === this.Size - 1 - depth ) ||
                ( face === "UP" && piece.getPosition().y === this.Size - 1 - depth ) ||
                ( face === "DOWN" && piece.getPosition().y === depth )
            ) {
                layerPieces.push(piece);
            }
        }

        console.log(layerPieces);

        return layerPieces;

    }

    rotateFace(

        face: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN",
        depth: number,
        direction: "CLOCKWISE" | "COUNTERCLOCKWISE"

    ) {

        const Layer = this.getLayer(face, depth)

        for ( const piece of Layer ) {

            const lastX = piece.getPosition().x;
            const lastY = piece.getPosition().y;
            const lastZ = piece.getPosition().z;

            const mid = (this.Size - 1) / 2;

            switch (face) {
                
                case "NORTH": {
                    
                    const relX = lastX - mid;
                    const relY = lastY - mid;
                    
                    if (direction === "COUNTERCLOCKWISE") {
                        piece.setXPosition( relY + mid );
                        piece.setYPosition( -relX + mid )
                        piece.setRollRotation( -Math.PI / 2 )
                    } else {
                        piece.setXPosition( -relY + mid);
                        piece.setYPosition( relX + mid )
                        piece.setRollRotation( Math.PI / 2 )
                    }
                    
                    break;
                    
                }
                
                case "SOUTH": {
                    
                    const relX = lastX - mid;
                    const relY = lastY - mid;
                    
                    if (direction === "CLOCKWISE") {
                        piece.setXPosition(  relY + mid )
                        piece.setYPosition( -relX + mid )
                        piece.setRollRotation( -Math.PI / 2 )
                    } else {
                        piece.setXPosition( -relY + mid )
                        piece.setYPosition( relX + mid )
                        piece.setRollRotation( Math.PI / 2 )
                    }
                    
                    break;
                    
                }
                
                case "EAST": {
                    
                    const relY = lastY - mid;
                    const relZ = lastZ - mid;
                    
                    if (direction === "CLOCKWISE") {
                        piece.setYPosition( relZ + mid )
                        piece.setZPosition( -relY + mid )
                        piece.setPitchRotation( -Math.PI / 2 )
                    } else {
                        piece.setYPosition( -relZ + mid )
                        piece.setZPosition( relY + mid )
                        piece.setPitchRotation( Math.PI / 2 )
                    }
                    
                    break;
                    
                }
                
                case "WEST": {
                    
                    const relY = lastY - mid;
                    const relZ = lastZ - mid;
                    
                    if (direction === "COUNTERCLOCKWISE") {
                        piece.setYPosition( relZ + mid )
                        piece.setZPosition( -relY + mid )
                        piece.setPitchRotation( -Math.PI / 2 )
                    } else {
                        piece.setYPosition( -relZ + mid )
                        piece.setZPosition( relY + mid )
                        piece.setPitchRotation( Math.PI / 2 )
                    }
                    
                    break;
                    
                }
                
                case "UP": {
                    
                    const relX = lastX - mid;
                    const relZ = lastZ - mid;
                    
                    if (direction === "CLOCKWISE") {
                        piece.setXPosition( relZ + mid )
                        piece.setZPosition( -relX + mid )
                        piece.setYawRotation( -Math.PI / 2 )
                    } else {
                        piece.setXPosition( -relZ + mid )
                        piece.setZPosition( relX + mid )
                        piece.setYawRotation( Math.PI / 2 )
                    }
                    
                    break;
                    
                }
                
                case "DOWN": {
                    
                    const relX = lastX - mid;
                    const relZ = lastZ - mid;
                    
                    if (direction === "COUNTERCLOCKWISE") {
                        piece.setXPosition( relZ + mid )
                        piece.setZPosition( -relX + mid )
                        piece.setYawRotation( -Math.PI / 2 )
                    } else {
                        piece.setXPosition( -relZ + mid )
                        piece.setZPosition(  relX + mid )
                        piece.setYawRotation( Math.PI / 2 )
                    }
                    
                    break;
                    
                }
                
                default: {
                    
                    break
                    
                }
                
            }
            
        }

    }

    public static jsonToState(
        json: string
    ): Piece[] {
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            throw new Error("Invalid JSON format for cube state.");
        }
        return parsed.map((pieceData: any) => {
            if (typeof pieceData.id !== "number" || typeof pieceData.position !== "object") {
                throw new Error("Invalid piece data in JSON.");
            }
            const piece = new Piece(pieceData.id, new Mesh());
            piece.setPosition(pieceData.position.x, pieceData.position.y, pieceData.position.z);
            return piece;
        });
    }

}