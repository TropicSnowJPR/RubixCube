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
    public RubiksCube: Cube;
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

        this.RubiksCube = new Cube(this.Size); // :))))

        if (this.RubiksCube.state.length !== this.Size ** 3) {
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
                side: THREE.FrontSide,
                transparent: true,
                uniforms: {
                    atlas: { value: this.Atlas },
                    cols: { value: this.AtlasCols },
                    rows: { value: this.AtlasRows }
                },

                vertexShader: `
                    attribute vec2 uvOffset;
                
                    varying vec2 vUv;
                    varying vec2 vUvOffset;
                
                    void main() {
                        vUv = uv;
                        vUvOffset = uvOffset;
                
                        gl_Position =
                            projectionMatrix *
                            modelViewMatrix *
                            instanceMatrix *
                            vec4(position, 1.0);
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
                  
                        vec4 color = texture2D(atlas, uv);
                        if (color.a < 0.1) discard;
                  
                        gl_FragColor = color;
                    }
                `
            }),
            InstancedPlaneCount
        );

        this.InstancedPlaneMesh.position.set(0.5, 0.5, 0.5);

        this.Scene.add(this.InstancedPlaneMesh);

        let InstancedPlaneMeshIterator = InstancedPlaneCount - 1;

        const attr = this.InstancedPlaneMesh.geometry.getAttribute(
            "uvOffset"
        ) as THREE.InstancedBufferAttribute;

        for (const state of this.RubiksCube.state) {

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
        const delta = (now - this.LastTime) / 1000;
        this.LastTime = now;

        let RotationType: "CLOCKWISE" | "COUNTERCLOCKWISE" = "CLOCKWISE";
        let RotationFace: "NORTH" | "EAST" | "WEST" | "SOUTH" | "UP" | "DOWN" | undefined = undefined;
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
                if (i > Math.floor(this.Size / 2)) {
                    break;
                }
                RotationDepth = i;
                break;
            }
        }

        const RubiksCubeCopy = this.RubiksCube.clone()

        if (RotationFace && this.counter <= 0) {
            this.AnimationQueue.addAnimation(
                new Animation(RubiksCubeCopy ,RotationFace, RotationDepth, 90, RotationType, 1, this.Size)
            );
            this.RubiksCube.rotateLayer(RotationFace, RotationDepth - 1, RotationType);
            this.counter = 30
        }
        this.counter -= 1;

        const currentAnimation = this.AnimationQueue.getCurrentAnimation()


        if (currentAnimation) {
            const objPositionList = currentAnimation.update(delta);
            if (objPositionList) {
                for (const objPosition of objPositionList) {



                    const SIDE_CONFIGS: Record<
                        "NORTH" | "SOUTH" | "EAST" | "WEST" | "UP" | "DOWN",
                        Partial<
                            Record<
                                "NORTH" | "SOUTH" | "EAST" | "WEST" | "UP" | "DOWN",
                                {
                                    pos: [number, number, number];
                                    rot: [number, number, number];
                                }
                            >
                        >
                    > = {
                        SOUTH: {
                            SOUTH: { pos: [0, 0, -0.5], rot: [0, Math.PI, 0] },
                            WEST:  { pos: [0.5, 0, 0], rot: [0, Math.PI / 2, 0] },
                            EAST:  { pos: [-0.5, 0, 0], rot: [0, -Math.PI / 2, 0] },
                            UP:    { pos: [0, -0.5, 0], rot: [Math.PI / 2, 0, 0] },
                            DOWN:  { pos: [0, 0.5, 0], rot: [-Math.PI / 2, 0, 0] },
                        },

                        NORTH: {
                            NORTH: { pos: [0, 0, 0.5], rot: [0, 0, 0] },
                            WEST:  { pos: [0.5, 0, 0], rot: [0, Math.PI / 2, 0] },
                            EAST:  { pos: [-0.5, 0, 0], rot: [0, -Math.PI / 2, 0] },
                            UP:    { pos: [0, -0.5, 0], rot: [Math.PI / 2, 0, 0] },
                            DOWN:  { pos: [0, 0.5, 0], rot: [-Math.PI / 2, 0, 0] },
                        },

                        WEST: {
                            SOUTH: { pos: [0, 0, -0.5], rot: [Math.PI / 2, 0, 0] },
                            NORTH: { pos: [0, 0, 0.5], rot: [-Math.PI / 2, 0, 0] },
                            WEST:  { pos: [-0.5, 0, 0], rot: [0, -Math.PI / 2, 0] },
                            UP:    { pos: [0, 0.5, 0], rot: [Math.PI, 0, 0] },
                            DOWN:  { pos: [0, -0.5, 0], rot: [0, 0, 0] },
                        },

                        EAST: {
                            SOUTH: { pos: [0, 0, -0.5], rot: [-Math.PI / 2, 0, 0] },
                            NORTH: { pos: [0, 0, 0.5], rot: [Math.PI / 2, 0, 0] },
                            EAST:  { pos: [0.5, 0, 0], rot: [0, Math.PI / 2, 0] },
                            UP:    { pos: [0, 0.5, 0], rot: [0, 0, Math.PI / 2] },
                            DOWN:  { pos: [0, -0.5, 0], rot: [0, Math.PI, 0] },
                        },

                        UP: {
                            SOUTH: { pos: [0, 0, 0.5], rot: [0, 0, 0] },
                            NORTH: { pos: [0, 0, -0.5], rot: [0, Math.PI, 0] },
                            WEST:  { pos: [0.5, 0, 0], rot: [0, Math.PI / 2, 0] },
                            EAST:  { pos: [-0.5, 0, 0], rot: [0, -Math.PI / 2, 0] },
                            UP:    { pos: [0, 0.5, 0], rot: [-Math.PI / 2, 0, 0] },
                        },

                        DOWN: {
                            SOUTH: { pos: [0, 0, -0.5], rot: [0, Math.PI, 0] },
                            NORTH: { pos: [0, 0, 0.5], rot: [0, 0, 0] },
                            WEST:  { pos: [-0.5, 0, 0], rot: [0, -Math.PI / 2, 0] },
                            EAST:  { pos: [0.5, 0, 0], rot: [0, Math.PI / 2, 0] },
                            DOWN:  { pos: [0, -0.5, 0], rot: [Math.PI / 2, 0, 0] },
                        },
                    };

                    const sideConfig = SIDE_CONFIGS[currentAnimation.side];




                    const config = sideConfig[objPosition.side as keyof typeof sideConfig];

                    const X = Number((objPosition.position.x + config.pos[0] - this.Size / 2));
                    const Y = Number((objPosition.position.y + config.pos[1] - this.Size / 2));
                    const Z = Number((objPosition.position.z + config.pos[2] - this.Size / 2));


                    const Pitch = config.rot[0] + THREE.MathUtils.degToRad(objPosition.rotation.pitch);
                    const Yaw = config.rot[1] + THREE.MathUtils.degToRad(objPosition.rotation.yaw);
                    const Roll = config.rot[2] + THREE.MathUtils.degToRad(objPosition.rotation.roll);


                    if (objPosition.side !== currentAnimation.side) {
                        console.log(`Object ID: ${objPosition.id}, Side: ${objPosition.side}`);
                        console.log(`Position: (${X}, ${Y}, ${Z})`);
                        console.log(`Pitch: ${Pitch}, Yaw: ${Yaw}, Roll: ${Roll}`);
                    }

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
