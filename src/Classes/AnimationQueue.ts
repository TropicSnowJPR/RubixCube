import type {Animation} from "./Animation";

export class AnimationQueue {

    Queue: Animation[]

    constructor() {
        this.Queue = [];
    }

    getQueue() {
        return this.Queue;
    }

    getQueueLength() {
        return this.Queue.length;
    }

    getCurrentAnimation() {
        while ( true ) {
            if (this.Queue.length === 0) {
                return;
            }

            if (this.Queue[0].isFinished) {
                this.Queue.shift();
                continue;
            }

            break
        }

        return this.Queue[0];
    }

    addAnimation(animation: Animation) {
        this.Queue.push(animation);
    }

    removeCurrentAnimation() {
        this.Queue.shift();
    }

    clearQueue() {
        this.Queue = [];
    }

}