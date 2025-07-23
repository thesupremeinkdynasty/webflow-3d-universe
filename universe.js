<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Візуалізація Джерела</title>
    <style>
        body, html { margin: 0; padding: 0; overflow: hidden; background-color: black; }
        .fullscreen-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: block; }
        #webgl-canvas { z-index: 1; }
    </style>
</head>
<body>
    <canvas id="webgl-canvas" class="fullscreen-canvas"></canvas>

    <script type="importmap">
        {
            "imports": {
                "three": "https://cdn.skypack.dev/three@0.128.0/build/three.module.js",
                "three/addons/": "https://cdn.skypack.dev/three@0.128.0/examples/jsm/"
            }
        }
    </script>

    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
        import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
        import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

        class SunVisualization {
            constructor() {
                this.container = document.getElementById('webgl-canvas');
                this.clock = new THREE.Clock();
                this.init();
            }

            async init() {
                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000);
                this.camera.position.set(0, 20, 150);

                this.renderer = new THREE.WebGLRenderer({ canvas: this.container, antialias: true, alpha: true });
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                this.renderer.setClearColor(0x000000, 0);
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                this.renderer.toneMappingExposure = 1.2;

                this.controls = new OrbitControls(this.camera, this.container);
                this.controls.enableDamping = true;
                this.controls.autoRotate = true;
                this.controls.autoRotateSpeed = 0.1;
                this.controls.minDistance = 50;
                this.controls.maxDistance = 500;

                await this.createBackground();
                await this.createSun();
                
                this.composer = new EffectComposer(this.renderer);
                this.composer.addPass(new RenderPass(this.scene, this.camera));
                const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.8, 0.6);
                this.composer.addPass(bloomPass);

                window.addEventListener('resize', () => this.onResize());
                
                this.animate();
            }

            async createBackground() {
                const textureLoader = new THREE.TextureLoader();
                try {
                    const bgTexture = await textureLoader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687d3cc795859f0d3a3b488f_8k_stars_milky_way.jpg');
                    this.scene.background = bgTexture;
                } catch (e) {
                    console.error("Не вдалося завантажити фонове зображення.", e);
                }
            }

            async createSun() {
                this.sunGroup = new THREE.Group();
                this.scene.add(this.sunGroup);
                
                const textureLoader = new THREE.TextureLoader();
                let sunTexture;
                try {
                     sunTexture = await textureLoader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687ec73077ae556a394ceaba_8k_sun.jpg');
                } catch (e) {
                    console.error("Не вдалося завантажити текстуру Сонця.", e);
                }

                const sunGeometry = new THREE.SphereGeometry(25, 128, 128);
                const sunMaterial = new THREE.MeshStandardMaterial({
                    map: sunTexture,
                    emissiveMap: sunTexture,
                    emissive: 0xffffff,
                    emissiveIntensity: sunTexture ? 1.8 : 0,
                    color: sunTexture ? 0xffffff : 0xffcc00
                });
                const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
                this.sunGroup.add(sunMesh);

                const coronaGeometry = new THREE.SphereGeometry(25, 128, 128);
                const coronaMaterial = new THREE.ShaderMaterial({
                    uniforms: { time: { value: 0.0 } },
                    vertexShader: `
                        uniform float time;
                        varying float noise;
                        
                        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
                        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
                        float snoise(vec3 v) {
                            const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
                            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                            vec3 i  = floor(v + dot(v, C.yyy) );
                            vec3 x0 = v - i + dot(i, C.xxx) ;
                            vec3 g = step(x0.yzx, x0.xyz);
                            vec3 l = 1.0 - g;
                            vec3 i1 = min( g.xyz, l.zxy );
                            vec3 i2 = max( g.xyz, l.zxy );
                            vec3 x1 = x0 - i1 + C.xxx;
                            vec3 x2 = x0 - i2 + C.yyy;
                            vec3 x3 = x0 - D.yyy;
                            i = mod289(i);
                            vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
                            float n_ = 0.142857142857;
                            vec3  ns = n_ * D.wyz - D.xzx;
                            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                            vec4 x_ = floor(j * ns.z);
                            vec4 y_ = floor(j - 7.0 * x_ );
                            vec4 x = x_ *ns.x + ns.yyyy;
                            vec4 y = y_ *ns.x + ns.yyyy;
                            vec4 h = 1.0 - abs(x) - abs(y);
                            vec4 b0 = vec4( x.xy, y.xy );
                            vec4 b1 = vec4( x.zw, y.zw );
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
                            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
                        }
                         float fbm(vec3 p) {
                            float f = 0.0;
                            f += 0.5000 * snoise(p); p = p * 2.02;
                            f += 0.2500 * snoise(p); p = p * 2.03;
                            f += 0.1250 * snoise(p); p = p * 2.01;
                            f += 0.0625 * snoise(p);
                            return f;
                        }
                        
                        void main() {
                            float displacement = fbm(normal * 1.5 + time * 0.2);
                            displacement += fbm(normal * 6.0 + time * 0.6) * 0.25;
                            noise = displacement;
                            
                            vec3 newPosition = position + normal * displacement * 9.0;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                        }
                    `,
                    fragmentShader: `
                        varying float noise;
                        void main() {
                            vec3 color = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.9, 0.5), smoothstep(-0.3, 0.6, noise));
                            float alpha = smoothstep(0.0, 0.5, noise) * (1.0 - smoothstep(0.4, 0.6, noise));
                            gl_FragColor = vec4(color, alpha);
                        }
                    `,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                });
                this.corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
                this.sunGroup.add(this.corona);
            }

            onResize() {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.composer.setSize(window.innerWidth, window.innerHeight);
            }

            animate() {
                requestAnimationFrame(() => this.animate());
                const delta = this.clock.getDelta();
                const elapsedTime = this.clock.getElapsedTime();
                
                if (this.sunGroup) {
                    this.sunGroup.rotation.y += delta * 0.02;
                    if (this.corona && this.corona.material.uniforms) {
                        this.corona.material.uniforms.time.value = elapsedTime;
                    }
                }

                this.controls.update(delta);
                this.composer.render();
            }
        }

        try {
            new SunVisualization();
        } catch(e) {
            console.error("Критична помилка візуалізації:", e);
        }
    </script>
</body>
</html>
