import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ⚠️ L'appId è permanente dopo la prima pubblicazione sugli store: sceglilo ora.
  appId: 'tech.siigep.socialparking',
  appName: 'Social Parking',
  webDir: 'out',
  backgroundColor: '#000000',
  ios: {
    contentInset: 'never',
    scheme: 'Social Parking',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
