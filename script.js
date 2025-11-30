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
        this.DEVELOPER_EMAIL = 'your-developer-email@gmail.com';
        this.signaturePadsInitialized = false;
        
        this.init();
    };

    ContractFormHandler.prototype.init = function() {
        var self = this;
        
        console.log('Initializing contract form handler');
        
        // Listen for modal open event to initialize signature pads
        window.addEventListener('contractModalOpened', function() {
            console.log('Contract modal opened - initializing signature pads');
            self.initializeSignaturePads();
        });
        
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    self.isDeveloper = user.email === self.DEVELOPER_EMAIL;
                    console.log('User role:', self.isDeveloper ? 'Developer' : 'Client');
                    self.setupForm();
                }
            });
        }
    };
    
    ContractFormHandler.prototype.initializeSignaturePads = function() {
        var self = this;
        
        if (this.signaturePadsInitialized) {
            console.log('Signature pads already initialized, resizing...');
            if (this.devSignaturePad) this.devSignaturePad.resize();
            if (this.clientSignaturePad) this.clientSignaturePad.resize();
            return;
        }
        
        var devCanvas = document.getElementById('devSignaturePad');
        var clientCanvas = document.getElementById('clientSignaturePad');
        
        // Check which canvas is visible and initialize it
        if (devCanvas && devCanvas.offsetParent !== null) {
            this.devSignaturePad = createSignaturePad(devCanvas);
        }
        
        if (clientCanvas && clientCanvas.offsetParent !== null) {
            this.clientSignaturePad = createSignaturePad(clientCanvas);
        }
        
        // Setup clear buttons
        $$('.clear-btn').forEach(function(btn) {
            // Remove old listeners by cloning
            var newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', function(e) {
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
        console.log('Signature pads initialized');
    };

    ContractFormHandler.prototype.setupForm = function() {
        var self = this;
        
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
        
        // Form submission
        this.form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (self.isDeveloper) {
                if (self.validateDeveloperForm()) {
                    self.finalizeContract();
                }
            } else {
                if (self.validateClientForm()) {
                    self.submitClientSignature();
                }
            }
        });
        
        var downloadBtn = $('#downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', function(e) {
                e.preventDefault();
                self.generatePDF();
            });
        }
    };

    ContractFormHandler.prototype.setupDeveloperView = function() {
        console.log('Setting up developer view');
        
        var devBlock = $('#devSignatureBlock');
        if (devBlock) devBlock.style.display = 'block';
        
        var clientBlock = $('#clientSignatureBlock');
        if (clientBlock) clientBlock.style.display = 'none';
        
        var devPending = $('#devPendingBlock');
        if (devPending) devPending.style.display = 'none';
        
        var submitBtn = $('#submitBtnText');
        if (submitBtn) submitBtn.textContent = 'Finalize & Download';
        
        var downloadBtn = $('#downloadBtn');
        if (downloadBtn) downloadBtn.style.display = 'inline-flex';
        
        this.loadPendingContract();
    };

    ContractFormHandler.prototype.setupClientView = function() {
        console.log('Setting up client view');
        
        var devBlock = $('#devSignatureBlock');
        if (devBlock) devBlock.style.display = 'none';
        
        var clientBlock = $('#clientSignatureBlock');
        if (clientBlock) clientBlock.style.display = 'block';
        
        var devPending = $('#devPendingBlock');
        if (devPending) devPending.style.display = 'block';
        
        var submitBtn = $('#submitBtnText');
        if (submitBtn) submitBtn.textContent = 'Submit Client Signature';
    };

    ContractFormHandler.prototype.loadPendingContract = function() {
        var self = this;
        
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
        var clientName = $('#clientName');
        if (clientName) clientName.value = data.clientName || '';
        
        var clientSignerName = $('#clientSignerName');
        if (clientSignerName) {
            clientSignerName.value = data.clientSignerName || '';
            clientSignerName.setAttribute('readonly', 'readonly');
        }
        
        var clientDate = $('#clientDate');
        if (clientDate) {
            clientDate.value = data.clientDate || '';
            clientDate.setAttribute('readonly', 'readonly');
        }
        
        var clientNameDisplay = $('#clientNameDisplay');
        if (clientNameDisplay) clientNameDisplay.textContent = data.clientName || 'Client Name';
    };

    ContractFormHandler.prototype.validateClientForm = function() {
        var errors = [];
        
        var clientName = $('#clientName');
        if (clientName && !clientName.value.trim()) {
            errors.push('Please enter the client name or company name');
        }
        
        var acknowledgment = $('#acknowledgment');
        if (acknowledgment && !acknowledgment.checked) {
            errors.push('Please acknowledge the terms');
        }
        
        var clientSignerName = $('#clientSignerName');
        if (clientSignerName && !clientSignerName.value.trim()) {
            errors.push('Please enter your full name');
        }
        
        if (this.clientSignaturePad && this.clientSignaturePad.isEmpty()) {
            errors.push('Your signature is required');
        }
        
        var clientDate = $('#clientDate');
        if (clientDate && !clientDate.value) {
            errors.push('Signature date is required');
        }
        
        if (errors.length > 0) {
            alert('Please complete all required fields:\n\n' + errors.join('\n'));
            return false;
        }
        
        return true;
    };

    ContractFormHandler.prototype.validateDeveloperForm = function() {
        var errors = [];
        
        if (this.devSignaturePad && this.devSignaturePad.isEmpty()) {
            errors.push('Developer signature is required');
        }
        
        var devDate = $('#devDate');
        if (devDate && !devDate.value) {
            errors.push('Developer signature date is required');
        }
        
        if (errors.length > 0) {
            alert('Please complete all required fields:\n\n' + errors.join('\n'));
            return false;
        }
        
        return true;
    };

    ContractFormHandler.prototype.submitClientSignature = function() {
        var self = this;
        var submitBtn = $('#submitBtn');
        var originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Submitting...</span>';
        
        var formData = {
            clientName: $('#clientName').value,
            clientSignerName: $('#clientSignerName').value,
            clientDate: $('#clientDate').value,
            clientSignature: this.clientSignaturePad.toDataURL(),
            clientEmail: firebase.auth().currentUser.email,
            timestamp: new Date().toISOString(),
            status: 'pending_developer'
        };
        
        firebase.firestore().collection('contracts').add(formData)
            .then(function(docRef) {
                console.log('Client signature saved with ID:', docRef.id);
                self.showClientSuccessMessage();
                submitBtn.style.display = 'none';
            })
            .catch(function(error) {
                console.error('Error saving client signature:', error);
                alert('Error submitting signature. Please try again.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            });
    };

    ContractFormHandler.prototype.finalizeContract = function() {
        var self = this;
        var submitBtn = $('#submitBtn');
        var originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Finalizing...</span>';
        
        if (!this.currentContract) {
            alert('No pending contract found');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }
        
        var updateData = {
            devSignature: this.devSignaturePad.toDataURL(),
            devDate: $('#devDate').value,
            devEmail: firebase.auth().currentUser.email,
            finalizedTimestamp: new Date().toISOString(),
            status: 'completed'
        };
        
        firebase.firestore().collection('contracts')
            .doc(this.currentContract.id)
            .update(updateData)
            .then(function() {
                console.log('Contract finalized');
                self.showDeveloperSuccessMessage();
                
                setTimeout(function() {
                    self.generatePDF();
                }, 1000);
            })
            .catch(function(error) {
                console.error('Error finalizing contract:', error);
                alert('Error finalizing contract. Please try again.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            });
    };

    ContractFormHandler.prototype.showClientSuccessMessage = function() {
        var messageDiv = $('#clientSubmitMessage');
        var emailDisplay = $('#clientEmailDisplay');
        
        if (messageDiv && emailDisplay) {
            var user = firebase.auth().currentUser;
            if (user) {
                emailDisplay.textContent = user.email;
            }
            messageDiv.style.display = 'block';
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        var clientBlock = $('#clientSignatureBlock');
        if (clientBlock) clientBlock.style.display = 'none';
        
        var devPending = $('#devPendingBlock');
        if (devPending) devPending.style.display = 'none';
    };

    ContractFormHandler.prototype.showDeveloperSuccessMessage = function() {
        var successMsg = $('.success-message');
        
        if (!successMsg) {
            successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.textContent = '✓ Contract finalized successfully!';
            this.form.insertBefore(successMsg, this.form.firstChild);
        }
        
        successMsg.classList.add('show');
        
        setTimeout(function() {
            successMsg.classList.remove('show');
        }, 5000);
    };

    ContractFormHandler.prototype.generatePDF = function() {
        window.print();
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