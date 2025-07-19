// universe.js - Повна версія коду після КРОКУ 6.2 (Максимальний Реалізм Кредо, усунення "троїння", підкреслення Променів Бога)

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
        surface: `
            uniform float uTime;  
            varying vec2 vUv;
            // Noise functions are injected here
            void main() {
                vec3 p = vec3(vUv * 5.0, uTime * 0.05);
                float n1 = fbm(p, 5); // Основний шум плазми
                float n2 = fbm(p * 2.5 + 20.0, 5); // Додатковий шум для деталізації
                float combined_noise = n1 + n2 * 0.4;

                // Пульсація і "кипіння"
                float pulse_effect = sin(uTime * 2.0 + combined_noise * 10.0) * 0.2 + 0.8;
                combined_noise = (combined_noise + pulse_effect) * 0.5;

                vec3 color1 = vec3(1.0, 0.8, 0.4); // Яскравий жовтий
                vec3 color2 = vec3(1.0, 0.4, 0.0); // Глибокий помаранчевий
                vec3 final_color = mix(color1, color2, combined_noise);
                float intensity = 1.0 + pow(combined_noise, 2.0) * 1.8;
                gl_FragColor = vec4(final_color * intensity, 1.0);
            }
        `,
        corona: `
            uniform float uTime;
            varying vec3 vNormal;
            // Noise functions are injected here
            void main() {
                // Більш виражена інтенсивність по краях
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5); 
                float noise = fbm(vNormal * 4.0 + uTime * 0.2, 4);
                intensity *= (0.7 + noise * 0.3);

                // Додаємо легкий колірний градієнт для корони
                vec3 coronaColorInner = vec3(1.0, 0.9, 0.7); // Світліший жовтий
                vec3 coronaColorOuter = vec3(1.0, 0.5, 0.2); // Більш червоний/помаранчевий
                vec3 finalCoronaColor = mix(coronaColorInner, coronaColorOuter, pow(intensity, 0.5));
                
                gl_FragColor = vec4(finalCoronaColor * intensity * 1.5, intensity * 0.8); // Збільшуємо загальну яскравість та альфу
            }
        `
    },
    archive: ` // Archive Geode / Crystal Planet Shader
        uniform float uTime;
        uniform float uPulse;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
            vec3 p = vec3(vUv * 8.0, uTime * 0.02);
            float crustNoise = fbm(p, 5);
            float crystalNoise = fbm(p * 5.0 + 10.0, 5);
            
            // Outer crust color based on base color and noise
            vec3 crustColor = uColor * (0.6 + crustNoise * 0.4);
            
            // Inner glowing crystal color, influenced by pulse
            vec3 crystalGlowColor = mix(vec3(0.9, 0.9, 1.0), vec3(0.5, 0.5, 1.0), crystalNoise);
            crystalGlowColor *= (1.0 + uPulse * 0.7); // Pulsation
            
            // Create a mask to transition between crust and crystals
            // This is a simplified "geode" effect based on normal direction
            float innerMask = smoothstep(0.4, 0.55, length(vNormal)); // More exposed crystals at center
            
            vec3 finalColor = mix(crystalGlowColor, crustColor, innerMask);
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
    forge: `
        uniform float uTime;
        uniform float uPulse;
        varying vec2 vUv;
        varying vec3 vNormal;
        // Noise functions are injected here
        float line(vec2 p, vec2 a, vec2 b) {
            vec2 pa = p - a, ba = b - a;
            float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            return length(pa - ba * h);
        }
        // Функція для створення ефекту блискавки
        float lightning(vec2 uv, float time, float seed) {
            float strength = 0.0;
            // Використовуємо sin для пульсації блискавок
            float flash_time = mod(time + seed * 10.0, 8.0); // Різні блискавки в різний час
            if (flash_time > 7.5 && flash_time < 7.8) {
                float progress = smoothstep(7.5, 7.6, flash_time) - smoothstep(7.7, 7.8, flash_time);
                
                vec2 branch1_a = vec2(0.3, 0.2) + snoise(vec3(time*0.5, seed, 0)) * 0.1;
                vec2 branch1_b = vec2(0.7, 0.8) + snoise(vec3(time*0.5+10.0, seed, 0)) * 0.1;
                float d1 = line(uv, branch1_a, branch1_b);
                
                vec2 branch2_a = vec2(0.1, 0.6) + snoise(vec3(time*0.5+20.0, seed, 0)) * 0.1;
                vec2 branch2_b = vec2(0.9, 0.4) + snoise(vec3(time*0.5+30.0, seed, 0)) * 0.1;
                float d2 = line(uv, branch2_a, branch2_b);

                strength = (1.0 - smoothstep(0.0, 0.015, d1)) * 0.8; // Основна гілка блискавки
                strength += (1.0 - smoothstep(0.0, 0.01, d2)) * 0.6; // Додаткова гілка
                strength *= progress; // Пульсація спалаху
            }
            return strength;
        }

        void main() {
            vec3 rockColor = vec3(0.02, 0.02, 0.03) * (0.8 + fbm(vNormal * 15.0, 3) * 0.2);
            vec2 lavaUv = vUv * 4.0;
            lavaUv.y += uTime * 0.1;
            float lavaMask = smoothstep(0.5, 0.55, fbm(vec3(lavaUv, uTime * 0.15), 5));
            vec3 lavaColor = vec3(1.0, 0.5, 0.0) * (1.0 + sin(uTime * 3.0 + vUv.x * 20.0) * 0.4 + uPulse * 0.6);
            vec3 finalColor = mix(rockColor, lavaColor, lavaMask);
            
            // Додаємо блискавки
            float lightning_strength = lightning(vUv, uTime, 1.0); // Головна блискавка
            lightning_strength += lightning(vUv * 1.5, uTime, 2.0) * 0.5; // Друга, менша блискавка

            vec3 lightning_color = vec3(1.0, 0.9, 0.7) * lightning_strength * 4.0; // Золотаві блискавки
            finalColor += lightning_color;

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
    pact: ` // Diamond Shader (Reduced Chromatic Aberration)
        uniform samplerCube uEnvMap;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(cameraPosition - vPosition);
            
            // Faking dispersion with REDUCED chromatic aberration on refraction
            // Values are very close to make it almost imperceptible
            vec3 refractedDirR = refract(viewDir, normal, 1.0 / 1.419); 
            vec3 refractedDirG = refract(viewDir, normal, 1.0 / 1.420); 
            vec3 refractedDirB = refract(viewDir, normal, 1.0 / 1.421); 
            
            vec3 colorR = textureCube(uEnvMap, refractedDirR).rgb;
            vec3 colorG = textureCube(uEnvMap, refractedDirG).rgb;
            vec3 colorB = textureCube(uEnvMap, refractedDirB).rgb;
            
            // Fresnel for reflections
            float fresnel = 0.1 + 0.9 * pow(1.0 + dot(viewDir, normal), 3.0);  vec3 reflectedDir = reflect(viewDir, normal);
            vec3 reflectedColor = textureCube(uEnvMap, reflectedDir).rgb;

            vec3 finalColor = mix(vec3(colorR.r, colorG.g, colorB.b), reflectedColor, fresnel);
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
    credo: ` // Paradise Planet Shader (Improved Atmosphere and City Lights)
        uniform sampler2D uDayTexture;
        uniform sampler2D uNightTexture;
        uniform sampler2D uCloudTexture;
        uniform sampler2D uCityLightsTexture;
        uniform float uTime;
        uniform vec3 uSunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition; // Додано для точнішого розрахунку

        void main() {
            vec3 normal = normalize(vNormal);
            float NdotL = dot(normal, uSunDirection); // Косинус кута між нормаллю і світлом

            // 1. Поверхня: День/Ніч/Вогні міст
            vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
            vec3 nightColor = texture2D(uNightTexture, vUv).rgb;
            
            vec3 surfaceColor = mix(nightColor, dayColor, NdotL * 0.5 + 0.5); // Плавний перехід день-ніч

            // Міські вогні, видно тільки вночі та пульсують
            vec3 cityLights = texture2D(uCityLightsTexture, vUv).rgb;
            float pulse_lights = sin(uTime * 5.0 + vUv.x * 20.0) * 0.1 + 0.9;
            float nightBrightness = 1.0 - max(0.0, NdotL); // Більш яскраво вночі
            surfaceColor += cityLights * pow(nightBrightness, 3.0) * pulse_lights * 2.0;


            // 2. Хмари: Рух, тіні та інтеграція
            vec2 cloudUv = vUv;
            cloudUv.x += uTime * 0.005; // Повільний дрейф хмар
            vec4 cloudSample = texture2D(uCloudTexture, cloudUv);
            
            // Тіні від хмар на поверхні
            float shadowStrength = texture2D(uCloudTexture, cloudUv + vec2(0.01, 0.01)).r;
            surfaceColor *= mix(vec3(0.7), vec3(1.0), shadowStrength); // Хмари відкидають тіні

            vec3 finalSurfaceColor = mix(surfaceColor, cloudSample.rgb, cloudSample.a); // Накладаємо хмари на поверхню


            // 3. Атмосфера: Розсіювання світла (Rayleigh scattering)
            // Обчислюємо кут між напрямком світла та напрямком погляду
            vec3 viewDir = normalize(cameraPosition - vPosition);
            float cosAngle = dot(viewDir, uSunDirection);
            
            // Фактор для світанку/заходу сонця
            float horizonFactor = 1.0 - pow(1.0 - max(0.0, dot(normal, viewDir)), 2.0); // Більш виражено на горизонті
            
            // Колір розсіювання (блакитний для денного неба, помаранчевий для світанку/заходу)
            vec3 scatterColorDay = vec3(0.6, 0.8, 1.0); // Блакитний
            vec3 scatterColorSunset = vec3(1.0, 0.6, 0.3); // Помаранчевий

            // Визначаємо, де світанок/захід/ніч
            float terminator = smoothstep(0.0, 0.1, NdotL); // Лінія переходу день-ніч
            vec3 atmosphereScatter = mix(scatterColorSunset, scatterColorDay, terminator); // Колір атмосфери залежить від дня/ночі
            
            // Застосовуємо розсіювання, сильніше на горизонті
            vec3 atmosphereFinal = atmosphereScatter * pow(horizonFactor, 1.5) * 0.8;
            
            // Додаємо атмосферу до фінального кольору
            gl_FragColor = vec4(finalSurfaceColor + atmosphereFinal, 1.0);
        }
    `,
    nebula: `
        uniform float uTime;
        varying vec3 vPosition;
        // Noise functions are injected here
        void main() {
            vec3 pos = normalize(vPosition);
            float noise = fbm(pos * 1.5 + uTime * 0.02, 4);
            vec3 color1 = vec3(0.8, 0.5, 1.0); // Purple
            vec3 color2 = vec3(1.0, 0.8, 0.5); // Gold
            vec3 finalColor = mix(color1, color2, noise);
            gl_FragColor = vec4(finalColor, 0.1 + noise * 0.2);
        }
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

// =============================================================================
// --- Архітектура Всесвіту: Класи, що визначають буття ---
// =============================================================================
/* * Головний клас, що є вмістилищем усього сущого.
 * Він народжує, підтримує та анімує наш космос.
 */
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
        this.createCosmicDust(); // Додаємо космічний пил

        this.composer = this.createComposer();
        this.apiService = new ApiService();
        this.uiManager = new UIManager(this.cameraManager, this.celestialBodies.filter(b => !b.isSource), this.apiService);
        
        this.addEventListeners();
        this.animate();

        // Завершення Акту Творіння
        this.loaderManager.finish();
    }

    createRenderer() {
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            powerPreference: "high-performance",
            logarithmicDepthBuffer: true // Допомагає з рендерингом на великих відстанях
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Обмеження для продуктивності
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.setClearColor(0x000000); // Чорний фон для космосу
        return renderer;
    }

    createComposer() {
        const renderPass = new RenderPass(this.scene, this.cameraManager.camera);
        // Параметри Bloom: strength, radius, threshold (більш м'який Bloom)
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.7); 
        this.godRaysPass = new ShaderPass(Shaders.godRays);
        // Збільшимо uExposure та uWeight для більш виражених променів Бога
        this.godRaysPass.material.uniforms.uExposure.value = 0.35; // Збільшено
        this.godRaysPass.material.uniforms.uWeight.value = 0.5;   // Збільшено
        this.godRaysPass.needsSwap = true;
        
        const composer = new EffectComposer(this.renderer);
        composer.addPass(renderPass);
        composer.addPass(this.godRaysPass);
        composer.addPass(bloomPass); // Додаємо Bloom в кінці
        return composer;
    }

    createLighting() {
        // М'яке розсіяне світло для всієї сцени
        this.scene.add(new THREE.AmbientLight(0xFFFFFF, 0.05));
        // Додаємо направлене світло від Сонця (для ефектів тіней, якщо вони будуть)
        const sunLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
        sunLight.position.set(0, 0, 0); // Позиція буде оновлюватися разом з Сонцем
        this.scene.add(sunLight);
        this.sunLight = sunLight; // Зберігаємо посилання для оновлення
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
            side: THREE.BackSide, // Рендеримо з внутрішньої сторони сфери
            transparent: true,
            blending: THREE.AdditiveBlending // Для ефекту світіння
        });
        const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
        this.scene.add(nebula);
        this.nebula = nebula;
    }

    createCosmicDust() {
        const vertices = [];
        const sizes = [];
        const colors = [];
        const dustCount = 5000; // Кількість частинок пилу

        for (let i = 0; i < dustCount; i++) {
            // Розподіляємо частинки по більшому об'єму
            const x = THREE.MathUtils.randFloatSpread(1000);
            const y = THREE.MathUtils.randFloatSpread(1000);
            const z = THREE.MathUtils.randFloatSpread(1000);
            vertices.push(x, y, z);

            sizes.push(Math.random() * 0.5 + 0.1); // Розмір частинок
            
            // Золотий відтінок для пилу
            const color = new THREE.Color(0xFFD700);
            color.multiplyScalar(Math.random() * 0.5 + 0.5); // Варіації яскравості
            colors.push(color.r, color.g, color.b);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 2, // Базовий розмір точок
            vertexColors: true, // Використовувати кольори з атрибута
            blending: THREE.AdditiveBlending, // Для ефекту світіння
            transparent: true,
            opacity: 0.05, // Дуже низька прозорість для ефірності
            depthWrite: false // Не впливає на глибину інших об'єктів
        });

        this.cosmicDust = new THREE.Points(geometry, material);
        this.scene.add(this.cosmicDust);
    }

    async createCelestialBodies() {
        const textureLoader = new THREE.TextureLoader();
        const textures = await this.loadCredoTextures(textureLoader);

        const planetsConfig = [
            // Планета "Архів" (Library): Гігантська планета з кільцями, що складаються не з каміння, а з мільйонів сяючих гліфів та символів.
            { type: 'Archive', name: "Архів", description: "Тут мовчать слова, але говорять віки. Кожен гліф — це доля, кожна орбіта — урок. Прислухайся до тиші, і ти почуєш істину.", color: 0x4A90E2, size: 2.5, orbit: { a: 25, b: 24, speed: 0.08, axialSpeed: 0.2 }, hasRings: true, ringGlyphColor: 0xF0E6D2, ringInnerRadius: 3, ringOuterRadius: 4.5, ringDensity: 20000, prompt: "Напиши поетичну замальовку про тишу, що зберігає мудрість, про гліфи, що сяють знанням, і про безкінечний пошук істини у бібліотеці віків.", url: 'books' }, // 'books' - приклад URL сторінки каталогу книг
            // Планета "Кузня" (AI-Generator): Вулканічна, геологічно активна планета, по поверхні якої течуть ріки розплавленого металу, символізуючи сиру творчу енергію.
            { type: 'Forge', name: "Кузня", description: "Горнило творіння, де ідеї знаходять форму. Тут народжується нове у вогні натхнення.", size: 2.2, orbit: { a: 38, b: 39, speed: 0.06, axialSpeed: 0.1 }, prompt: "Напиши коротку, потужну притчу або вірш про біль творення, красу нової форми, що народжується з хаосу, і про безперервне полум'я натхнення.", url: 'ai-generator' }, // 'ai-generator' - приклад URL сторінки AI генератора
            // Планета "Пакт" (Pricing): Кришталева, ідеально огранена планета, що переливається всіма кольорами, символізуючи прозорість та цінність.
            { type: 'Pact', name: "Пакт", description: "Кристал довіри, що сяє прозорістю. Його грані відображають чистоту намірів.", size: 2.0, orbit: { a: 55, b: 55, speed: 0.04, axialSpeed: 0.3 }, prompt: "Створи коротку, елегантну філософську думку або вірш про прозорість, довіру, цінність даного слова та про те, як чистота намірів відбиває світло істини.", url: 'pricing-tariffs' }, // 'pricing-tarms' - приклад URL сторінки з тарифами
            // Планета "Кредо" (About Us): Землеподібна планета з океанами та континентами, що символізує людський аспект проєкту.
            { type: 'Credo', name: "Кредо", description: "Сад буття, що плекає красу зв'язку. Тут кожна душа знаходить свій дім.", size: 2.4, orbit: { a: 68, b: 65, speed: 0.03, axialSpeed: 0.25 }, textures, prompt: "Напиши теплий, надихаючий вірш або коротку замальовку про єдність, красу зв'язків між душами, відчуття дому та гармонію, що народжується у спільноті.", url: 'about-us' }, // 'about-us' - приклад URL сторінки "Про нас"
            
            // Приклади інших планет, які ще не мають спеціалізованих класів, але можуть бути додані
            { type: 'Planet', name: "Гільдія", description: "Світ співпраці та об'єднання. Тут народжуються ідеї, які єднають душі.", color: 0x8A2BE2, size: 2.0, orbit: { a: 80, b: 78, speed: 0.02, axialSpeed: 0.15 }, isDouble: true, prompt: "Розкрийте сутність Гільдії: як два світи, що обертаються навколо спільного центру, символізують силу єдності та взаємодоповнення.", url: 'community' },
            { type: 'Planet', name: "Інсайти", description: "Газовий гігант, у вихорах якого приховані глибокі відкриття та несподівані думки.", color: 0xFF4500, size: 3.0, orbit: { a: 95, b: 90, speed: 0.015, axialSpeed: 0.08 }, hasGreatSpot: true, greatSpotColor: 0x8B0000, prompt: "Створи вірш або прозу про раптові спалахи інсайтів, що з'являються з хаосу мислення, як Велика Червона Пляма на газовому гіганті, символізуючи потужність інтелекту.", url: 'insights' }
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
                default: planet = new Planet(config); // Використовуємо базовий Planet для інших типів поки що
            }
            this.celestialBodies.push(planet);
            this.scene.add(planet.group);
        });
    }

    async loadCredoTextures(loader) {
        // !!! ЦІ ПОСИЛАННЯ НА ТЕКСТУРИ КРЕДО ВЖЕ ОНОВЛЕНО ВІДПОВІДНО ДО ВАШИХ НАДАНЬ !!!
        const dayTexture = await loader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c2da226c827007b577b22_Copilot_20250720_014233.png'); // Нова, детальна денна текстура
        const nightTexture = await loader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c024ead466abd5313cd10_Copilot_20250719_221536.png');
        const cloudTexture = await loader.loadAsync('https://cdn.prod.website-files.com/687800cd3b57aa1d537bf6f3/687c1928c5195caae24ec511_ChatGPT%20Image%2020%20%D0%BB%D0%B8%D0%BF.%202025%20%D1%80.%2C%2000_13_34.png'); // Густі білі хмари
        const cityLightsTexture = await loader.loadAsync('https://www.solarsystemscope.com/textures/download/2k_earth_lights.jpg'); // Додано для Кредо (якщо не було)
        
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
        this.planets.forEach(p => { if(p.mesh && p.mesh.material.uniforms.uPulse) gsap.to(p.mesh.material.uniforms.uPulse, { value: 0, duration: 0.5 }); });
        if(targetBody.mesh && targetBody.mesh.material.uniforms.uPulse) {
            this.pulseTween = gsap.to(targetBody.mesh.material.uniforms.uPulse, { value: 1, duration: 1.5, repeat: -1, yoyo: true, ease: 'power1.inOut' });
        }
    }

    returnToGlobalView() {
        if (!this.focusedObject) return;
        this.focusedObject = null;
        this.cameraManager.returnToOverview();
        this.updateSidebarToGlobalView();
        if (this.pulseTween) this.pulseTween.kill();
        this.planets.forEach(p => { if(p.mesh && p.mesh.material.uniforms.uPulse) gsap.to(p.mesh.material.uniforms.uPulse, { value: 0, duration: 0.5 }); });
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

        // Базовий матеріал для планет, якщо немає кастомного шейдера
        const standardMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPulse: { value: 0 },
                uColor: { value: new THREE.Color(config.color) }
            },
            vertexShader: Shaders.sharedVertex,
            fragmentShader: Shaders.noise + `
                uniform float uTime;
                uniform float uPulse;
                uniform vec3 uColor;
                varying vec2 vUv;
                void main() {
                    float n = fbm(vec3(vUv * 8.0, uTime * 0.05), 5);
                    vec3 finalColor = uColor * (0.7 + n * 0.6) * (1.0 + uPulse * 0.2);
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), config.material || standardMaterial);
        this.mesh.userData.celestialBody = this; // Для Raycasting
        this.group.add(this.mesh);

        // Атмосфера (якщо потрібна)
        if (config.hasAtmosphere) {
            const atmosphereMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uSunDirection: { value: new THREE.Vector3(1, 0, 0) }, // Буде оновлюватися в Universe.animate
                    uAtmosphereColor: { value: new THREE.Color(config.atmosphereColor || 0x4a90e2) }
                },
                vertexShader: Shaders.sharedVertex, 
                fragmentShader: Shaders.noise + ` // Простий шейдер атмосфери для узагальнених планет
                    uniform vec3 uSunDirection;
                    uniform vec3 uAtmosphereColor;
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    void main() {
                        float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                        float fresnel = dot(normalize(uSunDirection), vNormal);
                        fresnel = pow(1.0 - fresnel, 4.0);
                        float finalIntensity = intensity * fresnel;
                        gl_FragColor = vec4(uAtmosphereColor, 1.0) * finalIntensity;
                    }
                `,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide,
                transparent: true
            });
            const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(this.size * 1.1, 64, 64), atmosphereMaterial);
            this.group.add(atmosphere);
        }

        // Кільця (якщо потрібні, не для Архіва)
        if (config.hasRings && config.type !== 'Archive') { 
            const ringGeometry = new THREE.TorusGeometry(this.size * 1.5, 0.2, 16, 100);
            const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xAAAAAA, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
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
            if (this.mesh.material.uniforms && this.mesh.material.uniforms.uTime) {
                this.mesh.material.uniforms.uTime.value = elapsedTime;
            }
            if (this.mesh.material.uniforms && this.mesh.material.uniforms.uSunDirection && this.group.parent) {
                const sunBody = this.group.parent.children.find(c => c.userData.celestialBody && c.userData.celestialBody.isSource);
                if (sunBody) {
                    const sunPosition = new THREE.Vector3();
                    sunBody.getWorldPosition(sunPosition);
                    this.mesh.material.uniforms.uSunDirection.value.copy(sunPosition).normalize();
                }
            }
        }
    }
}
    
// Спеціалізовані класи для планет
class Archive extends Planet {
    constructor(config) {
        // Викликаємо конструктор батьківського класу Planet, але запобігаємо додаванню стандартного мешу одразу
        super({ ...config, material: null, hasAtmosphere: true, atmosphereColor: 0x4a90e2 }); 
        
        // Custom material for the geode effect
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPulse: { value: 0 },
                uColor: { value: new THREE.Color(config.color) }
            },
            vertexShader: Shaders.sharedVertex,
            fragmentShader: Shaders.noise + Shaders.archive
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh); // Додаємо створений меш до групи

        // Create Rings of Glyphs using InstancedMesh
        if (config.hasRings) {
            const glyphGeometry = new THREE.PlaneGeometry(0.1, 0.1); // Small plane for each glyph
            const glyphMaterial = new THREE.MeshBasicMaterial({ 
                color: new THREE.Color(config.ringGlyphColor),
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.5, // Зроблено більш ефірним
                side: THREE.DoubleSide // Відображення з обох сторін
            });
            
            // InstancedMesh для ефективного рендерингу тисяч гліфів
            this.glyphInstances = new THREE.InstancedMesh(glyphGeometry, glyphMaterial, config.ringDensity);
            this.glyphInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // Будемо оновлювати матриці

            const dummy = new THREE.Object3D(); // Допоміжний об'єкт для позиціонування
            for (let i = 0; i < config.ringDensity; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = THREE.MathUtils.randFloat(config.ringInnerRadius, config.ringOuterRadius);
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                const y = THREE.MathUtils.randFloatSpread(0.1); // Невеликі вертикальні варіації

                dummy.position.set(x, y, z);
                dummy.rotation.y = Math.random() * Math.PI * 2; // Випадкова ротація кожного гліфа
                dummy.updateMatrix(); // Оновлюємо матрицю
                this.glyphInstances.setMatrixAt(i, dummy.matrix); // Встановлюємо матрицю для екземпляра
            }
            this.glyphInstances.instanceMatrix.needsUpdate = true; // Повідомляємо Three.js про оновлення
            this.group.add(this.glyphInstances);
        }
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta); // Оновлює позицію групи та обертання меша (якщо є)
        if (this.mesh.material.uniforms.uTime) this.mesh.material.uniforms.uTime.value = elapsedTime;

        if (this.glyphInstances) {
            this.glyphInstances.rotation.y += delta * 0.05; // Повільне обертання всієї системи кілець
            // Для індивідуальної анімації гліфів, потрібно оновлювати `setMatrixAt` в циклі
        }
    }
}
    
class Forge extends Planet {
    constructor(config) {
        super({ ...config, material: null }); // Pass null material to avoid default Planet material being created and added
        const material = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
            vertexShader: Shaders.sharedVertex,
            fragmentShader: Shaders.noise + Shaders.forge
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh); // Додаємо створений меш до групи
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta);
        this.mesh.material.uniforms.uTime.value = elapsedTime;
    }
}

class Pact extends Planet {
    constructor(config, renderer, scene) {
        super({ ...config, material: null }); // Pass null material
        this.cubeCamera = new THREE.CubeCamera(1, 2000, new THREE.WebGLCubeRenderTarget(256));
        this.scene = scene;
        this.renderer = renderer;
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uEnvMap: { value: this.cubeCamera.renderTarget.texture }
            },
            vertexShader: Shaders.sharedVertex,
            fragmentShader: Shaders.pact
        });
        this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(this.size, 5), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh); // Додаємо створений меш до групи
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta);
        this.mesh.visible = false; // Приховуємо меш під час рендерингу оточення
        this.cubeCamera.position.copy(this.group.position);
        this.cubeCamera.update(this.renderer, this.scene);
        this.mesh.visible = true; // Показуємо меш назад
        this.mesh.material.uniforms.uTime.value = elapsedTime;
    }
}

class Credo extends Planet {
    constructor(config) {
        super({ ...config, hasAtmosphere: true, atmosphereColor: 0x4a90e2, material: null }); // Pass null material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uDayTexture: { value: config.textures.day },
                uNightTexture: { value: config.textures.night },
                uCloudTexture: { value: config.textures.clouds },
                uCityLightsTexture: { value: config.textures.cityLights }, // Нова уніформа для вогнів міст
                uSunDirection: { value: new THREE.Vector3(1, 0, 0) } // Для розсіювання світла в атмосфері
            },
            vertexShader: Shaders.sharedVertex,
            fragmentShader: Shaders.credo
        });
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.size, 64, 64), material);
        this.mesh.userData.celestialBody = this;
        this.group.add(this.mesh); // Додаємо створений меш до групи
    }
    update(elapsedTime, delta) {
        super.update(elapsedTime, delta);
        this.mesh.material.uniforms.uTime.value = elapsedTime;
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
