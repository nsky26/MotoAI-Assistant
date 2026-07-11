import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.motoai.assistant',
  appName: 'MotoAI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#060607',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    Camera: {
      presentationStyle: 'fullscreen',
      androidCameraPermission: true,
      androidMicrophonePermission: true,
    },
    Geolocation: {
      androidPermission: true,
    },
    Network: {
      androidPermission: true,
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    useLegacyBridge: false,
    backgroundColor: '#060607',
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
  },
};

export default config;