/**
 * Music Mode Example
 *
 * This example demonstrates how to configure music-reactive lighting modes.
 * Music mode makes lights react to ambient sound/music with adjustable sensitivity.
 *
 * Usage:
 *   export GOVEE_API_KEY=your-api-key
 *   npx ts-node examples/music-mode.ts <deviceId> <model>
 */

import { GoveeClient, MusicMode } from '../src';

async function main() {
  // Get device ID and model from command line arguments
  const deviceId = process.argv[2];
  const model = process.argv[3];

  if (!deviceId || !model) {
    console.error('Usage: npx ts-node examples/music-mode.ts <deviceId> <model>');
    console.error('Example: npx ts-node examples/music-mode.ts AA:BB:CC:DD:EE:FF:GG:HH H6159');
    process.exit(1);
  }

  // Initialize the client (uses GOVEE_API_KEY environment variable)
  const client = new GoveeClient();

  console.log('=== Govee Music Mode Example ===');
  console.log(`Device: ${deviceId}`);
  console.log(`Model: ${model}\n`);

  try {
    // 1. Enable music mode with high sensitivity
    console.log('1. Enabling music mode with high sensitivity (90%)...');
    const highSensitivity = new MusicMode(1, 90);
    await client.setMusicMode(deviceId, model, highSensitivity);
    console.log('✓ Music mode enabled at 90% sensitivity');
    console.log('   - Play some music to see the lights react!\n');
    await sleep(10000); // Wait 10 seconds to see the effect

    // 2. Medium sensitivity
    console.log('2. Changing to medium sensitivity (50%)...');
    const mediumSensitivity = new MusicMode(1, 50);
    await client.setMusicMode(deviceId, model, mediumSensitivity);
    console.log('✓ Sensitivity changed to 50%');
    console.log('   - The lights should react less intensely now\n');
    await sleep(10000);

    // 3. Low sensitivity
    console.log('3. Changing to low sensitivity (25%)...');
    const lowSensitivity = new MusicMode(1, 25);
    await client.setMusicMode(deviceId, model, lowSensitivity);
    console.log('✓ Sensitivity changed to 25%');
    console.log('   - Only louder sounds should trigger reactions\n');
    await sleep(10000);

    // 4. Try different mode (if supported)
    console.log('4. Trying music mode 2 with default sensitivity...');
    const mode2 = new MusicMode(2);
    await client.setMusicMode(deviceId, model, mode2);
    console.log('✓ Music mode 2 enabled with device default sensitivity\n');
    await sleep(10000);

    // 5. Sensitivity ramp demonstration
    console.log('5. Demonstrating sensitivity ramp (10% -> 100%)...');
    for (let sensitivity = 10; sensitivity <= 100; sensitivity += 10) {
      console.log(`   Setting sensitivity to ${sensitivity}%...`);
      await client.setMusicMode(deviceId, model, new MusicMode(1, sensitivity));
      await sleep(3000); // 3 seconds per level
    }
    console.log('✓ Sensitivity ramp completed\n');

    // 6. Return to optimal sensitivity
    console.log('6. Setting optimal sensitivity (75%)...');
    const optimal = new MusicMode(1, 75);
    await client.setMusicMode(deviceId, model, optimal);
    console.log('✓ Music mode set to 75% sensitivity');
    console.log('   - This is often a good balance for most music\n');

    console.log('✅ Music mode example completed successfully!');
    console.log('\nTips:');
    console.log('  - Different devices may support different mode IDs');
    console.log('  - Sensitivity 50-75% works well for most scenarios');
    console.log('  - Higher sensitivity = more reactive to quiet sounds');
    console.log('  - Lower sensitivity = only reacts to loud sounds');
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
