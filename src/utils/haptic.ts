/**
 * Helper utility for triggering haptic feedback via the Web Vibration API.
 * Uses small vibration durations to feel like modern mechanical clicks/tactile ticks.
 * Touch feedback is optimized for both keyboard presses and list scroll ticks.
 */
export const triggerHaptic = (ms = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch (e) {
      // Ignore vibration errors, especially inside sandboxed iframes
      console.log('Haptic feedback not supported or blocked:', e);
    }
  }
};
