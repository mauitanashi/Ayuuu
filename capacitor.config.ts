import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.auris.app',
  appName: 'Auris',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
