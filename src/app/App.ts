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

    constructor(

        size: number

    ) {

        this.Size = size;

        this.Scene = new THREE.Scene();
        this.Camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 20_000 );
        this.Renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true, powerPreference: "high-performance", precision: "highp" } );
        this.Controls = new OrbitControls( this.Camera, this.Renderer.domElement );
        this.Loader = new THREE.TextureLoader();

        this.movesCounter = 0

        this.LastTime = performance.now();

        this.Renderer.setSize( window.innerWidth, window.innerHeight );
        this.Renderer.setPixelRatio( window.devicePixelRatio );
        this.Renderer.setAnimationLoop( this.animate.bind(this) );

        document.body.append( this.Renderer.domElement );

        this.Camera.position.set( ( this.Size ), ( this.Size ), ( this.Size ) );
        this.Controls.enableDamping = true;
        this.Controls.enableZoom = false;
        this.Controls.enablePan = false;

        this.CubeRotationHider = new THREE.Mesh(new THREE.BoxGeometry(1-0.005, this.Size-0.005, this.Size-0.005), new THREE.MeshBasicMaterial({ color: 0x00_00_00, side: THREE.BackSide}) )

        this.Scene.add( new THREE.AmbientLight( 0xFF_FF_FF, 1 ) );
        this.Scene.add( new THREE.HemisphereLight( 0xFF_FF_FF, 0xFF_FF_FF, 1 ) );
        const dir = new THREE.DirectionalLight( 0xFF_FF_FF, 2 );
        dir.position.set( -this.Size, 2*this.Size, -this.Size );
        this.Scene.add( dir );

        const image = this.Loader.load("./assets/other/cardinal-points.png");

        const planeSize = 3 * this.Size;
        const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
        const planeMat = new THREE.MeshBasicMaterial({ map: image, transparent: true });
        const plane = new THREE.Mesh(planeGeo, planeMat);

        plane.position.set(0, -1.5 * this.Size, 0);

        this.Scene.add(plane);

        plane.rotation.set(- Math.PI / 2, 0, 0);

        this.Atlas = this.Loader.load( "./assets/atlas.png" );

        this.Atlas.minFilter = THREE.NearestFilter;
        this.Atlas.magFilter = THREE.NearestFilter;
        // oxlint-disable-next-line no-multi-assign
        this.Atlas.wrapS = this.Atlas.wrapT = THREE.ClampToEdgeWrapping;

        this.AnimationQueue = new AnimationQueue();

        this.RubiksCube = new Cube( this.Size, false); // :))))

        if ( this.RubiksCube.state.length !== this.Size ** 3 ) {
            throw new Error( "Cube state length does not match expected length" );
        }

        const Dummy = new THREE.Object3D();

        const PlaneGeometry = new THREE.PlaneGeometry( 1, 1 );


        const InstancedPlaneCount = 6 * this.Size * this.Size;

        const uvOffsets = new Float32Array( InstancedPlaneCount * 2 );

        PlaneGeometry.setAttribute(
            "uvOffset",
            new THREE.InstancedBufferAttribute( uvOffsets, 2 )
        );

        this.InstancedPlaneMesh = new THREE.InstancedMesh(

            PlaneGeometry,
            new THREE.ShaderMaterial({
                side: THREE.DoubleSide,
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

        this.InstancedPlaneMesh.position.set( 0.5, 0.5, 0.5 );

        this.Scene.add( this.InstancedPlaneMesh );

        let InstancedPlaneMeshIterator = InstancedPlaneCount - 1;

        const attr = this.InstancedPlaneMesh.geometry.getAttribute(
            "uvOffset"
        ) as THREE.InstancedBufferAttribute;

        const sideConfig = {
            NORTH: {
                uv:     [ 1 / this.AtlasCols, 1 / this.AtlasRows ] as [ number, number ],
            }, SOUTH: {
                uv:     [ 2 / this.AtlasCols, 0 / this.AtlasRows ] as [ number, number ],
            }, WEST: {
                uv:     [ 2 / this.AtlasCols, 1 / this.AtlasRows ] as [ number, number ],
            }, EAST: {
                uv:     [ 0, 0 ] as [ number, number ],
            }, UP: {
                uv:     [ 1 / this.AtlasCols, 0 / this.AtlasRows ] as [ number, number ],
            }, DOWN: {
                uv:     [ 0 / this.AtlasCols, 1 / this.AtlasRows ] as [ number, number ],
            },
        };

        for ( const state of this.RubiksCube.state ) {

            if ( state.type === "CORE" ) {
                continue;
            }

            for ( const sticker of state.stickers ) {

                const config = sideConfig[ sticker.side as keyof typeof sideConfig ];

                if (config) {

                    const piece = state.position;

                    Dummy.position.set(
                        piece.x + sticker.positionOffset.x - this.Size / 2,
                        piece.y + sticker.positionOffset.y - this.Size / 2,
                        piece.z + sticker.positionOffset.z - this.Size / 2
                    );

                    Dummy.rotation.set(
                        THREE.MathUtils.degToRad(sticker.rotationOffset.pitch),
                        THREE.MathUtils.degToRad(sticker.rotationOffset.yaw),
                        THREE.MathUtils.degToRad(sticker.rotationOffset.roll)
                    );

                    Dummy.updateMatrix();

                    sticker.id = InstancedPlaneMeshIterator

                    this.InstancedPlaneMesh.setMatrixAt( InstancedPlaneMeshIterator, Dummy.matrix );

                    this.InstancedPlaneMesh.instanceMatrix.needsUpdate = true;

                    attr.setXY( InstancedPlaneMeshIterator, config.uv[ 0 ], config.uv[ 1 ] );

                    attr.needsUpdate = true;

                    InstancedPlaneMeshIterator -= 1;

                }

            }

        }

        const RotationHiderPlaneInnerGeometry = new THREE.PlaneGeometry( this.Size, this.Size )
        const RotationHiderPlaneOuterGeometry = new THREE.PlaneGeometry( this.Size, this.Size )

        const RotationHiderPlaneMaterial = new THREE.MeshBasicMaterial( { color: 0x00_00_00, side: THREE.FrontSide } );

        this.RotationHiderPlaneInner = new THREE.Mesh( RotationHiderPlaneInnerGeometry, RotationHiderPlaneMaterial );
        this.RotationHiderPlaneOuter = new THREE.Mesh( RotationHiderPlaneOuterGeometry, RotationHiderPlaneMaterial );

        this.RotationHiderPlaneInner.position.set( 1, 0, 0 );
        this.RotationHiderPlaneOuter.position.set( 1, 0, 0 );

        this.RotationHiderPlaneInner.rotation.set( 0, -Math.PI / 2, 0 );
        this.RotationHiderPlaneOuter.rotation.set( 0, Math.PI / 2, 0 );

        this.Scene.add(this.RotationHiderPlaneInner);
        this.Scene.add(this.RotationHiderPlaneOuter);

        this.PressedKeys = {};

        document.addEventListener( "keydown", (event) => {
            this.PressedKeys[ event.key.toLowerCase( ) ] = true;
        });

        document.addEventListener( "keyup", (event) => {
            this.PressedKeys[ event.key.toLowerCase( ) ] = false;
        });

        this.WinnerCube = this.RubiksCube.clone()

        this.Scene.add(this.CubeRotationHider)

    }

    private animate(): void {

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
                        if (this.RandomLock === false) {
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

        if (this.PressedKeys["r"] && this.RandomLock === false) {
            this.addRandomAnimations(100, 0.05);
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

        if ( RotationFace && this.counter <= 0 ) {

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

            const moveElement = document.querySelector("#move-count")
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
    }

}

const CubeApp = new App( 4 )
console.log( "CubeApp:", CubeApp );