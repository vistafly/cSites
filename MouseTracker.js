// MouseTracker.js - Shared global mouse position tracker
class MouseTracker {
  constructor() {
    this.position = { x: 0.5, y: 0.5 };
    this.listeners = new Set();
    this.init();
  }

  init() {
    const self = this;
    
    // Track mouse globally with pointermove (same as your cursor)
    document.addEventListener('pointermove', function(e) {
      self.position.x = e.clientX;
      self.position.y = e.clientY;
      
      // Notify all listeners
      self.listeners.forEach(callback => callback(self.position));
    }, { passive: true });

    document.addEventListener('pointerleave', function() {
      // Reset to center when mouse leaves window
      self.position.x = window.innerWidth / 2;
      self.position.y = window.innerHeight / 2;
      self.listeners.forEach(callback => callback(self.position));
    }, { passive: true });
  }

  // Subscribe to mouse position updates
  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately call with current position
    callback(this.position);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Get normalized position for a specific element (0-1 range)
  getNormalizedPosition(element) {
    if (!element) return { x: 0.5, y: 0.5 };
    
    const rect = element.getBoundingClientRect();
    
    // Check if mouse is within bounds
    if (
      this.position.x >= rect.left &&
      this.position.x <= rect.right &&
      this.position.y >= rect.top &&
      this.position.y <= rect.bottom
    ) {
      return {
        x: (this.position.x - rect.left) / rect.width,
        y: 1.0 - (this.position.y - rect.top) / rect.height // Inverted Y for WebGL
      };
    }
    
    // Outside bounds, return center
    return { x: 0.5, y: 0.5 };
  }
}

// Create singleton instance
window.mouseTracker = new MouseTracker();

export default window.mouseTracker;