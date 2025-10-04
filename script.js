// VISTAFLY — OPTIMIZED INTERACTIONS

(() => {
    'use strict';

    // === UTILITY FUNCTIONS ===
    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

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

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.menu.classList.contains('active')) {
                    this.closeMobileMenu();
                }
            });

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
            const handleScroll = throttle(() => {
                const scrollY = window.pageYOffset;
                
                if (scrollY > 100) {
                    this.nav.classList.add('scrolled');
                } else {
                    this.nav.classList.remove('scrolled');
                }
            }, 100);

            window.addEventListener('scroll', handleScroll, { passive: true });
            handleScroll();
        }

        setupActiveLinks() {
            const updateActiveLink = throttle(() => {
                const scrollPosition = window.pageYOffset + window.innerHeight / 2;
                const documentHeight = document.documentElement.scrollHeight;
                const windowHeight = window.innerHeight;

                let current = '';
                
                if (window.pageYOffset + windowHeight >= documentHeight - 50) {
                    current = 'contact';
                } else {
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
            updateActiveLink();
        }
    }

    // === OPTIMIZED PARALLAX (Desktop Only) ===
    class ParallaxController {
        constructor() {
            if (window.innerWidth <= 1024) return;

            this.hero = $('.hero');
            this.heroContent = $('.hero-content');
            this.layers = $$('.layer');
            
            if (this.hero && this.heroContent) {
                this.init();
            }
        }

        init() {
            const handleParallax = throttle(() => {
                const scrollY = window.pageYOffset;
                const heroHeight = this.hero.offsetHeight;

                if (scrollY < heroHeight) {
                    const translateY = scrollY * 0.5;
                    const opacity = 1 - (scrollY / heroHeight) * 1.5;

                    this.heroContent.style.transform = `translateY(${translateY}px)`;
                    this.heroContent.style.opacity = Math.max(0, opacity);

                    this.layers.forEach((layer, index) => {
                        const speed = 0.3 + (index * 0.1);
                        layer.style.transform = `translateY(${scrollY * speed}px)`;
                    });
                }
            }, 32);

            window.addEventListener('scroll', handleParallax, { passive: true });
        }
    }

    // === OPTIMIZED SCROLL ANIMATIONS ===
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

            $$('.portfolio-item, .philosophy-card').forEach(el => {
                observer.observe(el);
            });
        }
    }

    // === OPTIMIZED LAZY LOADING FOR IFRAMES ===
    class LazyLoader {
        constructor() {
            this.placeholders = $$('.iframe-placeholder');
            this.loadedIframes = new Set();
            this.init();
        }

        init() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.loadedIframes.has(entry.target)) {
                        this.loadIframe(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '400px'
            });

            this.placeholders.forEach(placeholder => {
                observer.observe(placeholder);
            });
        }

        loadIframe(placeholder) {
            const src = placeholder.dataset.src;
            if (!src) return;

            const iframe = document.createElement('iframe');
            iframe.src = src;
            iframe.loading = 'lazy';
            iframe.style.cssText = 'width: 100%; height: 100%; border: none; display: block;';
            
            placeholder.parentElement.replaceChild(iframe, placeholder);
            this.loadedIframes.add(placeholder);
        }
    }

    // === OPTIMIZED FORM HANDLER ===
    class FormHandler {
        constructor() {
            this.form = $('.contact-form');
            this.fields = $$('.form-field input, .form-field textarea');

            if (this.form) {
                this.init();
            }
        }

        init() {
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

            submitBtn.disabled = true;
            btnText.textContent = 'Sending...';

            await new Promise(resolve => setTimeout(resolve, 1500));

            btnText.textContent = 'Message sent!';
            submitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

            this.form.reset();

            setTimeout(() => {
                btnText.textContent = originalText;
                submitBtn.style.background = '';
                submitBtn.disabled = false;
            }, 3000);
        }
    }

    // === PAGE LOAD OPTIMIZATION ===
    class PageLoader {
        constructor() {
            this.init();
        }

        init() {
            window.addEventListener('load', () => {
                document.body.classList.add('loaded');
            });
        }
    }

    // === CUSTOM CURSOR (Desktop Only) ===
    class CustomCursor {
        constructor() {
            if (window.innerWidth <= 1024 || 'ontouchstart' in window) return;

            this.cursor = this.createCursor();
            this.position = { x: 0, y: 0 };
            this.target = { x: 0, y: 0 };
            this.isVisible = false;
            this.animationId = null;

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
            document.body.style.cursor = 'none';
            
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

            document.addEventListener('mousemove', (e) => {
                this.target.x = e.clientX;
                this.target.y = e.clientY;

                if (!this.isVisible) {
                    this.isVisible = true;
                    this.cursor.style.opacity = '1';
                }
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
            $$('.preview-frame').forEach(frame => {
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
            const hoverElements = $$('a, button, .portfolio-preview, .philosophy-card');

            hoverElements.forEach(el => {
                el.addEventListener('mouseenter', () => {
                    this.cursor.style.width = '30px';
                    this.cursor.style.height = '30px';
                });

                el.addEventListener('mouseleave', () => {
                    this.cursor.style.width = '10px';
                    this.cursor.style.height = '10px';
                });
            });
        }

        animate() {
            const lerp = (start, end, factor) => start + (end - start) * factor;
            
            this.position.x = lerp(this.position.x, this.target.x, 0.15);
            this.position.y = lerp(this.position.y, this.target.y, 0.15);

            this.cursor.style.left = `${this.position.x}px`;
            this.cursor.style.top = `${this.position.y}px`;

            this.animationId = requestAnimationFrame(() => this.animate());
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

    // === INITIALIZATION ===
    const init = () => {
        new Navigation();
        new ParallaxController();
        new ScrollAnimations();
        new LazyLoader();
        new FormHandler();
        new PageLoader();
        new CustomCursor();
        new ViewportFix();
        new AccessibilityEnhancer();

        console.log('%cVistaFly', 'font-size: 48px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;');
        console.log('%cCrafted with precision and attention to detail.', 'font-size: 14px; color: #86868b;');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();