import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thechinesehouse.pos',
  appName: 'The Chinese House',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false
    }
  }
};

export default config;
