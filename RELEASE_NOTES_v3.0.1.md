# Release Notes - v3.0.1

## 🎨 Enhanced Scene Support & Documentation

Version 3.0.1 builds on the major v3.0.0 release by adding 4 more built-in LightScene factory methods and comprehensive project documentation.

### ✨ What's New

#### 🎭 4 Additional LightScene Factory Methods

Complete your lighting experience with 4 new pre-configured scenes:

```typescript
import { GoveeClient, LightScene } from '@felixgeelhaar/govee-api-client';

const client = new GoveeClient();

// New factory methods in v3.0.1
await client.setLightScene(deviceId, model, LightScene.candlelight());
await client.setLightScene(deviceId, model, LightScene.nightlight());
await client.setLightScene(deviceId, model, LightScene.romantic());
await client.setLightScene(deviceId, model, LightScene.blinking());
```

**All 18 built-in scene factory methods:**

- `LightScene.sunrise()` - Warm sunrise effect
- `LightScene.sunset()` - Relaxing sunset colors
- `LightScene.sunsetGlow()` - Sunset glow ambiance
- `LightScene.spring()` - Fresh spring atmosphere
- `LightScene.aurora()` - Northern lights effect
- `LightScene.rainbow()` - Full spectrum rainbow
- `LightScene.forest()` - Tranquil forest scene
- `LightScene.ocean()` - Ocean waves effect
- `LightScene.snowing()` - Gentle snowfall
- `LightScene.springWind()` - Spring breeze
- `LightScene.cloudy()` - Cloudy day atmosphere
- `LightScene.firefly()` - Firefly illumination
- `LightScene.fire()` - Flickering flames
- `LightScene.waterfall()` - Cascading water effect
- `LightScene.candlelight()` - Flickering candle simulation ⭐ **NEW**
- `LightScene.nightlight()` - Soft nightlight mode ⭐ **NEW**
- `LightScene.romantic()` - Romantic ambiance ⭐ **NEW**
- `LightScene.blinking()` - Dynamic blinking patterns ⭐ **NEW**

#### 📚 Comprehensive Documentation

**ROADMAP.md** - Product Roadmap

- **Short-term (1-3 months)**: Additional scene factory methods, animation utilities, performance optimizations
- **Medium-term (3-6 months)**: Device discovery, advanced scheduling, real-time monitoring
- **Long-term (6-12 months)**: Cloud integration, UI components, AI/ML features, ecosystem integrations

**CONTRIBUTING.md** - Contribution Guide

- Code of conduct and community standards
- Development workflow and setup
- Code standards and architecture guidelines
- Testing requirements and best practices
- Commit conventions and pull request process
- Areas for contribution

**README.md Updates**

- Links to ROADMAP.md for planned features
- Links to CONTRIBUTING.md for contribution guidelines

### 🔄 Migration from v3.0.0

**100% backward compatible!** No changes required to existing code. Just update your package:

```bash
npm install @felixgeelhaar/govee-api-client@latest
```

### 📊 Test Coverage

- **576 tests passing** ✅
- **73.02% overall coverage**
- **95.22% value object coverage**
- **23 test files**
- **0 failing tests**

### 🙏 Acknowledgments

Thank you to all users who requested additional scene support and documentation improvements!

### 📖 Documentation

- [Full CHANGELOG](./CHANGELOG.md)
- [README with examples](./README.md)
- [Product Roadmap](./ROADMAP.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Type Definitions](./docs/TYPE_DEFINITIONS.md)
- [LLM API Reference](./docs/LLM_API_REFERENCE.md)
- [Examples Documentation](./docs/EXAMPLES.md)
- [Example Scripts](./examples/README.md)

### 🐛 Known Issues

None at this time. If you encounter any issues, please [report them on GitHub](https://github.com/felixgeelhaar/govee-api-client/issues).

### 🔮 What's Next?

See our [Product Roadmap](./ROADMAP.md) for planned features and enhancements.

### 💬 Feedback

We'd love to hear from you!

- [Open an issue](https://github.com/felixgeelhaar/govee-api-client/issues)
- [Start a discussion](https://github.com/felixgeelhaar/govee-api-client/discussions)
- Share your light creations with the community!

---

**Full Changelog**: [v3.0.0...v3.0.1](https://github.com/felixgeelhaar/govee-api-client/compare/v3.0.0...v3.0.1)

Enjoy creating amazing light shows! 🎨✨
