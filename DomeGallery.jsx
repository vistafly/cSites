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
  moveThreshold = 15 // Lower threshold for better responsiveness
}) {
  const rootRef = useRef(null);
  const mainRef = useRef(null);
  const sphereRef = useRef(null);
  const viewerRef = useRef(null);
  const scrimRef = useRef(null);

  // Rotation and momentum
  const rotationRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const startRotRef = useRef({ x: 0, y: 0 });
  const dragStartPosRef = useRef(null);
  const lastDragPosRef = useRef(null);
  const lastDragTimeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const momentumRafRef = useRef(null);
  const openingRef = useRef(false);
  
  // Tile interaction - simplified
  const touchTimerRef = useRef(null);
  const activeTouchTileRef = useRef(null);
  const touchStartPosRef = useRef(null);
  const touchStartTimeRef = useRef(0);
  const touchMoveDistanceRef = useRef(0);
  
  // Performance optimization
  const rafRef = useRef(null);
  const lastZIndexUpdateRef = useRef(0);
  const tilesCache = useRef(null);

  const items = useMemo(() => buildItems(images, segments), [images, segments]);

  // iOS Haptic Feedback - optimized
  const triggerHaptic = useCallback(() => {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  // Optimized z-index update with caching and throttling
  const updateTileZIndex = useCallback((currentRotY) => {
    const now = performance.now();
    // Throttle to max 60fps
    if (now - lastZIndexUpdateRef.current < 16) return;
    
    if (rafRef.current) return;
    
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      lastZIndexUpdateRef.current = now;
      
      if (!sphereRef.current) return;
      
      // Cache tiles array
      if (!tilesCache.current) {
        tilesCache.current = Array.from(sphereRef.current.querySelectorAll('.item'));
      }
      
      const tiles = tilesCache.current;
      const segmentAngle = 360 / segments;
      
      tiles.forEach((tile) => {
        const offsetX = parseFloat(tile.style.getPropertyValue('--offset-x') || 0);
        const tileRotY = segmentAngle * (offsetX + 0.5);
        let relativeRot = tileRotY - currentRotY;
        
        // Normalize angle to -180 to 180
        relativeRot = ((relativeRot + 180) % 360) - 180;
        
        const zIndex = Math.round(500 + 499 * Math.cos((relativeRot * Math.PI) / 180));
        tile.style.zIndex = Math.max(1, zIndex);
      });
    });
  }, [segments]);

  // Optimized transform with hardware acceleration hint
  const applyTransform = useCallback((xDeg, yDeg, immediate = false) => {
    if (!sphereRef.current) return;
    
    const transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg.toFixed(2)}deg) rotateY(${yDeg.toFixed(2)}deg)`;
    
    if (immediate) {
      sphereRef.current.style.transition = 'none';
    }
    
    sphereRef.current.style.transform = transform;
    
    if (immediate) {
      // Force reflow and restore transition
      void sphereRef.current.offsetHeight;
      sphereRef.current.style.transition = '';
    }
    
    updateTileZIndex(yDeg);
  }, [updateTileZIndex]);

  // Momentum animation with easing
  const animateMomentum = useCallback(() => {
    const friction = 0.92; // Smooth deceleration
    const minVelocity = 0.1;
    
    const vx = velocityRef.current.x * friction;
    const vy = velocityRef.current.y * friction;
    
    // Stop if velocity is too small
    if (Math.abs(vx) < minVelocity && Math.abs(vy) < minVelocity) {
      velocityRef.current = { x: 0, y: 0 };
      if (momentumRafRef.current) {
        cancelAnimationFrame(momentumRafRef.current);
        momentumRafRef.current = null;
      }
      return;
    }
    
    velocityRef.current = { x: vx, y: vy };
    
    const nextX = clamp(
      rotationRef.current.x + vx,
      -maxVerticalRotationDeg,
      maxVerticalRotationDeg
    );
    const nextY = wrapAngleSigned(rotationRef.current.y + vy);
    
    rotationRef.current = { x: nextX, y: nextY };
    applyTransform(nextX, nextY);
    
    momentumRafRef.current = requestAnimationFrame(animateMomentum);
  }, [maxVerticalRotationDeg, applyTransform]);

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
      
      // Invalidate tiles cache on resize
      tilesCache.current = null;
      
      applyTransform(rotationRef.current.x, rotationRef.current.y, true);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(root);

    return () => observer.disconnect();
  }, [fit, minRadius, maxRadius, segments, imageBorderRadius, openedImageBorderRadius, overlayBlurColor, grayscale, applyTransform]);

  // Initial z-index setup
  useEffect(() => {
    const timer = setTimeout(() => {
      tilesCache.current = null; // Force cache refresh
      updateTileZIndex(0);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [updateTileZIndex]);

  // ===== SPHERE ROTATION - SIMPLIFIED =====
  
  const startDrag = useCallback((clientX, clientY) => {
    // Stop any momentum
    if (momentumRafRef.current) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
    
    isDraggingRef.current = true;
    startRotRef.current = { ...rotationRef.current };
    dragStartPosRef.current = { x: clientX, y: clientY };
    lastDragPosRef.current = { x: clientX, y: clientY };
    lastDragTimeRef.current = performance.now();
    velocityRef.current = { x: 0, y: 0 };
  }, []);

  const updateDrag = useCallback((clientX, clientY) => {
    if (!isDraggingRef.current || !dragStartPosRef.current) return;
    
    const now = performance.now();
    const dt = Math.max(1, now - lastDragTimeRef.current);
    
    const dx = clientX - dragStartPosRef.current.x;
    const dy = clientY - dragStartPosRef.current.y;
    
    // Calculate velocity for momentum
    if (lastDragPosRef.current) {
      const vx = (clientY - lastDragPosRef.current.y) / dt * 16; // Normalize to ~60fps
      const vy = (clientX - lastDragPosRef.current.x) / dt * 16;
      velocityRef.current = { x: -vx / dragSensitivity, y: vy / dragSensitivity };
    }
    
    lastDragPosRef.current = { x: clientX, y: clientY };
    lastDragTimeRef.current = now;
    
    const nextX = clamp(
      startRotRef.current.x - dy / dragSensitivity,
      -maxVerticalRotationDeg,
      maxVerticalRotationDeg
    );
    const nextY = wrapAngleSigned(startRotRef.current.y + dx / dragSensitivity);
    
    rotationRef.current = { x: nextX, y: nextY };
    applyTransform(nextX, nextY, true);
  }, [dragSensitivity, maxVerticalRotationDeg, applyTransform]);

  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    dragStartPosRef.current = null;
    lastDragPosRef.current = null;
    
    // Start momentum if velocity is significant
    const speed = Math.sqrt(
      velocityRef.current.x ** 2 + velocityRef.current.y ** 2
    );
    
    if (speed > 0.5) {
      animateMomentum();
    }
  }, [animateMomentum]);

  // ===== TILE INTERACTION - SIMPLIFIED =====

  const cancelTileInteraction = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    activeTouchTileRef.current = null;
    touchStartPosRef.current = null;
    touchStartTimeRef.current = 0;
    touchMoveDistanceRef.current = 0;
  }, []);

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

  // Unified touch start for tiles
  const handleTileTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    const tile = e.currentTarget.parentElement;
    
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    touchStartTimeRef.current = performance.now();
    activeTouchTileRef.current = tile;
    touchMoveDistanceRef.current = 0;
    
    triggerHaptic();
    
    // Start hold timer
    touchTimerRef.current = setTimeout(() => {
      // Check if still valid (hasn't moved much)
      if (activeTouchTileRef.current && touchMoveDistanceRef.current < moveThreshold) {
        openTileContent(tile);
        cancelTileInteraction();
      }
    }, pressHoldDuration);
  }, [triggerHaptic, pressHoldDuration, moveThreshold, openTileContent, cancelTileInteraction]);

  // Simplified touch move detection
  const handleTileTouchMove = useCallback((e) => {
    if (!touchStartPosRef.current) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPosRef.current.x;
    const dy = touch.clientY - touchStartPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    touchMoveDistanceRef.current = distance;
    
    // If moved beyond threshold, cancel tile interaction and start sphere drag
    if (distance > moveThreshold) {
      // Store position before canceling (since cancel sets it to null)
      const startPos = { ...touchStartPosRef.current };
      
      cancelTileInteraction();
      
      if (!isDraggingRef.current) {
        startDrag(startPos.x, startPos.y);
        // Update with current position
        updateDrag(touch.clientX, touch.clientY);
      }
    }
  }, [moveThreshold, cancelTileInteraction, startDrag, updateDrag]);

  const handleTileTouchEnd = useCallback(() => {
    cancelTileInteraction();
  }, [cancelTileInteraction]);

  // Desktop click handler
  const handleTileClick = useCallback((e) => {
    if ('ontouchstart' in window) return;
    if (isDraggingRef.current) return;

    const parent = e.currentTarget.parentElement;
    openTileContent(parent);
  }, [openTileContent]);

  // Global touch/mouse handlers - optimized for iOS
  useEffect(() => {
    const onTouchMove = (e) => {
      if (isDraggingRef.current && e.touches[0]) {
        const touch = e.touches[0];
        updateDrag(touch.clientX, touch.clientY);
      }
    };
    
    const onTouchEnd = () => {
      endDrag();
    };

    const onMouseMove = (e) => {
      if (isDraggingRef.current) {
        updateDrag(e.clientX, e.clientY);
      }
    };
    
    const onMouseUp = () => {
      endDrag();
    };

    // Use passive listeners for better scroll performance on iOS
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [updateDrag, endDrag]);

  // Main area handlers
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      startDrag(e.clientX, e.clientY);
    };

    const onTouchStart = (e) => {
      // Only start drag if not touching a tile
      if (!e.target.closest('.item__image')) {
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
      }
    };

    main.addEventListener('mousedown', onMouseDown);
    main.addEventListener('touchstart', onTouchStart, { passive: true });

    return () => {
      main.removeEventListener('mousedown', onMouseDown);
      main.removeEventListener('touchstart', onTouchStart);
    };
  }, [startDrag]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (momentumRafRef.current) cancelAnimationFrame(momentumRafRef.current);
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
      scrim.addEventListener('touchend', handleClose, { passive: true });
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
                  onTouchCancel={handleTileTouchEnd}
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