import * as THREE from 'three';
import { Vector2 } from 'three';
import { LoadingManager } from 'three';
import { Raycaster } from 'three';
import { Vector3 } from 'three';
import { resizeRendererToDisplaySize } from './util/resize-renderer-to-display-size';

// the target duration of one frame in milliseconds
const TARGET_FRAME_DURATION_MS = 16;

// total time
var timeMS = 0; 

// duration betweent the previous and the current animation frame
var deltaTimeMS = 0; 

// total framecount according to the target frame duration
var frames = 0; 

// relative frames according to the target frame duration (1 = 60 fps)
// gets smaller with higher framerates --> use to adapt animation timing
var deltaFrames = 0;

const settings = {
}

// module variables
var _isDev, 
    _pane, 
    _isInitialized = false,
    camera, 
    scene, 
    renderer, 
    raycaster,
    viewportSize

function init(canvas, onInit = null, isDev = false, pane = null) {
    _isDev = isDev;
    _pane = pane;

    if (pane) {}

    const manager = new LoadingManager();

    /*const objLoader = new GLTFLoader(manager);
    objLoader.load((new URL('../assets/scene.glb', import.meta.url)).toString(), (gltf) => {
        glbScene = (gltf.scene)
    });*/

    //dotNormalMap = new THREE.TextureLoader(manager).load(new URL('../assets/dot.png', import.meta.url));

    //manager.onLoad = () => {

        setupScene(canvas);

        if (onInit) onInit(this);
        
        renderer.setAnimationLoop((t) => run(t));

        resize();
    //}
}

function setupScene(canvas) {
    camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 6, 96 );
    camera.position.set(0, 19, 25);
    camera.lookAt(new Vector3());
    
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer( { canvas, antialias: true } );
    viewportSize = new Vector2(renderer.domElement.clientWidth, renderer.domElement.clientHeight);

    raycaster = new Raycaster();

    _isInitialized = true;
}

function run(t = 0) {
    deltaTimeMS = Math.min(TARGET_FRAME_DURATION_MS, t - timeMS);
    timeMS = t;
    deltaFrames = deltaTimeMS / TARGET_FRAME_DURATION_MS;
    frames += deltaFrames;

    animate();
    render();
}

function resize() {
    if (!_isInitialized) return;
     
    if (resizeRendererToDisplaySize(renderer)) {
        renderer.getSize(viewportSize);
        camera.aspect = viewportSize.x / viewportSize.y;
        camera.updateProjectionMatrix();
    }
}

function animate() {
}

function render() {
    renderer.render( scene, camera );
}

export default {
    init,
    run,
    resize
}