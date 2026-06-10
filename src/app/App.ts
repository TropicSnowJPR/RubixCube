// oxlint-disable no-console
import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Cube } from "./Classes/Cube";
import { Animation } from "./Classes/Animation";
import { AnimationQueue } from "./Classes/AnimationQueue";
import type { Side } from "./Classes/Side";
import type { Direction } from "./Classes/Direction";


class App {
    public readonly Scene: THREE.Scene;
    private readonly Camera: THREE.PerspectiveCamera;
    private readonly Renderer: THREE.WebGLRenderer;
    private readonly Controls: OrbitControls;
    public readonly Size: number;
    private readonly Loader: THREE.TextureLoader;
    public RubiksCube: Cube;
    private readonly InstancedPlaneMesh!: THREE.InstancedMesh;
    private Dummy = new THREE.Object3D();
    private readonly PressedKeys: Record<string, boolean> = {};
    private counter = 0;

    private readonly Atlas: THREE.Texture<HTMLImageElement>;
    private AtlasRows = 2;
    private AtlasCols = 3;
    private LastTime: DOMHighResTimeStamp;
    private AnimationQueue: AnimationQueue;
    private RandomLock = false;
    private readonly WinnerCube: Cube;
    private movesCounter: number;
    private readonly CubeRotationHider: THREE.Mesh;
    private readonly RotationHiderPlaneInner: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>;
    private readonly RotationHiderPlaneOuter: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>;
    private Disabled: boolean;
    private StartupDone: boolean;
    private loginOverlay: HTMLElement;

    constructor(size: number) {

        this.Size = size;
        this.Disabled = true;
        this.StartupDone = false;

        this.Scene = new THREE.Scene();
        this.Camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 20_000);
        this.Renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            precision: "highp"
        });
        this.Controls = new OrbitControls(this.Camera, this.Renderer.domElement);
        this.Loader = new THREE.TextureLoader();

        this.movesCounter = 0

        this.LastTime = performance.now();

        this.Renderer.setSize(window.innerWidth, window.innerHeight);
        this.Renderer.setPixelRatio(window.devicePixelRatio);
        this.Renderer.setAnimationLoop(this.animate.bind(this));

        document.querySelector("#scene-container").append(this.Renderer.domElement)

        this.Camera.position.set((this.Size*3), (this.Size*3), (this.Size*3));
        this.Controls.enableDamping = true;
        this.Controls.enableZoom = false;
        this.Controls.enablePan = false;

        this.CubeRotationHider = new THREE.Mesh(new THREE.BoxGeometry(1 - 0.005, this.Size - 0.005, this.Size - 0.005), new THREE.MeshBasicMaterial({
            color: 0x00_00_00,
            side: THREE.BackSide
        }))

        this.Scene.add(new THREE.AmbientLight(0xFF_FF_FF, 1));
        this.Scene.add(new THREE.HemisphereLight(0xFF_FF_FF, 0xFF_FF_FF, 1));
        const dir = new THREE.DirectionalLight(0xFF_FF_FF, 2);
        dir.position.set(-this.Size, 2 * this.Size, -this.Size);
        this.Scene.add(dir);
        
        this.loginOverlay = document.querySelector('#login-overlay') as HTMLElement

        const image = this.Loader.load("./assets/other/cardinal-points.png");

        const planeSize = 4 * this.Size;
        const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
        const planeMat = new THREE.MeshBasicMaterial({map: image, transparent: true});
        const plane = new THREE.Mesh(planeGeo, planeMat);

        plane.position.set(0, -this.Size, 0);

        this.Scene.add(plane);

        plane.rotation.set(-Math.PI / 2, 0, 0);

        this.Atlas = this.Loader.load("./assets/atlas.png");

        this.Atlas.minFilter = THREE.NearestFilter;
        this.Atlas.magFilter = THREE.NearestFilter;
        // oxlint-disable-next-line no-multi-assign
        this.Atlas.wrapS = this.Atlas.wrapT = THREE.ClampToEdgeWrapping;

        this.AnimationQueue = new AnimationQueue();

        this.RubiksCube = new Cube(this.Size, false); // :))))

        if (this.RubiksCube.state.length !== this.Size ** 3) {
            throw new Error("Cube state length does not match expected length");
        }

        const Dummy = new THREE.Object3D();

        const PlaneGeometry = new THREE.PlaneGeometry(1, 1);


        const InstancedPlaneCount = 6 * this.Size * this.Size;

        const uvOffsets = new Float32Array(InstancedPlaneCount * 2);

        PlaneGeometry.setAttribute("uvOffset", new THREE.InstancedBufferAttribute(uvOffsets, 2));

        this.InstancedPlaneMesh = new THREE.InstancedMesh(PlaneGeometry, new THREE.ShaderMaterial({
            side: THREE.DoubleSide, transparent: true, uniforms: {
                atlas: {value: this.Atlas}, cols: {value: this.AtlasCols}, rows: {value: this.AtlasRows}
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
        }), InstancedPlaneCount);

        this.InstancedPlaneMesh.position.set(0.5, 0.5, 0.5);

        this.Scene.add(this.InstancedPlaneMesh);

        let InstancedPlaneMeshIterator = InstancedPlaneCount - 1;

        const attr = this.InstancedPlaneMesh.geometry.getAttribute("uvOffset") as THREE.InstancedBufferAttribute;

        const sideConfig = {
            NORTH: {
                uv: [1 / this.AtlasCols, 1 / this.AtlasRows] as [number, number],
            }, SOUTH: {
                uv: [2 / this.AtlasCols, 0 / this.AtlasRows] as [number, number],
            }, WEST: {
                uv: [2 / this.AtlasCols, 1 / this.AtlasRows] as [number, number],
            }, EAST: {
                uv: [0, 0] as [number, number],
            }, UP: {
                uv: [1 / this.AtlasCols, 0 / this.AtlasRows] as [number, number],
            }, DOWN: {
                uv: [0 / this.AtlasCols, 1 / this.AtlasRows] as [number, number],
            },
        };

        const TestState = [
            {
                "position": {
                    "x": 0,
                    "y": 0,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORNER",
                "stickers": [
                    {
                        "id": 95,
                        "color": "ORANGE",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 94,
                        "color": "GREEN",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 93,
                        "color": "WHITE",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 1.4041051245834981
            },
            {
                "position": {
                    "x": 1,
                    "y": 0,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 92,
                        "color": "ORANGE",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 91,
                        "color": "WHITE",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    }
                ],
                "id": 1.601180198731511
            },
            {
                "position": {
                    "x": 2,
                    "y": 3,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 90,
                        "color": "ORANGE",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 89,
                        "color": "WHITE",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 3.383015689504605
            },
            {
                "position": {
                    "x": 3,
                    "y": 0,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORNER",
                "stickers": [
                    {
                        "id": 88,
                        "color": "ORANGE",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 87,
                        "color": "BLUE",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 86,
                        "color": "WHITE",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    }
                ],
                "id": 4.606244309792354
            },
            {
                "position": {
                    "x": 0,
                    "y": 0,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 85,
                        "color": "ORANGE",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 84,
                        "color": "GREEN",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 1.9588705059070097
            },
            {
                "position": {
                    "x": 2,
                    "y": 1,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 83,
                        "color": "ORANGE",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    }
                ],
                "id": 3.2894609591281014
            },
            {
                "position": {
                    "x": 2,
                    "y": 2,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 82,
                        "color": "ORANGE",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 3.54586193714123
            },
            {
                "position": {
                    "x": 3,
                    "y": 1,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 81,
                        "color": "ORANGE",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 80,
                        "color": "BLUE",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    }
                ],
                "id": 5.1266929065009705
            },
            {
                "position": {
                    "x": 1,
                    "y": 0,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 79,
                        "color": "ORANGE",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 78,
                        "color": "GREEN",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 3.0974479056820847
            },
            {
                "position": {
                    "x": 1,
                    "y": 2,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 77,
                        "color": "ORANGE",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 4.0505972629110785
            },
            {
                "position": {
                    "x": 1,
                    "y": 3,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 76,
                        "color": "ORANGE",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 4.624109109378426
            },
            {
                "position": {
                    "x": 3,
                    "y": 3,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 75,
                        "color": "ORANGE",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 74,
                        "color": "BLUE",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 6.4367815970777125
            },
            {
                "position": {
                    "x": 3,
                    "y": 0,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORNER",
                "stickers": [
                    {
                        "id": 73,
                        "color": "ORANGE",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 72,
                        "color": "GREEN",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 71,
                        "color": "YELLOW",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 3.8992688070710404
            },
            {
                "position": {
                    "x": 1,
                    "y": 3,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 70,
                        "color": "ORANGE",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 69,
                        "color": "YELLOW",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    }
                ],
                "id": 4.77328288968986
            },
            {
                "position": {
                    "x": 0,
                    "y": 1,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 68,
                        "color": "ORANGE",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    },
                    {
                        "id": 67,
                        "color": "YELLOW",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    }
                ],
                "id": 6.2852616896713736
            },
            {
                "position": {
                    "x": 0,
                    "y": 0,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORNER",
                "stickers": [
                    {
                        "id": 66,
                        "color": "ORANGE",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 65,
                        "color": "BLUE",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 64,
                        "color": "YELLOW",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    }
                ],
                "id": 7.417701737120948
            },
            {
                "position": {
                    "x": 0,
                    "y": 2,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 63,
                        "color": "GREEN",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 62,
                        "color": "WHITE",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 2.0068256789848746
            },
            {
                "position": {
                    "x": 2,
                    "y": 1,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 61,
                        "color": "WHITE",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 2.5089102883361774
            },
            {
                "position": {
                    "x": 1,
                    "y": 0,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 60,
                        "color": "WHITE",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 3.419079373554843
            },
            {
                "position": {
                    "x": 3,
                    "y": 1,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 59,
                        "color": "BLUE",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 58,
                        "color": "WHITE",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    }
                ],
                "id": 4.818178315532198
            },
            {
                "position": {
                    "x": 2,
                    "y": 2,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 57,
                        "color": "GREEN",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    }
                ],
                "id": 2.5600040516803584
            },
            {
                "position": {
                    "x": 2,
                    "y": 1,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORE",
                "stickers": [

                ],
                "id": 3.7350663860427886
            },
            {
                "position": {
                    "x": 1,
                    "y": 1,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORE",
                "stickers": [

                ],
                "id": 5.433234492475297
            },
            {
                "position": {
                    "x": 3,
                    "y": 1,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 56,
                        "color": "BLUE",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    }
                ],
                "id": 6.311873560184403
            },
            {
                "position": {
                    "x": 2,
                    "y": 0,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 55,
                        "color": "GREEN",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 3.648165808867948
            },
            {
                "position": {
                    "x": 2,
                    "y": 1,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORE",
                "stickers": [

                ],
                "id": 5.135774679293064
            },
            {
                "position": {
                    "x": 2,
                    "y": 2,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORE",
                "stickers": [

                ],
                "id": 5.805302521208279
            },
            {
                "position": {
                    "x": 1,
                    "y": 1,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 54,
                        "color": "BLUE",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    }
                ],
                "id": 6.454192725348131
            },
            {
                "position": {
                    "x": 0,
                    "y": 3,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 53,
                        "color": "GREEN",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 52,
                        "color": "YELLOW",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 5.2166456494330395
            },
            {
                "position": {
                    "x": 0,
                    "y": 2,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 51,
                        "color": "YELLOW",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    }
                ],
                "id": 6.774687593156787
            },
            {
                "position": {
                    "x": 3,
                    "y": 2,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 50,
                        "color": "YELLOW",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    }
                ],
                "id": 6.866847195540425
            },
            {
                "position": {
                    "x": 3,
                    "y": 0,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 49,
                        "color": "BLUE",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 48,
                        "color": "YELLOW",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    }
                ],
                "id": 8.151474286151583
            },
            {
                "position": {
                    "x": 0,
                    "y": 3,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 47,
                        "color": "GREEN",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 46,
                        "color": "WHITE",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    }
                ],
                "id": 2.8695192785088945
            },
            {
                "position": {
                    "x": 0,
                    "y": 1,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 45,
                        "color": "WHITE",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    }
                ],
                "id": 3.942131209612734
            },
            {
                "position": {
                    "x": 0,
                    "y": 2,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 44,
                        "color": "WHITE",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    }
                ],
                "id": 5.138744821580434
            },
            {
                "position": {
                    "x": 2,
                    "y": 3,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 43,
                        "color": "BLUE",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    },
                    {
                        "id": 42,
                        "color": "WHITE",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 5.51016203214021
            },
            {
                "position": {
                    "x": 2,
                    "y": 3,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 41,
                        "color": "GREEN",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 4.076586984416427
            },
            {
                "position": {
                    "x": 1,
                    "y": 2,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORE",
                "stickers": [

                ],
                "id": 5.4338584474829625
            },
            {
                "position": {
                    "x": 2,
                    "y": 2,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORE",
                "stickers": [

                ],
                "id": 6.255985014632033
            },
            {
                "position": {
                    "x": 2,
                    "y": 0,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 40,
                        "color": "BLUE",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 6.26120482359044
            },
            {
                "position": {
                    "x": 3,
                    "y": 1,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 39,
                        "color": "GREEN",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    }
                ],
                "id": 5.462420122141905
            },
            {
                "position": {
                    "x": 1,
                    "y": 1,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORE",
                "stickers": [

                ],
                "id": 5.555599480453255
            },
            {
                "position": {
                    "x": 1,
                    "y": 2,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORE",
                "stickers": [

                ],
                "id": 6.9777387732913825
            },
            {
                "position": {
                    "x": 2,
                    "y": 3,
                    "z": 2
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 38,
                        "color": "BLUE",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 7.786911860873681
            },
            {
                "position": {
                    "x": 3,
                    "y": 0,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 37,
                        "color": "GREEN",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 36,
                        "color": "YELLOW",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 6.266559445257831
            },
            {
                "position": {
                    "x": 3,
                    "y": 2,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 35,
                        "color": "YELLOW",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    }
                ],
                "id": 7.309076952670251
            },
            {
                "position": {
                    "x": 1,
                    "y": 2,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 34,
                        "color": "YELLOW",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    }
                ],
                "id": 8.127828168809904
            },
            {
                "position": {
                    "x": 3,
                    "y": 3,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 33,
                        "color": "BLUE",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 32,
                        "color": "YELLOW",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 8.789600600560528
            },
            {
                "position": {
                    "x": 3,
                    "y": 3,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORNER",
                "stickers": [
                    {
                        "id": 31,
                        "color": "RED",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 30,
                        "color": "GREEN",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    },
                    {
                        "id": 29,
                        "color": "WHITE",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    }
                ],
                "id": 3.250852311407476
            },
            {
                "position": {
                    "x": 1,
                    "y": 3,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 28,
                        "color": "RED",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 27,
                        "color": "WHITE",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 5.1572533777419585
            },
            {
                "position": {
                    "x": 2,
                    "y": 0,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 26,
                        "color": "RED",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    },
                    {
                        "id": 25,
                        "color": "WHITE",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 5.827416450631669
            },
            {
                "position": {
                    "x": 3,
                    "y": 3,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORNER",
                "stickers": [
                    {
                        "id": 24,
                        "color": "RED",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 23,
                        "color": "BLUE",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 22,
                        "color": "WHITE",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    }
                ],
                "id": 7.402167558373033
            },
            {
                "position": {
                    "x": 0,
                    "y": 0,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 21,
                        "color": "RED",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 20,
                        "color": "GREEN",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 4.905635464900759
            },
            {
                "position": {
                    "x": 1,
                    "y": 0,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 19,
                        "color": "RED",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 6.646074173977417
            },
            {
                "position": {
                    "x": 1,
                    "y": 1,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 18,
                        "color": "RED",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 6.7552278066556095
            },
            {
                "position": {
                    "x": 3,
                    "y": 2,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 17,
                        "color": "RED",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 16,
                        "color": "BLUE",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    }
                ],
                "id": 8.607569313005218
            },
            {
                "position": {
                    "x": 0,
                    "y": 1,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 15,
                        "color": "RED",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 14,
                        "color": "GREEN",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    }
                ],
                "id": 5.308292400905909
            },
            {
                "position": {
                    "x": 0,
                    "y": 1,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 13,
                        "color": "RED",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    }
                ],
                "id": 6.649972263390134
            },
            {
                "position": {
                    "x": 1,
                    "y": 3,
                    "z": 1
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CENTER",
                "stickers": [
                    {
                        "id": 12,
                        "color": "RED",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 7.641353720354509
            },
            {
                "position": {
                    "x": 3,
                    "y": 2,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 11,
                        "color": "RED",
                        "side": "EAST",
                        "positionOffset": {
                            "x": 0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 10,
                        "color": "BLUE",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 9.252547768316738
            },
            {
                "position": {
                    "x": 0,
                    "y": 3,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORNER",
                "stickers": [
                    {
                        "id": 9,
                        "color": "RED",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 8,
                        "color": "GREEN",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 7,
                        "color": "YELLOW",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 7.280088685340888
            },
            {
                "position": {
                    "x": 0,
                    "y": 2,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 6,
                        "color": "RED",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 5,
                        "color": "YELLOW",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    }
                ],
                "id": 7.428642844208304
            },
            {
                "position": {
                    "x": 2,
                    "y": 0,
                    "z": 3
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "EDGE",
                "stickers": [
                    {
                        "id": 4,
                        "color": "RED",
                        "side": "SOUTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": 0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 0,
                            "roll": 0
                        }
                    },
                    {
                        "id": 3,
                        "color": "YELLOW",
                        "side": "DOWN",
                        "positionOffset": {
                            "x": 0,
                            "y": -0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 9.343382678410492
            },
            {
                "position": {
                    "x": 0,
                    "y": 3,
                    "z": 0
                },
                "rotation": {
                    "pitch": 0,
                    "yaw": 0,
                    "roll": 0
                },
                "type": "CORNER",
                "stickers": [
                    {
                        "id": 2,
                        "color": "RED",
                        "side": "WEST",
                        "positionOffset": {
                            "x": -0.5,
                            "y": 0,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": -90,
                            "roll": 0
                        }
                    },
                    {
                        "id": 1,
                        "color": "BLUE",
                        "side": "NORTH",
                        "positionOffset": {
                            "x": 0,
                            "y": 0,
                            "z": -0.5
                        },
                        "rotationOffset": {
                            "pitch": 0,
                            "yaw": 180,
                            "roll": 0
                        }
                    },
                    {
                        "id": 0,
                        "color": "YELLOW",
                        "side": "UP",
                        "positionOffset": {
                            "x": 0,
                            "y": 0.5,
                            "z": 0
                        },
                        "rotationOffset": {
                            "pitch": -90,
                            "yaw": 0,
                            "roll": 0
                        }
                    }
                ],
                "id": 9.827264359543753
            }
        ]

        this.RubiksCube.setStateFromJSON(TestState)

        for (const state of this.RubiksCube.state) {

            if (state.type === "CORE") {
                continue;
            }

            for (const sticker of state.stickers) {

                const config = sideConfig[sticker.side as keyof typeof sideConfig];

                if (config) {

                    Dummy.position.set(

                        state.position.x + sticker.positionOffset.x - this.Size / 2,

                        state.position.y + sticker.positionOffset.y - this.Size / 2,

                        state.position.z + sticker.positionOffset.z - this.Size / 2

                    );

                    Dummy.rotation.set(

                        THREE.MathUtils.degToRad(sticker.rotationOffset.pitch + state.rotation.pitch),

                        THREE.MathUtils.degToRad(sticker.rotationOffset.yaw + state.rotation.yaw),

                        THREE.MathUtils.degToRad(sticker.rotationOffset.roll + state.rotation.roll)

                    );

                    Dummy.updateMatrix();

                    this.InstancedPlaneMesh.setMatrixAt(sticker.id, Dummy.matrix);
                    this.InstancedPlaneMesh.instanceMatrix.needsUpdate = true;

                    attr.setXY(sticker.id, config.uv[0], config.uv[1]);
                    attr.needsUpdate = true;

                    InstancedPlaneMeshIterator -= 1;

                }


                // if (config) {
                //
                //     const piece = state.position;
                //
                //     Dummy.position.set(piece.x + sticker.positionOffset.x - this.Size / 2, piece.y + sticker.positionOffset.y - this.Size / 2, piece.z + sticker.positionOffset.z - this.Size / 2);
                //
                //     Dummy.rotation.set(THREE.MathUtils.degToRad(sticker.rotationOffset.pitch), THREE.MathUtils.degToRad(sticker.rotationOffset.yaw), THREE.MathUtils.degToRad(sticker.rotationOffset.roll));
                //
                //     Dummy.updateMatrix();
                //
                //     sticker.id = InstancedPlaneMeshIterator
                //
                //     this.InstancedPlaneMesh.setMatrixAt(InstancedPlaneMeshIterator, Dummy.matrix);
                //
                //     this.InstancedPlaneMesh.instanceMatrix.needsUpdate = true;
                //
                //     attr.setXY(InstancedPlaneMeshIterator, config.uv[0], config.uv[1]);
                //
                //     attr.needsUpdate = true;
                //
                //     InstancedPlaneMeshIterator -= 1;
                //
                // }

            }

        }

        const RotationHiderPlaneInnerGeometry = new THREE.PlaneGeometry(this.Size, this.Size)
        const RotationHiderPlaneOuterGeometry = new THREE.PlaneGeometry(this.Size, this.Size)

        const RotationHiderPlaneMaterial = new THREE.MeshBasicMaterial({color: 0x00_00_00, side: THREE.FrontSide});

        this.RotationHiderPlaneInner = new THREE.Mesh(RotationHiderPlaneInnerGeometry, RotationHiderPlaneMaterial);
        this.RotationHiderPlaneOuter = new THREE.Mesh(RotationHiderPlaneOuterGeometry, RotationHiderPlaneMaterial);

        this.RotationHiderPlaneInner.position.set(1, 0, 0);
        this.RotationHiderPlaneOuter.position.set(1, 0, 0);

        this.RotationHiderPlaneInner.rotation.set(0, -Math.PI / 2, 0);
        this.RotationHiderPlaneOuter.rotation.set(0, Math.PI / 2, 0);

        this.Scene.add(this.RotationHiderPlaneInner);
        this.Scene.add(this.RotationHiderPlaneOuter);

        this.PressedKeys = {};

        document.addEventListener("keydown", (event) => {
            this.PressedKeys[event.key.toLowerCase()] = true;
        });

        document.addEventListener("keyup", (event) => {
            this.PressedKeys[event.key.toLowerCase()] = false;
        });

        this.WinnerCube = this.RubiksCube.clone()

        this.Scene.add(this.CubeRotationHider)

    }

    private static formatMs(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        const mm = String(minutes).padStart(2, "0");
        const ss = String(seconds).padStart(2, "0");

        return `${mm}:${ss}`;
    }

    private handleStartup(): void {
        const loginButton = document.querySelector("#login-button");
        const skipLoginButton = document.querySelector("#skip-login-button");

        loginButton.addEventListener("click", async (_) => {
            const usernameInput = document.querySelector("#username-input") as HTMLInputElement;
            const passwordInput = document.querySelector("#password-input") as HTMLInputElement;

            const username = usernameInput.value;
            const password = passwordInput.value;

            if (username && password) {
                const params = new URLSearchParams();

                params.append("username", username);
                params.append("password", password);

                const result = await fetch(
                    "http://127.0.0.1:8000/user/login",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            "Accept": "application/json"
                        },
                        body: params.toString(),
                        credentials: 'include'
                    }
                )

                const data = await result.json();

                if (result.status === 200 && result.ok && data.success) {
                    this.loginOverlay.style.display = 'none';

                    await this.updateUsername()
                    this.Disabled = false;

                }
            }
        })

        skipLoginButton.addEventListener("click", (_) => {
            this.loginOverlay.style.display = 'none';

            this.Disabled = false;
        })
    }

    private animate(): void {

        if (!this.StartupDone) {
            this.handleStartup();
            this.StartupDone = true
        }

        const now = performance.now();
        const delta = ( now - this.LastTime ) / 1000;
        this.LastTime = now;

        const offset = new THREE.Vector3();
        offset.copy(this.Camera.position).sub(this.Controls.target);
        const radius = offset.length();

        let phi = THREE.MathUtils.radToDeg(Math.acos(offset.y / radius));
        let theta = THREE.MathUtils.radToDeg(Math.atan2(offset.z, offset.x));

        let RotationType: Direction = "CLOCKWISE";
        let RotationFace: Side | undefined = undefined;
        let RotationDepth = 1;

        const pads = navigator.getGamepads();
        const pad = pads.find((p): p is Gamepad => p !== null);
        if (pad) {
            const rawXLeft = (pad.axes[0] ?? 0);
            const rawYLeft = (pad.axes[1] ?? 0);

            const PressedButtons = pad.buttons.map((b, i) => b.pressed ? `${i}` : undefined).filter(Boolean);

            for ( const p of PressedButtons ) {
                switch (p) {
                    case "1": {
                        RotationFace = "EAST"
                        break;
                    }
                    case "0": {
                        RotationFace = "NORTH"
                        break;
                    }
                    case "3": {
                        RotationFace = "SOUTH"
                        break;
                    }
                    case "2": {
                        RotationFace = "WEST"
                        break;
                    }
                    case "4": {
                        RotationFace = "UP"
                        break;
                    }
                    case "5": {
                        RotationFace = "DOWN"
                        break;
                    }
                    case "6": {
                        RotationFace = "UP"
                        break;
                    }
                    case "7": {
                        RotationFace = "DOWN"
                        break;
                    }
                    case "9": {
                        if (this.RandomLock === false && !this.Disabled ) {
                            this.addRandomAnimations(100, 0.05);
                            this.RandomLock = true;
                        }
                        break;
                    }
                    case "13": {
                        RotationType = "COUNTERCLOCKWISE";
                        break;
                    }
                    default: {
                        console.debug(`Button ${p} pressed`)
                    }
                }
            }

            theta -= Math.round(rawXLeft * 100) * 0.025
            phi += Math.round(rawYLeft * 100) * 0.025
        }

        if (phi >= 179) {
            phi = 179
        } else if (phi <= 1) {
            phi = 1
        }

        this.Camera.position.x = radius * Math.sin(THREE.MathUtils.degToRad(phi)) * Math.cos(THREE.MathUtils.degToRad(theta));
        this.Camera.position.y = radius * Math.cos(THREE.MathUtils.degToRad(phi));
        this.Camera.position.z = radius * Math.sin(THREE.MathUtils.degToRad(phi)) * Math.sin(THREE.MathUtils.degToRad(theta));

        this.Camera.lookAt(0, 0, 0);

        if (this.PressedKeys["r"] && this.RandomLock === false && !this.Disabled ) {
            this.addRandomAnimations(Math.floor(Math.random() * 100) + 100, 0.05);
            this.RandomLock = true;
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

        if ((RotationFace && RotationType) && (RotationFace === "UP" || RotationFace === "DOWN")) {
            if (RotationType === "COUNTERCLOCKWISE") {
                RotationType = "CLOCKWISE";
            } else if (RotationType === "CLOCKWISE") {
                RotationType = "COUNTERCLOCKWISE";
            }
        }

        const RubiksCubeCopy = this.RubiksCube.clone()

        const time = 0.3

        if ( RotationFace && this.counter <= 0 && !this.Disabled ) {

            this.AnimationQueue.addAnimation(
                new Animation(
                    RubiksCubeCopy,
                    RotationFace,
                    RotationDepth,
                    90,
                    RotationType,
                    time,
                    this.Size,
                    this.Scene
                )
            );

            this.RubiksCube.rotateLayer(
                RotationFace,
                RotationDepth - 1,
                RotationType
            );

            if ( this.RubiksCube.isSolvedLike(this.WinnerCube) ) {
                console.debug( "Congratulations, you solved the cube!" );
                this.movesCounter = 0
            } else {
                this.movesCounter += 1
            }

            const moveElement = document.querySelector("#stat-moves")
            moveElement.textContent = String(this.movesCounter)

            this.counter = Number.parseInt((time * 60).toFixed(0), 10)

        }

        this.counter -= 1;

        const currentAnimation = this.AnimationQueue.getCurrentAnimation()

        if ( currentAnimation ) {

            const objPositionList = currentAnimation.update( delta );

            if ( currentAnimation.side === "UP" ) {

                this.CubeRotationHider.position.set( 0, this.Size / 2 - currentAnimation.depth + 0.5, 0 )
                this.CubeRotationHider.rotation.set( 0, THREE.MathUtils.degToRad( objPositionList[1].rotation.yaw ), -Math.PI / 2 )

                if (currentAnimation.depth > 1) {
                    this.RotationHiderPlaneInner.position.set( 0, this.Size / 2 - currentAnimation.depth + 1 - 0.0001, 0 )
                    this.RotationHiderPlaneInner.rotation.set( Math.PI / 2, 0, 0 )
                } else {
                    this.RotationHiderPlaneInner.position.set( 1_000_000, 1_000_000, 1_000_000 )
                }

                this.RotationHiderPlaneOuter.position.set( 0, this.Size / 2 - currentAnimation.depth + 0.0001, 0 )
                this.RotationHiderPlaneOuter.rotation.set( -Math.PI / 2, 0, 0 )


            } else if ( currentAnimation.side === "DOWN" ) {

                this.CubeRotationHider.position.set( 0, currentAnimation.depth - this.Size / 2 - 0.5, 0 )
                this.CubeRotationHider.rotation.set( 0, THREE.MathUtils.degToRad( objPositionList[1].rotation.yaw ), Math.PI / 2 )

                if (currentAnimation.depth > 1) {
                    this.RotationHiderPlaneInner.position.set( 0, currentAnimation.depth - this.Size / 2 - 1 - 0.0001, 0 )
                    this.RotationHiderPlaneInner.rotation.set( -Math.PI / 2, 0, 0 )
                } else {
                    this.RotationHiderPlaneInner.position.set( 1_000_000, 1_000_000, 1_000_000 )
                }

                this.RotationHiderPlaneOuter.position.set( 0, currentAnimation.depth - this.Size / 2 + 0.0001, 0 )
                this.RotationHiderPlaneOuter.rotation.set( Math.PI / 2, 0, 0 )


            } else if ( currentAnimation.side === "SOUTH" ) {

                this.CubeRotationHider.position.set( 0, 0, this.Size / 2 - currentAnimation.depth + 0.5 )
                this.CubeRotationHider.rotation.set( - Math.PI / 2, - THREE.MathUtils.degToRad( objPositionList[6].rotation.yaw ), - Math.PI / 2 )

                if (currentAnimation.depth > 1) {
                    this.RotationHiderPlaneInner.position.set( 0, 0, this.Size / 2 - currentAnimation.depth + 1 - 0.0001 )
                    this.RotationHiderPlaneInner.rotation.set( Math.PI, 0, 0 )
                } else {
                    this.RotationHiderPlaneInner.position.set( 1_000_000, 1_000_000, 1_000_000 )
                }

                this.RotationHiderPlaneOuter.position.set( 0, 0, this.Size / 2 - currentAnimation.depth + 0.0001 )
                this.RotationHiderPlaneOuter.rotation.set( 0, 0, 0 )


            } else if ( currentAnimation.side === "NORTH" ) {

                this.CubeRotationHider.position.set( 0, 0, currentAnimation.depth - this.Size / 2 -  0.5 )
                this.CubeRotationHider.rotation.set( - Math.PI / 2, - THREE.MathUtils.degToRad( objPositionList[6].rotation.yaw ), - Math.PI / 2 )

                if (currentAnimation.depth > 1) {
                    this.RotationHiderPlaneInner.position.set( 0, 0, currentAnimation.depth - this.Size / 2 - 1 - 0.0001 )
                    this.RotationHiderPlaneInner.rotation.set( 0, 0, 0 )
                } else {
                    this.RotationHiderPlaneInner.position.set( 1_000_000, 1_000_000, 1_000_000 )
                }

                this.RotationHiderPlaneOuter.position.set( 0, 0, currentAnimation.depth - this.Size / 2 + 0.0001 )
                this.RotationHiderPlaneOuter.rotation.set( Math.PI, 0, 0 )


            } else if ( currentAnimation.side === "EAST" ) {

                this.CubeRotationHider.position.set( this.Size / 2 - currentAnimation.depth + 0.5, 0, 0 )
                this.CubeRotationHider.rotation.set( THREE.MathUtils.degToRad( objPositionList[1].rotation.pitch ), 0, 0 )

                if (currentAnimation.depth > 1) {
                    this.RotationHiderPlaneInner.position.set( this.Size / 2 - currentAnimation.depth + 1 - 0.0001, 0, 0 )
                    this.RotationHiderPlaneInner.rotation.set( 0, -Math.PI / 2, -Math.PI / 2 )
                } else {
                    this.RotationHiderPlaneInner.position.set( 1_000_000, 1_000_000, 1_000_000 )
                }

                this.RotationHiderPlaneOuter.position.set( this.Size / 2 - currentAnimation.depth + 0.0001, 0, 0 )
                this.RotationHiderPlaneOuter.rotation.set( 0, Math.PI / 2, -Math.PI / 2 )


            } else if ( currentAnimation.side === "WEST" ) {

                this.CubeRotationHider.position.set( currentAnimation.depth - this.Size / 2 -  0.5, 0, 0 )
                this.CubeRotationHider.rotation.set( THREE.MathUtils.degToRad( objPositionList[1].rotation.pitch ), 0, 0 )

                if (currentAnimation.depth > 1) {
                    this.RotationHiderPlaneInner.position.set( currentAnimation.depth - this.Size / 2 - 1 - 0.0001, 0, 0 )
                    this.RotationHiderPlaneInner.rotation.set( 0, Math.PI / 2, -Math.PI / 2 )
                } else {
                    this.RotationHiderPlaneInner.position.set( 1_000_000, 1_000_000, 1_000_000 )
                }

                this.RotationHiderPlaneOuter.position.set( currentAnimation.depth - this.Size / 2 + 0.0001, 0, 0 )
                this.RotationHiderPlaneOuter.rotation.set( 0, -Math.PI / 2, -Math.PI / 2 )


            }

            if ( objPositionList ) {

                for ( const objPosition of objPositionList ) {


                    const X = Number((objPosition.position.x - this.Size / 2));
                    const Y = Number((objPosition.position.y - this.Size / 2));
                    const Z = Number((objPosition.position.z - this.Size / 2));

                    const Pitch = THREE.MathUtils.degToRad( objPosition.rotation.pitch );
                    const Yaw = THREE.MathUtils.degToRad( objPosition.rotation.yaw );
                    const Roll = THREE.MathUtils.degToRad( objPosition.rotation.roll );

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



                    this.Dummy.updateMatrix( );

                    this.InstancedPlaneMesh.setMatrixAt( objPosition.id, this.Dummy.matrix );

                    this.InstancedPlaneMesh.computeBoundingBox( );
                }

                this.InstancedPlaneMesh.instanceMatrix.needsUpdate = true;

            } else {

                throw new Error( "No current animation found, but expected one." );

            }
        }

        this.Controls.update( );
        this.Renderer.render( this.Scene, this.Camera );

    }

    private addRandomAnimations(count = 100, duration = 0.05): void {
        const sides: Side[] = ["NORTH", "SOUTH", "EAST", "WEST", "UP", "DOWN"];
        const directions: Direction[] = ["CLOCKWISE", "COUNTERCLOCKWISE"];
        const maxDepth = Math.max(1, Math.floor(this.Size / 2));

        for (let i = 0; i < count; i += 1) {
            const side = sides[Math.floor(Math.random() * sides.length)];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const depth = 1 + Math.floor(Math.random() * maxDepth);

            this.movesCounter = 0

            const moveElement = document.querySelector("#stat-moves")
            moveElement.textContent = String(this.movesCounter)


            this.AnimationQueue.addAnimation(
                new Animation(
                    this.RubiksCube.clone(),
                    side,
                    depth,
                    90,
                    direction,
                    duration,
                    this.Size,
                    this.Scene
                )
            );

            this.RubiksCube.rotateLayer(side, depth - 1, direction);
        }

        console.log(JSON.stringify(this.RubiksCube.state))

    }

    async updateScoreboard(): Promise<void> {
        const params = new URLSearchParams();
        params.append('cube_size', String(this.Size));

        const response = await fetch('http://127.0.0.1:8000/score/best', {
            method: 'POST',
            // Use the correct content‑type for Form()
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params.toString(),
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch scoreboard');
        }

        const data = await response.json();

        const scoreboard = document.querySelector("#leaderboard-body");

        for (const score of data.scores) {
            const trelement = document.createElement("tr");
            const td1 = document.createElement("td");
            td1.innerHTML = score.username.toString();
            trelement.append(td1);
            const td2 = document.createElement("td");
            td2.innerHTML = score.moves.toString();
            trelement.append(td2);
            const td3 = document.createElement("td");
            trelement.append(td3);
            td3.innerHTML = App.formatMs(score.solve_time_ms).toString();
            scoreboard.append(trelement)
        }
    }

    async updateUsername(): Promise<void> {
        const params = new URLSearchParams();

        const response = await fetch('http://127.0.0.1:8000/me', {
            method: 'POST',
            // Use the correct content‑type for Form()
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params.toString(),
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error('Failed to fetch scoreboard');
        }

        const data = await response.json();

        const username = document.querySelector("#profile-name");

        if (!data.username) {
            return
        }

        this.loginOverlay.style.display = 'none';

        username.textContent = data.username;

        const result = await fetch('http://127.0.0.1:8000/score/best/me', {
            method: 'POST', headers: {
                'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json'
            }, body: params.toString(), credentials: 'include'
        })

        const json = await result.json();

        if (json.success) {
            document.querySelector('#profile-best-time').innerHTML = App.formatMs(json.best_time);
        }

        this.Disabled = false;

    }

}

const CubeApp = new App( 4 )
console.log( "CubeApp:", CubeApp );
await CubeApp.updateUsername()
await CubeApp.updateScoreboard()


