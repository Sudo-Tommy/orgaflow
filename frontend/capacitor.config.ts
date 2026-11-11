import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.seniorenassistenz.orgaflow',
  appName: 'Seniorenassistenz',
  webDir: 'pb_public',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'https://www.ihre-seniorenassistenz.com',
      'https://ihre-seniorenassistenz.com',
      '*.ihre-seniorenassistenz.com'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      overlaysWebView: true
    }
  }
};

export default config;
