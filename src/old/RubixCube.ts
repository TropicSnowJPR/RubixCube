import type { Face } from "./Interfaces/Face";
import type { Square } from "./Interfaces/Square";
import {rotateClockwise, rotateCounterClockwise} from "./Helper";


export class RubixCube {
    private size: number;
    state: Face[];
    private colors: string[];
    private faces: string[];

    constructor(
        size: number,
    ) {
        this.size = size;
        this.colors = [
            "#01E761 / Green",
            "#022BF5 / Blue",
            "#F5E12A / Yellow",
            "#F6F6F6 / White",
            "#E11641 / Red",
            "#FA6101 / Orange",
        ];
        this.faces = [
            "R",
            "L",
            "T",
            "B",
            "F",
            "B"
        ];

        this.state = [];

        for (let i = 0; i < 6; i += 1) {
            const face = []
            for (let j = 0; j < size; j += 1) {
                const row = [];
                for (let h = 0; h < size; h += 1) {
                    const square: Square = { color: this.colors[i], face: this.faces[i], id: `[${i}.${j}.${h}]`, position: { row: j, column: h } };
                    row.push(square);
                }
                face.push(row);
            }
            const faceObj: Face = {
                getColor(): string {
                    return "";
                }, state: face, lable: this.faces[i] }
            this.state.push(faceObj);
        }

        this.rotateFace("R", 0, "clockwise");
    }

    rotateFace(face: string, depth: number, angle: "clockwise" | "counterclockwise"): void {
        // If face is not valid, do nothing for now
        for (let i = this.state.length - 1; i >= 0; i -= 1) {
            if (this.state[i].lable === face) {
                console.log(this.state[i].state)
                if (angle === "clockwise") {
                    this.state[i].state = rotateClockwise(this.state[i].state);
                } else if (angle === "counterclockwise") {
                    this.state[i].state = rotateCounterClockwise(this.state[i].state);
                }
                console.log(this.state[i].state)

                switch (face) {
                    case "R": // F T D B
                        // Rotate the right face clockwise
                        break;
                    case "L": // F T D B
                        // Rotate the left face clockwise
                        break;
                    case "T": //
                        // Rotate the top face clockwise
                        break;
                    case "B":
                        // Rotate the bottom face clockwise
                        break;
                    case "F":
                        // Rotate the front face clockwise
                        break;
                    case "B":
                        // Rotate the back face clockwise
                        break;
                    default:
                        break;
                }
            }
        }


    }

}