<div align="center">

# ◆ shader.lab

**WebGL Image Filter Studio**

Real-time shader effects with PNG, GIF & MP4 export — zero dependencies, runs in your browser.

[![CI](https://github.com/hasanmorina/shader-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/hasanmorina/shader-lab/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-8b5cf6.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.1.0-8b5cf6)](https://github.com/hasanmorina/shader-lab/releases)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[**Live Demo**](https://shader-lab.vercel.app) · [**Report Bug**](https://github.com/hasanmorina/shader-lab/issues/new?template=bug_report.md) · [**Request Feature**](https://github.com/hasanmorina/shader-lab/issues/new?template=feature_request.md) · [**Submit Shader**](https://github.com/hasanmorina/shader-lab/issues/new?template=new_shader.md)

</div>

---

## ✨ Features

### 11 WebGL Shader Effects

| Animated | Style | Retro |
|----------|-------|-------|
| 🌊 Wobble | 🔵 Halftone CMYK | 🖥 ASCII Art |
| ⚡ Glitch | 📜 Paper Texture | 🎮 Dithering |
| 📼 VHS | 🔮 Fluted Glass | |
| | ✨ Bloom | |
| | 💠 Neon Glow | |
| | 🌈 Chromatic Aberration | |

### Export

- **PNG** — Single frame, full resolution
- **GIF** — Animated loop (2s, 20fps, built-in encoder)
- **MP4/WebM** — Video recording (2–15s, 30fps, 5Mbps)

### Tools

- **Before/After Slider** — Drag to compare original vs effect
- **Social Media Templates** — IG Post, Story, TikTok, Twitter, YouTube, FB Cover, LinkedIn
- **Preset System** — 10 built-in presets + save your own
- **Real-time Controls** — Adjust all parameters with instant feedback

### Zero Dependencies

The core engine uses raw WebGL, a custom GIF encoder, and the native MediaRecorder API. No Three.js, no canvas libraries, no bloat.

---

## 🚀 Quick Start

```bash
git clone https://github.com/hasanmorina/shader-lab.git
cd shader-lab
npm install
npm run dev
```

Opens at `http://localhost:3000` — upload an image and play.

---

## 📦 Deploy

### Vercel (recommended)

```bash
npm i -g vercel
vercel
```

### Netlify

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### GitHub Pages

Enabled automatically via GitHub Actions — push to `main` and it deploys.

> **Note:** For GitHub Pages subpath deployment, add `base: '/shader-lab/'` to `vite.config.js`

### Docker

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

```bash
docker build -t shader-lab .
docker run -p 8080:80 shader-lab
```

---

## 🎨 Add Your Own Shader

Adding a shader is simple — it's just GLSL + a config object. See the full guide in [CONTRIBUTING.md](CONTRIBUTING.md).

**Quick version:**

```javascript
// In src/ShaderLab.jsx → SHADERS object
myEffect: {
  label: "My Effect",
  desc: "What it does",
  cat: "style",              // "animate" | "style" | "retro"
  animated: false,
  fragment: `
    precision highp float;
    uniform sampler2D u_image;
    uniform vec2 u_resolution;
    uniform float u_intensity;
    varying vec2 v_texCoord;
    void main() {
      vec4 color = texture2D(u_image, v_texCoord);
      // Your magic here ✨
      gl_FragColor = color;
    }
  `,
  uniforms: {
    u_intensity: { label: "Intensity", min: 0, max: 1, step: 0.01, default: 0.5 },
  },
},
```

Then open a PR — we love new effects!

---

## 🗺 Roadmap

- [x] Core WebGL rendering pipeline
- [x] 11 shader effects
- [x] PNG / GIF / MP4 export
- [x] Before/After compare slider
- [x] Social media format templates
- [x] Preset system
- [ ] **Effect stacking** — chain multiple shaders
- [ ] **Pixel Sort** shader
- [ ] **Displacement Map** shader
- [ ] **Text overlay** with custom fonts
- [ ] **Watermark** support
- [ ] **Batch processing** — apply effects to multiple images
- [ ] **Undo/Redo** history
- [ ] **Mobile-optimized** UI
- [ ] **PWA** support (offline use)
- [ ] **Keyboard shortcuts**

See the [open issues](https://github.com/hasanmorina/shader-lab/issues) for community-requested features.

---

## 🏗 Project Structure

```
shader-lab/
├── .github/
│   ├── ISSUE_TEMPLATE/        # Bug, feature, shader templates
│   ├── workflows/
│   │   ├── ci.yml             # Build check on PRs
│   │   └── deploy.yml         # Auto-deploy to GitHub Pages
│   └── pull_request_template.md
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx               # React entry
│   └── ShaderLab.jsx          # Entire app (single-file architecture)
├── index.html
├── package.json
├── vite.config.js
├── LICENSE                    # MIT
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
└── README.md
```

---

## 🌐 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebGL Shaders | ✅ | ✅ | ✅ | ✅ |
| PNG Export | ✅ | ✅ | ✅ | ✅ |
| GIF Export | ✅ | ✅ | ✅ | ✅ |
| Video Export | ✅ WebM | ✅ WebM | ✅ MP4 | ✅ WebM |

---

## 🛠 Tech Stack

- **[Vite](https://vitejs.dev)** — Build tool
- **[React 18](https://react.dev)** — UI
- **WebGL** — GPU-accelerated rendering
- **MediaRecorder API** — Native video capture
- **Custom GIF Encoder** — Built-in LZW compression

---

## 🤝 Contributing

Contributions are what make the open source community amazing. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide — especially the section on adding new shaders!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/cool-shader`)
3. Commit your Changes (`git commit -m 'Add pixelsort shader'`)
4. Push to the Branch (`git push origin feature/cool-shader`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## 🙏 Acknowledgments

- GLSL shader techniques inspired by [The Book of Shaders](https://thebookofshaders.com)
- UI aesthetics inspired by [shaders.paper.design](https://shaders.paper.design)
- Built with [Vite](https://vitejs.dev) + [React](https://react.dev)

---

<div align="center">

Made with ◆ by [Hasan Morina](https://github.com/hasanmorina)

**⭐ Star this repo if you find it useful!**

</div>
