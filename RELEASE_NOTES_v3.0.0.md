# Release Notes - v3.0.0

## 🚀 Major Feature Release: Advanced Light Control

We're excited to announce version 3.0.0 of the Govee API TypeScript Client! This major release adds comprehensive support for advanced light control features, bringing the full power of the Govee Developer API v2.0 to your TypeScript applications.

### ✨ What's New

#### 🎨 Dynamic Light Scenes

Control beautiful pre-programmed light scenes with ease:

```typescript
import { GoveeClient, LightScene } from '@felixgeelhaar/govee-api-client';

const client = new GoveeClient();

// Get available scenes
const scenes = await client.getDynamicScenes(deviceId, model);

// Use built-in factory methods
await client.setLightScene(deviceId, model, LightScene.sunrise());
await client.setLightScene(deviceId, model, LightScene.rainbow());
await client.setLightScene(deviceId, model, LightScene.aurora());
```

**8 built-in scene factory methods:**
- `LightScene.sunrise()` - Warm sunrise effect
- `LightScene.sunset()` - Relaxing sunset colors
- `LightScene.rainbow()` - Full spectrum rainbow
- `LightScene.aurora()` - Northern lights effect
- `LightScene.candlelight()` - Flickering candle simulation
- `LightScene.nightlight()` - Soft nightlight mode
- `LightScene.romantic()` - Romantic ambiance
- `LightScene.blinking()` - Dynamic blinking patterns

#### 🌈 RGB IC Segment Control

Take precise control of individual LED segments:

```typescript
import { SegmentColor, ColorRgb, Brightness } from '@felixgeelhaar/govee-api-client';

// Create rainbow effect
const rainbow = [
  new SegmentColor(0, new ColorRgb(255, 0, 0)),   // Red
  new SegmentColor(1, new ColorRgb(255, 127, 0)), // Orange
  new SegmentColor(2, new ColorRgb(255, 255, 0)), // Yellow
  new SegmentColor(3, new ColorRgb(0, 255, 0)),   // Green
  new SegmentColor(4, new ColorRgb(0, 0, 255)),   // Blue
];

await client.setSegmentColors(deviceId, model, rainbow);

// Control segment brightness independently
await client.setSegmentBrightness(deviceId, model, [
  { index: 0, brightness: new Brightness(100) },
  { index: 1, brightness: new Brightness(75) },
  { index: 2, brightness: new Brightness(50) },
]);
```

Perfect for creating:
- Chase animations
- Gradient effects
- Custom patterns
- Wave animations

#### 🎵 Music-Reactive Mode

Make your lights dance to the beat:

```typescript
import { MusicMode } from '@felixgeelhaar/govee-api-client';

// Enable music mode with custom sensitivity
await client.setMusicMode(deviceId, model, new MusicMode(1, 75)); // 75% sensitivity

// Use device default sensitivity
await client.setMusicMode(deviceId, model, new MusicMode(2));
```

**Features:**
- Adjustable sensitivity (0-100)
- Multiple mode support
- Real-time audio reactivity

#### 🔀 Toggle & Mode Controls

Enhanced device control:

```typescript
// Nightlight mode
await client.setNightlightToggle(deviceId, model, true);
await client.setNightlightScene(deviceId, model, 1);

// Gradient effects
await client.setGradientToggle(deviceId, model, true);

// Preset scenes
await client.setPresetScene(deviceId, model, 'cozy');
```

### 📦 What's Included

- ✅ **3 New Value Objects**: `LightScene`, `SegmentColor`, `MusicMode`
- ✅ **6 New Command Classes**: Full support for all advanced control types
- ✅ **9 New Client Methods**: Simple, intuitive API for all features
- ✅ **68 New Tests**: Comprehensive test coverage (548 total tests passing)
- ✅ **4 Example Scripts**: Ready-to-run demonstrations
- ✅ **Full Documentation**: Updated README, API reference, and examples

### 🏗️ Architecture Highlights

All new features follow the same enterprise-grade patterns:

- **Domain-Driven Design**: Clean separation of concerns
- **Test-Driven Development**: >94% coverage on value objects
- **Type Safety**: Full TypeScript support with strict typing
- **Error Handling**: Comprehensive error handling and validation
- **Rate Limiting**: Automatic rate limit compliance
- **Retry Logic**: Built-in retry support with circuit breakers

### 📚 Example Scripts

Try the new features with our ready-to-run examples:

```bash
# Dynamic scenes
npx ts-node examples/dynamic-scenes.ts <deviceId> <model>

# Segment control with effects
npx ts-node examples/segment-control.ts <deviceId> <model> [segmentCount]

# Music-reactive mode
npx ts-node examples/music-mode.ts <deviceId> <model>

# Complete lighting sequence
npx ts-node examples/complete-lighting-sequence.ts <deviceId> <model>
```

### 🔄 Migration Guide

**Good news!** This release is **100% backward compatible**. All existing code will continue to work without modifications.

To use the new features, simply:

1. **Update the package:**
   ```bash
   npm install @felixgeelhaar/govee-api-client@latest
   ```

2. **Import new types:**
   ```typescript
   import {
     GoveeClient,
     LightScene,
     SegmentColor,
     MusicMode,
   } from '@felixgeelhaar/govee-api-client';
   ```

3. **Start using the new features!** No breaking changes to worry about.

### 📊 Test Coverage

- **548 tests passing** ✅
- **78.79% overall coverage**
- **94.58% value object coverage**
- **22 test files**
- **0 failing tests**

### 🙏 Acknowledgments

This release was made possible by analyzing the Govee Developer API documentation and implementing support for all light-focused capabilities. Special thanks to all contributors and users who requested these features!

### 📖 Documentation

- [Full CHANGELOG](./CHANGELOG.md)
- [README with examples](./README.md)
- [Type Definitions](./docs/TYPE_DEFINITIONS.md)
- [LLM API Reference](./docs/LLM_API_REFERENCE.md)
- [Examples Documentation](./docs/EXAMPLES.md)
- [Example Scripts](./examples/README.md)

### 🐛 Known Issues

None at this time. If you encounter any issues, please [report them on GitHub](https://github.com/felixgeelhaar/govee-api-client/issues).

### 🔮 What's Next?

Future releases may include:
- Additional scene factory methods based on user requests
- Enhanced animation utilities
- Performance optimizations for high-frequency segment updates
- More example patterns and effects

### 💬 Feedback

We'd love to hear from you! If you're using the new features or have suggestions:
- [Open an issue](https://github.com/felixgeelhaar/govee-api-client/issues)
- [Start a discussion](https://github.com/felixgeelhaar/govee-api-client/discussions)
- Share your light creations with the community!

---

**Full Changelog**: [v2.1.1...v3.0.0](https://github.com/felixgeelhaar/govee-api-client/compare/v2.1.1...v3.0.0)

Enjoy creating amazing light shows! 🎨✨
