import {Cube} from "./Cube/Cube";
import {
    AmbientLight,
    DirectionalLight,
    HemisphereLight,
    Matrix3,
    PerspectiveCamera,
    Raycaster,
    Scene,
    SRGBColorSpace,
    Vector2,
    Vector3,
    WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import type {Direction} from "./Cube/HelperClasses/Direction";
import type {Side} from "./Cube/HelperClasses/Side";
import Stats from 'three/examples/jsm/libs/stats.module'
import {OutputPass} from "three/examples/jsm/postprocessing/OutputPass";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";
import {FXAAShader} from "three/examples/jsm/shaders/FXAAShader";
import {OutlinePass} from "three/examples/jsm/postprocessing/OutlinePass";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";

class App {
    private readonly Scene: Scene;
    private readonly Camera: PerspectiveCamera;
    private Controls: OrbitControls;
    private readonly Renderer: WebGLRenderer;
    private Cube: Cube;

    private readonly Size: number

    private readonly PressedKeys: Record<string, boolean>;
    private Counter = 0;
    private RandomLock = false;
    private readonly Center: Vector3;
    private stats: Stats;

    private fps = 0;
    private lastTime = performance.now();
    private frames = 0;
    private Composer: EffectComposer;
    private Raycaster: Raycaster;
    private readonly Mouse: Vector2;
    private readonly OutlinePass: OutlinePass;
    private SelectedFace: "UP" | "DOWN" | "NORTH" | "SOUTH" | "EAST" | "WEST";
    private SelectedDepth = 0;
    
    constructor() {

        const raw = localStorage.getItem("size");
        const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10);

        this.Size = Number.isFinite(parsed) ? parsed : 3;

        this.Renderer = new WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            precision: "highp",
        });
        this.Renderer.setSize(window.innerWidth, window.innerHeight);
        this.Renderer.setPixelRatio(window.devicePixelRatio);
        this.Renderer.setAnimationLoop(this.animate.bind(this));
        this.Renderer.outputColorSpace = SRGBColorSpace;

        document.querySelector("#scene-container").append(this.Renderer.domElement);
        
        this.stats = new Stats()
        document.body.append(this.stats.dom)
        this.stats.showPanel(1)

        this.Scene = new Scene();

        this.Camera = new PerspectiveCamera(
            30,
            window.innerWidth / window.innerHeight,
            0.1,
            10_000,
        );

        this.Composer = new EffectComposer(this.Renderer);

        this.Composer.addPass(new RenderPass(this.Scene, this.Camera));

        this.OutlinePass = new OutlinePass(new Vector2(window.innerWidth, window.innerHeight), this.Scene, this.Camera)
        this.OutlinePass.visibleEdgeColor.set('#ffffff');
        this.OutlinePass.hiddenEdgeColor.set('#ffffff');
        this.OutlinePass.edgeStrength = 3;
        this.OutlinePass.edgeThickness = 1;
        this.OutlinePass.edgeGlow = 0;
        this.OutlinePass.pulsePeriod = 0;

        this.Composer.addPass(this.OutlinePass);
        this.Composer.addPass(new OutputPass());
        this.Composer.addPass(new ShaderPass(FXAAShader));

        this.Raycaster = new Raycaster();
        this.Mouse = new Vector2();

        this.Controls = new OrbitControls(
            this.Camera,
            this.Renderer.domElement,
        );

        this.Cube = new Cube(this.Size);

        this.Camera.position.set(this.Size * 3, this.Size * 3, this.Size * 3);

        this.Center = new Vector3(
            this.Size / 2 - 0.5,
            this.Size / 2 - 0.5,
            this.Size / 2 - 0.5,
        );

        this.Controls.target.copy(this.Center);

        this.Controls.update();

        this.Controls.enableDamping = true;
        this.Controls.enableZoom = false;
        this.Controls.enablePan = false;
        this.Controls.dampingFactor = 0.05;

        this.Scene.add(new AmbientLight(0xFF_FF_FF, 1));

        this.Scene.add(new HemisphereLight(0xFF_FF_FF, 0xFF_FF_FF, 2));

        const dir = new DirectionalLight(0xFF_FF_FF, 1);

        dir.position.set(-this.Size, 2 * this.Size, -this.Size);

        this.Scene.add(dir);

        for (const Element of this.Cube.getPieces()) {
            this.Scene.add(Element.getThreeJSElement());
        }

        this.PressedKeys = {};

        document.addEventListener("keydown", (event) => {
            this.PressedKeys[event.key.toLowerCase()] = true;
        });

        document.addEventListener("keyup", (event) => {
            this.PressedKeys[event.key.toLowerCase()] = false;
        });

        this.Renderer.domElement.addEventListener("pointermove", (event) => {
            this.Mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.Mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });

        this.Renderer.domElement.addEventListener("click", (_) => {
            if (this.SelectedFace !== undefined && this.SelectedDepth !== undefined) {
                this.Cube.rotateFace(this.SelectedFace, this.SelectedDepth, "CLOCKWISE", 0.2);
            }
        })

        this.Renderer.domElement.addEventListener("contextmenu", (event) => {
            event.preventDefault()
            if (this.SelectedFace !== undefined && this.SelectedDepth !== undefined) {
                this.Cube.rotateFace(this.SelectedFace, this.SelectedDepth, "COUNTERCLOCKWISE", 0.2);

            }
        })

        this.Renderer.domElement.addEventListener("wheel", (event) => {
            const direction = Math.sign(event.deltaY);

            if (direction < 0) {
                if (this.SelectedDepth < this.Size - 1) {
                    this.SelectedDepth += 1;
                }
            } else if (direction > 0) {
                if (this.SelectedDepth > 0) {
                    this.SelectedDepth -= 1;
                }
            }
        });


    }

    private getFace(): void {
        this.Raycaster.setFromCamera(this.Mouse, this.Camera);

        const intersects = this.Raycaster.intersectObject(this.Scene, true);

        if (intersects.length === 0) {
            this.OutlinePass.selectedObjects = [];
            return;
        }

        const hit = intersects[0];

        const normal = hit.face?.normal.clone();

        hit.object.updateMatrixWorld(true);

        const worldNormal = normal.applyNormalMatrix(
            new Matrix3().getNormalMatrix(hit.object.matrixWorld)
        ).normalize();

        const worldPos = new Vector3();
        hit.object.getWorldPosition(worldPos);

        const localNormal = worldNormal.clone();

        const cubeUp = new Vector3(0, 1, 0);
        const cubeDown = new Vector3(0, -1, 0);
        const cubeNorth = new Vector3(0, 0, -1);
        const cubeSouth = new Vector3(0, 0, 1);
        const cubeEast = new Vector3(1, 0, 0);
        const cubeWest = new Vector3(-1, 0, 0);

        const FACE_VECTORS = {
            UP: cubeUp,
            DOWN: cubeDown,
            NORTH: cubeNorth,
            SOUTH: cubeSouth,
            EAST: cubeEast,
            WEST: cubeWest,
        } as const;

        let bestFace: keyof typeof FACE_VECTORS | undefined = undefined
        let bestScore = -Infinity;

        for (const [name, dir] of Object.entries(FACE_VECTORS) as [keyof typeof FACE_VECTORS, Vector3][]) {

            const score = localNormal.dot(dir);

            if (score > bestScore) {
                bestScore = score;
                bestFace = name;
            }
        }

        if (!bestFace) { return; }

        this.SelectedFace = bestFace;
    }

    private animate(): void {

        let RotationType: Direction = "CLOCKWISE";
        let RotationFace: Side | undefined = undefined;
        let RotationDepth = 1;

        if (this.PressedKeys["r"] && this.RandomLock === false) {
            this.addRandomAnimations(
                Math.floor(Math.random() * 100) + 100, 0.01,
            );
            this.RandomLock = true;
        }

        if (this.PressedKeys["l"]) {
            for (let i = 1; i <= 10; i += 1) {
                if (this.PressedKeys[i.toString()]) {
                    localStorage.setItem("size", String(i))
                    location.reload();
                }
            }
        }

        if (this.PressedKeys["x"]) {
            RotationType = "COUNTERCLOCKWISE";
        }

        if ( this.PressedKeys["q"] ) {
            RotationFace = "UP";
        } else if ( this.PressedKeys["w"] ) {
            RotationFace = "NORTH";
        } else if ( this.PressedKeys["e"] ) {
            RotationFace = "DOWN";
        } else if ( this.PressedKeys["a"] ) {
            RotationFace = "WEST";
        } else if ( this.PressedKeys["s"] ) {
            RotationFace = "SOUTH";
        } else if ( this.PressedKeys["d"] ) {
            RotationFace = "EAST";
        }

        for (let i = 1; i <= 10; i += 1) {
            if (this.PressedKeys[i.toString()]) {
                if (i > Math.floor(this.Size)) {
                    break;
                }
                RotationDepth = i;
                break;
            }
        }

        if (RotationFace && this.Counter <= 0) {
            this.Cube.rotateFace(RotationFace, RotationDepth - 1, RotationType, 0.2);

            this.Counter = 15;
        }

        const now = performance.now();  const dt = now - this.lastTime;
        this.frames += 1;
        if (dt >= 250) {
            this.fps = (this.frames * 1000) / dt;
            this.frames = 0;
            this.lastTime = now;
        }

        if (this.Cube.AnimationQueue.getCurrentAnimation() !== undefined) {
            this.Cube.AnimationQueue.getCurrentAnimation().update(this.fps);
        }

        this.Counter -= 1;

        this.SelectedFace = undefined

        this.getFace();

        const pieceList = Cube.getLayer(this.SelectedFace, this.SelectedDepth , this.Size, this.Cube.getPieces())

        const objList = []

        for ( const obj of pieceList ) {
            objList.push(obj.getThreeJSElement())
        }

        this.OutlinePass.selectedObjects = objList

        this.stats.update();
        this.Controls.update();
        this.Composer.render();

    }

    private addRandomAnimations(count = 100, duration = 0.05): void {

        const sides: Side[] = ["NORTH", "SOUTH", "EAST", "WEST", "UP", "DOWN"];
        const directions: Direction[] = ["CLOCKWISE", "COUNTERCLOCKWISE"];
        const maxDepth = Math.max(1, Math.floor(this.Size));

        for (let i = 0; i < count; i += 1) {

            const side = sides[Math.floor(Math.random() * sides.length)];
            const direction =
                directions[Math.floor(Math.random() * directions.length)];
            const depth = 1 + Math.floor(Math.random() * maxDepth);

            this.Cube.rotateFace(side, depth - 1, direction, duration);

        }

    }

}

new App();
