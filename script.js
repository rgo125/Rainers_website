// Scene, Camera, Renderer setup
let scene, camera, renderer, projects = [];
let mouse = { x: 0, y: 0 };
let scrollY = 0;
let lastScrollY = 0;
let currentRotation = 0;
let rotationVelocity = 0;
let accumulatedScrollForce = 0;
let hasScrollingStarted = false;
let currentMagneticTarget = 0; // Persistent magnetic target (project index)
let ignoreScrollUntil = 0; // Timestamp to ignore scroll events until
let lastScrollTime = 0; // Track when last scroll input occurred
let thresholdBrokenUntil = 0; // Timestamp to keep thresholdBroken true until


// Project class to handle both 3D card and text content
class Project {
    constructor(index, color, title, description) {
        this.index = index;
        this.title = title;
        this.description = description;
        this.sectionY = index * window.innerHeight; // Y position in the document
        
        // Create 3D card
        this.createCard(color);
        
        // Create 3D text element
        this.create3DTextElement();
        
        // Initial positions will be set after model loads asynchronously
    }
    
    createCard(color) {
        // Create material with specified color
        const material = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 100,
            transparent: true,
            opacity: 0.9
        });
        
        // Load custom GLB model for card
        const loader = new THREE.GLTFLoader();
        loader.load('./3d_models/card.glb', (gltf) => {
            this.card = gltf.scene;
            
            // Apply colored material to all meshes in the model
            this.card.traverse((child) => {
                if (child.isMesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.layers.set(0); // Keep cards on default layer 0
                }
            });
            
            // Animation properties
            this.card.userData = {
                phase: Math.random() * Math.PI * 2,
                bounceSpeed: 0.02 + Math.random() * 0.01,
                baseY: 0,
                targetPosition: new THREE.Vector3(),
                currentPosition: new THREE.Vector3()
            };
            
            // Set initial positions now that model is loaded
            this.setInitialPositions();
            
            scene.add(this.card);
        }, undefined, (error) => {
            console.error('Error loading card model:', error);
            // Fallback to basic geometry if model fails to load
            const geometry = new THREE.BoxGeometry(2, 3, 0.1);
            this.card = new THREE.Mesh(geometry, material);
            
            // Position card to the left side and at fixed Y based on section
            this.card.position.x = -4;
            this.card.position.y = -this.index * 8; // Fixed Y position for each section
            this.card.position.z = 0;
            
            // Initial rotation for fallback geometry - will be updated in setInitialPositions
            this.card.rotation.x = 0.1;
            this.card.rotation.y = -1.2;
            this.card.rotation.z = 0;
            
            // Animation properties
            this.card.userData = {
                phase: Math.random() * Math.PI * 2,
                bounceSpeed: 0.02 + Math.random() * 0.01,
                baseY: 0,
                targetPosition: new THREE.Vector3(),
                currentPosition: new THREE.Vector3()
            };
            
            // Enable shadows
            this.card.castShadow = true;
            this.card.receiveShadow = true;
            
            // Keep cards on default layer 0 (not affected by accent light)
            this.card.layers.set(0);
            
            // Set initial positions for fallback geometry
            this.setInitialPositions();
            
            scene.add(this.card);
        });
    }
    
    create3DTextElement() {
        // Wait a bit more for fonts to be ready
        this.createTextCanvas();
    }
    
    createTextCanvas() {
        // Create canvas for text rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas size - wider to match the wider plane geometry
        canvas.width = 768; // Increased proportionally (6/4 * 512 = 768)
        canvas.height = 256;
        
        // Helper function to draw rounded rectangle
        const drawRoundedRect = (ctx, x, y, width, height, radius) => {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        };
        
        // Completely transparent background - let the glass material show through
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Optional: Very subtle text background for readability
        context.fillStyle = 'rgba(0, 0, 0, 0.15)';
        drawRoundedRect(context, 10, 10, canvas.width - 20, canvas.height - 20, 50);
        context.fill();
        
        // Title text
        context.fillStyle = '#ffffff';
        context.font = '300 32px Satoshi, Arial, sans-serif'; // Light weight (300) instead of bold
        context.textAlign = 'left';
        
        // Debug: Check if font is available
        console.log(`🔤 Using font for title: ${context.font}`);
        console.log(`📊 Font available check: ${document.fonts.check('32px Satoshi')}`);
        
        context.fillText(this.title, 30, 60);
        
        // Description text (word wrap)
        context.font = '300 18px Satoshi, Arial, sans-serif'; // Light weight (300)
        context.fillStyle = 'rgba(255, 255, 255, 0.9)';
        console.log(`🔤 Using font for description: ${context.font}`);
        this.wrapText(context, this.description, 30, 100, canvas.width - 60, 22);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Simple flat blue material
        const textMaterial = new THREE.MeshPhongMaterial({
            color: 0x4169E1, // Royal blue
            transparent: false,
            opacity: 1.0,
            side: THREE.DoubleSide
        });
        
        // Load custom GLB model for text box
        const loader = new THREE.GLTFLoader();
        loader.load('./3d_models/text_box.glb', (gltf) => {
            this.textMesh = gltf.scene;
            
            // Apply blue material to all meshes in the model
            this.textMesh.traverse((child) => {
                if (child.isMesh) {
                    child.material = textMaterial;
                    child.layers.set(1); // Set to layer 1 for accent light
                }
            });
            
            // Set initial positions now that model is loaded
            this.setInitialPositions();
            
            scene.add(this.textMesh);
        }, undefined, (error) => {
            console.error('Error loading text box model:', error);
            // Fallback to basic geometry if model fails to load
            const fallbackGeometry = new THREE.BoxGeometry(6, 2, 0.2);
            this.textMesh = new THREE.Mesh(fallbackGeometry, textMaterial);
            this.textMesh.layers.set(1);
            
            // Set initial positions for fallback geometry
            this.setInitialPositions();
            
            scene.add(this.textMesh);
        });
    }
    
    // Helper function to wrap text on canvas
    wrapText(context, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                context.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        context.fillText(line, x, currentY);
    }
    
    setInitialPositions() {
        // Only proceed if both card and text models are loaded
        if (!this.card || !this.textMesh) {
            return; // Wait for both models to load
        }
        
        // Arrange projects around the rod with controlled spacing
        const totalProjects = 6;
        const radius = 8; // Distance from the rotation rod
        const angleStep = Math.PI / 6; // Larger steps between projects (30 degrees each)
        // Start with Project 1 at center front (angle 0), others arranged below
        const angle = -this.index * angleStep; // Project 1 at 0, Project 2 at -30°, etc.
        
        // Calculate semicircular positions around the X-axis rod
        // Rod is at Y=0, Z=0, extending infinitely in X direction
        const y = Math.sin(angle) * radius; // Y position using sin
        const z = Math.cos(angle) * radius; // Z position using cos
        
        // Position the card and text side by side at this circular position
        this.card.position.set(-2, y, z); // Card on the left
        this.textMesh.position.set(2, y, z); // Text on the right
        
        // Initial card rotation will be set by updateRotation() during animation
        
        // Set initial text box rotation (120) degrees about Y-axis)
        if (this.textMesh) {
            this.textMesh.rotation.y = 0 //Math.PI * 0 / 180; // 120 degrees
        }
        
        // Store the base angle for rotation around X-axis
        this.baseAngle = angle;
    }
    
    updateRotation(scrollRotation) {
        // Only proceed if both card and text models are loaded
        if (!this.card || !this.textMesh) {
            return; // Wait for both models to load
        }
        
        // Rotate this project around the X-axis rod based on scroll
        const currentAngle = this.baseAngle + scrollRotation;
        
        // Calculate new position around the X-axis rod
        const radius = 8;
        const y = Math.sin(currentAngle) * radius; // Y moves up/down
        const z = Math.cos(currentAngle) * radius; // Z moves forward/back
        
        // Calculate how close this project is to being front and center
        const distanceFromCenter = Math.abs(currentAngle); // 0 = perfectly centered
        const activationThreshold = Math.PI / 8; // Start animation when within ~22.5 degrees
        const centeredness = Math.max(0, 1 - (distanceFromCenter / activationThreshold));
        
        // Update card position
        this.card.position.set(-2, y, z);
        
        // Animate text box sliding in from the right
        const hiddenX = 15; // Much further right position when hidden (off-screen)
        const visibleX = 2; // Normal position when visible
        const textX = hiddenX + (visibleX - hiddenX) * centeredness;
        
        this.textMesh.position.set(textX, y, z);
        

        
        // Only make text visible when it starts moving in
        this.textMesh.visible = centeredness > 0.1;
        
        // Rotate objects to always face the camera
        this.card.rotation.x = currentAngle;
        this.card.rotation.y = -1.2; // Angle toward the left
        this.textMesh.rotation.x = currentAngle;
        this.textMesh.rotation.y = Math.PI * -95 / 180; // Maintain -95 degree Y-axis rotation
    }
    
    animate(time) {
        // Animation handled by rotation system
    }
}

// Create debug display element
function createDebugDisplay() {
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debug-display';
    debugDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 14px;
        z-index: 1000;
        min-width: 200px;
    `;
    document.body.appendChild(debugDiv);
}

// Update debug display with current values
function updateDebugDisplay(forceDirection, accumulatedScrollForce, currentMagneticTarget, breakThreshold) {
    const debugDiv = document.getElementById('debug-display');
    if (debugDiv) {
        const thresholdStatus = Math.abs(accumulatedScrollForce) > breakThreshold ? 'BREAKING' : 'building';
        
        debugDiv.innerHTML = `
            <div><strong>Force Direction:</strong> ${forceDirection}</div>
            <div><strong>Scroll Force:</strong> ${accumulatedScrollForce.toFixed(1)}</div>
            <div><strong>Threshold:</strong> ${breakThreshold}</div>
            <div><strong>Status:</strong> ${thresholdStatus}</div>
            <div><strong>Current Project:</strong> ${currentMagneticTarget + 1}</div>
        `;
    }
}

// Initialize the Three.js scene
function init() {
    // Create debug display
    createDebugDisplay();
    
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0c0c0c, 10, 150); // Extended fog range to match camera

    // Create camera with normal field of view and extended far plane
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 13; // Move camera closer for better view
    
    // Enable camera to see both layer 0 (cards) and layer 1 (text boxes)
    camera.layers.enable(0);
    camera.layers.enable(1);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 1);
    
    // Enable physical material features
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Add lights
    addLights();
    
    // Add dark grey background
    addDarkGreyBackground();
    

    
    // Create projects
    createProjects();
    
    // Add event listeners
    addEventListeners();
    
    // Initialize arrow visibility
    updateArrowVisibility();
    
    // Start animation loop
    animate();
}





// Add dark grey background plane
function addDarkGreyBackground() {
    // Create a large plane behind everything
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0, 0, 0), // Very dark grey (RGB 15, 15, 15)
        transparent: false,
        opacity: 1
    });
    
    const backgroundPlane = new THREE.Mesh(geometry, material);
    backgroundPlane.position.z = -5; // Further behind metaballs
    backgroundPlane.rotation.x = 0;
    
    console.log('🎨 Dark grey background added at Z=-5');
    
    scene.add(backgroundPlane);
}

// Add lighting to the scene
function addLights() {
    // Ambient light for overall scene illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // Key light - main directional light from upper front (cards only)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(10, 15, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.layers.set(0); // Only affect cards
    scene.add(keyLight);

    // Fill light - softer light from the side (cards only)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-10, 10, 5);
    fillLight.layers.set(0); // Only affect cards
    scene.add(fillLight);

    // Back light - rim lighting from behind (cards only)
    const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
    backLight.position.set(0, 5, -10);
    backLight.layers.set(0); // Only affect cards
    scene.add(backLight);

    // Accent point lights for glass reflections and color (cards only)
    const accentLight1 = new THREE.PointLight(0x4ecdc4, 1.0, 30);
    accentLight1.position.set(-8, 8, 12);
    accentLight1.layers.set(0); // Only affect cards
    scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(0xff6b6b, 1.0, 30);
    accentLight2.position.set(8, 8, 12);
    accentLight2.layers.set(0); // Only affect cards
    scene.add(accentLight2);

    // Additional fill light from below (cards only)
    const bottomLight = new THREE.PointLight(0xffffff, 0.5, 25);
    bottomLight.position.set(0, -5, 8);
    bottomLight.layers.set(0); // Only affect cards
    scene.add(bottomLight);

    // General light for text boxes (layer 1)
    const textLight = new THREE.PointLight(0xffffff, 1.5, 30);
    textLight.position.set(5, 2, 8);
    textLight.layers.set(1); // Only affect text boxes
    scene.add(textLight);
    
    console.log('💡 Standard lighting setup complete');
}



// Create projects with both 3D cards and text
function createProjects() {
    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xffa726, 0x66bb6a, 0xab47bc];
    const projectData = [
        {
            title: "Project One",
            description: "Description of your first amazing project. This could be a web application, mobile app, or any other work you're proud of."
        },
        {
            title: "Project Two", 
            description: "Your second project showcasing different skills and technologies. Maybe a data visualization or API integration."
        },
        {
            title: "Project Three",
            description: "Another impressive project that demonstrates your versatility and technical expertise in development."
        },
        {
            title: "Project Four",
            description: "A project that highlights your problem-solving abilities and attention to detail in software development."
        },
        {
            title: "Project Five",
            description: "An innovative solution or creative implementation that showcases your unique approach to coding challenges."
        },
        {
            title: "Project Six",
            description: "Your latest and greatest work that represents your current skill level and passion for development."
        }
    ];
    
    for (let i = 0; i < projectData.length; i++) {
        const project = new Project(
            i, 
            colors[i], 
            projectData[i].title, 
            projectData[i].description
        );
        projects.push(project);
    }
    
    // No scrollable content needed - using wheel events for physics input only
}

// Add event listeners
function addEventListeners() {
    // Mouse move for camera interaction
    document.addEventListener('mousemove', onMouseMove, false);
    
    // Window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Mouse click for card interaction
    document.addEventListener('click', onMouseClick, false);
    
    // Wheel event for physics input (replaces scroll)
    window.addEventListener('wheel', onWheel, { passive: false });
    
    // Arrow navigation
    document.getElementById('arrow-up').addEventListener('click', () => navigateToProject(-1));
    document.getElementById('arrow-down').addEventListener('click', () => navigateToProject(1));
}

// Handle wheel events (replaces scroll)
function onWheel(event) {
    // Prevent default scrolling behavior
    event.preventDefault();
    
    // Ignore wheel events if we're in the post-threshold break period
    if (Date.now() < ignoreScrollUntil) {
        return; // Ignore this wheel event
    }
    
    // Use wheel delta directly for physics input
    scrollY += event.deltaY * 0.5; // Scale the wheel input
}

// Handle mouse movement
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Handle mouse click - no effects for now
function onMouseClick(event) {
    // No click effects - keeping function in case we want to add interactions later
}

// Navigate to project using arrows (bypasses scroll force)
function navigateToProject(direction) {
    const totalProjects = 6;
    const newTarget = currentMagneticTarget + direction;
    
    // Only navigate if within bounds
    if (newTarget >= 0 && newTarget < totalProjects) {
        console.log(`🔼 Arrow navigation: ${currentMagneticTarget} → ${newTarget}`);
        currentMagneticTarget = newTarget;
        
        // Reset scroll force and velocity for clean transition
        accumulatedScrollForce = 0;
        rotationVelocity = 0;
        
        // Update arrow visibility
        updateArrowVisibility();
    }
}

// Update arrow visibility based on current position
function updateArrowVisibility() {
    const totalProjects = 6;
    const upArrow = document.getElementById('arrow-up');
    const downArrow = document.getElementById('arrow-down');
    
    // Hide up arrow at first project
    if (currentMagneticTarget === 0) {
        upArrow.classList.add('hidden');
    } else {
        upArrow.classList.remove('hidden');
    }
    
    // Hide down arrow at last project
    if (currentMagneticTarget === totalProjects - 1) {
        downArrow.classList.add('hidden');
    } else {
        downArrow.classList.remove('hidden');
    }
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
    
    // Update project animations and positions
    const time = Date.now() * 0.001;
    
    // Calculate magnetic snapping rotation
    const totalProjects = 6;
    const scrollProgress = scrollY / window.innerHeight; // How many screen heights scrolled
    const angleStep = Math.PI / 6; // Same as positioning step - 30 degrees each
    
    // Clamp scroll progress to valid range (0 to totalProjects-1 screen heights)
    const clampedProgress = Math.max(0, Math.min(totalProjects - 1, scrollProgress));
    
    // Calculate scroll input
    const scrollDelta = scrollY - lastScrollY;
    const scrollDirection = Math.sign(scrollDelta); // +1 for down, -1 for up, 0 for no scroll
    lastScrollY = scrollY;
    
    // Threshold system for breaking magnetic hold
    const breakThreshold = 23; // Very responsive threshold
    
    let appliedForce = 0;
    let forceDirection = 0; // Track for debug display
    let thresholdBroken = Date.now() < thresholdBrokenUntil; // Check if still in threshold broken period
    
    // Check if threshold is broken FIRST
    if (Math.abs(accumulatedScrollForce) > breakThreshold && accumulatedScrollForce !== 0) {
        // Threshold broken - UPDATE the persistent magnetic target
        console.log(`🔥 THRESHOLD BROKEN! ScrollForce: ${accumulatedScrollForce.toFixed(1)} → Switching target`);
        forceDirection = Math.sign(accumulatedScrollForce);
        thresholdBroken = true;
        thresholdBrokenUntil = Date.now() + 500; // Keep threshold broken for 200ms
        
        // Calculate how many projects to skip based on scroll force magnitude
        const forceStrength = Math.abs(accumulatedScrollForce);
        let projectsToSkip = 1; // Default: move 1 project
        
        // if (forceStrength > 50) {
        //     projectsToSkip = 3; // Very fast scroll: skip 3 projects
        // } else if (forceStrength > 25) {
        //     projectsToSkip = 2; // Fast scroll: skip 2 projects
        // }
        
        // Update the persistent magnetic target (keep within valid project range)
        const newTarget = currentMagneticTarget + (forceDirection * projectsToSkip);
        currentMagneticTarget = Math.max(0, Math.min(totalProjects - 1, newTarget));
        
        console.log(`📈 Force: ${forceStrength.toFixed(1)} → Skipping ${projectsToSkip} project(s)`);
        
        // Reset scroll force AND velocity to prevent overshooting
        accumulatedScrollForce = 0;
        rotationVelocity = 0;
        
        // Brief ignore period to prevent immediate re-triggering
        ignoreScrollUntil = Date.now() + 200;
        
        // Update arrow visibility
        updateArrowVisibility();
        
        // Display the actual project number (clamped for display)
        const displayProject = Math.max(1, Math.min(totalProjects, currentMagneticTarget + 1));
        console.log(`✅ New magnetic target: Project ${displayProject}`);
    }
    
    // Auto-reset scroll force when user stops scrolling (for clean centering)
    const timeSinceLastScroll = Date.now() - lastScrollTime;
    
    // Only build up scroll force if threshold hasn't broken this frame
    if (Math.abs(scrollDelta) > 0 && !thresholdBroken) {
        hasScrollingStarted = true; // Mark that scrolling has begun
        lastScrollTime = Date.now(); // Update last scroll time
        const oldForce = accumulatedScrollForce;
        accumulatedScrollForce += (Math.abs(scrollDelta) * 0.3) * scrollDirection;
        console.log(`⚡ Scroll: delta=${scrollDelta.toFixed(1)}, time=${timeSinceLastScroll.toFixed(1)}ms ago`);
    }
    // Time-based dampening - only apply after threshold is broken
    if (thresholdBroken && accumulatedScrollForce !== 0 && hasScrollingStarted) {
        const maxTime = 5; // ms - time at which force becomes 0
        const timeFactor = Math.min(timeSinceLastScroll / maxTime, 0.75) + 0.25; // 0 to 1
        const timeDampening = 1 - timeFactor; // 1 (no dampening) to 0 (complete dampening)
        
        accumulatedScrollForce *= timeDampening;
        
        // Debug when significant time dampening occurs
        if (timeFactor > 0.5) {
            console.log(`⏱️ Time dampening: ${timeSinceLastScroll.toFixed(1)}ms, factor: ${timeDampening.toFixed(3)}`);
        }
    }
    
    // Clamp scroll force to break threshold when threshold is broken
    if (thresholdBroken) {
        const sign = Math.sign(accumulatedScrollForce);
        accumulatedScrollForce = Math.min(Math.abs(accumulatedScrollForce), breakThreshold - 10.0) * sign;
    }
    
    // Always apply magnetic force toward the current target
    const magneticTargetRotation = currentMagneticTarget * angleStep;
    const magneticForce = (magneticTargetRotation - currentRotation) * 0.023; // Further reduced magnetic pull for smoother boundaries
    const scrollForce = accumulatedScrollForce * 0.0001; // Much reduced scroll resistance for visual feedback
    
    appliedForce = magneticForce + scrollForce;
    
    rotationVelocity += appliedForce;
    rotationVelocity *= 0.85; // Damping
    
    // Adaptive dampening - stronger dampening for faster scrolling
    if (accumulatedScrollForce !== 0) {
        const forceStrength = Math.abs(accumulatedScrollForce);
        // Base dampening: 0.98, increases to 0.92 for very fast scrolling
        const dampeningFactor = 0.98 - (forceStrength * 0.008); // More dampening as force increases
        const clampedDampening = Math.max(0.92, Math.min(0.98, dampeningFactor));
        
        accumulatedScrollForce *= clampedDampening;
        
        // Debug: show dampening effect
        if (forceStrength > 2) {
            console.log(`🎛️ Force: ${forceStrength.toFixed(1)}, Dampening: ${clampedDampening.toFixed(3)}`);
        }
    }
    
    // Update rotation
    currentRotation += rotationVelocity;
    
    // Allow rotation beyond valid range for natural physics at extremes
    // currentRotation = Math.max(0, Math.min((totalProjects - 1) * angleStep, currentRotation));
    

    
    // Update all projects with the smoothed rotation
    projects.forEach(project => {
        project.updateRotation(currentRotation);
        project.animate(time);
    });
    
    // Update debug display only after scrolling has started
    if (hasScrollingStarted) {
        // Clamp magnetic target for display purposes only
        const displayTarget = Math.max(0, Math.min(totalProjects - 1, currentMagneticTarget));
        updateDebugDisplay(forceDirection, accumulatedScrollForce, displayTarget, breakThreshold);
    }
    
    // Camera stays fixed - slot machine style
    camera.position.x = 0;
    camera.position.y = 0;
    // Z position already set to 4
    
    // Camera looks at the center of the semicircle (where the rod is)
    camera.lookAt(0, 0, 0);
    
    // Render the scene
    renderer.render(scene, camera);
}

// Initialize when page loads
window.addEventListener('load', () => {
    init();
}); 