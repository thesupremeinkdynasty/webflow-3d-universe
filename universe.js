// Фінальна версія v6.0 - "Класичне підключення"
// Цей код не використовує import/export. Він покладається на глобальні об'єкти THREE та gsap.

function "Всесвіт"() {
    // Перевіряємо, чи завантажились бібліотеки
    if (typeof THREE === 'undefined' || typeof gsap === 'undefined') {
        console.error("Архітектор: Ключові бібліотеки (THREE або gsap) не завантажились. Перевірте скрипти підключення.");
        return;
    }

    // --- КЛАСИ ---
    class UIManager {
        constructor() {
            this.sidebar = document.getElementById('sidebar');
            if (this.sidebar) {
                this.populateDev();
            } else {
                console.error("UIManager: Sidebar not found!");
            }
        }
        populateDev() {
            this.sidebar.innerHTML = `
                <div style="font-family: 'Playfair Display', serif; color: #D4AF37;">
                    <h1>Книга Мандрівника</h1>
                    <p style="color: #B0A89A;">Всесвіт успішно створено. Архітектура стабільна.</p>
                </div>
            `;
        }
    }

    class Universe {
        constructor() {
            this.container = document.getElementById('webgl-canvas');
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.camera.position.z = 5;

            this.renderer = new THREE.WebGLRenderer({ canvas: this.container, antialias: true, alpha: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            this.addTestCube();
            this.uiManager = new UIManager();

            const loader = document.getElementById('loader');
            if (loader) {
                gsap.to(loader, {
                    opacity: 0, duration: 1.5, onComplete: () => {
                        if (loader) loader.style.display = 'none';
                    }
                });
            }

            this.animate = this.animate.bind(this);
            this.animate();

            window.addEventListener('resize', this.onResize.bind(this));
        }

        addTestCube() {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            this.cube = new THREE.Mesh(geometry, material);
            this.scene.add(this.cube);
            this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
            const dirLight = new THREE.DirectionalLight(0xffffff, 1);
            dirLight.position.set(5, 5, 5);
            this.scene.add(dirLight);
        }

        onResize() {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }

        animate() {
            requestAnimationFrame(this.animate);
            if (this.cube) {
                this.cube.rotation.x += 0.01;
                this.cube.rotation.y += 0.01;
            }
            this.renderer.render(this.scene, this.camera);
        }
    }

    // --- ЗАПУСК ---
    try {
        new Universe();
        const cursorDot = document.getElementById('cursor-dot');
        if (cursorDot) {
            window.addEventListener('mousemove', e => gsap.to(cursorDot, { duration: 0.3, x: e.clientX, y: e.clientY, ease: 'power2.out' }));
        }
    } catch (e) {
        console.error("Критична помилка при створенні Всесвіту:", e);
    }
}

// Запускаємо все після повного завантаження сторінки
if (document.readyState === 'complete') {
    "Всесвіт"();
} else {
    window.addEventListener('load', "Всесвіт");
}
