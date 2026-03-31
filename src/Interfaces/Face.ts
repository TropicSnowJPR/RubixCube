import type { Square } from "./Square";

export interface Face {
    state: Square[][];
    lable?: string; // "U", "D", "F", "B", "L", "R"
    getColor(): string;
}