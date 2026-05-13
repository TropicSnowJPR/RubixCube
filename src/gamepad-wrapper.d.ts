declare module 'gamepad-wrapper' {
    export const GamepadWrapper: new (gamepad: Gamepad) => {
        getAxis: (axis: number) => number;
    };
    export const BUTTONS: Record<string, unknown>;
    export const AXES: Record<string, any>;
}