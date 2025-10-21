import { boot } from 'quasar/wrappers';
// import { Capacitor } from '@capacitor/core';
// import { StatusBar, Style } from '@capacitor/status-bar';
// import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';

export default boot(async () => {
  // // Only configure status bar on native platforms
  // if (Capacitor.isNativePlatform()) {
  //   // Set status bar to use light content (white text/icons) on dark background
  //   await StatusBar.setStyle({ style: Style.Light });
  //   // Show the status bar if it's hidden
  //   await StatusBar.show();
  //   // Set status bar background color to match app primary color
  //   await StatusBar.setBackgroundColor({ color: '#1976D2' });
  //   // Make sure the WebView content doesn't overlap with status bar
  //   await StatusBar.setOverlaysWebView({ overlay: false });
  //   console.log('Status bar configured successfully');
  // }
});
