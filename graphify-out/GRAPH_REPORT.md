# Graph Report - .  (2026-06-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 257 nodes · 336 edges · 27 communities (21 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0fcf338d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `drawAsciiGrid()` - 13 edges
2. `clamp()` - 12 edges
3. `◆ shader.lab` - 12 edges
4. `Architecture Notes` - 10 edges
5. `Project Context` - 10 edges
6. `Architecture Notes` - 10 edges
7. `Project Context` - 10 edges
8. `getSourceDimensions()` - 9 edges
9. `createSizedCanvas()` - 9 edges
10. `buildCellGrid()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `getFormatSize()` --calls--> `getSourceDimensions()`  [EXTRACTED]
  src/lib/asciiRenderer.js → src/lib/imageUtils.js
- `buildGlyphAtlas()` --calls--> `createSizedCanvas()`  [EXTRACTED]
  src/lib/asciiRenderer.js → src/lib/imageUtils.js
- `ensureOriginalCanvas()` --calls--> `drawImageCover()`  [EXTRACTED]
  src/lib/asciiRenderer.js → src/lib/imageUtils.js
- `createSampleCanvas()` --calls--> `createSizedCanvas()`  [EXTRACTED]
  src/lib/asciiRenderer.js → src/lib/imageUtils.js
- `drawAsciiGrid()` --calls--> `createSizedCanvas()`  [EXTRACTED]
  src/lib/asciiRenderer.js → src/lib/imageUtils.js

## Import Cycles
- None detected.

## Communities (27 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (17): ASCII_CHARSET_OPTIONS, ASCII_COLOR_MODES, ASCII_DIRECTION_OPTIONS, ASCII_FONT_OPTIONS, ASCII_MOTION_MODE_OPTIONS, ASCII_QUALITY_OPTIONS, DEFAULT_ASCII_CONFIG, ensureAsciiFontsLoaded() (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (22): ASCII_DITHER_OPTIONS, ASCII_FX_PRESETS, ASCII_PRESETS, ASCII_STYLE_OPTIONS, atlasCache, BAYER_8, BRAILLE_CHARS, buildGlyphAtlas() (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (20): 11 WebGL Shader Effects, 🙏 Acknowledgments, 🎨 Add Your Own Shader, 🌐 Browser Support, 🤝 Contributing, 📦 Deploy, Docker, Export (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (17): dependencies, react, react-dom, description, devDependencies, @types/react, @types/react-dom, vite (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (5): CATEGORIES, FORMATS, GIFEncoder, PRESETS, SHADERS

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (14): Adding a New Shader Effect, Architecture, Code Style, Contributing to shader.lab, Development Notes, Getting Started, GLSL Tips, How to Contribute (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.34
Nodes (13): createSizedCanvas(), createThumbnailFromSource(), downscaleImage(), drawImageCover(), getSourceDimensions(), loadImageFromSrc(), captureCanvasPoster(), createCameraSource() (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (10): API oder Backend Bereiche, Architecture Notes, Auth falls vorhanden, Build System, Datenmodelle, Routing Struktur, State Management, Testing Setup (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (10): Erkannter Tech Stack, Offene Fragen, Project Context, Projektname, Projektpfad, Vermutlicher Zweck des Projekts, Wichtige App Bereiche, Wichtige Einstiegspunkte (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (10): API oder Backend Bereiche, Architecture Notes, Auth falls vorhanden, Build System, Datenmodelle, Routing Struktur, State Management, Testing Setup (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (10): Erkannter Tech Stack, Offene Fragen, Project Context, Projektname, Projektpfad, Vermutlicher Zweck des Projekts, Wichtige App Bereiche, Wichtige Einstiegspunkte (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.31
Nodes (10): applyFxToBrightness(), buildCellGrid(), clamp(), getDirectionVector(), luminance(), mod(), resolveDirectionalMotionField(), resolvePointerMotionField() (+2 more)

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (6): Besonders beachten, Fuer Codex spaeter besonders wichtig, Graphify Scope, Ignorieren, Sensible Dateien, nicht lesen, Wichtige Dateien

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (6): Besonders beachten, Fuer Codex spaeter besonders wichtig, Graphify Scope, Ignorieren, Sensible Dateien, nicht lesen, Wichtige Dateien

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (6): Additional Context, Describe the Bug, Environment, Expected Behavior, Screenshots / Screen Recording, Steps to Reproduce

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (6): Category, Description, GLSL Code (if available), Parameters, Shader Name, Visual Reference

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (5): Attribution, Contributor Covenant Code of Conduct, Enforcement, Our Pledge, Our Standards

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (5): Alternatives Considered, Description, Proposed Solution, References, Use Case

### Community 19 - "Community 19"
Cohesion: 0.40
Nodes (4): Checklist, Screenshots / Demo, Type of Change, What does this PR do?

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (4): hexToRgb(), lerp(), mixRgb(), resolveCellColors()

## Knowledge Gaps
- **128 isolated node(s):** `name`, `version`, `private`, `type`, `description` (+123 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `name`, `version`, `private` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08547008547008547 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._