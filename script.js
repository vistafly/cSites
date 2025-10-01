// ============================================
// VISTAFLY — PREMIUM INTERACTIONS
// Apple-inspired fluid animations and interactions
// ============================================

(() => {
    'use strict';

    // === CONFIGURATION ===
    const CONFIG = {
        scrollThreshold: 100,
        parallaxSpeed: 0.5,
        magneticStrength: 0.2,
        cursorSpeed: 0.15,
        staggerDelay: 150,
        iframeLoadMargin: '300px'
    };

    // === UTILITY FUNCTIONS ===
    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

    const lerp = (start, end, factor) => start + (end - start) * factor;

    const throttle = (func, delay) => {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func(...args);
            }
        };
    };

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    };

    // === NAVIGATION ===
    class Navigation {
        constructor() {
            this.nav = $('.navbar');
            this.hamburger = $('.hamburger');
            this.menu = $('.nav-menu');
            this.links = $$('.nav-link');
            this.sections = $$('section[id]');
            
            this.init();
        }

        init() {
            this.setupSmoothScroll();
            this.setupMobileMenu();
            this.setupScrollEffects();
            this.setupActiveLinks();
        }

        setupSmoothScroll() {
            $$('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = anchor.getAttribute('href');
                    const target = $(targetId);

                    if (target) {
                        const navHeight = this.nav.offsetHeight;
                        const targetPosition = target.offsetTop - navHeight;

                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });

                        this.closeMobileMenu();
                    }
                });
            });
        }

        setupMobileMenu() {
            if (!this.hamburger || !this.menu) return;

            this.hamburger.addEventListener('click', () => {
                this.toggleMobileMenu();
            });

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.menu.classList.contains('active')) {
                    this.closeMobileMenu();
                }
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (this.menu.classList.contains('active') && 
                    !this.menu.contains(e.target) && 
                    !this.hamburger.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });
        }

        toggleMobileMenu() {
            this.menu.classList.toggle('active');
            this.hamburger.classList.toggle('active');
            document.body.style.overflow = this.menu.classList.contains('active') ? 'hidden' : '';
        }

        closeMobileMenu() {
            this.menu.classList.remove('active');
            this.hamburger.classList.remove('active');
            document.body.style.overflow = '';
        }

        setupScrollEffects() {
    let ticking = false;
    let lastScrollY = 0;

    const handleScroll = () => {
        lastScrollY = window.pageYOffset;

        if (!ticking) {
            window.requestAnimationFrame(() => {
                // Only add 'scrolled' class when scroll position is greater than threshold
                // Remove it immediately when at or near top
                if (lastScrollY > 100) {
                    this.nav.classList.add('scrolled');
                } else {
                    this.nav.classList.remove('scrolled');
                }
                
                ticking = false;
            });

            ticking = true;
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Ensure correct initial state
    handleScroll();
}

        setupActiveLinks() {
    const updateActiveLink = throttle(() => {
        const scrollPosition = window.pageYOffset + window.innerHeight / 2;
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;

        let current = '';
        
        // Check if we're at the bottom of the page
        if (window.pageYOffset + windowHeight >= documentHeight - 50) {
            // Set to the last section (contact)
            current = 'contact';
        } else {
            // Normal section detection
            this.sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;

                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });
        }

        this.links.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }, 100);

    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink(); // Call once on load
}
    }

    // === PARALLAX EFFECTS ===
    class ParallaxController {
        constructor() {
            this.hero = $('.hero');
            this.heroContent = $('.hero-content');
            this.layers = $$('.layer');
            
            if (this.hero && this.heroContent) {
                this.init();
            }
        }

        init() {
            this.handleParallax = throttle(() => {
                const scrollY = window.pageYOffset;
                const heroHeight = this.hero.offsetHeight;

                if (scrollY < heroHeight) {
                    // Hero content parallax
                    const translateY = scrollY * CONFIG.parallaxSpeed;
                    const opacity = 1 - (scrollY / heroHeight) * 1.5;

                    this.heroContent.style.transform = `translateY(${translateY}px)`;
                    this.heroContent.style.opacity = Math.max(0, opacity);

                    // Layer parallax
                    this.layers.forEach((layer, index) => {
                        const speed = 0.3 + (index * 0.1);
                        layer.style.transform = `translateY(${scrollY * speed}px)`;
                    });
                }
            }, 16);

            window.addEventListener('scroll', this.handleParallax, { passive: true });
        }
    }

    // === SCROLL ANIMATIONS ===
    class ScrollAnimations {
        constructor() {
            this.observerOptions = {
                threshold: 0.15,
                rootMargin: '0px 0px -100px 0px'
            };

            this.init();
        }

        init() {
            this.setupIntersectionObserver();
            this.setupPortfolioAnimations();
            this.setupPhilosophyAnimations();
        }

        setupIntersectionObserver() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, this.observerOptions);

            // Observe all animatable elements
            $$('.portfolio-item, .philosophy-card').forEach(el => {
                observer.observe(el);
            });
        }

        setupPortfolioAnimations() {
            const portfolioObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const items = $$('.portfolio-item');
                        items.forEach((item, index) => {
                            setTimeout(() => {
                                item.classList.add('visible');
                            }, index * CONFIG.staggerDelay);
                        });
                        portfolioObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });

            const portfolioGrid = $('.portfolio-grid');
            if (portfolioGrid) {
                portfolioObserver.observe(portfolioGrid);
            }
        }

        setupPhilosophyAnimations() {
            $$('.philosophy-card').forEach((card, index) => {
                card.style.transitionDelay = `${index * 0.15}s`;
            });
        }
    }

    // === MAGNETIC INTERACTIONS ===
    class MagneticElements {
        constructor() {
            this.elements = $$('.btn-primary, .btn-submit, .project-link, .philosophy-card');
            this.init();
        }

        init() {
            this.elements.forEach(element => {
                element.addEventListener('mouseenter', () => {
                    element.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                });

                element.addEventListener('mousemove', (e) => {
                    this.applyMagneticEffect(element, e);
                });

                element.addEventListener('mouseleave', () => {
                    this.resetElement(element);
                });
            });
        }

        applyMagneticEffect(element, e) {
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const deltaX = (e.clientX - centerX) * CONFIG.magneticStrength;
            const deltaY = (e.clientY - centerY) * CONFIG.magneticStrength;

            element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        }

        resetElement(element) {
            element.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            element.style.transform = 'translate(0, 0)';
        }
    }

    // === CUSTOM CURSOR ===
class CustomCursor {
    constructor() {
        if (window.innerWidth <= 1024) return;

        this.cursor = this.createCursor();
        this.position = { x: 0, y: 0 };
        this.target = { x: 0, y: 0 };
        this.isVisible = false;

        this.init();
    }

    createCursor() {
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        cursor.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            opacity: 0;
            mix-blend-mode: difference;
            transition: width 0.3s ease, height 0.3s ease, opacity 0.3s ease;
        `;
        document.body.appendChild(cursor);
        return cursor;
    }

    init() {
        // Hide default cursor globally
        document.body.style.cursor = 'none';
        
        // Apply to all elements
        const style = document.createElement('style');
        style.textContent = `
            *, *::before, *::after {
                cursor: none !important;
            }
            .preview-frame, .preview-frame * {
                cursor: auto !important;
            }
        `;
        document.head.appendChild(style);

        // Mouse events
        document.addEventListener('mousemove', (e) => {
            this.target.x = e.clientX;
            this.target.y = e.clientY;

            if (!this.isVisible) {
                this.isVisible = true;
                this.cursor.style.opacity = '1';
            }
        });

        // Touch events
        document.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.target.x = touch.clientX;
            this.target.y = touch.clientY;

            if (!this.isVisible) {
                this.isVisible = true;
                this.cursor.style.opacity = '1';
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            this.target.x = touch.clientX;
            this.target.y = touch.clientY;
        }, { passive: true });

        document.addEventListener('mouseleave', () => {
            this.isVisible = false;
            this.cursor.style.opacity = '0';
        });

        this.setupHoverEffects();
        this.setupIframeCursorHide();
        this.animate();
    }

    setupIframeCursorHide() {
        const previewFrames = document.querySelectorAll('.preview-frame');
        
        previewFrames.forEach(frame => {
            frame.addEventListener('mouseenter', () => {
                this.cursor.style.opacity = '0';
            });

            frame.addEventListener('mouseleave', () => {
                if (this.isVisible) {
                    this.cursor.style.opacity = '1';
                }
            });
        });
    }

    setupHoverEffects() {
        const hoverElements = document.querySelectorAll('a, button, .portfolio-preview, .philosophy-card');

        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                this.cursor.style.width = '30px';
                this.cursor.style.height = '30px';
            });

            el.addEventListener('mouseleave', () => {
                this.cursor.style.width = '10px';
                this.cursor.style.height = '10px';
            });

            el.addEventListener('touchstart', () => {
                this.cursor.style.width = '30px';
                this.cursor.style.height = '30px';
            }, { passive: true });

            el.addEventListener('touchend', () => {
                this.cursor.style.width = '10px';
                this.cursor.style.height = '10px';
            }, { passive: true });
        });
    }

    animate() {
        this.position.x = lerp(this.position.x, this.target.x, CONFIG.cursorSpeed);
        this.position.y = lerp(this.position.y, this.target.y, CONFIG.cursorSpeed);

        this.cursor.style.left = `${this.position.x}px`;
        this.cursor.style.top = `${this.position.y}px`;

        requestAnimationFrame(() => this.animate());
    }
}
    // === LAZY LOADING ===
    class LazyLoader {
        constructor() {
            this.iframes = $$('.preview-frame iframe');
            this.init();
        }

        init() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadIframe(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: CONFIG.iframeLoadMargin
            });

            this.iframes.forEach(iframe => {
                const src = iframe.getAttribute('src');
                if (src) {
                    iframe.dataset.src = src;
                    iframe.removeAttribute('src');
                    observer.observe(iframe);
                }
            });
        }

        loadIframe(iframe) {
            const src = iframe.dataset.src;
            if (src) {
                iframe.src = src;
                iframe.classList.add('loaded');
            }
        }
    }

    // === FORM HANDLER ===
    class FormHandler {
        constructor() {
            this.form = $('.contact-form');
            this.fields = $$('.form-field input, .form-field textarea');

            if (this.form) {
                this.init();
            }
        }

        init() {
            // Add placeholder for label animation
            this.fields.forEach(field => {
                field.setAttribute('placeholder', ' ');
            });

            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        async handleSubmit(e) {
            e.preventDefault();

            const submitBtn = $('.btn-submit');
            const btnText = $('.btn-text', submitBtn);
            const originalText = btnText.textContent;

            // Loading state
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            btnText.textContent = 'Sending...';

            // Simulate API call
            await this.simulateApiCall();

            // Success state
            btnText.textContent = 'Message sent!';
            submitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

            // Reset form
            this.form.reset();

            // Reset button
            setTimeout(() => {
                btnText.textContent = originalText;
                submitBtn.style.background = '';
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }, 3000);
        }

        simulateApiCall() {
            return new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    // === PAGE LOAD ANIMATION ===
    class PageLoader {
        constructor() {
            this.init();
        }

        init() {
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity 0.6s ease';

            window.addEventListener('load', () => {
                document.body.style.opacity = '1';
                this.animateHeroElements();
            });
        }

        animateHeroElements() {
            const elements = $$('.hero-badge, .title-line, .hero-description, .hero-cta');
            elements.forEach((el, index) => {
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, index * 200);
            });
        }
    }

    // === VIEWPORT HEIGHT FIX ===
    class ViewportFix {
        constructor() {
            this.setVH();
            window.addEventListener('resize', debounce(() => this.setVH(), 250));
        }

        setVH() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
    }

    // === ACCESSIBILITY ===
    class AccessibilityEnhancer {
        constructor() {
            this.checkReducedMotion();
            this.setupKeyboardNavigation();
        }

        checkReducedMotion() {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

            if (prefersReducedMotion.matches) {
                document.body.classList.add('reduce-motion');
                
                // Disable animations
                const style = document.createElement('style');
                style.textContent = `
                    .reduce-motion * {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                `;
                document.head.appendChild(style);
            }
        }

        setupKeyboardNavigation() {
            // Focus visible for keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    document.body.classList.add('keyboard-nav');
                }
            });

            document.addEventListener('mousedown', () => {
                document.body.classList.remove('keyboard-nav');
            });
        }
    }

    // === PERFORMANCE MONITOR ===
    class PerformanceMonitor {
        constructor() {
            if ('PerformanceObserver' in window && window.location.hostname === 'localhost') {
                this.init();
            }
        }

        init() {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    console.log(`⚡ ${entry.name}: ${entry.duration.toFixed(2)}ms`);
                }
            });

            observer.observe({ entryTypes: ['measure', 'navigation'] });
        }
    }

    // === CONSOLE SIGNATURE ===
    class ConsoleBranding {
        constructor() {
            this.display();
        }

        display() {
            const styles = {
                title: 'font-size: 48px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;',
                subtitle: 'font-size: 14px; color: #86868b; margin-top: 8px;',
                cta: 'font-size: 14px; color: #fff; margin-top: 4px;'
            };

            console.log('%cVistaFly', styles.title);
            console.log('%cCrafted with precision and attention to detail.', styles.subtitle);
            console.log('%cInterested in working together? Let\'s connect.', styles.cta);
        }
    }

    // === INITIALIZATION ===
    const init = () => {
        new Navigation();
        new ParallaxController();
        new ScrollAnimations();
        new MagneticElements();
        new CustomCursor();
        new LazyLoader();
        new FormHandler();
        new PageLoader();
        new ViewportFix();
        new AccessibilityEnhancer();
        new PerformanceMonitor();
        new ConsoleBranding();
    };

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();