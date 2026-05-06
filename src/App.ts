// oxlint-disable no-console
import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {Cube} from "./Classes/Cube";
import {Animation} from "./Classes/Animation";
import {AnimationQueue} from "./Classes/AnimationQueue";


class App {
    public readonly Scene: THREE.Scene;
    private readonly Camera: THREE.PerspectiveCamera;
    private readonly Renderer: THREE.WebGLRenderer;
    private readonly Controls: OrbitControls;
    public readonly Size: number;
    private readonly Loader: THREE.TextureLoader;
    public RubixCube: Cube;
    private InstancedPlaneMesh!: THREE.InstancedMesh;
    private Dummy = new THREE.Object3D();
    private readonly PressedKeys: Record<string, boolean> = {};
    private counter = 0;

    private Atlas: THREE.Texture<HTMLImageElement>;
    private AtlasRows = 3;
    private AtlasCols = 3;
    private LastTime: DOMHighResTimeStamp;
    private AnimationQueue: AnimationQueue;

    constructor(
        size: number
    ) {
        this.Size = size;

        this.Scene = new THREE.Scene();
        this.Camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100_000);
        this.Renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", precision: "highp" });
        this.Controls = new OrbitControls(this.Camera, this.Renderer.domElement);
        this.Loader = new THREE.TextureLoader();

        this.LastTime = performance.now();


        this.PressedKeys = {};

        this.init();
    }

    private init(): void {
        this.Renderer.setSize(window.innerWidth, window.innerHeight);
        this.Renderer.setPixelRatio( window.devicePixelRatio );
        this.Renderer.setAnimationLoop(this.animate.bind(this));

        document.body.append( this.Renderer.domElement );

        this.Camera.position.set( ( this.Size ), ( this.Size ), ( this.Size ) );
        this.Controls.enableDamping = true;
        this.Controls.enableZoom = true;
        this.Controls.enablePan = true;


        this.Scene.add(new THREE.AmbientLight(0xFF_FF_FF, 1));
        this.Scene.add(new THREE.HemisphereLight(0xFF_FF_FF, 0xFF_FF_FF, 1));
        const dir = new THREE.DirectionalLight(0xFF_FF_FF, 2);
        dir.position.set(-this.Size, 2*this.Size, -this.Size);
        this.Scene.add(dir);

        this.Atlas = this.Loader.load("./assets/atlas.png");

        this.Atlas.minFilter = THREE.NearestFilter;
        this.Atlas.magFilter = THREE.NearestFilter;
        // oxlint-disable-next-line no-multi-assign
        this.Atlas.wrapS = this.Atlas.wrapT = THREE.ClampToEdgeWrapping;

        this.AnimationQueue = new AnimationQueue();

        this.RubixCube = new Cube(this.Size); // :))))

        if (this.RubixCube.state.length !== this.Size ** 3) {
            throw new Error("Cube state length does not match expected length");
        }

        const Dummy = new THREE.Object3D();

        const PlaneGeometry = new THREE.PlaneGeometry(1, 1);


        const InstancedPlaneCount = 6 * this.Size * this.Size;

        const uvOffsets = new Float32Array(InstancedPlaneCount * 2);

        PlaneGeometry.setAttribute(
            "uvOffset",
            new THREE.InstancedBufferAttribute(uvOffsets, 2)
        );

        this.InstancedPlaneMesh = new THREE.InstancedMesh(
            PlaneGeometry,
            new THREE.ShaderMaterial({
                side: THREE.DoubleSide,
                uniforms: {
                    atlas: { value: this.Atlas },
                    cols: { value: this.AtlasCols },
                    rows: { value: this.AtlasRows },
                },
                vertexShader: `
                    attribute vec2 uvOffset;

                    varying vec2 vUv;
                    varying vec2 vUvOffset;
                    
                    void main() {
                      vUv = uv;
                      vUvOffset = uvOffset;
                    
                      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D atlas;
                    uniform float cols;
                    uniform float rows;
                    
                    varying vec2 vUv;
                    varying vec2 vUvOffset;
                    
                    void main() {
                      vec2 tileSize = vec2(1.0 / cols, 1.0 / rows);
                    
                      vec2 uv = vUv * tileSize + vUvOffset;
                    
                      gl_FragColor = texture2D(atlas, uv);
                    }
                `,
            }),
            InstancedPlaneCount
        );

        this.InstancedPlaneMesh.position.set(0.5, 0.5, 0.5);

        this.Scene.add(this.InstancedPlaneMesh);

        let InstancedPlaneMeshIterator = InstancedPlaneCount - 1;

        const attr = this.InstancedPlaneMesh.geometry.getAttribute(
            "uvOffset"
        ) as THREE.InstancedBufferAttribute;

        for (const state of this.RubixCube.state) {

            if (state.type === "CORE") {
                continue;
            }

            for (const sticker of state.stickers) {

                const sideConfig = {
                    SOUTH: {
                        pos: [0, 0, -0.5] as [number, number, number],
                        rot: [0, Math.PI, 0] as [number, number, number],
                        uv: [1 / this.AtlasCols, 2 / this.AtlasRows] as [number, number],
                    }, NORTH: {
                        pos: [0, 0, 0.5] as [number, number, number],
                        rot: [0, 2 * Math.PI, 0] as [number, number, number],
                        uv: [2 / this.AtlasCols, 1 / this.AtlasRows] as [number, number],
                    }, WEST: {
                        pos: [-0.5, 0, 0] as [number, number, number],
                        rot: [0, -Math.PI / 2, 0] as [number, number, number],
                        uv: [2 / this.AtlasCols, 2 / this.AtlasRows] as [number, number],
                    }, EAST: {
                        pos: [0.5, 0, 0] as [number, number, number],
                        rot: [0, Math.PI / 2, 0] as [number, number, number],
                        uv: [0, 1 / this.AtlasRows] as [number, number],
                    }, UP: {
                        pos: [0, 0.5, 0] as [number, number, number],
                        rot: [-Math.PI / 2, 0, 0] as [number, number, number],
                        uv: [1 / this.AtlasCols, 1 / this.AtlasRows] as [number, number],
                    }, DOWN: {
                        pos: [0, -0.5, 0] as [number, number, number],
                        rot: [Math.PI / 2, 0, 0] as [number, number, number],
                        uv: [0, 2 / this.AtlasRows] as [number, number],
                    },
                };

                const config = sideConfig[sticker.side as keyof typeof sideConfig];

                if (config) {
                    const piece = state.position;

                    Dummy.position.set(piece.x + config.pos[0] - this.Size / 2, piece.y + config.pos[1] - this.Size / 2, piece.z + config.pos[2] - this.Size / 2);

                    Dummy.rotation.set(config.rot[0], config.rot[1], config.rot[2]);

                    Dummy.updateMatrix();

                    sticker.id = InstancedPlaneMeshIterator

                    this.InstancedPlaneMesh.setMatrixAt(InstancedPlaneMeshIterator, Dummy.matrix);

                    this.InstancedPlaneMesh.instanceMatrix.needsUpdate = true;

                    attr.setXY(InstancedPlaneMeshIterator, config.uv[0], config.uv[1]);

                    attr.needsUpdate = true;

                    InstancedPlaneMeshIterator -= 1;
                }
            }

        }

        const RotationHiderPlaneInnerGeometry = new THREE.PlaneGeometry(this.Size, this.Size)
        const RotationHiderPlaneOuterGeometry = new THREE.PlaneGeometry(this.Size, this.Size)

        const RotationHiderPlaneMaterial = new THREE.MeshBasicMaterial({ color: 0x00_00_00, side: THREE.FrontSide });

        const RotationHiderPlaneInner = new THREE.Mesh(RotationHiderPlaneInnerGeometry, RotationHiderPlaneMaterial);
        const RotationHiderPlaneOuter = new THREE.Mesh(RotationHiderPlaneOuterGeometry, RotationHiderPlaneMaterial);

        RotationHiderPlaneInner.position.set(0, 0, 0);
        RotationHiderPlaneOuter.position.set(0, 0, 0);

        RotationHiderPlaneOuter.rotation.set(0, Math.PI, 0);

        // this.Scene.add(RotationHiderPlaneInner);
        // this.Scene.add(RotationHiderPlaneOuter);

        document.addEventListener("keydown", (event) => {
            this.PressedKeys[event.key.toLowerCase()] = true;
        });

        document.addEventListener("keyup", (event) => {
            this.PressedKeys[event.key.toLowerCase()] = false;
        });

    }


    private animate(): void {

        const now = performance.now();
        const delta = (now - this.LastTime) / 1000; // in Sekunden
        this.LastTime = now;

        let RotationType: "CLOCKWISE" | "COUNTERCLOCKWISE" = "CLOCKWISE";
        let RotationFace: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN" = undefined;
        let RotationDepth = 1;

        if (this.PressedKeys["x"]) { RotationType = "COUNTERCLOCKWISE"; }

        if (this.PressedKeys["q"]) { RotationFace = "UP"; }
        else if (this.PressedKeys["w"]) { RotationFace = "NORTH"; }
        else if (this.PressedKeys["e"]) { RotationFace = "DOWN"; }
        else if (this.PressedKeys["a"]) { RotationFace = "WEST"; }
        else if (this.PressedKeys["s"]) { RotationFace = "SOUTH"; }
        else if (this.PressedKeys["d"]) { RotationFace = "EAST"; }

        for (let i = 1; i <= 10; i += 1) {
            if (this.PressedKeys[i.toString()]) {
                if (i > Math.floor(this.Size / 2)) { break; }
                RotationDepth = i;
                break;
            }
        }

        if (RotationFace && this.counter <= 0) {
            this.counter += 1;
            this.AnimationQueue.addAnimation(
                new Animation(RotationFace, RotationDepth, 90, RotationType, 0.8, this.Size)
            );
            this.RubixCube.rotateLayer(RotationFace, RotationDepth - 1, RotationType);
        }

        const currentAnimation = this.AnimationQueue.getCurrentAnimation()



        if (currentAnimation) {
            const objPositionList = currentAnimation.update(this.RubixCube, delta);
            if (objPositionList) {
                for (const objPosition of objPositionList) {

                    let fixValuePitch = 0
                    let fixValueRoll= 0
                    let fixValueYaw = 0
                    let fixValueX = 0
                    let fixValueY = 0
                    let fixValueZ = 0
                    //
                    // if ( objPosition.side === "NORTH" ) {
                    //     console.log("Object is on the NORTH face");
                    // } else if ( objPosition.side === "SOUTH" ) {
                    //     console.log("Object is on the SOUTH face");
                    // } else if ( objPosition.side === "EAST" ) {
                    //     console.log("Object is on the EAST face");
                    //     fixValueX = -1.5
                    //     fixValueYaw = Math.PI / 2
                    // } else if ( objPosition.side === "WEST" ) {
                    //     console.log("Object is on the WEST face");
                    //     fixValueX = -2.5
                    //     fixValueYaw = Math.PI / 2
                    // } else if ( objPosition.side === "UP" ) {
                    //     console.log("Object is on the UP face");
                    //     // PASS
                    // } else if ( objPosition.side === "DOWN" ) {
                    //     console.log("Object is on the DOWN face");
                    //     // PASS
                    // } else {
                    //     console.warn(`Unknown face ${objPosition.side} for object with id ${objPosition.id}`);
                    // }

                    if (objPosition.position.x > this.Size-1 || objPosition.position.y > this.Size-1 || objPosition.position.z > this.Size-1) {
                        throw new Error(`Invalid position for object with id ${objPosition.id}: (${Math.round(fixValueX + objPosition.position.x)}, ${Math.round(fixValueY + objPosition.position.y)}, ${Math.round(fixValueZ + objPosition.position.z)})`);
                    }

                    const X = Number((fixValueX + objPosition.position.x).toFixed(2))
                    const Y = Number((fixValueY + objPosition.position.y).toFixed(2))
                    const Z = Number((fixValueZ + objPosition.position.z).toFixed(2))

                    const Pitch = Math.abs(fixValuePitch + THREE.MathUtils.degToRad(objPosition.rotation.pitch) % 360)
                    const Yaw = Math.abs(fixValueYaw + THREE.MathUtils.degToRad(objPosition.rotation.yaw) % 360)
                    const Roll = Math.abs(fixValueRoll + THREE.MathUtils.degToRad(objPosition.rotation.roll) % 360)

                    console.log(`Object ID: ${objPosition.id}, Side: ${objPosition.side}`);
                    console.log(`Position: (${X}, ${Y}, ${Z})`);
                    console.log(`Pitch: ${Pitch}, Yaw: ${Yaw}, Roll: ${Roll}`);


                    this.Dummy.position.set(
                        X,
                        Y,
                        Z
                    );

                    this.Dummy.rotation.set(
                        Pitch,
                        Yaw,
                        Roll
                    );

                    this.Dummy.updateMatrix();

                    this.InstancedPlaneMesh.setMatrixAt(objPosition.id, this.Dummy.matrix);

                    this.InstancedPlaneMesh.computeBoundingBox();
                }
                this.InstancedPlaneMesh.instanceMatrix.needsUpdate = true; // Add this here
            } else {
                throw new Error("No current animation found, but expected one.");
            }
        }





        this.Controls.update();
        this.Renderer.render(this.Scene, this.Camera);

    }
}


const _CubeApp = new App(4)
