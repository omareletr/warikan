import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.omareletr.warikan',
  appName: 'Warikan',
  webDir: 'out',
  // The web view's own background, shown before the page paints; white flashed on launch.
  backgroundColor: '#0A0F0D',
  server: {
    hostname: 'warikan.local'
  }
};

export default config;
