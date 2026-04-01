export interface Square {
    color: string;
    face: string; // "U" | "D" | "F"  | "B" | "L" | "R"
    position: { row: number; column: number };
    id: string;
}