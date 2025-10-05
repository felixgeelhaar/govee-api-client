/**
 * Dynamic Light Scenes Example
 *
 * This example demonstrates how to use dynamic light scenes with the Govee API client.
 * Dynamic scenes include sunrise, sunset, rainbow, aurora, and more.
 *
 * Usage:
 *   export GOVEE_API_KEY=your-api-key
 *   npx ts-node examples/dynamic-scenes.ts <deviceId> <model>
 */

import { GoveeClient, LightScene } from '../src';

async function main() {
  // Get device ID and model from command line arguments
  const deviceId = process.argv[2];
  const model = process.argv[3];

  if (!deviceId || !model) {
    console.error('Usage: npx ts-node examples/dynamic-scenes.ts <deviceId> <model>');
    console.error('Example: npx ts-node examples/dynamic-scenes.ts AA:BB:CC:DD:EE:FF:GG:HH H6159');
    process.exit(1);
  }

  // Initialize the client (uses GOVEE_API_KEY environment variable)
  const client = new GoveeClient();

  console.log('=== Govee Dynamic Light Scenes Example ===\n');

  try {
    // 1. Get available dynamic scenes for the device
    console.log('1. Fetching available dynamic scenes...');
    const availableScenes = await client.getDynamicScenes(deviceId, model);

    console.log(`Found ${availableScenes.length} available scenes:`);
    availableScenes.forEach((scene, index) => {
      console.log(`  ${index + 1}. ${scene.name} (ID: ${scene.id}, ParamID: ${scene.paramId})`);
    });
    console.log();

    // 2. Try built-in factory methods
    console.log('2. Applying built-in scenes...\n');

    // Sunrise scene
    console.log('Setting Sunrise scene...');
    await client.setLightScene(deviceId, model, LightScene.sunrise());
    console.log('✓ Sunrise scene applied');
    await sleep(5000);

    // Sunset scene
    console.log('Setting Sunset scene...');
    await client.setLightScene(deviceId, model, LightScene.sunset());
    console.log('✓ Sunset scene applied');
    await sleep(5000);

    // Rainbow scene
    console.log('Setting Rainbow scene...');
    await client.setLightScene(deviceId, model, LightScene.rainbow());
    console.log('✓ Rainbow scene applied');
    await sleep(5000);

    // Aurora scene
    console.log('Setting Aurora scene...');
    await client.setLightScene(deviceId, model, LightScene.aurora());
    console.log('✓ Aurora scene applied');
    await sleep(5000);

    // Candlelight scene
    console.log('Setting Candlelight scene...');
    await client.setLightScene(deviceId, model, LightScene.candlelight());
    console.log('✓ Candlelight scene applied');
    await sleep(5000);

    // 3. Cycle through all available device scenes
    console.log('\n3. Cycling through all available device scenes...\n');
    for (const scene of availableScenes.slice(0, 3)) { // First 3 scenes only
      console.log(`Setting ${scene.name}...`);
      await client.setLightScene(deviceId, model, scene);
      console.log(`✓ ${scene.name} applied`);
      await sleep(5000);
    }

    console.log('\n✅ Dynamic scenes example completed successfully!');
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
