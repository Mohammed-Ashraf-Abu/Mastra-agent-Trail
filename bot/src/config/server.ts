/**
 * Server configuration
 * Server IP configuration for different platforms:
 * - iOS Simulator: 'localhost' (works automatically)
 * - Android Emulator: '10.0.2.2' (special IP that maps to host's localhost)
 * - Physical devices (iOS/Android): Your computer's IP address (e.g., '192.168.68.129')
 *   Find your IP: `ipconfig getifaddr en0` (macOS) or `ipconfig` (Windows)
 */

import {Platform} from 'react-native';

// Determine server IP based on platform
// For Android emulator, use 10.0.2.2 (maps to host's localhost)
// For physical Android devices, change this to your computer's IP: '192.168.68.129'
const SERVER_IP = __DEV__
  ? Platform.OS === 'ios'
    ? 'localhost' // iOS Simulator - use 'YOUR_IP' for physical iOS devices
    : '10.0.2.2' // Android Emulator - use '192.168.68.129' for physical Android devices
  : 'YOUR_PRODUCTION_SERVER_URL';

const SERVER_PORT = 3000;

export const SERVER_URL = `http://${SERVER_IP}:${SERVER_PORT}`;
export const CHAT_ENDPOINT = `${SERVER_URL}/chat`;
