# Rainer's 3D Portfolio Website

A modern, interactive portfolio website built with Three.js featuring 3D rotating project cards, custom metaballs demo, and smooth physics-based navigation.

## 🌟 Features

- **3D Interactive Interface**: Six project cards arranged in a semicircle that rotate around an invisible X-axis rod
- **Scroll Physics**: Advanced scroll-based physics system with magnetic snapping and threshold-based navigation
- **Custom 3D Models**: Uses custom GLB models (`card.glb`, `text_box.glb`) for enhanced visual appeal
- **\*\*Note\*\*** These are temporary place models that I am using as placeholders. I plan on replcaing them with actual project info.
- **Smooth Navigation**: Navigate between projects using mouse wheel or navigation arrows
- **Responsive Design**: Fully responsive layout that works across different screen sizes
- **Modern Typography**: Uses the elegant Satoshi font family for clean, professional text

## Navigation

### Mouse Controls
- **Scroll Wheel**: Navigate between projects with physics-based momentum
- **Magnetic Snapping**: Projects automatically snap to center when stopping
- **Threshold System**: Build up scroll force to break magnetic hold and skip between projects

### Arrow Controls
- **Up Arrow (▲)**: Navigate to previous project
- **Down Arrow (▼)**: Navigate to next project
- **Auto-hiding**: Arrows automatically hide when reaching first/last project

## 📁 Project Structure

```
Rainers_3js_website/
├── index.html              # Main portfolio page
├── script.js               # Main Three.js application logic (771 lines)
├── style.css               # Modern CSS styling with glassmorphism effects
├── 3d_models/             
│   ├── card.glb            # Custom 3D card model
│   └── text_box.glb        # Custom 3D text container model
└── Satoshi_Complete/       # Complete Satoshi font family
    └── Fonts/
        └── WEB/            # Web-optimized font files
```

## Technology Stack

- **Three.js r128**: 3D graphics and rendering engine
- **GLTF Loader**: For loading custom 3D models
- **Vanilla JavaScript**: Pure JavaScript without external frameworks
- **HTML5 Canvas**: Hardware-accelerated rendering
- **CSS3**: Modern styling with gradients, backdrop filters, and animations
- **Satoshi Font**: Premium typography for enhanced visual appeal

## Visual Features

### Lighting System
- **Multi-layered Lighting**: Ambient, directional, and accent lighting
- **Shadow Mapping**: Soft shadows with PCF (Percentage Closer Filtering)
- **Physically Correct Lighting**: Realistic light behavior and material interactions

### Material System
- **PBR Materials**: Physically Based Rendering for realistic surfaces
- **Color Palette**: Curated color scheme with vibrant gradients
- **Transparency Effects**: Semi-transparent materials with proper depth sorting

### Post-Processing
- **Fog Effects**: Atmospheric depth with distance-based fog
- **Tone Mapping**: ACES Filmic tone mapping for cinematic look
- **Anti-aliasing**: MSAA for smooth edges and professional quality

## Getting Started

### Prerequisites
- Modern web browser with WebGL support
- Local web server (for proper GLTF model loading)

### Running the Project

1. **Clone or download** the project files
2. **Start a local server** in the project directory:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
3. **Open your browser** and navigate to `http://localhost:8000/index.html`

## 📱 Browser Support

- **Chrome/Chromium**: Full support
- **Firefox**: Full support  
- **Safari**: Full support (macOS/iOS)
- **Edge**: Full support

*Requires WebGL 1.0 support (available in all modern browsers)*

## Customization

### Adding New Projects
1. Update the `projectData` array in `script.js` (around line 481)
2. Add corresponding colors to the `colors` array
3. Projects automatically position themselves in the 3D space

### Modifying Physics
- **Scroll sensitivity**: Adjust `accumulatedScrollForce` multipliers
- **Magnetic strength**: Modify magnetic force calculation (line ~710)
- **Snap threshold**: Change `breakThreshold` value (line ~626)

### Visual Customization
- **Colors**: Update the gradient colors in `style.css`
- **Lighting**: Modify light setup in the `addLights()` function
- **Camera**: Adjust camera position and field of view in `init()`

## Design Philosophy

This portfolio emphasizes:
- **Smooth User Experience**: Fluid animations and responsive interactions
- **Modern Aesthetics**: Clean design with subtle 3D effects
- **Performance**: Optimized rendering at 60fps
- **Accessibility**: Clear navigation and readable typography
- **Professional Presentation**: Showcase technical skills through implementation

## License

This project uses the Satoshi font family under the Font Face License (FFL). See `Satoshi_Complete/License/FFL.txt` for details.

## Contributing

Feel free to fork this project and adapt it for your own portfolio. The codebase is well-documented and modular for easy customization.

---
