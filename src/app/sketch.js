import * as THREE from 'three';
import { Vector2 } from 'three';
import { LoadingManager } from 'three';
import { Raycaster } from 'three';
import { Vector3 } from 'three';
import { resizeRendererToDisplaySize } from './util/resize-renderer-to-display-size';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import { ArcballControl } from './util/arcball-control';
import { PoissonBox } from './util/poisson-box';
import { PoissonSphereSurface } from './util/poisson-sphere-surface';
import { randomInRange } from './util/random-in-range';
import { fromEvent } from 'rxjs';

import furVertexShader from './shader/fur.vert.glsl';
import furFragmentShader from './shader/fur.frag.glsl';
import particleTextureVertexShader from './shader/particle-texture.vert.glsl';
import particleTextureFragmentShader from './shader/particle-texture.frag.glsl';
import heightMapVertexShader from './shader/height-map.vert.glsl';
import heightMapFragmentShader from './shader/height-map.frag.glsl';
import { QuadGeometry } from './util/quad-geometry';

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

let orbGroup;

let furTexture, furNormalTexture, furInstancedMesh;

const RADIUS = 1;

let eyesInstancedMesh, particles, eyePointerTargetMesh;

const normPointerPos = new Vector2();
let surfacePoint = null;
const surfaceVelocity = new Vector3();

let quadMesh;

let particleTextureMesh, particleTextureMaterial, particleTextureRT, heightMapMaterial, heightMapRT, particleData;

const RAYCASTER_CHANNEL = 5;
const PARTICLE_CHANNEL = 10;

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

    orbGroup = new THREE.Group();
    scene.add(orbGroup);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.y = 3;
    scene.add(mainLight);

    const ambLight = new THREE.AmbientLight(0xbbeeff, .3);
    scene.add(ambLight);

    arcControl = new ArcballControl(canvas);

    raycaster = new Raycaster();

    setupEyes();
    setupParticleProcessing();
    setupFur();

    _isInitialized = true;
}

function setupEyes() {
    const sphereRadius = RADIUS + 0.05;
    const particleSize = 0.1;
    const samples = new PoissonSphereSurface(sphereRadius, 0.25).generateSamples();

    particles = samples.map(s => {
        const particle = {
            position: s,
            scale: randomInRange(.9, 1.6),
            size: particleSize,
            animation: {
                startTimeMS: undefined,
                scale: 0
            }
        };
        particle.size *= particle.scale;
        return particle;
    });

    // relax particles
    for(let r=0; r<30; ++r) {
        particles.forEach(p => {
            const offset = new Vector3();
    
            particles.filter(n => n !== p).forEach(n => {
    
                const d = new Vector3().subVectors(p.position, n.position);
                const l = d.lengthSq();
                const s = p.size + n.size;
    
                if (l < s ** 2) {
                    offset.add(d.divideScalar(l));
                }
            });
    
            offset.multiplyScalar(0.015);
            p.position.add(offset).setLength(sphereRadius);
        })
    }


    eyesInstancedMesh = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(particleSize, 10),
        new THREE.MeshLambertMaterial({ color: 0x444444 }),
        particles.length
    );

    for(let i=0; i<eyesInstancedMesh.count; ++i) {
        const m = new THREE.Matrix4();
        const p = particles[i];
        m.makeTranslation(p.position);
        m.multiply(new THREE.Matrix4().makeScale(p.animation.scale, p.animation.scale, p.animation.scale));
        eyesInstancedMesh.setMatrixAt(i, m);
    }

    orbGroup.add(eyesInstancedMesh);

    eyePointerTargetMesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(RADIUS, 5),
        new THREE.MeshBasicMaterial({ colorWrite: false })
    );
    eyePointerTargetMesh.visible = false;
    eyePointerTargetMesh.layers.set(RAYCASTER_CHANNEL);
    raycaster.layers.set(RAYCASTER_CHANNEL);
    camera.layers.enable(RAYCASTER_CHANNEL);
    orbGroup.add(eyePointerTargetMesh);

    fromEvent(window, 'pointermove').subscribe(e => {
        normPointerPos.x = ( e.clientX / window.innerWidth ) * 2 - 1;
	    normPointerPos.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
    });
}

function setupParticleProcessing() {
    // get a power of two texture size
    const textureSize = 2**Math.ceil(Math.log2(Math.sqrt(particles.length)));
    
    const particleTextureGeometry = new THREE.BufferGeometry();
    particleData = new THREE.BufferAttribute( new Float32Array(particles.length * 4), 4 );
    particles.forEach((p, i) => particleData.setXYZW(i, p.position.x, p.position.y, p.position.z, 0));
    particleData.usage = THREE.DynamicDrawUsage;
    particleTextureGeometry.setAttribute( 'position', particleData );
    particleTextureGeometry.setDrawRange(0, particles.length);
    particleTextureMaterial = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: particleTextureVertexShader,
        fragmentShader: particleTextureFragmentShader,
        uniforms: {
            textureSize: { value: textureSize }
        },
        depthTest: false,
        depthWrite: false
    });
    particleTextureMesh = new THREE.Points(particleTextureGeometry, particleTextureMaterial);
    particleTextureMesh.layers.set(PARTICLE_CHANNEL);
    scene.add(particleTextureMesh);
    particleTextureRT = new THREE.WebGLRenderTarget(textureSize, textureSize, {type: THREE.HalfFloatType, format: THREE.RGBAFormat, magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter});

    heightMapMaterial = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: heightMapVertexShader,
        fragmentShader: heightMapFragmentShader,
        uniforms: {
            particleCount: { value: particles.length },
            particleTexture: { value: particleTextureRT.texture }
        }
    });
    const heightMapSize = 1024;
    heightMapRT = new THREE.WebGLRenderTarget(heightMapSize, heightMapSize, { type: THREE.HalfFloatType, format: THREE.RedFormat });

    quadMesh = new THREE.Mesh(
        new QuadGeometry(),
        heightMapMaterial
    );

    eyesInstancedMesh.visible = false;
}

function setupFur() {
    const shellLayerCount = settings.shellParams.x;

    const furMaterial = new CustomShaderMaterial({
        baseMaterial: THREE.MeshPhongMaterial,
        silent: true,
        uniforms: {
            shellParams: {value: settings.shellParams},
            furTexture: {value: furTexture},
            heightMapTexture: {value: null}
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
    orbGroup.add(furInstancedMesh);
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
    orbGroup.quaternion.copy(arcControl.orientation);

    // check pointer intersection
    raycaster.setFromCamera( normPointerPos, camera );
	const intersects = raycaster.intersectObjects( scene.children );
    if (intersects.length > 0) {
        const point = intersects[0].point;

        if (!surfacePoint) {
            surfacePoint = point.clone();
        } else {
            surfaceVelocity.subVectors(point, surfacePoint);
            surfacePoint.copy(point);
        }
    } else {
        surfacePoint = null;
        surfaceVelocity.set(0, 0, 0);
    }

    // update eye animations
    const surfaceVelocityMagnitude = surfaceVelocity.lengthSq();
    particles.forEach(p => {
        // update the animation for currently animated particles
        if (p.animation.startTimeMS !== undefined) {
            const elapsedTimeMS = timeMS - p.animation.startTimeMS;
            const progress = elapsedTimeMS / 1000;

            if (progress >= 1) {
                // animation is complete
                p.animation.startTimeMS = undefined;
                p.animation.scale = 0;
            } else {
                p.animation.scale = p.scale * (1 - progress );
            }

        } else if (surfacePoint && surfaceVelocityMagnitude > 0.00001) {
            // check for new animation starts only if the pointer intersects the surface
            // and the surface velocity is above a threshold
            const particleWorldPosition = p.position.clone().applyMatrix4(orbGroup.matrix);
            if (particleWorldPosition.distanceTo(surfacePoint) < 0.2) {
                p.animation.startTimeMS = timeMS;
            }
        }
    });

    // update eye instances
    const m = new THREE.Matrix4();
    for(let i=0; i<eyesInstancedMesh.count; ++i) {
        const p = particles[i];
        m.makeTranslation(p.position);
        m.multiply(new THREE.Matrix4().makeScale(p.animation.scale, p.animation.scale, p.animation.scale));
        eyesInstancedMesh.setMatrixAt(i, m);

        particleData.setXYZW(i, p.position.x, p.position.y, p.position.z, p.animation.scale);
    }
    particleData.needsUpdate = true;
    eyesInstancedMesh.instanceMatrix.needsUpdate = true;
}

function render() {
    processParticles();
    furInstancedMesh.material.uniforms.heightMapTexture.value = heightMapRT.texture;
    renderer.render( scene, camera );
}

function processParticles() {
    const mask = camera.layers.mask;
    camera.layers.set(PARTICLE_CHANNEL);
    renderer.setRenderTarget(particleTextureRT);
    renderer.render(scene, camera);
    camera.layers.mask = mask;

    renderer.setRenderTarget(heightMapRT);
    heightMapMaterial.uniforms.particleTexture.value = particleTextureRT.texture;
    renderer.render(quadMesh, camera);

    renderer.setRenderTarget(null);
}

export default {
    init,
    run,
    resize
}