// oxlint-disable no-console
import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {Cube} from "./Classes/Cube";


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

    constructor(
        size: number
    ) {
        this.size = size;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100_000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", precision: "highp" });
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.loader = new THREE.TextureLoader();

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


        this.RubixCube.rotateFace("R", 0, "clockwise");

        this.updateRubixCube()

        this.RubixCube.rotateFace("F", 0, "clockwise");

        this.updateRubixCube()





    }

    updateRubixCube(): void {
        for (const cube of this.RubixCube.state) {
            this.Dummy.position.set(
                (cube.position.x + 0.5) - (this.size / 2),
                (cube.position.y + 0.5) - (this.size / 2),
                (cube.position.z + 0.5) - (this.size / 2)
            );

            this.Dummy.rotation.set(
                cube.rotation.pitch,
                cube.rotation.yaw,
                cube.rotation.roll
            );

            this.Dummy.updateMatrix();

            this.InstancedCubeMesh.setMatrixAt(
                cube.id,
                this.Dummy.matrix
            );
        }

        this.InstancedCubeMesh.instanceMatrix.needsUpdate = true;
    }

    private animate():void {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

}

// oxlint-disable-next-line no-new
new App(4);
