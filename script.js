// VISTAFLY — MOBILE-OPTIMIZED INTERACTIONS

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

    // === DEVICE DETECTION ===
    var DeviceDetector = {
        isMobile: function() {
            return window.innerWidth <= 1024 || 'ontouchstart' in window;
        },
        isLowEndDevice: function() {
            var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
            }
            return navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
        },
        isLaptopOrLarger: function() {
            return window.innerWidth >= 1024;
        }
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

    // === PARALLAX (Desktop Only) ===
    var ParallaxController = function() {
        if (DeviceDetector.isMobile()) return;
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

    // === PORTFOLIO HANDLER ===
    var PortfolioHandler = function() {
        this.thumbnails = $$('.portfolio-thumbnail');
        this.isMobile = DeviceDetector.isMobile();
        console.log('Portfolio Handler - Mobile mode:', this.isMobile);
        this.init();
    };

    PortfolioHandler.prototype.init = function() {
        var self = this;
        
        if (this.isMobile) {
            console.log('Mobile: Using thumbnail links only');
            this.thumbnails.forEach(function(thumbnail) {
                thumbnail.addEventListener('click', function() {
                    var url = thumbnail.getAttribute('data-url');
                    if (url) {
                        window.open(url, '_blank');
                    }
                });
            });
        } else {
            console.log('Desktop: Enabling iframe loading');
            this.setupDesktopIframes();
        }
    };

    PortfolioHandler.prototype.setupDesktopIframes = function() {
        var self = this;
        
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    self.loadIframe(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '500px',
            threshold: 0.01
        });

        this.thumbnails.forEach(function(thumbnail) {
            observer.observe(thumbnail);
        });
    };

    PortfolioHandler.prototype.loadIframe = function(thumbnail) {
        var url = thumbnail.getAttribute('data-url');
        
        if (!url) {
            console.error('No URL found for thumbnail');
            return;
        }

        console.log('Loading iframe:', url);

        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'width: 100%; height: 100%; border: none; display: block;';
        iframe.setAttribute('loading', 'lazy');
        iframe.setAttribute('allowfullscreen', '');

        iframe.addEventListener('load', function() {
            console.log('Iframe loaded:', url);
        });

        iframe.addEventListener('error', function() {
            console.error('Iframe error:', url);
            thumbnail.innerHTML = '<div class="thumbnail-overlay"><span>Failed to load preview</span></div>';
        });

        var parent = thumbnail.parentElement;
        parent.innerHTML = '';
        parent.appendChild(iframe);
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

    // === FIREBASE AUTH HANDLER ===
    var FirebaseAuthHandler = function() {
        this.authModal = $('#authModal');
        this.contractModal = $('#contractModal');
        this.currentUser = null;
        
        if (!this.authModal || !this.contractModal) {
            console.error('Auth or Contract modal not found');
            return;
        }
        
        this.init();
    };

    FirebaseAuthHandler.prototype.init = function() {
        var self = this;
        
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(function(user) {
                self.handleAuthStateChange(user);
            });
        } else {
            console.error('Firebase is not loaded.');
        }
        
        var authActionBtn = $('#authActionBtn');
        if (authActionBtn) {
            authActionBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (self.currentUser) {
                    if (confirm('Are you sure you want to sign out?')) {
                        self.handleLogout();
                    }
                } else {
                    self.showAuthModal();
                }
            });
        }
        
        var viewBtn = $('#viewContractBtn');
        if (viewBtn) {
            viewBtn.addEventListener('click', function(e) {
                e.preventDefault();
                self.checkAuthAndShowContract();
            });
        }
        
        var downloadBtn = $('#downloadTemplateBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', function(e) {
                e.preventDefault();
                self.checkAuthAndShowContract();
            });
        }
        
        var closeAuthBtn = $('#closeAuthBtn');
        if (closeAuthBtn) {
            closeAuthBtn.addEventListener('click', function() {
                self.closeAuthModal();
            });
        }
        
        var closeModalBtn = $('#closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', function() {
                self.closeContractModal();
            });
        }
        
        var loginForm = $('#loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                self.handleLogin();
            });
        }
        
        var authOverlay = $('.auth-overlay', this.authModal);
        if (authOverlay) {
            authOverlay.addEventListener('click', function() {
                self.closeAuthModal();
            });
        }
        
        var modalOverlay = $('.modal-overlay', this.contractModal);
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function() {
                self.closeContractModal();
            });
        }
    };

    FirebaseAuthHandler.prototype.checkAuthAndShowContract = function() {
        if (this.currentUser) {
            this.showContractModal();
        } else {
            this.showAuthModal();
        }
    };

    FirebaseAuthHandler.prototype.handleAuthStateChange = function(user) {
        this.currentUser = user;
        
        var authBtn = $('#authActionBtn');
        var authText = $('#authStatusText');
        
        if (user) {
            console.log('User signed in:', user.email);
            if (authBtn) authBtn.classList.add('logged-in');
            if (authText) authText.textContent = user.email.split('@')[0];
        } else {
            console.log('User signed out');
            if (authBtn) authBtn.classList.remove('logged-in');
            if (authText) authText.textContent = 'Sign In';
            this.closeContractModal();
        }
    };

    FirebaseAuthHandler.prototype.showAuthModal = function() {
        if (this.authModal) {
            this.authModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            document.body.classList.add('modal-open');
        }
    };

    FirebaseAuthHandler.prototype.closeAuthModal = function() {
        if (this.authModal) {
            this.authModal.classList.remove('show');
            document.body.style.overflow = '';
            document.body.classList.remove('modal-open');
        }
    };

    FirebaseAuthHandler.prototype.showContractModal = function() {
        if (this.contractModal) {
            this.contractModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            document.body.classList.add('modal-open');
            
            // Dispatch event to initialize signature pads after modal is visible
            setTimeout(function() {
                window.dispatchEvent(new CustomEvent('contractModalOpened'));
            }, 150);
        }
    };

    FirebaseAuthHandler.prototype.closeContractModal = function() {
        if (this.contractModal) {
            this.contractModal.classList.remove('show');
            document.body.style.overflow = '';
            document.body.classList.remove('modal-open');
        }
    };

    FirebaseAuthHandler.prototype.handleLogin = function() {
        var email = $('#loginEmail').value.trim();
        var password = $('#loginPassword').value;
        var errorEl = $('#loginError');
        var submitBtn = $('#loginForm button[type="submit"]');
        
        if (!email || !password) {
            this.showError(errorEl, 'Please fill in all fields');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
        
        var self = this;
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(function(userCredential) {
                console.log('Login successful');
                self.closeAuthModal();
                $('#loginForm').reset();
                setTimeout(function() {
                    self.showContractModal();
                }, 300);
            })
            .catch(function(error) {
                console.error('Login error:', error);
                self.showError(errorEl, self.getErrorMessage(error.code));
            })
            .finally(function() {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            });
    };

    FirebaseAuthHandler.prototype.handleLogout = function() {
        var self = this;
        firebase.auth().signOut()
            .then(function() {
                console.log('Logged out successfully');
                self.closeContractModal();
            })
            .catch(function(error) {
                console.error('Logout error:', error);
                alert('Error signing out. Please try again.');
            });
    };

    FirebaseAuthHandler.prototype.showError = function(element, message) {
        if (element) {
            element.textContent = message;
            element.classList.add('show');
            
            setTimeout(function() {
                element.classList.remove('show');
            }, 5000);
        }
    };

    FirebaseAuthHandler.prototype.getErrorMessage = function(errorCode) {
        var messages = {
            'auth/configuration-not-found': 'Firebase is not configured.',
            'auth/invalid-email': 'Invalid email address',
            'auth/user-not-found': 'No account found.',
            'auth/wrong-password': 'Incorrect password',
            'auth/too-many-requests': 'Too many failed attempts.',
            'auth/network-request-failed': 'Network error.',
            'auth/user-disabled': 'Account disabled.',
            'auth/invalid-credential': 'Invalid email or password'
        };
        
        return messages[errorCode] || 'Authentication error.';
    };

    // =====================================================
    // SIGNATURE PAD - SIMPLE WORKING VERSION
    // =====================================================
    function createSignaturePad(canvas) {
        if (!canvas) return null;
        
        var ctx = canvas.getContext('2d');
        var drawing = false;
        var hasContent = false;
        var lastX = 0;
        var lastY = 0;
        
        // Setup canvas size
        function resize() {
            var rect = canvas.getBoundingClientRect();
            var dpr = window.devicePixelRatio || 1;
            
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            
            // Set styles
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            console.log('Signature canvas sized:', rect.width, 'x', rect.height);
        }
        
        // Get coordinates from event
        function getPos(e) {
            var rect = canvas.getBoundingClientRect();
            var clientX, clientY;
            
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }
        
        // Start drawing
        function startDraw(e) {
            e.preventDefault();
            e.stopPropagation();
            
            drawing = true;
            hasContent = true;
            
            var pos = getPos(e);
            lastX = pos.x;
            lastY = pos.y;
            
            // Draw initial dot
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
            
            console.log('Sig start:', pos.x.toFixed(0), pos.y.toFixed(0));
        }
        
        // Continue drawing
        function moveDraw(e) {
            if (!drawing) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            var pos = getPos(e);
            
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            
            lastX = pos.x;
            lastY = pos.y;
        }
        
        // Stop drawing
        function endDraw(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            drawing = false;
        }
        
        // Clear canvas
        function clear() {
            var rect = canvas.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);
            hasContent = false;
            console.log('Signature cleared');
        }
        
        // Attach event listeners
        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', moveDraw);
        canvas.addEventListener('mouseup', endDraw);
        canvas.addEventListener('mouseleave', endDraw);
        
        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', moveDraw, { passive: false });
        canvas.addEventListener('touchend', endDraw, { passive: false });
        canvas.addEventListener('touchcancel', endDraw, { passive: false });
        
        // Set touch-action via JS as well
        canvas.style.touchAction = 'none';
        
        // Initial resize
        resize();
        
        console.log('Signature pad created for:', canvas.id);
        
        // Return public interface
        return {
            clear: clear,
            isEmpty: function() { return !hasContent; },
            toDataURL: function() { return canvas.toDataURL('image/png'); },
            resize: resize
        };
    }

    // === CONTRACT FORM HANDLER ===
    var ContractFormHandler = function() {
        this.form = $('#contractForm');
        if (!this.form) {
            console.log('Contract form not found');
            return;
        }
        
        this.devSignaturePad = null;
        this.clientSignaturePad = null;
        this.isDeveloper = false;
        this.currentContract = null;
        this.currentUserEmail = null;
        
        // Developer email loaded from environment variable (set in .env file)
        // Add VITE_DEVELOPER_EMAIL=your-email@gmail.com to your .env file
        this.DEVELOPER_EMAIL = (window.VITE_DEVELOPER_EMAIL || '').trim().toLowerCase();
        
        this.signaturePadsInitialized = false;
        this.formSetup = false;
        
        console.log('ContractFormHandler created');
        console.log('Developer email from env:', this.DEVELOPER_EMAIL || '(not set)');
        
        this.init();
    };

    ContractFormHandler.prototype.init = function() {
        var self = this;
        
        console.log('Initializing contract form handler');
        
        // Listen for modal open event to initialize signature pads and check role
        window.addEventListener('contractModalOpened', function() {
            console.log('Contract modal opened');
            
            // Re-check user role when modal opens (in case auth state changed)
            var user = firebase.auth().currentUser;
            if (user) {
                self.currentUserEmail = user.email.trim().toLowerCase();
                self.isDeveloper = self.currentUserEmail === self.DEVELOPER_EMAIL;
                
                console.log('=== ROLE CHECK ===');
                console.log('Current user email:', self.currentUserEmail);
                console.log('Developer email:', self.DEVELOPER_EMAIL);
                console.log('Emails match:', self.currentUserEmail === self.DEVELOPER_EMAIL);
                console.log('isDeveloper:', self.isDeveloper);
                console.log('==================');
                
                // Setup the correct view based on role
                if (self.isDeveloper) {
                    self.setupDeveloperView();
                } else {
                    self.setupClientView();
                }
            }
            
            // Initialize signature pads after view is set up
            setTimeout(function() {
                self.initializeSignaturePads();
            }, 100);
        });
        
        // Initial auth state check
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    self.currentUserEmail = user.email.trim().toLowerCase();
                    self.isDeveloper = self.currentUserEmail === self.DEVELOPER_EMAIL;
                    
                    console.log('Auth state changed - User:', self.currentUserEmail);
                    console.log('isDeveloper:', self.isDeveloper);
                    
                    self.setupForm();
                } else {
                    self.currentUserEmail = null;
                    self.isDeveloper = false;
                }
            });
        }
    };
    
    ContractFormHandler.prototype.initializeSignaturePads = function() {
        var self = this;
        
        console.log('Initializing signature pads, isDeveloper:', this.isDeveloper);
        
        var devCanvas = document.getElementById('devSignaturePad');
        var clientCanvas = document.getElementById('clientSignaturePad');
        
        // Initialize the appropriate signature pad based on role
        if (this.isDeveloper) {
            // Developer view - initialize dev signature pad
            if (devCanvas) {
                this.devSignaturePad = createSignaturePad(devCanvas);
                console.log('Dev signature pad created');
            }
        } else {
            // Client view - initialize client signature pad
            if (clientCanvas) {
                this.clientSignaturePad = createSignaturePad(clientCanvas);
                console.log('Client signature pad created');
            }
        }
        
        // Setup clear buttons (only once)
        if (!this.signaturePadsInitialized) {
            $$('.clear-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var canvasId = this.getAttribute('data-canvas');
                    console.log('Clear clicked:', canvasId);
                    
                    if (canvasId === 'devSignaturePad' && self.devSignaturePad) {
                        self.devSignaturePad.clear();
                    } else if (canvasId === 'clientSignaturePad' && self.clientSignaturePad) {
                        self.clientSignaturePad.clear();
                    }
                });
            });
            this.signaturePadsInitialized = true;
        }
        
        console.log('Signature pads initialized');
    };

    ContractFormHandler.prototype.setupForm = function() {
        var self = this;
        
        // Prevent multiple setups
        if (this.formSetup) {
            console.log('Form already setup, updating view only');
            if (this.isDeveloper) {
                this.setupDeveloperView();
            } else {
                this.setupClientView();
            }
            return;
        }
        
        // Show appropriate sections based on role
        if (this.isDeveloper) {
            this.setupDeveloperView();
        } else {
            this.setupClientView();
        }
        
        // Set today's date
        var today = new Date().toISOString().split('T')[0];
        var devDate = $('#devDate');
        var clientDate = $('#clientDate');
        if (devDate) devDate.value = today;
        if (clientDate) clientDate.value = today;
        
        // Update client name display
        var clientNameInput = $('#clientName');
        var clientNameDisplay = $('#clientNameDisplay');
        if (clientNameInput && clientNameDisplay) {
            clientNameInput.addEventListener('input', function() {
                clientNameDisplay.textContent = this.value || 'Client Name';
            });
        }
        
        // IMPORTANT: Prevent default form submission and handle via button click
        this.form.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Form submit prevented');
            return false;
        });
        
        // Handle submit button click directly
        var submitBtn = $('#submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Submit button clicked, isDeveloper:', self.isDeveloper);
                
                if (self.isDeveloper) {
                    self.handleDeveloperSubmit();
                } else {
                    self.handleClientSubmit();
                }
            });
        }
        
        var downloadBtn = $('#downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', function(e) {
                e.preventDefault();
                self.generatePDF();
            });
        }
        
        this.formSetup = true;
    };

    ContractFormHandler.prototype.setupDeveloperView = function() {
        console.log('Setting up developer view');
        
        // HIDE the entire contract form for developers initially
        var contractForm = $('#contractForm');
        if (contractForm) {
            contractForm.style.display = 'none';
        }
        
        // Show the developer dashboard instead
        this.showDeveloperDashboard();
        
        // Hide all signature blocks initially until a contract is selected
        var devBlock = $('#devSignatureBlock');
        if (devBlock) devBlock.style.display = 'none';
        
        var clientBlock = $('#clientSignatureBlock');
        if (clientBlock) clientBlock.style.display = 'none';
        
        var devPending = $('#devPendingBlock');
        if (devPending) devPending.style.display = 'none';
        
        // Disable all client form fields
        var clientNameField = $('#clientName');
        if (clientNameField) {
            clientNameField.disabled = true;
            clientNameField.removeAttribute('required');
            clientNameField.setAttribute('readonly', 'readonly');
        }
        
        var clientSignerName = $('#clientSignerName');
        if (clientSignerName) {
            clientSignerName.disabled = true;
            clientSignerName.removeAttribute('required');
        }
        
        var clientDate = $('#clientDate');
        if (clientDate) {
            clientDate.disabled = true;
            clientDate.removeAttribute('required');
        }
        
        var acknowledgment = $('#acknowledgment');
        if (acknowledgment) {
            acknowledgment.disabled = true;
            acknowledgment.removeAttribute('required');
            acknowledgment.checked = true;
        }
        
        var ackSection = $('.acknowledgment');
        if (ackSection) ackSection.style.display = 'none';
        
        // Hide submit button until contract is selected
        var submitBtn = $('#submitBtn');
        if (submitBtn) submitBtn.style.display = 'none';
        
        var downloadBtn = $('#downloadBtn');
        if (downloadBtn) downloadBtn.style.display = 'none';
    };
    
    ContractFormHandler.prototype.showDeveloperDashboard = function() {
        var self = this;
        
        console.log('Loading developer dashboard...');
        
        // HIDE the contract form when showing dashboard
        var contractForm = $('#contractForm');
        if (contractForm) {
            contractForm.style.display = 'none';
        }
        
        // HIDE the modal header for developer
        var modalHeader = $('.modal-header');
        if (modalHeader) {
            modalHeader.style.display = 'none';
        }
        
        // Create dashboard container if it doesn't exist
        var dashboard = $('#developerDashboard');
        if (!dashboard) {
            dashboard = document.createElement('div');
            dashboard.id = 'developerDashboard';
            dashboard.className = 'developer-dashboard';
            
            // Insert at the top of the modal content
            var modalContent = $('.modal-content');
            if (modalContent) {
                modalContent.insertBefore(dashboard, modalContent.firstChild);
            }
        }
        
        // Show loading state
        dashboard.innerHTML = '<div class="dashboard-loading"><p>Loading contracts...</p></div>';
        dashboard.style.display = 'block';
        
        // Fetch all contracts
        this.fetchAllContracts();
    };
    
    ContractFormHandler.prototype.fetchAllContracts = function() {
        var self = this;
        
        var pendingContracts = [];
        var completedContracts = [];
        
        // Fetch pending contracts
        firebase.firestore().collection('contracts')
            .where('status', '==', 'pending_developer')
            .get()
            .then(function(pendingSnapshot) {
                pendingSnapshot.forEach(function(doc) {
                    var data = doc.data();
                    data.id = doc.id;
                    data.daysSinceSubmission = self.calculateDaysSince(data.timestamp);
                    pendingContracts.push(data);
                });
                
                // Sort by days since submission (most urgent first)
                pendingContracts.sort(function(a, b) {
                    return b.daysSinceSubmission - a.daysSinceSubmission;
                });
                
                // Now fetch completed contracts
                return firebase.firestore().collection('contracts')
                    .where('status', '==', 'completed')
                    .get();
            })
            .then(function(completedSnapshot) {
                completedSnapshot.forEach(function(doc) {
                    var data = doc.data();
                    data.id = doc.id;
                    data.daysSinceSubmission = self.calculateDaysSince(data.timestamp);
                    completedContracts.push(data);
                });
                
                // Sort completed by finalized date (most recent first)
                completedContracts.sort(function(a, b) {
                    var aTime = a.finalizedTimestamp ? a.finalizedTimestamp.toDate().getTime() : 0;
                    var bTime = b.finalizedTimestamp ? b.finalizedTimestamp.toDate().getTime() : 0;
                    return bTime - aTime;
                });
                
                // Render the dashboard
                self.renderDeveloperDashboard(pendingContracts, completedContracts);
            })
            .catch(function(error) {
                console.error('Error fetching contracts:', error);
                var dashboard = $('#developerDashboard');
                if (dashboard) {
                    dashboard.innerHTML = '<div class="dashboard-error"><p>Error loading contracts: ' + error.message + '</p></div>';
                }
            });
    };
    
    ContractFormHandler.prototype.calculateDaysSince = function(timestamp) {
        if (!timestamp) return 0;
        
        var submissionDate;
        if (timestamp.toDate) {
            submissionDate = timestamp.toDate();
        } else if (timestamp instanceof Date) {
            submissionDate = timestamp;
        } else {
            submissionDate = new Date(timestamp);
        }
        
        var now = new Date();
        var diffTime = Math.abs(now - submissionDate);
        var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };
    
    ContractFormHandler.prototype.getUrgencyLevel = function(days) {
        if (days >= 7) return { level: 'critical', label: 'URGENT', color: '#ef4444', icon: '🔴' };
        if (days >= 3) return { level: 'high', label: 'ACTION NEEDED', color: '#f59e0b', icon: '🟠' };
        if (days >= 1) return { level: 'medium', label: 'NEW', color: '#3b82f6', icon: '🔵' };
        return { level: 'low', label: 'JUST IN', color: '#10b981', icon: '🟢' };
    };
    
    ContractFormHandler.prototype.formatCurrency = function(amount) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
    };
    
    ContractFormHandler.prototype.renderDeveloperDashboard = function(pendingContracts, completedContracts) {
        var self = this;
        var dashboard = $('#developerDashboard');
        
        if (!dashboard) return;
        
        // Calculate business metrics
        var totalContracts = pendingContracts.length + completedContracts.length;
        var urgentCount = pendingContracts.filter(function(c) { return c.daysSinceSubmission >= 7; }).length;
        var thisMonthCompleted = completedContracts.filter(function(c) {
            if (!c.finalizedTimestamp) return false;
            var date = c.finalizedTimestamp.toDate ? c.finalizedTimestamp.toDate() : new Date(c.finalizedTimestamp);
            var now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;
        
        var html = '';
        
        // Header with greeting
        var hour = new Date().getHours();
        var greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
        
        html += '<div class="dashboard-header">' +
            '<div class="header-content">' +
            '<h2>' + greeting + ', Carlos 👋</h2>' +
            '<p class="header-subtitle">Here\'s your business overview</p>' +
            '</div>' +
            '<div class="header-date">' +
            '<span class="current-date">' + new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</span>' +
            '</div>' +
            '</div>';
        
        // Alert Banner (if urgent contracts exist)
        if (urgentCount > 0) {
            html += '<div class="alert-banner urgent">' +
                '<div class="alert-icon">⚠️</div>' +
                '<div class="alert-content">' +
                '<strong>' + urgentCount + ' contract' + (urgentCount !== 1 ? 's' : '') + ' need' + (urgentCount === 1 ? 's' : '') + ' immediate attention!</strong>' +
                '<p>Client' + (urgentCount !== 1 ? 's have' : ' has') + ' been waiting 7+ days for your signature.</p>' +
                '</div>' +
                '</div>';
        } else if (pendingContracts.length === 0 && completedContracts.length > 0) {
            html += '<div class="alert-banner success">' +
                '<div class="alert-icon">🎉</div>' +
                '<div class="alert-content">' +
                '<strong>All caught up!</strong>' +
                '<p>No pending contracts. Great job staying on top of things!</p>' +
                '</div>' +
                '</div>';
        }
        
        // Quick Stats Row
        html += '<div class="quick-stats">' +
            '<div class="quick-stat action-required">' +
            '<div class="quick-stat-icon">📝</div>' +
            '<div class="quick-stat-content">' +
            '<span class="quick-stat-number">' + pendingContracts.length + '</span>' +
            '<span class="quick-stat-label">Awaiting Signature</span>' +
            '</div>' +
            '</div>' +
            '<div class="quick-stat completed-stat">' +
            '<div class="quick-stat-icon">✅</div>' +
            '<div class="quick-stat-content">' +
            '<span class="quick-stat-number">' + completedContracts.length + '</span>' +
            '<span class="quick-stat-label">Completed</span>' +
            '</div>' +
            '</div>' +
            '<div class="quick-stat monthly-stat">' +
            '<div class="quick-stat-icon">📈</div>' +
            '<div class="quick-stat-content">' +
            '<span class="quick-stat-number">' + thisMonthCompleted + '</span>' +
            '<span class="quick-stat-label">This Month</span>' +
            '</div>' +
            '</div>' +
            '</div>';
        
        // Action Required Section (Pending Contracts)
        html += '<div class="dashboard-section action-section">' +
            '<div class="section-header">' +
            '<h3>🖊️ Action Required</h3>' +
            '<span class="section-badge">' + pendingContracts.length + ' pending</span>' +
            '</div>';
        
        if (pendingContracts.length === 0) {
            html += '<div class="empty-state success-state">' +
                '<div class="empty-icon">✨</div>' +
                '<p>No contracts waiting for your signature</p>' +
                '</div>';
        } else {
            html += '<div class="action-list">';
            pendingContracts.forEach(function(contract, index) {
                var urgency = self.getUrgencyLevel(contract.daysSinceSubmission);
                var submissionDate = contract.timestamp ? 
                    (contract.timestamp.toDate ? contract.timestamp.toDate().toLocaleDateString() : new Date(contract.timestamp).toLocaleDateString()) 
                    : 'N/A';
                
                html += '<div class="action-item" data-contract-id="' + contract.id + '">' +
                    '<div class="action-priority" style="background: ' + urgency.color + ';">' +
                    '<span class="priority-number">#' + (index + 1) + '</span>' +
                    '</div>' +
                    '<div class="action-details">' +
                    '<div class="action-client">' +
                    '<h4>' + (contract.clientName || 'Unknown Client') + '</h4>' +
                    '<span class="urgency-tag" style="background: ' + urgency.color + '22; color: ' + urgency.color + ';">' + urgency.icon + ' ' + urgency.label + '</span>' +
                    '</div>' +
                    '<div class="action-meta">' +
                    '<span class="meta-item"><strong>Email:</strong> ' + (contract.clientEmail || 'N/A') + '</span>' +
                    '<span class="meta-item"><strong>Waiting:</strong> ' + contract.daysSinceSubmission + ' day' + (contract.daysSinceSubmission !== 1 ? 's' : '') + '</span>' +
                    '<span class="meta-item"><strong>Received:</strong> ' + submissionDate + '</span>' +
                    '</div>' +
                    '</div>' +
                    '<div class="action-cta">' +
                    '<button class="btn-sign-contract" data-contract-id="' + contract.id + '">' +
                    '<span class="btn-icon">✍️</span>' +
                    '<span class="btn-text">Sign Now</span>' +
                    '</button>' +
                    '</div>' +
                    '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        // Completed Contracts Section
        html += '<div class="dashboard-section history-section">' +
            '<div class="section-header">' +
            '<h3>📁 Completed Contracts</h3>' +
            '<span class="section-badge success">' + completedContracts.length + ' total</span>' +
            '</div>';
        
        if (completedContracts.length === 0) {
            html += '<div class="empty-state">' +
                '<div class="empty-icon">📋</div>' +
                '<p>No completed contracts yet</p>' +
                '</div>';
        } else {
            html += '<div class="history-list">';
            completedContracts.forEach(function(contract) {
                var finalizedDate = contract.finalizedTimestamp ? 
                    (contract.finalizedTimestamp.toDate ? contract.finalizedTimestamp.toDate().toLocaleDateString() : new Date(contract.finalizedTimestamp).toLocaleDateString()) 
                    : 'N/A';
                
                html += '<div class="history-item" data-contract-id="' + contract.id + '">' +
                    '<div class="history-status">' +
                    '<span class="status-icon">✓</span>' +
                    '</div>' +
                    '<div class="history-details">' +
                    '<h4>' + (contract.clientName || 'Unknown Client') + '</h4>' +
                    '<span class="history-meta">Completed ' + finalizedDate + '</span>' +
                    '</div>' +
                    '<div class="history-actions">' +
                    '<button class="btn-download" data-contract-id="' + contract.id + '" title="Download PDF">' +
                    '📄 Download' +
                    '</button>' +
                    '</div>' +
                    '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        // Close Modal Button
        html += '<div class="dashboard-footer">' +
            '<button class="btn-close-dashboard" onclick="document.querySelector(\'.contract-modal\').classList.remove(\'show\'); document.body.classList.remove(\'modal-open\');">Close Dashboard</button>' +
            '</div>';
        
        dashboard.innerHTML = html;
        
        // Add event listeners for sign buttons
        $$('.btn-sign-contract').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                var contractId = this.getAttribute('data-contract-id');
                self.selectContractToSign(contractId, pendingContracts);
            });
        });
        
        // Add event listeners for download buttons
        $$('.btn-download').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                var contractId = this.getAttribute('data-contract-id');
                self.viewCompletedContract(contractId, completedContracts);
            });
        });
    };
    
    ContractFormHandler.prototype.selectContractToSign = function(contractId, contracts) {
        var self = this;
        
        // Find the contract
        var contract = contracts.find(function(c) { return c.id === contractId; });
        if (!contract) {
            alert('Contract not found');
            return;
        }
        
        console.log('Selected contract to sign:', contractId);
        
        // Store as current contract
        this.currentContract = { id: contractId, data: contract };
        
        // Hide dashboard
        var dashboard = $('#developerDashboard');
        if (dashboard) dashboard.style.display = 'none';
        
        // SHOW the contract form
        var contractForm = $('#contractForm');
        if (contractForm) {
            contractForm.style.display = 'block';
        }
        
        // Show the contract form sections
        this.showContractSigningForm(contract);
    };
    
    ContractFormHandler.prototype.showContractSigningForm = function(contract) {
        var self = this;
        
        // Make sure contract form is visible
        var contractForm = $('#contractForm');
        if (contractForm) {
            contractForm.style.display = 'block';
        }
        
        // Show modal header when signing a contract
        var modalHeader = $('.modal-header');
        if (modalHeader) {
            modalHeader.style.display = 'block';
        }
        
        // Show developer signature block
        var devBlock = $('#devSignatureBlock');
        if (devBlock) {
            devBlock.style.display = 'block';
            var devInputs = devBlock.querySelectorAll('input');
            devInputs.forEach(function(input) {
                input.disabled = false;
            });
            
            var devHeader = devBlock.querySelector('h3');
            if (devHeader) {
                devHeader.innerHTML = 'Developer Signature — VistaFly <span style="font-size: 12px; color: #f59e0b;">⏳ Sign Below</span>';
            }
        }
        
        // Set today's date for developer
        var today = new Date().toISOString().split('T')[0];
        var devDate = $('#devDate');
        if (devDate) devDate.value = today;
        
        // Populate form with client data
        this.populateFormWithContract(contract);
        
        // Show submit button
        var submitBtn = $('#submitBtn');
        if (submitBtn) {
            submitBtn.style.display = 'inline-flex';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span id="submitBtnText">Upload & Finalize</span>';
            submitBtn.style.background = '';
        }
        
        // Add back button to return to dashboard (remove existing one first)
        var existingBackBtn = $('#backToDashboard');
        if (existingBackBtn) {
            existingBackBtn.remove();
        }
        
        var backBtn = document.createElement('button');
        backBtn.id = 'backToDashboard';
        backBtn.className = 'btn btn-secondary';
        backBtn.innerHTML = '← Back to Dashboard';
        backBtn.style.marginRight = '10px';
        backBtn.onclick = function(e) {
            e.preventDefault();
            self.showDeveloperDashboard();
            // Reset signature pad
            if (self.devSignaturePad) self.devSignaturePad.clear();
        };
        
        var actionButtons = $('.action-buttons');
        if (actionButtons) {
            actionButtons.insertBefore(backBtn, actionButtons.firstChild);
        }
        
        // Initialize developer signature pad
        setTimeout(function() {
            var devCanvas = document.getElementById('devSignaturePad');
            if (devCanvas) {
                self.devSignaturePad = createSignaturePad(devCanvas);
                console.log('Dev signature pad initialized for signing');
            }
        }, 200);
    };
    
    ContractFormHandler.prototype.viewCompletedContract = function(contractId, contracts) {
        var self = this;
        
        // Find the contract
        var contract = contracts.find(function(c) { return c.id === contractId; });
        if (!contract) {
            alert('Contract not found');
            return;
        }
        
        console.log('Viewing completed contract:', contractId);
        
        // Store as current contract for PDF generation
        this.currentContract = { id: contractId, data: contract };
        
        // Generate PDF directly
        this.generatePDF();
    };

    ContractFormHandler.prototype.setupClientView = function() {
        console.log('Setting up client view');
        
        var self = this;
        
        var devBlock = $('#devSignatureBlock');
        if (devBlock) {
            devBlock.style.display = 'none';
            // Disable developer fields so they don't trigger validation
            var devInputs = devBlock.querySelectorAll('input');
            devInputs.forEach(function(input) {
                input.disabled = true;
                input.removeAttribute('required');
            });
        }
        
        var clientBlock = $('#clientSignatureBlock');
        if (clientBlock) {
            clientBlock.style.display = 'block';
            // Enable client fields
            var clientInputs = clientBlock.querySelectorAll('input');
            clientInputs.forEach(function(input) {
                input.disabled = false;
            });
        }
        
        var devPending = $('#devPendingBlock');
        if (devPending) devPending.style.display = 'block';
        
        var submitBtn = $('#submitBtnText');
        if (submitBtn) submitBtn.textContent = 'Submit Agreement';
        
        var downloadBtn = $('#downloadBtn');
        if (downloadBtn) downloadBtn.style.display = 'none';
        
        // Check if client has any existing contracts
        this.checkClientContracts();
    };
    
    ContractFormHandler.prototype.checkClientContracts = function() {
        var self = this;
        var userEmail = firebase.auth().currentUser.email;
        
        console.log('Checking for existing contracts for:', userEmail);
        
        // First check for completed contracts
        firebase.firestore().collection('contracts')
            .where('clientEmail', '==', userEmail)
            .where('status', '==', 'completed')
            .orderBy('finalizedTimestamp', 'desc')
            .limit(1)
            .get()
            .then(function(querySnapshot) {
                if (!querySnapshot.empty) {
                    var doc = querySnapshot.docs[0];
                    self.showCompletedContract(doc.id, doc.data());
                } else {
                    // Check for pending contracts
                    self.checkPendingClientContract(userEmail);
                }
            })
            .catch(function(error) {
                console.error('Error checking completed contracts:', error);
                // If index error, try without ordering
                self.checkPendingClientContract(userEmail);
            });
    };
    
    ContractFormHandler.prototype.checkPendingClientContract = function(userEmail) {
        var self = this;
        
        firebase.firestore().collection('contracts')
            .where('clientEmail', '==', userEmail)
            .where('status', '==', 'pending_developer')
            .limit(1)
            .get()
            .then(function(querySnapshot) {
                if (!querySnapshot.empty) {
                    self.showPendingStatus();
                }
            })
            .catch(function(error) {
                console.error('Error checking pending contracts:', error);
            });
    };
    
    ContractFormHandler.prototype.showCompletedContract = function(contractId, data) {
        console.log('Showing completed contract:', contractId);
        
        var self = this;
        
        // Mark this as a completed contract view (prevents validation)
        this.isViewingCompletedContract = true;
        
        // Hide the form sections that shouldn't be shown
        var devPending = $('#devPendingBlock');
        if (devPending) devPending.style.display = 'none';
        
        var acknowledgment = $('.acknowledgment');
        if (acknowledgment) acknowledgment.style.display = 'none';
        
        // Populate form with completed data (read-only)
        var clientNameField = $('#clientName');
        if (clientNameField) {
            clientNameField.value = data.clientName || '';
            clientNameField.setAttribute('readonly', 'readonly');
            clientNameField.disabled = true;
        }
        
        // Create or update success message
        var messageDiv = $('#clientSubmitMessage');
        if (messageDiv) {
            messageDiv.innerHTML = '<p><strong>✓ Your contract has been fully executed!</strong></p>' +
                '<p>Both you and the developer have signed the agreement.</p>' +
                '<p>Contract Date: ' + (data.clientDate || 'N/A') + '</p>' +
                '<p>Finalized: ' + (data.finalizedTimestamp ? new Date(data.finalizedTimestamp.toDate()).toLocaleDateString() : 'N/A') + '</p>';
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(46, 204, 113, 0.15)';
            messageDiv.style.borderColor = 'rgba(46, 204, 113, 0.4)';
        }
        
        // Store the contract data for PDF generation BEFORE setting up button
        this.currentContract = { id: contractId, data: data };
        
        // Replace the submit button with a new one to remove old event listeners
        var oldSubmitBtn = $('#submitBtn');
        if (oldSubmitBtn) {
            var newSubmitBtn = oldSubmitBtn.cloneNode(true);
            newSubmitBtn.innerHTML = '<span>📄 Download Signed Contract</span>';
            newSubmitBtn.style.display = 'inline-flex';
            newSubmitBtn.disabled = false;
            newSubmitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            
            // Replace old button with new one (removes all old event listeners)
            oldSubmitBtn.parentNode.replaceChild(newSubmitBtn, oldSubmitBtn);
            
            // Add new click handler for PDF download only
            newSubmitBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Download button clicked - generating PDF');
                self.generatePDF();
            });
        }
        
        // Show both signatures
        this.displayBothSignatures(data);
    };
    
    ContractFormHandler.prototype.displayBothSignatures = function(data) {
        var self = this;
        
        console.log('Displaying both signatures...');
        console.log('Client signature exists:', !!data.clientSignature);
        console.log('Dev signature exists:', !!data.devSignature);
        
        // Show client signature block (read-only)
        var clientBlock = $('#clientSignatureBlock');
        if (clientBlock) {
            clientBlock.style.display = 'block';
            clientBlock.style.opacity = '1';
            clientBlock.style.pointerEvents = 'none';
            
            // Update client signer name and date
            var clientSignerName = $('#clientSignerName');
            if (clientSignerName) {
                clientSignerName.value = data.clientSignerName || '';
                clientSignerName.setAttribute('readonly', 'readonly');
            }
            
            var clientDateField = $('#clientDate');
            if (clientDateField) {
                clientDateField.value = data.clientDate || '';
                clientDateField.setAttribute('readonly', 'readonly');
            }
            
            // Hide clear button
            var clearBtn = document.querySelector('.clear-btn[data-canvas="clientSignaturePad"]');
            if (clearBtn) clearBtn.style.display = 'none';
        }
        
        // Show developer signature block (read-only)
        var devBlock = $('#devSignatureBlock');
        if (devBlock) {
            devBlock.style.display = 'block';
            devBlock.style.opacity = '1';
            devBlock.style.pointerEvents = 'none';
            
            // Update dev name and date
            var devName = $('#devName');
            if (devName) {
                devName.value = data.devName || 'Carlos Martin';
                devName.setAttribute('readonly', 'readonly');
            }
            
            var devDateField = $('#devDate');
            if (devDateField) {
                devDateField.value = data.devDate || '';
                devDateField.setAttribute('readonly', 'readonly');
            }
            
            // Hide clear button
            var devClearBtn = document.querySelector('.clear-btn[data-canvas="devSignaturePad"]');
            if (devClearBtn) devClearBtn.style.display = 'none';
        }
        
        // Draw signatures after a delay to ensure canvases are visible and have dimensions
        setTimeout(function() {
            // Draw client signature
            if (data.clientSignature) {
                var clientCanvas = document.getElementById('clientSignaturePad');
                if (clientCanvas) {
                    self.drawSignatureOnCanvas(clientCanvas, data.clientSignature);
                }
            }
            
            // Draw developer signature
            if (data.devSignature) {
                var devCanvas = document.getElementById('devSignaturePad');
                if (devCanvas) {
                    self.drawSignatureOnCanvas(devCanvas, data.devSignature);
                }
            }
        }, 300);
        
        // Hide the pending block
        var devPending = $('#devPendingBlock');
        if (devPending) devPending.style.display = 'none';
    };
    
    ContractFormHandler.prototype.drawSignatureOnCanvas = function(canvas, signatureData) {
        if (!canvas || !signatureData) {
            console.log('Missing canvas or signature data');
            return;
        }
        
        var rect = canvas.getBoundingClientRect();
        console.log('Canvas rect:', rect.width, rect.height);
        
        // If canvas has no dimensions, try to set default size
        if (rect.width === 0 || rect.height === 0) {
            canvas.style.width = '100%';
            canvas.style.height = '150px';
            rect = canvas.getBoundingClientRect();
        }
        
        var dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        // Clear canvas first
        ctx.clearRect(0, 0, rect.width, rect.height);
        
        var img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
            console.log('Signature drawn on canvas');
        };
        img.onerror = function() {
            console.error('Failed to load signature image');
        };
        img.src = signatureData;
    };
    
    ContractFormHandler.prototype.showPendingStatus = function() {
        console.log('Client has a pending contract');
        
        // Hide signature input
        var clientBlock = $('#clientSignatureBlock');
        if (clientBlock) clientBlock.style.display = 'none';
        
        // Update the pending message
        var messageDiv = $('#clientSubmitMessage');
        if (messageDiv) {
            messageDiv.innerHTML = '<p><strong>⏳ Your agreement is pending developer signature</strong></p>' +
                '<p>You have already signed this agreement. The developer will review and sign it shortly.</p>' +
                '<p>You will be able to download the fully executed contract once both parties have signed.</p>';
            messageDiv.style.display = 'block';
            messageDiv.style.background = 'rgba(241, 196, 15, 0.15)';
            messageDiv.style.borderColor = 'rgba(241, 196, 15, 0.4)';
        }
        
        // Hide submit button
        var submitBtn = $('#submitBtn');
        if (submitBtn) submitBtn.style.display = 'none';
    };

    ContractFormHandler.prototype.loadPendingContract = function() {
        var self = this;
        
        console.log('Loading pending contracts...');
        
        firebase.firestore().collection('contracts')
            .where('status', '==', 'pending_developer')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get()
            .then(function(querySnapshot) {
                if (!querySnapshot.empty) {
                    var doc = querySnapshot.docs[0];
                    self.currentContract = { id: doc.id, data: doc.data() };
                    self.populateFormWithContract(self.currentContract.data);
                    console.log('Loaded pending contract:', self.currentContract.id);
                } else {
                    console.log('No pending contracts found');
                }
            })
            .catch(function(error) {
                console.error('Error loading pending contract:', error);
            });
    };

    ContractFormHandler.prototype.populateFormWithContract = function(data) {
        console.log('Populating form for developer with client data:', data.clientName);
        
        // Show a message about which contract is being signed
        var contractInfo = document.createElement('div');
        contractInfo.id = 'pendingContractInfo';
        contractInfo.style.cssText = 'background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center;';
        contractInfo.innerHTML = '<p style="margin: 0; color: #fff;"><strong>📋 Pending Contract from Client</strong></p>' +
            '<p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.8);">Client: <strong>' + (data.clientName || 'N/A') + '</strong> | ' +
            'Submitted: <strong>' + (data.clientDate || 'N/A') + '</strong></p>';
        
        // Insert at the top of the signatures section
        var signaturesSection = $('.signatures');
        if (signaturesSection && !$('#pendingContractInfo')) {
            signaturesSection.insertBefore(contractInfo, signaturesSection.firstChild.nextSibling);
        }
        
        // Populate client name field (read-only, just for display)
        var clientName = $('#clientName');
        if (clientName) {
            clientName.value = data.clientName || '';
            clientName.setAttribute('readonly', 'readonly');
            clientName.disabled = true;
            clientName.style.opacity = '0.7';
        }
        
        // Update client name display in header
        var clientNameDisplay = $('#clientNameDisplay');
        if (clientNameDisplay) clientNameDisplay.textContent = data.clientName || 'Client Name';
        
        // Show client signature block with their signature (read-only display)
        var clientBlock = $('#clientSignatureBlock');
        if (clientBlock && data.clientSignature) {
            clientBlock.style.display = 'block';
            clientBlock.style.opacity = '0.7';
            clientBlock.style.pointerEvents = 'none';
            
            // Add a label showing this is the client's signature
            var clientHeader = clientBlock.querySelector('h3');
            if (clientHeader) {
                clientHeader.innerHTML = 'Client Signature — ' + (data.clientName || 'Client') + ' <span style="font-size: 12px; color: #10b981;">✓ Signed</span>';
            }
            
            // Update client signer name and date (read-only)
            var clientSignerName = $('#clientSignerName');
            if (clientSignerName) {
                clientSignerName.value = data.clientSignerName || '';
                clientSignerName.setAttribute('readonly', 'readonly');
                clientSignerName.disabled = true;
            }
            
            var clientDateField = $('#clientDate');
            if (clientDateField) {
                clientDateField.value = data.clientDate || '';
                clientDateField.setAttribute('readonly', 'readonly');
                clientDateField.disabled = true;
            }
            
            // Display saved signature on canvas
            var clientCanvas = document.getElementById('clientSignaturePad');
            if (clientCanvas) {
                // Need to wait for canvas to be visible
                setTimeout(function() {
                    var rect = clientCanvas.getBoundingClientRect();
                    var dpr = window.devicePixelRatio || 1;
                    clientCanvas.width = rect.width * dpr;
                    clientCanvas.height = rect.height * dpr;
                    var ctx = clientCanvas.getContext('2d');
                    ctx.scale(dpr, dpr);
                    
                    var img = new Image();
                    img.onload = function() {
                        ctx.drawImage(img, 0, 0, rect.width, rect.height);
                    };
                    img.src = data.clientSignature;
                }, 200);
            }
            
            // Hide clear button for client signature
            var clearBtn = $('.clear-btn[data-canvas="clientSignaturePad"]');
            if (clearBtn) clearBtn.style.display = 'none';
        }
        
        // Hide acknowledgment section for developer
        var ackSection = $('.acknowledgment');
        if (ackSection) ackSection.style.display = 'none';
        
        // Make sure developer signature block is visible and enabled
        var devBlock = $('#devSignatureBlock');
        if (devBlock) {
            devBlock.style.display = 'block';
            devBlock.style.opacity = '1';
            
            var devHeader = devBlock.querySelector('h3');
            if (devHeader) {
                devHeader.innerHTML = 'Developer Signature — VistaFly <span style="font-size: 12px; color: #f59e0b;">⏳ Sign Below</span>';
            }
        }
        
        console.log('Form populated with contract data for developer review');
    };

    ContractFormHandler.prototype.handleClientSubmit = function() {
        console.log('Handling client submit...');
        
        // Validate client fields
        var errors = [];
        
        var clientName = $('#clientName');
        if (!clientName || !clientName.value.trim()) {
            errors.push('Please enter the client name or company name');
        }
        
        var acknowledgment = $('#acknowledgment');
        if (!acknowledgment || !acknowledgment.checked) {
            errors.push('Please acknowledge that you have read and agree to the terms');
        }
        
        var clientSignerName = $('#clientSignerName');
        if (!clientSignerName || !clientSignerName.value.trim()) {
            errors.push('Please enter your full name');
        }
        
        if (!this.clientSignaturePad || this.clientSignaturePad.isEmpty()) {
            errors.push('Your signature is required');
        }
        
        var clientDate = $('#clientDate');
        if (!clientDate || !clientDate.value) {
            errors.push('Signature date is required');
        }
        
        if (errors.length > 0) {
            alert('Please complete all required fields:\n\n' + errors.join('\n'));
            return;
        }
        
        // All validation passed, submit to Firebase
        this.submitClientSignature();
    };

    ContractFormHandler.prototype.handleDeveloperSubmit = function() {
        console.log('Handling developer submit...');
        
        // Validate developer fields
        var errors = [];
        
        if (!this.devSignaturePad || this.devSignaturePad.isEmpty()) {
            errors.push('Developer signature is required');
        }
        
        var devDate = $('#devDate');
        if (!devDate || !devDate.value) {
            errors.push('Developer signature date is required');
        }
        
        if (!this.currentContract) {
            errors.push('No pending contract found to finalize');
        }
        
        if (errors.length > 0) {
            alert('Please complete all required fields:\n\n' + errors.join('\n'));
            return;
        }
        
        // All validation passed, finalize contract
        this.finalizeContract();
    };

    ContractFormHandler.prototype.submitClientSignature = function() {
        var self = this;
        var submitBtn = $('#submitBtn');
        var originalText = submitBtn ? submitBtn.innerHTML : '';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Submitting...</span>';
        }
        
        console.log('Submitting client signature to Firebase...');
        
        var formData = {
            clientName: $('#clientName').value.trim(),
            clientSignerName: $('#clientSignerName').value.trim(),
            clientDate: $('#clientDate').value,
            clientSignature: this.clientSignaturePad.toDataURL(),
            clientEmail: firebase.auth().currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending_developer'
        };
        
        console.log('Form data:', { ...formData, clientSignature: '[BASE64 IMAGE]' });
        
        firebase.firestore().collection('contracts').add(formData)
            .then(function(docRef) {
                console.log('Client signature saved with ID:', docRef.id);
                self.showClientSuccessMessage();
                if (submitBtn) submitBtn.style.display = 'none';
            })
            .catch(function(error) {
                console.error('Error saving client signature:', error);
                alert('Error submitting signature: ' + error.message + '\n\nPlease try again.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            });
    };

    ContractFormHandler.prototype.finalizeContract = function() {
        var self = this;
        var submitBtn = $('#submitBtn');
        var originalText = submitBtn ? submitBtn.innerHTML : '';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Finalizing...</span>';
        }
        
        if (!this.currentContract) {
            alert('No pending contract found to finalize');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
            return;
        }
        
        console.log('Finalizing contract:', this.currentContract.id);
        
        // Get developer signature
        var devSignatureData = this.devSignaturePad ? this.devSignaturePad.toDataURL() : '';
        var devDateValue = $('#devDate') ? $('#devDate').value : new Date().toISOString().split('T')[0];
        
        var updateData = {
            devName: 'Carlos Martin',
            devSignature: devSignatureData,
            devDate: devDateValue,
            devEmail: firebase.auth().currentUser.email,
            finalizedTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'completed'
        };
        
        // Merge with existing contract data for PDF generation
        var fullContractData = Object.assign({}, this.currentContract.data, updateData);
        
        firebase.firestore().collection('contracts')
            .doc(this.currentContract.id)
            .update(updateData)
            .then(function() {
                console.log('Contract finalized successfully in Firebase');
                
                // Store full data for PDF generation
                self.currentContract.data = fullContractData;
                
                self.showDeveloperSuccessMessage();
            })
            .catch(function(error) {
                console.error('Error finalizing contract:', error);
                alert('Error finalizing contract: ' + error.message + '\n\nPlease try again.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            });
    };

    ContractFormHandler.prototype.showClientSuccessMessage = function() {
        var messageDiv = $('#clientSubmitMessage');
        var emailDisplay = $('#clientEmailDisplay');
        
        if (messageDiv) {
            var user = firebase.auth().currentUser;
            if (user && emailDisplay) {
                emailDisplay.textContent = user.email;
            }
            messageDiv.style.display = 'block';
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Hide signature sections
        var clientBlock = $('#clientSignatureBlock');
        if (clientBlock) clientBlock.style.display = 'none';
        
        var devPending = $('#devPendingBlock');
        if (devPending) devPending.style.display = 'none';
        
        // Hide acknowledgment section
        var ackSection = $('.acknowledgment');
        if (ackSection) ackSection.style.display = 'none';
    };

    ContractFormHandler.prototype.showDeveloperSuccessMessage = function() {
        var self = this;
        var submitBtn = $('#submitBtn');
        
        if (submitBtn) {
            submitBtn.innerHTML = '<span>✓ Uploaded! Click to Download PDF</span>';
            submitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            submitBtn.disabled = false;
            
            // Change button to download PDF
            submitBtn.onclick = function(e) {
                e.preventDefault();
                self.generatePDF();
            };
        }
        
        // Show download button too
        var downloadBtn = $('#downloadBtn');
        if (downloadBtn) {
            downloadBtn.style.display = 'inline-flex';
            downloadBtn.onclick = function(e) {
                e.preventDefault();
                self.generatePDF();
            };
        }
        
        alert('Contract uploaded successfully! Click the button to download the PDF.');
    };

    ContractFormHandler.prototype.generatePDF = function() {
        var self = this;
        var contractData = this.currentContract ? this.currentContract.data : null;
        
        if (!contractData) {
            alert('No contract data available to generate PDF');
            return;
        }
        
        console.log('Generating PDF with data:', contractData);
        
        // Create a new window with the formatted contract
        var printWindow = window.open('', '_blank');
        
        if (!printWindow) {
            alert('Please allow popups to download the PDF');
            return;
        }
        
        var clientDate = contractData.clientDate || 'N/A';
        var devDate = contractData.devDate || 'N/A';
        var clientName = contractData.clientName || 'N/A';
        var clientSignerName = contractData.clientSignerName || 'N/A';
        var clientEmail = contractData.clientEmail || 'N/A';
        var devName = contractData.devName || 'Carlos Martin';
        var devEmail = contractData.devEmail || 'N/A';
        var clientSignature = contractData.clientSignature || '';
        var devSignature = contractData.devSignature || '';
        
        var htmlContent = '<!DOCTYPE html>' +
        '<html><head>' +
        '<title>Website Development Agreement - ' + clientName + '</title>' +
        '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.6; color: #000; background: #fff; padding: 0.75in; }' +
        'h1 { font-size: 18pt; text-align: center; margin-bottom: 5px; font-weight: bold; }' +
        'h2 { font-size: 14pt; margin-top: 20px; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; }' +
        'h3 { font-size: 12pt; margin-top: 15px; margin-bottom: 8px; font-weight: bold; }' +
        'p { margin-bottom: 10px; text-align: justify; }' +
        'ul { margin-left: 25px; margin-bottom: 10px; }' +
        'li { margin-bottom: 5px; }' +
        '.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }' +
        '.subtitle { font-size: 12pt; color: #333; margin-top: 5px; }' +
        '.parties { background: #f9f9f9; padding: 15px; border: 1px solid #ddd; margin: 20px 0; }' +
        '.section { margin-bottom: 20px; page-break-inside: avoid; }' +
        '.signature-page { page-break-before: always; margin-top: 50px; }' +
        '.signature-block { display: inline-block; width: 45%; vertical-align: top; margin: 20px 2%; }' +
        '.signature-line { border-bottom: 1px solid #000; height: 80px; margin: 10px 0; display: flex; align-items: flex-end; justify-content: center; }' +
        '.signature-line img { max-height: 70px; max-width: 100%; }' +
        '.signature-label { font-size: 10pt; color: #666; margin-top: 5px; }' +
        '.signature-name { font-weight: bold; margin-top: 10px; }' +
        '.signature-date { margin-top: 5px; }' +
        '.signature-email { font-size: 10pt; color: #666; }' +
        '.footer { margin-top: 50px; text-align: center; font-size: 10pt; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }' +
        '.contract-id { font-size: 9pt; color: #999; margin-top: 10px; }' +
        '@media print { body { padding: 0.5in; } .signature-page { page-break-before: always; } }' +
        '@page { margin: 0.75in; }' +
        '</style>' +
        '</head><body>' +
        
        '<div class="header">' +
        '<h1>WEBSITE DEVELOPMENT AGREEMENT</h1>' +
        '<div class="subtitle">VistaFly — Carlos Martin</div>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>PARTIES TO THE AGREEMENT</h2>' +
        '<p>This Website Development Agreement ("Agreement") is made effective as of <strong>' + clientDate + '</strong> (the "Effective Date") and is entered into by and between:</p>' +
        '<div class="parties">' +
        '<p><strong>VistaFly</strong>, a sole proprietorship owned and operated by Carlos Martin (the "Developer"),</p>' +
        '<p>and</p>' +
        '<p><strong>' + clientName + '</strong> (the "Client")</p>' +
        '<p style="font-size: 10pt; color: #666; margin-top: 10px;">The Developer and Client may be referred to individually as a "Party" and collectively as the "Parties."</p>' +
        '</div>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>1. PROJECT SCOPE</h2>' +
        '<h3>1.1 Overview</h3>' +
        '<p>Developer agrees to design, build, and deliver a custom website or web application using modern technologies, which may include but are not limited to: Visual Studio Code, React, Next.js, Firebase, Vite, REST/Graph APIs, and associated development tools.</p>' +
        '<h3>1.2 Statement of Work (SOW)</h3>' +
        '<p>All features, functionalities, pages, integrations, and deliverables will be detailed in a separate Proposal or Statement of Work ("SOW") prepared by Developer and approved by Client.</p>' +
        '<h3>1.3 Scope Limitations</h3>' +
        '<p>Only items expressly included in the SOW form part of the Project Scope. Any request beyond that scope—whether new features, design changes, additional pages, or system enhancements—requires an approved Change Order (Section 10).</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>2. PACKAGES & PRICING</h2>' +
        '<p>Developer offers multiple service tiers, including Starter, Professional, Premium, and Elite website/application packages. The applicable pricing, deliverables, and package level for this Agreement will be specified in the attached SOW, which forms an integral part of this Agreement.</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>3. PAYMENT TERMS</h2>' +
        '<p>Unless otherwise specified in the SOW:</p>' +
        '<h3>3.1 Deposit</h3>' +
        '<p>A non-refundable deposit of 50% is required before any work begins, unless the Developer chooses to accept a different amount at their discretion.</p>' +
        '<h3>3.2 Milestone Payments</h3>' +
        '<p>If no custom timetable is specified in the SOW, the standard schedule is:</p>' +
        '<ul>' +
        '<li>25% due upon UI/UX design approval</li>' +
        '<li>25% due at final delivery or prior to deployment, whichever the Developer determines is appropriate</li>' +
        '</ul>' +
        '<h3>3.3 Late Payments</h3>' +
        '<p>Payments not received within 7 days of the due date may, at the Developer\'s discretion, incur a monthly late fee of up to 5%. The Developer may also pause or delay work until any outstanding balance is paid.</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>4. CLIENT RESPONSIBILITIES</h2>' +
        '<p>Client agrees to provide all necessary materials—including copy, images, brand assets, credentials, and requested information—within 5 business days of Developer\'s request.</p>' +
        '<p>Any delays in providing required materials will directly extend the project timeline. Developer is not responsible for delays caused by the Client.</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>5. REVISIONS</h2>' +
        '<p>Unless otherwise stated in the SOW:</p>' +
        '<ul>' +
        '<li>Client receives up to two (2) rounds of revisions per milestone</li>' +
        '<li>Additional revisions or redesigns require a Change Order and may incur additional charges</li>' +
        '</ul>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>6. INTELLECTUAL PROPERTY RIGHTS</h2>' +
        '<h3>6.1 Developer Ownership</h3>' +
        '<p>Developer retains full ownership of all proprietary materials, including source code, backend logic and architecture, custom components, scripts, and utilities, and Developer\'s internal systems, tools, libraries, and workflows.</p>' +
        '<h3>6.2 Client Ownership</h3>' +
        '<p>Upon full payment, Client gains ownership of the final website design, all content supplied by Client (text, images, media), and the compiled, minified production build of the project.</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>7. MAINTENANCE & SUPPORT</h2>' +
        '<p>Maintenance plans (Basic, Professional, Premium) may be purchased separately and will be defined in the SOW. Maintenance plans do not include new pages or sections, new features or functionalities, major redesigns, third-party outages, policy changes from platforms, or fixes related to Client misuse.</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>8. TIMELINE & DELIVERY</h2>' +
        '<p>Developer will provide an estimated project timeline. Client acknowledges these timelines are estimates, not guarantees. Any Client-caused delay automatically extends the project schedule.</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>9. CHANGE ORDERS</h2>' +
        '<p>Any request modifying the Project Scope—including added features, redesigns, advanced animations, dashboards, APIs, or system logic—requires a signed Change Order that includes revised pricing and timelines.</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>10. WARRANTY & LIMITATIONS</h2>' +
        '<h3>10.1 Developer Warranty</h3>' +
        '<p>Developer warrants that the delivered website will function substantially as described in the SOW for 30 days after deployment.</p>' +
        '<h3>10.2 Exclusions</h3>' +
        '<p>This warranty does not apply to issues caused by Client-modified code, third-party service changes, library updates, hosting issues, improper access, or security breaches caused by Client.</p>' +
        '<h3>10.3 Liability Limitations</h3>' +
        '<p>Developer\'s total liability under this Agreement is limited to the total amount paid by Client.</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>11. CONFIDENTIALITY</h2>' +
        '<p>Both Parties agree to maintain the confidentiality of all proprietary or sensitive information exchanged during the course of this project.</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>12. INDEMNIFICATION</h2>' +
        '<p>Client agrees to indemnify and hold Developer harmless from any claims arising out of content supplied by Client, misuse of the website, unauthorized access, or business decisions made using data produced by the website.</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>13. TERMINATION</h2>' +
        '<p>Either Party may terminate this Agreement with 7 days written notice. If Client terminates early, all deposits are forfeited, all completed work must be paid for immediately, and Developer retains all rights to unfinished work.</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>14. GOVERNING LAW</h2>' +
        '<p>This Agreement shall be governed by and construed in accordance with the laws of the State of California without regard to conflict-of-law principles.</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>15. ENTIRE AGREEMENT</h2>' +
        '<p>This Agreement, together with all attached SOWs, proposals, and addenda, constitutes the entire and complete agreement between the Parties and supersedes all prior discussions, negotiations, or understandings.</p>' +
        '</div>' +
        
        '<div class="signature-page">' +
        '<h2 style="text-align: center; border: none;">SIGNATURES</h2>' +
        '<p style="text-align: center; margin-bottom: 30px;">By signing below, both parties acknowledge that they have read, understood, and agree to all terms and conditions outlined in this Agreement.</p>' +
        
        '<div style="display: flex; justify-content: space-between; margin-top: 40px;">' +
        
        '<div class="signature-block">' +
        '<h3>Developer — VistaFly</h3>' +
        '<div class="signature-line">' +
        (devSignature ? '<img src="' + devSignature + '" alt="Developer Signature" />' : '<span style="color: #999;">Pending</span>') +
        '</div>' +
        '<div class="signature-label">Signature</div>' +
        '<div class="signature-name">' + devName + '</div>' +
        '<div class="signature-date">Date: ' + devDate + '</div>' +
        '<div class="signature-email">' + devEmail + '</div>' +
        '</div>' +
        
        '<div class="signature-block">' +
        '<h3>Client — ' + clientName + '</h3>' +
        '<div class="signature-line">' +
        (clientSignature ? '<img src="' + clientSignature + '" alt="Client Signature" />' : '<span style="color: #999;">Pending</span>') +
        '</div>' +
        '<div class="signature-label">Signature</div>' +
        '<div class="signature-name">' + clientSignerName + '</div>' +
        '<div class="signature-date">Date: ' + clientDate + '</div>' +
        '<div class="signature-email">' + clientEmail + '</div>' +
        '</div>' +
        
        '</div>' +
        
        '<div class="footer">' +
        '<p>© ' + new Date().getFullYear() + ' VistaFly. All rights reserved.</p>' +
        '<p class="contract-id">Contract ID: ' + (self.currentContract ? self.currentContract.id : 'N/A') + '</p>' +
        '</div>' +
        '</div>' +
        
        '<script>' +
        'window.onload = function() { setTimeout(function() { window.print(); }, 500); };' +
        '</script>' +
        '</body></html>';
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    // === PAGE LOADER ===
    var PageLoader = function() {
        window.addEventListener('load', function() {
            document.body.classList.add('loaded');
        });
    };

    // === CUSTOM CURSOR ===
    var CustomCursor = function() {
        if (!DeviceDetector.isLaptopOrLarger()) {
            console.log('Custom cursor disabled - screen too small');
            return;
        }

        console.log('Custom cursor enabled');

        this.cursor = document.createElement('div');
        this.cursor.className = 'custom-cursor';
        this.cursor.style.cssText = 'position:fixed;width:10px;height:10px;background:rgba(255,255,255,0.9);border-radius:50%;pointer-events:none;z-index:99999;opacity:0;mix-blend-mode:difference;transition:width 0.3s,height 0.3s,opacity 0.3s,transform 0.3s;transform:translate(-50%, -50%);';
        document.body.appendChild(this.cursor);

        this.position = { x: 0, y: 0 };
        this.target = { x: 0, y: 0 };
        this.isVisible = false;
        this.isHovering = false;

        this.init();
        this.handleResize();
    };

    CustomCursor.prototype.init = function() {
        var self = this;
        
        // CSS: disable custom cursor when modal is open
        var style = document.createElement('style');
        style.id = 'custom-cursor-style';
        style.textContent = 
            '@media (min-width: 1024px) {' +
            '  body:not(.modal-open) * { cursor: none !important; }' +
            '  body.modal-open, body.modal-open * { cursor: auto !important; }' +
            '  body.modal-open .signature-pad { cursor: crosshair !important; }' +
            '}';
        document.head.appendChild(style);

        document.addEventListener('mousemove', function(e) {
            // Hide cursor when modal is open
            if (document.body.classList.contains('modal-open')) {
                self.cursor.style.opacity = '0';
                return;
            }
            
            self.target.x = e.clientX;
            self.target.y = e.clientY;
            if (!self.isVisible) {
                self.isVisible = true;
                self.cursor.style.opacity = '1';
            }
            
            var element = document.elementFromPoint(e.clientX, e.clientY);
            self.checkHoverState(element);
        }, { passive: true });

        document.addEventListener('mouseleave', function() {
            self.isVisible = false;
            self.cursor.style.opacity = '0';
        });

        this.animate();
    };

    CustomCursor.prototype.handleResize = function() {
        var self = this;
        window.addEventListener('resize', function() {
            if (!DeviceDetector.isLaptopOrLarger()) {
                if (self.cursor) {
                    self.cursor.style.display = 'none';
                }
            } else {
                if (self.cursor) {
                    self.cursor.style.display = 'block';
                }
            }
        });
    };

    CustomCursor.prototype.checkHoverState = function(element) {
        if (!element) return;
        if (document.body.classList.contains('modal-open')) return;
        
        var isInteractive = false;
        var current = element;
        
        while (current && current !== document.body) {
            var tag = current.tagName.toLowerCase();
            var isClickable = tag === 'a' || tag === 'button' || tag === 'input' || 
                            tag === 'textarea' || tag === 'select' || tag === 'canvas' ||
                            current.hasAttribute('onclick') || 
                            current.classList.contains('clear-btn') ||
                            current.classList.contains('modal-close') ||
                            current.classList.contains('auth-close') ||
                            current.classList.contains('nav-link') ||
                            current.classList.contains('btn') ||
                            current.classList.contains('hamburger') ||
                            current.classList.contains('item') ||
                            current.classList.contains('item__image') ||
                            current.classList.contains('enlarge');
            
            if (isClickable) {
                isInteractive = true;
                break;
            }
            current = current.parentElement;
        }
        
        if (isInteractive && !this.isHovering) {
            this.isHovering = true;
            this.cursor.style.width = '40px';
            this.cursor.style.height = '40px';
        } else if (!isInteractive && this.isHovering) {
            this.isHovering = false;
            this.cursor.style.width = '10px';
            this.cursor.style.height = '10px';
        }
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
        console.log('Device: ' + (DeviceDetector.isMobile() ? 'Mobile' : 'Desktop'));
        console.log('Screen width:', window.innerWidth);

        new Navigation();
        new ParallaxController();
        new ScrollAnimations();
        new PortfolioHandler();
        new FormHandler();
        new FirebaseAuthHandler();
        new ContractFormHandler();
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