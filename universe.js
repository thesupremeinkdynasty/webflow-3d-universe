// Архітектурне ядро Всесвіту. Версія 2.0. Протокол "Синхронізація Запуску" інтегровано.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FlyControls } from 'three/addons/controls/FlyControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

// ЗАПОБІЖНИК: Весь код запускається тільки після повної готовності HTML
window.addEventListener('DOMContentLoaded', () => {

    const glsl_noise = `vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); } vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; } float snoise(vec3 v) { const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0); vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx); vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy); vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy; i = mod289(i); vec4 p = permute(permute(permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 )); float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx; vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_ ); vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y); vec4 b0 = vec4( x.xy, y.xy ); vec4 b1 = vec4( x.zw, y.zw ); vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0)); vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww; vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w); vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3))); p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w; vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m; return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) ); } float fbm(vec3 p) { float f = 0.0; f += 0.5000 * snoise(p); p = p * 2.02; f += 0.2500 * snoise(p); p = p * 2.03; f += 0.1250 * snoise(p); p = p * 2.01; f += 0.0625 * snoise(p); return f; }`;

    const SKYBOX_URL = 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687d3cc795859f0d3a3b488f_8k_stars_milky_way.jpg';
    const RING_TEXTURE_URL = 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/688276e0a7e07ca64b616089_undefined%20-%20Imgur.png';
    const PLANET_DATA = [
        { name: "Світ 1", size: 10, distance: 220, speed: 0.1, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b9829eb2d0c5a1d1a83_1.1.png', hasMoon: true, description: "Опис для Світу 1...", url: "#" },
        { name: "Світ 2", size: 8, distance: 280, speed: 0.08, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b95e0b0e78f91b89f0e_2.1.png', description: "Опис для Світу 2...", url: "#" },
        { name: "Світ 3", size: 12, distance: 340, speed: 0.06, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b96486c5b3d3b30f732_3.1.png', hasRings: true, description: "Опис для Світу 3...", url: "#" },
        { name: "Світ 4", size: 9, distance: 400, speed: 0.05, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b95f5194ad7643a12c6_4.1.png', hasMoon: true, description: "Опис для Світу 4...", url: "#" },
        { name: "Світ 5", size: 15, distance: 480, speed: 0.04, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b924dddf1f2a16788df_5.1.png', description: "Опис для Світу 5...", url: "#" },
        { name: "Світ 6", size: 7, distance: 560, speed: 0.035, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b981b847f548b44f1f5_6.1.png', description: "Опис для Світу 6...", url: "#" },
        { name: "Світ 7", size: 11, distance: 640, speed: 0.03, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b95eac3b87509fde04f_7.1.png', description: "Опис для Світу 7...", url: "#" },
        { name: "Світ 8", size: 13, distance: 730, speed: 0.025, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b94b53ba90dbc022678_8.1.png', hasMoon: true, description: "Опис для Світу 8...", url: "#" },
        { name: "Світ 9", size: 6, distance: 820, speed: 0.022, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b92e0b0e78f91b89af5_9.1.png', description: "Опис для Світу 9...", url: "#" },
        { name: "Світ 10", size: 10, distance: 910, speed: 0.02, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b93f5194ad7643a11b9_10.1.png', description: "Опис для Світу 10...", url: "#" },
        { name: "Світ 11", size: 9, distance: 1000, speed: 0.018, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687d0eb009d11e7ccc1190bc_%D0%BF%D0%BB%D0%B0%D0%BD%D0%B5%D1%82%D0%B0%201.png', description: "Опис для Світу 11...", url: "#" },
        { name: "Світ 12", size: 14, distance: 1100, speed: 0.016, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b9829eb2d0c5a1d1a83_1.1.png', description: "Опис для Світу 12 (текстура-заглушка)...", url: "#" },
        { name: "Світ 13", size: 12, distance: 1210, speed: 0.014, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c024e724b8fbdbee74a65_The%20Supreme%20Ink%20Dynasty.png', hasRings: true, description: "Опис для Світу 13...", url: "#" },
        { name: "Світ 14", size: 8, distance: 1320, speed: 0.012, textureUrl: 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687e6b9829eb2d0c5a1d1a83_1.1.png', hasMoon: true, description: "Опис для Світу 14 (текстура-заглушка)...", url: "#" }
    ];

    class UIManager {
        constructor(planets, cameraManager) { this.sidebar = document.getElementById('sidebar'); this.infoPanel = document.getElementById('planet-info'); this.planetName = document.getElementById('planet-name'); this.planetDesc = document.getElementById('planet-desc'); this.planetLink = document.getElementById('planet-link'); this.planets = planets; this.cameraManager = cameraManager; if (this.sidebar) this.populateSidebar(); }
        populateSidebar() { let listItems = ''; this.planets.forEach(planet => { listItems += `<li data-planet-name="${planet.name}">${planet.name}</li>`; }); this.sidebar.innerHTML = `<div class="sidebar-header"><h1>Книга Мандрівника</h1></div><div class="divider"></div><div id="nav-content"><ul>${listItems}</ul></div>`; this.sidebar.querySelectorAll('li').forEach(li => { li.addEventListener('click', (e) => { const planetName = e.target.getAttribute('data-planet-name'); const targetPlanet = this.planets.find(p => p.name === planetName); if (targetPlanet) { this.cameraManager.focusOn(targetPlanet); } }); }); }
        showPlanetInfo(planetData) { this.planetName.textContent = planetData.name; this.planetDesc.textContent = planetData.description; this.planetLink.onclick = () => { window.location.href = planetData.url; }; this.infoPanel.classList.add('visible'); }
        hidePlanetInfo() { this.infoPanel.classList.remove('visible'); }
    }

    class CameraManager {
        constructor(container, camera) {
            this.uiManager = null; this.focusedObject = null; this.isAnimating = false;
            this.camera = camera; this.container = container;
            this.initialPosition = this.camera.position.clone(); this.initialFov = this.camera.fov;
            this.orbitControls = new OrbitControls(this.camera, this.container);
            this.flyControls = new FlyControls(this.camera, this.container);
            this.configureOrbitControls(); this.configureFlyControls();
            this.activeControls = this.orbitControls; this.flyControls.enabled = false;
            this.orbitControls.addEventListener('start', () => this.onManualControlStart());
        }
        configureOrbitControls() {
            this.orbitControls.enableDamping = true; this.orbitControls.dampingFactor = 0.05;
            this.orbitControls.autoRotate = false; this.orbitControls.minPolarAngle = 0; 
            this.orbitControls.maxPolarAngle = Math.PI;
            this.orbitControls.minDistance = 150; this.orbitControls.maxDistance = 5000;
            this.orbitControls.screenSpacePanning = false;
        }
        configureFlyControls() {
            this.flyControls.movementSpeed = 800; this.flyControls.rollSpeed = Math.PI / 10;
            this.flyControls.autoForward = false; this.flyControls.dragToLook = false; this.flyControls.lookSpeed = 0.1;
        }
        onManualControlStart() {
            if (this.isAnimating) {
                gsap.killTweensOf(this.camera.position); gsap.killTweensOf(this.orbitControls.target);
                gsap.killTweensOf(this.camera); this.isAnimating = false;
            }
            this.focusedObject = null; this.orbitControls.autoRotate = false;
        }
        setUIManager(uiManager) { this.uiManager = uiManager; }
        update(delta) {
            if (this.focusedObject && !this.isAnimating && this.activeControls === this.orbitControls) {
                const targetPosition = new THREE.Vector3();
                this.focusedObject.group.getWorldPosition(targetPosition);
                this.orbitControls.target.lerp(targetPosition, 0.1);
            }
            this.activeControls.update(delta); 
        }
        onResize() { this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); }
        setMode(mode) {
            if (mode === 'fly') {
                this.activeControls = this.flyControls; this.flyControls.enabled = true; this.orbitControls.enabled = false;
                this.orbitControls.autoRotate = false; this.focusedObject = null;
                if (this.uiManager) this.uiManager.hidePlanetInfo();
                console.log("РЕЖИМ ПОЛЬОТУ: Активовано.");
            } else {
                this.activeControls = this.orbitControls; this.flyControls.enabled = false; this.orbitControls.enabled = true;
                console.log("РЕЖИМ ОГЛЯДУ: Активовано.");
            }
        }
        focusOn(targetObject) {
            if (this.isAnimating || this.focusedObject === targetObject) return;
            this.setMode('orbit'); this.isAnimating = true; this.focusedObject = targetObject; this.orbitControls.autoRotate = false;
            if (this.uiManager) this.uiManager.showPlanetInfo(targetObject);
            const targetPosition = new THREE.Vector3();
            targetObject.group.getWorldPosition(targetPosition);
            const endPosition = new THREE.Vector3(targetPosition.x + targetObject.size * 4, targetPosition.y + targetObject.size * 2, targetPosition.z + targetObject.size * 4);
            const tl = gsap.timeline({
                onComplete: () => {
                    this.isAnimating = false; this.orbitControls.minDistance = targetObject.size * 1.2;
                    this.orbitControls.maxDistance = targetObject.distance * 1.5; this.orbitControls.target.copy(targetPosition);
                }
            });
            tl.to(this.camera.position, { duration: 2.5, x: endPosition.x, y: endPosition.y, z: endPosition.z, ease: 'power3.inOut' }, 0);
            tl.to(this.orbitControls.target, { duration: 2.5, x: targetPosition.x, y: targetPosition.y, z: targetPosition.z, ease: 'power3.inOut' }, 0);
            tl.to(this.camera, { duration: 2.5, fov: 35, onUpdate: () => this.camera.updateProjectionMatrix(), ease: 'power3.inOut' }, 0);
        }
        resetFocus() {
            if (this.isAnimating) return;
            this.setMode('orbit'); this.isAnimating = true; this.focusedObject = null;
            if (this.uiManager) this.uiManager.hidePlanetInfo();
            const tl = gsap.timeline({
                onComplete: () => {
                    this.isAnimating = false; this.orbitControls.autoRotate = false;
                    this.orbitControls.minDistance = 150; this.orbitControls.maxDistance = 5000;
                }
            });
            tl.to(this.camera.position, { duration: 2.5, ...this.initialPosition, ease: 'power3.inOut' }, 0);
            tl.to(this.orbitControls.target, { duration: 2.5, x: 0, y: 0, z: 0, ease: 'power3.inOut' }, 0);
            tl.to(this.camera, { duration: 2.5, fov: this.initialFov, onUpdate: () => this.camera.updateProjectionMatrix(), ease: 'power3.inOut' }, 0);
        }
    }

    class CelestialBody { constructor(config) { this.group = new THREE.Group(); Object.assign(this, config); } update(elapsedTime, delta) {} }

    class Sun extends CelestialBody {
        constructor(config) {
            super({ ...config, isSource: true });
            const sunMaterial = new THREE.ShaderMaterial({
                uniforms: { uTime: { value: 0 }, uNoiseScale: { value: 4.0 }, uNoiseSpeed: { value: 0.2 }, uColor1: { value: new THREE.Color("#ffd700") }, uColor2: { value: new THREE.Color("#ff8c00") }, uColor3: { value: new THREE.Color("#ff4500") } },
                vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `${glsl_noise} uniform float uTime; uniform float uNoiseScale; uniform float uNoiseSpeed; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3; varying vec2 vUv; void main() { float noise = fbm(vec3(vUv * uNoiseScale, uTime * uNoiseSpeed)); noise = (noise + 1.0) * 0.5; vec3 color = mix(uColor1, uColor2, smoothstep(0.3, 0.6, noise)); color = mix(color, uColor3, smoothstep(0.5, 0.8, noise)); gl_FragColor = vec4(color, 1.0); }`
            });
            this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 128, 128), sunMaterial);
            this.mesh.userData.parentBody = this; this.group.add(this.mesh);
            const coronaMaterial = new THREE.ShaderMaterial({
                uniforms: { uTime: { value: 0.0 } },
                vertexShader: `uniform float uTime; varying float vNoise; ${glsl_noise} void main() { float displacement = fbm(normal * 3.0 + uTime * 0.1); vNoise = (fbm(normal * 1.5 + uTime * 0.2) + 1.0) * 0.5; vec3 newPosition = position + normal * displacement * 20.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0); }`,
                fragmentShader: `varying float vNoise; void main() { vec3 color = mix(vec3(1.0, 0.8, 0.6), vec3(1.0, 0.5, 0.0), vNoise); float alpha = pow(vNoise, 2.0); gl_FragColor = vec4(color, alpha); }`,
                transparent: true, blending: THREE.AdditiveBlending,
            });
            this.corona = new THREE.Mesh(new THREE.SphereGeometry(this.size, 128, 128), coronaMaterial); this.group.add(this.corona);
        }
        update(elapsedTime, delta) { this.group.rotation.y += delta * 0.02; if (this.mesh) { this.mesh.material.uniforms.uTime.value = elapsedTime; } if (this.corona) { this.corona.material.uniforms.uTime.value = elapsedTime; } }
    }

    class Planet extends CelestialBody {
        constructor(config) {
            super(config);
            this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), new THREE.MeshStandardMaterial({ map: this.texture, metalness: 0.1, roughness: 0.8 }));
            this.mesh.userData.parentBody = this; this.group.add(this.mesh);
            const atmosphereMaterial = new THREE.ShaderMaterial({
                uniforms: { glowColor: { value: new THREE.Color(0xffe8c5) } },
                vertexShader: `varying float intensity; void main() { vec3 viewVector = normalize(cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz); intensity = pow(0.8 - dot(normalize(normal), viewVector), 2.5); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `uniform vec3 glowColor; varying float intensity; void main() { gl_FragColor = vec4(glowColor, 1.0) * intensity; }`,
                blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true
            });
            this.group.add(new THREE.Mesh(new THREE.SphereGeometry(this.size * 1.04, 64, 64), atmosphereMaterial));
            if (this.hasRings && this.ringTexture) { this.rings = new THREE.Mesh(new THREE.RingGeometry(this.size * 1.3, this.size * 2, 64), new THREE.MeshBasicMaterial({ map: this.ringTexture, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })); this.rings.rotation.x = -Math.PI / 2; this.group.add(this.rings); }
            if (this.hasMoon) { this.moon = new THREE.Mesh(new THREE.SphereGeometry(this.size * 0.2, 32, 32), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 1.0 })); this.group.add(this.moon); }
        }
        update(elapsedTime, delta) { this.mesh.rotation.y += delta * 0.2; const angle = (elapsedTime * this.speed) + this.orbitOffset; this.group.position.set(Math.sin(angle) * this.distance, 0, Math.cos(angle) * this.distance * 0.8); if (this.moon) { const moonAngle = elapsedTime * 0.5; this.moon.position.set(Math.cos(moonAngle) * this.size * 2.5, 0, Math.sin(moonAngle) * this.size * 2.5); } }
    }
    class CometCursor {
        constructor(scene, camera) { this.scene = scene; this.camera = camera; this.target = new THREE.Vector3(); this.init(); window.addEventListener('mousemove', this.onMouseMove.bind(this), false); }
        init() { const count = 200, positions = new Float32Array(count * 3); this.particlesData = []; for (let i = 0; i < count; i++) { positions.set([0, 0, -1000], i * 3); this.particlesData.push({ velocity: new THREE.Vector3(), life: 0 }); } const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.BufferAttribute(positions, 3)); this.points = new THREE.Points(geom, new THREE.PointsMaterial({ color: 0xffe8a3, size: 2.0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); this.scene.add(this.points); }
        onMouseMove(event) { const vector = new THREE.Vector3((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5); vector.unproject(this.camera); const dir = vector.sub(this.camera.position).normalize(); const distance = -this.camera.position.z / dir.z; this.target.copy(this.camera.position).add(dir.multiplyScalar(distance)); }
        update() { const positions = this.points.geometry.attributes.position.array; for (let i = 0; i < this.particlesData.length; i++) { let p = this.particlesData[i]; if (p.life > 0) { p.life -= 1; positions[i * 3] += p.velocity.x; positions[i * 3 + 1] += p.velocity.y; } else if (Math.random() > 0.97) { p.life = Math.random() * 60 + 60; positions[i * 3] = this.target.x; positions[i * 3 + 1] = this.target.y; positions[i * 3 + 2] = this.target.z || 0; p.velocity.set((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0); } } this.points.geometry.attributes.position.needsUpdate = true; }
    }

    class Universe {
        constructor() { this.container = document.getElementById('webgl-canvas'); this.scene = new THREE.Scene(); this.clock = new THREE.Clock(); this.celestialBodies = []; this.interactiveObjects = []; this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2(); this.hoveredPlanet = null; this.init(); }
        async init() {
            const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
            camera.position.set(0, 600, 2200);
            this.cameraManager = new CameraManager(this.container, camera);
            this.renderer = this.createRenderer(); 
            this.createLighting(); 
            await this.createEnvironment(); 
            await this.createCelestialBodies();
            this.composer = this.createComposer(camera);
            this.uiManager = new UIManager(this.celestialBodies.filter(b => !b.isSource), this.cameraManager);
            this.cameraManager.setUIManager(this.uiManager);
            this.cometCursor = new CometCursor(this.scene, camera);
            this.addEventListeners();
            gsap.to(document.getElementById('loader'), { opacity: 0, duration: 1.5, onComplete: (loader) => { if(loader) loader.style.display = 'none'; } });
            this.animate = this.animate.bind(this); 
            this.animate(); 
            window.addEventListener('resize', this.onResize.bind(this));
        }
        addEventListeners() { 
            const customCursor = document.getElementById('custom-cursor');
            window.addEventListener('mousemove', (e) => { 
                this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1; 
                this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1; 
                gsap.to(customCursor, { duration: 0.3, x: e.clientX, y: e.clientY });
            }, false); 
            window.addEventListener('click', this.onClick.bind(this)); 
            window.addEventListener('dblclick', () => this.cameraManager.resetFocus()); 
            window.addEventListener('keydown', (e) => {
                if (e.key.toLowerCase() === 'm') {
                    this.cameraManager.setMode(this.cameraManager.activeControls === this.cameraManager.orbitControls ? 'fly' : 'orbit');
                }
            });
        }
        onClick(event) { if (event.target.closest('.sidebar')) return; if (this.hoveredPlanet) { this.cameraManager.focusOn(this.hoveredPlanet); } }
        async createCelestialBodies() {
            const textureLoader = new THREE.TextureLoader(); let ringTexture;
            try { 
                ringTexture = await textureLoader.loadAsync(RING_TEXTURE_URL); 
                const source = new Sun({ name: "Джерело", size: 100 }); 
                this.celestialBodies.push(source); this.scene.add(source.group); this.interactiveObjects.push(source.mesh); 
            } catch (e) { console.error("Could not load base textures:", e); }
            try { const planetTextures = await Promise.all(PLANET_DATA.map(p => textureLoader.loadAsync(p.textureUrl)));
                PLANET_DATA.forEach((config, i) => { config.orbitOffset = Math.random() * Math.PI * 2; const planet = new Planet({ ...config, texture: planetTextures[i], ringTexture: ringTexture }); this.celestialBodies.push(planet); this.scene.add(planet.group); this.interactiveObjects.push(planet.mesh); });
            } catch (e) { console.error("Could not load planet textures:", e); }
        }
        animate() {
            requestAnimationFrame(this.animate); const delta = this.clock.getDelta(); const elapsedTime = this.clock.getElapsedTime();
            this.cameraManager.update(delta); this.celestialBodies.forEach(body => body.update(elapsedTime, delta));
            this.cometCursor.update();
            this.raycaster.setFromCamera(this.mouse, this.cameraManager.camera);
            const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);
            const intersectedBody = (intersects.length > 0 && intersects[0].object.userData.parentBody) ? intersects[0].object.userData.parentBody : null;
            const customCursor = document.getElementById('custom-cursor');
            if (this.hoveredPlanet !== intersectedBody) {
                if (this.hoveredPlanet) { gsap.killTweensOf(this.hoveredPlanet.group.scale); gsap.to(this.hoveredPlanet.group.scale, { x: 1, y: 1, z: 1, duration: 0.5 }); }
                this.hoveredPlanet = intersectedBody;
                if (this.hoveredPlanet) { 
                    gsap.to(this.hoveredPlanet.group.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.5, yoyo: true, repeat: -1 }); 
                    if (customCursor) customCursor.classList.add('hover');
                } else {
                    if (customCursor) customCursor.classList.remove('hover');
                }
            }
            this.composer.render();
        }
        createRenderer() { const r = new THREE.WebGLRenderer({ canvas: this.container, antialias: true, alpha: true }); r.setSize(window.innerWidth, window.innerHeight); r.setPixelRatio(Math.min(window.devicePixelRatio, 2)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.2; return r; }
        createComposer(camera) { const c = new EffectComposer(this.renderer); c.addPass(new RenderPass(this.scene, camera)); const b = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85); c.addPass(b); return c; }
        createLighting() { this.scene.add(new THREE.AmbientLight(0xffffff, 0.2)); const p = new THREE.PointLight(0xffe8c5, 1.5, 15000); this.scene.add(p); }
        async createEnvironment() { const l = new THREE.TextureLoader(); try { const t = await l.loadAsync(SKYBOX_URL); const g = new THREE.SphereGeometry(10000, 64, 64); const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide }); this.scene.add(new THREE.Mesh(g, m)); } catch (e) { console.error("Could not load skybox texture:", e); } }
        onResize() { this.cameraManager.onResize(); this.renderer.setSize(window.innerWidth, window.innerHeight); if (this.composer) { this.composer.setSize(window.innerWidth, window.innerHeight); } }
    }
    try {
        new Universe();
    } catch (e) {
        console.error("Критична помилка:", e);
    }

});
