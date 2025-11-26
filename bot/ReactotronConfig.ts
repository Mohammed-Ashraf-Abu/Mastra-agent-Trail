/**
 * Reactotron Configuration
 *
 * This file configures Reactotron for debugging your React Native app.
 * Make sure to have Reactotron desktop app running to see the logs.
 */

import Reactotron from 'reactotron-react-native';
import {Platform} from 'react-native';

let reactotron: typeof Reactotron | null = null;

// Only configure Reactotron in development mode
if (__DEV__) {
  // Determine the correct host based on platform
  // - iOS Simulator: use 'localhost'
  // - Android Emulator: use '10.0.2.2' (special IP for host machine)
  // - Physical devices: use your computer's IP address
  //   To find your IP: run `ipconfig getifaddr en0` (macOS) or `ipconfig` (Windows)
  let host = 'localhost';
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    host = '10.0.2.2';
    // For Android physical devices, you'll need to set this to your computer's IP
    // Example: host = '192.168.1.100';
  }

  try {
    reactotron = Reactotron.configure({
      name: 'Mastra Bot',
      host: host,
    })
      .useReactNative({
        asyncStorage: false, // Set to true if you use AsyncStorage
        networking: {
          ignoreUrls: /symbolicate/,
        },
        editor: false,
        errors: {veto: () => false},
        overlay: false,
      })
      .connect();

    // Make Reactotron available globally for console.tron usage
    console.tron = reactotron;

    // Clear Reactotron on each app reload (with a delay to ensure connection)
    setTimeout(() => {
      if (reactotron?.clear) {
        reactotron.clear();
      }
    }, 1000);

    // Log connection attempt
    console.log('🔌 Reactotron configured');
    console.log(`   Host: ${host}`);
    console.log('   Port: 9090');
    console.log('   Reactotron desktop app should be running!');

    // Test connection after a delay
    setTimeout(() => {
      if (console.tron) {
        try {
          console.tron.log('✅ Reactotron connection test', {
            timestamp: new Date().toISOString(),
            host: host,
            status: 'connected',
          });
          console.log(
            '✅ Test log sent to Reactotron - check the desktop app!',
          );
        } catch (error) {
          console.warn('⚠️ Failed to send test log to Reactotron:', error);
        }
      } else {
        console.warn('⚠️ console.tron is not available');
      }
    }, 2000);
  } catch (error) {
    console.error('❌ Failed to configure Reactotron:', error);
    reactotron = null;
  }
} else {
  // In production, create a no-op console.tron
  console.tron = {
    log: () => {},
    warn: () => {},
    error: () => {},
    display: () => {},
    image: () => {},
  };
}

export default reactotron || Reactotron;
