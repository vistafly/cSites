// Scarlo — Navbar Logo Animation
// Seamless ping-pong loop (0→19→0→19...) for never-ending morph

(function() {
    'use strict';

    const TOTAL_FRAMES = 20;

    const CONFIG = {
        // Time per frame (ms)
        frameInterval: 120,

        // Faster on hover
        hoverFrameInterval: 60
    };

    class NavbarLogoAnimation {
        constructor() {
            this.container = document.getElementById('navbarLogoAnimated');
            this.logoStack = document.getElementById('navbarLogoStack');
            this.brandContainer = document.getElementById('navbarBrand');
            this.logos = [];

            for (let i = 0; i < TOTAL_FRAMES; i++) {
                const el = document.getElementById('navLogo' + i);
                if (el) this.logos.push(el);
            }

            this.currentIndex = 0;
            this.direction = 1; // 1 = forward, -1 = backward
            this.isHovering = false;
            this.isRunning = false;
            this.animationFrameId = null;
            this.lastFrameTime = 0;

            if (this.container && this.logoStack && this.logos.length > 0) {
                this.init();
            }
        }

        init() {
            // Set all frames to hidden, show first
            this.logos.forEach((logo, i) => {
                logo.classList.remove('visible');
                if (i === 0) {
                    logo.classList.add('visible');
                }
            });

            this.currentIndex = 0;

            // Hover events - use parent brand container for unified hover
            const hoverTarget = this.brandContainer || this.container;
            hoverTarget.addEventListener('mouseenter', () => {
                this.isHovering = true;
            });

            hoverTarget.addEventListener('mouseleave', () => {
                this.isHovering = false;
            });

            // Reset timing when tab becomes visible to prevent frame burst
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.lastFrameTime = performance.now();
                }
            });

            // Start animation loop
            this.startLoop();
        }

        showFrame(index) {
            this.logos.forEach((logo, i) => {
                if (i === index) {
                    logo.classList.add('visible');
                } else {
                    logo.classList.remove('visible');
                }
            });
            this.currentIndex = index;
        }

        nextFrame() {
            // Move to next frame
            this.currentIndex += this.direction;

            // Reverse direction at ends (ping-pong)
            if (this.currentIndex >= this.logos.length - 1) {
                this.currentIndex = this.logos.length - 1;
                this.direction = -1;
            } else if (this.currentIndex <= 0) {
                this.currentIndex = 0;
                this.direction = 1;
            }

            this.showFrame(this.currentIndex);
        }

        stopLoop() {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            this.isRunning = false;
        }

        startLoop() {
            if (this.isRunning) return;
            this.isRunning = true;
            this.lastFrameTime = performance.now();

            const animate = (currentTime) => {
                if (!this.isRunning) return;

                const interval = this.isHovering ? CONFIG.hoverFrameInterval : CONFIG.frameInterval;
                const elapsed = currentTime - this.lastFrameTime;

                if (elapsed >= interval) {
                    this.nextFrame();
                    this.lastFrameTime = currentTime;
                }

                this.animationFrameId = requestAnimationFrame(animate);
            };

            this.animationFrameId = requestAnimationFrame(animate);
        }
    }

    // Initialize after loading screen completes
    let navbarAnimation = null;

    function initNavbar() {
        if (!navbarAnimation) {
            navbarAnimation = new NavbarLogoAnimation();
        }
    }

    window.addEventListener('loadingComplete', initNavbar);

    window.addEventListener('load', () => {
        if (!document.getElementById('logoLoadingScreen')) {
            initNavbar();
        }

        // Fallback init after 5 seconds
        setTimeout(initNavbar, 5000);
    });

    window.NavbarLogoAnimation = {
        get: () => navbarAnimation
    };

})();
