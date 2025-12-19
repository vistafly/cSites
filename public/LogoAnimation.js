// Scarlo — Loading Screen Animation
// Cursor breaks out, logo vanishes instantly, click effect, done

(function() {
    'use strict';

    const TOTAL_FRAMES = 20;

    const CONFIG = {
        // Morph timing (fast to slow)
        manualTiming: [
            500, 400, 320, 260, 200, 150, 100, 70, 50, 40,
            40, 40, 50, 65, 85, 110, 150, 200, 280
        ],
        blendSteps: 8,
        blendDuration: 0.6,
        
        // Post-morph timing
        bloomDelay: 80,

        // Cursor sequence - SMOOTH & HUMAN-LIKE
        // Each delay is time AFTER the previous phase starts
        breakoutDelay: 300,      // Cursor appears and lifts up
        clickDelay: 750,         // Time to settle before clicking
        releaseDelay: 150,       // Click duration before release bounce
        fadeoutDelay: 300,       // Pause at released position before fading
        screenFadeDelay: 450,    // Screen fades after cursor fades
        
        minDisplayTime: 1800
    };

    let loadingStartTime = Date.now();

    class LoadingAnimation {
        constructor() {
            this.screen = document.getElementById('logoLoadingScreen');
            this.logoStack = document.getElementById('loadingLogoStack');
            this.logos = [];
            
            for (let i = 0; i < TOTAL_FRAMES; i++) {
                const el = document.getElementById('loadingLogo' + i);
                if (el) this.logos.push(el);
            }
            
            this.ambientDeep = document.getElementById('loadingAmbientDeep');
            this.ambientMid = document.getElementById('loadingAmbientMid');
            this.bloomWide = document.getElementById('loadingBloomWide');
            this.bloomSoft = document.getElementById('loadingBloomSoft');
            this.bloomCore = document.getElementById('loadingBloomCore');
            this.lensStreak = document.getElementById('loadingLensStreak');
            
            this.breakoutCursor = null;
            this.clickFlash = null;

            this.currentIndex = 0;
            this.isComplete = false;

            if (this.screen && this.logoStack && this.logos.length > 0) {
                this.injectElements();
                this.preloadImages().then(() => this.startAnimation());
            }
        }

        injectElements() {
            const container = document.getElementById('loadingLogoContainer');
            if (!container || document.getElementById('breakoutCursor')) return;

            const html = `
                <!-- Flash overlay for click impact -->
                <div class="click-flash-overlay" id="clickFlashOverlay"></div>

                <!-- Cursor breakout container -->
                <div class="cursor-breakout-container" id="cursorBreakoutContainer">
                    <div class="breakout-cursor" id="breakoutCursor">
                        <!-- Shadow -->
                        <div class="cursor-shadow"></div>

                        <!-- Tip glow -->
                        <div class="cursor-tip-glow"></div>

                        <!-- Pulse Rings -->
                        <div class="cursor-pulse-rings">
                            <div class="pulse-ring"></div>
                            <div class="pulse-ring"></div>
                            <div class="pulse-ring"></div>
                        </div>

                        <!-- Cursor image -->
                        <img class="breakout-cursor-img"
                             src="/images/cursor-only.png"
                             alt=""
                             draggable="false" />
                    </div>
                </div>
            `;

            container.insertAdjacentHTML('beforeend', html);

            this.breakoutCursor = document.getElementById('breakoutCursor');
            this.clickFlash = document.getElementById('clickFlashOverlay');
        }

        preloadImages() {
            const promises = [];
            
            // Preload all logo frames
            for (let i = 0; i < TOTAL_FRAMES; i++) {
                const paddedNum = i.toString().padStart(2, '0');
                promises.push(new Promise((resolve) => {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = resolve;
                    img.src = '/images/morph-logo' + paddedNum + '.png';
                }));
            }
            
            // Preload cursor
            promises.push(new Promise((resolve) => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = '/images/cursor-only.png';
            }));
            
            return Promise.all(promises);
        }

        startAnimation() {
            // Ambient layers fade in
            setTimeout(() => {
                if (this.ambientDeep) this.ambientDeep.classList.add('active');
            }, 200);

            setTimeout(() => {
                if (this.ambientMid) this.ambientMid.classList.add('active');
            }, 400);

            // Reset all logos
            this.logos.forEach((logo) => {
                logo.style.opacity = '0';
                logo.style.transition = 'none';
                logo.classList.remove('visible', 'fading-out', 'pulse-in');
            });

            // Show first logo
            this.logos[0].style.opacity = '1';
            this.logos[0].classList.add('visible');

            this.currentIndex = 0;
            this.runMorphSequence();
        }

        async runMorphSequence() {
            const timing = CONFIG.manualTiming;
            const numTransitions = Math.min(timing.length, this.logos.length - 1);
            
            for (let i = 0; i < numTransitions; i++) {
                await this.blendFrames(i, i + 1, timing[i]);
                this.currentIndex = i + 1;
            }
            
            this.onMorphComplete();
        }

        blendFrames(fromIndex, toIndex, duration) {
            return new Promise((resolve) => {
                const fromLogo = this.logos[fromIndex];
                const toLogo = this.logos[toIndex];
                
                if (!fromLogo || !toLogo) {
                    resolve();
                    return;
                }
                
                const steps = CONFIG.blendSteps;
                const blendTime = duration * CONFIG.blendDuration;
                const stepTime = blendTime / steps;
                let step = 0;
                
                const blend = () => {
                    if (step >= steps) {
                        fromLogo.style.opacity = '0';
                        fromLogo.classList.remove('visible');
                        toLogo.style.opacity = '1';
                        toLogo.classList.add('visible');
                        setTimeout(resolve, duration - blendTime);
                        return;
                    }
                    
                    const t = step / steps;
                    const eased = t * t * (3 - 2 * t);
                    
                    fromLogo.style.opacity = String(1 - eased);
                    toLogo.style.opacity = String(eased);
                    toLogo.classList.add('visible');
                    
                    step++;
                    setTimeout(blend, stepTime);
                };
                
                blend();
            });
        }

        onMorphComplete() {
            this.isComplete = true;
            const finalIndex = this.logos.length - 1;

            // Ensure only final logo is visible
            this.logos.forEach((logo, i) => {
                if (i === finalIndex) {
                    logo.style.opacity = '1';
                    logo.classList.add('visible');
                } else {
                    logo.style.opacity = '0';
                    logo.classList.remove('visible');
                }
            });

            // Bloom effects
            setTimeout(() => {
                if (this.bloomWide) this.bloomWide.classList.add('reveal');
            }, CONFIG.bloomDelay);

            setTimeout(() => {
                if (this.bloomSoft) this.bloomSoft.classList.add('reveal');
            }, CONFIG.bloomDelay + 40);

            setTimeout(() => {
                if (this.bloomCore) this.bloomCore.classList.add('reveal');
                if (this.lensStreak) this.lensStreak.classList.add('reveal');
            }, CONFIG.bloomDelay + 80);

            setTimeout(() => {
                if (this.logoStack) this.logoStack.classList.add('final-reveal');
            }, CONFIG.bloomDelay + 120);

            // ========== CURSOR SEQUENCE - SMOOTH & HUMAN-LIKE ==========
            let t = 0;

            // PHASE 1: Breakout - cursor lifts up smoothly
            t += CONFIG.breakoutDelay;
            setTimeout(() => this.phaseBreakout(), t);

            // PHASE 2: Click - press down
            t += CONFIG.clickDelay;
            setTimeout(() => this.phaseClick(), t);

            // PHASE 3: Release - bounce back up
            t += CONFIG.releaseDelay;
            setTimeout(() => this.phaseRelease(), t);

            // PHASE 4: Fadeout - drift away
            t += CONFIG.fadeoutDelay;
            setTimeout(() => this.phaseFadeout(), t);

            // Hide loading screen
            t += CONFIG.screenFadeDelay;
            setTimeout(() => this.hideLoadingScreen(), t);
        }

        // Helper to set cursor phase (replaces all phase classes)
        setCursorPhase(phase) {
            if (!this.breakoutCursor) return;
            this.breakoutCursor.classList.remove(
                'phase-breakout', 'phase-click', 'phase-release', 'phase-fadeout'
            );
            if (phase) {
                this.breakoutCursor.classList.add(phase);
            }
        }

        // PHASE 1: Cursor lifts up + logo vanishes
        phaseBreakout() {
            this.setCursorPhase('phase-breakout');

            // Logo vanishes immediately
            if (this.logoStack) {
                this.logoStack.classList.add('logo-clicked');
            }

            // Flash effect
            if (this.clickFlash) {
                this.clickFlash.classList.add('active');
            }

            // Fade ambient layers
            if (this.ambientDeep) {
                this.ambientDeep.style.transition = 'opacity 0.4s ease-out';
                this.ambientDeep.style.opacity = '0';
            }
            if (this.ambientMid) {
                this.ambientMid.style.transition = 'opacity 0.4s ease-out';
                this.ambientMid.style.opacity = '0';
            }
        }

        // PHASE 2: Click - press down
        phaseClick() {
            this.setCursorPhase('phase-click');
        }

        // PHASE 3: Release - bounce back after click
        phaseRelease() {
            this.setCursorPhase('phase-release');
        }

        // PHASE 4: Cursor drifts away
        phaseFadeout() {
            this.setCursorPhase('phase-fadeout');
        }

        hideLoadingScreen() {
            if (this.screen) {
                this.screen.classList.add('fade-out');
                setTimeout(() => {
                    this.screen.classList.add('hidden');
                    window.dispatchEvent(new CustomEvent('loadingComplete'));
                }, 800);
            }
        }
    }

    // Initialize
    let loadingAnimation = null;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadingAnimation = new LoadingAnimation();
        });
    } else {
        loadingAnimation = new LoadingAnimation();
    }

    // Failsafe
    window.addEventListener('load', () => {
        setTimeout(() => {
            const loadingScreen = document.getElementById('logoLoadingScreen');
            if (loadingScreen && !loadingScreen.classList.contains('fade-out')) {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    window.dispatchEvent(new CustomEvent('loadingComplete'));
                }, 800);
            }
        }, 10000);
    });

    window.LoadingAnimation = {
        get: () => loadingAnimation
    };

})();