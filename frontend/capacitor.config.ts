import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.seniorenassistenz.orgaflow',
  appName: 'Seniorenassistenz',
  webDir: 'pb_public',
  server: {
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      'https://www.ihre-seniorenassistenz.com',
      'https://ihre-seniorenassistenz.com'
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
