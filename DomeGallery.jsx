import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import './DomeGallery.css';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const wrapAngleSigned = deg => {
  const a = (((deg + 180) % 360) + 360) % 360;
  return a - 180;
};

function buildItems(pool, segments) {
  const xCols = Array.from({ length: segments }, (_, i) => -28 + i * 2);
  const evenYs = [-3, -1, 1, 3];
  const oddYs = [-2, 0, 2, 4];

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2 }));
  });

  if (pool.length === 0) {
    return coords.map(c => ({ ...c, preview: '', url: '', alt: '', type: 'image' }));
  }

  const normalizedImages = pool.map(image => ({
    preview: image.preview || image.src || '',
    url: image.url || image.src || '',
    alt: image.alt || '',
    type: image.type || 'image'
  }));

  const usedImages = Array.from(
    { length: coords.length },
    (_, i) => normalizedImages[i % normalizedImages.length]
  );

  return coords.map((c, i) => ({
    ...c,
    preview: usedImages[i].preview,
    url: usedImages[i].url,
    alt: usedImages[i].alt,
    type: usedImages[i].type
  }));
}

export default function DomeGallery({
  images = [],
  fit = 0.6,
  minRadius = 650,
  maxRadius = 1000,
  segments = 28,
  maxVerticalRotationDeg = 10,
  dragSensitivity = 18,
  openedImageWidth = '85vw',
  openedImageHeight = '85vh',
  imageBorderRadius = '12px',
  openedImageBorderRadius = '20px',
  overlayBlurColor = '#0a0a0a',
  grayscale = false,
  pressHoldDuration = 500
}) {
  const rootRef = useRef(null);
  const mainRef = useRef(null);
  const sphereRef = useRef(null);
  const viewerRef = useRef(null);
  const scrimRef = useRef(null);

  const rotationRef = useRef({ x: 0, y: 0 });
  const startRotRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const lastDragEndAt = useRef(0);
  const openingRef = useRef(false);
  
  // Mobile touch refs
  const touchTimerRef = useRef(null);
  const touchStartTimeRef = useRef(0);
  const activeTouchTileRef = useRef(null);
  const holdCompletedRef = useRef(false);
  const rafRef = useRef(null);
  const hasInteractedRef = useRef(false); // Track if user has interacted

  const items = useMemo(() => buildItems(images, segments), [images, segments]);

  // Safe haptic feedback with error handling
  const triggerHaptic = useCallback((duration = 10) => {
    if (!hasInteractedRef.current) return; // Don't vibrate until user has interacted
    
    try {
      if ('vibrate' in navigator && navigator.vibrate) {
        navigator.vibrate(duration);
      }
    } catch (err) {
      // Silently fail - vibration is not critical
      console.log('Vibration not available');
    }
  }, []);

  // Throttled z-index update with RAF
  const updateTileZIndex = useCallback((currentRotY) => {
    if (rafRef.current) return;
    
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      
      if (!sphereRef.current) return;
      
      const tiles = sphereRef.current.querySelectorAll('.item');
      
      tiles.forEach((tile) => {
        const styleAttr = tile.getAttribute('style') || '';
        const offsetXMatch = styleAttr.match(/--offset-x:\s*(-?\d+(?:\.\d+)?)/);
        const offsetX = offsetXMatch ? parseFloat(offsetXMatch[1]) : 0;
        
        const tileRotY = (360 / segments) * (offsetX + 0.5);
        let relativeRot = tileRotY - currentRotY;
        
        while (relativeRot > 180) relativeRot -= 360;
        while (relativeRot < -180) relativeRot += 360;
        
        const zIndex = Math.round(500 + 499 * Math.cos((relativeRot * Math.PI) / 180));
        tile.style.zIndex = Math.max(1, zIndex);
      });
    });
  }, [segments]);

  const applyTransform = useCallback((xDeg, yDeg) => {
    if (sphereRef.current) {
      sphereRef.current.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
      updateTileZIndex(yDeg);
    }
  }, [updateTileZIndex]);

  // Set CSS variables and size
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const updateSize = () => {
      const rect = root.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const minDim = Math.min(w, h);
      
      let radius = minDim * fit;
      radius = clamp(radius, minRadius, maxRadius);
      
      root.style.setProperty('--radius', `${Math.round(radius)}px`);
      root.style.setProperty('--segments-x', segments);
      root.style.setProperty('--segments-y', segments);
      root.style.setProperty('--tile-radius', imageBorderRadius);
      root.style.setProperty('--enlarge-radius', openedImageBorderRadius);
      root.style.setProperty('--overlay-blur-color', overlayBlurColor);
      root.style.setProperty('--image-filter', grayscale ? 'grayscale(1)' : 'none');
      
      applyTransform(rotationRef.current.x, rotationRef.current.y);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(root);

    return () => observer.disconnect();
  }, [fit, minRadius, maxRadius, segments, imageBorderRadius, openedImageBorderRadius, overlayBlurColor, grayscale, applyTransform]);

  // Initial z-index setup
  useEffect(() => {
    const timer = setTimeout(() => {
      updateTileZIndex(0);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [updateTileZIndex]);

  // FIXED: Drag handlers using useGesture's movement instead of clientX/Y
  useGesture(
    {
      onDragStart: () => {
        hasInteractedRef.current = true; // User has interacted
        draggingRef.current = true;
        movedRef.current = false;
        startRotRef.current = { ...rotationRef.current };
      },
      onDrag: ({ movement: [mx, my], last }) => {
        if (!draggingRef.current) return;
        
        // Check if moved enough to be considered a drag
        if (!movedRef.current && (mx * mx + my * my) > 25) {
          movedRef.current = true;
          // Cancel press-and-hold if user starts dragging
          if (touchTimerRef.current) {
            clearTimeout(touchTimerRef.current);
            touchTimerRef.current = null;
            holdCompletedRef.current = false;
          }
        }
        
        const nextX = clamp(
          startRotRef.current.x - my / dragSensitivity,
          -maxVerticalRotationDeg,
          maxVerticalRotationDeg
        );
        const nextY = wrapAngleSigned(startRotRef.current.y + mx / dragSensitivity);
        
        rotationRef.current = { x: nextX, y: nextY };
        applyTransform(nextX, nextY);
        
        if (last) {
          draggingRef.current = false;
          if (movedRef.current) lastDragEndAt.current = performance.now();
          movedRef.current = false;
        }
      }
    },
    { 
      target: mainRef,
      drag: {
        filterTaps: true,
        pointer: { touch: true }
      }
    }
  );

  // Open content utility
  const openTileContent = useCallback((parent) => {
    if (openingRef.current) return;

    const url = parent.dataset.url;
    const type = parent.dataset.type;
    const preview = parent.dataset.preview;

    openingRef.current = true;

    const overlay = document.createElement('div');
    overlay.className = 'enlarge';
    overlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${openedImageWidth};
      height: ${openedImageHeight};
      max-width: 92vw;
      max-height: 92vh;
      z-index: 9999;
      border-radius: ${openedImageBorderRadius};
      overflow: hidden;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8);
      background: #000;
    `;

    if (type === 'iframe' && url) {
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.cssText = 'width:100%;height:100%;border:none;';
      iframe.setAttribute('allowfullscreen', '');
      overlay.appendChild(iframe);
    } else {
      const img = document.createElement('img');
      img.src = preview || url;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      overlay.appendChild(img);
    }

    viewerRef.current.appendChild(overlay);
    rootRef.current?.setAttribute('data-enlarging', 'true');
    
    // Success haptic on open
    triggerHaptic(20);
  }, [openedImageWidth, openedImageHeight, openedImageBorderRadius, triggerHaptic]);

  // MOBILE: Touch start handler - Press and hold starts here
  const handleTouchStart = useCallback((e) => {
    hasInteractedRef.current = true; // User has interacted
    
    const tile = e.currentTarget.parentElement;
    
    touchStartTimeRef.current = performance.now();
    activeTouchTileRef.current = tile;
    holdCompletedRef.current = false;
    
    // Immediate light haptic feedback on press down
    triggerHaptic(10);
    
    // Clear existing timer
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
    
    // Set timer for press-and-hold
    touchTimerRef.current = setTimeout(() => {
      if (!movedRef.current && activeTouchTileRef.current && !draggingRef.current) {
        holdCompletedRef.current = true;
        // STRONG haptic feedback to confirm press-and-hold completion
        triggerHaptic(50);
      }
    }, pressHoldDuration);
  }, [triggerHaptic, pressHoldDuration]);

  // MOBILE: Touch end handler - Only opens if hold was completed
  const handleTouchEnd = useCallback((e) => {
    const parent = activeTouchTileRef.current;
    
    // Clear timer
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    
    // CRITICAL: Only open if press-and-hold was completed
    if (holdCompletedRef.current && !movedRef.current && !draggingRef.current && parent) {
      // Prevent default to avoid ghost clicks
      if (e.cancelable) {
        e.preventDefault();
      }
      
      // Open the content
      openTileContent(parent);
    }
    
    // Reset all touch tracking
    activeTouchTileRef.current = null;
    touchStartTimeRef.current = 0;
    holdCompletedRef.current = false;
  }, [openTileContent]);

  const handleTouchCancel = useCallback(() => {
    // Clear timer on touch cancel
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    
    // Reset all tracking
    activeTouchTileRef.current = null;
    touchStartTimeRef.current = 0;
    holdCompletedRef.current = false;
  }, []);

  // DESKTOP: Click handler (instant open)
  const handleClick = useCallback((e) => {
    hasInteractedRef.current = true; // User has interacted
    
    // Skip on touch devices - they use press-and-hold
    if ('ontouchstart' in window) return;
    
    if (draggingRef.current || movedRef.current) return;
    if (performance.now() - lastDragEndAt.current < 100) return;

    const parent = e.currentTarget.parentElement;
    openTileContent(parent);
  }, [openTileContent]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Close handler
  useEffect(() => {
    const handleClose = () => {
      const overlay = viewerRef.current?.querySelector('.enlarge');
      if (overlay) overlay.remove();
      rootRef.current?.removeAttribute('data-enlarging');
      openingRef.current = false;
    };

    const scrim = scrimRef.current;
    if (scrim) {
      scrim.addEventListener('click', handleClose);
      scrim.addEventListener('touchend', handleClose);
    }

    const handleKeydown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeydown);

    return () => {
      if (scrim) {
        scrim.removeEventListener('click', handleClose);
        scrim.removeEventListener('touchend', handleClose);
      }
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  return (
    <div ref={rootRef} className="sphere-root">
      <main ref={mainRef} className="sphere-main">
        <div className="stage">
          <div ref={sphereRef} className="sphere">
            {items.map((it, i) => (
              <div
                key={`${it.x},${it.y},${i}`}
                className="item"
                data-preview={it.preview}
                data-url={it.url}
                data-type={it.type}
                style={{
                  ['--offset-x']: it.x,
                  ['--offset-y']: it.y,
                  ['--item-size-x']: it.sizeX,
                  ['--item-size-y']: it.sizeY
                }}
              >
                <div
                  className="item__image"
                  data-interactive="true"
                  role="button"
                  tabIndex={0}
                  onClick={handleClick}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClick(e);
                    }
                  }}
                >
                  <img src={it.preview} draggable={false} alt={it.alt} loading="lazy" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="viewer" ref={viewerRef}>
          <div ref={scrimRef} className="scrim" />
        </div>
      </main>
    </div>
  );
}