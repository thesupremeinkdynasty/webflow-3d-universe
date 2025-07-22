import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

const Shaders = {
    noise: `
        vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
        vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

        float cnoise(vec3 P){
          vec3 Pi0 = floor(P); vec3 Pi1 = Pi0 + vec3(1.0);
          Pi0 = mod(Pi0, 289.0); Pi1 = mod(Pi1, 289.0);
          vec3 Pf0 = fract(P); vec3 Pf1 = Pf0 - vec3(1.0);
          vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x); vec4 iy = vec4(Pi0.yy, Pi1.yy);
          vec4 iz0 = Pi0.zzzz; vec4 iz1 = Pi1.zzzz;
          vec4 ixy = permute(permute(ix) + iy);
          vec4 ixy0 = permute(ixy + iz0); vec4 ixy1 = permute(ixy + iz1);
          vec4 gx0 = ixy0 / 7.0; vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
          gx0 = fract(gx0); vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
          vec4 sz0 = step(gz0, vec4(0.0));
          gx0 -= sz0 * (step(0.0, gx0) - 0.5); gy0 -= sz0 * (step(0.0, gy0) - 0.5);
          vec4 gx1 = ixy1 / 7.0; vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
          gx1 = fract(gx1); vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
          vec4 sz1 = step(gz1, vec4(0.0));
          gx1 -= sz1 * (step(0.0, gx1) - 0.5); gy1 -= sz1 * (step(0.0, gy1) - 0.5);
          vec3 g000 = vec3(gx0.x,gy0.x,gz0.x); vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
          vec3 g010 = vec3(gx0.z,gy0.z,gz0.z); vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
          vec3 g001 = vec3(gx1.x,gy1.x,gz1.x); vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
          vec3 g011 = vec3(gx1.z,gy1.z,gz1.z); vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
          vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
          g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
          vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
          g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
          float n000 = dot(g000, Pf0); float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
          float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z)); float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
          float n001 = dot(g001, vec3(Pf0.xy, Pf1.z)); float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
          float n011 = dot(g011, vec3(Pf0.x, Pf1.yz)); float n111 = dot(g111, Pf1);
          vec3 fade_xyz = fade(Pf0);
          vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
          vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
          float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
          return 2.2 * n_xyz;
        }
        float fbm(vec3 p) { float f = 0.0; f += 0.50 * cnoise(p); p *= 2.02; f += 0.25 * cnoise(p); return f / 0.75; }`,
    sharedVertex: `varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition; void main() { vUv = uv; vPosition = position; vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    sun: {
        surface: `uniform float uTime; varying vec2 vUv; void main() { float t = uTime * 0.1; vec3 p = vec3(vUv * 4.0, t); float n = fbm(p); float s = fbm(vec3(p.xy, p.z - t * 2.0)); float final = mix(n, s, 0.6); vec3 color = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.9, 0.3), final); float i = pow(final, 2.0) * 1.5 + 1.0 + sin(uTime * 2.0) * 0.1; gl_FragColor = vec4(color * i, 1.0); }`,
        corona: `uniform float uTime; varying vec3 vNormal; void main() { float i = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); float n = fbm(vNormal * 3.0 + uTime * 0.2); i *= (0.8 + n * 0.2); gl_FragColor = vec4(vec3(1.0, 0.6, 0.2) * i, 1.0); }`
    },
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
            const starfieldTexture = await textureLoader.loadAsync('https://i.imgur.com/6X2s72x.jpeg');
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
            { name: "Кузня", description: "Вулканічна планета.", size: 3.0, orbit: { a: 110, speed: 0.06, axialSpeed: 0.15 }, textures: textures.forge, color: 0x552211 },
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

        const coronaMat = new THREE.SpriteMaterial({
            map: new THREE.TextureLoader().load('https://i.imgur.com/yla3d1Y.png'),
            color: 0xffeab3, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.7
        });
        this.corona = new THREE.Sprite(coronaMat);
        this.corona.scale.set(this.size * 3.5, this.size * 3.5, 1);
        this.group.add(this.corona);
    }
    update(elapsedTime, delta){ 
        this.group.rotation.y += delta * 0.02;
        this.corona.material.rotation += delta * 0.01;
        this.corona.scale.setScalar(this.size * 3.5 * (1 + Math.sin(elapsedTime * 0.5) * 0.05));
    }
}

class Planet extends CelestialBody {
    constructor(config) {
        super(config);
        this.orbit.b = this.orbit.b || this.orbit.a; this.orbit.offset = Math.random() * Math.PI * 2;
        
        const materialProperties = {
            map: this.textures?.map,
            color: this.textures?.map ? 0xffffff : (this.color || 0xcccccc),
            roughness: 0.8,
            metalness: 0.2
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
</script>
