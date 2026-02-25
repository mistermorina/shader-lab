# Contributing to shader.lab

Thanks for your interest in contributing! Whether it's a bug fix, new shader effect, or documentation improvement — every contribution is welcome.

## Getting Started

```bash
# Fork & clone the repo
git clone https://github.com/YOUR_USERNAME/shader-lab.git
cd shader-lab

# Install dependencies
npm install

# Start dev server
npm run dev
```

## How to Contribute

### Reporting Bugs

Open an [issue](https://github.com/hasanmorina/shader-lab/issues/new?template=bug_report.md) with:
- Browser & OS version
- Steps to reproduce
- Expected vs actual behavior
- Screenshot or screen recording if possible

### Suggesting Features

Open an [issue](https://github.com/hasanmorina/shader-lab/issues/new?template=feature_request.md) describing:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you considered

### Adding a New Shader Effect

This is the most common contribution! Here's how:

1. **Open `src/ShaderLab.jsx`**
2. **Add your shader to the `SHADERS` object:**

```javascript
myShader: {
  label: "My Shader",           // Display name
  desc: "Short description",     // Shown under label
  cat: "style",                  // "animate" | "style" | "retro"
  animated: false,                // true if uses u_time
  fragment: `
    precision highp float;
    uniform sampler2D u_image;
    uniform vec2 u_resolution;
    uniform float u_time;         // Only for animated
    uniform float u_myParam;
    varying vec2 v_texCoord;

    void main() {
      vec2 uv = v_texCoord;
      vec4 color = texture2D(u_image, uv);
      // Your effect logic here
      gl_FragColor = vec4(color.rgb, 1.0);
    }
  `,
  uniforms: {
    u_myParam: {
      label: "My Parameter",     // Slider label
      min: 0,                     // Minimum value
      max: 1,                     // Maximum value
      step: 0.01,                 // Slider step
      default: 0.5,               // Default value
      // labels: ["Off", "On"],   // Optional: discrete labels
    },
  },
},
```

3. **Test your shader** with various images and parameter ranges
4. **Optionally add a preset** to the `PRESETS` array:

```javascript
{ name: "Cool Effect", shader: "myShader", icon: "🎨", params: { u_myParam: 0.8 } },
```

### GLSL Tips

- Use `${GLSL_UTILS}` in your fragment shader to get `rand()` and `noise()` functions
- Available uniforms: `u_image`, `u_resolution`, `u_time` (animated only)
- Always clamp UV coordinates: `clamp(uv, 0.0, 1.0)`
- Test edge cases: very small images, very large images, different aspect ratios

### Code Style

- No external dependencies for core functionality
- Keep everything in `ShaderLab.jsx` (single-file architecture)
- Use inline styles (no CSS modules/Tailwind)
- Follow existing naming patterns

## Pull Request Process

1. Fork the repo and create a branch: `git checkout -b feature/my-shader`
2. Make your changes
3. Test locally with `npm run dev`
4. Verify the production build: `npm run build && npm run preview`
5. Push and open a PR against `main`

### PR Checklist

- [ ] Shader compiles without errors in Chrome, Firefox, Safari
- [ ] Parameters have sensible defaults and ranges
- [ ] No console errors or warnings
- [ ] Export (PNG/GIF/MP4) works with the new effect
- [ ] Short description in PR explaining what the effect does

## Development Notes

### Architecture

The entire app is a single React component (`ShaderLab.jsx`) with:
- **WebGL rendering pipeline** — raw WebGL, no Three.js overhead
- **Built-in GIF encoder** — LZW compression, no dependencies
- **MediaRecorder API** — native browser video capture
- **State management** — React useState/useRef only

### Testing Checklist

When making changes, test:
- [ ] Image upload (drag & drop + file picker)
- [ ] All 11 shader effects render correctly
- [ ] Parameter sliders update in real-time
- [ ] Animated effects loop smoothly
- [ ] Compare slider works
- [ ] All format templates apply correctly
- [ ] PNG export
- [ ] GIF export (check file isn't corrupted)
- [ ] MP4/WebM recording
- [ ] Presets load correct shader + params

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
