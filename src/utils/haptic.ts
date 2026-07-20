/**
 * Helper utility for triggering haptic feedback via the Web Vibration API.
 * Uses optimized vibration durations and patterns to ensure compatibility
 * across both premium devices (e.g. Google Pixel) and mid-range/budget devices (e.g. Samsung A-series)
 * which have higher motor spin-up latency and ignore ultra-short (<20ms) vibrations.
 */
export const triggerHaptic = (ms = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      // Mid-range/budget ERM (Eccentric Rotating Mass) vibration motors require 
      // a longer duration to physically spin up and become perceptible.
      // We apply a scale & minimum threshold so it's felt on Samsung A16 while remaining crisp on Pixel 10a.
      let duration = ms;
      
      if (ms <= 8) {
        // Scroll tick or micro feedback: boost to 22ms so budget motors can register it
        duration = 22;
      } else if (ms <= 15) {
        // Standard key tap: boost to 30ms
        duration = 30;
      } else if (ms <= 25) {
        // Stronger key tap / clear: boost to 35ms
        duration = 35;
      } else {
        // Reset or error: ensure it is highly noticeable
        duration = Math.max(ms, 45);
      }

      navigator.vibrate(duration);
    } catch (e) {
      // Ignore vibration errors, especially inside sandboxed iframes
      console.log('Haptic feedback not supported or blocked:', e);
    }
  }
};
