/**
 * Complete Lighting Sequence Example
 *
 * This example demonstrates a complete lighting sequence combining multiple features:
 * - Basic power and color control
 * - Dynamic scenes
 * - RGB IC segment control
 * - Music-reactive mode
 * - Toggle controls
 *
 * Usage:
 *   export GOVEE_API_KEY=your-api-key
 *   npx ts-node examples/complete-lighting-sequence.ts <deviceId> <model>
 */

import {
  GoveeClient,
  LightScene,
  SegmentColor,
  MusicMode,
  ColorRgb,
  ColorTemperature,
  Brightness,
} from '../src';

async function main() {
  // Get device ID and model from command line arguments
  const deviceId = process.argv[2];
  const model = process.argv[3];

  if (!deviceId || !model) {
    console.error('Usage: npx ts-node examples/complete-lighting-sequence.ts <deviceId> <model>');
    console.error('Example: npx ts-node examples/complete-lighting-sequence.ts AA:BB:CC:DD:EE:FF:GG:HH H6159');
    process.exit(1);
  }

  // Initialize the client (uses GOVEE_API_KEY environment variable)
  const client = new GoveeClient();

  console.log('=== Complete Govee Lighting Sequence ===');
  console.log(`Device: ${deviceId}`);
  console.log(`Model: ${model}`);
  console.log('\nThis sequence will run for approximately 2 minutes\n');

  try {
    // Sequence 1: Wake up with warm white
    console.log('[1/10] Starting with warm white (50% brightness)...');
    await client.turnOnWithColorTemperature(
      deviceId,
      model,
      ColorTemperature.warmWhite(),
      new Brightness(50)
    );
    console.log('✓ Warm white applied\n');
    await sleep(5000);

    // Sequence 2: Sunrise scene
    console.log('[2/10] Transitioning to Sunrise scene...');
    await client.setLightScene(deviceId, model, LightScene.sunrise());
    console.log('✓ Sunrise scene applied\n');
    await sleep(8000);

    // Sequence 3: Rainbow segment effect
    console.log('[3/10] Creating rainbow segment effect...');
    const rainbow = [
      new SegmentColor(0, new ColorRgb(255, 0, 0)),     // Red
      new SegmentColor(1, new ColorRgb(255, 127, 0)),   // Orange
      new SegmentColor(2, new ColorRgb(255, 255, 0)),   // Yellow
      new SegmentColor(3, new ColorRgb(0, 255, 0)),     // Green
      new SegmentColor(4, new ColorRgb(0, 0, 255)),     // Blue
      new SegmentColor(5, new ColorRgb(75, 0, 130)),    // Indigo
      new SegmentColor(6, new ColorRgb(148, 0, 211)),   // Violet
    ];
    await client.setSegmentColors(deviceId, model, rainbow);
    console.log('✓ Rainbow segments applied\n');
    await sleep(8000);

    // Sequence 4: Gradient brightness fade
    console.log('[4/10] Creating gradient brightness effect...');
    await client.setSegmentBrightness(deviceId, model, [
      { index: 0, brightness: new Brightness(100) },
      { index: 1, brightness: new Brightness(85) },
      { index: 2, brightness: new Brightness(70) },
      { index: 3, brightness: new Brightness(55) },
      { index: 4, brightness: new Brightness(40) },
      { index: 5, brightness: new Brightness(25) },
      { index: 6, brightness: new Brightness(10) },
    ]);
    console.log('✓ Gradient brightness applied\n');
    await sleep(5000);

    // Sequence 5: Rainbow dynamic scene
    console.log('[5/10] Switching to Rainbow scene...');
    await client.setLightScene(deviceId, model, LightScene.rainbow());
    console.log('✓ Rainbow scene applied\n');
    await sleep(8000);

    // Sequence 6: Music reactive mode
    console.log('[6/10] Enabling music-reactive mode (75% sensitivity)...');
    console.log('   Play some music to see the effect!');
    await client.setMusicMode(deviceId, model, new MusicMode(1, 75));
    console.log('✓ Music mode enabled\n');
    await sleep(15000); // Give time to enjoy music reactivity

    // Sequence 7: Aurora scene
    console.log('[7/10] Transitioning to Aurora scene...');
    await client.setLightScene(deviceId, model, LightScene.aurora());
    console.log('✓ Aurora scene applied\n');
    await sleep(8000);

    // Sequence 8: Enable nightlight mode
    console.log('[8/10] Enabling nightlight mode...');
    await client.setNightlightToggle(deviceId, model, true);
    console.log('✓ Nightlight enabled\n');
    await sleep(5000);

    // Sequence 9: Sunset scene
    console.log('[9/10] Winding down with Sunset scene...');
    await client.setLightScene(deviceId, model, LightScene.sunset());
    console.log('✓ Sunset scene applied\n');
    await sleep(8000);

    // Sequence 10: Fade to off
    console.log('[10/10] Fading to off...');
    for (let brightness = 100; brightness >= 0; brightness -= 10) {
      await client.setBrightness(deviceId, model, new Brightness(brightness));
      await sleep(500);
    }
    await client.turnOff(deviceId, model);
    console.log('✓ Lights off\n');

    console.log('✅ Complete lighting sequence finished successfully!');
    console.log('\nSequence Summary:');
    console.log('  1. Warm white wake-up');
    console.log('  2. Sunrise scene');
    console.log('  3. Rainbow segments');
    console.log('  4. Gradient brightness');
    console.log('  5. Rainbow scene');
    console.log('  6. Music-reactive mode');
    console.log('  7. Aurora scene');
    console.log('  8. Nightlight mode');
    console.log('  9. Sunset scene');
    console.log(' 10. Fade to off');
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error:', error);
    }
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the example
main();
