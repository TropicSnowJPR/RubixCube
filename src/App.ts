// oxlint-disable no-console
import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {Cube} from "./Classes/Cube";
import {Piece} from "./Classes/Piece";
import {Timer} from "three";


class App {
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly controls: OrbitControls;
    private readonly size: number;
    private readonly loader: THREE.TextureLoader;
    private RubixCube: Cube;
    private InstancedCubeMesh!: THREE.InstancedMesh;
    private Dummy = new THREE.Object3D();
    private pressedKeys: Record<string, boolean> = {};
    private counter = 0;
    private readonly timer: Timer;

    constructor(
        size: number
    ) {
        this.size = size;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100_000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", precision: "highp" });
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.loader = new THREE.TextureLoader();

        this.timer = new THREE.Timer();


        this.pressedKeys = {};

        this.init();
    }

    private init(): void {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.setAnimationLoop(this.animate.bind(this));
        document.body.append( this.renderer.domElement );

        this.camera.position.set( ( this.size ), ( this.size ), ( this.size ) );
        this.controls.enableDamping = true;
        this.controls.enableZoom = false;
        this.controls.enablePan = false;


        this.scene.add(new THREE.AmbientLight(0xFF_FF_FF, 1));
        this.scene.add(new THREE.HemisphereLight(0xFF_FF_FF, 0xFF_FF_FF, 1));
        const dir = new THREE.DirectionalLight(0xFF_FF_FF, 2);
        dir.position.set(this.size, this.size, -this.size);
        this.scene.add(dir);



        this.RubixCube = new Cube(this.size); // :))))

        const Dummy = new THREE.Object3D();

        const CubeGeometry = new THREE.BoxGeometry(1, 1, 1);
        const CubeMaterials = [
            new THREE.MeshStandardMaterial({
                map: this.loader.load("textures/right.png")
            }),
            new THREE.MeshStandardMaterial({
                map: this.loader.load("textures/left.png")
            }),
            new THREE.MeshStandardMaterial({
                map: this.loader.load("textures/top.png")
            }),
            new THREE.MeshStandardMaterial({
                map: this.loader.load("textures/bottom.png")
            }),
            new THREE.MeshStandardMaterial({
                map: this.loader.load("textures/front.png")
            }),
            new THREE.MeshStandardMaterial({
                map: this.loader.load("textures/back.png")
            }),
        ]

        const RubixCubeStateLength = this.RubixCube.state.length

        const InstancedCubeMeshCount = RubixCubeStateLength

        this.InstancedCubeMesh = new THREE.InstancedMesh(CubeGeometry, CubeMaterials, InstancedCubeMeshCount);

        this.scene.add(this.InstancedCubeMesh);

        let InstancedCubeMeshIterator = InstancedCubeMeshCount - 1;

        for (let i = 0; i < RubixCubeStateLength; i += 1) {

            this.Dummy.position.set(
                ( ( this.RubixCube.state[i].position.x + 0.5 ) - ( this.size / 2 ) ),
                ( ( this.RubixCube.state[i].position.y + 0.5 ) - ( this.size / 2 ) ),
                ( ( this.RubixCube.state[i].position.z + 0.5 ) - ( this.size / 2 ) )
            );

            this.RubixCube.state[i].id = InstancedCubeMeshIterator;

            Dummy.updateMatrix();
            this.InstancedCubeMesh.setMatrixAt(InstancedCubeMeshIterator, Dummy.matrix);

            InstancedCubeMeshIterator -= 1
        }

        this.InstancedCubeMesh.instanceMatrix.needsUpdate = true;

        this.updateRubixCube(1);


        document.addEventListener("keydown", (event) => {
            this.pressedKeys[event.key.toLowerCase()] = true;
        });

        document.addEventListener("keyup", (event) => {
            this.pressedKeys[event.key.toLowerCase()] = false;
        });

    }

    updateRubixCube(delta: number): void {
        const speed = 1; // In Degrees how much the rotation will be per frame

        for (const piece of this.RubixCube.state) {


            piece.targetPosition
        }

        for (const cube of this.RubixCube.state) {
            cube.rotation.pitch += (cube.targetRotation.pitch - cube.rotation.pitch) * speed * delta;
            cube.rotation.yaw   += (cube.targetRotation.yaw - cube.rotation.yaw) * speed * delta;
            cube.rotation.roll  += (cube.targetRotation.roll - cube.rotation.roll) * speed * delta;

            cube.position.x += (cube.targetPosition.x - cube.position.x) * speed * delta;
            cube.position.y += (cube.targetPosition.y - cube.position.y) * speed * delta;
            cube.position.z += (cube.targetPosition.z - cube.position.z) * speed * delta;

            this.Dummy.position.set(
                cube.position.x - this.size / 2 + 0.5,
                cube.position.y - this.size / 2 + 0.5,
                cube.position.z - this.size / 2 + 0.5
            );

            this.Dummy.rotation.set(cube.rotation.pitch, cube.rotation.yaw, cube.rotation.roll);
            this.Dummy.updateMatrix();
            this.InstancedCubeMesh.setMatrixAt(cube.id!, this.Dummy.matrix);
        }

        this.InstancedCubeMesh.instanceMatrix.needsUpdate = true;
    }

    private animate():void {



        let RotationType: "clockwise" | "counterclockwise" = "clockwise";
        let RotationFace: "R" | "L" | "T" | "D" | "F" | "B" | undefined = undefined;
        let RotationDepth = 1;

        if (this.pressedKeys["x"]) { RotationType = "counterclockwise"; }

        if (this.pressedKeys["q"]) { RotationFace = "T"; }
        else if (this.pressedKeys["w"]) { RotationFace = "B"; }
        else if (this.pressedKeys["e"]) { RotationFace = "D"; }
        else if (this.pressedKeys["a"]) { RotationFace = "L"; }
        else if (this.pressedKeys["s"]) { RotationFace = "F"; }
        else if (this.pressedKeys["d"]) { RotationFace = "R"; }

        for (let i = 1; i <= 10; i += 1) {
            if (this.pressedKeys[i.toString()]) {
                if (i > Math.floor(this.size / 2)) { break; }
                RotationDepth = i;
                break;
            }
        }

        if ( RotationFace && this.counter <= 0 ) {
            console.log("RotationFace:" + RotationFace + " RotationType:" + RotationType + " RotationDepth:" + RotationDepth);
            try {
                this.RubixCube.rotateFace(RotationFace, RotationType, RotationDepth - 1);
            } catch (error) {
                console.error("Error rotating face:", error);
            }
            this.counter = 20
        }

        this.updateRubixCube(1);

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

}


// https://threejs.org/docs/#Timer

// oxlint-disable-next-line no-new
new App(3);
