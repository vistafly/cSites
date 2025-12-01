import { useEffect, useMemo, useRef, useCallback } from 'react';
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
  pressHoldDuration = 500,
  movementThreshold = 10 // Pixels of movement before canceling press-and-hold
}) {
  const rootRef = useRef(null);
  const mainRef = useRef(null);
  const sphereRef = useRef(null);
  const viewerRef = useRef(null);
  const scrimRef = useRef(null);

  const rotationRef = useRef({ x: 0, y: 0 });
  const startRotRef = useRef({ x: 0, y: 0 });
  const dragStartPosRef = useRef(null);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const lastDragEndAt = useRef(0);
  const openingRef = useRef(false);
  
  // Tile interaction refs
  const touchTimerRef = useRef(null);
  const activeTouchTileRef = useRef(null);
  const holdCompletedRef = useRef(false);
  const tileTouchStartPosRef = useRef(null); // Track initial touch position
  const tileHasMovedRef = useRef(false); // Track if touch has moved
  const rafRef = useRef(null);

  const items = useMemo(() => buildItems(images, segments), [images, segments]);

  // iOS Haptic Feedback
  const triggerHaptic = useCallback(() => {
    try {
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(10);
      }
      // iOS audio feedback workaround
      if (window.AudioContext || window.webkitAudioContext) {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.value = 200;
        gainNode.gain.value = 0.1;
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.01);
      }
    } catch (err) {
      // Silently fail
    }
  }, []);

  // Throttled z-index update
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

  // ===== SPHERE ROTATION HANDLERS =====
  
  const handleDragStart = useCallback((clientX, clientY) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startRotRef.current = { ...rotationRef.current };
    dragStartPosRef.current = { x: clientX, y: clientY };
  }, []);

  const handleDragMove = useCallback((clientX, clientY) => {
    if (!isDraggingRef.current || !dragStartPosRef.current) return;
    
    const dx = clientX - dragStartPosRef.current.x;
    const dy = clientY - dragStartPosRef.current.y;
    
    if (!hasMovedRef.current && (dx * dx + dy * dy) > 25) {
      hasMovedRef.current = true;
    }
    
    const nextX = clamp(
      startRotRef.current.x - dy / dragSensitivity,
      -maxVerticalRotationDeg,
      maxVerticalRotationDeg
    );
    const nextY = wrapAngleSigned(startRotRef.current.y + dx / dragSensitivity);
    
    rotationRef.current = { x: nextX, y: nextY };
    applyTransform(nextX, nextY);
  }, [dragSensitivity, maxVerticalRotationDeg, applyTransform]);

  const handleDragEnd = useCallback(() => {
    if (isDraggingRef.current && hasMovedRef.current) {
      lastDragEndAt.current = performance.now();
    }
    
    isDraggingRef.current = false;
    hasMovedRef.current = false;
    dragStartPosRef.current = null;
  }, []);

  // Attach sphere rotation handlers
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    // Mouse events
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      handleDragStart(e.clientX, e.clientY);
    };
    
    const onMouseMove = (e) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        handleDragMove(e.clientX, e.clientY);
      }
    };
    
    const onMouseUp = () => {
      handleDragEnd();
    };

    // Touch events on main sphere (not on tiles)
    const onTouchStart = (e) => {
      // Only handle if not touching a tile directly
      if (!e.target.closest('.item__image')) {
        const touch = e.touches[0];
        handleDragStart(touch.clientX, touch.clientY);
      }
    };
    
    const onTouchMove = (e) => {
      if (isDraggingRef.current && e.touches[0]) {
        e.preventDefault();
        const touch = e.touches[0];
        handleDragMove(touch.clientX, touch.clientY);
      }
    };
    
    const onTouchEnd = () => {
      handleDragEnd();
    };

    main.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    main.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      main.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      main.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  // ===== TILE PRESS-AND-HOLD HANDLERS =====

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
    
    triggerHaptic();
  }, [openedImageWidth, openedImageHeight, openedImageBorderRadius, triggerHaptic]);

  // Clear press-and-hold timer
  const clearPressAndHold = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    holdCompletedRef.current = false;
  }, []);

  // MOBILE: Touch start on tile
  const handleTileTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    const tile = e.currentTarget.parentElement;
    
    // Store initial touch position
    tileTouchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    activeTouchTileRef.current = tile;
    tileHasMovedRef.current = false;
    holdCompletedRef.current = false;
    
    // Initial haptic feedback
    triggerHaptic();
    
    clearPressAndHold();
    
    // Start press-and-hold timer
    touchTimerRef.current = setTimeout(() => {
      // Only complete if hasn't moved
      if (!tileHasMovedRef.current && activeTouchTileRef.current) {
        holdCompletedRef.current = true;
        triggerHaptic(); // Strong feedback
      }
    }, pressHoldDuration);
  }, [triggerHaptic, pressHoldDuration, clearPressAndHold]);

  // MOBILE: Touch move on tile - Check for movement
  const handleTileTouchMove = useCallback((e) => {
    if (!tileTouchStartPosRef.current || !activeTouchTileRef.current) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - tileTouchStartPosRef.current.x;
    const dy = touch.clientY - tileTouchStartPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If moved more than threshold, cancel press-and-hold
    if (distance > movementThreshold) {
      tileHasMovedRef.current = true;
      clearPressAndHold();
      
      // Start sphere drag if not already dragging
      if (!isDraggingRef.current) {
        handleDragStart(tileTouchStartPosRef.current.x, tileTouchStartPosRef.current.y);
      }
      
      // Continue with drag movement
      handleDragMove(touch.clientX, touch.clientY);
    }
  }, [movementThreshold, clearPressAndHold, handleDragStart, handleDragMove]);

  // MOBILE: Touch end on tile
  const handleTileTouchEnd = useCallback((e) => {
    const parent = activeTouchTileRef.current;
    
    clearPressAndHold();
    
    // Only open if hold completed and didn't move
    if (holdCompletedRef.current && !tileHasMovedRef.current && parent) {
      e.preventDefault();
      e.stopPropagation();
      openTileContent(parent);
    } else if (tileHasMovedRef.current) {
      // If moved, end the drag
      handleDragEnd();
    }
    
    // Reset all tile tracking
    activeTouchTileRef.current = null;
    tileTouchStartPosRef.current = null;
    tileHasMovedRef.current = false;
  }, [clearPressAndHold, openTileContent, handleDragEnd]);

  const handleTileTouchCancel = useCallback(() => {
    clearPressAndHold();
    handleDragEnd();
    
    activeTouchTileRef.current = null;
    tileTouchStartPosRef.current = null;
    tileHasMovedRef.current = false;
  }, [clearPressAndHold, handleDragEnd]);

  // DESKTOP: Click handler
  const handleTileClick = useCallback((e) => {
    // Skip on touch devices
    if ('ontouchstart' in window) return;
    
    if (isDraggingRef.current || hasMovedRef.current) return;
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
                  onClick={handleTileClick}
                  onTouchStart={handleTileTouchStart}
                  onTouchMove={handleTileTouchMove}
                  onTouchEnd={handleTileTouchEnd}
                  onTouchCancel={handleTileTouchCancel}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTileClick(e);
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