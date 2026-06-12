import type { Object3D, Quaternion } from "three";

export class Animation {
    private id: number;
    private threeJSElement: Object3D;
    private readonly quaternion: Quaternion;
    private readonly duration: number;
    isFinished: false;

    constructor(
        id: number,
        object: Object3D,
        quaternion: Quaternion,
        duration: number,
    ) {
        this.id = id;
        this.threeJSElement = object;
        this.quaternion = quaternion;
        this.duration = duration;
    }

    update(): void {
        this.threeJSElement.quaternion.slerp(this.quaternion, this.duration);
    }
}
