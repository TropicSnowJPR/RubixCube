// oxlint-disable no-console
import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


class App {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private size: number;

    constructor(
        size: number
    ) {
        this.size = size;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100_000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", precision: "highp" });
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.init();
    }

    private init(): void {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.setAnimationLoop(this.animate.bind(this));
        document.body.append( this.renderer.domElement );

        this.camera.position.set( ( this.size ), ( this.size * 0.75 ), ( this.size ) );
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.enableDamping = true;
        this.controls.enableZoom = false;
        this.controls.enablePan = false;


        this.scene.add(new THREE.AmbientLight(0xFF_00_00, 0.6));
        this.scene.add(new THREE.HemisphereLight(0xFF_FF_FF, 0x44_44_44, 0.6));
        const dir = new THREE.DirectionalLight(0xFF_FF_FF, 2);
        dir.position.set(this.size, this.size, -this.size);
        this.scene.add(dir);


        const Dummy = new THREE.Object3D();


        const CubeGeometry = new THREE.BoxGeometry(1, 1, 1);
        const CubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00_00_00 });

        const InstancedCubeMeshCount = ( this.size ** 3 - ( this.size - 2 ) ** 3 )

        const InstancedCubeMesh = new THREE.InstancedMesh(CubeGeometry, CubeMaterial, InstancedCubeMeshCount);

        this.scene.add(InstancedCubeMesh);

        let InstancedCubeMeshIterator = InstancedCubeMeshCount - 1;

        console.log(this.size);

        for (let x = 0; x < this.size; x += 1) {

            for (let y = 0; y < this.size; y += 1) {

                for (let z = 0; z < this.size; z += 1) {

                    console.log( ( x ) - ( this.size / 2 ), ( y ) - ( this.size / 2 ), ( z ) - ( this.size / 2 ) );

                    if (!(
                        (x === 0 || x === this.size - 1) ||
                        (y === 0 || y === this.size - 1) ||
                        (z === 0 || z === this.size - 1)
                    )) {
                        continue;
                    }

                    Dummy.position.set(
                        ( ( x + 0.5 ) - ( this.size / 2 ) ),
                        ( ( y + 0.5 ) - ( this.size / 2 ) ),
                        ( ( z + 0.5 ) - ( this.size / 2 ) )
                    );

                    Dummy.updateMatrix();
                    InstancedCubeMesh.setMatrixAt(InstancedCubeMeshIterator, Dummy.matrix);

                    InstancedCubeMeshIterator -= 1

                }

            }

        }

        InstancedCubeMesh.instanceMatrix.needsUpdate = true;



        const PlaneGeometry = new THREE.PlaneGeometry(0.8, 0.8);
        const PlaneMaterial = new THREE.MeshStandardMaterial({ color: 0xFF_00_00 });

        const InstancedPlaneMeshCount = 6 * this.size ** 2;

        const InstancedPlaneMesh = new THREE.InstancedMesh(PlaneGeometry, PlaneMaterial, InstancedPlaneMeshCount);

        this.scene.add(InstancedPlaneMesh);

        let InstancedPlaneMeshIterator = InstancedPlaneMeshCount - 1;


        for ( let i = 0; i < 6; i += 1) {

            for (let x = 0.5; x < this.size + 0.5; x += 1) {

                for (let y = 0.5; y < this.size + 0.5; y += 1) {

                    switch (i) {
                        case 0: { // UP
                            Dummy.position.set(x - this.size / 2, this.size / 2 + 0.01, y - this.size / 2);
                            Dummy.rotation.set(THREE.MathUtils.degToRad(-90), 0, 0);
                            break;
                        }
                        case 1: { // DOWN
                            Dummy.position.set(x - this.size / 2, -this.size / 2 - 0.01, y - this.size / 2 );
                            Dummy.rotation.set(THREE.MathUtils.degToRad(90), 0, 0);
                            break;
                        }
                        case 2: { // FRONT
                            Dummy.position.set(x - this.size / 2, y - this.size / 2, this.size / 2 + 0.01 );
                            Dummy.rotation.set(0, THREE.MathUtils.degToRad(0), 0);

                            break;
                        }
                        case 3: { // BACK
                            Dummy.position.set(x - this.size / 2, y - this.size / 2, -this.size / 2 - 0.01 );
                            Dummy.rotation.set(0, THREE.MathUtils.degToRad(180), 0);

                            break;
                        }
                        case 4: { // LEFT
                            Dummy.position.set(-this.size / 2 - 0.01 , y - this.size / 2, x - this.size / 2);
                            Dummy.rotation.set(0, THREE.MathUtils.degToRad(-90), 0);
                            break;
                        }
                        case 5: { // RIGHT
                            Dummy.position.set(this.size / 2 + 0.01 , y - this.size / 2, x - this.size / 2);
                            Dummy.rotation.set(0, THREE.MathUtils.degToRad(90),  0);
                            break;
                        }
                        default:
                            // Pass
                    }

                    Dummy.updateMatrix();
                    InstancedPlaneMesh.setMatrixAt(InstancedPlaneMeshIterator, Dummy.matrix);

                    InstancedPlaneMeshIterator -= 1

                }

            }

        }

        InstancedPlaneMesh.instanceMatrix.needsUpdate = true;

    }

    private animate():void {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

}

// oxlint-disable-next-line no-new
new App(3);
