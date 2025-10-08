// VISTAFLY — OPTIMIZED INTERACTIONS

(function() {
    'use strict';

    // === UTILITY FUNCTIONS ===
    var $ = function(selector, parent) {
        return (parent || document).querySelector(selector);
    };
    
    var $$ = function(selector, parent) {
        var elements = (parent || document).querySelectorAll(selector);
        var array = [];
        for (var i = 0; i < elements.length; i++) {
            array.push(elements[i]);
        }
        return array;
    };

    var throttle = function(func, delay) {
        var lastCall = 0;
        return function() {
            var args = arguments;
            var now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    };

    var debounce = function(func, delay) {
        var timeout;
        return function() {
            var args = arguments;
            var context = this;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, delay);
        };
    };

    // === NAVIGATION ===
    var Navigation = function() {
        this.nav = $('.navbar');
        this.hamburger = $('.hamburger');
        this.menu = $('.nav-menu');
        this.links = $$('.nav-link');
        this.sections = $$('section[id]');
        this.init();
    };

    Navigation.prototype.init = function() {
        this.setupSmoothScroll();
        this.setupMobileMenu();
        this.setupScrollEffects();
        this.setupActiveLinks();
    };

    Navigation.prototype.setupSmoothScroll = function() {
        var self = this;
        $$('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                var targetId = anchor.getAttribute('href');
                var target = $(targetId);

                if (target) {
                    var navHeight = self.nav.offsetHeight;
                    var targetPosition = target.offsetTop - navHeight;
                    window.scrollTo({ top: targetPosition, behavior: 'smooth' });
                    self.closeMobileMenu();
                }
            });
        });
    };

    Navigation.prototype.setupMobileMenu = function() {
        var self = this;
        if (!this.hamburger || !this.menu) return;

        this.hamburger.addEventListener('click', function() {
            self.toggleMobileMenu();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && self.menu.classList.contains('active')) {
                self.closeMobileMenu();
            }
        });

        document.addEventListener('click', function(e) {
            if (self.menu.classList.contains('active') && 
                !self.menu.contains(e.target) && 
                !self.hamburger.contains(e.target)) {
                self.closeMobileMenu();
            }
        });
    };

    Navigation.prototype.toggleMobileMenu = function() {
        this.menu.classList.toggle('active');
        this.hamburger.classList.toggle('active');
        document.body.style.overflow = this.menu.classList.contains('active') ? 'hidden' : '';
    };

    Navigation.prototype.closeMobileMenu = function() {
        this.menu.classList.remove('active');
        this.hamburger.classList.remove('active');
        document.body.style.overflow = '';
    };

    Navigation.prototype.setupScrollEffects = function() {
        var self = this;
        var handleScroll = throttle(function() {
            var scrollY = window.pageYOffset;
            if (scrollY > 100) {
                self.nav.classList.add('scrolled');
            } else {
                self.nav.classList.remove('scrolled');
            }
        }, 100);

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    };

    Navigation.prototype.setupActiveLinks = function() {
        var self = this;
        var updateActiveLink = throttle(function() {
            var scrollPosition = window.pageYOffset + window.innerHeight / 2;
            var documentHeight = document.documentElement.scrollHeight;
            var windowHeight = window.innerHeight;
            var current = '';
            
            if (window.pageYOffset + windowHeight >= documentHeight - 50) {
                current = 'contact';
            } else {
                self.sections.forEach(function(section) {
                    var sectionTop = section.offsetTop;
                    var sectionHeight = section.offsetHeight;
                    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                        current = section.getAttribute('id');
                    }
                });
            }

            self.links.forEach(function(link) {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        }, 100);

        window.addEventListener('scroll', updateActiveLink, { passive: true });
        updateActiveLink();
    };

    // === PARALLAX ===
    var ParallaxController = function() {
        if (window.innerWidth <= 1024) return;
        this.hero = $('.hero');
        this.heroContent = $('.hero-content');
        this.layers = $$('.layer');
        if (this.hero && this.heroContent) this.init();
    };

    ParallaxController.prototype.init = function() {
        var self = this;
        var handleParallax = throttle(function() {
            var scrollY = window.pageYOffset;
            var heroHeight = self.hero.offsetHeight;

            if (scrollY < heroHeight) {
                var translateY = scrollY * 0.5;
                var opacity = 1 - (scrollY / heroHeight) * 1.5;
                self.heroContent.style.transform = 'translateY(' + translateY + 'px)';
                self.heroContent.style.opacity = Math.max(0, opacity);

                self.layers.forEach(function(layer, index) {
                    var speed = 0.3 + (index * 0.1);
                    layer.style.transform = 'translateY(' + (scrollY * speed) + 'px)';
                });
            }
        }, 32);

        window.addEventListener('scroll', handleParallax, { passive: true });
    };

    // === SCROLL ANIMATIONS ===
    var ScrollAnimations = function() {
        this.init();
    };

    ScrollAnimations.prototype.init = function() {
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -100px 0px'
        });

        $$('.portfolio-item, .philosophy-card').forEach(function(el) {
            observer.observe(el);
        });
    };

    // === LAZY LOADER ===
    var LazyLoader = function() {
        this.placeholders = $$('.iframe-placeholder');
        this.loadedCount = 0;
        this.isMobile = window.innerWidth <= 768;
        this.activeIframe = null;
        this.observers = new Map();
        
        console.log('LazyLoader initialized');
        console.log('Placeholders found:', this.placeholders.length);
        console.log('Mobile mode:', this.isMobile);
        
        this.init();
    };

    LazyLoader.prototype.init = function() {
        if (this.isMobile) {
            this.initMobileMode();
        } else {
            this.initDesktopMode();
        }
    };

    LazyLoader.prototype.initMobileMode = function() {
        var self = this;
        this.placeholders.forEach(function(placeholder) {
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        console.log('Mobile: Loading iframe');
                        self.loadIframe(entry.target);
                    } else {
                        var previewFrame = entry.target.closest('.preview-frame');
                        if (previewFrame) {
                            var iframe = previewFrame.querySelector('iframe');
                            if (iframe) {
                                console.log('Mobile: Unloading iframe');
                                self.unloadIframe(iframe, previewFrame);
                            }
                        }
                    }
                });
            }, {
                rootMargin: '100px',
                threshold: 0.1
            });

            observer.observe(placeholder);
            self.observers.set(placeholder, observer);
        });
    };

    LazyLoader.prototype.initDesktopMode = function() {
        var self = this;
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    console.log('Desktop: Loading iframe');
                    self.loadIframe(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '300px',
            threshold: 0.01
        });

        this.placeholders.forEach(function(placeholder) {
            observer.observe(placeholder);
        });
    };

    LazyLoader.prototype.unloadIframe = function(iframe, previewFrame) {
        var self = this;
        var src = iframe.src;
        
        console.log('Unloading: ' + src);
        iframe.src = 'about:blank';
        
        var newPlaceholder = document.createElement('div');
        newPlaceholder.className = 'iframe-placeholder';
        newPlaceholder.dataset.src = src;
        newPlaceholder.innerHTML = '<div class="loading-spinner"></div><div class="load-status">Scroll to load...</div>';
        
        iframe.parentElement.removeChild(iframe);
        previewFrame.appendChild(newPlaceholder);
        
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    self.loadIframe(entry.target);
                } else {
                    var pf = entry.target.closest('.preview-frame');
                    if (pf) {
                        var ifr = pf.querySelector('iframe');
                        if (ifr) self.unloadIframe(ifr, pf);
                    }
                }
            });
        }, { rootMargin: '100px', threshold: 0.1 });

        observer.observe(newPlaceholder);
    };

    LazyLoader.prototype.loadIframe = function(placeholder) {
        var self = this;
        var src = placeholder.dataset.src;
        
        if (!src) {
            console.error('No src found');
            return;
        }

        if (this.isMobile && this.activeIframe && this.activeIframe.parentElement) {
            var previewFrame = this.activeIframe.closest('.preview-frame');
            if (previewFrame) {
                this.unloadIframe(this.activeIframe, previewFrame);
            }
        }

        console.log('Loading iframe: ' + src);

        var iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.style.cssText = 'width: 100%; height: 100%; border: none; display: block;';
        iframe.setAttribute('loading', 'lazy');
        iframe.setAttribute('allowfullscreen', '');

        iframe.addEventListener('load', function() {
            self.loadedCount++;
            console.log('Iframe loaded (' + self.loadedCount + '/' + self.placeholders.length + ')');
            if (self.isMobile) {
                self.activeIframe = iframe;
            }
        });

        iframe.addEventListener('error', function() {
            console.error('Iframe error: ' + src);
            self.showError(iframe, src);
        });

        var parent = placeholder.parentElement;
        parent.removeChild(placeholder);
        parent.appendChild(iframe);
    };

    LazyLoader.prototype.showError = function(iframe, src) {
        var errorDiv = document.createElement('div');
        errorDiv.className = 'iframe-placeholder error';
        errorDiv.innerHTML = '<div class="load-status">Unable to load<br><a href="' + src + '" target="_blank">Visit directly</a></div>';
        iframe.parentElement.replaceChild(errorDiv, iframe);
    };

    // === FORM HANDLER ===
    var FormHandler = function() {
        this.form = $('.contact-form');
        this.fields = $$('.form-field input, .form-field textarea');
        if (this.form) this.init();
    };

    FormHandler.prototype.init = function() {
        var self = this;
        this.fields.forEach(function(field) {
            field.setAttribute('placeholder', ' ');
        });

        this.form.addEventListener('submit', function(e) {
            e.preventDefault();
            var submitBtn = $('.btn-submit');
            var btnText = $('.btn-text', submitBtn);
            var originalText = btnText.textContent;

            submitBtn.disabled = true;
            btnText.textContent = 'Sending...';

            setTimeout(function() {
                btnText.textContent = 'Message sent!';
                submitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                self.form.reset();

                setTimeout(function() {
                    btnText.textContent = originalText;
                    submitBtn.style.background = '';
                    submitBtn.disabled = false;
                }, 3000);
            }, 1500);
        });
    };

    // === PAGE LOADER ===
    var PageLoader = function() {
        window.addEventListener('load', function() {
            document.body.classList.add('loaded');
        });
    };

    // === CUSTOM CURSOR ===
    var CustomCursor = function() {
        if (window.innerWidth <= 1024 || 'ontouchstart' in window) return;

        this.cursor = document.createElement('div');
        this.cursor.style.cssText = 'position:fixed;width:10px;height:10px;background:rgba(255,255,255,0.9);border-radius:50%;pointer-events:none;z-index:9999;opacity:0;mix-blend-mode:difference;transition:width 0.3s,height 0.3s,opacity 0.3s;';
        document.body.appendChild(this.cursor);

        this.position = { x: 0, y: 0 };
        this.target = { x: 0, y: 0 };
        this.isVisible = false;

        this.init();
    };

    CustomCursor.prototype.init = function() {
        var self = this;
        document.body.style.cursor = 'none';

        document.addEventListener('mousemove', function(e) {
            self.target.x = e.clientX;
            self.target.y = e.clientY;
            if (!self.isVisible) {
                self.isVisible = true;
                self.cursor.style.opacity = '1';
            }
        }, { passive: true });

        document.addEventListener('mouseleave', function() {
            self.isVisible = false;
            self.cursor.style.opacity = '0';
        });

        this.animate();
    };

    CustomCursor.prototype.animate = function() {
        var self = this;
        var lerp = function(start, end, factor) {
            return start + (end - start) * factor;
        };
        
        this.position.x = lerp(this.position.x, this.target.x, 0.15);
        this.position.y = lerp(this.position.y, this.target.y, 0.15);

        this.cursor.style.left = this.position.x + 'px';
        this.cursor.style.top = this.position.y + 'px';

        requestAnimationFrame(function() {
            self.animate();
        });
    };

    // === VIEWPORT FIX ===
    var ViewportFix = function() {
        this.setVH();
        var self = this;
        window.addEventListener('resize', debounce(function() {
            self.setVH();
        }, 250));
    };

    ViewportFix.prototype.setVH = function() {
        var vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', vh + 'px');
    };

    // === ACCESSIBILITY ===
    var AccessibilityEnhancer = function() {
        var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (prefersReducedMotion.matches) {
            document.body.classList.add('reduce-motion');
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-nav');
            }
        });

        document.addEventListener('mousedown', function() {
            document.body.classList.remove('keyboard-nav');
        });
    };

    // === INITIALIZATION ===
    var init = function() {
        console.log('VistaFly - Crafted with precision');

        new Navigation();
        new ParallaxController();
        new ScrollAnimations();
        new LazyLoader();
        new FormHandler();
        new PageLoader();
        new CustomCursor();
        new ViewportFix();
        new AccessibilityEnhancer();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();