// True 3D Metaballs System using Three.js
// Creates authentic metaball morphing/blending effects using raymarching

let scene, camera, renderer;
let metaballs = [];
let metaballMesh;

// Metaball class for physics simulation (no individual meshes)
class Metaball {
    constructor(x, y, z, radius, color) {
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
        );
        this.radius = radius;
        this.color = color;
        this.mass = radius * radius; // Mass based on radius
    }
    
    update(deltaTime) {
        // Apply physics
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime * 60));
        
        // Boundary collision with damping
        const bounds = 8;
        if (this.position.x > bounds || this.position.x < -bounds) {
            this.velocity.x *= -0.8;
            this.position.x = Math.max(-bounds, Math.min(bounds, this.position.x));
        }
        if (this.position.y > bounds || this.position.y < -bounds) {
            this.velocity.y *= -0.8;
            this.position.y = Math.max(-bounds, Math.min(bounds, this.position.y));
        }
        if (this.position.z > bounds || this.position.z < -bounds) {
            this.velocity.z *= -0.8;
            this.position.z = Math.max(-bounds, Math.min(bounds, this.position.z));
        }
        
        // Reduced drag for more visible motion
        this.velocity.multiplyScalar(0.98);
    }
    
    applyForce(force) {
        this.velocity.add(force.clone().divideScalar(this.mass));
    }
}

// Initialize the metaball system
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 15);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0a0a);
    document.body.appendChild(renderer.domElement);
    
    // Create metaballs (just physics objects)
    createMetaballs();
    
    // Create the raymarching metaball mesh
    createMetaballMesh();
    
    // Add lighting
    addLights();
    
    // Add event listeners
    addEventListeners();
    
    // Start animation
    animate();
}

// Create multiple metaballs (physics objects only)
function createMetaballs() {
    const colors = [
        new THREE.Vector3(1.0, 0.3, 0.3), // Red
        new THREE.Vector3(0.3, 1.0, 0.3), // Green
        new THREE.Vector3(0.3, 0.3, 1.0), // Blue
        new THREE.Vector3(1.0, 1.0, 0.3), // Yellow
        new THREE.Vector3(1.0, 0.3, 1.0), // Magenta
        new THREE.Vector3(0.3, 1.0, 1.0), // Cyan
        new THREE.Vector3(1.0, 0.6, 0.2), // Orange
        new THREE.Vector3(0.6, 0.3, 1.0)  // Purple
    ];
    
    for (let i = 0; i < 8; i++) {
        const x = (Math.random() - 0.5) * 10;
        const y = (Math.random() - 0.5) * 10;
        const z = (Math.random() - 0.5) * 10;
        const radius = 1.0 + Math.random() * 1.5;
        const color = colors[i % colors.length];
        
        const metaball = new Metaball(x, y, z, radius, color);
        metaballs.push(metaball);
    }
    
    console.log(`Created ${metaballs.length} metaballs`);
}

// Create the single mesh that renders all metaballs using raymarching
function createMetaballMesh() {
    // Large cube that encompasses the entire scene
    const geometry = new THREE.BoxGeometry(30, 30, 30);
    
    // Raymarching shader material
    const material = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide, // Render from inside the cube
        vertexShader: `
            varying vec3 vWorldPosition;
            varying vec3 vLocalPosition;
            
            void main() {
                vLocalPosition = position;
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 ballPositions[16];
            uniform float ballRadii[16];
            uniform vec3 ballColors[16];
            uniform int numBalls;
            uniform float time;
            
            varying vec3 vWorldPosition;
            varying vec3 vLocalPosition;
            
            // Metaball field function
            float metaballField(vec3 pos) {
                float field = 0.0;
                for(int i = 0; i < 16; i++) {
                    if(i >= numBalls) break;
                    vec3 diff = pos - ballPositions[i];
                    float dist = length(diff);
                    float radius = ballRadii[i];
                    field += (radius * radius) / (dist * dist + 0.01);
                }
                return field;
            }
            
            // Get blended color based on metaball influence
            vec3 getMetaballColor(vec3 pos) {
                vec3 color = vec3(0.0);
                float totalInfluence = 0.0;
                
                for(int i = 0; i < 16; i++) {
                    if(i >= numBalls) break;
                    vec3 diff = pos - ballPositions[i];
                    float dist = length(diff);
                    float radius = ballRadii[i];
                    float influence = (radius * radius) / (dist * dist + 0.01);
                    
                    color += ballColors[i] * influence;
                    totalInfluence += influence;
                }
                
                return totalInfluence > 0.0 ? color / totalInfluence : vec3(0.5);
            }
            
            // Calculate normal using gradient
            vec3 getNormal(vec3 pos) {
                float eps = 0.01;
                return normalize(vec3(
                    metaballField(pos + vec3(eps, 0.0, 0.0)) - metaballField(pos - vec3(eps, 0.0, 0.0)),
                    metaballField(pos + vec3(0.0, eps, 0.0)) - metaballField(pos - vec3(0.0, eps, 0.0)),
                    metaballField(pos + vec3(0.0, 0.0, eps)) - metaballField(pos - vec3(0.0, 0.0, eps))
                ));
            }
            
            void main() {
                vec3 rayOrigin = cameraPosition;
                vec3 rayDirection = normalize(vWorldPosition - cameraPosition);
                
                float t = 0.0;
                float threshold = 0.8;
                bool hit = false;
                vec3 hitPos;
                
                // Raymarching
                for(int i = 0; i < 64; i++) {
                    vec3 pos = rayOrigin + rayDirection * t;
                    float field = metaballField(pos);
                    
                    if(field > threshold) {
                        hit = true;
                        hitPos = pos;
                        break;
                    }
                    
                    // Step size based on distance to nearest metaball
                    float stepSize = 0.1;
                    for(int j = 0; j < 16; j++) {
                        if(j >= numBalls) break;
                        float dist = distance(pos, ballPositions[j]);
                        stepSize = min(stepSize, max(0.01, dist - ballRadii[j]));
                    }
                    
                    t += stepSize;
                    
                    if(t > 30.0) break; // Max distance
                }
                
                if(!hit) {
                    discard;
                }
                
                // Calculate lighting
                vec3 normal = getNormal(hitPos);
                vec3 color = getMetaballColor(hitPos);
                
                // Simple lighting
                vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                float lambertian = max(dot(normal, lightDir), 0.0);
                
                // Fresnel effect
                vec3 viewDir = normalize(cameraPosition - hitPos);
                float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
                
                vec3 finalColor = color * (0.3 + 0.7 * lambertian) + vec3(0.2) * fresnel;
                
                gl_FragColor = vec4(finalColor, 0.9);
            }
        `,
        uniforms: {
            ballPositions: { value: [] },
            ballRadii: { value: [] },
            ballColors: { value: [] },
            numBalls: { value: 0 },
            time: { value: 0.0 }
        }
    });
    
    metaballMesh = new THREE.Mesh(geometry, material);
    scene.add(metaballMesh);
    
    console.log('Created raymarching metaball mesh');
}

// Add lighting to the scene
function addLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);
    
    // Point lights for colorful accent lighting
    const pointLight1 = new THREE.PointLight(0xff3366, 1.0, 20);
    pointLight1.position.set(-5, 5, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x3366ff, 1.0, 20);
    pointLight2.position.set(5, -5, 5);
    scene.add(pointLight2);
}

// Apply attraction/repulsion forces between metaballs
function applyMetaballForces() {
    for (let i = 0; i < metaballs.length; i++) {
        for (let j = i + 1; j < metaballs.length; j++) {
            const ball1 = metaballs[i];
            const ball2 = metaballs[j];
            
            const distance = ball1.position.distanceTo(ball2.position);
            const minDistance = ball1.radius + ball2.radius;
            
            // Extended interaction range - metaballs attract from much further away
            if (distance < 12) { // Increased from minDistance * 2 to 12 units
                // Calculate force direction
                const force = ball2.position.clone().sub(ball1.position).normalize();
                
                // Stronger attraction force (inverse square law)
                const attraction = 0.02 / (distance * distance + 0.1); // Increased from 0.001 to 0.02
                const attractionForce = force.clone().multiplyScalar(attraction);
                
                // Repulsion force when too close
                let repulsionForce = new THREE.Vector3();
                if (distance < minDistance * 1.2) { // Closer threshold for repulsion
                    const repulsion = 0.05 / (distance + 0.1); // Increased from 0.01 to 0.05
                    repulsionForce = force.clone().multiplyScalar(-repulsion);
                }
                
                // Apply forces
                ball1.applyForce(attractionForce.clone().add(repulsionForce));
                ball2.applyForce(attractionForce.clone().negate().add(repulsionForce.clone().negate()));
            }
        }
    }
}

// Update shader uniforms for the raymarching mesh
function updateShaderUniforms() {
    if (!metaballMesh) return;
    
    const positions = [];
    const radii = [];
    const colors = [];
    
    metaballs.forEach(ball => {
        positions.push(ball.position.x, ball.position.y, ball.position.z);
        radii.push(ball.radius);
        colors.push(ball.color.x, ball.color.y, ball.color.z);
    });
    
    const material = metaballMesh.material;
    material.uniforms.ballPositions.value = positions;
    material.uniforms.ballRadii.value = radii;
    material.uniforms.ballColors.value = colors;
    material.uniforms.numBalls.value = metaballs.length;
    material.uniforms.time.value = Date.now() * 0.001;
}

// Mouse interaction
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Create attraction force toward mouse
    raycaster.setFromCamera(mouse, camera);
    const mouseWorldPos = raycaster.ray.origin.clone().add(
        raycaster.ray.direction.clone().multiplyScalar(15)
    );
    
    metaballs.forEach(ball => {
        const distance = ball.position.distanceTo(mouseWorldPos);
        if (distance < 8) {
            const force = mouseWorldPos.clone().sub(ball.position).normalize();
            force.multiplyScalar(0.0005 / (distance + 0.1));
            ball.applyForce(force);
        }
    });
}

// Add event listeners
function addEventListeners() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = 0.016; // ~60fps
    
    // Update metaballs
    metaballs.forEach(ball => ball.update(deltaTime));
    
    // Apply forces between metaballs
    applyMetaballForces();
    
    // Update shader uniforms
    updateShaderUniforms();
    
    // Rotate camera around the scene
    const time = Date.now() * 0.0005;
    camera.position.x = Math.cos(time) * 15;
    camera.position.z = Math.sin(time) * 15;
    camera.lookAt(0, 0, 0);
    
    // Render
    renderer.render(scene, camera);
}

// Initialize when page loads
window.addEventListener('load', init);
