/**
 * Helper utility for triggering haptic feedback via the Web Vibration API.
 * Uses optimized vibration durations and patterns to simulate modern mechanical clicks
 * and tactile keyboard ticks.
 */
export type HapticType = 'key' | 'scroll' | 'action' | 'reset' | 'light' | 'medium' | 'heavy';

export const triggerHaptic = (type: HapticType | number = 'key') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (typeof type === 'number') {
        navigator.vibrate(type);
        return;
      }

      switch (type) {
        case 'scroll':
          // Scroll/drag tick: ultra-short pulse for scrolling ticks
          navigator.vibrate(2);
          break;
        case 'key':
          // Keyboard key (numbers, operations): ultra-soft micro pulse
          navigator.vibrate(5);
          break;
        case 'action':
          // Action buttons: slightly more distinct tap
          navigator.vibrate(10);
          break;
        case 'reset':
          // Reset or CLR action: double light micro-tick
          navigator.vibrate([4, 30, 4]);
          break;
        case 'light':
          navigator.vibrate(4);
          break;
        case 'medium':
          navigator.vibrate(12);
          break;
        case 'heavy':
          navigator.vibrate(25);
          break;
        default:
          navigator.vibrate(5);
      }
    } catch (e) {
      // Ignore vibration errors, especially inside sandboxed iframes
      console.log('Haptic feedback not supported or blocked:', e);
    }
  }
};

