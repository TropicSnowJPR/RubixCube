import type { Animation } from "./Animation";

export class AnimationQueue {
    Queue: Animation[];

    constructor() {
        this.Queue = [];
    }

    getCurrentAnimation(): Animation {
        while (true) {
            if (this.Queue.length === 0) {
                return;
            }

            if (this.Queue[0].isFinished) {
                this.Queue.shift();
                continue;
            }

            break;
        }

        return this.Queue[0];
    }

    addAnimation(animation: Animation): void {
        this.Queue.push(animation);
    }
}
