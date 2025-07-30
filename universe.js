// Архітектурне ядро Всесвіту. Версія 4.0. Протокол "Динамічна інтеграція з CMS".
import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

function initializeUniverse() {
    const glsl_noise = `vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); } vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; } float snoise(vec3 v) { const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0); vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx); vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy); vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy; i = mod289(i); vec4 p = permute(permute(permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 )); float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx; vec4 j = p - 49.0 * floor(p * ns.z * ns.z); vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_ ); vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y); vec4 b0 = vec4( x.xy, y.xy ); vec4 b1 = vec4( x.zw, y.zw ); vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0)); vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww; vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w); vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3))); p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w; vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m; return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) ); } float fbm(vec3 p) { float f = 0.0; f += 0.5000 * snoise(p); p = p * 2.02; f += 0.2500 * snoise(p); p = p * 2.03; f += 0.1250 * snoise(p); p = p * 2.01; f += 0.0625 * snoise(p); return f; }`;
    const SKYBOX_URL = 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687d3cc795859f0d3a3b488f_8k_stars_milky_way.jpg';
    const RING_TEXTURE_URL = 'https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/688276e0a7e07ca64b616089_undefined%20-%20Imgur.png';
    
    class UIManager { constructor(planets, cameraManager) { this.infoPanel = document.getElementById('planet-info'); this.planetName = document.getElementById('planet-name'); this.planetDesc = document.getElementById('planet-desc'); this.sidebar = document.getElementById('sidebar'); this.planets = planets; this.cameraManager = cameraManager; if (this.sidebar) { this.populateSidebar(); } } populateSidebar() { let listItems = ''; this.planets.forEach(planet => { listItems += `<li data-planet-name="${planet.name}">${planet.name}</li>`; }); this.sidebar.innerHTML = `<div class="sidebar-header"><h1>Книга Мандрівника</h1></div><div class="divider"></div><div id="nav-content"><ul>${listItems}</ul></div>`; this.sidebar.querySelectorAll('li').forEach(li => { li.addEventListener('click', (e) => { const planetName = e.target.getAttribute('data-planet-name'); const targetPlanet = this.planets.find(p => p.name === planetName); if (targetPlanet) { this.cameraManager.focusOn(targetPlanet); } }); }); } showPlanetInfo(planetData) { if (!this.infoPanel || !this.planetName || !this.planetDesc) return; const planetLinkButton = document.getElementById('planet-link'); if (!planetLinkButton) return; this.planetName.textContent = planetData.name; this.planetDesc.textContent = planetData.description; const newButton = planetLinkButton.cloneNode(true); planetLinkButton.parentNode.replaceChild(newButton, planetLinkButton); newButton.addEventListener('click', () => { if (planetData.url && planetData.url !== "#") { window.location.href = planetData.url; } }); this.infoPanel.classList.add('visible'); } hidePlanetInfo() { if (this.infoPanel) this.infoPanel.classList.remove('visible'); } }
    class CameraManager { constructor(container, camera, renderer) { this.uiManager = null; this.focusedObject = null; this.isAnimating = false; this.camera = camera; this.container = container; this.initialPosition = this.camera.position.clone(); this.initialFov = this.camera.fov; this.controls = new TrackballControls(this.camera, renderer.domElement); this.configureControls(); this.container.addEventListener('mousedown', () => this.onManualControlStart()); } configureControls() { this.controls.rotateSpeed = 2.0; this.controls.zoomSpeed = 1.2; this.controls.panSpeed = 0.8; this.controls.noZoom = false; this.controls.noPan = false; this.controls.staticMoving = true; this.controls.dynamicDampingFactor = 0.2; } onManualControlStart() { if (this.isAnimating) { gsap.killTweensOf(this.camera.position); gsap.killTweensOf(this.controls.target); gsap.killTweensOf(this.camera); this.isAnimating = false; } this.focusedObject = null; } setUIManager(uiManager) { this.uiManager = uiManager; } update(delta) { this.controls.update(delta); } onResize() { this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); this.controls.handleResize(); } focusOn(targetObject) { if (this.isAnimating || this.focusedObject === targetObject) return; this.isAnimating = true; this.focusedObject = targetObject; if (this.uiManager) this.uiManager.showPlanetInfo(targetObject); const targetPosition = new THREE.Vector3(); targetObject.group.getWorldPosition(targetPosition); const endPosition = new THREE.Vector3(targetPosition.x + targetObject.size * 4, targetPosition.y + targetObject.size * 2, targetPosition.z + targetObject.size * 4); const tl = gsap.timeline({ onComplete: () => { this.isAnimating = false; this.controls.target.copy(targetPosition); } }); tl.to(this.camera.position, { duration: 2.5, x: endPosition.x, y: endPosition.y, z: endPosition.z, ease: 'power3.inOut' }, 0); tl.to(this.controls.target, { duration: 2.5, x: targetPosition.x, y: targetPosition.y, z: targetPosition.z, ease: 'power3.inOut' }, 0); tl.to(this.camera, { duration: 2.5, fov: 35, onUpdate: () => this.camera.updateProjectionMatrix(), ease: 'power3.inOut' }, 0); } resetFocus() { if (this.isAnimating) return; this.isAnimating = true; this.focusedObject = null; if (this.uiManager) this.uiManager.hidePlanetInfo(); const tl = gsap.timeline({ onComplete: () => { this.isAnimating = false; } }); tl.to(this.camera.position, { duration: 2.5, ...this.initialPosition, ease: 'power3.inOut' }, 0); tl.to(this.controls.target, { duration: 2.5, x: 0, y: 0, z: 0, ease: 'power3.inOut' }, 0); tl.to(this.camera, { duration: 2.5, fov: this.initialFov, onUpdate: () => this.camera.updateProjectionMatrix(), ease: 'power3.inOut' }, 0); } }
    class CelestialBody { constructor(config) { this.group = new THREE.Group(); Object.assign(this, config); } update(elapsedTime, delta) {} }
    class Sun extends CelestialBody { constructor(config) { super({ ...config, isSource: true }); const sunMaterial = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uNoiseScale: { value: 4.0 }, uNoiseSpeed: { value: 0.2 }, uColor1: { value: new THREE.Color("#ffd700") }, uColor2: { value: new THREE.Color("#ff8c00") }, uColor3: { value: new THREE.Color("#ff4500") } }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: `${glsl_noise} uniform float uTime; uniform float uNoiseScale; uniform float uNoiseSpeed; uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3; varying vec2 vUv; void main() { float noise = fbm(vec3(vUv * uNoiseScale, uTime * uNoiseSpeed)); noise = (noise + 1.0) * 0.5; vec3 color = mix(uColor1, uColor2, smoothstep(0.3, 0.6, noise)); color = mix(color, uColor3, smoothstep(0.5, 0.8, noise)); gl_FragColor = vec4(color, 1.0); }` }); this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 128, 128), sunMaterial); this.mesh.userData.parentBody = this; this.group.add(this.mesh); const coronaMaterial = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0.0 } }, vertexShader: `uniform float uTime; varying float vNoise; ${glsl_noise} void main() { float displacement = fbm(normal * 3.0 + uTime * 0.1); vNoise = (fbm(normal * 1.5 + uTime * 0.2) + 1.0) * 0.5; vec3 newPosition = position + normal * displacement * 20.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0); }`, fragmentShader: `varying float vNoise; void main() { vec3 color = mix(vec3(1.0, 0.8, 0.6), vec3(1.0, 0.5, 0.0), vNoise); float alpha = pow(vNoise, 2.0); gl_FragColor = vec4(color, alpha); }`, transparent: true, blending: THREE.AdditiveBlending, }); this.corona = new THREE.Mesh(new THREE.SphereGeometry(this.size, 128, 128), coronaMaterial); this.group.add(this.corona); } update(elapsedTime, delta) { this.group.rotation.y += delta * 0.02; if (this.mesh) { this.mesh.material.uniforms.uTime.value = elapsedTime; } if (this.corona) { this.corona.material.uniforms.uTime.value = elapsedTime; } } }
    class Planet extends CelestialBody { constructor(config) { super(config); this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), new THREE.MeshStandardMaterial({ map: this.texture, metalness: 0.1, roughness: 0.8 })); this.mesh.userData.parentBody = this; this.group.add(this.mesh); const atmosphereMaterial = new THREE.ShaderMaterial({ uniforms: { glowColor: { value: new THREE.Color(0xffe8c5) } }, vertexShader: `varying float intensity; void main() { vec3 viewVector = normalize(cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz); intensity = pow(0.8 - dot(normalize(normal), viewVector), 2.5); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: `uniform vec3 glowColor; varying float intensity; void main() { gl_FragColor = vec4(glowColor, 1.0) * intensity; }`, blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true }); this.group.add(new THREE.Mesh(new THREE.SphereGeometry(this.size * 1.04, 64, 64), atmosphereMaterial)); if (this.hasRings && this.ringTexture) { this.rings = new THREE.Mesh(new THREE.RingGeometry(this.size * 1.3, this.size * 2, 64), new THREE.MeshBasicMaterial({ map: this.ringTexture, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })); this.rings.rotation.x = -Math.PI / 2; this.group.add(this.rings); } if (this.hasMoon) { this.moon = new THREE.Mesh(new THREE.SphereGeometry(this.size * 0.2, 32, 32), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 1.0 })); this.group.add(this.moon); } } update(elapsedTime, delta) { this.mesh.rotation.y += delta * 0.2; const angle = (elapsedTime * this.speed) + this.orbitOffset; this.group.position.set(Math.sin(angle) * this.distance, 0, Math.cos(angle) * this.distance * 0.8); if (this.moon) { const moonAngle = elapsedTime * 0.5; this.moon.position.set(Math.cos(moonAngle) * this.size * 2.5, 0, Math.sin(moonAngle) * this.size * 2.5); } } }
    class CometCursor { constructor(scene, camera) { this.scene = scene; this.camera = camera; this.target = new THREE.Vector3(); this.init(); window.addEventListener('mousemove', this.onMouseMove.bind(this), false); } init() { const count = 200, positions = new Float32Array(count * 3); this.particlesData = []; for (let i = 0; i < count; i++) { positions.set([0, 0, -1000], i * 3); this.particlesData.push({ velocity: new THREE.Vector3(), life: 0 }); } const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.BufferAttribute(positions, 3)); this.points = new THREE.Points(geom, new THREE.PointsMaterial({ color: 0xffe8a3, size: 2.0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); this.scene.add(this.points); } onMouseMove(event) { const vector = new THREE.Vector3((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5); vector.unproject(this.camera); const dir = vector.sub(this.camera.position).normalize(); const distance = -this.camera.position.z / dir.z; this.target.copy(this.camera.position).add(dir.multiplyScalar(distance)); } update() { const positions = this.points.geometry.attributes.position.array; for (let i = 0; i < this.particlesData.length; i++) { let p = this.particlesData[i]; if (p.life > 0) { p.life -= 1; positions[i * 3] += p.velocity.x; positions[i * 3 + 1] += p.velocity.y; } else if (Math.random() > 0.97) { p.life = Math.random() * 60 + 60; positions[i * 3] = this.target.x; positions[i * 3 + 1] = this.target.y; positions[i * 3 + 2] = this.target.z || 0; p.velocity.set((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0); } } this.points.geometry.attributes.position.needsUpdate = true; } }
    
    class Universe {
        constructor() { this.container = document.getElementById('webgl-canvas'); if (!this.container) { return; } this.scene = new THREE.Scene(); this.clock = new THREE.Clock(); this.celestialBodies = []; this.interactiveObjects = []; this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2(); this.hoveredPlanet = null; this.init(); }
        async init() {
            const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
            camera.position.set(0, 600, 2200);
            this.renderer = this.createRenderer(); 
            this.cameraManager = new CameraManager(this.container, camera, this.renderer);
            this.createLighting(); 
            await this.createEnvironment(); 
            
            // --- НОВА ЛОГІКА ---
            const planetData = this.parseCmsData();
            if (planetData.length === 0) {
                console.error("Архітектор: Міст Даних не знайдено або він порожній. Перевірте налаштування Collection List та Embed.");
                return;
            }
            await this.createCelestialBodies(planetData);
            // --- КІНЕЦЬ НОВОЇ ЛОГІКИ ---

            this.createAsteroidBelt();
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
        parseCmsData() {
            const planetDataElements = document.querySelectorAll('.planet-data');
            const planets = [];
            planetDataElements.forEach(el => {
                try {
                    // Очищуємо текст від можливих переносів рядків та зайвих пробілів
                    const cleanText = el.textContent.trim();
                    planets.push(JSON.parse(cleanText));
                } catch (e) {
                    console.error("Архітектор: Помилка парсингу JSON для планети. Перевірте, чи всі поля в Embed підключені вірно.", el.textContent, e);
                }
            });
            return planets;
        }
        addEventListeners() { const customCursor = document.getElementById('custom-cursor'); window.addEventListener('mousemove', (e) => { this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1; this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1; if (customCursor) gsap.to(customCursor, { duration: 0.3, x: e.clientX, y: e.clientY }); }, false); window.addEventListener('click', this.onClick.bind(this)); window.addEventListener('dblclick', () => this.cameraManager.resetFocus()); }
        onClick(event) { if (event.target.closest('.sidebar')) return; if (this.hoveredPlanet) { this.cameraManager.focusOn(this.hoveredPlanet); } }
        async createCelestialBodies(planetData) { 
            const textureLoader = new THREE.TextureLoader(); 
            let ringTexture; 
            try { 
                ringTexture = await textureLoader.loadAsync(RING_TEXTURE_URL); 
                const source = new Sun({ name: "Джерело", size: 100 }); 
                this.celestialBodies.push(source); 
                this.scene.add(source.group); 
                this.interactiveObjects.push(source.mesh); 
            } catch (e) { console.error("Could not load base textures:", e); } 
            
            try { 
                const planetTextures = await Promise.all(planetData.map(p => textureLoader.loadAsync(p.textureUrl))); 
                planetData.forEach((config, i) => { 
                    config.orbitOffset = Math.random() * Math.PI * 2; 
                    const planet = new Planet({ ...config, texture: planetTextures[i], ringTexture: ringTexture }); 
                    this.celestialBodies.push(planet); 
                    this.scene.add(planet.group); 
                    this.interactiveObjects.push(planet.mesh); 
                }); 
            } catch (e) { console.error("Could not load planet textures:", e); } 
        }
        
        createAsteroidBelt() {
            const COUNT = 3000;
            const asteroidGeometry = new THREE.IcosahedronGeometry(1, 0);
            const asteroidMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, flatShading: true, roughness: 1, metalness: 0.5 });
            const instancedMesh = new THREE.InstancedMesh(asteroidGeometry, asteroidMaterial, COUNT);

            const dummy = new THREE.Object3D();
            const innerRadius = 800;
            const outerRadius = 1300;
            const height = 100;

            for (let i = 0; i < COUNT; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
                
                const x = Math.cos(angle) * radius;
                const y = (Math.random() - 0.5) * height;
                const z = Math.sin(angle) * radius;
                
                dummy.position.set(x, y, z);
                dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

                const scale = 1 + Math.random() * 5;
                dummy.scale.set(scale, scale, scale);
                
                dummy.updateMatrix();
                instancedMesh.setMatrixAt(i, dummy.matrix);
            }
            
            instancedMesh.instanceMatrix.needsUpdate = true;
            this.scene.add(instancedMesh);
        }

        animate() {
            requestAnimationFrame(this.animate); 
            const delta = this.clock.getDelta(); 
            const elapsedTime = this.clock.getElapsedTime();
            this.cameraManager.update(delta);
            this.celestialBodies.forEach(body => body.update(elapsedTime, delta));
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
    
    // Запускаємо ініціалізацію після повного завантаження DOM
    document.addEventListener('DOMContentLoaded', () => {
        const requiredIds = ['webgl-canvas', 'sidebar', 'custom-cursor'];
        const ready = requiredIds.every(id => document.getElementById(id) !== null);
        if (ready) {
            try {
                new Universe();
            } catch (e) {
                console.error("Критична помилка під час ініціалізації Всесвіту:", e);
            }
        } else {
            console.error("Архітектор: Не всі необхідні елементи інтерфейсу (#webgl-canvas, #sidebar, #custom-cursor) знайдені на сторінці.");
        }
    });
}

try { 
    initializeUniverse(); 
} catch(e) { 
    console.error("Помилка запуску:", e); 
}
