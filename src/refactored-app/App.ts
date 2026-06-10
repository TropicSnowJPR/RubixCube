import {Cube} from "./Cube";
import {Scene, PerspectiveCamera, WebGLRenderer, GridHelper} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import * as THREE from "three";
import type {Direction} from "./Direction";
import type {Side} from "./Side";
import {Animation} from "../app/Classes/Animation";

class App {
    private Scene: Scene;
    private Camera: PerspectiveCamera;
    private Controls: OrbitControls;
    private Renderer: WebGLRenderer;
    private Cube: Cube;

    private Size = 3;

    private PressedKeys: Record<string, boolean>;
    private Counter = 0;
    private Grid: GridHelper;
    private RandomLock = false;


    constructor() {
        this.Renderer = new WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            precision: "highp"
        });
        this.Renderer.setSize(window.innerWidth, window.innerHeight);
        this.Renderer.setPixelRatio(window.devicePixelRatio);
        this.Renderer.setAnimationLoop(this.animate.bind(this));
        this.Renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.querySelector("#scene-container").append(this.Renderer.domElement)
        this.Scene = new Scene();
        this.Camera = new PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 20_000);
        this.Controls = new OrbitControls(this.Camera, this.Renderer.domElement);

        this.Cube = new Cube(this.Size);

        this.Camera.position.set(
            this.Size * 3,
            this.Size * 3,
            this.Size * 3
        );

        const center = new THREE.Vector3(
            this.Size / 2 - 0.5,
            this.Size / 2 - 0.5,
            this.Size / 2 - 0.5
        );

        this.Controls.target.copy(center);
        this.Controls.update();

        this.Controls.enableDamping = true;
        this.Controls.enableZoom = false;
        this.Controls.enablePan = false;
        this.Controls.dampingFactor = 0.05;

        this.Scene.add(new THREE.AmbientLight(0xFF_FF_FF , 1));
        this.Scene.add(new THREE.HemisphereLight(0xFF_FF_FF, 0xFF_FF_FF, 2));
        const dir = new THREE.DirectionalLight(0xFF_FF_FF, 1);
        dir.position.set(-this.Size, 2 * this.Size, -this.Size);
        this.Scene.add(dir);

    this.Grid = new GridHelper( this.Size+6,this.Size+6 )
        this.Scene.add( this.Grid );
        this.Grid.position.set(this.Size / 2 - 0.5, - 0.5, this.Size / 2 - 0.5);


        for (const Element of this.Cube.getPieces()) {
            this.Scene.add(Element.getThreeJSElement())
        }

        this.PressedKeys = {}

        document.addEventListener("keydown", (event) => {
            this.PressedKeys[event.key.toLowerCase()] = true;
        });

        document.addEventListener("keyup", (event) => {
            this.PressedKeys[event.key.toLowerCase()] = false;
        });

    }

    private animate(): void {

        let RotationType: Direction = "CLOCKWISE";
        let RotationFace: Side | undefined = undefined;
        let RotationDepth = 1;

        if (this.PressedKeys["r"] && this.RandomLock === false ) {
            this.addRandomAnimations(Math.floor(Math.random() * 100) + 100, 0.05);
            // this.RandomLock = true;
        }

        if ( this.PressedKeys["x"] )        { RotationType = "COUNTERCLOCKWISE"; }

        if ( this.PressedKeys["q"] )        { RotationFace = "UP"; }
        else if ( this.PressedKeys["w"] )   { RotationFace = "NORTH"; }
        else if ( this.PressedKeys["e"] )   { RotationFace = "DOWN"; }
        else if ( this.PressedKeys["a"] )   { RotationFace = "WEST"; }
        else if ( this.PressedKeys["s"] )   { RotationFace = "SOUTH"; }
        else if ( this.PressedKeys["d"] )   { RotationFace = "EAST"; }

        for ( let i = 1; i <= 10; i += 1 ) {

            if ( this.PressedKeys[ i.toString( ) ] ) {

                if ( i > Math.floor( this.Size - 1 ) ) {
                    break;
                }
                RotationDepth = i;
                break;

            }

        }

        if ( RotationFace && this.Counter <= 0 ) {

            this.Cube.rotateFace(
                RotationFace,
                RotationDepth - 1,
                RotationType
            );

            this.Counter = 30

        }

        this.Counter -= 1;


        this.Controls.update( );
        this.Renderer.render( this.Scene, this.Camera );

    }

    private addRandomAnimations(count = 100, duration = 0.05): void {
        const sides: Side[] = ["NORTH", "SOUTH", "EAST", "WEST", "UP", "DOWN"];
        const directions: Direction[] = ["CLOCKWISE", "COUNTERCLOCKWISE"];
        const maxDepth = Math.max(1, Math.floor(this.Size));

        for (let i = 0; i < count; i += 1) {
            const side = sides[Math.floor(Math.random() * sides.length)];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const depth = 1 + Math.floor(Math.random() * maxDepth);


            this.Cube.rotateFace(side, depth - 1, direction);
        }

    }

}

const app = new App();