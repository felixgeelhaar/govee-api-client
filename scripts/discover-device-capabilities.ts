#!/usr/bin/env npx ts-node
/**
 * Device Capability Discovery Script
 *
 * This script queries the Govee API to discover all capabilities
 * for a specific device, helping identify undocumented features
 * like sceneStage.
 *
 * Usage:
 *   GOVEE_API_KEY=your-api-key npx ts-node scripts/discover-device-capabilities.ts [deviceId] [model]
 *
 * If deviceId and model are not provided, it will list all devices
 * and their capabilities.
 */

import { GoveeClient } from '../src';

async function discoverCapabilities() {
  const apiKey = process.env.GOVEE_API_KEY;

  if (!apiKey) {
    console.error('Error: GOVEE_API_KEY environment variable is required');
    console.error('Usage: GOVEE_API_KEY=your-key npx ts-node scripts/discover-device-capabilities.ts');
    process.exit(1);
  }

  const client = new GoveeClient({ apiKey });

  const targetDeviceId = process.argv[2];
  const targetModel = process.argv[3];

  try {
    console.log('Fetching devices from Govee API...\n');
    const devices = await client.getDevices();

    console.log(`Found ${devices.length} device(s):\n`);
    console.log('='.repeat(80));

    for (const device of devices) {
      // If specific device requested, filter
      if (targetDeviceId && device.deviceId !== targetDeviceId) {
        continue;
      }

      console.log(`\nDevice: ${device.deviceName}`);
      console.log(`  ID: ${device.deviceId}`);
      console.log(`  Model (SKU): ${device.model}`);
      console.log(`  Controllable: ${device.canControl()}`);
      console.log(`  Retrievable: ${device.canRetrieve()}`);
      console.log(`  Supported Commands: ${device.supportedCmds.join(', ') || 'none'}`);

      // Get raw capabilities (access internal data)
      const rawDevice = device as any;
      if (rawDevice._capabilities) {
        console.log('\n  Raw Capabilities:');
        for (const cap of rawDevice._capabilities) {
          console.log(`    - Type: ${cap.type}`);
          console.log(`      Instance: ${cap.instance}`);
          if (cap.parameters) {
            console.log(`      Parameters: ${JSON.stringify(cap.parameters, null, 8).split('\n').join('\n      ')}`);
          }
          console.log('');
        }
      }

      // Look for toggle capabilities (potential sceneStage location)
      console.log('  Toggle Capabilities Found:');
      const toggleCaps = (rawDevice._capabilities || []).filter(
        (cap: any) => cap.type.includes('toggle') || cap.instance.toLowerCase().includes('toggle')
      );
      if (toggleCaps.length > 0) {
        for (const cap of toggleCaps) {
          console.log(`    - ${cap.instance} (${cap.type})`);
        }
      } else {
        console.log('    None found');
      }

      // Look for scene-related capabilities
      console.log('\n  Scene-Related Capabilities Found:');
      const sceneCaps = (rawDevice._capabilities || []).filter(
        (cap: any) =>
          cap.type.includes('scene') ||
          cap.instance.toLowerCase().includes('scene') ||
          cap.instance.toLowerCase().includes('stage')
      );
      if (sceneCaps.length > 0) {
        for (const cap of sceneCaps) {
          console.log(`    - ${cap.instance} (${cap.type})`);
          if (cap.parameters?.options) {
            console.log(`      Options: ${cap.parameters.options.length} available`);
          }
        }
      } else {
        console.log('    None found');
      }

      // Try to get device state for more details
      if (device.canRetrieve()) {
        console.log('\n  Fetching device state...');
        try {
          const state = await client.getDeviceState(device.deviceId, device.model);
          console.log(`  Device State:`);
          console.log(`    Online: ${state.isOnline()}`);
          console.log(`    Powered On: ${state.isPoweredOn()}`);

          // Get raw state properties
          const rawState = state as any;
          if (rawState._properties) {
            console.log('    State Properties:');
            for (const [key, value] of Object.entries(rawState._properties)) {
              console.log(`      - ${key}: ${JSON.stringify(value)}`);
            }
          }
        } catch (stateError) {
          console.log(`    Error fetching state: ${stateError}`);
        }
      }

      // Try to get dynamic scenes
      console.log('\n  Fetching dynamic scenes...');
      try {
        const scenes = await client.getDynamicScenes(device.deviceId, device.model);
        console.log(`  Found ${scenes.length} dynamic scenes`);
        if (scenes.length > 0 && scenes.length <= 10) {
          for (const scene of scenes) {
            console.log(`    - ${scene.name} (id: ${scene.id}, paramId: ${scene.paramId})`);
          }
        } else if (scenes.length > 10) {
          console.log(`    (showing first 10)`);
          for (const scene of scenes.slice(0, 10)) {
            console.log(`    - ${scene.name} (id: ${scene.id}, paramId: ${scene.paramId})`);
          }
        }
      } catch (sceneError) {
        console.log(`    Error fetching scenes: ${sceneError}`);
      }

      console.log('\n' + '='.repeat(80));
    }

    if (targetDeviceId && !devices.find(d => d.deviceId === targetDeviceId)) {
      console.log(`\nDevice with ID "${targetDeviceId}" not found.`);
      console.log('Available devices:');
      for (const device of devices) {
        console.log(`  - ${device.deviceName}: ${device.deviceId} (${device.model})`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

discoverCapabilities();
