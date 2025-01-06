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
    touch.x = (x / window.innerWidth) * 2 - 1;
    touch.y = -(y / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(touch, camera);
    
    // Collect all interactive objects
    const allParts = [];
    scene.traverse((object) => {
        // Check for mesh objects that should be interactive
        if (object.isMesh || object.type === 'Group') {
            allParts.push(object);
        }
    });
    
    const intersects = raycaster.intersectObjects(allParts, true);
    
    if (intersects.length > 0) {
        let object = intersects[0].object;
        // Find the parent object that should be moved
        while (object.parent && !allParts.includes(object)) {
            object = object.parent;
        }
        return object;
    }
    return null;
}

function onTouchStart(event) {
    event.preventDefault(); // Prevent default touch behavior

    if (event.touches.length === 1) {
        isMoving = true;
        const touch = event.touches[0];
        
        // Get touch position relative to the renderer's canvas
        const rect = renderer.domElement.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        initialTouchPosition.set(touch.clientX, touch.clientY);
        selectedObject = findSelectedObject(x, y);
    }
}

function onTouchMove(event) {
    event.preventDefault();

    if (!selectedObject) return;

    if (isMoving && event.touches.length === 1) {
        const touch = event.touches[0];
        
        // Calculate movement in screen space
        const deltaX = (touch.clientX - initialTouchPosition.x) * 0.002;
        const deltaZ = (touch.clientY - initialTouchPosition.y) * 0.002;

        // Convert screen movement to world space movement
        const movementVector = new THREE.Vector3(deltaX, 0, deltaZ);
        movementVector.applyQuaternion(camera.quaternion);
        
        // Apply movement
        selectedObject.position.add(movementVector);
        
        initialTouchPosition.set(touch.clientX, touch.clientY);
    } else if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        // Calculate rotation based on the line between two touch points
        const angle = Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
        );
        
        // Apply rotation relative to world up vector
        selectedObject.rotation.y = angle;
    }
}

function onTouchEnd(event) {
    event.preventDefault();
    isMoving = false;
    selectedObject = null;
}
