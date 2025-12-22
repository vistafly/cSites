// Scarlo — Navbar Text Animation
// Hover-only animation: static on load, morphs on hover, returns to frame 0

(function() {
    'use strict';

    const TOTAL_FRAMES = 20;

    const CONFIG = {
        // Time per frame during hover (ms)
        hoverFrameInterval: 60,
        // Time per frame when returning to start (ms)
        returnFrameInterval: 40
    };

    class NavbarTextAnimation {
        constructor() {
            this.container = document.getElementById('navbarTextAnimated');
            this.textStack = document.getElementById('navbarTextStack');
            this.brandContainer = document.getElementById('navbarBrand');
            this.texts = [];

            for (let i = 0; i < TOTAL_FRAMES; i++) {
                const el = document.getElementById('navText' + i);
                if (el) this.texts.push(el);
            }

            this.currentIndex = 0;
            this.direction = 1; // 1 = forward, -1 = backward
            this.isHovering = false;
            this.isAnimating = false;
            this.animationFrameId = null;
            this.lastFrameTime = 0;

            if (this.container && this.textStack && this.texts.length > 0) {
                this.init();
            }
        }

        init() {
            // Set all frames to hidden except first
            this.texts.forEach((text, i) => {
                if (i === 0) {
                    text.classList.add('visible');
                } else {
                    text.classList.remove('visible');
                }
            });

            this.currentIndex = 0;

            // Hover events - use parent brand container for unified hover
            const hoverTarget = this.brandContainer || this.container;
            hoverTarget.addEventListener('mouseenter', () => {
                this.isHovering = true;
                this.direction = 1; // Always go forward on hover
                this.startAnimation();
            });

            hoverTarget.addEventListener('mouseleave', () => {
                this.isHovering = false;
                // Animation will reverse back to frame 0
            });

            // Reset timing when tab becomes visible
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.lastFrameTime = performance.now();
                }
            });

            // No animation on load - stays static at frame 0
        }

        showFrame(index) {
            this.texts.forEach((text, i) => {
                if (i === index) {
                    text.classList.add('visible');
                } else {
                    text.classList.remove('visible');
                }
            });
            this.currentIndex = index;
        }

        nextFrame() {
            if (this.isHovering) {
                // Move forward through frames while hovering
                this.currentIndex += this.direction;

                // Ping-pong at the ends
                if (this.currentIndex >= this.texts.length - 1) {
                    this.currentIndex = this.texts.length - 1;
                    this.direction = -1;
                } else if (this.currentIndex <= 0) {
                    this.currentIndex = 0;
                    this.direction = 1;
                }
            } else {
                // Return to frame 0 when not hovering
                if (this.currentIndex > 0) {
                    this.currentIndex--;
                } else {
                    // Reached frame 0, stop animating
                    this.stopAnimation();
                    return;
                }
            }

            this.showFrame(this.currentIndex);
        }

        stopAnimation() {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            this.isAnimating = false;
        }

        startAnimation() {
            if (this.isAnimating) return;
            this.isAnimating = true;
            this.lastFrameTime = performance.now();

            const animate = (currentTime) => {
                if (!this.isAnimating) return;

                const interval = this.isHovering ? CONFIG.hoverFrameInterval : CONFIG.returnFrameInterval;
                const elapsed = currentTime - this.lastFrameTime;

                if (elapsed >= interval) {
                    this.nextFrame();
                    this.lastFrameTime = currentTime;
                }

                // Only continue if still animating
                if (this.isAnimating) {
                    this.animationFrameId = requestAnimationFrame(animate);
                }
            };

            this.animationFrameId = requestAnimationFrame(animate);
        }
    }

    // Initialize after loading screen completes
    let navbarTextAnimation = null;

    function initNavbarText() {
        if (!navbarTextAnimation) {
            navbarTextAnimation = new NavbarTextAnimation();
        }
    }

    window.addEventListener('loadingComplete', initNavbarText);

    window.addEventListener('load', () => {
        if (!document.getElementById('logoLoadingScreen')) {
            initNavbarText();
        }

        // Fallback init after 5 seconds
        setTimeout(initNavbarText, 5000);
    });

    window.NavbarTextAnimation = {
        get: () => navbarTextAnimation
    };

})();
