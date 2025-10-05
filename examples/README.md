# Govee API Client - Examples

This directory contains practical examples demonstrating how to use the advanced light control features of the Govee API Client.

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set your API key:**
   ```bash
   export GOVEE_API_KEY=your-govee-api-key
   ```

3. **Find your device ID and model:**
   ```typescript
   // Quick script to list your devices
   import { GoveeClient } from '@felixgeelhaar/govee-api-client';
   const client = new GoveeClient();
   const devices = await client.getDevices();
   devices.forEach(d => console.log(`${d.deviceName}: ${d.deviceId} (${d.model})`));
   ```

## Examples

### 1. Dynamic Light Scenes (`dynamic-scenes.ts`)

Demonstrates how to use dynamic light scenes including sunrise, sunset, rainbow, aurora, and more.

**Features:**
- Fetching available scenes from device
- Using built-in factory methods
- Cycling through multiple scenes
- Custom scene creation

**Usage:**
```bash
npx ts-node examples/dynamic-scenes.ts <deviceId> <model>
```

**Example:**
```bash
npx ts-node examples/dynamic-scenes.ts AA:BB:CC:DD:EE:FF:GG:HH H6159
```

### 2. RGB IC Segment Control (`segment-control.ts`)

Shows how to control individual LED segments on RGB IC devices.

**Features:**
- Rainbow effects across segments
- Chase animations
- Gradient brightness
- Fade effects
- Wave patterns
- Alternating colors

**Usage:**
```bash
npx ts-node examples/segment-control.ts <deviceId> <model> [segmentCount]
```

**Example:**
```bash
npx ts-node examples/segment-control.ts AA:BB:CC:DD:EE:FF:GG:HH H6159 10
```

### 3. Music-Reactive Mode (`music-mode.ts`)

Demonstrates music-reactive lighting with adjustable sensitivity.

**Features:**
- High, medium, and low sensitivity modes
- Sensitivity ramping
- Multiple mode support
- Optimal settings demonstration

**Usage:**
```bash
npx ts-node examples/music-mode.ts <deviceId> <model>
```

**Example:**
```bash
npx ts-node examples/music-mode.ts AA:BB:CC:DD:EE:FF:GG:HH H6159
```

### 4. Complete Lighting Sequence (`complete-lighting-sequence.ts`)

A comprehensive example combining multiple features into a complete lighting experience.

**Features:**
- Warm white wake-up
- Multiple dynamic scenes
- Segment control effects
- Music-reactive mode
- Nightlight mode
- Smooth transitions and fade-out

**Usage:**
```bash
npx ts-node examples/complete-lighting-sequence.ts <deviceId> <model>
```

**Example:**
```bash
npx ts-node examples/complete-lighting-sequence.ts AA:BB:CC:DD:EE:FF:GG:HH H6159
```

**Note:** This sequence runs for approximately 2 minutes and showcases the full range of capabilities.

## Tips

### Finding Your Device Information

Run this quick script to list all your devices:

```typescript
import { GoveeClient } from '@felixgeelhaar/govee-api-client';

const client = new GoveeClient();
const devices = await client.getDevices();

console.log('Your Govee Devices:\n');
devices.forEach(device => {
  console.log(`Name: ${device.deviceName}`);
  console.log(`  Device ID: ${device.deviceId}`);
  console.log(`  Model: ${device.model}`);
  console.log(`  Controllable: ${device.controllable}`);
  console.log(`  Supported: ${device.supportedCmds.join(', ')}`);
  console.log('');
});
```

### Segment Count

Different RGB IC devices have different numbers of segments. Common values:
- H6199: 15 segments
- H619A: 15 segments
- H619B: 30 segments
- H619C: 60 segments
- H619E: 100+ segments

Check your device's specifications or start with 10 and adjust based on results.

### Music Mode Sensitivity

Optimal sensitivity settings vary by environment:
- **Quiet room (library, bedroom):** 75-90%
- **Normal room (living room):** 50-75%
- **Loud environment (party, club):** 25-50%

### Rate Limiting

The Govee API has a rate limit of 100 requests per minute. The client automatically handles this, but:
- Avoid tight loops without delays
- Use `await sleep(ms)` between rapid requests
- The client's built-in rate limiter will queue requests if needed

## Troubleshooting

### "Device not found" or "Invalid device"
- Verify your device ID is correct (run the device listing script above)
- Ensure your API key is valid
- Check that the device is online in the Govee Home app

### "Command not supported"
- Not all devices support all features
- Check `device.supportedCmds` to see what your device supports
- RGB IC features require devices that support segment control

### "Rate limit exceeded"
- The client automatically handles rate limiting
- If you see this error, you may have another application using the API
- Wait 60 seconds and try again

## Additional Resources

- [Full API Documentation](../README.md)
- [Type Definitions](../docs/TYPE_DEFINITIONS.md)
- [LLM API Reference](../docs/LLM_API_REFERENCE.md)
- [Examples Documentation](../docs/EXAMPLES.md)

## Contributing

Have a great example to share? Feel free to submit a pull request!

1. Create your example in this directory
2. Add documentation to this README
3. Include error handling and comments
4. Test with real devices when possible

## License

MIT - See the main project LICENSE file for details.
