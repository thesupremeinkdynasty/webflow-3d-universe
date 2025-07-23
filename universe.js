// =================================================================
// Архітектор: The Supreme Ink Dynasty & Gemini
// Версія: 1.1 (Фаза I - Архітектура Всесвіту - Завершено)
// Опис: Фіналізований код для створення 3D-сцени,
// що включає Джерело, планети з надійними текстурами
// та процедурний зоряний фон.
// =================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

// --- Архітектурний Центр: Конфігурація Сонячної Системи ---
const PLANET_DATA = [
    {
        name: "Кредо",
        size: 10,
        distance: 80,
        textureUrl: 'https://cdn.jsdelivr.net/gh/thesupremeinkdynasty/webflow-3d-universe@main/assets/texture/credo_texture.jpg',
        description: "Землеподібний світ, що символізує людський аспект проєкту та нашу команду.",
        url: '/about-us'
    },
    {
        name: "Архів",
        size: 14,
        distance: 150,
        textureUrl: 'https://cdn.jsdelivr.net/gh/thesupremeinkdynasty/webflow-3d-universe@main/assets/texture/archive_texture.jpg',
        description: "Гігантська планета-бібліотека, оточена кільцями із сяючих гліфів.",
        url: '/library'
    },
    {
        name: "Кузня",
        size: 9,
        distance: 230,
        textureUrl: 'https://cdn.jsdelivr.net/gh/thesupremeinkdynasty/webflow-3d-universe@main/assets/texture/forge_texture.jpg',
        description: "Вулканічна планета, де народжуються ідеї в ріках розплавленого металу.",
        url: '/ai-generator'
    },
    {
        name: "Пакт",
        size: 8,
        distance: 300,
        textureUrl: 'https://cdn.jsdelivr.net/gh/thesupremeinkdynasty/webflow-3d-universe@main/assets/texture/pact_texture.jpg',
        description: "Ідеально огранений кристал, що символізує прозорість та цінність наших умов.",
        url: '/pricing'
    }
];

/**
 * Головний клас, що керує всім Всесвітом.
 */
class Universe {
    constructor() {
        this.container = document.getElementById('webgl-canvas');
        if (!this.container) {
            console.error("Архітектор попереджає: HTML-елемент #webgl-canvas не знайдено. Всесвіт не може бути створений.");
            return;
        }
        this.clock = new THREE.Clock();
        this.celestialBodies = [];
        this.init();
    }

    async init() {
        this.loaderManager = new LoaderManager();
        this.scene = new THREE.Scene();
        this.cameraManager = new CameraManager(this.container);
        this.renderer = this.createRenderer();
        
        this.createLighting();
        this.createEnvironment();
        await this.createCelestialBodies();
        
        this.composer = this.createComposer();
        this.addEventListeners();
        this.animate();
    }

    createRenderer() {
        const renderer = new THREE.WebGLRenderer({ canvas: this.container, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        return renderer;
    }

    createComposer() {
        const composer = new EffectComposer(this.renderer);
        composer.addPass(new RenderPass(this.scene, this.cameraManager.camera));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.5, 0.8);
        composer.addPass(bloomPass);
        return composer;
    }
    
    createLighting() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const pointLight = new THREE.PointLight(0xffffff, 1.5, 4000);
        this.scene.add(pointLight);
    }

    createEnvironment() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 5000;
        const posArray = new Float32Array(starsCount * 3);
        for (let i = 0; i < starsCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 2000;
        }
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const starsMaterial = new THREE.PointsMaterial({ size: 0.7, color: 0xffffff });
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(starField);
    }

    async createCelestialBodies() {
        const textureLoader = new THREE.TextureLoader(this.loaderManager.manager);
        
        try {
            const sunTexture = await textureLoader.loadAsync('https://cdn.jsdelivr.net/gh/thesupremeinkdynasty/webflow-3d-universe@main/assets/texture/8k_sun.jpg');
            const source = new Sun({ name: "Джерело", size: 25, textures: { map: sunTexture } });
            this.celestialBodies.push(source);
            this.scene.add(source.group);
        } catch (e) { console.error("Не вдалося завантажити текстуру Джерела:", e); }

        try {
            const planetTextures = await Promise.all(PLANET_DATA.map(p => textureLoader.loadAsync(p.textureUrl)));
            PLANET_DATA.forEach((planetConfig, index) => {
                const planet = new Planet(planetConfig, planetTextures[index]);
                this.celestialBodies.push(planet);
                this.scene.add(planet.group);
            });
        } catch (e) { console.error("Не вдалося завантажити текстури планет:", e); }
        
        this.loaderManager.finish();
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        this.cameraManager.onResize();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        this.celestialBodies.forEach(body => body.update(elapsedTime, delta));
        this.cameraManager.update(delta);
        this.composer.render();
    }
}

/**
 * Керує камерою та елементами управління (OrbitControls).
 */
class CameraManager {
    constructor(container) {
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 6000);
        this.camera.position.set(0, 150, 450);
        this.controls = new OrbitControls(this.camera, container);
        this.controls.enableDamping = true; 
        this.controls.autoRotate = true; 
        this.controls.autoRotateSpeed = 0.1;
        this.controls.minDistance = 50; 
        this.controls.maxDistance = 1000;
    }
    update(delta) { this.controls.update(delta); }
    onResize() { this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); }
}

/**
 * Керує екраном завантаження.
 */
class LoaderManager {
    constructor() {
        this.manager = new THREE.LoadingManager();
        this.loaderElement = document.getElementById('loader');
    }
    finish() {
        if (this.loaderElement) {
            gsap.to(this.loaderElement, { opacity: 0, duration: 1.5, delay: 0.5, onComplete: () => this.loaderElement.style.display = 'none' });
        }
    }
}

/**
 * Базовий клас для всіх небесних тіл.
 */
class CelestialBody {
    constructor(config) {
        this.group = new THREE.Group();
        Object.assign(this, config);
    }
    update(elapsedTime, delta) {}
}

/**
 * Клас для Джерела (Сонця) з кастомним шейдером.
 */
class Sun extends CelestialBody {
    constructor(config) {
        super({ ...config, isSource: true });
        const sunGeometry = new THREE.SphereGeometry(this.size, 128, 128);
        const sunMaterial = new THREE.MeshStandardMaterial({
            map: this.textures?.map,
            emissiveMap: this.textures?.map,
            emissive: 0xffffff,
            emissiveIntensity: 1.8,
        });
        this.mesh = new THREE.Mesh(sunGeometry, sunMaterial);
        this.group.add(this.mesh);

        const coronaGeometry = new THREE.SphereGeometry(this.size, 128, 128);
        const coronaMaterial = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0.0 } },
            vertexShader: `uniform float time; varying float noise; vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); } float snoise(vec3 v) { const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0); vec3 i  = floor(v + dot(v, C.yyy) ); vec3 x0 = v - i + dot(i, C.xxx); vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min( g.xyz, l.zxy ); vec3 i2 = max( g.xyz, l.zxy ); vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy; i = mod(i, 289.0); vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 )); float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx; vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_ ); vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y); vec4 b0 = vec4( x.xy, y.xy ); vec4 b1 = vec4( x.zw, y.zw ); vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0)); vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww; vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w); vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3))); p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w; vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m; return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) ); } float fbm(vec3 p) { float f = 0.0; f += 0.5 * snoise(p); p *= 2.02; f += 0.25 * snoise(p); p *= 2.03; f += 0.125 * snoise(p); return f; } void main() { float displacement = fbm(normal * 1.5 + time * 0.2); displacement += fbm(normal * 6.0 + time * 0.6) * 0.25; noise = displacement; vec3 newPosition = position + normal * displacement * 9.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0); }`,
            fragmentShader: `varying float noise; void main() { vec3 color = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.9, 0.5), smoothstep(-0.3, 0.6, noise)); float alpha = smoothstep(0.0, 0.5, noise) * (1.0 - smoothstep(0.4, 0.6, noise)); gl_FragColor = vec4(color, alpha); }`,
            transparent: true, blending: THREE.AdditiveBlending,
        });
        this.corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        this.group.add(this.corona);
    }
    update(elapsedTime, delta) {
        this.group.rotation.y += delta * 0.02;
        if (this.corona?.material.uniforms) {
            this.corona.material.uniforms.time.value = elapsedTime;
        }
    }
}

/**
 * Клас для створення планет.
 */
class Planet extends CelestialBody {
    constructor(config, texture) {
        super(config);
        const planetGeometry = new THREE.SphereGeometry(this.size, 64, 64);
        const planetMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.3, roughness: 0.7
        });
        this.mesh = new THREE.Mesh(planetGeometry, planetMaterial);
        this.group.add(this.mesh);
        this.group.position.x = this.distance;
    }
    update(elapsedTime, delta) {
        this.mesh.rotation.y += delta * 0.1;
    }
}
    
/**
 * Точка входу: створюємо Всесвіт та активуємо курсор.
 */
try {
    new Universe();
    const cursorDot = document.getElementById('cursor-dot');
    if (cursorDot) {
        window.addEventListener('mousemove', e => gsap.to(cursorDot, { duration: 0.3, x: e.clientX, y: e.clientY, ease: 'power2.out' }));
    }
} catch(e) { console.error("Критична помилка Всесвіту:", e); }
