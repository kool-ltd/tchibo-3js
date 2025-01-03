import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export let scene, camera, renderer;

export async function initScene() {
    // Initialize scene
    scene = new THREE.Scene();

    // Initialize camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0.3, 0.5);

    // Initialize renderer with modified settings
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        premultipliedAlpha: false,
        stencil: false,
        depth: true,
        logarithmicDepthBuffer: true
    });
    renderer.setClearColor(0x000000, 0); // Set clear color with 0 alpha
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true;
    document.getElementById('scene-container').appendChild(renderer.domElement);

    // Setup lighting
    setupLighting();

    // Setup environment only for non-AR mode
    if (!renderer.xr.isPresenting) {
        await setupEnvironment();
    }

    // Set animation loop
    renderer.setAnimationLoop(render);
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-5, 5, -5);
    scene.add(directionalLight2);
    
    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
    scene.add(hemisphereLight);
}

async function setupEnvironment() {
    const rgbeLoader = new RGBELoader();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    try {
        const texture = await new Promise((resolve, reject) => {
            rgbeLoader.load(
                'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/venice_sunset_1k.hdr',
                (texture) => {
                    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                    scene.environment = envMap;
                    // Only set background in non-AR mode
                    if (!renderer.xr.isPresenting) {
                        scene.background = new THREE.Color(0xf0f0f0);
                    }
                    texture.dispose();
                    pmremGenerator.dispose();
                    resolve(texture);
                },
                undefined,
                reject
            );
        });
    } catch (error) {
        console.error('Error loading HDR environment map:', error);
    }
}

function render(timestamp, frame) {
    if (!scene || !camera || !renderer) return;

    // Clear background in AR mode
    if (renderer.xr.isPresenting) {
        scene.background = null;
        renderer.setClearColor(0x000000, 0);
    }

    try {
        renderer.render(scene, camera);
    } catch (error) {
        console.error('Render error:', error);
    }
}

window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
