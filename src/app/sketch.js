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
import eyeVertexShader from './shader/eye.vert.glsl';
import eyeFragmentShader from './shader/eye.frag.glsl';
import particleTextureVertexShader from './shader/particle-texture.vert.glsl';
import particleTextureFragmentShader from './shader/particle-texture.frag.glsl';
import heightMapFragmentShader from './shader/height-map.frag.glsl';
import normalMapFragmentShader from './shader/normal-map.frag.glsl';
import { QuadGeometry } from './util/quad-geometry';
import { fitSphereAtOriginToViewport } from './util/fit-to-viewport';

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
    shellParams: new THREE.Vector4(32, 0.07) // (shell count, shell thickness, tbd, tbd)
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
const PARTICLE_RADIUS = 0.12;

let eyesInstancedMesh, particles, eyePointerTargetMesh, envTexture;

const normPointerPos = new Vector2(-1, -1);
let surfacePoint = null;
const surfaceVelocity = new Vector3();

let quadMesh;

let particleTextureMesh, particleTextureMaterial, particleTextureRT, heightMapMaterial, heightMapRT, particleData, normalMapRT, normalMapMaterial;

const RAYCASTER_CHANNEL = 5;
const PARTICLE_CHANNEL = 10;

function init(canvas, onInit = null, isDev = false, pane = null) {
    _isDev = isDev;
    _pane = pane;

    if (pane) {
        /*pane.addBinding(settings.shellParams, 'y', {
            label: 'Thickness',
            min: 0.01,
            max: 0.2,
            value: settings.shellParams.y
        });*/
    }

    const manager = new LoadingManager();

    furTexture = new THREE.TextureLoader(manager).load(new URL(`../assets/fur02.jpg`, import.meta.url));

    manager.onLoad = () => {
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
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 2, 7 );
    camera.position.set(0, 0, 4);
    camera.lookAt(new Vector3());
    
    scene = new THREE.Scene();
    const bg = new THREE.Color().setHSL(0.8, .6, 0.002);
    scene.background = bg;
    renderer = new THREE.WebGLRenderer( { canvas, antialias: true } );
    renderer.toneMapping = THREE.NoToneMapping;
    viewportSize = new Vector2(renderer.domElement.clientWidth, renderer.domElement.clientHeight);

    orbGroup = new THREE.Group();
    scene.add(orbGroup);

    quadMesh = new THREE.Mesh(
        new QuadGeometry(),
        null
    );

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
    const sphereRadius = RADIUS;
    const particleRadius = PARTICLE_RADIUS;
    const samples = new PoissonSphereSurface(sphereRadius, particleRadius * 2.5).generateSamples();

    particles = samples.map(s => {
        const particle = {
            position: s,
            normal: null,
            initialScale: randomInRange(.8, 1.4),
            radius: particleRadius,
            initialPosition: null,
            animation: {
                startTimeMS: undefined,
                scaleTarget: 0,
                scaleForce: 0,
                scaleValue: 0,
                currentScale: 0,
                positionTarget: null,
                positionForce: null,
                positionValue: null,
                currentPosition: null,
            }
        };
        particle.radius *= particle.initialScale;
        return particle;
    });

    // relax particles
    for(let r=0; r<30; ++r) {
        particles.forEach(p => {
            const offset = new Vector3();
    
            particles.filter(n => n !== p).forEach(n => {
    
                const d = new Vector3().subVectors(p.position, n.position);
                const l = d.lengthSq();
                const s = p.radius + n.radius;
    
                if (l < s ** 2) {
                    offset.add(d.divideScalar(l));
                }
            });
    
            offset.multiplyScalar(0.015);
            p.position.add(offset).setLength(sphereRadius);
        })
    }

    // update the particle positions
    particles.forEach(p => {
        p.normal = p.position.clone().normalize();
        p.initialPosition = p.normal.clone().multiplyScalar(sphereRadius + p.radius * 0.4);
        p.animation.positionTarget = p.position.clone();
        p.animation.positionForce = p.position.clone();
        p.animation.positionValue = p.position.clone();
        p.animation.currentPosition = p.position.clone();
    });

    const eyeMaterial = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: eyeVertexShader,
        fragmentShader: eyeFragmentShader,
        uniforms: {
            envTexture: {value: envTexture},
        }
    });
    eyesInstancedMesh = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(particleRadius, 12),
        eyeMaterial,
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
    particleTextureRT = new THREE.WebGLRenderTarget(textureSize, textureSize, {
        type: THREE.HalfFloatType, 
        format: THREE.RGBAFormat, 
        magFilter: THREE.NearestFilter, 
        minFilter: THREE.NearestFilter
    });

    heightMapMaterial = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: QuadGeometry.vertexShader,
        fragmentShader: heightMapFragmentShader,
        uniforms: {
            particleSize: { value: PARTICLE_RADIUS },
            particleCount: { value: particles.length },
            particleTexture: { value: particleTextureRT.texture }
        }
    });
    const mapSize = 512;
    heightMapRT = new THREE.WebGLRenderTarget(mapSize, mapSize, { 
        type: THREE.HalfFloatType, 
        format: THREE.RedFormat, 
        magFilter: THREE.LinearFilter, 
        minFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        generateMipmaps: false
    });

    normalMapMaterial = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: QuadGeometry.vertexShader,
        fragmentShader: normalMapFragmentShader,
        uniforms: {
            heightMapTexture: { value: heightMapRT.texture }
        }
    });
    normalMapRT = new THREE.WebGLRenderTarget(mapSize, mapSize, { 
        type: THREE.HalfFloatType, 
        format: THREE.RGBAFormat, 
        magFilter: THREE.LinearFilter, 
        minFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        generateMipmaps: false
    });
}

function setupFur() {
    const shellLayerCount = settings.shellParams.x;

    const furMaterial = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: furVertexShader,
        fragmentShader: furFragmentShader,
        uniforms: {
            shellParams: {value: settings.shellParams},
            furTexture: {value: furTexture},
            normalMapTexture: {value: null}
        },
        transparent: true,
    });
    const furInstanceGeometry = new THREE.IcosahedronGeometry(1, 12);
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

        const padding = camera.aspect > 1 ? 0.5 : 0.2;
        fitSphereAtOriginToViewport(1., camera, padding, 0.2, 0.2);

        camera.updateProjectionMatrix();
    }
}

function animate() {
    arcControl.update(deltaTimeMS);
    const rot = arcControl.orientation.clone();
    rot.multiply(new THREE.Quaternion(0, Math.cos(timeMS * 0.00003), 0, Math.sin(timeMS * 0.00003)));
    orbGroup.quaternion.copy(rot);
    orbGroup.position.y = Math.sin(timeMS * 0.001) * 0.03;
    orbGroup.position.z = Math.sin(timeMS * 0.002) * 0.05;

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
    const v = new Vector3();
    particles.forEach(p => {
        const anim = p.animation;

        if (surfacePoint && surfaceVelocityMagnitude > 0.001) {
            // check for new animation starts only if the pointer intersects the surface
            // and the surface velocity is above a threshold
            const particleWorldPosition = p.position.clone().applyMatrix4(orbGroup.matrix);
            if (particleWorldPosition.distanceTo(surfacePoint) < 0.2) {
                anim.scaleTarget = 1;
                anim.positionTarget.copy(p.initialPosition);
                anim.startTimeMS = timeMS + randomInRange(-200, 200);

                // get the pointer velocity in model space
                const modelSurfaceVelocity = orbGroup.worldToLocal(surfaceVelocity.clone());
                anim.positionForce.add(modelSurfaceVelocity.multiplyScalar(0.2));
            }
        }

        // wait some time until the eye closes
        const elapsedTimeMS = timeMS - anim.startTimeMS;
        const closeDelay = 2000;
        const progress = elapsedTimeMS / closeDelay;
        anim.scaleTarget = progress < 0.95 ? anim.scaleTarget : -0.1;
        anim.positionTarget.copy(progress < 0.99 ? anim.positionTarget : p.position);

        // pseudo physics
        const fs = deltaTimeMS / 150;
        anim.scaleForce += (anim.scaleTarget - anim.scaleValue) * fs;
        anim.scaleValue += (anim.scaleForce - anim.scaleValue) * fs;
        const fp = deltaTimeMS / 150;
        anim.positionForce.add(v.subVectors(anim.positionTarget, anim.positionValue).multiplyScalar(fp));
        anim.positionValue.add(v.subVectors(anim.positionForce, anim.positionValue).multiplyScalar(fp));

        // update animation props
        anim.currentScale = p.initialScale * Math.max(0, anim.scaleValue);
        anim.currentPosition.copy(anim.positionValue).normalize().multiplyScalar(RADIUS);

    });

    // update eye instances
    const m = new THREE.Matrix4();
    for(let i=0; i<eyesInstancedMesh.count; ++i) {
        const p = particles[i];
        m.makeTranslation(p.animation.positionValue);
        m.multiply(new THREE.Matrix4().makeScale(p.animation.currentScale, p.animation.currentScale, p.animation.currentScale));
        eyesInstancedMesh.setMatrixAt(i, m);

        particleData.setXYZW(i, p.animation.currentPosition.x, p.animation.currentPosition.y, p.animation.currentPosition.z, p.animation.currentScale);
    }
    particleData.needsUpdate = true;
    eyesInstancedMesh.instanceMatrix.needsUpdate = true;
}

function render() {
    processParticles();
    furInstancedMesh.material.uniforms.normalMapTexture.value = normalMapRT.texture;
    renderer.render( scene, camera );
}

function processParticles() {
    const mask = camera.layers.mask;
    camera.layers.set(PARTICLE_CHANNEL);
    renderer.setRenderTarget(particleTextureRT);
    renderer.render(scene, camera);
    camera.layers.mask = mask;

    renderer.setRenderTarget(heightMapRT);
    quadMesh.material = heightMapMaterial;
    renderer.render(quadMesh, camera);

    renderer.setRenderTarget(normalMapRT);
    quadMesh.material = normalMapMaterial;
    renderer.render(quadMesh, camera);

    renderer.setRenderTarget(null);
}

export default {
    init,
    run,
    resize
}