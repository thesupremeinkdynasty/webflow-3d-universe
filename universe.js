// universe.js - ФІНАЛЬНИЙ ЗАВІТ. ЄДИНА ІСТИНА.
// Поєднання правильної структури з найнадійнішими матеріалами для абсолютної гарантії.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';

// =============================================================================
// --- Архітектура Всесвіту: Класи, що визначають буття ---
// =============================================================================

class Universe {
    constructor() {
        this.container = document.getElementById('webgl-container');
        this.clock = new THREE.Clock();
        this.celestialBodies = [];
        this.init();
    }

    async init() {
        this.loaderManager = new LoaderManager();
        this.scene = new THREE.Scene();
        this.cameraManager = new CameraManager(this.container);
        this.renderer = this.createRenderer();
        this.container.appendChild(this.renderer.domElement);

        this.createLighting();
        await this.createCelestialBodies();
        this.createStarfield();
        
        this.addEventListeners();
        this.animate();

        this.loaderManager.finish();
    }

    createRenderer() {
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 1); // Чорний, непрозорий космос
        return renderer;
    }

    createLighting() {
        this.scene.add(new THREE.AmbientLight(0xFFFFFF, 1.0));
    }

    createStarfield() {
        const vertices = [];
        for (let i = 0; i < 20000; i++) {
            vertices.push(THREE.MathUtils.randFloatSpread(4000));
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: true });
        this.scene.add(new THREE.Points(geometry, material));
    }

    async createCelestialBodies() {
        const source = new Sun({ name: "Джерело", size: 12, color: new THREE.Color(0xFFD700) });
        this.celestialBodies.push(source);
        this.scene.add(source.group);
        
        const planetsConfig = [
            { type: 'Archive', name: "Архів", color: new THREE.Color(0x4A90E2), size: 2.5, orbit: { a: 40, b: 38, speed: 0.08, axialSpeed: 0.1 }, hasRings: true, ringColor: new THREE.Color(0x7f8c8d) }, 
            { type: 'Planet', name: "Кузня", color: new THREE.Color(0xE74C3C), size: 2.2, orbit: { a: 58, b: 59, speed: 0.06, axialSpeed: 0.15 } }, 
            { type: 'Planet', name: "Пакт", color: new THREE.Color(0x9B59B6), size: 2.0, orbit: { a: 75, b: 75, speed: 0.04, axialSpeed: 0.3 } }, 
            { type: 'Planet', name: "Кредо", color: new THREE.Color(0x2ECC71), size: 2.8, orbit: { a: 95, b: 92, speed: 0.03, axialSpeed: 0.25 } },
            { type: 'Planet', name: "Гільдія", color: new THREE.Color(0x3498DB), size: 2.1, orbit: { a: 115, b: 112, speed: 0.02, axialSpeed: 0.18 } },
            { type: 'Planet', name: "Інсайти", color: new THREE.Color(0xF1C40F), size: 3.5, orbit: { a: 140, b: 135, speed: 0.015, axialSpeed: 0.1 } }
        ];

        planetsConfig.forEach(config => {
            let planet;
            switch(config.type) {
                case 'Archive':
                    planet = new Archive(config);
                    break;
                default:
                    planet = new Planet(config);
            }
            this.celestialBodies.push(planet);
            this.scene.add(planet.group);
        });
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        this.cameraManager.onResize();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        this.celestialBodies.forEach(body => body.update(elapsedTime, delta));
        
        this.cameraManager.update(delta);
        this.renderer.render(this.scene, this.cameraManager.camera);
    }
}

class CameraManager {
    constructor(container) {
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.camera.position.set(0, 100, 220); 
        this.controls = new OrbitControls(this.camera, container);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 20; 
        this.controls.maxDistance = 1000; 
        this.controls.autoRotate = true; 
        this.controls.autoRotateSpeed = 0.1;
        this.controls.target.set(0, 0, 0); 
    }
    update(delta) { this.controls.update(delta); }
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}

class LoaderManager {
    constructor() { this.loaderElement = document.getElementById('loader'); }
    finish() {
        gsap.to(this.loaderElement, {
            opacity: 0, duration: 1.5,
            onComplete: () => this.loaderElement.style.display = 'none'
        });
    }
}

class CelestialBody {
    constructor(config) {
        this.name = config.name;
        this.size = config.size;
        this.color = config.color;
        this.isSource = config.isSource || false;
        this.group = new THREE.Group(); 
        this.mesh = null;
    }
    update(elapsedTime, delta) {}
}

class Sun extends CelestialBody {
    constructor(config) {
        super({ ...config, isSource: true });
        const material = new THREE.MeshBasicMaterial({ color: this.color });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.group.add(this.mesh);
    }
    update(elapsedTime, delta) {
        this.group.rotation.y += 0.001;
    }
}

class Planet extends CelestialBody {
    constructor(config) {
        super(config);
        this.orbit = config.orbit;
        this.orbit.offset = Math.random() * Math.PI * 2;

        const material = new THREE.MeshBasicMaterial({ color: this.color });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 32, 32), material);
        this.group.add(this.mesh);
    }

    update(elapsedTime, delta) {
        const angle = elapsedTime * this.orbit.speed + this.orbit.offset;
        this.group.position.set(
            Math.cos(angle) * this.orbit.a,
            0,
            Math.sin(angle) * this.orbit.b
        );
        this.group.rotation.y += this.orbit.axialSpeed * delta;
    }
}

class Archive extends Planet {
    constructor(config) {
        super(config); 
        if (config.hasRings) {
            const ringGeo = new THREE.RingGeometry(this.size * 1.6, this.size * 2.5, 64);
            const ringMat = new THREE.MeshBasicMaterial({ 
                color: config.ringColor, 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.4
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = -Math.PI / 2;
            this.group.add(ringMesh);
        }
    }
}

try {
    const cursorDot = document.getElementById('cursor-dot');
    window.addEventListener('mousemove', e => {
        gsap.to(cursorDot, { duration: 0.3, x: e.clientX, y: e.clientY, ease: 'power2.out' });
    });
    new Universe();
} catch(e) {
    console.error("Критична помилка під час запуску Всесвіту:", e);
    const loader = document.getElementById('loader');
    if (loader) loader.innerHTML = `<p>Критична помилка.<br>${e.message}</p>`;
}
