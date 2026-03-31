import type { Face } from "./Interfaces/Face";
import type { Square } from "./Interfaces/Square";

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
            "#f6240f",
            "#1df60f",
            "#270ff6",
            "#f2f60f",
            "#f6890f",
            "#ffffff"
        ];
        this.faces = [
            "U", 
            "D", 
            "F", 
            "B", 
            "L", 
            "R"
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
    }
}