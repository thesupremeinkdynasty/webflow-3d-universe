// universe.js - Повна версія коду після КРОКУ 7.6 (Експліцитна діагностика кольорів та фіксований колір)

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

// =============================================================================
// --- GLSL: Душа наших світів, написана мовою світла ---
// =============================================================================
const Shaders = {
    noise: `
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
            vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
            vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute(permute(permute( i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
            vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
            vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        float fbm(vec3 p, int octaves) {
            float f = 0.0; float a = 0.5;
            for (int i = 0; i < octaves; i++) { f += a * snoise(p); p *= 2.0; a *= 0.5; }
            return f;
        }
    `,
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
        surface: `/* ... */`, corona: `/* ... */`
    },
    archive: `/* ... */`,
    forge: `/* ... */`,
    pact: `/* ... */`,
    credo: `/* ... */`,
    nebula: `/* ... */`,
    godRays: { uniforms: {}, vertexShader: ``, fragmentShader: `` }
};

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
        this.createNebula();
        this.createCosmicDust();

        this.composer = this.createComposer();
        this.apiService = new ApiService();
        this.uiManager = new UIManager(this.cameraManager, this.celestialBodies.filter(b => !b.isSource), this.apiService);
        
        this.addEventListeners();
        this.animate();

        this.loaderManager.finish();
    }

    createRenderer() {
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            powerPreference: "high-performance",
            // logarithmicDepthBuffer: true // Тимчасово вимкнено для діагностики
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.setClearColor(0x000000);
        return renderer;
    }

    createComposer() {
        const renderPass = new RenderPass(this.scene, this.cameraManager.camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.7); 
        this.godRaysPass = new ShaderPass(Shaders.godRays);
        this.godRaysPass.material.uniforms.uExposure.value = 0.35;
        this.godRaysPass.material.uniforms.uWeight.value = 0.5;   
        this.godRaysPass.needsSwap = true;
        
        const composer = new EffectComposer(this.renderer);
        composer.addPass(renderPass);
        composer.addPass(this.godRaysPass);
        composer.addPass(bloomPass);
        return composer;
    }

    createLighting() {
        this.scene.add(new THREE.AmbientLight(0xFFFFFF, 0.05));
        const sunLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
        sunLight.position.set(0, 0, 0); 
        this.scene.add(sunLight);
        this.sunLight = sunLight;
    }

    createStarfield() {
        const vertices = [];
        for (let i = 0; i < 15000; i++) {
            vertices.push(THREE.MathUtils.randFloatSpread(3000), THREE.MathUtils.randFloatSpread(3000), THREE.MathUtils.randFloatSpread(3000));
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, sizeAttenuation: true });
        this.scene.add(new THREE.Points(geometry, material));
    }

    createNebula() {
        const nebulaGeo = new THREE.SphereGeometry(1500, 64, 64);
        const nebulaMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: `varying vec3 vPosition; void main() { vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: Shaders.noise + Shaders.nebula,
            side: THREE.BackSide, 
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
        this.scene.add(nebula);
        this.nebula = nebula;
    }

    createCosmicDust() {
        const vertices = [];
        const sizes = [];
        const colors = [];
        const dustCount = 5000;

        for (let i = 0; i < dustCount; i++) {
            const x = THREE.MathUtils.randFloatSpread(1000);
            const y = THREE.MathUtils.randFloatSpread(1000);
            const z = THREE.MathUtils.randFloatSpread(1000);
            vertices.push(x, y, z);

            sizes.push(Math.random() * 0.5 + 0.1);
            
            const color = new THREE.Color(0xFFD700);
            color.multiplyScalar(Math.random() * 0.5 + 0.5);
            colors.push(color.r, color.g, color.b);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.05,
            depthWrite: false
        });

        this.cosmicDust = new THREE.Points(geometry, material);
        this.scene.add(this.cosmicDust);
    }

    async createCelestialBodies() {
        const textureLoader = new THREE.TextureLoader();
        console.log("Attempting to load Credo textures...");
        const textures = await this.loadCredoTextures(textureLoader);
        console.log("Credo textures loaded:", textures);

        const planetsConfig = [
            { type: 'Archive', name: "Архів", description: "Тут мовчать слова, але говорять віки. Кожен гліф — це доля, кожна орбіта — урок. Прислухайся до тиші, і ти почуєш істину.", color: new THREE.Color(0x4A90E2), size: 2.5, orbit: { a: 25, b: 24, speed: 0.08, axialSpeed: 0.2 }, hasRings: true, ringGlyphColor: new THREE.Color(0xF0E6D2), ringInnerRadius: 3, ringOuterRadius: 4.5, ringDensity: 20000, prompt: "Напиши поетичну замальовку про тишу, що зберігає мудрість, про гліфи, що сяють знанням, і про безкінечний пошук істини у бібліотеці віків.", url: 'books' }, 
            { type: 'Forge', name: "Кузня", description: "Горнило творіння, де ідеї знаходять форму. Тут народжується нове у вогні натхнення.", color: new THREE.Color(0xD0021B), size: 2.2, orbit: { a: 38, b: 39, speed: 0.06, axialSpeed: 0.1 }, prompt: "Напиши коротку, потужну притчу або вірш про біль творення, красу нової форми, що народжується з хаосу, і про безперервне полум'я натхнення.", url: 'ai-generator' }, 
            { type: 'Pact', name: "Пакт", description: "Кристал довіри, що сяє прозорістю. Його грані відображають чистоту намірів.", color: new THREE.Color(0xBD10E0), size: 2.0, orbit: { a: 55, b: 55, speed: 0.04, axialSpeed: 0.3 }, prompt: "Створи коротку, елегантну філософську думку або вірш про прозорість, довіру, цінність даного слова та про те, як чистота намірів відбиває світло істини.", url: 'pricing-tariffs' }, 
            { type: 'Credo', name: "Кредо", description: "Сад буття, що плекає красу зв'язку. Тут кожна душа знаходить свій дім.", color: new THREE.Color(0x2E8B57), size: 2.4, orbit: { a: 68, b: 65, speed: 0.03, axialSpeed: 0.25 }, textures, prompt: "Напиши теплий, надихаючий вірш або коротку замальовку про єдність, красу зв'язків між душами, відчуття дому та гармонію, що народжується у спільноті.", url: 'about-us' }, 
            
            { type: 'Planet', name: "Гільдія", description: "Світ співпраці та об'єднання. Тут народжуються ідеї, які єднають душі.", color: new THREE.Color(0x8A2BE2), size: 2.0, orbit: { a: 80, b: 78, speed: 0.02, axialSpeed: 0.15 }, isDouble: true, prompt: "Розкрийте сутність Гільдії: як два світи, що обертаються навколо спільного центру, символізують силу єдності та взаємодоповнення.", url: 'community' },
            { type: 'Planet', name: "Інсайти", description: "Газовий гігант, у вихорах якого приховані глибокі відкриття та несподівані думки.", color: new THREE.Color(0xFF4500), size: 3.0, orbit: { a: 95, b: 90, speed: 0.015, axialSpeed: 0.08 }, hasGreatSpot: true, greatSpotColor: new THREE.Color(0x8B0000), prompt: "Створи вірш або прозу про раптові спалахи інсайтів, що з'являються з хаосу мислення, як Велика Червона Пляма на газовому гіганті, символізуючи потужність інтелекту.", url: 'insights' }
        ];

        const source = new Sun({ name: "Джерело", description: "Джерело всього світла і життя. Споглядай Його велич.", size: 10 });
        this.celestialBodies.push(source);
        this.scene.add(source.group);

        planetsConfig.forEach(config => {
            let planet;
            switch(config.type) {
                case 'Archive': planet = new Archive(config); break; 
                case 'Forge': planet = new Forge(config); break;
                case 'Pact': planet = new Pact(config, this.renderer, this.scene); break;
                case 'Credo': planet = new Credo(config); break;
                default: planet = new Planet(config); 
                    // *** НОВА ЧАСТИНА: Явно створюємо mesh для базових Planet
                    const material = new THREE.MeshBasicMaterial({ color: config.color.getHex(), transparent: true, opacity: 1.0 }); // ВИКОРИСТОВУЄМО getHex()
                    planet.mesh = new THREE.Mesh(new THREE.SphereGeometry(planet.size, 64, 64), material);
                    planet.mesh.userData.celestialBody = planet;
                    planet.group.add(planet.mesh);
                    // *** КІНЕЦЬ НОВОЇ ЧАСТИНИ
            }
            this.celestialBodies.push(planet);
            this.scene.add(planet.group);
        });
    }

    async loadCredoTextures(loader) {
        console.log("Loading Credo day texture:", 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c2da226c827007b577b22_Copilot_20250720_014233.png');
        const dayTexture = await loader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c2da226c827007b577b22_Copilot_20250720_014233.png');

        console.log("Loading Credo night texture:", 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c024ead466abd5313cd10_Copilot_20250719_221536.png');
        const nightTexture = await loader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c024ead466abd5313cd10_Copilot_20250719_221536.png');
        
        console.log("Loading Credo cloud texture:", 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c1928c5195caae24ec511_ChatGPT%20Image%2020%20%D0%BB%D0%B8%D0%BF.%202025%20%D1%80.%2C%2000_13_34.png');
        const cloudTexture = await loader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c1928c5195caae24ec511_ChatGPT%20Image%2020%20%D0%BB%D0%B8%D0%BF.%202025%20%D1%80.%2C%2000_13_34.png');

        console.log("Loading Credo city lights texture:", 'https://www.solarsystemscope.com/textures/download/2k_earth_lights.jpg');
        const cityLightsTexture = await loader.loadAsync('https://www.solarsystemscope.com/textures/download/2k_earth_lights.jpg'); 
        
        [dayTexture, nightTexture, cloudTexture, cityLightsTexture].forEach(t => {
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
        });
        return { day: dayTexture, night: nightTexture, clouds: cloudTexture, cityLights: cityLightsTexture };
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.onResize());
        // Обробка кліків для інтеракції з планетами
        window.addEventListener('mousemove', (event) => {
            const mouse = new THREE.Vector2(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.cameraManager.camera);
            const intersects = raycaster.intersectObjects(this.scene.children, true);
            
            let hoveredBody = null;
            for (const intersect of intersects) {
                // Перевіряємо, чи це небесне тіло і чи не Сонце
                if (intersect.object.userData.celestialBody && !intersect.object.userData.celestialBody.isSource) {
                    hoveredBody = intersect.object.userData.celestialBody;
                    break;
                }
            }
            
            // Якщо наведено на нове тіло, оновлюємо курсор та UI
            if (hoveredBody) {
                document.body.style.cursor = 'pointer'; // Змінюємо системний курсор на вказівник
                // Тут можна додати візуальний ефект наведення на планету в 3D сцені (наприклад, пульсацію)
            } else {
                document.body.style.cursor = 'none'; // Повертаємо кастомний курсор (приховуючи системний)
            }
        });

        window.addEventListener('click', (event) => {
            const mouse = new THREE.Vector2(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.cameraManager.camera);
            const intersects = raycaster.intersectObjects(this.scene.children, true);

            for (const intersect of intersects) {
                if (intersect.object.userData.celestialBody && !intersect.object.userData.celestialBody.isSource) {
                    this.uiManager.setFocused(intersect.object.userData.celestialBody);
                    break;
                }
            }
        });
    }

    onResize() {
        this.cameraManager.onResize();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    
    updateGodRays() {
        // Перевіряємо, чи існує Сонце (Джерело)
        const sunBody = this.celestialBodies.find(b => b.isSource);
        if (!sunBody || !sunBody.mesh) return;

        const sunWorldPosition = new THREE.Vector3();
        sunBody.mesh.getWorldPosition(sunWorldPosition);

        // 1. Оновлення God Rays
        const sunScreenPosition = new THREE.Vector3();
        sunBody.mesh.getWorldPosition(sunScreenPosition);
        sunScreenPosition.project(this.cameraManager.camera);
        this.godRaysPass.material.uniforms.uLightPosition.value.x = (sunScreenPosition.x + 1) * 0.5;
        this.godRaysPass.material.uniforms.uLightPosition.value.y = (sunScreenPosition.y + 1) * 0.5;
        
        const distanceToSun = this.cameraManager.camera.position.distanceTo(sunWorldPosition);
        // Регулюємо інтенсивність променів залежно від відстані до Сонця
        this.godRaysPass.material.uniforms.uExposure.value = THREE.MathUtils.lerp(0.4, 0.0, Math.min(distanceToSun / 150, 1.0)); 

        // 2. Оновлення напрямку світла для шейдерів планет
        const sunDirection = new THREE.Vector3().subVectors(sunWorldPosition, new THREE.Vector3(0,0,0)).normalize(); // Напрямок від центру до Сонця
        this.celestialBodies.forEach(body => {
            if (body.mesh && body.mesh.material && body.mesh.material.uniforms && body.mesh.material.uniforms.uSunDirection) {
                body.mesh.material.uniforms.uSunDirection.value.copy(sunDirection);
            }
        });

        // 3. Оновлення направленого світла (для об'єктів без кастомних шейдерів)
        this.sunLight.position.copy(sunWorldPosition);
        this.sunLight.target.position.copy(new THREE.Vector3(0,0,0));
        this.sunLight.target.updateMatrixWorld();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        this.celestialBodies.forEach(body => body.update(elapsedTime, delta));
        if (this.nebula) this.nebula.material.uniforms.uTime.value = elapsedTime;
        if (this.cosmicDust) { // Оновлюємо обертання пилу
            this.cosmicDust.rotation.y += 0.00005 * delta;
            this.cosmicDust.rotation.x += 0.00002 * delta;
        }
        
        this.cameraManager.update(delta);
        this.updateGodRays(); // Оновлюємо GodRays та світло
        this.composer.render();
    }
}

/*
 * Керує камерою, її рухами та переходами.
 * Це погляд Мандрівника.
 */
class CameraManager {
    constructor(container) {
        this.container = container;
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 4000);
        this.camera.position.set(0, 70, 180); // Початкова позиція камери
        
        this.controls = new OrbitControls(this.camera, this.container);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.04;
        this.controls.minDistance = 10; // Мінімальне наближення до центру
        this.controls.maxDistance = 1000; // Максимальне віддалення
        this.controls.autoRotate = true; // Автоматичне обертання при запуску
        this.controls.autoRotateSpeed = 0.08;
        this.controls.target.set(0, 0, 0); // Фокус на центрі Всесвіту
    }

    focusOn(targetBody) {
        this.controls.autoRotate = false;
        this.controls.enabled = false; // Вимикаємо ручне управління під час анімації
        
        const targetPosition = new THREE.Vector3();
        targetBody.group.getWorldPosition(targetPosition); // Отримуємо світові координати планети
        
        const distance = targetBody.size * 4; // Відстань для зуму
        // Визначаємо кінцеву позицію камери, зберігаючи поточний кут погляду
        const endPosition = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize().multiplyScalar(distance).add(targetPosition);

        gsap.to(this.camera.position, { 
            duration: 3.5, 
            x: endPosition.x, y: endPosition.y, z: endPosition.z, 
            ease: "cubic.inOut" 
        });
        gsap.to(this.controls.target, { 
            duration: 3.5, 
            x: targetPosition.x, y: targetPosition.y, z: targetPosition.z, 
            ease: "cubic.inOut",
            onUpdate: () => this.controls.update(), // Оновлюємо контролер під час анімації
            onComplete: () => { this.controls.enabled = true; } // Вмикаємо ручне управління після анімації
        });
    }

    returnToOverview() {
        this.controls.enabled = false;
        gsap.to(this.camera.position, { 
            duration: 3.5, 
            x: 0, y: 70, z: 180, // Повернення до початкової глобальної позиції
            ease: "cubic.inOut"
        });
        gsap.to(this.controls.target, { 
            duration: 3.5, 
            x: 0, y: 0, z: 0, // Повернення фокуса на центр
            ease: "cubic.inOut",
            onUpdate: () => this.controls.update(),
            onComplete: () => { 
                this.controls.enabled = true; 
                this.controls.autoRotate = true; // Знову вмикаємо автообертання
            }
        });
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    update(delta) {
        this.controls.update(delta);
    }
}

/*
 * Керує "Книгою Мандрівника", нашим зв'язком зі світами.
 */
class UIManager {
    constructor(cameraManager, planets, apiService) {
        this.cameraManager = cameraManager;
        this.planets = planets;
        this.apiService = apiService;
        this.sidebar = document.getElementById('sidebar');
        this.navContent = document.getElementById('nav-content');
        this.focusedObject = null;
        this.pulseTween = null;
        this.populateNav();
        // Raycaster для UI подій обробляється в Universe класі для 3D об'єктів
        // UI елементи в сайдбарі мають свої власні pointer-events
    }

    populateNav() {
        const html = `<div class="nav-list"><h2>Світи Одкровення</h2><ul>${this.planets.map(p => `<li data-name="${p.name}" data-url="${p.url || '#'}">${p.name}</li>`).join('')}</ul></div>`;
        this.navContent.innerHTML = html;
        this.navContent.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', (e) => this.onNavClick(e));
            // Додаємо обробники для візуального ефекту наведення в UI
            li.addEventListener('mouseenter', () => li.classList.add('hovered'));
            li.addEventListener('mouseleave', () => li.classList.remove('hovered'));
        });
    }

    onNavClick(event) {
        const planetName = event.target.dataset.name;
        const planetUrl = event.target.dataset.url; // Отримуємо URL планети
        const planet = this.planets.find(p => p.name === planetName);
        if (planet) {
            this.setFocused(planet);
            // Опціонально: перехід на URL сторінки при кліку на кнопку "УВІЙТИ"
            // Для навігації через Three.js, ми не переходимо одразу, а чекаємо кліку на кнопку
        }
    }

    setFocused(targetBody) {
        if (this.focusedObject === targetBody) return;
        this.focusedObject = targetBody;
        
        this.cameraManager.focusOn(targetBody);
        this.updateSidebarToFocusedView(targetBody);
        
        // Оновлення активного елемента в списку
        this.navContent.querySelectorAll('li').forEach(li => {
            li.classList.toggle('active', li.dataset.name === targetBody.name);
        });

        // Пульсація
        if (this.pulseTween) this.pulseTween.kill();
        this.planets.forEach(p => { if(p.mesh && p.mesh.material.uniforms && p.mesh.material.uniforms.uPulse) gsap.to(p.mesh.material.uniforms.uPulse, { value: 0, duration: 0.5 }); });
        if(targetBody.mesh && targetBody.mesh.material.uniforms && targetBody.mesh.material.uniforms.uPulse) {
            this.pulseTween = gsap.to(targetBody.mesh.material.uniforms.uPulse, { value: 1, duration: 1.5, repeat: -1, yoyo: true, ease: 'power1.inOut' });
        }
    }

    returnToGlobalView() {
        if (!this.focusedObject) return;
        this.focusedObject = null;
        this.cameraManager.returnToOverview();
        this.updateSidebarToGlobalView();
        if (this.pulseTween) this.pulseTween.kill();
        this.planets.forEach(p => { if(p.mesh && p.mesh.material.uniforms && p.mesh.material.uniforms.uPulse) gsap.to(p.mesh.material.uniforms.uPulse, { value: 0, duration: 0.5 }); });
    }

    updateSidebarToFocusedView(targetBody) {
        const html = `
            <div class="focused-view">
                <h2>${targetBody.name}</h2>
                <p>${targetBody.description}</p>
                <div class="whisper-container" id="whisper-box">
                    <div class="loading-whisper">Планета шепоче</div>
                </div>
                <button class="return-button">Повернутися до огляду</button>
                ${targetBody.url ? `<button class="enter-planet-button" data-url="${targetBody.url}">УВІЙТИ</button>` : ''}
            </div>`;
        this.navContent.innerHTML = html;
        this.navContent.querySelector('.return-button').addEventListener('click', () => this.returnToGlobalView());
        
        const enterButton = this.navContent.querySelector('.enter-planet-button');
        if (enterButton) {
            enterButton.addEventListener('click', () => {
                // Анімація "накопичення енергії" перед переходом
                gsap.to(enterButton, {
                    scale: 1.05,
                    duration: 0.3,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        // Анімація "занурення" в атмосферу планети
                        gsap.to(this.cameraManager.camera.position, {
                            duration: 2,
                            z: this.cameraManager.camera.position.z * 0.1, // Швидкий зум всередину
                            ease: 'power2.in',
                            onComplete: () => {
                                window.location.href = targetBody.url; // Перехід на URL
                            }
                        });
                    }
                });
            });
        }
        
        this.fetchAndDisplayWhisper(targetBody);
    }
    
    async fetchAndDisplayWhisper(targetBody) {
        const whisperBox = document.getElementById('whisper-box');
        if (!whisperBox) return;
        try {
            const whisperText = await this.apiService.getWhisper(targetBody.prompt);
            whisperBox.innerHTML = `<p>${whisperText.replace(/\n/g, '<br>')}</p>`;
        } catch (error) {
            console.error("Помилка отримання шепоту:", error);
            whisperBox.innerHTML = `<p>Тиша... Світ мовчить у цей момент.</p>`;
        }
    }

    updateSidebarToGlobalView() {
        this.populateNav();
    }
}

/*
 * Посередник між нашим світом та божественним розумом Gemini.
 */
class ApiService {
    async getWhisper(prompt) {
        const apiKey = "AIzaSyALcRmtwlSubUpygvp_j9ifowIJV0gzzOI"; // <--- ВАШ GEMINI API KEY ВЖЕ ТУТ!
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: `You are a wise, poetic oracle of a mystical world. Respond in Ukrainian. ${prompt}` }]
            }],
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 150
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.warn("Неочікувана структура відповіді від API:", result);
            if (result.promptFeedback && result.promptFeedback.blockReason) {
                return `Планета мовчить через обмеження: ${result.promptFeedback.blockReason}`;
            }
            return "Планета мовчить, її думки зараз приховані.";
        }
    }
}

/*
 * Керує Актом Творіння (завантажувальний екран).
 */
class LoaderManager {
    constructor() {
        this.loaderElement = document.getElementById('loader');
        // Анімація проявлення світла на завантажувальному екрані
        gsap.fromTo(this.loaderElement.querySelector('p'), 
            { opacity: 0, scale: 0.8 }, 
            { opacity: 1, scale: 1, duration: 1.5, ease: 'power2.out', delay: 0.5 }
        );
    }
    finish() {
        gsap.to(this.loaderElement, {
            opacity: 0, 
            duration: 1.5, 
            ease: 'power2.inOut', 
            delay: 0.5, // Затримка перед зникненням
            onComplete: () => {
                this.loaderElement.style.display = 'none';
                document.body.style.overflow = 'hidden'; // Забезпечуємо відсутність прокрутки після завантаження
            }
        });
    }
}

/*
 * Базовий клас для всіх небесних тіл.
 */
class CelestialBody {
    constructor(config) {
        this.name = config.name;
        this.description = config.description;
        this.prompt = config.prompt || ""; // Для Gemini API
        this.size = config.size;
        this.isSource = config.isSource || false;
        this.group = new THREE.Group(); // Група для планети + атмосфери/кілець
        this.url = config.url || '#'; // URL для переходу на сторінку
    }
    update(elapsedTime, delta) {}
}

class Sun extends CelestialBody {
    constructor(config) {
        super({ ...config, isSource: true });
        
        const surfaceMaterial = new THREE.ShaderMaterial({ 
            uniforms: { uTime: { value: 0 } }, 
            vertexShader: Shaders.sharedVertex, 
            fragmentShader: Shaders.noise + Shaders.sun.surface 
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 128, 128), surfaceMaterial);
        this.mesh.userData.celestialBody = this; // Для Raycasting
        this.group.add(this.mesh);
        
        const coronaMaterial = new THREE.ShaderMaterial({ 
            uniforms: { uTime: { value: 0 } }, 
            vertexShader: Shaders.sharedVertex, 
            fragmentShader: Shaders.noise + Shaders.sun.corona,
            blending: THREE.AdditiveBlending, 
            transparent: true, 
            depthWrite: false 
        });
        const corona = new THREE.Mesh(new THREE.SphereGeometry(this.size * 1.6, 128, 128), coronaMaterial); // Збільшена корона
        this.group.add(corona);
    }
    update(elapsedTime) {
        this.mesh.material.uniforms.uTime.value = elapsedTime;
        this.group.children[1].material.uniforms.uTime.value = elapsedTime;
    }
}

class Planet extends CelestialBody {
    constructor(config) {
        super(config);
        this.orbit = config.orbit;
        this.orbit.offset = Math.random() * Math.PI * 2; // Випадковий початковий кут для різноманітності

        // ***ВАЖЛИВО: ТЕПЕР МЕШ СТВОРЮЄТЬСЯ ТУТ ЛИШЕ ЯКЩО НЕМАЄ СПЕЦІАЛІЗОВАНОГО МАТЕРІАЛУ В КОНФІГУ***
        // Інакше він буде створений у спеціалізованих класах
        this.mesh = null; // Забезпечуємо, що mesh спочатку null

        // Атмосфера (якщо потрібна)
        if (config.hasAtmosphere) {
            const atmosphereMaterial = new THREE.MeshBasicMaterial({
                color: config.atmosphereColor.getHex(), // ВИКОРИСТОВУЄМО getHex()
                transparent: true,
                opacity: 0.1, // Низька прозорість атмосфери
                side: THREE.BackSide
            });
            const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(this.size * 1.1, 64, 64), atmosphereMaterial);
            this.group.add(atmosphere);
        }

        // Кільця (якщо потрібні, не для Архіва)
        if (config.hasRings && config.type !== 'Archive') { 
            const ringGeometry = new THREE.TorusGeometry(this.size * 1.5, 0.2, 16, 100);
            const ringMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xAAAAAA).getHex(), side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
            const rings = new THREE.Mesh(ringGeometry, ringMaterial);
            rings.rotation.x = Math.PI / 2; // Орієнтуємо кільця горизонтально
            this.group.add(rings);
        }
    }
    update(elapsedTime, delta) {
        const angle = elapsedTime * this.orbit.speed + this.orbit.offset;
        this.group.position.x = Math.cos(angle) * this.orbit.a;
        this.group.position.z = Math.sin(angle) * this.orbit.b;
        if (this.mesh) {
            this.mesh.rotation.y += this.orbit.axialSpeed * delta;
            // У цьому діагностичному режимі ми не оновлюємо уніформи шейдерів,
            // оскільки використовуємо MeshBasicMaterial.
        }
    }
}
    
// Спеціалізовані класи для планет
class Archive extends Planet {
    constructor(config) {
        super(config); // Викликаємо батьківський конструктор
        
        // Custom material for the geode effect - використовуємо базовий для діагностики
        const material = new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true, opacity: 1.0 }); // ФІКСОВАНИЙ КОЛІР
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh); 

        // Create Rings of Glyphs using InstancedMesh
        if (config.hasRings) {
            const glyphGeometry = new THREE.PlaneGeometry(0.1, 0.1); 
            const glyphMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00FF00, // ФІКСОВАНИЙ КОЛІР
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.1, // Зроблено ще більш ефірним для діагностики
                side: THREE.DoubleSide 
            });
            
            this.glyphInstances = new THREE.InstancedMesh(glyphGeometry, glyphMaterial, config.ringDensity);
            this.glyphInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

            const dummy = new THREE.Object3D(); 
            for (let i = 0; i < config.ringDensity; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = THREE.MathUtils.randFloat(config.ringInnerRadius, config.ringOuterRadius);
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                const y = THREE.MathUtils.randFloatSpread(0.1); 

                dummy.position.set(x, y, z);
                dummy.rotation.y = Math.random() * Math.PI * 2; 
                dummy.updateMatrix(); 
                this.glyphInstances.setMatrixAt(i, dummy.matrix); 
            }
            this.glyphInstances.instanceMatrix.needsUpdate = true; 
            this.group.add(this.glyphInstances);
        }
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta); 
        // У цьому діагностичному режимі ми не оновлюємо уніформи шейдерів.
        if (this.glyphInstances) {
            this.glyphInstances.rotation.y += delta * 0.05; 
        }
    }
}
    
class Forge extends Planet {
    constructor(config) {
        super(config); // Викликаємо батьківський конструктор
        const material = new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true, opacity: 1.0 }); // ФІКСОВАНИЙ КОЛІР
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh);
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta);
        // У цьому діагностичному режимі ми не оновлюємо уніформи шейдерів.
    }
}

class Pact extends Planet {
    constructor(config, renderer, scene) {
        super(config); // Викликаємо батьківський конструктор
        this.cubeCamera = new THREE.CubeCamera(1, 2000, new THREE.WebGLCubeRenderTarget(256));
        this.scene = scene;
        this.renderer = renderer;
        
        const material = new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true, opacity: 1.0 }); // ФІКСОВАНИЙ КОЛІР
        this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(this.size, 5), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh); 
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta);
        this.mesh.visible = false; 
        this.cubeCamera.position.copy(this.group.position);
        this.cubeCamera.update(this.renderer, this.scene);
        this.mesh.visible = true; 
        // У цьому діагностичному режимі ми не оновлюємо уніформи шейдерів.
    }
}

class Credo extends Planet {
    constructor(config) {
        super(config); // Викликаємо батьківський конструктор
        // ВИКОРИСТОВУЄМО ТИМЧАСОВИЙ BASIC МАТЕРІАЛ ДЛЯ ДІАГНОСТИКИ
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00FF00, // ФІКСОВАНИЙ КОЛІР
            transparent: true,
            opacity: 1.0 // Повна непрозорість для видимості
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh); 
        
        // Атмосфера також MeshBasicMaterial для діагностики
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FF00, // ФІКСОВАНИЙ КОЛІР
            transparent: true,
            opacity: 0.1, // Низька прозорість
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(this.size * 1.1, 64, 64), atmosphereMaterial);
        this.group.add(atmosphere);
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta);
        // У цьому діагностичному режимі ми не оновлюємо уніформи шейдерів.
    }
}

// --- Ініціалізація курсору ---
const cursorDot = document.getElementById('cursor-dot');
window.addEventListener('mousemove', e => {
    gsap.to(cursorDot, {
        duration: 0.3,
        x: e.clientX,
        y: e.clientY,
        ease: 'power2.out'
    });
});

// =============================================================================
// --- ЗАПУСК ВСЕСВІТУ ---
// =============================================================================
new Universe();
