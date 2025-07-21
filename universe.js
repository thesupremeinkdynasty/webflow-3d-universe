// universe.js - ФІНАЛЬНИЙ ЗАВІТ. РАЗ І НАЗАВЖДИ.
// Усі матеріали замінено на MeshBasicMaterial для 100% гарантії видимості.

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
        
        try {
            await this.createCelestialBodies(); 
        } catch (error) {
            console.error("Помилка під час створення небесних тіл:", error);
        }
        
        this.createStarfield();

        this.apiService = new ApiService();
        this.uiManager = new UIManager(this.cameraManager, this.celestialBodies.filter(b => !b.isSource), this.apiService);
        
        this.addEventListeners();
        this.animate();

        this.loaderManager.finish();
    }

    createRenderer() {
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0); 
        return renderer;
    }

    createLighting() {
        // Світло не потрібне для MeshBasicMaterial, але залишаємо для майбутнього
        this.scene.add(new THREE.AmbientLight(0xFFFFFF, 1.0));
    }

    createStarfield() {
        const vertices = [];
        for (let i = 0; i < 15000; i++) {
            vertices.push(
                THREE.MathUtils.randFloatSpread(4000),
                THREE.MathUtils.randFloatSpread(4000),
                THREE.MathUtils.randFloatSpread(4000)
            );
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: true });
        this.scene.add(new THREE.Points(geometry, material));
    }

    async createCelestialBodies() {
        const source = new Sun({ name: "Джерело", size: 10, color: new THREE.Color(0xFFD700) });
        this.celestialBodies.push(source);
        this.scene.add(source.group);

        const planetsConfig = [
            { type: 'Planet', name: "Архів", description: "Тут мовчать слова, але говорять віки.", color: new THREE.Color(0x4A90E2), size: 2.5, orbit: { a: 25, b: 24, speed: 0.08, axialSpeed: 0.1 }, hasRings: true, ringColor: new THREE.Color(0x99ccff) }, 
            { type: 'Planet', name: "Кузня", description: "Горнило творіння, де ідеї знаходять форму.", color: new THREE.Color(0xD0021B), size: 2.2, orbit: { a: 38, b: 39, speed: 0.06, axialSpeed: 0.1 } }, 
            { type: 'Planet', name: "Пакт", description: "Кристал довіри, що сяє прозорістю.", color: new THREE.Color(0xBD10E0), size: 2.0, orbit: { a: 55, b: 55, speed: 0.04, axialSpeed: 0.3 } }, 
            { type: 'Planet', name: "Кредо", description: "Сад буття, що плекає красу зв'язку.", color: new THREE.Color(0x2E8B57), size: 2.4, orbit: { a: 68, b: 65, speed: 0.03, axialSpeed: 0.25 } },
            { type: 'Planet', name: "Гільдія", description: "Світ співпраці та об'єднання.", color: new THREE.Color(0x8A2BE2), size: 2.0, orbit: { a: 80, b: 78, speed: 0.02, axialSpeed: 0.15 } },
            { type: 'Planet', name: "Інсайти", description: "Газовий гігант, у вихорах якого приховані глибокі відкриття.", color: new THREE.Color(0xFF4500), size: 3.0, orbit: { a: 95, b: 90, speed: 0.015, axialSpeed: 0.08 } }
        ];

        planetsConfig.forEach(config => {
            const planet = new Planet(config);
            this.celestialBodies.push(planet);
            this.scene.add(planet.group);
        });
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.onResize());
        // Інші слухачі подій (клік, наведення) можна додати тут за потреби
    }

    onResize() {
        this.cameraManager.onResize();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
        this.camera.position.set(0, 80, 200); 
        this.controls = new OrbitControls(this.camera, container);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 10; 
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

class UIManager { /*... Поки що порожній, UI можна буде підключити пізніше ...*/ }
class ApiService { /*... Поки що порожній ...*/ }
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
        
        // ВИПРАВЛЕНО: Використовуємо найнадійніший матеріал
        const material = new THREE.MeshBasicMaterial({ color: this.color });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.group.add(this.mesh);
        
        // Створюємо світіння (корону)
        const coronaMaterial = new THREE.SpriteMaterial({
            map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png'),
            color: 0xffd700,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.5
        });
        const corona = new THREE.Sprite(coronaMaterial);
        corona.scale.set(this.size * 3, this.size * 3, 1);
        this.group.add(corona);
    }
    update(elapsedTime, delta) {
        this.group.rotation.y += 0.0005;
    }
}

class Planet extends CelestialBody {
    constructor(config) {
        super(config);
        this.orbit = config.orbit;
        this.orbit.offset = Math.random() * Math.PI * 2; 

        // ВИПРАВЛЕНО: Використовуємо найнадійніший матеріал для тіла планети
        const material = new THREE.MeshBasicMaterial({ color: this.color });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 32, 32), material);
        this.group.add(this.mesh);

        // Створюємо кільця, якщо вони є в конфігурації
        if (config.hasRings) {
            const ringGeo = new THREE.RingGeometry(this.size * 1.4, this.size * 2, 64);
            const ringMat = new THREE.MeshBasicMaterial({ 
                color: config.ringColor || 0xffffff, 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = -Math.PI / 2;
            this.group.add(ringMesh);
        }
    }
    update(elapsedTime, delta) {
        const angle = elapsedTime * this.orbit.speed + this.orbit.offset;
        this.group.position.x = Math.cos(angle) * this.orbit.a;
        this.group.position.z = Math.sin(angle) * this.orbit.b;
        this.group.rotation.y += this.orbit.axialSpeed * delta;
    }
}

// --- Ініціалізація ---
try {
    const cursorDot = document.getElementById('cursor-dot');
    window.addEventListener('mousemove', e => {
        gsap.to(cursorDot, { duration: 0.3, x: e.clientX, y: e.clientY, ease: 'power2.out' });
    });
    new Universe();
} catch(e) {
    console.error("Не вдалося запустити Всесвіт:", e);
    const loader = document.getElementById('loader');
    if (loader) loader.innerHTML = `<p>Критична помилка. Неможливо створити Всесвіт.<br>${e.message}</p>`;
}
