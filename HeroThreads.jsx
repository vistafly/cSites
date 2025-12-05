import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import Threads from './Threads';

function HeroThreadsBackground() {
  const mousePositionRef = useRef({ x: 0.5, y: 0.5 });
  const heroSectionRef = useRef(null);

  useEffect(() => {
    const heroSection = document.getElementById('home');
    heroSectionRef.current = heroSection;
    
    if (!heroSection) return;

    // Wait for MouseTracker to be available
    const checkTracker = () => {
      if (window.mouseTracker) {
        // Subscribe to global mouse tracker
        const unsubscribe = window.mouseTracker.subscribe((pos) => {
          // Get normalized position relative to hero section
          const normalized = window.mouseTracker.getNormalizedPosition(heroSection);
          mousePositionRef.current = normalized;
        });

        return unsubscribe;
      } else {
        // Retry in 50ms if tracker not ready yet
        const timeout = setTimeout(checkTracker, 50);
        return () => clearTimeout(timeout);
      }
    };

    const cleanup = checkTracker();
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

  return (
    <div 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    >
      <Threads
        color={[0.4, 0.6, 1.0]}
        amplitude={1.0}  // Let component handle device-specific scaling
        distance={0.3}
        enableMouseInteraction={true}
        externalMouseRef={mousePositionRef}
      />
    </div>
  );
}

// Mount Threads background in hero section
const heroThreadsRoot = document.getElementById('hero-threads-root');

if (heroThreadsRoot) {
  const root = ReactDOM.createRoot(heroThreadsRoot);
  root.render(<HeroThreadsBackground />);
}