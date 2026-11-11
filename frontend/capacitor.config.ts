import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.seniorenassistenz.orgaflow',
  appName: 'Seniorenassistenz',
  webDir: 'pb_public',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      splashFullScreen: false,
      splashImmersive: false
    }
  }
};

export default config;
