import * as THREE from 'three';
import { Vector2 } from 'three';
import { LoadingManager } from 'three';
import { Raycaster } from 'three';
import { Vector3 } from 'three';
import { resizeRendererToDisplaySize } from './util/resize-renderer-to-display-size';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

import furVertexShader from './shader/fur.vert.glsl';
import furFragmentShader from './shader/fur.frag.glsl';
import { ArcballControl } from './util/arcball-control';

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
    shellParams: new THREE.Vector4(20, 0.08) // (shell count, shell thickness, tbd, tbd)
}

// module variables
var _isDev, 
    _pane, 
    _isInitialized = false,
    camera, 
    scene, 
    renderer, 
    raycaster,
    arcControl,
    viewportSize;

let furTexture, furNormalTexture, furInstancedMesh;

function init(canvas, onInit = null, isDev = false, pane = null) {
    _isDev = isDev;
    _pane = pane;

    if (pane) {
        pane.addBinding(settings.shellParams, 'y', {
            label: 'Thickness',
            min: 0.01,
            max: 0.2,
            value: settings.shellParams.y
        });
    }

    const manager = new LoadingManager();

    /*const objLoader = new GLTFLoader(manager);
    objLoader.load((new URL('../assets/scene.glb', import.meta.url)).toString(), (gltf) => {
        glbScene = (gltf.scene)
    });*/

    const furVariant = '02';
    furTexture = new THREE.TextureLoader(manager).load(new URL(`../assets/fur${furVariant}.png`, import.meta.url));
    furNormalTexture = new THREE.TextureLoader(manager).load(new URL(`../assets/fur${furVariant}-normal.png`, import.meta.url));

    manager.onLoad = () => {
        furNormalTexture.colorSpace = THREE.NoColorSpace;
        furNormalTexture.wrapS = THREE.RepeatWrapping;
        furNormalTexture.wrapT = THREE.RepeatWrapping;
        furNormalTexture.magFilter = THREE.NearestFilter;
        furNormalTexture.minFilter = THREE.NearestFilter;
        furTexture.wrapS = THREE.RepeatWrapping;
        furTexture.wrapT = THREE.RepeatWrapping;
        furTexture.magFilter = THREE.LinearFilter;
        furTexture.minFilter = THREE.LinearMipMapLinearFilter;
        furTexture.generateMipmaps = true;

        setupScene(canvas);

        if (onInit) onInit(this);
        
        renderer.setAnimationLoop((t) => run(t));

        resize();
    }
}

function setupScene(canvas) {
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 3, 7 );
    camera.position.set(0, 0, 5);
    camera.lookAt(new Vector3());
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfffffa);
    renderer = new THREE.WebGLRenderer( { canvas, antialias: true } );
    renderer.toneMapping = THREE.NoToneMapping;
    viewportSize = new Vector2(renderer.domElement.clientWidth, renderer.domElement.clientHeight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.y = 3;
    scene.add(mainLight);

    const ambLight = new THREE.AmbientLight(0xbbeeff, .3);
    scene.add(ambLight);

    arcControl = new ArcballControl(canvas);

    raycaster = new Raycaster();

    setupFur();

    _isInitialized = true;
}

function setupFur() {
    const shellLayerCount = settings.shellParams.x;

    const furMaterial = new CustomShaderMaterial({
        baseMaterial: THREE.MeshPhongMaterial,
        silent: true,
        uniforms: {
            shellParams: {value: settings.shellParams},
            furTexture: {value: furTexture}
        },
        normalMap: furNormalTexture,
        normalScale: new Vector2(0.2, 0.2),
        vertexShader: furVertexShader,
        fragmentShader: furFragmentShader,
        transparent: true,
        wireframe: false
      });
    const furInstanceGeometry = new THREE.IcosahedronGeometry(1, 10);
    furInstancedMesh = new THREE.InstancedMesh(
        furInstanceGeometry,
        furMaterial,
        shellLayerCount
    );
    scene.add(furInstancedMesh);
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
    arcControl.update(deltaTimeMS);

    furInstancedMesh.quaternion.copy(arcControl.orientation);
}

function render() {
    renderer.render( scene, camera );
}

export default {
    init,
    run,
    resize
}