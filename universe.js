// universe.js - ФІНАЛЬНА ВЕРСІЯ ПІСЛЯ ОСТАННЬОГО ВИПРАВЛЕННЯ
// Цей код виправляє обертання планет і робить їх видимими.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

// =============================================================================
// --- GLSL: Душа наших світів (діагностичні версії) ---
// =============================================================================
const Shaders = {
    sharedVertex: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
            vUv = uv;
            vPosition = position;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    sun: {
        surface: `
            uniform float uTime;  
            varying vec2 vUv;
            void main() { gl_FragColor = vec4(1.0, 0.8, 0.4, 1.0); }
        `,
        corona: `
            uniform float uTime;
            varying vec3 vNormal;
            void main() { gl_FragColor = vec4(1.0, 0.8, 0.4, 0.1); }
        `
    },
    archive: ` 
        uniform float uTime; uniform float uPulse; uniform vec3 uColor; varying vec2 vUv; varying vec3 vNormal;
        void main() { gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); }
    `,
    forge: ` 
        uniform float uTime; uniform float uPulse; varying vec2 vUv; varying vec3 vNormal;
        void main() { gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0); }
    `,
    pact: ` 
        uniform samplerCube uEnvMap; uniform float uTime; varying vec3 vNormal; varying vec3 vPosition;
        void main() { gl_FragColor = vec4(0.8, 0.0, 0.8, 1.0); }
    `,
    credo: ` 
        uniform sampler2D uDayTexture; uniform sampler2D uNightTexture; uniform sampler2D uCloudTexture; uniform sampler2D uCityLightsTexture; uniform float uTime; uniform vec3 uSunDirection; varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
        void main() { gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); }
    `,
};

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
            // Тут можна показати повідомлення про помилку користувачу
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
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.setClearColor(0x000000, 0); 
        return renderer;
    }

    createLighting() {
        this.scene.add(new THREE.AmbientLight(0xFFFFFF, 0.2));
        const sunLight = new THREE.PointLight(0xFFFFFF, 1.5, 2000);
        sunLight.position.set(0, 0, 0); 
        this.scene.add(sunLight);
    }

    createStarfield() {
        const vertices = [];
        for (let i = 0; i < 15000; i++) {
            vertices.push(THREE.MathUtils.randFloatSpread(3000));
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, sizeAttenuation: true });
        this.scene.add(new THREE.Points(geometry, material));
    }

    async createCelestialBodies() {
        const textureLoader = new THREE.TextureLoader();
        const textures = await this.loadCredoTextures(textureLoader);

        const source = new Sun({ name: "Джерело", size: 10 });
        this.celestialBodies.push(source);
        this.scene.add(source.group);

        const planetsConfig = [
            { type: 'Archive', name: "Архів", description: "Тут мовчать слова, але говорять віки.", color: new THREE.Color(0x4A90E2), size: 2.5, orbit: { a: 25, b: 24, speed: 0.08, axialSpeed: 0.1 }, hasRings: true, ringGlyphColor: new THREE.Color(0xF0E6D2), ringInnerRadius: 3.5, ringOuterRadius: 5.5, ringDensity: 15000, prompt: "...", url: 'books' }, 
            { type: 'Forge', name: "Кузня", description: "Горнило творіння, де ідеї знаходять форму.", color: new THREE.Color(0xD0021B), size: 2.2, orbit: { a: 38, b: 39, speed: 0.06, axialSpeed: 0.1 }, prompt: "...", url: 'ai-generator' }, 
            { type: 'Pact', name: "Пакт", description: "Кристал довіри, що сяє прозорістю.", color: new THREE.Color(0xBD10E0), size: 2.0, orbit: { a: 55, b: 55, speed: 0.04, axialSpeed: 0.3 }, prompt: "...", url: 'pricing-tariffs' }, 
            { type: 'Credo', name: "Кредо", description: "Сад буття, що плекає красу зв'язку.", color: new THREE.Color(0x2E8B57), size: 2.4, orbit: { a: 68, b: 65, speed: 0.03, axialSpeed: 0.25 }, textures, prompt: "...", url: 'about-us' },
            { type: 'Planet', name: "Гільдія", description: "Світ співпраці та об'єднання.", color: new THREE.Color(0x8A2BE2), size: 2.0, orbit: { a: 80, b: 78, speed: 0.02, axialSpeed: 0.15 }, prompt: "...", url: 'community' },
            { type: 'Planet', name: "Інсайти", description: "Газовий гігант, у вихорах якого приховані глибокі відкриття.", color: new THREE.Color(0xFF4500), size: 3.0, orbit: { a: 95, b: 90, speed: 0.015, axialSpeed: 0.08 }, prompt: "...", url: 'insights' }
        ];

        planetsConfig.forEach(config => {
            let planet;
            switch(config.type) {
                case 'Archive': planet = new Archive(config); break; 
                case 'Forge': planet = new Forge(config); break;
                case 'Pact': planet = new Pact(config, this.renderer, this.scene); break;
                case 'Credo': planet = new Credo(config); break;
                default: 
                    planet = new Planet(config); 
                    const material = new THREE.MeshLambertMaterial({ 
                        color: config.color,
                        emissive: config.color,
                        emissiveIntensity: 0.4
                    });
                    planet.mesh = new THREE.Mesh(new THREE.SphereGeometry(planet.size, 64, 64), material);
                    planet.mesh.userData.celestialBody = planet;
                    planet.group.add(planet.mesh);
            }
            this.celestialBodies.push(planet);
            this.scene.add(planet.group);
        });
    }

    async loadCredoTextures(loader) { /* ... (без змін) ... */ return {}; }
    addEventListeners() { /* ... (без змін) ... */ }
    onResize() { /* ... (без змін) ... */ }
    
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
        this.container = container;
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 4000);
        this.camera.position.set(0, 70, 180); 
        this.controls = new OrbitControls(this.camera, this.container);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.04;
        this.controls.minDistance = 10; 
        this.controls.maxDistance = 1000; 
        this.controls.autoRotate = true; 
        this.controls.autoRotateSpeed = 0.08;
        this.controls.target.set(0, 0, 0); 
    }
    focusOn(targetBody) { /* ... (без змін) ... */ }
    returnToOverview() { /* ... (без змін) ... */ }
    onResize() { /* ... (без змін) ... */ }
    update(delta) { this.controls.update(delta); }
}

class UIManager { /* ... (без змін) ... */ }
class ApiService { /* ... (без змін) ... */ }
class LoaderManager { /* ... (без змін) ... */ }

class CelestialBody {
    constructor(config) {
        this.name = config.name;
        this.description = config.description;
        this.prompt = config.prompt || ""; 
        this.size = config.size;
        this.color = config.color;
        this.isSource = config.isSource || false;
        this.group = new THREE.Group(); 
        this.url = config.url || '#'; 
        this.mesh = null; // Важливо, щоб mesh був тут
    }
    update(elapsedTime, delta) {}
}

class Sun extends CelestialBody {
    constructor(config) {
        super({ ...config, isSource: true });
        
        const surfaceMaterial = new THREE.ShaderMaterial({ 
            uniforms: { uTime: { value: 0 } }, 
            vertexShader: Shaders.sharedVertex, 
            fragmentShader: Shaders.sun.surface,
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 128, 128), surfaceMaterial);
        this.group.add(this.mesh);
        
        const coronaMaterial = new THREE.ShaderMaterial({ 
            uniforms: { uTime: { value: 0 } }, 
            vertexShader: Shaders.sharedVertex, 
            fragmentShader: Shaders.sun.corona,
            blending: THREE.AdditiveBlending, 
            transparent: true, 
        });
        const corona = new THREE.Mesh(new THREE.SphereGeometry(this.size * 1.6, 128, 128), coronaMaterial); 
        this.group.add(corona);
    }
    update(elapsedTime) {
        this.group.rotation.y += 0.001;
    }
}

class Planet extends CelestialBody {
    constructor(config) {
        super(config);
        this.orbit = config.orbit;
        this.orbit.offset = Math.random() * Math.PI * 2; 
    }
    update(elapsedTime, delta) {
        const angle = elapsedTime * this.orbit.speed + this.orbit.offset;
        this.group.position.x = Math.cos(angle) * this.orbit.a;
        this.group.position.z = Math.sin(angle) * this.orbit.b;
        
        // **ОСЬ КЛЮЧОВЕ ВИПРАВЛЕННЯ:**
        // Ми обертаємо всю групу, а не тільки mesh.
        // Це гарантує, що і тіло планети, і її кільця/супутники обертаються разом.
        this.group.rotation.y += this.orbit.axialSpeed * delta;
    }
}
    
class Archive extends Planet {
    constructor(config) {
        super(config); 
        const material = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
            vertexShader: Shaders.sharedVertex,
            fragmentShader: Shaders.archive,
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh); 

        if (config.hasRings) {
            const glyphMaterial = new THREE.MeshBasicMaterial({ 
                color: config.ringGlyphColor, 
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.1, 
                side: THREE.DoubleSide 
            });
            this.glyphInstances = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.1), glyphMaterial, config.ringDensity);
            
            const dummy = new THREE.Object3D(); 
            for (let i = 0; i < config.ringDensity; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = THREE.MathUtils.randFloat(config.ringInnerRadius, config.ringOuterRadius);
                dummy.position.set(Math.cos(angle) * radius, THREE.MathUtils.randFloatSpread(0.1), Math.sin(angle) * radius);
                dummy.rotation.y = Math.random() * Math.PI * 2; 
                dummy.updateMatrix(); 
                this.glyphInstances.setMatrixAt(i, dummy.matrix); 
            }
            this.group.add(this.glyphInstances);
        }
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta); // Викликаємо батьківський update для орбіти та обертання
        if (this.glyphInstances) {
            this.glyphInstances.rotation.y += delta * 0.05; // Додаткове власне обертання кілець
        }
    }
}
    
class Forge extends Planet {
    constructor(config) {
        super(config); 
        const material = new THREE.ShaderMaterial({ 
            uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
            vertexShader: Shaders.sharedVertex,
            fragmentShader: Shaders.forge,
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh);
    }
}

class Pact extends Planet {
    constructor(config, renderer, scene) {
        super(config); 
        this.cubeCamera = new THREE.CubeCamera(1, 2000, new THREE.WebGLCubeRenderTarget(256));
        this.scene = scene;
        this.renderer = renderer;
        
        const material = new THREE.ShaderMaterial({ 
            uniforms: { uTime: { value: 0 }, uEnvMap: { value: this.cubeCamera.renderTarget.texture } },
            vertexShader: Shaders.sharedVertex,
            fragmentShader: Shaders.pact,
        });
        this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(this.size, 5), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh); 
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta);
        if (this.mesh && this.renderer) {
            this.mesh.visible = false; 
            this.cubeCamera.position.copy(this.group.position);
            this.cubeCamera.update(this.renderer, this.scene);
            this.mesh.visible = true; 
        }
    }
}

class Credo extends Planet {
    constructor(config) {
        super(config); 
        const material = new THREE.ShaderMaterial({ 
            uniforms: {
                uTime: { value: 0 },
                uDayTexture: { value: config.textures.day }, 
                uSunDirection: { value: new THREE.Vector3(1, 0, 0) }
            },
            vertexShader: Shaders.sharedVertex,
            fragmentShader: Shaders.credo,
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh); 
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
