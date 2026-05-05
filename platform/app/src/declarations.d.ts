declare module 'echarts-gl/dist/echarts-gl.min.js';
declare module 'qrcode';

// Capacitor plugin stubs (not installed in web build)
declare module '@capacitor/preferences' { export const Preferences: any; }
declare module '@capacitor/local-notifications' { export const LocalNotifications: any; }
declare module '@capacitor/filesystem' { export const Filesystem: any; export const Directory: any; export const Encoding: any; }
declare module '@capacitor/share' { export const Share: any; }
declare module '@capacitor/network' { export const Network: any; export type ConnectionStatus = any; }
declare module '@capacitor/device' { export const Device: any; }
declare module '@capacitor/clipboard' { export const Clipboard: any; }
declare module '@capacitor/browser' { export const Browser: any; }
