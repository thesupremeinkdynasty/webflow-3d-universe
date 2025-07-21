// universe.js - Повна версія коду після АКТУ ПРОЯВЛЕННЯ
// Цей код активує створення всіх небесних тіл з їхніми діагностичними кольорами.

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
    noise: `
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            vec4 x = x_ * ns.x + ns.yyyy;
            vec4 y = y_ * ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        float fbm(vec3 p, int octaves) {
            float f = 0.0;
            float a = 0.5;
            for (int i = 0; i < octaves; i++) {
                f += a * snoise(p);
                p *= 2.0;
                a *= 0.5;
            }
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
        surface: `
            uniform float uTime;  
            varying vec2 vUv;
            void main() { gl_FragColor = vec4(1.0, 0.8, 0.4, 1.0); } // Fixed color for diagnostic
        `,
        corona: `
            uniform float uTime;
            varying vec3 vNormal;
            void main() { gl_FragColor = vec4(1.0, 0.8, 0.4, 0.1); } // Fixed color for diagnostic
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
    nebula: `
        uniform float uTime;
        varying vec3 vPosition;
        void main() { gl_FragColor = vec4(0.5, 0.5, 0.5, 0.1); }
    `,
    godRays: {
        uniforms: { tDiffuse: { value: null }, uLightPosition: { value: new THREE.Vector2(0.5, 0.5) }, uExposure: { value: 0.25 }, uDecay: { value: 0.97 }, uDensity: { value: 0.96 }, uWeight: { value: 0.4 }, uClamp: { value: 1.0 }},
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
            varying vec2 vUv; 
            uniform sampler2D tDiffuse; 
            uniform vec2 uLightPosition; 
            uniform float uExposure, uDecay, uDensity, uWeight, uClamp; 
            const int SAMPLES = 60; 
            void main() { 
                vec2 tc = vUv; 
                vec2 dTC = tc - uLightPosition; 
                dTC *= 1.0 / float(SAMPLES) * uDensity; 
                float id = 1.0; 
                vec4 c = texture2D(tDiffuse, tc); 
                for (int i = 0; i < SAMPLES; i++) { 
                    tc -= dTC; 
                    vec4 s = texture2D(tDiffuse, tc); 
                    s.rgb *= id * uWeight; 
                    c.rgb += s.rgb; 
                    id *= uDecay; 
                } 
                gl_FragColor = clamp(c * uExposure, 0.0, uClamp); 
            }`
    }
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

        this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
            console.error('WebGL context lost!', event);
            event.preventDefault();
        });
        this.renderer.domElement.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored!');
        });

        this.createLighting();
        
        try {
            // ВИМКНЕНО ДІАГНОСТИКУ, АКТИВОВАНО СТВОРЕННЯ СВІТІВ
            // this.createSunAndTestSphere(); 
            await this.createCelestialBodies(); 
        } catch (error) {
            console.error("An error occurred during createCelestialBodies:", error);
            this.loaderManager.showError("Не вдалося завантажити Всесвіт. Спробуйте оновити сторінку.");
        }
        
        this.createStarfield();
        this.createNebula();
        this.createCosmicDust();

        this.apiService = new ApiService();
        this.uiManager = new UIManager(this.cameraManager, this.celestialBodies.filter(b => !b.isSource), this.apiService);
        
        this.addEventListeners();
        this.animate();

        this.loaderManager.finish();
    }

    createRenderer() {
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true, 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.setClearColor(0x000000, 0); 
        
        const gl = renderer.getContext();
        if (gl) {
            console.log("WebGL Context obtained successfully.");
        } else {
            console.error("Failed to obtain WebGL Context!");
        }

        return renderer;
    }

    createLighting() {
        this.scene.add(new THREE.AmbientLight(0xFFFFFF, 0.1)); // Трохи більше світла
        const sunLight = new THREE.PointLight(0xFFFFFF, 1.5, 2000); // Змінено на PointLight для кращого ефекту
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
            fragmentShader: Shaders.nebula, // ВИПРАВЛЕНО: Забрано Shaders.noise
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
        const dustCount = 5000;
        for (let i = 0; i < dustCount; i++) {
            vertices.push(THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000), THREE.MathUtils.randFloatSpread(1000));
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({
            size: 1.5,
            color: 0xFFD700,
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
        const textures = await this.loadCredoTextures(textureLoader);

        // Створюємо Сонце
        const source = new Sun({ name: "Джерело", description: "Джерело всього світла і життя.", size: 10 });
        this.celestialBodies.push(source);
        this.scene.add(source.group);

        const planetsConfig = [
            { type: 'Archive', name: "Архів", description: "Тут мовчать слова, але говорять віки.", color: new THREE.Color(0x4A90E2), size: 2.5, orbit: { a: 25, b: 24, speed: 0.08, axialSpeed: 0.2 }, hasRings: true, ringGlyphColor: new THREE.Color(0xF0E6D2), ringInnerRadius: 3, ringOuterRadius: 4.5, ringDensity: 20000, prompt: "Напиши поетичну замальовку про тишу, що зберігає мудрість.", url: 'books' }, 
            { type: 'Forge', name: "Кузня", description: "Горнило творіння, де ідеї знаходять форму.", color: new THREE.Color(0xD0021B), size: 2.2, orbit: { a: 38, b: 39, speed: 0.06, axialSpeed: 0.1 }, prompt: "Напиши коротку, потужну притчу про біль творення.", url: 'ai-generator' }, 
            { type: 'Pact', name: "Пакт", description: "Кристал довіри, що сяє прозорістю.", color: new THREE.Color(0xBD10E0), size: 2.0, orbit: { a: 55, b: 55, speed: 0.04, axialSpeed: 0.3 }, prompt: "Створи коротку, елегантну філософську думку про прозорість.", url: 'pricing-tariffs' }, 
            { type: 'Credo', name: "Кредо", description: "Сад буття, що плекає красу зв'язку.", color: new THREE.Color(0x2E8B57), size: 2.4, orbit: { a: 68, b: 65, speed: 0.03, axialSpeed: 0.25 }, textures, prompt: "Напиши теплий, надихаючий вірш про єдність.", url: 'about-us' },
            // Додамо інші планети з базовим шейдером для діагностики
            { type: 'Planet', name: "Гільдія", description: "Світ співпраці та об'єднання.", color: new THREE.Color(0x8A2BE2), size: 2.0, orbit: { a: 80, b: 78, speed: 0.02, axialSpeed: 0.15 }, prompt: "Розкрийте сутність Гільдії.", url: 'community' },
            { type: 'Planet', name: "Інсайти", description: "Газовий гігант, у вихорах якого приховані глибокі відкриття.", color: new THREE.Color(0xFF4500), size: 3.0, orbit: { a: 95, b: 90, speed: 0.015, axialSpeed: 0.08 }, prompt: "Створи вірш про раптові спалахи інсайтів.", url: 'insights' }
        ];

        // АКТИВОВАНО: Створення планет
        planetsConfig.forEach(config => {
            let planet;
            switch(config.type) {
                case 'Archive': planet = new Archive(config); break; 
                case 'Forge': planet = new Forge(config); break;
                case 'Pact': planet = new Pact(config, this.renderer, this.scene); break;
                case 'Credo': planet = new Credo(config); break;
                default: 
                    planet = new Planet(config); 
                    const material = new THREE.MeshLambertMaterial({ // ВИПРАВЛЕНО: Використовуємо простіший матеріал для діагностики
                        color: config.color || new THREE.Color(0xffffff),
                        emissive: config.color || new THREE.Color(0xffffff),
                        emissiveIntensity: 0.3
                    });
                    planet.mesh = new THREE.Mesh(new THREE.SphereGeometry(planet.size, 64, 64), material);
                    planet.mesh.userData.celestialBody = planet;
                    planet.group.add(planet.mesh);
            }
            this.celestialBodies.push(planet);
            this.scene.add(planet.group);
        });
    }

    async loadCredoTextures(loader) {
        try {
            const dayTexture = await loader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c2da226c827007b577b22_Copilot_20250720_014233.png');
            const nightTexture = await loader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c024ead466abd5313cd10_Copilot_20250719_221536.png');
            const cloudTexture = await loader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c1928c5195caae24ec511_ChatGPT%20Image%2020%20%D0%BB%D0%B8%D0%BF.%202025%20%D1%80.%2C%2000_13_34.png');
            const cityLightsTexture = await loader.loadAsync('https://placehold.co/2048x1024/000000/FFFFFF?text=CityLights'); 
            
            [dayTexture, nightTexture, cloudTexture, cityLightsTexture].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
            return { day: dayTexture, night: nightTexture, clouds: cloudTexture, cityLights: cityLightsTexture };
        } catch (error) {
            console.error("Error loading Credo textures:", error);
            return { day: new THREE.Texture(), night: new THREE.Texture(), clouds: new THREE.Texture(), cityLights: new THREE.Texture() };
        }
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('mousemove', (event) => {
            const mouse = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.cameraManager.camera);
            const intersects = raycaster.intersectObjects(this.scene.children, true);
            
            let hoveredBody = null;
            for (const intersect of intersects) {
                if (intersect.object.userData.celestialBody && !intersect.object.userData.celestialBody.isSource) {
                    hoveredBody = intersect.object.userData.celestialBody;
                    break;
                }
            }
            document.body.style.cursor = hoveredBody ? 'pointer' : 'none';
        });

        window.addEventListener('click', (event) => {
            const mouse = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
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
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        this.celestialBodies.forEach(body => body.update(elapsedTime, delta));
        if (this.nebula) this.nebula.material.uniforms.uTime.value = elapsedTime;
        if (this.cosmicDust) { 
            this.cosmicDust.rotation.y += 0.00005 * delta;
            this.cosmicDust.rotation.x += 0.00002 * delta;
        }
        
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

    focusOn(targetBody) {
        this.controls.autoRotate = false;
        this.controls.enabled = false; 
        
        const targetPosition = new THREE.Vector3();
        targetBody.group.getWorldPosition(targetPosition); 
        
        const distance = targetBody.size * 4; 
        const endPosition = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize().multiplyScalar(distance).add(targetPosition);

        gsap.to(this.camera.position, { duration: 3.5, x: endPosition.x, y: endPosition.y, z: endPosition.z, ease: "cubic.inOut" });
        gsap.to(this.controls.target, { 
            duration: 3.5, 
            x: targetPosition.x, y: targetPosition.y, z: targetPosition.z, 
            ease: "cubic.inOut",
            onUpdate: () => this.controls.update(), 
            onComplete: () => { this.controls.enabled = true; } 
        });
    }

    returnToOverview() {
        this.controls.enabled = false;
        gsap.to(this.camera.position, { duration: 3.5, x: 0, y: 70, z: 180, ease: "cubic.inOut"});
        gsap.to(this.controls.target, { 
            duration: 3.5, x: 0, y: 0, z: 0, ease: "cubic.inOut",
            onUpdate: () => this.controls.update(),
            onComplete: () => { this.controls.enabled = true; this.controls.autoRotate = true; }
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
    }

    populateNav() {
        const html = `<div class="nav-list"><h2>Світи Одкровення</h2><ul>${this.planets.map(p => `<li data-name="${p.name}" data-url="${p.url || '#'}">${p.name}</li>`).join('')}</ul></div>`;
        this.navContent.innerHTML = html;
        this.navContent.querySelectorAll('li').forEach(li => li.addEventListener('click', (e) => this.onNavClick(e)));
    }

    onNavClick(event) {
        const planetName = event.target.dataset.name;
        const planet = this.planets.find(p => p.name === planetName);
        if (planet) this.setFocused(planet);
    }

    setFocused(targetBody) {
        if (this.focusedObject === targetBody) return;
        this.focusedObject = targetBody;
        
        this.cameraManager.focusOn(targetBody);
        this.updateSidebarToFocusedView(targetBody);
        
        this.navContent.querySelectorAll('li').forEach(li => li.classList.toggle('active', li.dataset.name === targetBody.name));

        if (this.pulseTween) this.pulseTween.kill();
        this.planets.forEach(p => { 
            if(p.mesh && p.mesh.material.emissive) {
                gsap.to(p.mesh.material.emissive, { r: p.color.r, g: p.color.g, b: p.color.b, duration: 0.5 });
            }
        });
        if(targetBody.mesh && targetBody.mesh.material.emissive) {
            this.pulseTween = gsap.to(targetBody.mesh.material.emissive, { 
                r: 1, g: 1, b: 1, duration: 1.5, repeat: -1, yoyo: true, ease: 'power1.inOut' 
            });
        }
    }

    returnToGlobalView() {
        if (!this.focusedObject) return;
        this.focusedObject = null;
        this.cameraManager.returnToOverview();
        this.updateSidebarToGlobalView();
        if (this.pulseTween) this.pulseTween.kill();
        this.planets.forEach(p => { 
             if(p.mesh && p.mesh.material.emissive) {
                gsap.to(p.mesh.material.emissive, { r: p.color.r, g: p.color.g, b: p.color.b, duration: 0.5 });
            }
        });
    }

    updateSidebarToFocusedView(targetBody) {
        const html = `
            <div class="focused-view">
                <h2>${targetBody.name}</h2>
                <p>${targetBody.description}</p>
                <div class="whisper-container" id="whisper-box"><div class="loading-whisper">Планета шепоче</div></div>
                <button class="return-button">Повернутися до огляду</button>
                ${targetBody.url ? `<button class="enter-planet-button" data-url="${targetBody.url}">УВІЙТИ</button>` : ''}
            </div>`;
        this.navContent.innerHTML = html;
        this.navContent.querySelector('.return-button').addEventListener('click', () => this.returnToGlobalView());
        
        const enterButton = this.navContent.querySelector('.enter-planet-button');
        if (enterButton) {
            enterButton.addEventListener('click', () => window.location.href = targetBody.url);
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

class ApiService {
    async getWhisper(prompt) {
        const apiKey = "ВАШ_НОВИЙ_API_КЛЮЧ"; // ЗАМІНІТЬ ЦЕ НА ВАШ РЕАЛЬНИЙ КЛЮЧ
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: `You are a wise, poetic oracle of a mystical world. Respond in Ukrainian. ${prompt}` }]
            }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 150 }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const result = await response.json();
        
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.warn("Unexpected API response structure:", result);
            return `Планета мовчить через обмеження: ${result.promptFeedback?.blockReason || 'невідома причина'}`;
        }
    }
}

class LoaderManager {
    constructor() {
        this.loaderElement = document.getElementById('loader');
        gsap.fromTo(this.loaderElement.querySelector('p'), 
            { opacity: 0, scale: 0.8 }, 
            { opacity: 1, scale: 1, duration: 1.5, ease: 'power2.out', delay: 0.5 }
        );
    }
    finish() {
        gsap.to(this.loaderElement, {
            opacity: 0, duration: 1.5, ease: 'power2.inOut', delay: 0.5, 
            onComplete: () => { this.loaderElement.style.display = 'none'; }
        });
    }
}

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
    }
    update(elapsedTime, delta) {}
}

class Sun extends CelestialBody {
    constructor(config) {
        super({ ...config, isSource: true });
        
        const surfaceMaterial = new THREE.ShaderMaterial({ 
            uniforms: { uTime: { value: 0 } }, 
            vertexShader: Shaders.sharedVertex, 
            fragmentShader: Shaders.sun.surface, // ВИПРАВЛЕНО: Забрано Shaders.noise
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 128, 128), surfaceMaterial);
        this.mesh.userData.celestialBody = this; 
        this.group.add(this.mesh);
        
        const coronaMaterial = new THREE.ShaderMaterial({ 
            uniforms: { uTime: { value: 0 } }, 
            vertexShader: Shaders.sharedVertex, 
            fragmentShader: Shaders.sun.corona, // ВИПРАВЛЕНО: Забрано Shaders.noise
            blending: THREE.AdditiveBlending, 
            transparent: true, 
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const corona = new THREE.Mesh(new THREE.SphereGeometry(this.size * 1.6, 128, 128), coronaMaterial); 
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
        this.orbit.offset = Math.random() * Math.PI * 2; 
        this.mesh = null; 
    }
    update(elapsedTime, delta) {
        const angle = elapsedTime * this.orbit.speed + this.orbit.offset;
        this.group.position.x = Math.cos(angle) * this.orbit.a;
        this.group.position.z = Math.sin(angle) * this.orbit.b;
        if (this.mesh) {
            this.mesh.rotation.y += this.orbit.axialSpeed * delta;
        }
    }
}
    
class Archive extends Planet {
    constructor(config) {
        super(config); 
        const material = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
            vertexShader: Shaders.sharedVertex,
            fragmentShader: Shaders.archive, // ВИПРАВЛЕНО
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh); 
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta); 
        this.mesh.material.uniforms.uTime.value = elapsedTime;
    }
}
    
class Forge extends Planet {
    constructor(config) {
        super(config); 
        const material = new THREE.ShaderMaterial({ 
            uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
            vertexShader: Shaders.sharedVertex,
            fragmentShader: Shaders.forge, // ВИПРАВЛЕНО
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh);
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta);
        this.mesh.material.uniforms.uTime.value = elapsedTime;
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
            fragmentShader: Shaders.pact, // ВИПРАВЛЕНО
            side: THREE.DoubleSide
        });
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
        this.mesh.material.uniforms.uTime.value = elapsedTime; 
    }
}

class Credo extends Planet {
    constructor(config) {
        super(config); 
        const material = new THREE.ShaderMaterial({ 
            uniforms: {
                uTime: { value: 0 },
                uDayTexture: { value: config.textures.day }, 
                uNightTexture: { value: config.textures.night }, 
                uCloudTexture: { value: config.textures.clouds }, 
                uCityLightsTexture: { value: config.textures.cityLights }, 
                uSunDirection: { value: new THREE.Vector3(1, 0, 0) }
            },
            vertexShader: Shaders.sharedVertex,
            fragmentShader: Shaders.credo, // ВИПРАВЛЕНО
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh); 
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta);
        this.mesh.material.uniforms.uTime.value = elapsedTime;
    }
}

const cursorDot = document.getElementById('cursor-dot');
window.addEventListener('mousemove', e => {
    gsap.to(cursorDot, { duration: 0.3, x: e.clientX, y: e.clientY, ease: 'power2.out' });
});

new Universe();
