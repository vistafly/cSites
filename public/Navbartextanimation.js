// Scarlo — Navbar Text Animation
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
            this.isRunning = false;
            this.animationFrameId = null;
            this.lastFrameTime = 0;

            if (this.container && this.textStack && this.texts.length > 0) {
                this.init();
            }
        }

        init() {
            // Set all frames to hidden, show first
            this.texts.forEach((text, i) => {
                text.classList.remove('visible');
                if (i === 0) {
                    text.classList.add('visible');
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
            // Move to next frame
            this.currentIndex += this.direction;

            // Reverse direction at ends (ping-pong)
            if (this.currentIndex >= this.texts.length - 1) {
                this.currentIndex = this.texts.length - 1;
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
