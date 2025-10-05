/**
 * RGB IC Segment Control Example
 *
 * This example demonstrates how to control individual LED segments on RGB IC devices.
 * Includes rainbow effects, chase animations, and gradient brightness.
 *
 * Usage:
 *   export GOVEE_API_KEY=your-api-key
 *   npx ts-node examples/segment-control.ts <deviceId> <model> [segmentCount]
 */

import { GoveeClient, SegmentColor, ColorRgb, Brightness } from '../src';

async function main() {
  // Get device ID, model, and segment count from command line arguments
  const deviceId = process.argv[2];
  const model = process.argv[3];
  const segmentCount = parseInt(process.argv[4] || '10', 10);

  if (!deviceId || !model) {
    console.error('Usage: npx ts-node examples/segment-control.ts <deviceId> <model> [segmentCount]');
    console.error('Example: npx ts-node examples/segment-control.ts AA:BB:CC:DD:EE:FF:GG:HH H6159 10');
    process.exit(1);
  }

  // Initialize the client (uses GOVEE_API_KEY environment variable)
  const client = new GoveeClient();

  console.log('=== Govee RGB IC Segment Control Example ===');
  console.log(`Device: ${deviceId}`);
  console.log(`Model: ${model}`);
  console.log(`Segments: ${segmentCount}\n`);

  try {
    // 1. Rainbow Effect
    console.log('1. Creating rainbow effect across segments...');
    const rainbowSegments = createRainbowSegments(segmentCount);
    await client.setSegmentColors(deviceId, model, rainbowSegments);
    console.log('✓ Rainbow effect applied');
    await sleep(5000);

    // 2. Gradient Brightness Effect
    console.log('\n2. Creating gradient brightness effect...');
    const gradientBrightness = Array.from({ length: segmentCount }, (_, i) => ({
      index: i,
      brightness: new Brightness(100 - (i * (80 / segmentCount))),
    }));
    await client.setSegmentBrightness(deviceId, model, gradientBrightness);
    console.log('✓ Gradient brightness applied');
    await sleep(5000);

    // 3. Chase Effect (Red chaser)
    console.log('\n3. Creating chase effect (press Ctrl+C to stop)...');
    await chaseEffect(client, deviceId, model, segmentCount, 20); // 20 cycles

    // 4. Fade Effect
    console.log('\n4. Creating fade effect...');
    await fadeEffect(client, deviceId, model, segmentCount);

    // 5. Alternating Colors
    console.log('\n5. Creating alternating color pattern...');
    const alternatingSegments = Array.from({ length: segmentCount }, (_, i) => {
      const color = i % 2 === 0
        ? new ColorRgb(255, 0, 0) // Red
        : new ColorRgb(0, 0, 255); // Blue
      return new SegmentColor(i, color);
    });
    await client.setSegmentColors(deviceId, model, alternatingSegments);
    console.log('✓ Alternating color pattern applied');
    await sleep(5000);

    // 6. Wave Effect
    console.log('\n6. Creating wave effect...');
    await waveEffect(client, deviceId, model, segmentCount, 30); // 30 steps

    console.log('\n✅ Segment control example completed successfully!');
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error:', error);
    }
    process.exit(1);
  }
}

/**
 * Create rainbow color segments
 */
function createRainbowSegments(count: number): SegmentColor[] {
  const segments: SegmentColor[] = [];

  for (let i = 0; i < count; i++) {
    // Calculate hue (0-360 degrees)
    const hue = (i / count) * 360;
    const rgb = hslToRgb(hue, 100, 50);
    segments.push(new SegmentColor(i, new ColorRgb(rgb.r, rgb.g, rgb.b)));
  }

  return segments;
}

/**
 * Create a chase effect
 */
async function chaseEffect(
  client: GoveeClient,
  deviceId: string,
  model: string,
  segmentCount: number,
  cycles: number
): Promise<void> {
  const red = new ColorRgb(255, 0, 0);
  const black = new ColorRgb(0, 0, 0);

  for (let cycle = 0; cycle < cycles; cycle++) {
    for (let pos = 0; pos < segmentCount; pos++) {
      const segments = Array.from({ length: segmentCount }, (_, i) => {
        const isLit = i === pos;
        return new SegmentColor(i, isLit ? red : black);
      });

      await client.setSegmentColors(deviceId, model, segments);
      await sleep(100);
    }
  }

  console.log(`✓ Chase effect completed (${cycles} cycles)`);
}

/**
 * Create a fade effect
 */
async function fadeEffect(
  client: GoveeClient,
  deviceId: string,
  model: string,
  segmentCount: number
): Promise<void> {
  // Fade in
  for (let brightness = 0; brightness <= 100; brightness += 10) {
    const segments = Array.from({ length: segmentCount }, (_, i) => ({
      index: i,
      brightness: new Brightness(brightness),
    }));
    await client.setSegmentBrightness(deviceId, model, segments);
    await sleep(200);
  }

  // Fade out
  for (let brightness = 100; brightness >= 0; brightness -= 10) {
    const segments = Array.from({ length: segmentCount }, (_, i) => ({
      index: i,
      brightness: new Brightness(brightness),
    }));
    await client.setSegmentBrightness(deviceId, model, segments);
    await sleep(200);
  }

  console.log('✓ Fade effect completed');
}

/**
 * Create a wave effect
 */
async function waveEffect(
  client: GoveeClient,
  deviceId: string,
  model: string,
  segmentCount: number,
  steps: number
): Promise<void> {
  for (let step = 0; step < steps; step++) {
    const segments = Array.from({ length: segmentCount }, (_, i) => {
      // Calculate brightness based on sine wave
      const angle = ((i + step) / segmentCount) * Math.PI * 2;
      const brightness = Math.round(50 + Math.sin(angle) * 50);
      return {
        index: i,
        brightness: new Brightness(brightness),
      };
    });

    await client.setSegmentBrightness(deviceId, model, segments);
    await sleep(100);
  }

  console.log('✓ Wave effect completed');
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the example
main();
