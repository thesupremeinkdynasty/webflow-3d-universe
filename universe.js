import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

const Shaders = {
    noise: `
        vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
        float snoise(vec3 v){ const vec2 C = vec2(1.0/6.0, 1.0/3.0) ; const vec4 D = vec4(0.0, 0.5, 1.0, 2.0); vec3 i  = floor(v + dot(v, C.yyy) ); vec3 x0 = v - i + dot(i, C.xxx) ; vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min( g.xyz, l.zxy ); vec3 i2 = max( g.xyz, l.zxy ); vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy; i = mod(i, 289.0); vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 )); vec3 ns = D.wyz - D.xzx; vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_ ); vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y); vec4 b0 = vec4( x.xy, y.xy ); vec4 b1 = vec4( x.zw, y.zw ); vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0)); vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww; vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w); vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3))); p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w; vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m; return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) ); }
        float fbm(vec3 p) { float f = 0.0; f += 0.50 * snoise(p); p *= 2.02; f += 0.25 * snoise(p); return f / 0.75; }`,
    sharedVertex: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    sunCorona: `uniform float uTime; varying vec3 vNormal; void main() { float i = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); float n = fbm(vNormal * 3.0 + uTime * 0.2); i *= (0.8 + n * 0.2); gl_FragColor = vec4(vec3(1.0, 0.6, 0.2) * i * (1.0 + sin(uTime * 0.5) * 0.2), 1.0); }`
};

class Universe {
    constructor() {
        this.container = document.getElementById('webgl-canvas'); this.clock = new THREE.Clock(); this.celestialBodies = []; this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2(-10, -10); this.hoveredPlanet = null; this.init();
    }

    async init() {
        this.loaderManager = new LoaderManager();
        this.scene = new THREE.Scene();
        this.cameraManager = new CameraManager(this.container);
        this.renderer = this.createRenderer();
        
        this.createLighting();
        await this.createEnvironment();
        await this.createCelestialBodies();
        
        this.composer = this.createComposer();
        this.uiManager = new UIManager(this.cameraManager, this.celestialBodies.filter(b => !b.isSource));
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
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.5, 0.8);
        composer.addPass(bloomPass);
        return composer;
    }
    
    createLighting() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const pointLight = new THREE.PointLight(0xffffff, 1.5, 3000);
        this.scene.add(pointLight);
    }

    async createEnvironment() {
        const textureLoader = new THREE.TextureLoader();
        try {
            const starfieldTexture = await textureLoader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687d3cc795859f0d3a3b488f_8k_stars_milky_way.jpg');
            const bgGeo = new THREE.SphereGeometry(3000, 64, 64);
            const bgMat = new THREE.MeshBasicMaterial({ map: starfieldTexture, side: THREE.BackSide });
            this.scene.add(new THREE.Mesh(bgGeo, bgMat));
        } catch(e) { console.error("Не вдалося завантажити зоряне небо:", e); }
    }

    async createCelestialBodies() {
        const textureLoader = new THREE.TextureLoader();
        let textures = {};
        try {
            textures = {
                sun: { map: await textureLoader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687ec73077ae556a394ceaba_8k_sun.jpg') },
                credo: { 
                    map: await textureLoader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c2da226c827007b577b22_Copilot_20250720_014233.png'),
                    clouds: await textureLoader.loadAsync('https://i.imgur.com/K1G4G7a.png'),
                    night: await textureLoader.loadAsync('https://i.imgur.com/k26p1Wp.jpeg'),
                },
                archive: { map: await textureLoader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687d0eb009d11e7ccc1190bc_%D0%BF%D0%BB%D0%B0%D0%BD%D0%B5%D1%82%D0%B0%201.png') },
                forge: { map: await textureLoader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b95e0b0e78f91b89f0e_2.1.png') },
                pact: { map: await textureLoader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b92e0b0e78f91b89af5_9.1.png') },
                guild: { map: await textureLoader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b94b53ba90dbc022678_8.1.png') },
                insights: { map: await textureLoader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b93f5194ad7643a11b9_10.1.png') },
            };
        } catch (e) { console.error("Не вдалося завантажити текстури планет:", e); }
        
        const source = new Sun({ name: "Джерело", size: 25, textures: textures.sun });
        this.celestialBodies.push(source);
        this.scene.add(source.group);
        
        const planetsConfig = [
            { name: "Архів", description: "Гігантська планета з кільцями.", size: 3.5, orbit: { a: 70, speed: 0.08, axialSpeed: 0.1 }, hasRings: true, textures: textures.archive },
            { name: "Кузня", description: "Вулканічна планета.", size: 3.0, orbit: { a: 110, speed: 0.06, axialSpeed: 0.15 }, textures: textures.forge },
            { name: "Пакт", description: "Кришталева, ідеально огранена планета.", size: 2.8, orbit: { a: 155, speed: 0.04, axialSpeed: 0.3 }, textures: textures.pact },
            { name: "Кредо", description: "Землеподібна планета з океанами та континентами.", size: 4.0, orbit: { a: 200, speed: 0.03, axialSpeed: 0.25 }, textures: textures.credo, hasMoon: true },
            { name: "Гільдія", description: "Світ співпраці та об'єднання.", size: 2.5, orbit: { a: 240, speed: 0.02, axialSpeed: 0.18 }, textures: textures.guild },
            { name: "Інсайти", description: "Газовий гігант з глибокими відкриттями.", size: 5.0, orbit: { a: 280, speed: 0.015, axialSpeed: 0.1 }, textures: textures.insights },
        ];
        planetsConfig.forEach(config => {
            const planet = new Planet(config);
            this.celestialBodies.push(planet);
            this.scene.add(planet.group);
        });
        this.loaderManager.finish();
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.container.addEventListener('click', (e) => this.uiManager.handleClick(e, this.hoveredPlanet));
    }
    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }
    onResize() {
        this.cameraManager.onResize();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    
    handleInteractions() {
        this.raycaster.setFromCamera(this.mouse, this.cameraManager.camera);
        const allPlanetMeshes = this.celestialBodies.filter(p => p.mesh).map(p => p.mesh);
        const intersects = this.raycaster.intersectObjects(allPlanetMeshes);
        const intersectedPlanet = intersects[0]?.object.userData.parentBody;

        document.body.style.cursor = intersectedPlanet ? 'pointer' : 'none';

        if (this.hoveredPlanet !== intersectedPlanet) {
            if (this.hoveredPlanet) {
                gsap.to(this.hoveredPlanet.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'power2.out' });
            }
            this.hoveredPlanet = intersectedPlanet;
            if (this.hoveredPlanet) {
                this.uiManager.playSound('hover');
                gsap.to(this.hoveredPlanet.mesh.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.5, ease: 'power2.out' });
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        if(!this.uiManager.isFocused) this.handleInteractions();
        this.celestialBodies.forEach(body => body.update(elapsedTime, delta));
        this.cameraManager.update(delta);
        this.composer.render();
    }
}

class CameraManager {
    constructor(container) {
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 6000);
        this.camera.position.set(0, 90, 280);
        this.controls = new OrbitControls(this.camera, container);
        this.controls.enableDamping = true; this.controls.autoRotate = true; this.controls.autoRotateSpeed = 0.07;
        this.controls.minDistance = 40; this.controls.maxDistance = 1000;
    }
    focusOn(targetBody) {
        this.controls.autoRotate = false;
        const targetPos = new THREE.Vector3();
        targetBody.group.getWorldPosition(targetPos);
        const offsetDirection = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
        const offset = offsetDirection.multiplyScalar(targetBody.size * 5);
        gsap.to(this.camera.position, { duration: 2.5, ease: 'power2.inOut', x: targetPos.x + offset.x, y: targetPos.y + offset.y, z: targetPos.z + offset.z, onUpdate: () => this.controls.update() });
        gsap.to(this.controls.target, { duration: 2.5, ease: 'power2.inOut', x: targetPos.x, y: targetPos.y, z: targetPos.z, onUpdate: () => this.controls.update() });
    }
    returnToOverview() {
        this.controls.autoRotate = true;
        gsap.to(this.camera.position, { duration: 2.5, ease: 'power2.inOut', x: 0, y: 90, z: 280, onUpdate: () => this.controls.update() });
        gsap.to(this.controls.target, { duration: 2.5, ease: 'power2.inOut', x: 0, y: 0, z: 0, onUpdate: () => this.controls.update() });
    }
    update(delta) { this.controls.update(delta); }
    onResize() { this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); }
}

class UIManager {
    constructor(cameraManager, planets) {
        this.cameraManager = cameraManager; this.planets = planets; this.navContent = document.getElementById('nav-content'); this.isFocused = false;
        this.sounds = {}; this.interactionOccurred = false;
        try {
            this.sounds.hover = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
            this.sounds.click = new Audio('data:audio/wav;base64,UklGRiIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhBgAAAAEA');
        } catch (e) { console.error("Could not create audio context"); }
        this.populateNav();
    }
    playSound(sound) {
        if (this.sounds[sound] && this.interactionOccurred) { this.sounds[sound].currentTime = 0; this.sounds[sound].play().catch(e => {}); }
    }
    populateNav() {
        const html = `<h2>Світи Одкровення</h2><ul>${this.planets.map(p => `<li data-name="${p.name}">${p.name}</li>`).join('')}</ul>`;
        this.navContent.innerHTML = html;
        this.navContent.querySelectorAll('li').forEach(li => li.addEventListener('click', (e) => this.onNavClick(e)));
    }
    onNavClick(e) {
        e.stopPropagation(); this.playSound('click');
        const planet = this.planets.find(p => p.name === e.target.dataset.name);
        if (planet) { this.cameraManager.focusOn(planet); this.showFocusedView(planet); this.setActive(planet.name); this.isFocused = true; }
    }
    showFocusedView(planet) {
        const html = `<div class="focused-view"><h2>${planet.name}</h2><p>${planet.description}</p><button class="return-button">Повернутися до огляду</button></div>`;
        this.navContent.innerHTML = html;
        this.navContent.querySelector('.return-button').addEventListener('click', (e) => { e.stopPropagation(); this.returnToOverview(); });
    }
    returnToOverview() {
        this.playSound('click'); this.cameraManager.returnToOverview(); this.populateNav(); this.isFocused = false;
    }
    handleClick(e, hoveredPlanet) {
        if (!this.interactionOccurred) this.interactionOccurred = true;
        if (hoveredPlanet) { this.onNavClick({ target: { dataset: { name: hoveredPlanet.name } }, stopPropagation: () => {} }); } 
        else if (this.isFocused && e.target.id === 'webgl-canvas') { this.returnToOverview(); }
    }
    setActive(name) { this.navContent.querySelectorAll('li').forEach(li => li.classList.toggle('active', li.dataset.name === name)); }
}

class LoaderManager {
    constructor() { this.loaderElement = document.getElementById('loader'); }
    finish() { gsap.to(this.loaderElement, { opacity: 0, duration: 1.5, delay: 0.5, onComplete: () => this.loaderElement.style.display = 'none' }); }
    showError(message) { if(this.loaderElement) this.loaderElement.innerHTML = `<p>${message}</p>`; }
}

class CelestialBody {
    constructor(config) { this.group = new THREE.Group(); Object.assign(this, config); }
    update(elapsedTime, delta) {}
}

class Sun extends CelestialBody {
    constructor(config) {
        super({ ...config, isSource: true });
        const material = new THREE.MeshBasicMaterial({ map: this.textures?.map });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 128, 128), material);
        this.group.add(this.mesh);

        const coronaMat = new THREE.ShaderMaterial({ 
            uniforms: { uTime: { value: 0 } }, 
            vertexShader: Shaders.sharedVertex, 
            fragmentShader: `${Shaders.noise}\n${Shaders.sun.corona}`, 
            blending: THREE.AdditiveBlending, 
            transparent: true, 
            side: THREE.BackSide 
        });
        this.corona = new THREE.Mesh(new THREE.SphereGeometry(this.size * 1.5, 128, 128), coronaMat);
        this.group.add(this.corona);
    }
    update(elapsedTime, delta){ 
        this.group.rotation.y += delta * 0.02;
        if (this.corona.material.uniforms) {
            this.corona.material.uniforms.uTime.value = elapsedTime;
        }
    }
}

class Planet extends CelestialBody {
    constructor(config) {
        super(config);
        this.orbit.b = this.orbit.b || this.orbit.a; this.orbit.offset = Math.random() * Math.PI * 2;
        
        const materialProperties = {
            map: this.textures?.map,
            color: this.textures?.map ? 0xffffff : (this.color || 0xcccccc),
            roughness: 0.8, metalness: 0.2
        };
        if(this.textures?.night) {
            materialProperties.emissiveMap = this.textures.night;
            materialProperties.emissive = 0xffffff;
            materialProperties.emissiveIntensity = 1.5;
        }
        
        let material;
        if (this.name === "Пакт") {
            material = new THREE.MeshPhysicalMaterial({ ...materialProperties, transmission: 1.0, ior: 1.5, thickness: 1.5, transparent: true });
        } else {
             material = new THREE.MeshStandardMaterial(materialProperties);
        }
        
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData = { isPlanet: true, parentBody: this };
        this.group.add(this.mesh);

        if (this.name === "Кредо" && this.textures?.clouds) {
            const cloudMat = new THREE.MeshLambertMaterial({ map: this.textures.clouds, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
            this.cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(this.size * 1.03, 64, 64), cloudMat);
            this.group.add(this.cloudMesh);
        }
        if (config.hasRings) this.createRings();
        if (config.hasMoon) this.createMoon();
    }
    createRings() {
        const ringGeo = new THREE.RingGeometry(this.size * 1.5, this.size * 2.2, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        this.group.add(ringMesh);
    }
    createMoon() {
        this.moon = new THREE.Mesh(new THREE.SphereGeometry(this.size * 0.2, 32, 32), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 1.0 }));
        this.group.add(this.moon);
    }
    update(elapsedTime, delta) {
        const angle = elapsedTime * this.orbit.speed + this.orbit.offset;
        this.group.position.set(Math.cos(angle) * this.orbit.a, 0, Math.sin(angle) * this.orbit.b);
        this.group.rotation.y += this.orbit.axialSpeed * delta;
        if (this.cloudMesh) this.cloudMesh.rotation.y += delta * 0.02;
        if (this.moon) {
            const moonAngle = elapsedTime * 0.5;
            this.moon.position.set(Math.cos(moonAngle) * this.size * 2.5, 0, Math.sin(moonAngle) * this.size * 2.5);
        }
    }
}
    
try {
    new Universe();
    const cursorDot = document.getElementById('cursor-dot');
    window.addEventListener('mousemove', e => gsap.to(cursorDot, { duration: 0.3, x: e.clientX, y: e.clientY, ease: 'power2.out' }));
} catch(e) { console.error("Критична помилка Всесвіту:", e); }
