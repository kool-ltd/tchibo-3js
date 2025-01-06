import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { camera, renderer, scene } from './scene.js';
import { resetPartPositions } from './models.js';

export let controls;
let selectedObject = null;
let isMoving = false;
const initialTouchPosition = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

export function initControls() {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.1, 0);
    controls.update();

    // Disable OrbitControls in AR mode
    renderer.xr.addEventListener('sessionstart', () => {
        controls.enabled = false;
    });
    
    renderer.xr.addEventListener('sessionend', () => {
        controls.enabled = true;
    });
}

export function setupEventListeners() {
    renderer.domElement.addEventListener('touchstart', onTouchStart, false);
    renderer.domElement.addEventListener('touchmove', onTouchMove, false);
    renderer.domElement.addEventListener('touchend', onTouchEnd, false);

    document.getElementById('reset-button').addEventListener('click', () => {
        placedModels.forEach(container => {
            resetPartPositions(container);
        });
    });
}

function findSelectedObject(x, y) {
    const touch = new THREE.Vector2();
    
    // Normalize touch coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    touch.x = ((x - rect.left) / rect.width) * 2 - 1;
    touch.y = -((y - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(touch, camera);
    
    const allParts = [];
    scene.traverse((child) => {
        if (child.type === 'Group') {
            child.children.forEach(part => {
                if (part.isMesh) {
                    allParts.push(part);
                }
            });
        }
    });
    
    const intersects = raycaster.intersectObjects(allParts, true);
    if (intersects.length > 0) {
        let object = intersects[0].object;
        while (object.parent && !allParts.includes(object)) {
            object = object.parent;
        }
        return object;
    }
    return null;
}

function onTouchStart(event) {
    event.preventDefault();

    if (event.touches.length === 1) {
        isMoving = true;
        const touch = event.touches[0];
        initialTouchPosition.set(touch.clientX, touch.clientY);
        selectedObject = findSelectedObject(touch.clientX, touch.clientY);
    }
}

function onTouchMove(event) {
    event.preventDefault();

    if (!selectedObject) return;

    if (isMoving && event.touches.length === 1) {
        const touch = event.touches[0];
        const sensitivity = renderer.xr.isPresenting ? 0.001 : 0.002;
        
        let deltaX = (touch.clientX - initialTouchPosition.x) * sensitivity;
        let deltaZ = (touch.clientY - initialTouchPosition.y) * sensitivity;

        if (renderer.xr.isPresenting) {
            // Convert movement to world space in AR mode
            const movementVector = new THREE.Vector3(deltaX, 0, deltaZ);
            movementVector.applyQuaternion(camera.quaternion);
            selectedObject.position.add(movementVector);
        } else {
            // Direct movement in non-AR mode
            selectedObject.position.x += deltaX;
            selectedObject.position.z += deltaZ;
        }

        initialTouchPosition.set(touch.clientX, touch.clientY);
    } else if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        // Calculate rotation angle
        const angle = Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
        );
        
        if (selectedObject) {
            if (renderer.xr.isPresenting) {
                // In AR mode, rotate relative to world up vector
                selectedObject.rotation.y = angle;
            } else {
                // In non-AR mode, use direct rotation
                selectedObject.rotation.y = angle;
            }
        }
    }
}

function onTouchEnd(event) {
    event.preventDefault();
    isMoving = false;
    selectedObject = null;
}
