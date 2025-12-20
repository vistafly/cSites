// Scarlo — MOBILE-OPTIMIZED INTERACTIONS

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

    // Format phone number to (xxx) xxx-xxxx - handles partial input for live formatting
    var formatPhoneNumber = function(phone) {
        if (!phone) return '';
        // Remove all non-digits
        var cleaned = phone.replace(/\D/g, '');
        // Handle +1 country code
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            cleaned = cleaned.slice(1);
        }
        // Limit to 10 digits
        cleaned = cleaned.slice(0, 10);

        // Progressive formatting as user types
        if (cleaned.length === 0) {
            return '';
        } else if (cleaned.length <= 3) {
            return '(' + cleaned;
        } else if (cleaned.length <= 6) {
            return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3);
        } else {
            return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3, 6) + '-' + cleaned.slice(6);
        }
    };

    // Normalize phone number to E.164 format (+1XXXXXXXXXX) for Firestore storage
    // This ensures phone numbers match Firebase Auth format for security rules
    var normalizeToE164 = function(phone) {
        if (!phone) return '';
        // Remove all non-digits
        var cleaned = phone.replace(/\D/g, '');
        // If it's 10 digits, add country code
        if (cleaned.length === 10) {
            return '+1' + cleaned;
        }
        // If it's 11 digits starting with 1, add +
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return '+' + cleaned;
        }
        // If already has + at start, return as-is
        if (phone.startsWith('+')) {
            return phone.replace(/[^\d+]/g, '');
        }
        // Fallback: return with +1 prefix if we have digits
        if (cleaned.length >= 10) {
            return '+1' + cleaned.slice(-10);
        }
        return phone; // Return original if can't normalize
    };

    // Live phone input formatter - attach to input elements
    var setupPhoneInputFormatting = function(input) {
        if (!input) return;

        input.addEventListener('input', function() {
            var cursorPos = input.selectionStart;
            var value = input.value;

            // Count digits before cursor in raw input
            var digitsBeforeCursor = value.slice(0, cursorPos).replace(/\D/g, '').length;

            // Extract all digits, limit to 10
            var digits = value.replace(/\D/g, '').slice(0, 10);

            // Build formatted string piece by piece
            var formatted = '';
            for (var i = 0; i < digits.length; i++) {
                if (i === 0) formatted += '(';
                if (i === 3) formatted += ') ';
                if (i === 6) formatted += '-';
                formatted += digits[i];
            }

            input.value = formatted;

            // Find cursor position: count through formatted string until we've seen digitsBeforeCursor digits
            var newCursorPos = 0;
            var digitsSeen = 0;
            for (var j = 0; j < formatted.length; j++) {
                if (/\d/.test(formatted[j])) {
                    digitsSeen++;
                    if (digitsSeen === digitsBeforeCursor) {
                        newCursorPos = j + 1;
                        break;
                    }
                }
            }

            // Handle edge case: cursor at very start
            if (digitsBeforeCursor === 0) {
                newCursorPos = formatted.length > 0 ? 1 : 0; // After '(' if exists
            }

            input.setSelectionRange(newCursorPos, newCursorPos);
        });
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
        if (!this.nav) {
            console.warn('Navbar not found');
            return;
        }
        
        this.hamburger = $('.hamburger');
        this.menu = $('.nav-menu');
        this.links = $$('.nav-link');
        this.sections = null;
        this.isScrolled = false;
        this.scrollTicking = false;
        this.activeLinkTicking = false;
        
        var self = this;
        requestAnimationFrame(function() {
            self.init();
        });
    };

    Navigation.prototype.init = function() {
        this.setupSmoothScroll();
        this.setupMobileMenu();
        
        var self = this;
        setTimeout(function() {
            self.setupScrollEffects();
            self.setupActiveLinks();
        }, 100);
    };

    Navigation.prototype.setupSmoothScroll = function() {
        var self = this;
        var anchors = $$('a[href^="#"]');
        
        for (var i = 0; i < anchors.length; i++) {
            (function(anchor) {
                anchor.addEventListener('click', function(e) {
                    var targetId = anchor.getAttribute('href');
                    if (!targetId || targetId === '#') return;
                    
                    var target = $(targetId);
                    if (target) {
                        e.preventDefault();
                        var navHeight = self.nav ? self.nav.offsetHeight : 0;
                        var targetPosition = target.offsetTop - navHeight;
                        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
                        self.closeMobileMenu();
                    }
                });
            })(anchors[i]);
        }
    };

    Navigation.prototype.setupMobileMenu = function() {
        var self = this;
        if (!this.hamburger || !this.menu) return;

        this.hamburger.addEventListener('click', function() {
            self.toggleMobileMenu();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && self.menu && self.menu.classList.contains('active')) {
                self.closeMobileMenu();
            }
        });

        document.addEventListener('click', function(e) {
            if (self.menu && self.menu.classList.contains('active') && 
                !self.menu.contains(e.target) && 
                self.hamburger && !self.hamburger.contains(e.target)) {
                self.closeMobileMenu();
            }
        });
    };

    Navigation.prototype.toggleMobileMenu = function() {
        if (!this.menu || !this.hamburger) return;
        this.menu.classList.toggle('active');
        this.hamburger.classList.toggle('active');
        document.body.style.overflow = this.menu.classList.contains('active') ? 'hidden' : '';
    };

    Navigation.prototype.closeMobileMenu = function() {
        if (!this.menu || !this.hamburger) return;
        this.menu.classList.remove('active');
        this.hamburger.classList.remove('active');
        document.body.style.overflow = '';
    };

    Navigation.prototype.setupScrollEffects = function() {
        var self = this;
        if (!this.nav) return;
        
        var scrollThreshold = 100;
        var hysteresis = 20;
        
        var handleScroll = function() {
            var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
            
            if (!self.isScrolled && scrollY > scrollThreshold) {
                self.isScrolled = true;
                self.nav.classList.add('scrolled');
            } else if (self.isScrolled && scrollY < (scrollThreshold - hysteresis)) {
                self.isScrolled = false;
                self.nav.classList.remove('scrolled');
            }
            self.scrollTicking = false;
        };
        
        var onScroll = function() {
            if (!self.scrollTicking) {
                self.scrollTicking = true;
                requestAnimationFrame(handleScroll);
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        
        var initialScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
        if (initialScrollY > scrollThreshold) {
            this.isScrolled = true;
            this.nav.classList.add('scrolled');
        }
    };

    Navigation.prototype.setupActiveLinks = function() {
        var self = this;
        if (!this.links || this.links.length === 0) return;
        
        this.sections = $$('section[id]');
        if (!this.sections || this.sections.length === 0) return;
        
        var updateActiveLink = function() {
            var scrollPosition = window.pageYOffset + window.innerHeight / 2;
            var documentHeight = document.documentElement.scrollHeight;
            var windowHeight = window.innerHeight;
            var current = '';
            
            if (window.pageYOffset + windowHeight >= documentHeight - 50) {
                current = 'contact';
            } else {
                for (var i = 0; i < self.sections.length; i++) {
                    var section = self.sections[i];
                    var sectionTop = section.offsetTop;
                    var sectionHeight = section.offsetHeight;
                    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                        current = section.getAttribute('id');
                        break;
                    }
                }
            }

            for (var j = 0; j < self.links.length; j++) {
                var link = self.links[j];
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            }
            self.activeLinkTicking = false;
        };
        
        var onScrollForLinks = function() {
            if (!self.activeLinkTicking) {
                self.activeLinkTicking = true;
                requestAnimationFrame(updateActiveLink);
            }
        };

        window.addEventListener('scroll', onScrollForLinks, { passive: true });
        
        setTimeout(updateActiveLink, 200);
    };

// === ROTATING TEXT ANIMATION - ENHANCED ===
var RotatingText = function() {
    this.wrapper = $('.rotating-text-wrapper');
    if (!this.wrapper) return;
    
    this.texts = $$('.rotating-text');
    this.currentIndex = 0;
    this.init();
};

RotatingText.prototype.init = function() {
    var self = this;
    
    // Wrap each text in character spans
    this.texts.forEach(function(textEl) {
        var originalText = textEl.textContent;
        var html = '';
        
        Array.from(originalText).forEach(function(char) {
            if (char === ' ') {
                html += '<span class="char-space"> </span>';
            } else {
                html += '<span class="char">' + char + '</span>';
            }
        });
        
        textEl.innerHTML = html;
    });
    
    // Start rotation after 3 seconds
    setTimeout(function() {
        self.rotate();
    }, 3000);
};

RotatingText.prototype.rotate = function() {
    var self = this;
    
    setInterval(function() {
        // Remove active class from current
        self.texts[self.currentIndex].classList.remove('active');
        
        // Move to next index
        self.currentIndex = (self.currentIndex + 1) % self.texts.length;
        
        // Add active class to next
        self.texts[self.currentIndex].classList.add('active');
    }, 7000);
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

        // Phone auth properties
        this.recaptchaVerifier = null;
        this.confirmationResult = null;
        this.currentPhoneNumber = '';
        this.resendTimerInterval = null;

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
        
        // Handle all contract trigger buttons
        $$('.view-contract-trigger').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                self.checkAuthAndShowContract();
            });
        });
        
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

        // Initialize phone authentication
        this.setupTabs();
        this.initPhoneAuth();
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
            if (authBtn) authBtn.classList.add('logged-in');

            // Display email or formatted phone number
            if (authText) {
                if (user.email) {
                    authText.textContent = user.email.split('@')[0];
                } else if (user.phoneNumber) {
                    // Display last 4 digits of phone
                    authText.textContent = '***' + user.phoneNumber.slice(-4);
                }
            }
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

            // Reset phone auth state when closing
            this.stopResendTimer();
            this.resetPhoneAuthToStep1();
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

    FirebaseAuthHandler.prototype.resetContractModalState = function() {
        // Remove developer dashboard from DOM
        var devDashboard = document.getElementById('developerDashboard');
        if (devDashboard) {
            devDashboard.remove();
        }

        // Remove dual signing completed container from DOM
        var dualSigningCompleted = document.getElementById('dualSigningCompleted');
        if (dualSigningCompleted) {
            dualSigningCompleted.remove();
        }

        // Reset modal header visibility (developer view hides it)
        var modalHeader = document.querySelector('.modal-header');
        if (modalHeader) {
            modalHeader.style.display = '';
        }

        // Reset contract form visibility and clear fields
        var contractForm = document.getElementById('contractForm');
        if (contractForm) {
            contractForm.style.display = '';
            contractForm.reset();
        }

        // Reset signature blocks
        var clientSigBlock = document.getElementById('clientSignatureBlock');
        var devSigBlock = document.getElementById('developerSignatureBlock');
        if (clientSigBlock) clientSigBlock.style.display = '';
        if (devSigBlock) devSigBlock.style.display = '';

        // Clear signature canvases
        var clientCanvas = document.getElementById('clientSignaturePad');
        var devCanvas = document.getElementById('devSignaturePad');
        if (clientCanvas) {
            var ctx = clientCanvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
        }
        if (devCanvas) {
            var ctx = devCanvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, devCanvas.width, devCanvas.height);
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
                self.resetContractModalState();
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
            // Email auth errors
            'auth/configuration-not-found': 'Firebase is not configured.',
            'auth/invalid-email': 'Invalid email address',
            'auth/user-not-found': 'No account found.',
            'auth/wrong-password': 'Incorrect password',
            'auth/too-many-requests': 'Too many failed attempts. Please wait a moment.',
            'auth/network-request-failed': 'Network error. Check your connection.',
            'auth/user-disabled': 'Account disabled.',
            'auth/invalid-credential': 'Invalid email or password',
            // Phone auth errors
            'auth/invalid-phone-number': 'Invalid phone number format.',
            'auth/missing-phone-number': 'Please enter a phone number.',
            'auth/quota-exceeded': 'SMS quota exceeded. Please try again later.',
            'auth/captcha-check-failed': 'reCAPTCHA verification failed. Please try again.',
            'auth/invalid-verification-code': 'Invalid verification code.',
            'auth/code-expired': 'Verification code has expired. Please request a new one.',
            'auth/missing-verification-code': 'Please enter the verification code.',
            'auth/invalid-verification-id': 'Session expired. Please request a new code.',
            'auth/session-expired': 'Session expired. Please request a new verification code.',
            'auth/credential-already-in-use': 'This phone number is already linked to another account.',
            'auth/operation-not-allowed': 'Phone authentication is not enabled.',
            'auth/billing-not-enabled': 'This phone number is not authorized.'
        };

        return messages[errorCode] || 'Authentication error. Please try again.';
    };

    // === PHONE AUTHENTICATION METHODS ===

    FirebaseAuthHandler.prototype.setupTabs = function() {
        var self = this;
        var tabs = $$('.auth-tab', this.authModal);
        var panels = $$('.auth-panel', this.authModal);

        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                var targetTab = this.getAttribute('data-tab');

                // Update tab active states
                tabs.forEach(function(t) { t.classList.remove('active'); });
                this.classList.add('active');

                // Update panel visibility
                panels.forEach(function(panel) {
                    panel.classList.remove('active');
                });

                var targetPanel = $('#' + targetTab + 'Panel', self.authModal);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }

                // Reset phone auth state when switching to phone tab
                if (targetTab === 'phone') {
                    self.resetPhoneAuthToStep1();
                }
            });
        });
    };

    FirebaseAuthHandler.prototype.initPhoneAuth = function() {
        var self = this;

        var phoneForm = $('#phoneForm');
        var verifyForm = $('#verifyCodeForm');
        var backBtn = $('#backToPhoneBtn');
        var resendBtn = $('#resendCodeBtn');

        if (phoneForm) {
            phoneForm.addEventListener('submit', function(e) {
                e.preventDefault();
                self.handlePhoneSubmit();
            });
        }

        if (verifyForm) {
            verifyForm.addEventListener('submit', function(e) {
                e.preventDefault();
                self.handleCodeVerification();
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', function() {
                self.resetPhoneAuthToStep1();
            });
        }

        if (resendBtn) {
            resendBtn.addEventListener('click', function() {
                // Open help modal and select Verification Code issue
                var helpModal = $('#helpModal');
                var helpIssue = $('#helpIssue');
                if (helpModal) {
                    helpModal.classList.add('show');
                    document.body.style.overflow = 'hidden';
                    document.body.classList.add('modal-open');
                    if (helpIssue) {
                        helpIssue.value = 'verification_code';
                    }
                }
            });
        }

        // Auto-format phone number input with proper deletion support
        var phoneInput = $('#phoneNumber');
        if (phoneInput) {
            setupPhoneInputFormatting(phoneInput);
        }

        // Auto-filter verification code input to digits only
        var codeInput = $('#verificationCode');
        if (codeInput) {
            codeInput.addEventListener('input', function(e) {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
            });
        }
    };

    // Initialize invisible reCAPTCHA (required by Firebase, but verification is disabled via appVerificationDisabledForTesting)
    FirebaseAuthHandler.prototype.initRecaptcha = function() {
        if (this.recaptchaVerifier) return;

        this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'invisible'
        });
    };

    FirebaseAuthHandler.prototype.handlePhoneSubmit = function() {
        var self = this;
        var countryCodeEl = $('#countryCode');
        var phoneNumberEl = $('#phoneNumber');
        var countryCode = countryCodeEl ? countryCodeEl.value : '+1';
        var phoneNumber = phoneNumberEl ? phoneNumberEl.value.replace(/\D/g, '') : '';
        var errorEl = $('#phoneError');
        var submitBtn = $('#sendCodeBtn');

        // Clear previous errors
        if (errorEl) {
            errorEl.classList.remove('show');
            errorEl.textContent = '';
        }

        // Validate phone number
        if (!phoneNumber || phoneNumber.length < 10) {
            this.showError(errorEl, 'Please enter a valid phone number');
            return;
        }

        // Format full phone number
        var fullPhoneNumber = countryCode + phoneNumber;
        this.currentPhoneNumber = fullPhoneNumber;

        // Show loading state
        this.setPhoneLoadingState(submitBtn, true);

        // Initialize reCAPTCHA (required by Firebase API, but verification is disabled)
        this.initRecaptcha();

        // Send verification code
        firebase.auth().signInWithPhoneNumber(fullPhoneNumber, this.recaptchaVerifier)
            .then(function(confirmationResult) {
                console.log('SMS sent successfully');
                self.confirmationResult = confirmationResult;

                // Update UI to show verification step
                self.showVerificationStep();

                // Start resend timer
                self.startResendTimer();
            })
            .catch(function(error) {
                console.error('SMS send error:', error);
                self.showError(errorEl, self.getErrorMessage(error.code));
                // Reset reCAPTCHA verifier so it can be recreated for next attempt
                self.recaptchaVerifier = null;
            })
            .finally(function() {
                self.setPhoneLoadingState(submitBtn, false);
            });
    };

    FirebaseAuthHandler.prototype.handleCodeVerification = function() {
        var self = this;
        var codeInput = $('#verificationCode');
        var code = codeInput ? codeInput.value.trim() : '';
        var errorEl = $('#verifyError');
        var submitBtn = $('#verifyCodeBtn');

        // Clear previous errors
        if (errorEl) {
            errorEl.classList.remove('show');
            errorEl.textContent = '';
        }

        // Validate code
        if (!code || code.length !== 6) {
            this.showError(errorEl, 'Please enter the 6-digit verification code');
            return;
        }

        if (!this.confirmationResult) {
            this.showError(errorEl, 'Session expired. Please request a new code.');
            return;
        }

        // Show loading state
        this.setPhoneLoadingState(submitBtn, true);

        // Verify the code
        this.confirmationResult.confirm(code)
            .then(function(result) {
                console.log('Phone auth successful:', result.user);
                self.closeAuthModal();
                self.resetPhoneAuthState();
                setTimeout(function() {
                    self.showContractModal();
                }, 300);
            })
            .catch(function(error) {
                console.error('Code verification error:', error);
                self.showError(errorEl, self.getErrorMessage(error.code));
            })
            .finally(function() {
                self.setPhoneLoadingState(submitBtn, false);
            });
    };

    FirebaseAuthHandler.prototype.showVerificationStep = function() {
        var phoneForm = $('#phoneForm');
        var verifyForm = $('#verifyCodeForm');

        if (phoneForm) phoneForm.style.display = 'none';
        if (verifyForm) verifyForm.style.display = 'block';

        // Focus on code input
        var codeInput = $('#verificationCode');
        if (codeInput) {
            setTimeout(function() { codeInput.focus(); }, 100);
        }
    };

    FirebaseAuthHandler.prototype.resetPhoneAuthToStep1 = function() {
        var phoneForm = $('#phoneForm');
        var verifyForm = $('#verifyCodeForm');

        if (phoneForm) phoneForm.style.display = 'block';
        if (verifyForm) verifyForm.style.display = 'none';

        // Clear verification code
        var codeInput = $('#verificationCode');
        if (codeInput) codeInput.value = '';

        // Clear errors
        var phoneError = $('#phoneError');
        var verifyError = $('#verifyError');
        if (phoneError) phoneError.classList.remove('show');
        if (verifyError) verifyError.classList.remove('show');

        // Reset loading states on both buttons
        var sendCodeBtn = $('#sendCodeBtn');
        var verifyCodeBtn = $('#verifyCodeBtn');
        this.setPhoneLoadingState(sendCodeBtn, false);
        this.setPhoneLoadingState(verifyCodeBtn, false);

        // Reset reCAPTCHA verifier so a fresh one is created on next attempt
        this.recaptchaVerifier = null;

        // Stop resend timer
        this.stopResendTimer();
    };

    FirebaseAuthHandler.prototype.resetPhoneAuthState = function() {
        this.confirmationResult = null;
        this.currentPhoneNumber = '';
        this.resetPhoneAuthToStep1();

        // Clear phone form
        var phoneForm = $('#phoneForm');
        if (phoneForm) phoneForm.reset();
    };

    FirebaseAuthHandler.prototype.startResendTimer = function() {
        var self = this;
        var resendCountdown = 60;

        var timerEl = $('#resendTimer');
        var countdownEl = $('#countdown');
        var resendBtn = $('#resendCodeBtn');

        if (timerEl) timerEl.style.display = 'inline';
        if (resendBtn) resendBtn.style.display = 'none';
        if (countdownEl) countdownEl.textContent = resendCountdown;

        this.resendTimerInterval = setInterval(function() {
            resendCountdown--;

            if (countdownEl) {
                countdownEl.textContent = resendCountdown;
            }

            if (resendCountdown <= 0) {
                self.stopResendTimer();
                if (timerEl) timerEl.style.display = 'none';
                if (resendBtn) resendBtn.style.display = 'inline';
            }
        }, 1000);
    };

    FirebaseAuthHandler.prototype.stopResendTimer = function() {
        if (this.resendTimerInterval) {
            clearInterval(this.resendTimerInterval);
            this.resendTimerInterval = null;
        }
    };

    FirebaseAuthHandler.prototype.handleResendCode = function() {
        var self = this;
        var resendBtn = $('#resendCodeBtn');
        var errorEl = $('#verifyError');

        if (!this.currentPhoneNumber) {
            this.showError(errorEl, 'Phone number not found. Please start over.');
            return;
        }

        if (resendBtn) resendBtn.disabled = true;

        // Initialize reCAPTCHA if needed
        this.initRecaptcha();

        // Resend verification code
        firebase.auth().signInWithPhoneNumber(this.currentPhoneNumber, this.recaptchaVerifier)
            .then(function(confirmationResult) {
                console.log('SMS resent successfully');
                self.confirmationResult = confirmationResult;
                self.startResendTimer();
            })
            .catch(function(error) {
                console.error('Resend SMS error:', error);
                self.showError(errorEl, self.getErrorMessage(error.code));
                if (resendBtn) resendBtn.disabled = false;
            });
    };

    FirebaseAuthHandler.prototype.setPhoneLoadingState = function(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    };

    FirebaseAuthHandler.prototype.formatPhoneDisplay = function(phoneNumber) {
        // Format for display: +1 (555) 123-4567
        if (phoneNumber.startsWith('+1') && phoneNumber.length === 12) {
            var num = phoneNumber.slice(2);
            return '+1 (' + num.slice(0, 3) + ') ' + num.slice(3, 6) + '-' + num.slice(6);
        }
        return phoneNumber;
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

            // Guard against 0 dimensions - don't resize if canvas isn't visible yet
            if (rect.width <= 0 || rect.height <= 0) {
                console.log('Signature canvas not visible yet, will retry...', rect.width, 'x', rect.height);
                // Schedule a retry after a short delay
                setTimeout(function() {
                    var retryRect = canvas.getBoundingClientRect();
                    if (retryRect.width > 0 && retryRect.height > 0) {
                        resize();
                    }
                }, 100);
                return;
            }

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
        
        // Get coordinates from event - FIXED for canvas scaling
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
        
        // Calculate position relative to canvas
        var x = clientX - rect.left;
        var y = clientY - rect.top;
        
        // Scale coordinates to match internal canvas dimensions
        // This accounts for any CSS scaling vs internal canvas size mismatch
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        
        return {
            x: x * (scaleX / (window.devicePixelRatio || 1)),
            y: y * (scaleY / (window.devicePixelRatio || 1))
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
        ContractFormHandler.prototype.fetchHelpRequests = function(callback) {
    firebase.firestore().collection('help_requests')
        .where('status', '==', 'open')
        .orderBy('timestamp', 'desc')
        .get()
        .then(function(snapshot) {
            var helpRequests = [];
            snapshot.forEach(function(doc) {
                var data = doc.data();
                data.id = doc.id;
                helpRequests.push(data);
            });
            if (callback) callback(helpRequests);
        })
        .catch(function(error) {
            console.error('Error fetching help requests:', error);
            if (callback) callback([]);
        });
};

ContractFormHandler.prototype.getIssueTypeLabel = function(issueType) {
    var labels = {
        'contract_not_showing': 'Contract Not Showing',
        'problems_submitting': 'Problems Submitting',
        'signature_issues': 'Signature Issues',
        'account_access': 'Account Access',
        'other': 'Other Issues'
    };
    return labels[issueType] || issueType;
};

ContractFormHandler.prototype.resolveHelpRequest = function(requestId) {
    var self = this;
    
    if (!confirm('Mark this help request as resolved?')) {
        return;
    }
    
    firebase.firestore().collection('help_requests')
        .doc(requestId)
        .update({
            status: 'resolved',
            resolved: true,
            resolvedTimestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(function() {
            console.log('Help request marked as resolved');
            self.showDeveloperDashboard();
        })
        .catch(function(error) {
            console.error('Error resolving help request:', error);
            alert('Error marking request as resolved: ' + error.message);
        });
};
ContractFormHandler.prototype.resolveAllHelpRequests = function(helpRequests) {
    var self = this;
    
    if (helpRequests.length === 0) {
        return;
    }
    
    if (!confirm('Mark all ' + helpRequests.length + ' help request(s) as resolved?')) {
        return;
    }
    
    var batch = firebase.firestore().batch();
    var resolvedTimestamp = firebase.firestore.FieldValue.serverTimestamp();
    
    helpRequests.forEach(function(request) {
        var docRef = firebase.firestore().collection('help_requests').doc(request.id);
        batch.update(docRef, {
            status: 'resolved',
            resolved: true,
            resolvedTimestamp: resolvedTimestamp
        });
    });
    
    batch.commit()
        .then(function() {
            console.log('All help requests marked as resolved');
            self.showDeveloperDashboard();
        })
        .catch(function(error) {
            console.error('Error resolving all help requests:', error);
            alert('Error marking requests as resolved: ' + error.message);
        });
};
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
        
        this.init();
    };
var HelpRequestHandler = function() {
    this.helpModal = $('#helpModal');
    this.helpForm = $('#helpRequestForm');
    this.currentUser = null;
    
    if (!this.helpModal || !this.helpForm) {
        console.log('Help modal elements not found');
        return;
    }
    
    this.init();
};

HelpRequestHandler.prototype.init = function() {
    var self = this;
    
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            self.currentUser = user;
            if (user) {
                var contactField = $('#helpContact');
                if (contactField && self.helpModal.classList.contains('show')) {
                    contactField.value = user.email || formatPhoneNumber(user.phoneNumber) || '';
                }
            }
        });
    }
    
    var requestHelpBtn = $('#requestHelpBtn');
    if (requestHelpBtn) {
        requestHelpBtn.addEventListener('click', function(e) {
            e.preventDefault();
            self.showHelpModal();
        });
    }
    
    var closeHelpBtn = $('#closeHelpBtn');
    if (closeHelpBtn) {
        closeHelpBtn.addEventListener('click', function() {
            self.closeHelpModal();
        });
    }
    
    var cancelHelpBtn = $('#cancelHelpBtn');
    if (cancelHelpBtn) {
        cancelHelpBtn.addEventListener('click', function() {
            self.closeHelpModal();
        });
    }
    
    var overlay = $('.modal-overlay', this.helpModal);
    if (overlay) {
        overlay.addEventListener('click', function() {
            self.closeHelpModal();
        });
    }
    
    if (this.helpForm) {
        this.helpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            self.submitHelpRequest();
        });
    }
};

HelpRequestHandler.prototype.showHelpModal = function() {
    if (this.helpModal) {
        this.helpModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');

        var successMessage = $('#helpSuccessMessage');
        if (successMessage) successMessage.classList.remove('show');

        var formFields = $('.help-form');
        if (formFields) formFields.style.display = 'block';

        if (this.helpForm) this.helpForm.reset();

        var contactField = $('#helpContact');
        var contactLabel = $('#helpContactLabel');
        var contactHint = $('#helpContactHint');
        var contactTabs = $('#contactTabs');

        if (contactField && this.currentUser) {
            // User is signed in - hide tabs, show their contact info
            if (contactTabs) contactTabs.style.display = 'none';

            var hasEmail = this.currentUser.email;
            var hasPhone = this.currentUser.phoneNumber;

            if (hasEmail) {
                contactField.value = this.currentUser.email;
                contactField.type = 'email';
                contactField.placeholder = 'your@email.com';
                if (contactLabel) contactLabel.textContent = 'Your Email *';
                if (contactHint) contactHint.textContent = "We'll use this to contact you about your request";
            } else if (hasPhone) {
                contactField.value = formatPhoneNumber(this.currentUser.phoneNumber);
                contactField.type = 'tel';
                contactField.placeholder = '(555) 123-4567';
                if (contactLabel) contactLabel.textContent = 'Your Phone Number *';
                if (contactHint) contactHint.textContent = "We'll use this to contact you about your request";
            }

            contactField.setAttribute('readonly', 'readonly');
            contactField.style.opacity = '0.7';
        } else if (contactField) {
            // User is NOT signed in - show tabs for email/phone selection
            if (contactTabs) {
                contactTabs.style.display = 'flex';
                this.setupContactTabs(contactField, contactLabel, contactHint, contactTabs);
            }

            contactField.removeAttribute('readonly');
            contactField.style.opacity = '1';
            contactField.type = 'email';
            contactField.value = '';
            contactField.placeholder = 'your@email.com';
            if (contactLabel) contactLabel.textContent = 'Your Email *';

            // Reset tabs to email
            var tabs = $$('.contact-tab', contactTabs);
            tabs.forEach(function(tab) {
                tab.classList.toggle('active', tab.dataset.type === 'email');
            });
        }
    }
};

HelpRequestHandler.prototype.setupContactTabs = function(contactField, contactLabel, contactHint, contactTabs) {
    var self = this;
    var tabs = $$('.contact-tab', contactTabs);

    // Remove existing listeners by cloning
    tabs.forEach(function(tab) {
        var newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
    });

    // Re-query after cloning
    tabs = $$('.contact-tab', contactTabs);

    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            var type = this.dataset.type;

            // Update active state
            tabs.forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');

            // Clear the field
            contactField.value = '';

            if (type === 'email') {
                contactField.type = 'email';
                contactField.placeholder = 'your@email.com';
                if (contactLabel) contactLabel.textContent = 'Your Email *';
                if (contactHint) contactHint.textContent = "We'll use this to contact you about your request";
                // Remove phone formatting listener
                self.removePhoneFormatting(contactField);
            } else {
                contactField.type = 'tel';
                contactField.placeholder = '(555) 123-4567';
                if (contactLabel) contactLabel.textContent = 'Your Phone Number *';
                if (contactHint) contactHint.textContent = "We'll use this to contact you about your request";
                // Add phone formatting
                setupPhoneInputFormatting(contactField);
            }

            contactField.focus();
        });
    });
};

HelpRequestHandler.prototype.removePhoneFormatting = function(input) {
    // Clone and replace to remove all event listeners
    var newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
};

HelpRequestHandler.prototype.closeHelpModal = function() {
    if (this.helpModal) {
        this.helpModal.classList.remove('show');
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');
    }
};

HelpRequestHandler.prototype.submitHelpRequest = function() {
    var self = this;
    
    var submitBtn = this.helpForm.querySelector('button[type="submit"]');
    var submitText = $('#helpSubmitText');
    var originalText = submitText ? submitText.textContent : 'Send Help Request';
    
    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.textContent = 'Sending...';
    
    var helpContact = $('#helpContact').value.trim();
    var helpIssue = $('#helpIssue').value;
    var helpDetails = $('#helpDetails').value.trim();

    if (!helpContact || !helpIssue || !helpDetails) {
        alert('Please fill in all required fields');
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = originalText;
        return;
    }

    // Determine if contact is email or phone
    var isPhone = this.currentUser && this.currentUser.phoneNumber && !this.currentUser.email;
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var phoneRegex = /^\+?[1-9]\d{6,14}$/;

    if (!isPhone && !emailRegex.test(helpContact)) {
        alert('Please enter a valid email address');
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = originalText;
        return;
    }

    if (isPhone && !phoneRegex.test(helpContact.replace(/[\s\-\(\)]/g, ''))) {
        alert('Please enter a valid phone number');
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = originalText;
        return;
    }

    var helpRequestData = {
        userContact: helpContact,
        contactType: isPhone ? 'phone' : 'email',
        userEmail: isPhone ? '' : helpContact,
        userPhone: isPhone ? helpContact : '',
        issueType: helpIssue,
        issueDetails: helpDetails,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'open',
        resolved: false,
        isAuthenticated: !!this.currentUser
    };
    
    if (this.currentUser) {
        helpRequestData.userId = this.currentUser.uid;
    }
    
    console.log('Submitting help request:', helpRequestData);
    
    firebase.firestore().collection('help_requests').add(helpRequestData)
        .then(function(docRef) {
            console.log('Help request submitted with ID:', docRef.id);
            self.showSuccessMessage();
            
            setTimeout(function() {
                self.closeHelpModal();
            }, 3000);
        })
        .catch(function(error) {
            console.error('Error submitting help request:', error);
            alert('Error submitting help request: ' + error.message + '\n\nPlease try again or contact support directly.');
            
            if (submitBtn) submitBtn.disabled = false;
            if (submitText) submitText.textContent = originalText;
        });
};

HelpRequestHandler.prototype.showSuccessMessage = function() {
    // Hide individual form groups instead of entire form
    var formGroups = $$('.form-group');
    formGroups.forEach(function(group) {
        group.style.display = 'none';
    });
    
    var footer = $('.help-form-footer');
    if (footer) footer.style.display = 'none';
    
    var successMessage = $('#helpSuccessMessage');
    if (successMessage) {
        successMessage.classList.add('show');
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
                // Handle both email and phone auth users
                self.currentUserEmail = user.email ? user.email.trim().toLowerCase() : '';
                self.isDeveloper = self.currentUserEmail && self.currentUserEmail === self.DEVELOPER_EMAIL;
                
               
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
                    // Handle both email and phone auth users
                    self.currentUserEmail = user.email ? user.email.trim().toLowerCase() : '';
                    self.isDeveloper = self.currentUserEmail && self.currentUserEmail === self.DEVELOPER_EMAIL;

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
    
    // ✅ HIDE the original modal-close button
    var modalClose = $('.modal-close');
    if (modalClose) {
        modalClose.style.display = 'none';
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
    ContractFormHandler.prototype.renderHelpRequestsSection = function(helpRequests) {
    var self = this;
    var helpContent = $('#helpTabContent');
    var helpBadge = $('#helpCountBadge');
    
    if (!helpContent) return;
    
    // Update badge count
    if (helpBadge) helpBadge.textContent = helpRequests.length;
    
    var html = '<div class="help-tab-header">' +
    '<h3>🆘 Help Requests</h3>' +
    '<div style="display: flex; align-items: center; gap: 10px;">';
    
    if (helpRequests.length > 0) {
        html += '<button class="btn-resolve-all" style="padding: 6px 12px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600;">✓ Resolve All</button>';
    }
    
    html += '</div></div>';
    if (helpRequests.length === 0) {
        html += '<div class="empty-state">' +
            '<div class="empty-icon">✅</div>' +
            '<p>No pending help requests</p>' +
            '</div>';
    } else {
        html += '<div class="help-list">';
        helpRequests.forEach(function(request) {
            var requestDate = request.timestamp ? 
                (request.timestamp.toDate ? request.timestamp.toDate().toLocaleDateString() : new Date(request.timestamp).toLocaleDateString()) 
                : 'N/A';
            
            var authBadge = request.isAuthenticated 
                ? '<span class="auth-badge verified">✓ Verified User</span>' 
                : '<span class="auth-badge anonymous">◎ Anonymous</span>';
            
            html += '<div class="help-item" data-request-id="' + request.id + '">' +
                '<div class="help-icon">❓</div>' +
                '<div class="help-details">' +
                '<div class="help-header">' +
                '<h4>' + (request.userEmail || request.userPhone || 'Unknown User') + '</h4>' +
                authBadge +
                '<span class="help-badge">' + self.getIssueTypeLabel(request.issueType) + '</span>' +
                '</div>' +
                '<p class="help-message">' + (request.issueDetails || 'No details provided') + '</p>' +
                '<div class="help-meta">' +
                '<span class="meta-item">📅 ' + requestDate + '</span>' +
                '</div>' +
                '</div>' +
                '<div class="help-actions">' +
                '<button class="btn-resolve-help" data-request-id="' + request.id + '" title="Mark as resolved">' +
                '✓ Resolve' +
                '</button>' +
                '</div>' +
                '</div>';
        });
        html += '</div>';
    }
    html += '</div>';
    
    helpContent.innerHTML = html;
    
$$('.btn-resolve-help').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            var requestId = this.getAttribute('data-request-id');
            self.resolveHelpRequest(requestId);
        });
    });
    
    // Add Resolve All button listener
    var resolveAllBtn = $('.btn-resolve-all');
    if (resolveAllBtn) {
        resolveAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            self.resolveAllHelpRequests(helpRequests);
        });
    }
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
                // Render the dashboard
self.renderDeveloperDashboard(pendingContracts, completedContracts);

// Fetch and render help requests
self.fetchHelpRequests(function(helpRequests) {
    self.renderHelpRequestsSection(helpRequests);
});
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
    
    // ✅ ADD CLOSE BUTTON AT THE TOP
    html += '<button class="dashboard-close" onclick="document.querySelector(\'.contract-modal\').classList.remove(\'show\'); document.body.classList.remove(\'modal-open\'); document.body.style.overflow = \'\';">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<line x1="18" y1="6" x2="6" y2="18"></line>' +
        '<line x1="6" y1="6" x2="18" y2="18"></line>' +
        '</svg>' +
        '</button>';
    
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
    
    // ============= TABBED INTERFACE =============
html += '<div class="dashboard-tabs">' +
    '<div class="tab-buttons">' +
    '<button class="tab-btn active" data-tab="contracts">' +
    '<span class="tab-icon">📄</span>' +
    '<span class="tab-label">Contracts</span>' +
    '<span class="tab-badge">' + (pendingContracts.length + completedContracts.length) + '</span>' +
    '</button>' +
    '<button class="tab-btn" data-tab="sow">' +
    '<span class="tab-icon">📋</span>' +
    '<span class="tab-label">SOW Documents</span>' +
    '<span class="tab-badge" id="sowCountBadge">0</span>' +
    '</button>' +
    '<button class="tab-btn" data-tab="help">' +
    '<span class="tab-icon">🆘</span>' +
    '<span class="tab-label">Help Requests</span>' +
    '<span class="tab-badge" id="helpCountBadge">0</span>' +
    '</button>' +
    '</div>' +
        
        '<div class="tab-content">' +
    // Contracts Tab
    '<div class="tab-pane active" data-tab="contracts">' +
    self.renderContractsTab(pendingContracts, completedContracts) +
    '</div>' +
    
    // SOW Tab
    '<div class="tab-pane" data-tab="sow">' +
    '<div id="sowTabContent">' +
    '<div class="loading-state">' +
    '<div class="spinner"></div>' +
    '<p>Loading SOW documents...</p>' +
    '</div>' +
    '</div>' +
    '</div>' +
    
    // Help Requests Tab
    '<div class="tab-pane" data-tab="help">' +
    '<div id="helpTabContent">' +
    '<div class="loading-state">' +
    '<div class="spinner"></div>' +
    '<p>Loading help requests...</p>' +
    '</div>' +
    '</div>' +
    '</div>' +
    
    '</div>' +
    '</div>';
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
    
    // Tab switching
    $$('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var tabName = this.getAttribute('data-tab');
            self.switchTab(tabName);
        });
    });
    
    // Load SOWs for the SOW tab
    this.loadSOWDocuments();
};

// New function to render contracts tab content
ContractFormHandler.prototype.renderContractsTab = function(pendingContracts, completedContracts) {
    var self = this;
    var html = '';
    
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
    
    return html;
};

// New function to switch tabs
ContractFormHandler.prototype.switchTab = function(tabName) {
    // Update buttons
    $$('.tab-btn').forEach(function(btn) {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update content
    $$('.tab-pane').forEach(function(pane) {
        pane.classList.remove('active');
        if (pane.getAttribute('data-tab') === tabName) {
            pane.classList.add('active');
        }
    });
};

// New function to load SOW documents
ContractFormHandler.prototype.loadSOWDocuments = function() {
    var self = this;

    firebase.firestore().collection('sow_documents')
        .orderBy('createdAt', 'desc')
        .get()
        .then(function(snapshot) {
            var sows = [];
            var changeRequestIds = [];

            snapshot.forEach(function(doc) {
                var data = doc.data();
                data.id = doc.id;
                sows.push(data);

                // Collect change request IDs
                if (data.changeRequestId) {
                    changeRequestIds.push(data.changeRequestId);
                }
            });

            // If there are change requests, fetch them to check for unread messages
            if (changeRequestIds.length > 0) {
                self.fetchChangeRequestsUnreadStatus(changeRequestIds, sows);
            } else {
                self.renderSOWTab(sows);
            }
        })
        .catch(function(error) {
            console.error('Error loading SOWs:', error);
            var sowContent = $('#sowTabContent');
            if (sowContent) {
                sowContent.innerHTML = '<div class="error-state">' +
                    '<p>Error loading SOW documents</p>' +
                    '<button class="btn-create-sow" onclick="location.reload()">Retry</button>' +
                    '</div>';
            }
        });
};

// Fetch change requests to check for unread messages
ContractFormHandler.prototype.fetchChangeRequestsUnreadStatus = function(changeRequestIds, sows) {
    var self = this;
    var viewerType = self.isDeveloper ? 'developer' : 'client';
    var lastViewedField = self.isDeveloper ? 'developerLastViewed' : 'clientLastViewed';

    // Firestore doesn't support 'in' queries with more than 10 items, so chunk them
    var chunks = [];
    for (var i = 0; i < changeRequestIds.length; i += 10) {
        chunks.push(changeRequestIds.slice(i, i + 10));
    }

    var changeRequestsMap = {};
    var promises = chunks.map(function(chunk) {
        return firebase.firestore().collection('change_requests')
            .where(firebase.firestore.FieldPath.documentId(), 'in', chunk)
            .get()
            .then(function(snapshot) {
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    data.id = doc.id;

                    // Check if there are unread messages
                    var hasUnread = false;
                    if (data.lastMessageBy && data.lastMessageBy !== viewerType && data.lastMessageAt) {
                        var lastViewed = data[lastViewedField];
                        if (!lastViewed || data.lastMessageAt.toMillis() > lastViewed.toMillis()) {
                            hasUnread = true;
                        }
                    }
                    data.hasUnreadMessages = hasUnread;
                    changeRequestsMap[doc.id] = data;
                });
            });
    });

    Promise.all(promises)
        .then(function() {
            // Attach change request data to SOWs
            sows.forEach(function(sow) {
                if (sow.changeRequestId && changeRequestsMap[sow.changeRequestId]) {
                    sow.changeRequestData = changeRequestsMap[sow.changeRequestId];
                }
            });
            self.renderSOWTab(sows);
        })
        .catch(function(error) {
            console.error('Error fetching change requests:', error);
            // Still render SOWs even if change request fetch fails
            self.renderSOWTab(sows);
        });
};

// New function to render SOW tab
// ============= COMPLETE REPLACEMENT: renderSOWTab =============
ContractFormHandler.prototype.renderSOWTab = function(sows) {
    var self = this;
    var sowContent = $('#sowTabContent');
    var sowBadge = $('#sowCountBadge');
    
    if (!sowContent) return;
    
    // Update badge count
    if (sowBadge) sowBadge.textContent = sows.length;
    
    var html = '<div class="sow-tab-header">' +
        '<button class="btn-create-sow" onclick="window.contractFormHandler.showSOWCreator()">' +
        '<span class="btn-icon">+</span> Create SOW' +
        '</button>' +
        '</div>';
    
    if (sows.length === 0) {
        html += '<div class="empty-state">' +
            '<div class="empty-icon">📋</div>' +
            '<h4>No SOW Documents Yet</h4>' +
            '<p>Create your first Statement of Work to get started</p>' +
            '<button class="btn-create-sow" onclick="window.contractFormHandler.showSOWCreator()" style="margin-top: 20px;">' +
            '<span class="btn-icon">+</span> Create SOW' +
            '</button>' +
            '</div>';
    } else {
        html += '<div class="sow-list">';
        sows.forEach(function(sow) {
            var createdDate = sow.createdAt ? 
                (sow.createdAt.toDate ? sow.createdAt.toDate().toLocaleDateString() : new Date(sow.createdAt).toLocaleDateString()) 
                : 'N/A';
            
            var packageNames = {
                'starter': 'Tier 1 — Starter',
                'professional': 'Tier 2 — Professional',
                'premium': 'Tier 3 — Premium',
                'elite': 'Tier 4 — Elite',
                'custom': 'Custom Quote'
            };
            
            var statusColors = {
                'draft': { bg: '#374151', color: '#9ca3af', icon: '📝' },
                'sent': { bg: '#1e40af', color: '#60a5fa', icon: '📤' },
                'approved': { bg: '#065f46', color: '#34d399', icon: '✅' }
            };
            
            var status = sow.status || 'draft';
            var statusStyle = statusColors[status] || statusColors['draft'];

            // 🔥 Enhanced status with signature info
            var statusText = status.toUpperCase();
            if (status === 'pending_developer' || status === 'sent') {
                if (sow.clientSignature && !sow.devSignature) {
                    statusText = '⏳ AWAITING DEV';
                } else if (!sow.clientSignature) {
                    statusText = '📤 AWAITING CLIENT';
                }
            } else if (status === 'approved' && sow.clientSignature && sow.devSignature) {
                statusText = '✅ FULLY SIGNED';
            }
            
           // Store SOW data in window for inline handlers to access
            var sowDataId = 'sowData_' + sow.id.replace(/[^a-zA-Z0-9]/g, '_');
            window[sowDataId] = sow;
            
                        // Contract status is now handled inline in the header
           
            // Change request badge with unread indicator
            var changeRequestBadge = '';
            if (sow.hasChangeRequest && sow.changeRequestStatus) {
                var crStyles = {
                    'pending': { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', text: '📝 Change Requested' },
                    'approved': { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', text: '✅ Change Approved' },
                    'rejected': { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', text: '❌ Change Rejected' },
                    'change_order': { bg: 'rgba(99, 102, 241, 0.2)', color: '#6366f1', text: '📋 Change Order' }
                };
                var crStyle = crStyles[sow.changeRequestStatus] || crStyles.pending;

                // Check for unread messages
                var unreadBadge = '';
                if (sow.changeRequestData && sow.changeRequestData.hasUnreadMessages) {
                    unreadBadge = '<span class="unread-badge">New</span>';
                }

                changeRequestBadge = '<div style="font-size: 0.75rem; color: ' + crStyle.color + '; background: ' + crStyle.bg + '; padding: 4px 8px; border-radius: 4px; white-space: nowrap; cursor: pointer; display: flex; align-items: center;" onclick="window.contractFormHandler.viewChangeRequest(\'' + sow.changeRequestId + '\')">' +
                    crStyle.text + unreadBadge +
                    '</div>';
            }

            html += '<div class="sow-item" data-sow-id="' + sow.id + '">' +
                '<div class="sow-item-header">' +
                '<div class="sow-client-info">' +
                '<h4>' + (sow.clientName || 'Unknown Client') + '</h4>' +
                '<p class="sow-package">' + (packageNames[sow.packageType] || sow.packageType) + '</p>' +
                '</div>' +
                '<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">' +
                '<span class="sow-status" style="background: ' + statusStyle.bg + '; color: ' + statusStyle.color + ';">' +
                statusStyle.icon + ' ' + statusText +
                '</span>' +
                (sow.linkedContract ?
                    '<div style="font-size: 0.75rem; color: #10b981; background: rgba(16, 185, 129, 0.15); padding: 4px 8px; border-radius: 4px; white-space: nowrap;">' +
                    '🔗 Linked to Contract' +
                    '</div>'
                : '') +
                changeRequestBadge +
                '</div>' +
                '</div>' +

                '<div class="sow-item-details">' +
                '<div class="sow-detail-row">' +
                '<span class="detail-label">' + (sow.clientEmail ? '📧 Email:' : '📱 Phone:') + '</span>' +
                '<span class="detail-value">' + (sow.clientEmail || (sow.clientPhone ? formatPhoneNumber(sow.clientPhone) : 'N/A')) + '</span>' +
                '</div>' +
                '<div class="sow-detail-row">' +
                '<span class="detail-label">💰 Total:</span>' +
                '<span class="detail-value">$' + ((sow.payment && sow.payment.total) ? sow.payment.total.toFixed(2) : '0.00') + '</span>' +
                '</div>' +
                '<div class="sow-detail-row">' +
                '<span class="detail-label">⏱️ Timeline:</span>' +
                '<span class="detail-value">' + (sow.estimatedWeeks || 'TBD') + ' weeks</span>' +
                '</div>' +
                '<div class="sow-detail-row">' +
                '<span class="detail-label">📅 Created:</span>' +
                '<span class="detail-value">' + createdDate + '</span>' +
                '</div>' +
                '</div>' +

// Change Request Card (if pending)
(sow.hasChangeRequest && sow.changeRequestStatus === 'pending' ?
    '<div class="change-request-card" style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem;">' +
    '<div>' +
    '<p style="margin: 0; font-weight: 600; color: #fbbf24; font-size: 0.9rem; display: flex; align-items: center;">📝 Client Requested Changes' +
    (sow.changeRequestData && sow.changeRequestData.hasUnreadMessages ? '<span class="unread-badge">New</span>' : '') +
    '</p>' +
    '<p style="margin: 0.25rem 0 0; font-size: 0.8rem; opacity: 0.8;">Review and respond to this change request</p>' +
    '</div>' +
    '</div>'
: '') +

                '<div class="sow-item-actions">' +
// Sign button (if not fully signed)
((!sow.clientSignature || !sow.devSignature) ?
    '<button class="btn-sign-sow" onclick="window.contractFormHandler.showSOWSigningModal(\'' + sow.id + '\')" title="Sign SOW">' +
    '<span>✍️ Sign</span>' +
    '</button>' : '') +

// View Change Request button (if there's a change request)
(sow.hasChangeRequest && sow.changeRequestId ?
    '<button class="btn-view-request" onclick="window.contractFormHandler.viewChangeRequest(\'' + sow.changeRequestId + '\')" title="View Change Request">' +
    '<span>📝 View Request' + (sow.changeRequestData && sow.changeRequestData.hasUnreadMessages ? ' <span class="unread-badge">New</span>' : '') + '</span>' +
    '</button>' : '') +

'<button class="btn-edit-sow" onclick="window.contractFormHandler.editSOW(window.' + sowDataId + ')" title="Edit SOW">' +
'<span>✏️ Edit</span>' +
'</button>' +
'<button class="btn-download-sow" onclick="window.contractFormHandler.generateSOWPDF(window.' + sowDataId + ')" title="Download PDF">' +
'<span>📄 PDF</span>' +
'</button>' +
'<button class="btn-delete-sow" onclick="window.contractFormHandler.deleteSOW(\'' + sow.id + '\')" title="Delete SOW">' +
'<span>🗑️</span>' +
'</button>' +
'</div>' +
                '</div>';
        });
        html += '</div>';
    }
    
    // SOW Creator Container
    html += '<div id="sowCreatorContainer" style="display: none;"></div>';
    
    sowContent.innerHTML = html;
    
    console.log('✓ SOW tab rendered with', sows.length, 'items');
};

// Helper function to view SOW details
ContractFormHandler.prototype.viewSOWDetails = function(sow) {
    alert('SOW Details for: ' + sow.clientName + '\n\n' +
        'Package: ' + sow.packageType + '\n' +
        'Total: $' + (sow.payment ? sow.payment.total.toFixed(2) : '0.00') + '\n' +
        'Timeline: ' + (sow.estimatedWeeks || 'TBD') + ' weeks\n' +
        'Features: ' + (sow.features ? sow.features.length : 0) + ' selected');
};

// Helper function to generate PDF from saved SOW data
ContractFormHandler.prototype.generateSOWPDFFromData = function(sow) {
    // Temporarily populate the form with SOW data
    var clientNameField = $('#sowClientName');
    var clientEmailField = $('#sowClientEmail');
    var packageField = $('#sowPackage');
    var weeksField = $('#sowWeeks');
    var notesField = $('#sowNotes');
    var maintenanceField = $('#sowMaintenance');
    
    if (clientNameField) clientNameField.value = sow.clientName || '';
    if (clientEmailField) clientEmailField.value = sow.clientEmail || '';
    if (packageField) packageField.value = sow.packageType || '';
    if (weeksField) weeksField.value = sow.estimatedWeeks || '';
    if (notesField) notesField.value = sow.notes || '';
    if (maintenanceField) maintenanceField.value = sow.maintenancePlan || 'none';
    
    // Generate PDF
    this.generateSOWPDF();
};

// Helper function to delete SOW
ContractFormHandler.prototype.deleteSOW = function(sowId) {
    if (!confirm('Are you sure you want to delete this SOW? This action cannot be undone.')) {
        return;
    }

    var self = this;

    firebase.firestore().collection('sow_documents')
        .doc(sowId)
        .delete()
        .then(function() {
            console.log('SOW deleted successfully');
            alert('✓ SOW deleted successfully');
            self.loadSOWDocuments();
        })
        .catch(function(error) {
            console.error('Error deleting SOW:', error);
            alert('Error deleting SOW: ' + error.message);
        });
};

// ============= CHANGE REQUEST FUNCTIONS =============

ContractFormHandler.prototype.showChangeRequestModal = function(sowData) {
    var self = this;

    // Store SOW data for the request
    this.currentChangeRequestSOW = sowData;

    // SOW sections that can be changed
    var sections = [
        { id: 'package', label: 'Package Tier', desc: 'Change to a different package level' },
        { id: 'features', label: 'Features & Deliverables', desc: 'Add, remove, or modify features' },
        { id: 'timeline', label: 'Timeline', desc: 'Adjust project duration or milestones' },
        { id: 'payment', label: 'Payment Structure', desc: 'Modify payment schedule or amounts' },
        { id: 'maintenance', label: 'Maintenance Plan', desc: 'Change ongoing maintenance options' },
        { id: 'other', label: 'Other', desc: 'Any other modifications not listed above' }
    ];

    var sectionsHtml = sections.map(function(section) {
        return '<label class="change-section-option">' +
            '<input type="checkbox" name="changeSections" value="' + section.id + '" />' +
            '<div class="section-option-content">' +
            '<span class="section-option-label">' + section.label + '</span>' +
            '<span class="section-option-desc">' + section.desc + '</span>' +
            '</div>' +
            '</label>';
    }).join('');

    var modalHtml = '<div id="changeRequestModal" class="modal-overlay" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); backdrop-filter: blur(10px); z-index: 10000; justify-content: center; align-items: center;">' +
        '<div class="modal-content" style="max-width: 800px; padding: 2rem;">' +
        '<div class="modal-header" style="position: relative; padding-bottom: 1rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">' +
        '<h2 style="margin: 0; font-size: 1.5rem; color: #fff;">📝 Request SOW Change</h2>' +
        '<button type="button" class="modal-close" onclick="window.contractFormHandler.closeChangeRequestModal()" style="position: absolute; top: 0; right: 0; background: rgba(255, 255, 255, 0.1); border: none; width: 36px; height: 36px; border-radius: 50%; color: #fff; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;">×</button>' +
        '</div>' +
        '<div class="modal-body" style="color: #fff;">' +

        '<div class="change-request-info" style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">' +
        '<p style="margin: 0; font-size: 0.9rem;"><strong>📋 SOW:</strong> ' + (sowData.packageType || 'N/A') + ' Package</p>' +
        '<p style="margin: 0.5rem 0 0; font-size: 0.9rem;"><strong>💰 Current Total:</strong> $' + (sowData.payment ? sowData.payment.total.toFixed(2) : '0.00') + '</p>' +
        '</div>' +

        '<div class="form-group">' +
        '<label class="form-label" style="display: block; margin-bottom: 0.75rem; font-weight: 600;">Which sections do you want to modify?</label>' +
        '<div class="change-sections-grid" style="display: grid; gap: 0.75rem;">' +
        sectionsHtml +
        '</div>' +
        '</div>' +

        '<div class="form-group" style="margin-top: 1.5rem;">' +
        '<label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Describe the changes you need:</label>' +
        '<textarea id="changeRequestDescription" class="form-input" rows="5" placeholder="Please describe in detail what changes you would like to make. Be as specific as possible to help the developer understand your request." style="width: 100%; resize: vertical; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 0.75rem; color: #fff; font-size: 0.95rem;"></textarea>' +
        '</div>' +

        '<div class="form-group" style="margin-top: 1rem;">' +
        '<label class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Priority Level:</label>' +
        '<select id="changeRequestPriority" class="form-input" style="width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 0.75rem; color: #fff; font-size: 0.95rem;">' +
        '<option value="normal" style="background: #1a1a1a; color: #fff;">Normal - Can wait for next review cycle</option>' +
        '<option value="high" style="background: #1a1a1a; color: #fff;">High - Needed before project continues</option>' +
        '<option value="urgent" style="background: #1a1a1a; color: #fff;">Urgent - Critical blocker</option>' +
        '</select>' +
        '</div>' +

        '</div>' +
        '<div class="modal-footer" style="display: flex; gap: 1rem; justify-content: flex-end; padding-top: 1.5rem; margin-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1);">' +
        '<button type="button" class="btn btn-secondary" onclick="window.contractFormHandler.closeChangeRequestModal()" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600;">Cancel</button>' +
        '<button type="button" class="btn btn-primary" onclick="window.contractFormHandler.submitChangeRequest()" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border: none; color: #fff; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600;">Submit Request</button>' +
        '</div>' +
        '</div>' +
        '</div>';

    // Add modal styles if not already present
    if (!document.getElementById('changeRequestStyles')) {
        var styleEl = document.createElement('style');
        styleEl.id = 'changeRequestStyles';
        styleEl.textContent = '.change-section-option { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; transition: all 0.2s; }' +
            '.change-section-option:hover { background: rgba(255,255,255,0.08); border-color: rgba(99, 102, 241, 0.5); }' +
            '.change-section-option input[type="checkbox"] { margin-top: 3px; }' +
            '.change-section-option input[type="checkbox"]:checked + .section-option-content { color: #6366f1; }' +
            '.section-option-content { display: flex; flex-direction: column; }' +
            '.section-option-label { font-weight: 600; font-size: 0.95rem; }' +
            '.section-option-desc { font-size: 0.8rem; opacity: 0.7; margin-top: 2px; }' +
            '.change-request-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }' +
            '.change-request-badge.pending { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }' +
            '.change-request-badge.approved { background: rgba(16, 185, 129, 0.2); color: #10b981; }' +
            '.change-request-badge.rejected { background: rgba(239, 68, 68, 0.2); color: #ef4444; }' +
            '.change-request-badge.change-order { background: rgba(99, 102, 241, 0.2); color: #6366f1; }' +
            '.change-request-card { background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; padding: 1rem; margin-top: 1rem; }' +
            '.change-request-card.approved { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); }' +
            '.change-request-card.rejected { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); }' +
            '.btn-change-request { cursor: pointer !important; pointer-events: auto !important; }' +
            '.btn-change-request:hover { background: linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, rgba(245, 158, 11, 0.4) 100%) !important; border-color: rgba(251, 191, 36, 0.6) !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2); }';
        document.head.appendChild(styleEl);
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

ContractFormHandler.prototype.closeChangeRequestModal = function() {
    var modal = document.getElementById('changeRequestModal');
    if (modal) modal.remove();
    this.currentChangeRequestSOW = null;
};

ContractFormHandler.prototype.submitChangeRequest = function() {
    var self = this;
    var sowData = this.currentChangeRequestSOW;

    if (!sowData) {
        alert('Error: No SOW data found');
        return;
    }

    // Get selected sections
    var selectedSections = [];
    document.querySelectorAll('input[name="changeSections"]:checked').forEach(function(checkbox) {
        selectedSections.push(checkbox.value);
    });

    if (selectedSections.length === 0) {
        alert('Please select at least one section to modify');
        return;
    }

    var description = document.getElementById('changeRequestDescription').value.trim();
    if (!description) {
        alert('Please describe the changes you need');
        return;
    }

    var priority = document.getElementById('changeRequestPriority').value;

    // Create change request object
    var changeRequest = {
        sowId: sowData.id,
        sowData: {
            clientName: sowData.clientName,
            clientEmail: sowData.clientEmail,
            clientPhone: sowData.clientPhone,
            packageType: sowData.packageType,
            payment: sowData.payment,
            estimatedWeeks: sowData.estimatedWeeks
        },
        sections: selectedSections,
        description: description,
        priority: priority,
        status: 'pending',
        clientEmail: sowData.clientEmail,
        clientPhone: sowData.clientPhone || '',
        clientName: sowData.clientName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Save to Firebase
    var changeRequestId = null;
    firebase.firestore().collection('change_requests')
        .add(changeRequest)
        .then(function(docRef) {
            console.log('Change request submitted:', docRef.id);
            changeRequestId = docRef.id;

            // Update SOW document to flag it has a pending change request
            return firebase.firestore().collection('sow_documents')
                .doc(sowData.id)
                .update({
                    hasChangeRequest: true,
                    changeRequestId: docRef.id,
                    changeRequestStatus: 'pending'
                });
        })
        .then(function() {
            // Update the button in real-time to show "View Request"
            var btn = document.getElementById('changeRequestBtn-' + sowData.id);
            if (btn) {
                btn.className = 'sow-action-btn';
                btn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                btn.style.color = 'white';
                btn.style.border = 'none';
                btn.innerHTML = '💬 View Request';
                btn.onclick = function() {
                    window.contractFormHandler.viewChangeRequest(changeRequestId);
                };
            }

            // Update the global sowData object so it reflects the change
            var sowDataKey = 'sowData_' + sowData.id.replace(/[^a-zA-Z0-9]/g, '_');
            if (window[sowDataKey]) {
                window[sowDataKey].hasChangeRequest = true;
                window[sowDataKey].changeRequestId = changeRequestId;
                window[sowDataKey].changeRequestStatus = 'pending';
            }

            self.closeChangeRequestModal();
            alert('✓ Change request submitted successfully!\n\nThe developer will review your request and respond shortly.');
        })
        .catch(function(error) {
            console.error('Error submitting change request:', error);
            alert('Error submitting change request: ' + error.message);
        });
};

// Developer functions for handling change requests
ContractFormHandler.prototype.viewChangeRequest = function(changeRequestId) {
    var self = this;

    firebase.firestore().collection('change_requests')
        .doc(changeRequestId)
        .get()
        .then(function(doc) {
            if (!doc.exists) {
                alert('Change request not found');
                return;
            }

            var request = doc.data();
            request.id = doc.id;
            self.showChangeRequestDetailModal(request);
        })
        .catch(function(error) {
            console.error('Error loading change request:', error);
            alert('Error loading change request: ' + error.message);
        });
};

ContractFormHandler.prototype.showChangeRequestDetailModal = function(request) {
    var self = this;

    // Store request for message sending
    this.currentChangeRequest = request;

    var sectionLabels = {
        'package': '📦 Package Tier',
        'features': '✨ Features & Deliverables',
        'timeline': '⏱️ Timeline',
        'payment': '💰 Payment Structure',
        'maintenance': '🔧 Maintenance Plan',
        'other': '📝 Other'
    };

    var priorityStyles = {
        'normal': { bg: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', label: 'Normal' },
        'high': { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', label: 'High Priority' },
        'urgent': { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', label: 'Urgent' }
    };

    var statusStyles = {
        'pending': { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', label: '⏳ Pending Review' },
        'approved': { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', label: '✅ Approved' },
        'rejected': { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', label: '❌ Rejected' },
        'change_order': { bg: 'rgba(99, 102, 241, 0.2)', color: '#6366f1', label: '📋 Change Order Created' }
    };

    var sectionsHtml = request.sections.map(function(sectionId) {
        return '<span style="background: rgba(99, 102, 241, 0.15); color: #a5b4fc; padding: 4px 10px; border-radius: 4px; font-size: 0.85rem;">' +
            (sectionLabels[sectionId] || sectionId) + '</span>';
    }).join(' ');

    var priorityStyle = priorityStyles[request.priority] || priorityStyles.normal;
    var statusStyle = statusStyles[request.status] || statusStyles.pending;

    var createdDate = request.createdAt ? new Date(request.createdAt.toDate()).toLocaleString() : 'N/A';

    // Build conversation thread HTML
    var conversationHtml = self.renderConversationThread(request.messages || []);

    var actionsHtml = '';
if (self.isDeveloper && request.status === 'pending') {
    actionsHtml = '<div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: center;">' +
        '<div style="display: flex; gap: 0.75rem; width: 100%;">' +
            '<button class="btn btn-primary" style="flex: 1;" onclick="window.contractFormHandler.approveChangeRequest(\'' + request.id + '\')">✅ Approve</button>' +
            '<button class="btn" style="flex: 1; background: rgba(239, 68, 68, 0.2); color: #ef4444;" onclick="window.contractFormHandler.rejectChangeRequest(\'' + request.id + '\')">❌ Reject</button>' +
        '</div>' +
        '<button class="btn" style="width: 100%; background: rgba(99, 102, 241, 0.2); color: #6366f1;" onclick="window.contractFormHandler.createChangeOrderFromRequest(\'' + request.id + '\')">📋 Create Change Order</button>' +
    '</div>';
} else if (self.isDeveloper && (request.status === 'approved' || request.status === 'change_order')) {
    actionsHtml = '<div style="display: flex; gap: 0.75rem; justify-content: center;">' +
        '<button class="btn btn-primary" onclick="window.contractFormHandler.editSOWFromChangeRequest(\'' + request.sowId + '\')">✏️ Edit SOW</button>' +
    '</div>';
}

    var modalHtml = '<div id="changeRequestDetailModal" class="modal-overlay-fixed">' +
        '<div class="modal-content" style="max-width: 700px;">' +
        '<div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">' +
        '<h2 style="margin: 0; font-size: 1.25rem;">📝 Change Request Details</h2>' +
        '<button style="background: rgba(255,255,255,0.1); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.2)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.1)\'" onclick="window.contractFormHandler.closeChangeRequestDetailModal()">&times;</button>' +
        '</div>' +
        '<div class="modal-body" style="max-height: 70vh; overflow-y: auto; padding: .8rem;">' +

        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">' +
        '<div>' +
        '<h3 style="margin: 0;">' + request.clientName + '</h3>' +
        '<p style="margin: 0.25rem 0 0; opacity: 0.7; font-size: 0.9rem;">' + request.clientEmail + '</p>' +
        '</div>' +
        '<span style="background: ' + statusStyle.bg + '; color: ' + statusStyle.color + '; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 0.85rem;">' + statusStyle.label + '</span>' +
        '</div>' +

        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">' +
        '<div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">' +
        '<p style="margin: 0; font-size: 0.8rem; opacity: 0.7;">PACKAGE</p>' +
        '<p style="margin: 0.25rem 0 0; font-weight: 600;">' + (request.sowData.packageType || 'N/A') + '</p>' +
        '</div>' +
        '<div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">' +
        '<p style="margin: 0; font-size: 0.8rem; opacity: 0.7;">CURRENT TOTAL</p>' +
        '<p style="margin: 0.25rem 0 0; font-weight: 600;">$' + (request.sowData.payment ? request.sowData.payment.total.toFixed(2) : '0.00') + '</p>' +
        '</div>' +
        '</div>' +

        '<div style="margin-bottom: 1.5rem;">' +
        '<p style="margin: 0 0 0.5rem; font-weight: 600;">Sections to Modify:</p>' +
        '<div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">' + sectionsHtml + '</div>' +
        '</div>' +

        '<div style="margin-bottom: 1.5rem;">' +
        '<p style="margin: 0 0 0.5rem; font-weight: 600;">Description:</p>' +
        '<div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; white-space: pre-wrap;">' + request.description + '</div>' +
        '</div>' +

        '<div style="display: flex; gap: 2rem; margin-bottom: 1.5rem;">' +
        '<div>' +
        '<p style="margin: 0; font-size: 0.8rem; opacity: 0.7;">PRIORITY</p>' +
        '<span style="background: ' + priorityStyle.bg + '; color: ' + priorityStyle.color + '; padding: 4px 10px; border-radius: 4px; font-size: 0.85rem;">' + priorityStyle.label + '</span>' +
        '</div>' +
        '<div>' +
        '<p style="margin: 0; font-size: 0.8rem; opacity: 0.7;">SUBMITTED</p>' +
        '<p style="margin: 0.25rem 0 0;">' + createdDate + '</p>' +
        '</div>' +
        '</div>' +

        // Conversation Section
        '<div class="conversation-section">' +
        '<h4>💬 Conversation</h4>' +
        '<div id="conversationThread" class="conversation-thread">' +
        conversationHtml +
        '</div>' +
        '<div class="conversation-input-wrapper">' +
        '<textarea id="conversationInput" class="conversation-input" placeholder="Type your message..." rows="1"></textarea>' +
        '<button class="conversation-send-btn" onclick="window.contractFormHandler.sendChangeRequestMessage(\'' + request.id + '\')">Send</button>' +
        '</div>' +
        '</div>' +

        '</div>' +
        '<div class="modal-footer" style="padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1);">' +
        actionsHtml +
        '</div>' +
        '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Scroll conversation to bottom
    var thread = document.getElementById('conversationThread');
    if (thread) {
        thread.scrollTop = thread.scrollHeight;
    }

    // Auto-resize textarea as user types
    var conversationInput = document.getElementById('conversationInput');
    if (conversationInput) {
        conversationInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.overflowY = 'hidden';
            if (this.scrollHeight > 150) {
                this.style.height = '150px';
                this.style.overflowY = 'auto';
            } else {
                this.style.height = this.scrollHeight + 'px';
            }
        });
    }

    // Update last viewed timestamp for current user
    self.updateChangeRequestLastViewed(request.id);

    // Set up real-time listener for conversation updates
    self.conversationUnsubscribe = firebase.firestore().collection('change_requests')
        .doc(request.id)
        .onSnapshot(function(doc) {
            if (!doc.exists) return;

            var updatedRequest = doc.data();
            var messages = updatedRequest.messages || [];

            // Update the conversation thread
            var threadEl = document.getElementById('conversationThread');
            if (threadEl) {
                threadEl.innerHTML = self.renderConversationThread(messages);
                threadEl.scrollTop = threadEl.scrollHeight;
            }

            // Update stored request with latest messages
            self.currentChangeRequest.messages = messages;
        }, function(error) {
            console.error('Error listening to conversation:', error);
        });
};

// Close change request detail modal and clean up listener
ContractFormHandler.prototype.closeChangeRequestDetailModal = function() {
    // Unsubscribe from real-time listener
    if (this.conversationUnsubscribe) {
        this.conversationUnsubscribe();
        this.conversationUnsubscribe = null;
    }

    // Clear current request
    this.currentChangeRequest = null;

    // Remove modal
    var modal = document.getElementById('changeRequestDetailModal');
    if (modal) {
        modal.remove();
    }
};

// Render conversation thread HTML
ContractFormHandler.prototype.renderConversationThread = function(messages) {
    var self = this;

    if (!messages || messages.length === 0) {
        return '<div class="conversation-empty">No messages yet. Start the conversation!</div>';
    }

    return messages.map(function(msg) {
        // Handle both Firestore timestamps and ISO strings
        var timestamp = '';
        if (msg.timestamp) {
            if (msg.timestamp.toDate) {
                timestamp = new Date(msg.timestamp.toDate()).toLocaleString();
            } else {
                timestamp = new Date(msg.timestamp).toLocaleString();
            }
        }
        // Determine if this is the current user's message (show on right) or other party's (show on left)
        var isOwnMessage = (self.isDeveloper && msg.sender === 'developer') || (!self.isDeveloper && msg.sender === 'client');
        var senderClass = isOwnMessage ? 'self' : 'other';
        return '<div class="conversation-message ' + senderClass + '">' +
            '<div class="message-sender">' + (msg.senderName || msg.sender) + '</div>' +
            '<div class="message-text">' + msg.text + '</div>' +
            '<div class="message-time">' + timestamp + '</div>' +
            '</div>';
    }).join('');
};

// Send a message in the change request conversation
ContractFormHandler.prototype.sendChangeRequestMessage = function(changeRequestId) {
    var self = this;
    var input = document.getElementById('conversationInput');
    var text = input.value.trim();

    if (!text) return;

    var senderType = self.isDeveloper ? 'developer' : 'client';
    var senderName = self.isDeveloper ? 'Carlos (Developer)' : (self.currentChangeRequest.clientName || 'Client');

    // Use ISO string for timestamp (serverTimestamp not allowed in arrayUnion)
    var newMessage = {
        sender: senderType,
        senderName: senderName,
        text: text,
        timestamp: new Date().toISOString()
    };

    // Disable send button while sending
    var sendBtn = document.querySelector('.conversation-send-btn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';
    }

    firebase.firestore().collection('change_requests')
        .doc(changeRequestId)
        .update({
            messages: firebase.firestore.FieldValue.arrayUnion(newMessage),
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageBy: senderType
        })
        .then(function() {
            // Clear input
            input.value = '';

            // Add message to UI immediately (optimistic update)
            var thread = document.getElementById('conversationThread');
            if (thread) {
                // Remove empty state if present
                var emptyState = thread.querySelector('.conversation-empty');
                if (emptyState) {
                    emptyState.remove();
                }

                var msgHtml = '<div class="conversation-message self">' +
                    '<div class="message-sender">' + senderName + '</div>' +
                    '<div class="message-text">' + text + '</div>' +
                    '<div class="message-time">Just now</div>' +
                    '</div>';
                thread.insertAdjacentHTML('beforeend', msgHtml);
                thread.scrollTop = thread.scrollHeight;
            }

            // Re-enable send button
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send';
            }
        })
        .catch(function(error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send';
            }
        });
};

// Update last viewed timestamp for tracking unread messages
ContractFormHandler.prototype.updateChangeRequestLastViewed = function(changeRequestId) {
    var self = this;
    var field = self.isDeveloper ? 'developerLastViewed' : 'clientLastViewed';

    firebase.firestore().collection('change_requests')
        .doc(changeRequestId)
        .update({
            [field]: firebase.firestore.FieldValue.serverTimestamp()
        })
        .catch(function(error) {
            console.error('Error updating last viewed:', error);
        });
};

ContractFormHandler.prototype.approveChangeRequest = function(changeRequestId) {
    var self = this;

    if (!confirm('Are you sure you want to approve this change request?')) {
        return;
    }

    // Add a system message to the conversation (use ISO string for arrayUnion)
    var approvalMessage = {
        sender: 'developer',
        senderName: 'Carlos (Developer)',
        text: '✅ Change request has been APPROVED. I will now proceed with the requested changes.',
        timestamp: new Date().toISOString()
    };

    firebase.firestore().collection('change_requests')
        .doc(changeRequestId)
        .update({
            status: 'approved',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            messages: firebase.firestore.FieldValue.arrayUnion(approvalMessage),
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageBy: 'developer'
        })
        .then(function() {
            // Get the change request to update the SOW
            return firebase.firestore().collection('change_requests').doc(changeRequestId).get();
        })
        .then(function(doc) {
            var request = doc.data();
            // Update SOW status
            return firebase.firestore().collection('sow_documents')
                .doc(request.sowId)
                .update({
                    changeRequestStatus: 'approved'
                });
        })
        .then(function() {
            self.closeChangeRequestDetailModal();
            alert('Change request approved! You can now edit the SOW with the requested changes.');
            self.loadSOWDocuments();
        })
        .catch(function(error) {
            console.error('Error approving change request:', error);
            alert('Error: ' + error.message);
        });
};

ContractFormHandler.prototype.rejectChangeRequest = function(changeRequestId) {
    var self = this;

    if (!confirm('Are you sure you want to reject this change request? Consider sending a message to explain why before rejecting.')) {
        return;
    }

    // Add a system message to the conversation (use ISO string for arrayUnion)
    var rejectionMessage = {
        sender: 'developer',
        senderName: 'Carlos (Developer)',
        text: '❌ Change request has been REJECTED. Please see my previous messages for details.',
        timestamp: new Date().toISOString()
    };

    firebase.firestore().collection('change_requests')
        .doc(changeRequestId)
        .update({
            status: 'rejected',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            messages: firebase.firestore.FieldValue.arrayUnion(rejectionMessage),
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageBy: 'developer'
        })
        .then(function() {
            return firebase.firestore().collection('change_requests').doc(changeRequestId).get();
        })
        .then(function(doc) {
            var request = doc.data();
            return firebase.firestore().collection('sow_documents')
                .doc(request.sowId)
                .update({
                    changeRequestStatus: 'rejected',
                    hasChangeRequest: false
                });
        })
        .then(function() {
            self.closeChangeRequestDetailModal();
            alert('Change request rejected. The client has been notified.');
            self.loadSOWDocuments();
        })
        .catch(function(error) {
            console.error('Error rejecting change request:', error);
            alert('Error: ' + error.message);
        });
};

ContractFormHandler.prototype.createChangeOrderFromRequest = function(changeRequestId) {
    var self = this;

    firebase.firestore().collection('change_requests')
        .doc(changeRequestId)
        .get()
        .then(function(doc) {
            if (!doc.exists) {
                alert('Change request not found');
                return;
            }

            var request = doc.data();
            request.id = doc.id;

            // Close the detail modal
            var detailModal = document.getElementById('changeRequestDetailModal');
            if (detailModal) detailModal.remove();

            // Show Change Order creation modal
            self.showChangeOrderModal(request);
        })
        .catch(function(error) {
            console.error('Error loading change request:', error);
            alert('Error: ' + error.message);
        });
};

ContractFormHandler.prototype.showChangeOrderModal = function(changeRequest) {
    var self = this;

    var sectionLabels = {
        'package': 'Package Tier',
        'features': 'Features & Deliverables',
        'timeline': 'Timeline',
        'payment': 'Payment Structure',
        'maintenance': 'Maintenance Plan',
        'other': 'Other'
    };

    var sectionsText = changeRequest.sections.map(function(s) { return sectionLabels[s] || s; }).join(', ');

    var modalHtml = '<div id="changeOrderModal" class="modal-overlay-fixed">' +
        '<div class="modal-content" style="max-width: 600px;">' +
        '<div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">' +
        '<h2 style="margin: 0; font-size: 1.25rem;">📋 Create Change Order</h2>' +
        '<button style="background: rgba(255,255,255,0.1); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.2)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.1)\'" onclick="document.getElementById(\'changeOrderModal\').remove()">&times;</button>' +
        '</div>' +
        '<div class="modal-body" style="padding: 1.5rem;">' +

        '<div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">' +
        '<p style="margin: 0; font-size: 0.9rem;"><strong>Client:</strong> ' + changeRequest.clientName + '</p>' +
        '<p style="margin: 0.5rem 0 0; font-size: 0.9rem;"><strong>Sections:</strong> ' + sectionsText + '</p>' +
        '<p style="margin: 0.5rem 0 0; font-size: 0.9rem;"><strong>Request:</strong> ' + changeRequest.description.substring(0, 100) + (changeRequest.description.length > 100 ? '...' : '') + '</p>' +
        '</div>' +

        '<div class="form-group">' +
        '<label class="form-label">Change Order Description:</label>' +
        '<textarea id="changeOrderDescription" class="form-input" rows="4" placeholder="Describe the approved changes in detail..." style="width: 100%; resize: vertical;">' + changeRequest.description + '</textarea>' +
        '</div>' +

        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">' +
        '<div class="form-group">' +
        '<label class="form-label">Price Adjustment ($):</label>' +
        '<input type="number" id="changeOrderPrice" class="form-input" value="0" step="50" style="width: 100%;" />' +
        '<p style="font-size: 0.8rem; opacity: 0.7; margin-top: 0.25rem;">Use negative for discounts</p>' +
        '</div>' +
        '<div class="form-group">' +
        '<label class="form-label">Timeline Adjustment (weeks):</label>' +
        '<input type="number" id="changeOrderTimeline" class="form-input" value="0" step="1" style="width: 100%;" />' +
        '<p style="font-size: 0.8rem; opacity: 0.7; margin-top: 0.25rem;">Use negative to reduce</p>' +
        '</div>' +
        '</div>' +

        '<div class="form-group" style="margin-top: 1rem;">' +
        '<label class="form-label">Notes for Client:</label>' +
        '<textarea id="changeOrderNotes" class="form-input" rows="2" placeholder="Any additional notes..." style="width: 100%; resize: vertical;"></textarea>' +
        '</div>' +

        '</div>' +
        '<div class="modal-footer" style="display: flex; gap: 1rem; justify-content: flex-end; padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1);">' +
        '<button class="btn btn-secondary" onclick="document.getElementById(\'changeOrderModal\').remove()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="window.contractFormHandler.saveChangeOrder(\'' + changeRequest.id + '\', \'' + changeRequest.sowId + '\')">Create Change Order</button>' +
        '</div>' +
        '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

ContractFormHandler.prototype.saveChangeOrder = function(changeRequestId, sowId) {
    var self = this;

    var description = document.getElementById('changeOrderDescription').value.trim();
    var priceAdjustment = parseFloat(document.getElementById('changeOrderPrice').value) || 0;
    var timelineAdjustment = parseInt(document.getElementById('changeOrderTimeline').value) || 0;
    var notes = document.getElementById('changeOrderNotes').value.trim();

    if (!description) {
        alert('Please provide a description for the change order');
        return;
    }

    // Get the current SOW data
    firebase.firestore().collection('sow_documents')
        .doc(sowId)
        .get()
        .then(function(doc) {
            if (!doc.exists) {
                throw new Error('SOW not found');
            }

            var sowData = doc.data();
            var currentTotal = sowData.payment ? sowData.payment.total : 0;
            var currentTimeline = sowData.estimatedWeeks || 0;

            // Create change order document
            var changeOrder = {
                sowId: sowId,
                changeRequestId: changeRequestId,
                clientName: sowData.clientName,
                clientEmail: sowData.clientEmail,
                description: description,
                priceAdjustment: priceAdjustment,
                timelineAdjustment: timelineAdjustment,
                notes: notes,
                previousTotal: currentTotal,
                newTotal: currentTotal + priceAdjustment,
                previousTimeline: currentTimeline,
                newTimeline: currentTimeline + timelineAdjustment,
                status: 'pending_approval',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: firebase.auth().currentUser.email
            };

            return firebase.firestore().collection('change_orders').add(changeOrder);
        })
        .then(function(docRef) {
            // Update change request status
            return firebase.firestore().collection('change_requests')
                .doc(changeRequestId)
                .update({
                    status: 'change_order',
                    changeOrderId: docRef.id,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
        })
        .then(function() {
            // Update SOW with change order reference
            return firebase.firestore().collection('sow_documents')
                .doc(sowId)
                .update({
                    changeRequestStatus: 'change_order',
                    hasChangeOrder: true
                });
        })
        .then(function() {
            document.getElementById('changeOrderModal').remove();
            alert('✓ Change Order created successfully!\n\nThe client will be notified to review and approve the changes.');
            self.loadSOWDocuments();
        })
        .catch(function(error) {
            console.error('Error creating change order:', error);
            alert('Error: ' + error.message);
        });
};

ContractFormHandler.prototype.editSOWFromChangeRequest = function(sowId) {
    var self = this;

    // Close the modal first
    var modal = document.getElementById('changeRequestDetailModal');
    if (modal) modal.remove();

    // Load the SOW and open editor
    firebase.firestore().collection('sow_documents')
        .doc(sowId)
        .get()
        .then(function(doc) {
            if (doc.exists) {
                var sowData = doc.data();
                sowData.id = doc.id;
                self.editSOW(sowData);
            }
        })
        .catch(function(error) {
            console.error('Error loading SOW:', error);
            alert('Error loading SOW: ' + error.message);
        });
};

    // ============= SOW CREATOR FUNCTIONS =============

ContractFormHandler.prototype.showSOWCreator = function() {
    var container = $('#sowCreatorContainer');
    if (!container) return;
    
    var html = '<div class="sow-creator-form">' +
        '<div class="sow-form-header">' +
        '<h4>📋 Create Statement of Work</h4>' +
        '<button class="btn-close-sow">×</button>' +
        '</div>' +
        
        // Client Information
        '<div class="sow-form-section client-info-section">' +
        '<h5><span class="section-icon">👤</span> Client Information</h5>' +
        '<div class="client-id-toggle">' +
        '<span class="toggle-label" id="emailToggleLabel">Email</span>' +
        '<label class="toggle-switch">' +
        '<input type="checkbox" id="clientIdTypeToggle" />' +
        '<span class="toggle-slider"></span>' +
        '</label>' +
        '<span class="toggle-label" id="phoneToggleLabel">Phone</span>' +
        '</div>' +
        '<div class="sow-input-group client-inputs-row">' +
        '<input type="text" id="sowClientName" placeholder="Client Name *" class="sow-input" required />' +
        '<input type="email" id="sowClientEmail" placeholder="Client Email *" class="sow-input" />' +
        '<input type="tel" id="sowClientPhone" placeholder="Client Phone (e.g., +15551234567) *" class="sow-input" style="display: none;" />' +
        '</div>' +
        '</div>' +
        
        // Package Selection
        '<div class="sow-form-section">' +
        '<h5><span class="section-icon">📦</span> Package Tier</h5>' +
        '<select id="sowPackage" class="sow-select">' +
        '<option value="">Select a package tier...</option>' +
        '<option value="basic">Basic — Landing Page ($400 - $1,000)</option>' +
        '<option value="starter">Tier 1 — Starter ($2,500 - $3,500)</option>' +
        '<option value="professional">Tier 2 — Professional ($5,000 - $8,000)</option>' +
        '<option value="premium">Tier 3 — Premium ($8,000 - $12,000)</option>' +
        '<option value="elite">Tier 4 — Elite Web Application ($10,000 - $20,000+)</option>' +
        '<option value="custom">Custom Quote (Manual Entry)</option>' +
        '</select>' +
        
        // Custom pricing (only shown if custom selected)
        '<div id="customPricingSection" style="display: none; margin-top: 15px;">' +
        '<input type="number" id="sowCustomPrice" placeholder="Enter custom total price" class="sow-input" step="0.01" min="0" />' +
        '</div>' +
        '</div>' +
        
        // Project Timeline
        '<div class="sow-form-section">' +
        '<h5><span class="section-icon">⏱️</span> Project Timeline</h5>' +
        '<div class="sow-input-group">' +
        '<input type="number" id="sowWeeks" placeholder="Estimated Weeks *" class="sow-input" min="1" max="52" required />' +
        '<input type="date" id="sowStartDate" class="sow-input" title="Target completion date" />' +
        '</div>' +
        '</div>' +
        
        // Features & Deliverables
        '<div class="sow-form-section">' +
        '<h5><span class="section-icon">✨</span> Features & Deliverables</h5>' +
        '<div class="sow-checkboxes">' +
        
        // Core Features
        '<div class="feature-group">' +
        '<p class="feature-group-title">Core Features</p>' +
        '<label class="sow-checkbox"><input type="checkbox" value="responsive_design" /> Responsive Design (Mobile + Desktop)</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="custom_ui" /> Custom UI/UX Design</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="animations" /> Smooth Animations & Transitions</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="seo_optimization" /> SEO Optimization</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="analytics" /> Analytics Integration</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="performance" /> Performance Optimization</label>' +
        '</div>' +
        
        // Backend & Auth
        '<div class="feature-group">' +
        '<p class="feature-group-title">Backend & Authentication</p>' +
        '<label class="sow-checkbox"><input type="checkbox" value="firebase_auth" /> Firebase Authentication <span class="third-party-note">+ Firebase costs</span></label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="firebase_db" /> Firebase Database (Firestore) <span class="third-party-note">+ Firebase costs</span></label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="user_profiles" /> User Profiles & Dashboards</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="user_roles" /> User Roles & Permissions</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="file_storage" /> Firebase Storage (File Uploads) <span class="third-party-note">+ Firebase costs</span></label>' +
        '</div>' +
        
        // Advanced Features
        '<div class="feature-group">' +
        '<p class="feature-group-title">Advanced Features</p>' +
        '<div class="ecommerce-radio-group">' +
        '<p class="radio-group-label">E-Commerce Functionality:</p>' +
        '<label class="sow-radio"><input type="radio" name="ecommerce_option" value="none" checked /> None</label>' +
        '<label class="sow-radio"><input type="radio" name="ecommerce_option" value="basic_cart" /> Basic Shopping Cart (+$2,500) <span class="third-party-note">+ Stripe fees</span></label>' +
        '<label class="sow-radio"><input type="radio" name="ecommerce_option" value="full_store" /> Full E-Commerce Store (+$5,000) <span class="third-party-note">+ Stripe fees</span></label>' +
        '</div>' +
        '<label class="sow-checkbox"><input type="checkbox" value="booking_system" /> Custom Booking System</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="api_integration" /> API Integrations (CRM, Mailing, etc.)</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="cms_integration" /> CMS Integration</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="blog" /> Blog/News Section</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="gallery" /> Image/Video Gallery</label>' +
        '</div>' +
        
        // Forms & Communication
        '<div class="feature-group">' +
        '<p class="feature-group-title">Forms & Communication</p>' +
        '<label class="sow-checkbox"><input type="checkbox" value="contact_forms" /> Custom Contact Forms</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="email_integration" /> Email Integration (SendGrid, etc.) <span class="third-party-note">+ SendGrid costs</span></label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="notifications" /> Push Notifications</label>' +
        '</div>' +
        
        // Deployment & Security
        '<div class="feature-group">' +
        '<p class="feature-group-title">Deployment & Security</p>' +
        '<label class="sow-checkbox"><input type="checkbox" value="hosting" /> Hosting Setup & Deployment <span class="third-party-note">+ Monthly hosting costs</span></label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="ssl" /> SSL Certificate & Security</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="domain" /> Custom Domain Configuration <span class="third-party-note">+ Annual domain costs</span></label>' +
        '</div>' +
        
        '</div>' +
        '</div>' +
        
        // Additional Requirements
        '<div class="sow-form-section">' +
        '<h5><span class="section-icon">📝</span> Additional Requirements</h5>' +
        '<textarea id="sowNotes" placeholder="Any special requirements, integrations, or custom features..." class="sow-textarea" rows="4"></textarea>' +
        '</div>' +
        
        // Ongoing Maintenance
        '<div class="sow-form-section">' +
        '<h5><span class="section-icon">🔧</span> Ongoing Maintenance Plan</h5>' +
        '<select id="sowMaintenance" class="sow-select" required>' +
        '<option value="">Select a maintenance plan...</option>' +
        '<option value="basic" selected>Basic — $100-$150/month (Minor updates/tweaks)</option>' +
        '<option value="professional">Professional — $200-$350/month (Semi-continuous code edits)</option>' +
        '<option value="premium">Premium — $500-$800/month (Priority support, monthly components, SEO)</option>' +
        '</select>' +
        '</div>' +
        
        // Pricing Summary
        '<div class="sow-form-section pricing-summary">' +
        '<h5><span class="section-icon">💰</span> Pricing Summary</h5>' +

        // Itemized breakdown
        '<div class="pricing-itemized-container">' +
        '<div id="pricingItemizedList" class="pricing-itemized-list">' +
        '</div>' +
        '</div>' +

        '<div class="pricing-breakdown">' +
        '<div class="pricing-divider"></div>' +
        '<div class="pricing-row total-row">' +
        '<span><strong>Project Total:</strong></span>' +
        '<span id="sowTotalPrice" class="price-value total-value">$0.00</span>' +
        '</div>' +
        '<div class="pricing-row deposit-row">' +
        '<span>Deposit (50%):</span>' +
        '<span id="sowDepositCalc" class="price-value">$0.00</span>' +
        '</div>' +
        '<div class="pricing-row">' +
        '<span>Milestone Payment (25%):</span>' +
        '<span id="sowMilestone1Calc" class="price-value">$0.00</span>' +
        '</div>' +
        '<div class="pricing-row">' +
        '<span>Final Payment (25%):</span>' +
        '<span id="sowFinalCalc" class="price-value">$0.00</span>' +
        '</div>' +
        '<div class="pricing-divider"></div>' +
        '<div class="pricing-row maintenance-row" id="maintenanceRow">' +
        '<span>Monthly Maintenance:</span>' +
        '<span id="sowMaintenanceCalc" class="price-value">$100-$150/month</span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        
        // Action Buttons
        '<div class="sow-form-actions">' +
        '<button class="btn-cancel-sow btn-secondary">Cancel</button>' +
        '<button class="btn-save-sow btn-primary"><span class="btn-icon">💾</span> Save SOW</button>' +
        '<button class="btn-generate-sow-pdf btn-primary"><span class="btn-icon">📄</span> Generate PDF</button>' +
        '</div>' +
        
        '</div>';
    
    container.innerHTML = html;
    container.style.display = 'block';
    
    var self = this;
    
    // Package pricing map (updated to match 2025 pricing guide)
    var packagePricing = {
        'basic': { min: 400, max: 1000, default: 700 },
        'starter': { min: 2500, max: 3500, default: 3000 },
        'professional': { min: 5000, max: 8000, default: 6500 },
        'premium': { min: 8000, max: 12000, default: 10000 },
        'elite': { min: 10000, max: 20000, default: 15000 }
    };
    
    var maintenancePricing = {
        'none': 0,
        'basic': 125,
        'professional': 275,
        'premium': 650
    };

    // Feature pricing based on complexity
    var featurePricing = {
        // Core Features
        'responsive_design': { default: 250, thirdParty: false },
        'custom_ui': { default: 500, thirdParty: false },
        'animations': { default: 325, thirdParty: false },
        'seo_optimization': { default: 250, thirdParty: false },
        'analytics': { default: 200, thirdParty: false },
        'performance': { default: 275, thirdParty: false },
        // Backend & Auth
        'firebase_auth': { default: 425, thirdParty: true, note: 'Firebase costs' },
        'firebase_db': { default: 500, thirdParty: true, note: 'Firebase costs' },
        'user_profiles': { default: 650, thirdParty: false },
        'user_roles': { default: 500, thirdParty: false },
        'file_storage': { default: 375, thirdParty: true, note: 'Firebase Storage costs' },
        // Advanced
        'booking_system': { default: 1150, thirdParty: false },
        'api_integration': { default: 550, thirdParty: false },
        'cms_integration': { default: 650, thirdParty: false },
        'blog': { default: 500, thirdParty: false },
        'gallery': { default: 400, thirdParty: false },
        // Forms & Communication
        'contact_forms': { default: 275, thirdParty: false },
        'email_integration': { default: 400, thirdParty: true, note: 'SendGrid costs' },
        'notifications': { default: 425, thirdParty: false },
        // Deployment
        'hosting': { default: 275, thirdParty: true, note: 'Monthly hosting costs' },
        'ssl': { default: 200, thirdParty: false },
        'domain': { default: 150, thirdParty: true, note: 'Annual domain costs' }
    };

    // E-Commerce radio options (updated to match 2025 pricing guide)
    var ecommercePricing = {
        'none': { price: 0, label: 'No E-Commerce' },
        'basic_cart': { price: 2500, label: 'Basic Shopping Cart', thirdParty: true, note: 'Stripe fees' },
        'full_store': { price: 5000, label: 'Full E-Commerce Store', thirdParty: true, note: 'Stripe fees' }
    };

    // Package-feature mapping (what's included in each package)
    var packageIncludedFeatures = {
        'basic': ['responsive_design'],
        'starter': ['responsive_design', 'custom_ui', 'animations', 'seo_optimization', 'analytics', 'contact_forms', 'ssl'],
        'professional': ['responsive_design', 'custom_ui', 'animations', 'seo_optimization', 'analytics', 'performance', 'firebase_auth', 'contact_forms', 'ssl', 'hosting'],
        'premium': ['responsive_design', 'custom_ui', 'animations', 'seo_optimization', 'analytics', 'performance', 'firebase_auth', 'firebase_db', 'user_profiles', 'file_storage', 'booking_system', 'api_integration', 'contact_forms', 'email_integration', 'hosting', 'ssl', 'domain'],
        'elite': ['responsive_design', 'custom_ui', 'animations', 'seo_optimization', 'analytics', 'performance', 'firebase_auth', 'firebase_db', 'user_profiles', 'user_roles', 'file_storage', 'booking_system', 'api_integration', 'cms_integration', 'blog', 'gallery', 'contact_forms', 'email_integration', 'notifications', 'hosting', 'ssl', 'domain'],
        'custom': []
    };

    // Helper to update pricing with all required data
    var updatePricing = function() {
        self.updateSOWPricing(packagePricing, maintenancePricing, featurePricing, ecommercePricing, packageIncludedFeatures);
    };

    // Update pricing when package changes
    var packageSelect = $('#sowPackage');
    var customPricingSection = $('#customPricingSection');
    var customPriceInput = $('#sowCustomPrice');

    if (packageSelect) {
        packageSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customPricingSection.style.display = 'block';
                // Clear all feature checkboxes for custom
                self.autoCheckPackageFeatures('custom', packageIncludedFeatures);
            } else {
                customPricingSection.style.display = 'none';
                // Auto-check features included in selected package
                self.autoCheckPackageFeatures(this.value, packageIncludedFeatures);
            }
            updatePricing();
        });
    }

    // Update pricing when custom price changes
    if (customPriceInput) {
        customPriceInput.addEventListener('input', function() {
            updatePricing();
        });
    }

    // Update maintenance pricing
    var maintenanceSelect = $('#sowMaintenance');
    if (maintenanceSelect) {
        maintenanceSelect.addEventListener('change', function() {
            updatePricing();
        });
    }

    // Update pricing when feature checkboxes change
    var featureCheckboxes = document.querySelectorAll('.sow-checkboxes input[type="checkbox"]');
    featureCheckboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
            updatePricing();
        });
    });

    // Update pricing when e-commerce radio changes
    var ecommerceRadios = document.querySelectorAll('input[name="ecommerce_option"]');
    ecommerceRadios.forEach(function(radio) {
        radio.addEventListener('change', function() {
            updatePricing();
        });
    });

    // Auto-sync weeks and date fields
    var weeksInput = $('#sowWeeks');
    var dateInput = $('#sowStartDate');

    // When weeks changes, update the date (today + weeks)
    if (weeksInput) {
        weeksInput.addEventListener('input', function() {
            var weeks = parseInt(this.value);
            if (weeks && weeks > 0 && dateInput) {
                var endDate = new Date();
                endDate.setDate(endDate.getDate() + (weeks * 7));
                dateInput.value = endDate.toISOString().split('T')[0];
            }
        });
    }

    // When date changes, update the weeks (date - today)
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            var selectedDate = new Date(this.value);
            var today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate && selectedDate > today && weeksInput) {
                var diffTime = selectedDate - today;
                var diffDays = diffTime / (1000 * 60 * 60 * 24);
                var weeks = Math.round(diffDays / 7);
                weeksInput.value = Math.max(1, Math.min(52, weeks));
            }
        });
    }

    // Close button
    var closeBtn = $('.btn-close-sow');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            container.style.display = 'none';
        });
    }
    
    // Cancel button
    var cancelBtn = $('.btn-cancel-sow');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            container.style.display = 'none';
        });
    }

    // Client ID type toggle (Email/Phone)
    var clientIdToggle = $('#clientIdTypeToggle');
    var emailInput = $('#sowClientEmail');
    var phoneInput = $('#sowClientPhone');
    var emailLabel = $('#emailToggleLabel');
    var phoneLabel = $('#phoneToggleLabel');

    if (clientIdToggle) {
        clientIdToggle.addEventListener('change', function() {
            if (this.checked) {
                // Phone mode
                emailInput.style.display = 'none';
                emailInput.value = '';
                phoneInput.style.display = 'block';
                emailLabel.classList.remove('active');
                phoneLabel.classList.add('active');
            } else {
                // Email mode
                phoneInput.style.display = 'none';
                phoneInput.value = '';
                emailInput.style.display = 'block';
                phoneLabel.classList.remove('active');
                emailLabel.classList.add('active');
            }
        });
        // Set initial state
        emailLabel.classList.add('active');
    }

    // Save button
    var saveBtn = $('.btn-save-sow');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            self.saveSOW();
        });
    }
    
    // Generate PDF button
    var pdfBtn = $('.btn-generate-sow-pdf');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', function() {
            self.generateSOWPDF();
        });
    }
};

// Feature-based pricing calculation
ContractFormHandler.prototype.calculateFeatureBasedPricing = function(packagePricing, featurePricing, ecommercePricing, packageIncludedFeatures) {
    var packageSelect = $('#sowPackage');
    var customPriceInput = $('#sowCustomPrice');
    var packageType = packageSelect ? packageSelect.value : '';

    var result = {
        basePrice: 0,
        packageType: packageType,
        addOns: [],
        discounts: [],
        ecommerceOption: 'none',
        ecommercePrice: 0,
        total: 0
    };

    if (!packageType) return result;

    // Get base package price
    if (packageType === 'custom') {
        result.basePrice = parseFloat(customPriceInput.value) || 0;
    } else if (packagePricing[packageType]) {
        result.basePrice = packagePricing[packageType].default;
    }

    var includedFeatures = packageIncludedFeatures[packageType] || [];

    // Check each feature checkbox
    var checkboxes = document.querySelectorAll('.sow-checkboxes input[type="checkbox"]');
    checkboxes.forEach(function(checkbox) {
        var featureKey = checkbox.value;
        var isChecked = checkbox.checked;
        var isIncluded = includedFeatures.indexOf(featureKey) !== -1;
        var pricing = featurePricing[featureKey];

        if (!pricing) return;

        // Get feature label text
        var labelText = checkbox.parentElement.textContent.trim();
        // Remove third-party note from label
        var thirdPartyNote = checkbox.parentElement.querySelector('.third-party-note');
        if (thirdPartyNote) {
            labelText = labelText.replace(thirdPartyNote.textContent, '').trim();
        }

        if (isChecked && !isIncluded) {
            // Add-on: checked but not included in package
            result.addOns.push({
                key: featureKey,
                label: labelText,
                price: pricing.default,
                thirdParty: pricing.thirdParty,
                note: pricing.note || ''
            });
        } else if (!isChecked && isIncluded && packageType !== 'custom') {
            // Discount: unchecked but included in package (50% refund)
            result.discounts.push({
                key: featureKey,
                label: labelText,
                price: Math.round(pricing.default * 0.5)
            });
        }
    });

    // E-Commerce radio selection
    var ecommerceRadio = document.querySelector('input[name="ecommerce_option"]:checked');
    if (ecommerceRadio) {
        result.ecommerceOption = ecommerceRadio.value;
        if (ecommercePricing[result.ecommerceOption]) {
            result.ecommercePrice = ecommercePricing[result.ecommerceOption].price;
            if (result.ecommercePrice > 0) {
                result.addOns.push({
                    key: 'ecommerce_' + result.ecommerceOption,
                    label: ecommercePricing[result.ecommerceOption].label,
                    price: result.ecommercePrice,
                    thirdParty: ecommercePricing[result.ecommerceOption].thirdParty,
                    note: ecommercePricing[result.ecommerceOption].note || ''
                });
            }
        }
    }

    // Calculate total
    var addOnTotal = result.addOns.reduce(function(sum, item) { return sum + item.price; }, 0);
    var discountTotal = result.discounts.reduce(function(sum, item) { return sum + item.price; }, 0);

    result.total = Math.max(0, result.basePrice + addOnTotal - discountTotal);

    return result;
};

// Render itemized pricing breakdown
ContractFormHandler.prototype.renderItemizedPricing = function(pricingData, packagePricing) {
    var container = document.getElementById('pricingItemizedList');
    if (!container) {
        console.warn('pricingItemizedList container not found');
        return;
    }

    console.log('Rendering pricing breakdown:', pricingData);

    var html = '';
    var packageType = pricingData.packageType;

    // Base package line
    if (packageType) {
        var packageLabel = packageType.charAt(0).toUpperCase() + packageType.slice(1);
        if (packageType === 'custom') {
            packageLabel = 'Custom Quote';
        } else {
            packageLabel += ' Package';
        }
        html += '<div class="pricing-line-item base-package">' +
            '<span class="item-label">' + packageLabel + '</span>' +
            '<span class="item-price">$' + pricingData.basePrice.toFixed(2) + '</span>' +
            '</div>';
    }

    // Add-ons (excluding e-commerce, show it separately)
    var nonEcommerceAddOns = pricingData.addOns.filter(function(item) {
        return item.key.indexOf('ecommerce_') !== 0;
    });
    var ecommerceAddOn = pricingData.addOns.find(function(item) {
        return item.key.indexOf('ecommerce_') === 0;
    });

    if (nonEcommerceAddOns.length > 0) {
        html += '<div class="pricing-section-header">Add-Ons</div>';
        nonEcommerceAddOns.forEach(function(item) {
            html += '<div class="pricing-line-item add-on">' +
                '<span class="item-label">' + item.label +
                (item.thirdParty ? ' <span class="third-party-note">+ ' + item.note + '</span>' : '') +
                '</span>' +
                '<span class="item-price">+$' + item.price.toFixed(2) + '</span>' +
                '</div>';
        });
    }

    // E-commerce (if selected)
    if (ecommerceAddOn) {
        html += '<div class="pricing-line-item add-on ecommerce-item">' +
            '<span class="item-label">' + ecommerceAddOn.label +
            (ecommerceAddOn.thirdParty ? ' <span class="third-party-note">+ ' + ecommerceAddOn.note + '</span>' : '') +
            '</span>' +
            '<span class="item-price">+$' + ecommerceAddOn.price.toFixed(2) + '</span>' +
            '</div>';
    }

    // Discounts
    if (pricingData.discounts.length > 0) {
        html += '<div class="pricing-section-header">Removed Features (50% Credit)</div>';
        pricingData.discounts.forEach(function(item) {
            html += '<div class="pricing-line-item discount">' +
                '<span class="item-label">' + item.label + '</span>' +
                '<span class="item-price discount-value">-$' + item.price.toFixed(2) + '</span>' +
                '</div>';
        });
    }

    // Show placeholder if no package selected
    if (!html) {
        html = '<div class="pricing-empty-state">Select a package to see pricing breakdown</div>';
    }

    container.innerHTML = html;
};

// Auto-check features when package is selected
ContractFormHandler.prototype.autoCheckPackageFeatures = function(packageType, packageIncludedFeatures) {
    var includedFeatures = packageIncludedFeatures[packageType] || [];

    var checkboxes = document.querySelectorAll('.sow-checkboxes input[type="checkbox"]');
    checkboxes.forEach(function(checkbox) {
        var featureKey = checkbox.value;
        var isIncluded = includedFeatures.indexOf(featureKey) !== -1;

        checkbox.checked = isIncluded;

        // Mark as "included" visually
        var label = checkbox.parentElement;
        if (isIncluded) {
            label.classList.add('feature-included');
        } else {
            label.classList.remove('feature-included');
        }
    });

    // Reset e-commerce to none
    var ecommerceNone = document.querySelector('input[name="ecommerce_option"][value="none"]');
    if (ecommerceNone) ecommerceNone.checked = true;
};

// New function to update pricing calculations
ContractFormHandler.prototype.updateSOWPricing = function(packagePricing, maintenancePricing, featurePricing, ecommercePricing, packageIncludedFeatures) {
    var maintenanceSelect = $('#sowMaintenance');

    // Calculate feature-based pricing
    var pricingData = this.calculateFeatureBasedPricing(packagePricing, featurePricing, ecommercePricing, packageIncludedFeatures);

    // Render itemized breakdown
    this.renderItemizedPricing(pricingData, packagePricing);

    var totalPrice = pricingData.total;
    var deposit = totalPrice * 0.50;
    var milestone1 = totalPrice * 0.25;
    var finalPayment = totalPrice * 0.25;

    var maintenanceCost = maintenancePricing[maintenanceSelect.value] || 0;

    // Update DOM
    var totalPriceEl = $('#sowTotalPrice');
    var depositEl = $('#sowDepositCalc');
    var milestone1El = $('#sowMilestone1Calc');
    var finalEl = $('#sowFinalCalc');
    var maintenanceEl = $('#sowMaintenanceCalc');
    var maintenanceRow = $('#maintenanceRow');

    if (totalPriceEl) totalPriceEl.textContent = '$' + totalPrice.toFixed(2);
    if (depositEl) depositEl.textContent = '$' + deposit.toFixed(2);
    if (milestone1El) milestone1El.textContent = '$' + milestone1.toFixed(2);
    if (finalEl) finalEl.textContent = '$' + finalPayment.toFixed(2);

    // Always show maintenance row (maintenance is required)
    if (maintenanceRow) maintenanceRow.style.display = 'flex';
    if (maintenanceSelect.value && maintenanceSelect.value !== '') {
        if (maintenanceEl) maintenanceEl.textContent = '$' + maintenanceCost + '/month';
    } else {
        if (maintenanceEl) maintenanceEl.textContent = 'Select plan';
    }

    // Store pricing data for save
    this.currentPricingData = pricingData;
};

ContractFormHandler.prototype.saveSOW = function() {
    var clientName = $('#sowClientName').value.trim();
    var clientEmail = $('#sowClientEmail').value.trim();
    var clientPhoneRaw = $('#sowClientPhone').value.trim();
    var packageType = $('#sowPackage').value;
    var weeks = $('#sowWeeks').value;
    var startDate = $('#sowStartDate').value;
    var notes = $('#sowNotes').value.trim();
    var maintenancePlan = $('#sowMaintenance').value;

    // Normalize phone to E.164 format (+1XXXXXXXXXX) for Firebase Auth matching
    var clientPhone = '';
    if (clientPhoneRaw) {
        var digits = clientPhoneRaw.replace(/\D/g, '');
        if (digits.length === 10) {
            clientPhone = '+1' + digits;
        } else if (digits.length === 11 && digits.startsWith('1')) {
            clientPhone = '+' + digits;
        } else {
            clientPhone = clientPhoneRaw; // Keep as-is if unusual format
        }
    }

    // Validate required fields - require either email OR phone
    if (!clientName || !packageType || !weeks) {
        alert('Please fill in all required fields:\n- Client Name\n- Package Tier\n- Estimated Weeks');
        return;
    }

    if (!clientEmail && !clientPhone) {
        alert('Please provide either a Client Email or Client Phone number.');
        return;
    }
    
    // Get selected features
    var features = [];
    var checkboxes = document.querySelectorAll('.sow-checkboxes input[type="checkbox"]:checked');
    checkboxes.forEach(function(checkbox) {
        var label = checkbox.parentElement.textContent.trim();
        // Remove third-party note from label
        var thirdPartyNote = checkbox.parentElement.querySelector('.third-party-note');
        if (thirdPartyNote) {
            label = label.replace(thirdPartyNote.textContent, '').trim();
        }
        features.push(label);
    });

    // Get e-commerce selection
    var ecommerceRadio = document.querySelector('input[name="ecommerce_option"]:checked');
    var ecommerceOption = ecommerceRadio ? ecommerceRadio.value : 'none';

    // Use stored pricing data from real-time calculation
    var pricingData = this.currentPricingData || {
        basePrice: 0,
        packageType: packageType,
        addOns: [],
        discounts: [],
        ecommerceOption: ecommerceOption,
        ecommercePrice: 0,
        total: 0
    };

    var totalPrice = pricingData.total;

    var sowData = {
        clientName: clientName,
        clientEmail: clientEmail || '',
        clientPhone: normalizeToE164(clientPhone) || '',
        packageType: packageType,
        estimatedWeeks: parseInt(weeks),
        startDate: startDate || null,
        features: features,
        notes: notes,
        maintenancePlan: maintenancePlan,
        payment: {
            total: totalPrice,
            deposit: totalPrice * 0.50,
            milestone1: totalPrice * 0.25,
            final: totalPrice * 0.25,
            breakdown: {
                basePrice: pricingData.basePrice,
                addOns: pricingData.addOns,
                discounts: pricingData.discounts,
                ecommerceOption: pricingData.ecommerceOption,
                ecommercePrice: pricingData.ecommercePrice
            }
        },
        createdBy: firebase.auth().currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'draft'
    };
    
    var self = this;
    
    firebase.firestore().collection('sow_documents').add(sowData)
        .then(function(docRef) {
            console.log('SOW saved with ID:', docRef.id);
            alert('✓ SOW saved successfully!\n\nYou can now generate the PDF or attach it to a contract.');
            $('#sowCreatorContainer').style.display = 'none';
            
            // Refresh the SOW list
            self.loadSOWDocuments();
        })
        .catch(function(error) {
            console.error('Error saving SOW:', error);
            alert('Error saving SOW: ' + error.message);
        });
};

ContractFormHandler.prototype.showSOWSigningModal = function(sowId) {
    var self = this;
    
    console.log('Opening SOW for signing:', sowId);
    
    // Fetch the SOW
    firebase.firestore().collection('sow_documents')
        .doc(sowId)
        .get()
        .then(function(doc) {
            if (!doc.exists) {
                alert('SOW not found');
                return;
            }
            
            var sowData = doc.data();
            sowData.id = doc.id;
            
            // Check if already signed
            if (sowData.clientSignature && sowData.devSignature) {
                alert('This SOW is already fully signed by both parties.');
                self.generateSOWPDF(sowData);
                return;
            }
            
            // Show signing modal
            self.renderSOWSigningModal(sowData);
        })
        .catch(function(error) {
            console.error('Error loading SOW:', error);
            alert('Error loading SOW: ' + error.message);
        });
};

ContractFormHandler.prototype.renderSOWSigningModal = function(sowData) {
    var self = this;
    
    // Check user role
    var currentUser = firebase.auth().currentUser;
    var userEmail = currentUser.email ? currentUser.email.toLowerCase() : '';
    var userPhone = currentUser.phoneNumber || '';
    var isDeveloper = userEmail === this.DEVELOPER_EMAIL;
    var isClient = (userEmail && sowData.clientEmail && userEmail === sowData.clientEmail.toLowerCase()) ||
                   (userPhone && sowData.clientPhone && userPhone === sowData.clientPhone);

    if (!isDeveloper && !isClient) {
        alert('You do not have permission to sign this SOW');
        return;
    }
    
    // Create modal
    var modal = document.createElement('div');
    modal.id = 'sowSigningModal';
    modal.className = 'contract-modal show';
    
    var html = '<div class="modal-overlay"></div>' +
        '<div class="modal-content">' +
        '<button class="modal-close" id="closeSOWSigningModal">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<line x1="18" y1="6" x2="6" y2="18"></line>' +
        '<line x1="6" y1="6" x2="18" y2="18"></line>' +
        '</svg>' +
        '</button>' +
        
        '<div class="modal-header">' +
        '<h1>📋 Statement of Work - Signature Required</h1>' +
        '<p class="modal-subtitle">' + sowData.clientName + ' | ' + sowData.packageType.toUpperCase() + '</p>' +
        '</div>' +
        
        '<div class="contract-form" ">' +
        
        // SOW Summary
        '<div class="contract-section-inner">' +
        '<h2>SOW Summary</h2>' +
        '<p><strong>Client:</strong> ' + sowData.clientName + '</p>' +
        '<p><strong>Package:</strong> ' + sowData.packageType + '</p>' +
        '<p><strong>Total Cost:</strong> $' + (sowData.payment ? sowData.payment.total.toFixed(2) : '0.00') + '</p>' +
        '<p><strong>Timeline:</strong> ' + (sowData.estimatedWeeks || 'TBD') + ' weeks</p>' +
        '<p><strong>Features:</strong> ' + (sowData.features ? sowData.features.length : 0) + ' selected</p>' +
        '</div>' +
        
        // Signature Sections
        '<div class="signatures">' +
        '<div class="signature-grid">';
    
    // CLIENT SIGNATURE BLOCK
    html += '<div class="signature-block" id="sowClientSignatureBlock">' +
        '<h3>Client Signature — ' + sowData.clientName + '</h3>';
    
    if (sowData.clientSignature) {
        // Already signed
        html += '<div class="pending-notice">' +
            '<p><strong>✓ Client has signed this SOW</strong></p>' +
            '<p>Signed on: ' + (sowData.clientSignedDate || 'N/A') + '</p>' +
            '</div>' +
            '<div class="signature-pad-container">' +
            '<canvas id="sowClientSigPad" class="signature-pad"></canvas>' +
            '</div>';
    } else if (isClient) {
        // Client needs to sign
        html += '<div class="form-group">' +
            '<label>Full Name *</label>' +
            '<input type="text" id="sowClientSignerName" value="' + sowData.clientName + '" required />' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Date *</label>' +
            '<input type="date" id="sowClientSignDate" required />' +
            '</div>' +
            '<div class="signature-pad-container">' +
            '<canvas id="sowClientSigPad" class="signature-pad"></canvas>' +
            '<button class="clear-btn" data-canvas="sowClientSigPad">Clear</button>' +
            '</div>';
    } else {
        // Developer viewing - client hasn't signed yet
        html += '<div class="pending-notice">' +
            '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>' +
            '<p><strong>Awaiting Client Signature</strong></p>' +
            '<p>Client has not signed this SOW yet.</p>' +
            '</div>';
    }
    
    html += '</div>'; // Close client signature block
    
    // DEVELOPER SIGNATURE BLOCK
    html += '<div class="signature-block" id="sowDevSignatureBlock">' +
        '<h3>Developer Signature — Scarlo</h3>';
    
    if (sowData.devSignature) {
        // Already signed
        html += '<div class="pending-notice">' +
            '<p><strong>✓ Developer has signed this SOW</strong></p>' +
            '<p>Signed on: ' + (sowData.devSignedDate || 'N/A') + '</p>' +
            '</div>' +
            '<div class="signature-pad-container">' +
            '<canvas id="sowDevSigPad" class="signature-pad"></canvas>' +
            '</div>';
    } else if (isDeveloper) {
        // Developer needs to sign
        html += '<div class="form-group">' +
            '<label>Developer Name *</label>' +
            '<input type="text" id="sowDevSignerName" value="Carlos Martin" required />' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Date *</label>' +
            '<input type="date" id="sowDevSignDate" required />' +
            '</div>' +
            '<div class="signature-pad-container">' +
            '<canvas id="sowDevSigPad" class="signature-pad"></canvas>' +
            '<button class="clear-btn" data-canvas="sowDevSigPad">Clear</button>' +
            '</div>';
    } else {
        // Client viewing - developer hasn't signed yet
        html += '<div class="pending-notice">' +
            '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>' +
            '<p><strong>Awaiting Developer Signature</strong></p>' +
            '<p>Developer will review and sign shortly.</p>' +
            '</div>';
    }
    
    html += '</div>'; // Close dev signature block
    html += '</div></div>'; // Close signature-grid and signatures
    
    // Action Buttons
    html += '<div class="action-buttons">';
    
    if (sowData.clientSignature && sowData.devSignature) {
        // Both signed - show download
        html += '<button class="btn btn-primary" id="downloadSOWBtn">' +
            '<span>📄 Download Signed SOW</span>' +
            '</button>';
    } else if (isClient && !sowData.clientSignature) {
        // Client can sign
        html += '<button class="btn btn-primary" id="submitSOWClientSig">' +
            '<span>✍️ Submit Signature</span>' +
            '</button>';
    } else if (isDeveloper && !sowData.devSignature && sowData.clientSignature) {
        // Developer can sign (only if client signed first)
        html += '<button class="btn btn-primary" id="submitSOWDevSig">' +
            '<span>✍️ Sign SOW</span>' +
            '</button>';
    }
    
    html += '</div></div></div>'; // Close action-buttons, contract-form, modal-content
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    
    // Initialize signature pads and event listeners
    setTimeout(function() {
        self.initSOWSignaturePads(sowData, isDeveloper, isClient);
    }, 100);
};

ContractFormHandler.prototype.initSOWSignaturePads = function(sowData, isDeveloper, isClient) {
    var self = this;
    
    // Initialize pads
    var clientCanvas = document.getElementById('sowClientSigPad');
    var devCanvas = document.getElementById('sowDevSigPad');
    
    var clientPad = null;
    var devPad = null;
    
    if (clientCanvas) {
        if (sowData.clientSignature) {
            // Draw existing signature
            this.drawSignatureOnCanvas(clientCanvas, sowData.clientSignature);
        } else if (isClient) {
            // Create pad for signing
            clientPad = createSignaturePad(clientCanvas);
            
            // Set today's date
            var clientDateField = document.getElementById('sowClientSignDate');
            if (clientDateField) {
                clientDateField.value = new Date().toISOString().split('T')[0];
            }
        }
    }
    
    if (devCanvas) {
        if (sowData.devSignature) {
            // Draw existing signature
            this.drawSignatureOnCanvas(devCanvas, sowData.devSignature);
        } else if (isDeveloper) {
            // Create pad for signing
            devPad = createSignaturePad(devCanvas);
            
            // Set today's date
            var devDateField = document.getElementById('sowDevSignDate');
            if (devDateField) {
                devDateField.value = new Date().toISOString().split('T')[0];
            }
        }
    }
    
    // Clear button handlers
    var clearBtns = document.querySelectorAll('.clear-btn');
    clearBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            var canvasId = this.getAttribute('data-canvas');
            if (canvasId === 'sowClientSigPad' && clientPad) {
                clientPad.clear();
            } else if (canvasId === 'sowDevSigPad' && devPad) {
                devPad.clear();
            }
        });
    });
    
    // Close button
    var closeBtn = document.getElementById('closeSOWSigningModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            var modal = document.getElementById('sowSigningModal');
            if (modal) modal.remove();
            document.body.classList.remove('modal-open');
        });
    }
    
    // Submit client signature
    var clientSubmitBtn = document.getElementById('submitSOWClientSig');
    if (clientSubmitBtn) {
        clientSubmitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            self.submitSOWClientSignature(sowData.id, clientPad);
        });
    }
    
    // Submit developer signature
    var devSubmitBtn = document.getElementById('submitSOWDevSig');
    if (devSubmitBtn) {
        devSubmitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            self.submitSOWDeveloperSignature(sowData.id, devPad);
        });
    }
    
    // Download button
    var downloadBtn = document.getElementById('downloadSOWBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            self.generateSOWPDF(sowData);
        });
    }
};

ContractFormHandler.prototype.submitSOWClientSignature = function(sowId, signaturePad) {
    var self = this;
    
    if (!signaturePad || signaturePad.isEmpty()) {
        alert('Please provide your signature');
        return;
    }
    
    var signerName = document.getElementById('sowClientSignerName').value.trim();
    var signDate = document.getElementById('sowClientSignDate').value;
    
    if (!signerName || !signDate) {
        alert('Please fill in all fields');
        return;
    }
    
    var submitBtn = document.getElementById('submitSOWClientSig');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Submitting...</span>';
    }
    
    var updateData = {
        clientSignature: signaturePad.toDataURL(),
        clientSignerName: signerName,
        clientSignedDate: signDate,
        clientSignedTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending_developer'
    };
    
    firebase.firestore().collection('sow_documents')
        .doc(sowId)
        .update(updateData)
        .then(function() {
            console.log('✓ Client signed SOW');
            alert('✓ SOW signed successfully!\n\nThe developer will review and sign shortly.');
            
            var modal = document.getElementById('sowSigningModal');
            if (modal) modal.remove();
            document.body.classList.remove('modal-open');
        })
        .catch(function(error) {
            console.error('Error signing SOW:', error);
            alert('Error signing SOW: ' + error.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>✍️ Submit Signature</span>';
            }
        });
};

ContractFormHandler.prototype.submitSOWDeveloperSignature = function(sowId, signaturePad) {
    var self = this;
    
    if (!signaturePad || signaturePad.isEmpty()) {
        alert('Please provide your signature');
        return;
    }
    
    var signerName = document.getElementById('sowDevSignerName').value.trim();
    var signDate = document.getElementById('sowDevSignDate').value;
    
    if (!signerName || !signDate) {
        alert('Please fill in all fields');
        return;
    }
    
    var submitBtn = document.getElementById('submitSOWDevSig');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Signing...</span>';
    }
    
    var updateData = {
        devSignature: signaturePad.toDataURL(),
        devSignerName: signerName,
        devSignedDate: signDate,
        devSignedTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'approved'
    };
    
    firebase.firestore().collection('sow_documents')
        .doc(sowId)
        .update(updateData)
        .then(function() {
            console.log('✓ Developer signed SOW');
            alert('✓ SOW fully executed!\n\nBoth parties have signed.');
            
            var modal = document.getElementById('sowSigningModal');
            if (modal) modal.remove();
            document.body.classList.remove('modal-open');
            
            // Refresh dashboard if open
            if (self.isDeveloper) {
                self.showDeveloperDashboard();
            }
        })
        .catch(function(error) {
            console.error('Error signing SOW:', error);
            alert('Error signing SOW: ' + error.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>✍️ Sign SOW</span>';
            }
        });
};

// ============================================================
// CALIFORNIA LAW COMPLIANT SOW PDF GENERATION
// ============================================================
ContractFormHandler.prototype.generateSOWPDF = function(sowData) {
    var self = this;

    // If sowData is provided, use it; otherwise read from form
    var clientName, clientContact, packageType, estimatedWeeks, startDate, notes, maintenancePlan, features, sowId;
    var clientSignature, clientSignerName, clientSignedDate, devSignature, devSignerName, devSignedDate;

    if (sowData) {
        // Using saved data
        clientName = sowData.clientName || 'Client Name';
        clientContact = sowData.clientEmail || sowData.clientPhone || 'N/A';
        packageType = sowData.packageType || 'professional';
        estimatedWeeks = sowData.estimatedWeeks || 'TBD';
        startDate = sowData.startDate || null;
        notes = sowData.notes || '';
        maintenancePlan = sowData.maintenancePlan || 'none';
        features = sowData.features || [];
        sowId = sowData.id || 'DRAFT';
        // Signatures
        clientSignature = sowData.clientSignature || '';
        clientSignerName = sowData.clientSignerName || clientName;
        clientSignedDate = sowData.clientSignedDate || '';
        devSignature = sowData.devSignature || '';
        devSignerName = sowData.devSignerName || 'Carlos Martin';
        devSignedDate = sowData.devSignedDate || '';
    } else {
        // Reading from form
        var clientNameField = $('#sowClientName');
        var clientEmailField = $('#sowClientEmail');
        var clientPhoneField = $('#sowClientPhone');
        var packageField = $('#sowPackage');
        var weeksField = $('#sowWeeks');
        var startDateField = $('#sowStartDate');
        var notesField = $('#sowNotes');
        var maintenanceField = $('#sowMaintenance');

        if (!clientNameField || !packageField) {
            alert('Please fill in at least Client Name and Package Tier to generate PDF');
            return;
        }

        clientName = clientNameField.value.trim() || 'Client Name';
        var emailVal = clientEmailField ? clientEmailField.value.trim() : '';
        var phoneVal = clientPhoneField ? clientPhoneField.value.trim() : '';
        clientContact = emailVal || phoneVal || 'N/A';
        packageType = packageField.value || 'professional';
        estimatedWeeks = weeksField ? weeksField.value : 'TBD';
        startDate = startDateField ? startDateField.value : null;
        notes = notesField ? notesField.value.trim() : '';
        maintenancePlan = maintenanceField ? maintenanceField.value : 'none';
        sowId = 'DRAFT';
        clientSignature = '';
        clientSignerName = clientName;
        clientSignedDate = '';
        devSignature = '';
        devSignerName = 'Carlos Martin';
        devSignedDate = '';

        // Get selected features from checkboxes
        features = [];
        $$('.sow-checkboxes input[type="checkbox"]:checked').forEach(function(checkbox) {
            var label = checkbox.parentElement.textContent.trim();
            features.push(label);
        });
    }

    // For backward compatibility, also set clientEmail
    var clientEmail = clientContact;

    if (!clientName || !packageType) {
        alert('Client Name and Package Tier are required to generate PDF');
        return;
    }

    // Package definitions (comprehensive)
    var packageDefinitions = {
        'starter': {
            name: 'Tier 1 — Starter Package',
            priceRange: '$2,500 - $3,500',
            defaultPrice: 3000,
            timeline: '2-3 weeks',
            description: 'Perfect for individuals and small businesses needing a professional online presence.',
            includes: [
                'Single-page custom React/Next.js website',
                'Clean, modern UI/UX design',
                'Fully mobile responsive layout',
                'Light animations and transitions',
                'Custom contact form with email integration',
                'Basic analytics integration (Google Analytics)',
                'SEO-friendly structure',
                'Social media links integration',
                'SSL certificate setup',
                '2 rounds of revisions per milestone',
                '30-day post-launch support'
            ],
            notIncluded: [
                'User authentication or login systems',
                'Database integration',
                'E-commerce functionality',
                'Custom backend development',
                'Ongoing maintenance (available separately)'
            ]
        },
        'professional': {
            name: 'Tier 2 — Professional Package',
            priceRange: '$5,000 - $8,000',
            defaultPrice: 6500,
            timeline: '4-6 weeks',
            description: 'Ideal for growing businesses requiring dynamic functionality and user engagement features.',
            includes: [
                'Multi-section single-page application (SPA)',
                'Fully custom UI/UX design and layout',
                'Dynamic content sections',
                'Smooth scroll animations and micro-interactions',
                'Firebase Authentication (email/password)',
                'Basic user session management',
                'Performance optimization (lazy loading, code splitting)',
                'Advanced SEO setup with meta tags and sitemap',
                'Google Analytics and event tracking',
                'Custom forms with validation and logic',
                'Integration with one third-party service (e.g., Mailchimp, Calendly)',
                '4 rounds of revisions',
                '1 month of included support',
                'Deployment to production environment'
            ],
            notIncluded: [
                'Full user dashboard systems',
                'Multi-role user permissions',
                'E-commerce or payment processing',
                'Complex API integrations (more than 1)',
                'Mobile app development'
            ]
        },
        'premium': {
            name: 'Tier 3 — Premium Package',
            priceRange: '$8,000 - $12,000',
            defaultPrice: 10000,
            timeline: '6-10 weeks',
            description: 'Comprehensive solution for businesses requiring user management, booking systems, and advanced functionality.',
            includes: [
                'Everything in Professional Package',
                'Full Firebase backend (Auth, Firestore, Storage)',
                'User profiles with authentication',
                'Limited multi-user login capability',
                'Custom booking/scheduling system',
                'Custom dashboard components',
                'Advanced UI animations and effects',
                'Multiple API integrations (CRMs, mailing lists, payment gateways)',
                'File upload functionality',
                'Email notification system',
                'Admin panel for content management',
                'Priority support response (24-48 hours)',
                '2 months of included maintenance',
                'Performance monitoring setup'
            ],
            notIncluded: [
                'Full multi-tenant SaaS architecture',
                'Complex role-based access control (RBAC)',
                'Custom mobile applications',
                'Machine learning or AI integrations',
                'Real-time collaboration features'
            ]
        },
        'elite': {
            name: 'Tier 4 — Elite Web Application',
            priceRange: '$10,000 - $20,000+',
            defaultPrice: 15000,
            timeline: '10-16 weeks',
            description: 'Enterprise-grade web application with full backend infrastructure, user management, and scalable architecture.',
            includes: [
                'Multi-page Next.js application with routing',
                'Full Firebase backend infrastructure',
                'Complete authentication system (email, social, phone)',
                'Multi-user login with full profile management',
                'Role-based access control (admin, user, etc.)',
                'Custom user dashboards and analytics',
                'Backend automation and scheduled tasks',
                'Comprehensive API integrations',
                'Full custom UI/UX design system',
                'Scalable, production-ready architecture',
                'Database design and optimization',
                'Security best practices implementation',
                'Automated testing setup',
                'CI/CD pipeline configuration',
                'Documentation and training materials',
                '3 months of premium maintenance included',
                'Dedicated support channel'
            ],
            notIncluded: [
                'Native mobile app development (React Native available separately)',
                'Machine learning model development',
                'Blockchain integration',
                '24/7 on-call support (available separately)'
            ]
        },
        'custom': {
            name: 'Custom Quote',
            priceRange: 'Custom Pricing',
            defaultPrice: 0,
            timeline: 'TBD',
            description: 'Tailored solution designed to meet your specific requirements.',
            includes: ['Custom scope to be defined'],
            notIncluded: []
        }
    };

    var maintenanceDefinitions = {
        'none': {
            name: 'No Maintenance Plan',
            price: '$0/month',
            description: 'No ongoing maintenance. Support ends after the included post-launch period.',
            includes: []
        },
        'basic': {
            name: 'Basic Maintenance',
            price: '$100-$150/month',
            description: 'Ideal for websites requiring occasional updates and minor adjustments.',
            includes: [
                'Minor text and image updates (up to 2 hours/month)',
                'Security updates and patches',
                'Uptime monitoring',
                'Monthly backup verification',
                'Email support (48-72 hour response)',
                'Bug fixes for existing functionality'
            ]
        },
        'professional': {
            name: 'Professional Maintenance',
            price: '$200-$350/month',
            description: 'For businesses requiring regular updates and more hands-on support.',
            includes: [
                'Everything in Basic',
                'Content updates (up to 5 hours/month)',
                'Performance optimization',
                'Analytics review and recommendations',
                'Priority email support (24-48 hour response)',
                'Minor feature enhancements',
                'Third-party integration monitoring',
                'Monthly status reports'
            ]
        },
        'premium': {
            name: 'Premium Maintenance',
            price: '$500-$800/month',
            description: 'Comprehensive support for mission-critical websites and applications.',
            includes: [
                'Everything in Professional',
                'Priority support (same-day response)',
                'New component development (up to 8 hours/month)',
                'SEO optimization and monitoring',
                'A/B testing setup and analysis',
                'Dedicated support channel (Slack/Discord)',
                'Quarterly strategy calls',
                'Proactive performance improvements',
                'Database optimization',
                'Emergency support availability'
            ]
        }
    };

    // Get package and maintenance info
    var packageInfo = packageDefinitions[packageType] || packageDefinitions['custom'];
    var maintenanceInfo = maintenanceDefinitions[maintenancePlan] || maintenanceDefinitions['none'];

    // Calculate pricing
    var totalPrice = 0;
    if (sowData && sowData.payment && sowData.payment.total) {
        totalPrice = sowData.payment.total;
    } else if (packageType === 'custom' && sowData && sowData.customPrice) {
        totalPrice = parseFloat(sowData.customPrice) || 0;
    } else if (packageType === 'custom') {
        var customPriceField = $('#sowCustomPrice');
        totalPrice = customPriceField ? parseFloat(customPriceField.value) || 0 : 0;
    } else {
        totalPrice = packageInfo.defaultPrice;
    }

    var deposit = totalPrice * 0.50;
    var milestone1 = totalPrice * 0.25;
    var finalPayment = totalPrice * 0.25;

    // Format dates
    var generatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    var formattedStartDate = startDate ?
        new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) :
        'To be determined upon contract execution';

    // Open new window for PDF
    var printWindow = window.open('', '_blank');

    if (!printWindow) {
        alert('Please allow popups to download the PDF');
        return;
    }

    // Build HTML
    var htmlContent = '<!DOCTYPE html>' +
    '<html><head>' +
    '<title>Statement of Work - ' + clientName + '</title>' +
    '<style>' +
    '* { margin: 0; padding: 0; box-sizing: border-box; }' +
    'body { font-family: "Times New Roman", Times, serif; font-size: 10pt; line-height: 1.35; color: #000; background: #fff; padding: 0.5in 0.75in; }' +
    'h1 { font-size: 16pt; text-align: center; margin-bottom: 4px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }' +
    'h2 { font-size: 10pt; margin-top: 12px; margin-bottom: 6px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #000; padding-bottom: 2px; }' +
    'h3 { font-size: 10pt; margin-top: 8px; margin-bottom: 4px; font-weight: bold; }' +
    'p { margin-bottom: 6px; text-align: justify; }' +
    'ul, ol { margin-left: 20px; margin-bottom: 6px; }' +
    'li { margin-bottom: 2px; }' +
    '.header { text-align: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid #000; }' +
    '.subtitle { font-size: 10pt; margin-top: 4px; font-style: italic; }' +
    '.meta-date { font-size: 8pt; margin-top: 4px; font-style: italic; }' +
    '.info-box { padding: 8px 12px; border: 1px solid #000; border-left: 3px solid #000; margin: 8px 0; }' +
    '.info-box h3 { margin-top: 0; }' +
    '.info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 15px; margin-top: 6px; }' +
    '.info-item { font-size: 9pt; }' +
    '.section { margin-bottom: 10px; page-break-inside: avoid; }' +
    '.package-box { border: 1px solid #000; padding: 8px 12px; margin: 8px 0; }' +
    '.package-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #000; }' +
    '.package-name { font-size: 11pt; font-weight: bold; }' +
    '.package-price { font-size: 10pt; font-weight: bold; }' +
    '.feature-list { columns: 2; column-gap: 20px; font-size: 9pt; }' +
    '.feature-list li { break-inside: avoid; margin-bottom: 1px; }' +
    '.not-included { border-left: 3px solid #000; }' +
    '.not-included h3 { font-style: italic; }' +
    '.payment-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9pt; }' +
    '.payment-table th, .payment-table td { border: 1px solid #000; padding: 5px 8px; text-align: left; }' +
    '.payment-table th { font-weight: bold; background: #f5f5f5; }' +
    '.payment-table .total-row { font-weight: bold; font-size: 10pt; border-top: 2px solid #000; }' +
    '.timeline-box { border: 1px solid #000; padding: 8px 12px; margin: 8px 0; }' +
    '.timeline-header { font-weight: bold; margin-bottom: 8px; font-size: 10pt; border-bottom: 1px solid #000; padding-bottom: 4px; }' +
    '.milestone { margin-bottom: 6px; padding-left: 8px; border-left: 2px solid #000; }' +
    '.milestone:last-child { margin-bottom: 0; }' +
    '.milestone-title { font-weight: bold; font-size: 9pt; }' +
    '.milestone-desc { font-size: 9pt; }' +
    '.assumptions-box { border: 1px solid #000; border-left: 3px solid #000; padding: 8px 12px; margin: 8px 0; }' +
    '.assumptions-box h3 { margin-top: 0; font-size: 9pt; }' +
    '.assumptions-box li { font-size: 9pt; }' +
    '.legal-notice { border: 1px solid #000; padding: 8px 12px; margin: 10px 0; font-size: 9pt; }' +
    '.signature-section { margin-top: 20px; page-break-before: always; }' +
    '.signature-grid { display: flex; justify-content: space-between; gap: 30px; margin-top: 15px; }' +
    '.signature-block { flex: 1; }' +
    '.signature-block h3 { font-size: 9pt; margin-bottom: 6px; }' +
    '.signature-line { border-bottom: 1px solid #000; height: 50px; margin: 6px 0; display: flex; align-items: flex-end; justify-content: center; }' +
    '.signature-line img { max-height: 45px; max-width: 100%; filter: invert(1) grayscale(1); }' +
    '.signature-label { font-size: 8pt; font-style: italic; margin-top: 3px; }' +
    '.signature-name { font-weight: bold; margin-top: 6px; font-size: 9pt; }' +
    '.signature-date { font-size: 9pt; margin-top: 3px; }' +
    '.footer { margin-top: 20px; text-align: center; font-size: 8pt; border-top: 1px solid #000; padding-top: 10px; }' +
    '.sow-id { font-size: 7pt; margin-top: 4px; font-style: italic; }' +
    '.highlight { font-weight: bold; }' +
    '.maintenance-box { border: 1px solid #000; padding: 8px 12px; margin: 8px 0; }' +
    '.maintenance-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 6px; border-bottom: 1px solid #000; margin-bottom: 6px; }' +
    '.maintenance-name { font-weight: bold; font-size: 10pt; }' +
    '.maintenance-price { font-weight: bold; }' +
    '@media print { body { padding: 0.4in 0.6in; } }' +
    '@page { margin: 0.5in 0.75in; size: letter; }' +
    '</style>' +
    '</head><body>' +

    // HEADER
    '<div class="header">' +
    '<h1>Statement of Work</h1>' +
    '<div class="subtitle">Scarlo — Professional Web Development</div>' +
    '<div class="meta-date">Document Generated: ' + generatedDate + '</div>' +
    '</div>' +

    // LEGAL INCORPORATION
    '<div class="legal-notice">' +
    '<strong>INCORPORATION:</strong> This SOW is incorporated into and governed by the Website Development Agreement between Scarlo and ' + clientName + '. All Agreement terms apply. In case of conflict, the Agreement controls.' +
    '</div>' +

    // CLIENT INFORMATION
    '<div class="section">' +
    '<h2>1. Client Information</h2>' +
    '<div class="info-box">' +
    '<div class="info-grid">' +
    '<div class="info-item"><strong>Client Name:</strong> ' + clientName + '</div>' +
    '<div class="info-item"><strong>Contact Email:</strong> ' + clientEmail + '</div>' +
    '<div class="info-item"><strong>Package Selected:</strong> ' + packageInfo.name + '</div>' +
    '<div class="info-item"><strong>Estimated Timeline:</strong> ' + estimatedWeeks + ' weeks</div>' +
    '<div class="info-item"><strong>Project Start Date:</strong> ' + formattedStartDate + '</div>' +
    '<div class="info-item"><strong>SOW Reference:</strong> ' + sowId + '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +

    // PROJECT OVERVIEW
    '<div class="section">' +
    '<h2>2. Project Overview</h2>' +
    '<div class="package-box">' +
    '<div class="package-header">' +
    '<span class="package-name">' + packageInfo.name + '</span>' +
    '<span class="package-price">' + packageInfo.priceRange + '</span>' +
    '</div>' +
    '<p style="margin-bottom: 15px;">' + packageInfo.description + '</p>' +
    '<h3 style="margin-top: 15px;">Included in This Package:</h3>' +
    '<ul class="feature-list">';

    packageInfo.includes.forEach(function(item) {
        htmlContent += '<li>' + item + '</li>';
    });

    htmlContent += '</ul></div></div>';

    // ADDITIONAL FEATURES
    if (features && features.length > 0) {
        htmlContent += '<div class="section">' +
        '<h2>3. Additional Features</h2>' +
        '<div class="info-box">' +
        '<ul class="feature-list">';
        features.forEach(function(feature) {
            htmlContent += '<li>' + feature + '</li>';
        });
        htmlContent += '</ul></div></div>';
    }

    // SPECIAL REQUIREMENTS
    if (notes && notes.trim()) {
        htmlContent += '<div class="section">' +
        '<h2>' + (features && features.length > 0 ? '4' : '3') + '. Special Requirements & Notes</h2>' +
        '<div class="info-box">' +
        '<p style="margin-bottom: 0;">' + notes + '</p>' +
        '</div>' +
        '</div>';
    }

    var sectionNum = 3 + (features && features.length > 0 ? 1 : 0) + (notes && notes.trim() ? 1 : 0);

    // PROJECT TIMELINE
    htmlContent += '<div class="section">' +
    '<h2>' + sectionNum + '. Project Timeline & Milestones</h2>' +
    '<div class="timeline-box">' +
    '<div class="timeline-header">Estimated Project Duration: ' + estimatedWeeks + ' Weeks</div>' +

    '<div class="milestone">' +
    '<div class="milestone-title">1. Discovery & Planning (Week 1)</div>' +
    '<div class="milestone-desc">Requirements gathering, sitemap, wireframes, project kickoff.</div>' +
    '</div>' +

    '<div class="milestone">' +
    '<div class="milestone-title">2. UI/UX Design (Weeks 2-3)</div>' +
    '<div class="milestone-desc">Visual mockups, component design, approval. <strong>Milestone Payment due.</strong></div>' +
    '</div>' +

    '<div class="milestone">' +
    '<div class="milestone-title">3. Development (Weeks 4-' + Math.max(4, parseInt(estimatedWeeks) - 2 || 4) + ')</div>' +
    '<div class="milestone-desc">Frontend/backend development, feature implementation, testing.</div>' +
    '</div>' +

    '<div class="milestone">' +
    '<div class="milestone-title">4. Testing & Deployment (Final Week)</div>' +
    '<div class="milestone-desc">QA, bug fixes, optimization, deployment. <strong>Final Payment due.</strong></div>' +
    '</div>' +

    '</div>' +
    '<p style="font-size: 9pt; font-style: italic; margin-top: 6px;">Timeline is an estimate. See Agreement Section 8 for terms.</p>' +
    '</div>';

    sectionNum++;

    // PAYMENT STRUCTURE
    htmlContent += '<div class="section">' +
    '<h2>' + sectionNum + '. Payment Structure</h2>' +

    '<table class="payment-table">' +
    '<thead>' +
    '<tr>' +
    '<th style="width: 25%;">Payment</th>' +
    '<th style="width: 45%;">Description</th>' +
    '<th style="width: 15%;">Percentage</th>' +
    '<th style="width: 15%;">Amount</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    '<tr>' +
    '<td><strong>Deposit</strong></td>' +
    '<td>Before work begins</td>' +
    '<td>50%</td>' +
    '<td><strong>$' + deposit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</strong></td>' +
    '</tr>' +
    '<tr>' +
    '<td><strong>Milestone</strong></td>' +
    '<td>Upon design approval</td>' +
    '<td>25%</td>' +
    '<td><strong>$' + milestone1.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</strong></td>' +
    '</tr>' +
    '<tr>' +
    '<td><strong>Final</strong></td>' +
    '<td>Prior to deployment</td>' +
    '<td>25%</td>' +
    '<td><strong>$' + finalPayment.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</strong></td>' +
    '</tr>' +
    '<tr class="total-row">' +
    '<td colspan="2"><strong>TOTAL PROJECT COST</strong></td>' +
    '<td><strong>100%</strong></td>' +
    '<td><strong>$' + totalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</strong></td>' +
    '</tr>' +
    '</tbody>' +
    '</table>' +

    '<p style="font-size: 9pt; font-style: italic;">Late payments subject to interest (Section 3.3). IP rights transfer upon full payment (Section 6.6).</p>' +
    '</div>';

    sectionNum++;

    // MAINTENANCE PLAN (Required for all projects)
    htmlContent += '<div class="section">' +
        '<h2>' + sectionNum + '. Ongoing Maintenance Plan</h2>' +
        '<div class="maintenance-box">' +
        '<div class="maintenance-header">' +
        '<span class="maintenance-name">' + maintenanceInfo.name + '</span>' +
        '<span class="maintenance-price">' + maintenanceInfo.price + '</span>' +
        '</div>' +
        '<p style="margin: 10px 0;">' + maintenanceInfo.description + '</p>';

        if (maintenanceInfo.includes && maintenanceInfo.includes.length > 0) {
            htmlContent += '<h3 style="margin-top: 15px;">Maintenance Includes:</h3>' +
            '<ul>';
            maintenanceInfo.includes.forEach(function(item) {
                htmlContent += '<li>' + item + '</li>';
            });
            htmlContent += '</ul>';
        }

        htmlContent += '</div>' +
    '<p style="font-size: 8pt; font-style: italic;">Begins after post-launch support. Billed monthly. 30-day cancellation notice. See Agreement Section 7.</p>' +
    '</div>';

    sectionNum++;

    // ASSUMPTIONS
    htmlContent += '<div class="section">' +
    '<h2>' + sectionNum + '. Assumptions & Dependencies</h2>' +
    '<div class="assumptions-box">' +
    '<ul>' +
    '<li><strong>Content:</strong> Client provides all content within 5 business days of request</li>' +
    '<li><strong>Feedback:</strong> Client provides consolidated feedback within 5 business days</li>' +
    '<li><strong>Contact:</strong> Client designates one authorized representative for approvals</li>' +
    '<li><strong>Third-Party:</strong> Required APIs/services remain available throughout project</li>' +
    '<li><strong>Hosting:</strong> Client provides hosting meeting Developer\'s requirements</li>' +
    '<li><strong>Rights:</strong> Client has rights to all materials provided</li>' +
    '<li><strong>Scope:</strong> Project scope remains substantially unchanged</li>' +
    '</ul>' +
    '<p style="font-size: 8pt; margin-bottom: 0; margin-top: 6px;">Changes to assumptions may require a Change Order (Section 9).</p>' +
    '</div>' +
    '</div>';

    sectionNum++;

    // ACCEPTANCE CRITERIA
    htmlContent += '<div class="section">' +
    '<h2>' + sectionNum + '. Acceptance Criteria</h2>' +
    '<div class="info-box">' +
    '<p style="margin-bottom: 4px;"><strong>Process:</strong> Client has 5 business days to review deliverables. Acceptance occurs when Client: (a) approves in writing, (b) fails to respond, or (c) uses in production. Acceptance triggers payment.</p>' +
    '<p style="margin-bottom: 0;"><strong>Final Criteria:</strong> Modern browser compatibility (Chrome, Firefox, Safari, Edge), mobile responsiveness (iOS/Android), all features functional, forms working, page load under 5 seconds.</p>' +
    '</div>' +
    '</div>';

    sectionNum++;

    // CHANGE ORDER PROCESS
    htmlContent += '<div class="section">' +
    '<h2>' + sectionNum + '. Scope Changes</h2>' +
    '<div class="info-box">' +
    '<p style="margin-bottom: 4px;">Any scope modifications require a written Change Order (Agreement Section 9).</p>' +
    '<p style="margin-bottom: 0;"><strong>Process:</strong> Client submits request → Developer evaluates impact → Change Order issued with revised scope/timeline/pricing → Client signs and pays deposit → Work proceeds.</p>' +
    '</div>' +
    '</div>';

    // SIGNATURES
    htmlContent += '<div class="signature-section">' +
    '<h2>Signatures</h2>' +
    '<p style="font-size: 9pt;">By signing, both parties agree to this SOW and confirm it accurately reflects the project scope, deliverables, timeline, and pricing. Subject to the Website Development Agreement.</p>' +

    '<div class="signature-grid">' +

    // Developer Signature
    '<div class="signature-block">' +
    '<h3>DEVELOPER: Scarlo</h3>' +
    '<div class="signature-line">' +
    (devSignature ? '<img src="' + devSignature + '" alt="Developer Signature" />' : '<span style="font-style: italic;">Awaiting Signature</span>') +
    '</div>' +
    '<div class="signature-label">Authorized Signature</div>' +
    '<div class="signature-name">' + devSignerName + '</div>' +
    '<div class="signature-date">Date: ' + (devSignedDate || '_______________') + '</div>' +
    '</div>' +

    // Client Signature
    '<div class="signature-block">' +
    '<h3>CLIENT: ' + clientName + '</h3>' +
    '<div class="signature-line">' +
    (clientSignature ? '<img src="' + clientSignature + '" alt="Client Signature" />' : '<span style="font-style: italic;">Awaiting Signature</span>') +
    '</div>' +
    '<div class="signature-label">Authorized Signature</div>' +
    '<div class="signature-name">' + clientSignerName + '</div>' +
    '<div class="signature-date">Date: ' + (clientSignedDate || '_______________') + '</div>' +
    '</div>' +

    '</div>' +
    '</div>' +

    // FOOTER
    '<div class="footer">' +
    '<p><strong>© ' + new Date().getFullYear() + ' Scarlo</strong> — Professional Web Development | Fresno, CA</p>' +
    '<p class="sow-id">SOW: ' + sowId + ' | Generated: ' + new Date().toLocaleString() + '</p>' +
    '<p style="font-size: 7pt; font-style: italic;">Valid for 30 days. Must be signed with the Website Development Agreement.</p>' +
    '</div>' +

    '<script>' +
    'window.onload = function() { setTimeout(function() { window.print(); }, 500); };' +
    '</script>' +
    '</body></html>';

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};

// ============= FIXED: generateSOWPDFFromData - now passes data directly =============
ContractFormHandler.prototype.generateSOWPDFFromData = function(sow) {
    console.log('Generating PDF from saved SOW data:', sow.clientName);
    // Simply pass the SOW data to generateSOWPDF
    this.generateSOWPDF(sow);
};

// ============= NEW: Edit SOW functionality =============
// ============= EDIT SOW FUNCTIONALITY =============
ContractFormHandler.prototype.editSOW = function(sow) {
    var self = this;
    
    console.log('✏️ Opening editor for SOW:', sow.id, '-', sow.clientName);
    
    // Show the SOW creator form
    this.showSOWCreator();
    
    // Wait for form to be rendered
    setTimeout(function() {
        console.log('Populating form fields...');
        
        // Get all form fields
        var fields = {
            clientName: $('#sowClientName'),
            clientEmail: $('#sowClientEmail'),
            clientPhone: $('#sowClientPhone'),
            clientIdToggle: $('#clientIdTypeToggle'),
            emailLabel: $('#emailToggleLabel'),
            phoneLabel: $('#phoneToggleLabel'),
            package: $('#sowPackage'),
            weeks: $('#sowWeeks'),
            startDate: $('#sowStartDate'),
            notes: $('#sowNotes'),
            maintenance: $('#sowMaintenance'),
            customPrice: $('#sowCustomPrice'),
            customSection: $('#customPricingSection')
        };

        // Populate basic fields
        if (fields.clientName) fields.clientName.value = sow.clientName || '';

        // Handle email/phone toggle - check which one has data
        if (sow.clientPhone && !sow.clientEmail) {
            // Phone mode
            if (fields.clientIdToggle) fields.clientIdToggle.checked = true;
            if (fields.clientEmail) fields.clientEmail.style.display = 'none';
            if (fields.clientPhone) {
                fields.clientPhone.style.display = 'block';
                fields.clientPhone.value = formatPhoneNumber(sow.clientPhone);
            }
            if (fields.emailLabel) fields.emailLabel.classList.remove('active');
            if (fields.phoneLabel) fields.phoneLabel.classList.add('active');
        } else {
            // Email mode (default)
            if (fields.clientIdToggle) fields.clientIdToggle.checked = false;
            if (fields.clientPhone) fields.clientPhone.style.display = 'none';
            if (fields.clientEmail) {
                fields.clientEmail.style.display = 'block';
                fields.clientEmail.value = sow.clientEmail || '';
            }
            if (fields.phoneLabel) fields.phoneLabel.classList.remove('active');
            if (fields.emailLabel) fields.emailLabel.classList.add('active');
        }
        if (fields.weeks) fields.weeks.value = sow.estimatedWeeks || '';
        if (fields.startDate) fields.startDate.value = sow.startDate || '';
        if (fields.notes) fields.notes.value = sow.notes || '';
        
        // Set package and show custom pricing if needed
        if (fields.package) {
            fields.package.value = sow.packageType || '';
            
            if (sow.packageType === 'custom') {
                if (fields.customSection) fields.customSection.style.display = 'block';
                if (fields.customPrice && sow.payment) {
                    fields.customPrice.value = sow.payment.total || '';
                }
            }
        }
        
        // Set maintenance plan
        if (fields.maintenance) {
            fields.maintenance.value = sow.maintenancePlan || 'none';
        }

        // Pricing data structures
        var packagePricing = {
            'basic': { min: 400, max: 1000, default: 700 },
            'starter': { min: 2500, max: 3500, default: 3000 },
            'professional': { min: 5000, max: 8000, default: 6500 },
            'premium': { min: 8000, max: 12000, default: 10000 },
            'elite': { min: 10000, max: 20000, default: 15000 }
        };
        var maintenancePricing = {
            'none': 0,
            'basic': 125,
            'professional': 275,
            'premium': 650
        };
        var featurePricing = {
            'responsive_design': { default: 250, thirdParty: false },
            'custom_ui': { default: 500, thirdParty: false },
            'animations': { default: 325, thirdParty: false },
            'seo_optimization': { default: 250, thirdParty: false },
            'analytics': { default: 200, thirdParty: false },
            'performance': { default: 275, thirdParty: false },
            'firebase_auth': { default: 425, thirdParty: true, note: 'Firebase costs' },
            'firebase_db': { default: 500, thirdParty: true, note: 'Firebase costs' },
            'user_profiles': { default: 650, thirdParty: false },
            'user_roles': { default: 500, thirdParty: false },
            'file_storage': { default: 375, thirdParty: true, note: 'Firebase Storage costs' },
            'booking_system': { default: 1150, thirdParty: false },
            'api_integration': { default: 550, thirdParty: false },
            'cms_integration': { default: 650, thirdParty: false },
            'blog': { default: 500, thirdParty: false },
            'gallery': { default: 400, thirdParty: false },
            'contact_forms': { default: 275, thirdParty: false },
            'email_integration': { default: 400, thirdParty: true, note: 'SendGrid costs' },
            'notifications': { default: 425, thirdParty: false },
            'hosting': { default: 275, thirdParty: true, note: 'Monthly hosting costs' },
            'ssl': { default: 200, thirdParty: false },
            'domain': { default: 150, thirdParty: true, note: 'Annual domain costs' }
        };
        var ecommercePricing = {
            'none': { price: 0, label: 'No E-Commerce' },
            'basic_cart': { price: 2500, label: 'Basic Shopping Cart', thirdParty: true, note: 'Stripe fees' },
            'full_store': { price: 5000, label: 'Full E-Commerce Store', thirdParty: true, note: 'Stripe fees' }
        };
        var packageIncludedFeatures = {
            'basic': ['responsive_design'],
            'starter': ['responsive_design', 'custom_ui', 'animations', 'seo_optimization', 'analytics', 'contact_forms', 'ssl'],
            'professional': ['responsive_design', 'custom_ui', 'animations', 'seo_optimization', 'analytics', 'performance', 'firebase_auth', 'contact_forms', 'ssl', 'hosting'],
            'premium': ['responsive_design', 'custom_ui', 'animations', 'seo_optimization', 'analytics', 'performance', 'firebase_auth', 'firebase_db', 'user_profiles', 'file_storage', 'booking_system', 'api_integration', 'contact_forms', 'email_integration', 'hosting', 'ssl', 'domain'],
            'elite': ['responsive_design', 'custom_ui', 'animations', 'seo_optimization', 'analytics', 'performance', 'firebase_auth', 'firebase_db', 'user_profiles', 'user_roles', 'file_storage', 'booking_system', 'api_integration', 'cms_integration', 'blog', 'gallery', 'contact_forms', 'email_integration', 'notifications', 'hosting', 'ssl', 'domain'],
            'custom': []
        };

        // Check selected features and apply included markers
        var packageType = sow.packageType || '';
        var includedFeatures = packageIncludedFeatures[packageType] || [];

        if (sow.features && sow.features.length > 0) {
            console.log('Checking', sow.features.length, 'features');
            var checkboxes = document.querySelectorAll('.sow-checkboxes input[type="checkbox"]');
            checkboxes.forEach(function(checkbox) {
                checkbox.checked = false; // Uncheck all first
                checkbox.parentElement.classList.remove('feature-included');

                var label = checkbox.parentElement.textContent.trim();
                // Remove third-party note from label for comparison
                var thirdPartyNote = checkbox.parentElement.querySelector('.third-party-note');
                if (thirdPartyNote) {
                    label = label.replace(thirdPartyNote.textContent, '').trim();
                }

                if (sow.features.some(function(f) { return f.indexOf(label) !== -1 || label.indexOf(f) !== -1; })) {
                    checkbox.checked = true;
                }

                // Mark as included if in package
                if (includedFeatures.indexOf(checkbox.value) !== -1) {
                    checkbox.parentElement.classList.add('feature-included');
                }
            });
        }

        // Restore e-commerce selection
        var ecommerceOption = 'none';
        if (sow.payment && sow.payment.breakdown && sow.payment.breakdown.ecommerceOption) {
            ecommerceOption = sow.payment.breakdown.ecommerceOption;
        }
        var ecommerceRadio = document.querySelector('input[name="ecommerce_option"][value="' + ecommerceOption + '"]');
        if (ecommerceRadio) ecommerceRadio.checked = true;

        // Update pricing display with all parameters
        setTimeout(function() {
            self.updateSOWPricing(packagePricing, maintenancePricing, featurePricing, ecommercePricing, packageIncludedFeatures);
        }, 100);
        
        // Update form title
        var formHeader = $('.sow-form-header h4');
        if (formHeader) {
            formHeader.innerHTML = '✏️ Edit Statement of Work';
        }
        
        // Replace save button with update button
        var saveBtn = $('.btn-save-sow');
        if (saveBtn) {
            var newBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newBtn, saveBtn);
            
            newBtn.innerHTML = '<span class="btn-icon">💾</span> Update SOW';
            newBtn.onclick = function(e) {
                e.preventDefault();
                self.updateSOW(sow.id);
            };
        }
        
        console.log('✓ Form populated for editing');
    }, 250);
};

// ============= NEW: Update SOW (instead of create new) =============
ContractFormHandler.prototype.updateSOW = function(sowId) {
    var clientName = $('#sowClientName').value.trim();
    var clientEmail = $('#sowClientEmail').value.trim();
    var clientPhoneRaw = $('#sowClientPhone').value.trim();
    var packageType = $('#sowPackage').value;
    var weeks = $('#sowWeeks').value;
    var startDate = $('#sowStartDate').value;
    var notes = $('#sowNotes').value.trim();
    var maintenancePlan = $('#sowMaintenance').value;

    // Normalize phone to E.164 format (+1XXXXXXXXXX) for Firebase Auth matching
    var clientPhone = '';
    if (clientPhoneRaw) {
        var digits = clientPhoneRaw.replace(/\D/g, '');
        if (digits.length === 10) {
            clientPhone = '+1' + digits;
        } else if (digits.length === 11 && digits.startsWith('1')) {
            clientPhone = '+' + digits;
        } else {
            clientPhone = clientPhoneRaw; // Keep as-is if unusual format
        }
    }

    if (!clientName || !packageType || !weeks) {
        alert('Please fill in all required fields:\n- Client Name\n- Package Tier\n- Estimated Weeks');
        return;
    }

    if (!clientEmail && !clientPhone) {
        alert('Please provide either a Client Email or Client Phone number.');
        return;
    }
    
    // Get selected features
    var features = [];
    var checkboxes = document.querySelectorAll('.sow-checkboxes input[type="checkbox"]:checked');
    checkboxes.forEach(function(checkbox) {
        var label = checkbox.parentElement.textContent.trim();
        // Remove third-party note from label
        var thirdPartyNote = checkbox.parentElement.querySelector('.third-party-note');
        if (thirdPartyNote) {
            label = label.replace(thirdPartyNote.textContent, '').trim();
        }
        features.push(label);
    });

    // Get e-commerce selection
    var ecommerceRadio = document.querySelector('input[name="ecommerce_option"]:checked');
    var ecommerceOption = ecommerceRadio ? ecommerceRadio.value : 'none';

    // Use stored pricing data from real-time calculation
    var pricingData = this.currentPricingData || {
        basePrice: 0,
        packageType: packageType,
        addOns: [],
        discounts: [],
        ecommerceOption: ecommerceOption,
        ecommercePrice: 0,
        total: 0
    };

    var totalPrice = pricingData.total;

    var sowData = {
        clientName: clientName,
        clientEmail: clientEmail || '',
        clientPhone: normalizeToE164(clientPhone) || '',
        packageType: packageType,
        estimatedWeeks: parseInt(weeks),
        startDate: startDate || null,
        features: features,
        notes: notes,
        maintenancePlan: maintenancePlan,
        payment: {
            total: totalPrice,
            deposit: totalPrice * 0.50,
            milestone1: totalPrice * 0.25,
            final: totalPrice * 0.25,
            breakdown: {
                basePrice: pricingData.basePrice,
                addOns: pricingData.addOns,
                discounts: pricingData.discounts,
                ecommerceOption: pricingData.ecommerceOption,
                ecommercePrice: pricingData.ecommercePrice
            }
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    var self = this;

    firebase.firestore().collection('sow_documents').doc(sowId).update(sowData)
        .then(function() {
            console.log('SOW updated successfully');
            alert('✓ SOW updated successfully!');
            $('#sowCreatorContainer').style.display = 'none';
            self.loadSOWDocuments(); // Refresh the list
        })
        .catch(function(error) {
            console.error('Error updating SOW:', error);
            alert('Error updating SOW: ' + error.message);
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
    
    // ✅ SHOW modal header when signing a contract
    var modalHeader = $('.modal-header');
    if (modalHeader) {
        modalHeader.style.display = 'block';
    }
    
    // ✅ SHOW the original modal-close button
    var modalClose = $('.modal-close');
    if (modalClose) {
        modalClose.style.display = 'flex';
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
            devHeader.innerHTML = 'Developer Signature — Scarlo <span style="font-size: 12px; color: #f59e0b;">⏳ Sign Below</span>';
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
    console.log('Setting up client view - dual signing mode');

    var self = this;
    var user = firebase.auth().currentUser;

    // ============= CHECK FOR EXISTING SUBMISSIONS FIRST =============
    var userEmail = user.email;
    var userPhone = user.phoneNumber;

    // Build query based on auth type
    var contractQuery;
    if (userEmail) {
        console.log('Checking existing contracts by email:', userEmail);
        contractQuery = firebase.firestore().collection('contracts')
            .where('clientEmail', '==', userEmail)
            .where('status', 'in', ['pending_developer', 'completed'])
            .orderBy('timestamp', 'desc')
            .limit(1);
    } else if (userPhone) {
        // Try multiple phone formats since stored format may vary
        var digits = userPhone.replace(/\D/g, '');
        var tenDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
        var phoneFormats = [
            userPhone,                                                    // +15591231010
            digits,                                                       // 15591231010
            tenDigits,                                                    // 5591231010
            '(' + tenDigits.slice(0,3) + ') ' + tenDigits.slice(3,6) + '-' + tenDigits.slice(6)  // (559) 123-1010
        ];
        console.log('Checking existing contracts by phone formats:', phoneFormats);

        // Try each format sequentially
        var tryFormat = function(index) {
            if (index >= phoneFormats.length) {
                console.log('No existing contract found for phone user');
                self.proceedWithClientSetup();
                return;
            }
            firebase.firestore().collection('contracts')
                .where('clientPhone', '==', phoneFormats[index])
                .where('status', 'in', ['pending_developer', 'completed'])
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get()
                .then(function(snapshot) {
                    if (!snapshot.empty) {
                        var contractDoc = snapshot.docs[0];
                        var contractData = contractDoc.data();
                        contractData.id = contractDoc.id;
                        console.log('Found existing contract with format:', phoneFormats[index]);
                        var completedContainer = document.getElementById('dualSigningCompleted');
                        if (completedContainer) {
                            completedContainer.style.display = 'block';
                        } else {
                            self.showExistingCompletion(contractData);
                        }
                    } else {
                        tryFormat(index + 1);
                    }
                })
                .catch(function() {
                    tryFormat(index + 1);
                });
        };
        tryFormat(0);
        return;
    } else {
        console.log('No email or phone - proceeding to setup');
        return self.proceedWithClientSetup();
    }

    // Check if user already has a pending or completed contract (email path only now)
    contractQuery.get()
        .then(function(contractSnapshot) {
            if (!contractSnapshot.empty) {
                // Contract exists - check if it's completed or pending
                var contractDoc = contractSnapshot.docs[0];
                var contractData = contractDoc.data();
                contractData.id = contractDoc.id;
                
                console.log('Found existing contract with status:', contractData.status);
                
                // Show completed view directly - don't show signing interface again
                var completedContainer = document.getElementById('dualSigningCompleted');
                if (completedContainer) {
                    completedContainer.style.display = 'block';
                    console.log('Showing existing completion view');
                } else {
                    // Recreate completion view
                    self.showExistingCompletion(contractData);
                }
                
                return; // STOP HERE - don't show signing interface
            }
            
            // No existing contract - proceed with normal flow
            return self.proceedWithClientSetup();
        })
        .catch(function(error) {
            console.error('Error checking existing contracts:', error);
            self.proceedWithClientSetup(); // Fallback to normal flow
        });
};

// New helper function for when no existing contract found
ContractFormHandler.prototype.proceedWithClientSetup = function() {
    var self = this;
    
    // ============= SHOW CLIENT SIGNATURE BLOCK =============
    var clientBlock = $('#clientSignatureBlock');
    if (clientBlock) {
        clientBlock.style.display = 'block';
        clientBlock.style.pointerEvents = 'auto';
        clientBlock.classList.remove('signature-locked');
    }
    
    // Hide developer signature block
    var devBlock = $('#devSignatureBlock');
    if (devBlock) {
        devBlock.style.display = 'none';
        var devInputs = devBlock.querySelectorAll('input');
        devInputs.forEach(function(input) {
            input.disabled = true;
            input.removeAttribute('required');
        });
    }
    
    var devPending = $('#devPendingBlock');
    if (devPending) devPending.style.display = 'block';
    
    var downloadBtn = $('#downloadBtn');
    if (downloadBtn) downloadBtn.style.display = 'none';
    
    // ============= CHECK FOR SOW WITHOUT POPUP =============
    var user = firebase.auth().currentUser;
    var userEmail = user.email;
    var userPhone = user.phoneNumber;

    // Build query based on auth type
    var sowQuery;
    if (userEmail) {
        // Email user - query by email
        console.log('Querying SOW by email:', userEmail);
        sowQuery = firebase.firestore().collection('sow_documents')
            .where('clientEmail', '==', userEmail)
            .orderBy('createdAt', 'desc')
            .limit(1);
    } else if (userPhone) {
        // Try multiple phone formats since stored format may vary
        var digits = userPhone.replace(/\D/g, '');
        var tenDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
        var phoneFormats = [
            userPhone,                                                    // +15591231010
            digits,                                                       // 15591231010
            tenDigits,                                                    // 5591231010
            '(' + tenDigits.slice(0,3) + ') ' + tenDigits.slice(3,6) + '-' + tenDigits.slice(6)  // (559) 123-1010
        ];
        console.log('Querying SOW by phone formats:', phoneFormats);

        // Try each format sequentially
        var tryFormat = function(index) {
            if (index >= phoneFormats.length) {
                console.log('⚠️ No SOW found for client (tried all phone formats)');
                self.showNoSOWNotification();
                return;
            }
            firebase.firestore().collection('sow_documents')
                .where('clientPhone', '==', phoneFormats[index])
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get()
                .then(function(snapshot) {
                    if (!snapshot.empty) {
                        var sowDoc = snapshot.docs[0];
                        var sowData = sowDoc.data();
                        sowData.id = sowDoc.id;
                        console.log('✓ SOW found with format:', phoneFormats[index], 'ID:', sowData.id);
                        self.showDualSigningInterface(sowData);
                    } else {
                        tryFormat(index + 1);
                    }
                })
                .catch(function(error) {
                    console.error('Error querying SOW format', phoneFormats[index], error);
                    tryFormat(index + 1);
                });
        };
        tryFormat(0);
        return;
    } else {
        console.log('No email or phone found');
        self.showNoSOWNotification();
        return;
    }

    sowQuery.get()
        .then(function(snapshot) {
            if (snapshot.empty) {
                console.log('⚠️ No SOW found for client');
                self.showNoSOWNotification();
            } else {
                var sowDoc = snapshot.docs[0];
                var sowData = sowDoc.data();
                sowData.id = sowDoc.id;

                self.showDualSigningInterface(sowData);
            }
        })
        .catch(function(error) {
            console.error('Error fetching SOW:', error);
            self.showNoSOWNotification(error.message);
        });
};
ContractFormHandler.prototype.showNoSOWNotification = function(errorMsg) {
    var self = this;
    
    console.log('Showing no-SOW notification');
    
    // Hide client signature block
    var clientBlock = $('#clientSignatureBlock');
    if (clientBlock) clientBlock.style.display = 'none';
    
    // Disable and hide submit button
    var submitBtn = $('#submitBtn');
    if (submitBtn) {
        submitBtn.style.display = 'none';
        submitBtn.disabled = true;
    }
    
    // Create subtle notification banner with clickable Request Help link
    var notificationHTML = 
        '<div class="sow-missing-notification">' +
        '<div class="notification-icon">📋</div>' +
        '<div class="notification-content">' +
        '<h4>Statement of Work Required</h4>' +
        '<p>You need an approved SOW before signing the contract.</p>' +
        '<p class="notification-action">Please <a href="#" class="request-help-link" style="color: #6366f1; text-decoration: underline; cursor: pointer; font-weight: 700;">Request Help</a> to request your SOW from the developer.</p>' +
        '</div>' +
        '</div>';
    
    // Insert notification at the top of the contract form
    var contractForm = $('#contractForm');
    if (contractForm) {
        var existingNotification = $('.sow-missing-notification');
        if (existingNotification) existingNotification.remove();
        
        contractForm.insertAdjacentHTML('afterbegin', notificationHTML);
        
        // Add click handler to the Request Help link
        var requestHelpLink = $('.request-help-link');
        if (requestHelpLink) {
            requestHelpLink.addEventListener('click', function(e) {
                e.preventDefault();
                var helpModal = $('#helpModal');
                if (helpModal) {
                    helpModal.classList.add('show');
                    document.body.style.overflow = 'hidden';
                    document.body.classList.add('modal-open');
                    
                    // Pre-fill contact info if user is logged in
                    var currentUser = firebase.auth().currentUser;
                    if (currentUser) {
                        var contactField = $('#helpContact');
                        var contactLabel = $('#helpContactLabel');
                        if (contactField) {
                            if (currentUser.email) {
                                contactField.value = currentUser.email;
                                contactField.type = 'email';
                                contactField.placeholder = 'your@email.com';
                                if (contactLabel) contactLabel.textContent = 'Your Email *';
                            } else if (currentUser.phoneNumber) {
                                contactField.value = formatPhoneNumber(currentUser.phoneNumber);
                                contactField.type = 'tel';
                                contactField.placeholder = '(555) 123-4567';
                                if (contactLabel) contactLabel.textContent = 'Your Phone Number *';
                            }
                            contactField.setAttribute('readonly', 'readonly');
                            contactField.style.opacity = '0.7';
                        }
                    }
                }
            });
        }
    }
    
    // Highlight the "Request Help" button in the contract section too
    var requestHelpBtn = $('#requestHelpBtn');
    if (requestHelpBtn) {
        requestHelpBtn.style.animation = 'pulse 6s infinite';
        requestHelpBtn.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.18)';
    }
};
    
ContractFormHandler.prototype.showDualSigningInterface = function(sowData) {
    var self = this;
    
    console.log('Showing dual signing interface for:', sowData.clientName);
    
    // Store SOW data
    this.currentSOW = sowData;
    
    // Hide the regular contract form
    var contractForm = $('#contractForm');
    if (contractForm) contractForm.style.display = 'none';
    
    // ============= HIDE ORIGINAL SUBMIT BUTTON =============
    var originalSubmitBtn = $('#submitBtn');
    if (originalSubmitBtn) {
        originalSubmitBtn.style.display = 'none';
    }
    
    // Create tabbed interface
    var modalContent = $('.modal-content');
    if (!modalContent) return;
    
    // ============= PREVENT DUPLICATE TABS =============
    // Remove any existing tabs first
    var existingTabs = $('#clientSigningTabs');
    if (existingTabs) {
        console.log('Removing existing tabs to prevent duplicates');
        existingTabs.remove();
    }
    
    // Insert tabs after modal header
    var modalHeader = $('.modal-header');
    var tabsContainer = document.createElement('div');
    tabsContainer.id = 'clientSigningTabs';
    tabsContainer.className = 'client-signing-tabs';
    
    tabsContainer.innerHTML = 
        '<div class="signing-tabs-header">' +
        '<button class="signing-tab active" data-tab="contract">' +
        '<span class="tab-icon">📄</span>' +
        '<span class="tab-title">1. Contract Agreement</span>' +
        '<span class="tab-status" id="contractStatus">⏳ Pending</span>' +
        '</button>' +
        '<button class="signing-tab" data-tab="sow">' +
        '<span class="tab-icon">📋</span>' +
        '<span class="tab-title">2. Statement of Work</span>' +
        '<span class="tab-status" id="sowStatus">⏳ Pending</span>' +
        '</button>' +
        '</div>' +
        
        '<div class="signing-tabs-content">' +
        // Contract Tab
        '<div class="signing-tab-pane active" data-tab="contract">' +
        '<div id="contractSigningContent"></div>' +
        '</div>' +
        
        // SOW Tab
        '<div class="signing-tab-pane" data-tab="sow">' +
        '<div id="sowSigningContent"></div>' +
        '</div>' +
        '</div>' +
        
        '<div class="signing-footer">' +
        '<div class="signing-progress">' +
        '<div class="progress-indicator">' +
        '<span class="progress-dot" id="contractDot"></span>' +
        '<span class="progress-line"></span>' +
        '<span class="progress-dot" id="sowDot"></span>' +
        '</div>' +
        '<p class="progress-text">Complete both signatures to submit</p>' +
        '</div>' +
        '<button class="btn btn-primary" id="dualSignBtn">' +
        '<span id="dualSignBtnText">Next: Sign SOW →</span>' +
        '</button>' +
        '</div>';    
    if (modalHeader && modalHeader.nextSibling) {
        modalContent.insertBefore(tabsContainer, modalHeader.nextSibling);
    } else {
        modalContent.appendChild(tabsContainer);
    }
    
    // Load contract content into first tab
    var contractContent = $('#contractSigningContent');
    if (contractContent) {
        // Add contract header
        var contractHeader = document.createElement('div');
        contractHeader.className = 'modal-header';
        contractHeader.innerHTML = '<h2>Contract</h2>' +
            '<p class="modal-subtitle">Scarlo - Carlos Martin</p>';
        contractContent.appendChild(contractHeader);
        contractContent.appendChild(contractForm);
        contractForm.style.display = 'block';
    }
    
    // Load SOW content into second tab
    this.renderSOWForClientSigning(sowData);
    
    // Setup tab switching
    $$('.signing-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            var tabName = this.getAttribute('data-tab');
            self.switchSigningTab(tabName);
        });
    });
    
    // Setup dual-purpose button (Next on Contract, Submit on SOW)
    var dualBtn = $('#dualSignBtn');
    if (dualBtn) {
        dualBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Check which tab we're on
            var activeTab = $('.signing-tab.active');
            var currentTab = activeTab ? activeTab.getAttribute('data-tab') : 'contract';
            
            if (currentTab === 'contract') {
                // VALIDATE CONTRACT FIELDS
                var errors = self.validateContractTab();
                if (errors.length > 0) {
                    alert('Please complete all required fields:\n\n' + errors.join('\n'));
                    return;
                }
                
                // All valid - mark as signed and move to SOW
                self.updateSignatureStatus('contract', true);
                self.switchSigningTab('sow');
            } else {
                // On SOW tab - submit both signatures
                self.submitBothSignatures();
            }
        });
    }
    
    // ============= INITIALIZE SIGNATURE PADS AFTER DOM IS READY =============
    setTimeout(function() {
        console.log('🎨 Initializing dual signature pads...');
        
        // Initialize CONTRACT signature pad (Tab 1)
        var clientCanvas = document.getElementById('clientSignaturePad');
        if (clientCanvas) {
            console.log('Found contract canvas, initializing...');
            
            // Make canvas fully interactive
            clientCanvas.style.pointerEvents = 'auto';
            clientCanvas.style.touchAction = 'none';
            clientCanvas.style.cursor = 'crosshair';
            
            // Remove any existing signature-locked class
            var clientBlock = clientCanvas.closest('.signature-block');
            if (clientBlock) {
                clientBlock.classList.remove('signature-locked');
                clientBlock.style.pointerEvents = 'auto';
            }
            
            self.clientSignaturePad = createSignaturePad(clientCanvas);
            console.log('✓ Contract signature pad initialized');
            
            // Setup clear button for contract
            var contractClearBtn = $('.clear-btn[data-canvas="clientSignaturePad"]');
            if (contractClearBtn) {
                contractClearBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (self.clientSignaturePad) {
                        self.clientSignaturePad.clear();
                        self.updateSignatureStatus('contract', false);
                    }
                });
            }
        } else {
            console.error('❌ Contract signature canvas not found!');
        }
        
        // Setup clear button for SOW (signature pad will be initialized when tab is opened)
        var sowClearBtn = $('.clear-btn[data-canvas="sowClientSignaturePad"]');
        if (sowClearBtn) {
            sowClearBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (window.sowClientPad) {
                    window.sowClientPad.clear();
                    self.updateSignatureStatus('sow', false);
                }
            });
        }
        
        console.log('ℹ️ SOW signature pad will be initialized when SOW tab is opened');
        
        // Check if signatures already exist
        self.checkExistingSignatures();
        
    }, 400); // Increased timeout to ensure DOM is fully ready
};
ContractFormHandler.prototype.renderSOWForClientSigning = function(sowData) {
    var sowContent = $('#sowSigningContent');
    if (!sowContent) return;

    var packageNames = {
        'basic': 'Basic — Landing Page',
        'starter': 'Tier 1 — Starter',
        'professional': 'Tier 2 — Professional',
        'premium': 'Tier 3 — Premium',
        'elite': 'Tier 4 — Elite',
        'custom': 'Custom Quote'
    };

    var packageDetails = {
        'basic': {
            includes: ['Single-page landing page', 'Mobile responsive design', 'Clean, modern layout']
        },
        'starter': {
            includes: ['1-page custom React/Next.js website', 'Clean, modern UI/UX', 'Mobile responsive', 'Light animations and transitions', 'Custom contact form', 'Simple analytics']
        },
        'professional': {
            includes: ['Fully custom UI/UX layout', 'Dynamic single-page application flow', 'Smooth animations', 'Firebase authentication', 'Performance optimization', 'SEO setup + analytics', 'Custom forms & logic', '4 rounds of revisions', '1 month of support included']
        },
        'premium': {
            includes: ['Everything in Professional', 'Firebase Authentication & Database', 'User Profiles (Auth. Limited Multi-User Login)', 'Custom booking systems and workflow logic', 'Custom dashboard components', 'Advanced UI animations', 'API integrations (CRMs, mailing lists, etc.)', 'Priority Support', '2 months of maintenance included']
        },
        'elite': {
            includes: ['Multi-page Next.js application', 'Full Firebase backend (Auth, Firestore, Storage)', 'User Profiles (Auth. Multi-User Login)', 'User roles, permissions, dashboards', 'Backend automation & API integrations', 'Full custom UI/UX', 'Scalable architecture', '3 months of premium maintenance included']
        }
    };

    var packageInfo = packageDetails[sowData.packageType] || { includes: [] };
    var totalPrice = sowData.payment ? sowData.payment.total : 0;
    var deposit = totalPrice * 0.50;
    var milestone1 = totalPrice * 0.25;
    var finalPayment = totalPrice * 0.25;

    // Extract pricing breakdown if available
    var breakdown = (sowData.payment && sowData.payment.breakdown) ? sowData.payment.breakdown : null;
    var basePrice = breakdown ? breakdown.basePrice : totalPrice;
    var addOns = breakdown ? breakdown.addOns : [];
    var discounts = breakdown ? breakdown.discounts : [];
    
    var html = '' +

        // HEADER
        '<div class="modal-header">' +
        '<h2>STATEMENT OF WORK</h2>' +
        '<p class="modal-subtitle">Scarlo - Carlos Martin</p>' +
        '</div>' +

        // CLIENT INFO BOX
        '<section class="contract-section-inner">' +
        '<h3>Client Information</h3>' +
        '<div class="sow-info-grid">' +
        '<div class="sow-info-item"><strong>Client Name:</strong> ' + sowData.clientName + '</div>' +
        '<div class="sow-info-item"><strong>Contact:</strong> ' + (sowData.clientEmail || sowData.clientPhone || 'N/A') + '</div>' +
        '<div class="sow-info-item"><strong>Package:</strong> ' + (packageNames[sowData.packageType] || sowData.packageType) + '</div>' +
        '<div class="sow-info-item"><strong>Timeline:</strong> ' + (sowData.estimatedWeeks || 'TBD') + ' weeks</div>' +
        '</div>' +
        '</section>' +

        // PACKAGE INCLUDES
        '<section class="contract-section-inner">' +
        '<h3>Package Includes</h3>' +
        '<ul class="sow-list">';
    
    if (packageInfo.includes && packageInfo.includes.length > 0) {
        packageInfo.includes.forEach(function(item) {
            html += '<li>' + item + '</li>';
        });
    }
    
    html += '</ul></section>';

    // SELECTED FEATURES
    if (sowData.features && sowData.features.length > 0) {
        html += '<section class="contract-section-inner">' +
            '<h3>Additional Features & Deliverables</h3>' +
            '<ul class="sow-list">';

        sowData.features.forEach(function(feature) {
            html += '<li>' + feature + '</li>';
        });

        html += '</ul></section>';
    }

    // SPECIAL REQUIREMENTS
    if (sowData.notes) {
        html += '<section class="contract-section-inner">' +
            '<h3>Special Requirements</h3>' +
            '<p>' + sowData.notes + '</p>' +
            '</section>';
    }

    // PRICING BREAKDOWN (show itemized costs)
    html += '<section class="contract-section-inner">' +
        '<h3>Pricing Breakdown</h3>' +
        '<table class="sow-payment-table pricing-breakdown-table">' +
        '<thead>' +
        '<tr>' +
        '<th>Item</th>' +
        '<th>Description</th>' +
        '<th>Amount</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>' +
        '<tr class="base-package-row">' +
        '<td><strong>' + (packageNames[sowData.packageType] || 'Package') + '</strong></td>' +
        '<td>Base package price</td>' +
        '<td><strong>$' + basePrice.toFixed(2) + '</strong></td>' +
        '</tr>';

    // Add-ons (features added beyond package)
    if (addOns && addOns.length > 0) {
        addOns.forEach(function(addon) {
            var thirdPartyNote = addon.thirdParty ? ' <span class="third-party-indicator">*</span>' : '';
            html += '<tr class="addon-row">' +
                '<td>' + addon.label + thirdPartyNote + '</td>' +
                '<td>Additional feature</td>' +
                '<td class="addon-price">+$' + addon.price.toFixed(2) + '</td>' +
                '</tr>';
        });
    }

    // Discounts (features removed from package)
    if (discounts && discounts.length > 0) {
        discounts.forEach(function(discount) {
            html += '<tr class="discount-row">' +
                '<td>' + discount.label + '</td>' +
                '<td>Feature removed (50% credit)</td>' +
                '<td class="discount-price">-$' + discount.price.toFixed(2) + '</td>' +
                '</tr>';
        });
    }

    html += '<tr class="sow-total-row">' +
        '<td colspan="2"><strong>Total Project Cost</strong></td>' +
        '<td><strong>$' + totalPrice.toFixed(2) + '</strong></td>' +
        '</tr>' +
        '</tbody>' +
        '</table>';

    // Third-party costs note
    if (addOns && addOns.some(function(a) { return a.thirdParty; })) {
        html += '<p class="third-party-note-text"><span class="third-party-indicator">*</span> These features may incur additional third-party costs (e.g., Firebase, Stripe, hosting, domain) which are billed separately by the respective providers.</p>';
    }

    html += '</section>';

    // PAYMENT STRUCTURE
    html += '<section class="contract-section-inner">' +
        '<h3>Payment Schedule</h3>' +
        '<table class="sow-payment-table">' +
        '<thead>' +
        '<tr>' +
        '<th>Payment Milestone</th>' +
        '<th>Description</th>' +
        '<th>Amount</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>' +
        '<tr>' +
        '<td><strong>Initial Deposit</strong></td>' +
        '<td>Due before work begins (50%)</td>' +
        '<td><strong>$' + deposit.toFixed(2) + '</strong></td>' +
        '</tr>' +
        '<tr>' +
        '<td><strong>Milestone 1</strong></td>' +
        '<td>UI/UX Design Approval (25%)</td>' +
        '<td><strong>$' + milestone1.toFixed(2) + '</strong></td>' +
        '</tr>' +
        '<tr>' +
        '<td><strong>Final Payment</strong></td>' +
        '<td>Prior to deployment (25%)</td>' +
        '<td><strong>$' + finalPayment.toFixed(2) + '</strong></td>' +
        '</tr>' +
        '</tbody>' +
        '</table>' +
        '</section>';
    
    // TERMS
    html += '<section class="contract-section-inner">' +
        '<h3>Terms & Conditions</h3>' +
        '<p>This Statement of Work is subject to the terms outlined in the Website Development Agreement between Scarlo and <strong>' + sowData.clientName + '</strong>. All work will be performed using modern technologies including React, Next.js, Firebase, and associated development tools in accordance with industry best practices.</p>' +
        '<p>The project timeline is an estimate and may be adjusted based on client feedback, content delivery, and scope changes. Any requests beyond the defined scope require a signed Change Order.</p>' +
        '</section>' +

        // SIGNATURE BLOCK
        '<section class="contract-section-inner signatures">' +
        '<h3>Client Signature Required</h3>' +
        '<p>Please review the above Statement of Work carefully. By signing below, you acknowledge that you have read and agree to the scope, timeline, and payment terms outlined in this document.</p>' +

        '<div class="signature-block">' +
        '<h3>Client Signature — ' + sowData.clientName + '</h3>' +
        '<div class="form-group">' +
        '<label>Full Name *</label>' +
        '<input type="text" id="sowClientName" value="' + sowData.clientName + '" required />' +
        '</div>' +
        '<div class="form-group">' +
        '<label>Date *</label>' +
        '<input type="date" id="sowClientDate" required />' +
        '</div>' +
        '<div class="signature-pad-container">' +
        '<canvas id="sowClientSignaturePad" class="signature-pad"></canvas>' +
        '<button class="clear-btn" data-canvas="sowClientSignaturePad">Clear</button>' +
        '</div>' +
        '</div>' +

        '</section>';

    sowContent.innerHTML = html;
    
    // Set today's date
    var dateField = $('#sowClientDate');
    if (dateField) {
        dateField.value = new Date().toISOString().split('T')[0];
    }
    
    // NOTE: Signature pad initialization happens in showDualSigningInterface
    // to ensure proper timing after all DOM elements are in place
    console.log('✓ SOW content rendered, signature pad will be initialized by parent function');
};
ContractFormHandler.prototype.switchSigningTab = function(tabName) {
    var self = this;
    
    // Update tab buttons
    $$('.signing-tab').forEach(function(tab) {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Update tab content
    $$('.signing-tab-pane').forEach(function(pane) {
        pane.classList.remove('active');
        if (pane.getAttribute('data-tab') === tabName) {
            pane.classList.add('active');
        }
    });
    
    // ============= INITIALIZE/RESIZE SOW SIGNATURE PAD WHEN TAB OPENS =============
    if (tabName === 'sow') {
        setTimeout(function() {
            var sowCanvas = document.getElementById('sowClientSignaturePad');
            if (sowCanvas) {
                console.log('🎨 SOW tab opened - initializing signature pad');
                
                // Make canvas fully interactive
                sowCanvas.style.pointerEvents = 'auto';
                sowCanvas.style.touchAction = 'none';
                sowCanvas.style.cursor = 'crosshair';
                
                // Remove any locks
                var sowBlock = sowCanvas.closest('.signature-block');
                if (sowBlock) {
                    sowBlock.classList.remove('signature-locked');
                    sowBlock.style.pointerEvents = 'auto';
                }
                
                // Force canvas to be visible and properly sized BEFORE initialization
                sowCanvas.style.display = 'block';
                sowCanvas.style.width = '100%';
                sowCanvas.style.height = '270px';
                
                // Wait for layout to settle, then initialize
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() {
                        // Re-initialize or resize the signature pad
                        if (!window.sowClientPad || typeof window.sowClientPad.resize !== 'function') {
                            // Create new signature pad if it doesn't exist
                            window.sowClientPad = createSignaturePad(sowCanvas);
                            console.log('✓ SOW signature pad created');
                        } else {
                            // Resize existing pad now that canvas is visible
                            window.sowClientPad.resize();
                            console.log('✓ SOW signature pad resized');
                        }
                        
                        // Log dimensions for debugging
                        var rect = sowCanvas.getBoundingClientRect();
                        console.log('SOW canvas rect:', rect.width, 'x', rect.height, 'left:', rect.left, 'top:', rect.top);
                    });
                });
                
                // ============= ENABLE BUTTON WHEN USER SIGNS =============
                var updateSubmitButton = function() {
                    var dualBtn = $('#dualSignBtn');
                    if (!dualBtn) return;
                    
                    var hasSigned = window.sowClientPad && !window.sowClientPad.isEmpty();
                    
                    dualBtn.disabled = !hasSigned;
                    dualBtn.style.opacity = hasSigned ? '1' : '0.5';
                    
                    console.log('SOW signature state:', hasSigned ? 'Signed ✓' : 'Empty ✗');
                };
                
                // Listen for when user finishes drawing
                sowCanvas.addEventListener('mouseup', updateSubmitButton);
                sowCanvas.addEventListener('touchend', updateSubmitButton);
                
                // ============= ALSO LISTEN TO CLEAR BUTTON =============
                var sowClearBtn = $('.clear-btn[data-canvas="sowClientSignaturePad"]');
                if (sowClearBtn) {
                    // Remove any existing listeners to prevent duplicates
                    var newClearBtn = sowClearBtn.cloneNode(true);
                    sowClearBtn.parentNode.replaceChild(newClearBtn, sowClearBtn);
                    
                    // Add new listener that updates button state
                    newClearBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        if (window.sowClientPad) {
                            window.sowClientPad.clear();
                            self.updateSignatureStatus('sow', false);
                            // Update submit button immediately after clearing
                            updateSubmitButton();
                        }
                    });
                }
                
                // Initial check
                updateSubmitButton();
                
            } else {
                console.error('❌ SOW signature canvas not found when switching to tab');
            }
        }, 100); // Small delay to ensure tab is fully visible
    }
    
    // ============= UPDATE BUTTON TEXT AND STATE =============
    var dualBtn = $('#dualSignBtn');
    var btnText = $('#dualSignBtnText');
    
    if (tabName === 'contract') {
        // On Contract tab - show "Next" button
        if (btnText) btnText.textContent = 'Next: Sign SOW →';
        if (dualBtn) {
            dualBtn.disabled = false;
            dualBtn.style.display = 'inline-flex';
        }
    } else if (tabName === 'sow') {
        // On SOW tab - show "Submit" button
        if (btnText) btnText.textContent = '✍️ Submit for Developer Signature';
        
        // Enable button only if SOW is signed
        var sowSigned = window.sowClientPad && !window.sowClientPad.isEmpty();
        
        if (dualBtn) {
            dualBtn.disabled = !sowSigned;
            dualBtn.style.display = 'inline-flex';
            dualBtn.style.opacity = sowSigned ? '1' : '0.5';
        }
    }
};
ContractFormHandler.prototype.checkExistingSignatures = function() {
    var contractSigned = false;
    var sowSigned = false;
    
    // Check contract signature
    if (this.clientSignaturePad && !this.clientSignaturePad.isEmpty()) {
        contractSigned = true;
        this.updateSignatureStatus('contract', true);
    }
    
    // Check SOW signature
    if (window.sowClientPad && !window.sowClientPad.isEmpty()) {
        sowSigned = true;
        this.updateSignatureStatus('sow', true);
    }
    
    // Show submit button if both signed
    if (contractSigned && sowSigned) {
        var submitBtn = $('#submitBothBtn');
        if (submitBtn) submitBtn.style.display = 'inline-flex';
    }
};
ContractFormHandler.prototype.updateSignatureStatus = function(type, signed) {
    var statusEl = $('#' + type + 'Status');
    var dotEl = $('#' + type + 'Dot');
    
    if (signed) {
        if (statusEl) {
            statusEl.textContent = '✓ Signed';
            statusEl.style.color = '#10b981';
        }
        if (dotEl) {
            dotEl.classList.add('completed');
        }
    } else {
        if (statusEl) {
            statusEl.textContent = '⏳ Pending';
            statusEl.style.color = '#f59e0b';
        }
        if (dotEl) {
            dotEl.classList.remove('completed');
        }
    }
    
    // Check if both are signed
    var contractSigned = $('#contractStatus') && $('#contractStatus').textContent.includes('✓');
    var sowSigned = $('#sowStatus') && $('#sowStatus').textContent.includes('✓');
    
    // Only show submit button if on SOW tab AND both signed
    var activeTab = $('.signing-tab.active');
    var isOnSOWTab = activeTab && activeTab.getAttribute('data-tab') === 'sow';
    
    var submitBtn = $('#submitBothBtn');
    if (submitBtn) {
        submitBtn.style.display = (isOnSOWTab && contractSigned && sowSigned) ? 'inline-flex' : 'none';
    }
};
ContractFormHandler.prototype.validateContractTab = function() {
    var errors = [];
    
    // Validate client name
    var clientName = $('#clientName');
    if (!clientName || !clientName.value.trim()) {
        errors.push('• Client Name / Company Name is required');
    }
    
    // Validate signer name
    var signerName = $('#clientSignerName');
    if (!signerName || !signerName.value.trim()) {
        errors.push('• Your Full Name is required');
    }
    
    // Validate date
    var clientDate = $('#clientDate');
    if (!clientDate || !clientDate.value) {
        errors.push('• Signature Date is required');
    }
    
    // Validate acknowledgment checkbox
    var acknowledgment = $('#acknowledgment');
    if (!acknowledgment || !acknowledgment.checked) {
        errors.push('• You must acknowledge the terms and conditions');
    }
    
    // Validate signature
    if (!this.clientSignaturePad || this.clientSignaturePad.isEmpty()) {
        errors.push('• Your signature is required');
    }
    
    return errors;
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
        console.log('Showing completed contract');
        
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
    
    // Show client signature block (LOCKED)
    var clientBlock = $('#clientSignatureBlock');
    if (clientBlock) {
        clientBlock.style.display = 'block';
        clientBlock.style.opacity = '1';
        
        // CRITICAL: Clone canvas to remove ALL event listeners
        var oldClientCanvas = document.getElementById('clientSignaturePad');
        if (oldClientCanvas) {
            var newClientCanvas = oldClientCanvas.cloneNode(true);
            oldClientCanvas.parentNode.replaceChild(newClientCanvas, oldClientCanvas);
        }
        
        // Lock the block
        clientBlock.style.pointerEvents = 'none';
        clientBlock.classList.add('signature-locked');
        
        // Update fields
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
    }
    
    // Show developer signature block (LOCKED)
    var devBlock = $('#devSignatureBlock');
    if (devBlock) {
        devBlock.style.display = 'block';
        devBlock.style.opacity = '1';
        
        // CRITICAL: Clone canvas to remove ALL event listeners
        var oldDevCanvas = document.getElementById('devSignaturePad');
        if (oldDevCanvas) {
            var newDevCanvas = oldDevCanvas.cloneNode(true);
            oldDevCanvas.parentNode.replaceChild(newDevCanvas, oldDevCanvas);
        }
        
        // Lock the block
        devBlock.style.pointerEvents = 'none';
        devBlock.classList.add('signature-locked');
        
        // Update fields
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
    }
    
    // Draw signatures after canvases are replaced and visible
    setTimeout(function() {
        if (data.clientSignature) {
            var clientCanvas = document.getElementById('clientSignaturePad');
            if (clientCanvas) {
                self.drawSignatureOnCanvas(clientCanvas, data.clientSignature);
            }
        }
        
        if (data.devSignature) {
            var devCanvas = document.getElementById('devSignaturePad');
            if (devCanvas) {
                self.drawSignatureOnCanvas(devCanvas, data.devSignature);
            }
        }
    }, 300);
    
    // Hide pending block
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
                devHeader.innerHTML = 'Developer Signature — Scarlo <span style="font-size: 12px; color: #f59e0b;">⏳ Sign Below</span>';
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

    ContractFormHandler.prototype.submitBothSignatures = function() {
    var self = this;
    
    console.log('Submitting both contract and SOW signatures...');
    
    // Validate contract signature
    if (!this.clientSignaturePad || this.clientSignaturePad.isEmpty()) {
        alert('Please sign the contract first (Tab 1)');
        this.switchSigningTab('contract');
        return;
    }
    
    // Validate SOW fields
    var sowName = $('#sowClientName');
    var sowDate = $('#sowClientDate');
    
    if (!sowName || !sowName.value.trim()) {
        alert('Please enter your name on the SOW');
        return;
    }
    
    if (!sowDate || !sowDate.value) {
        alert('Please enter the signature date on the SOW');
        return;
    }
    
    // Validate SOW signature  
    if (!window.sowClientPad || window.sowClientPad.isEmpty()) {
        alert('Please sign the Statement of Work');
        return;
    }
    
    var submitBtn = $('#submitBothBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Submitting...</span>';
    }
    
    var user = firebase.auth().currentUser;
    var clientEmail = user.email || '';
    var clientPhone = user.phoneNumber || '';

    // Contract data
    var contractData = {
        clientName: $('#clientName').value.trim(),
        clientSignerName: $('#clientSignerName').value.trim(),
        clientDate: $('#clientDate').value,
        clientSignature: this.clientSignaturePad.toDataURL(),
        clientEmail: clientEmail,
        clientPhone: normalizeToE164(clientPhone),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending_developer'
    };
    
    // SOW signature data
    var sowSignature = window.sowClientPad.toDataURL();
    var sowClientName = $('#sowClientName').value.trim();
    var sowClientDate = $('#sowClientDate').value;
    
    var contractId = null;
    
    // Submit contract
    firebase.firestore().collection('contracts').add(contractData)
        .then(function(docRef) {
            contractId = docRef.id;
            console.log('✓ Contract saved:', contractId);
            
            // Update SOW with signatures and link to contract
            return firebase.firestore().collection('sow_documents')
                .doc(self.currentSOW.id)
                .update({
                    clientSignature: sowSignature,
                    clientSignerName: sowClientName,
                    clientSignedDate: sowClientDate,
                    clientSignedTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    linkedContract: contractId,
                    linkedContractEmail: clientEmail,
                    linkedContractPhone: clientPhone,
                    status: 'pending_developer'
                });
        })
        .then(function() {
            console.log('✓ SOW updated and linked to contract');
            
            // Build complete SOW data with signatures
            var completedSOWData = {
                clientName: sowClientName,
                clientEmail: clientEmail,
                packageType: self.currentSOW.packageType,
                estimatedWeeks: self.currentSOW.estimatedWeeks,
                payment: self.currentSOW.payment,
                clientSignature: sowSignature,
                clientSignerName: sowClientName,
                clientSignedDate: sowClientDate
            };
            
            // Show completed view with both documents
            self.showDualSigningCompleted(contractData, completedSOWData);
        })
        .catch(function(error) {
            console.error('Error submitting signatures:', error);
            alert('Error: ' + error.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>✍️ Submit for Developer Signature</span>';
            }
        });
};
ContractFormHandler.prototype.showExistingCompletion = function(contractData) {
    var self = this;
    
    console.log('Recreating completion view for existing submission');
    
    // Store contract data for PDF generation
    this.currentContract = { id: contractData.id, data: contractData };
    
    // Hide tabs if they exist
    var tabsContainer = $('#clientSigningTabs');
    if (tabsContainer) tabsContainer.style.display = 'none';
    
    // Hide contract form
    var contractForm = $('#contractForm');
    if (contractForm) contractForm.style.display = 'none';
    
    // Check if fully signed (status = completed AND devSignature exists)
    var isFullySigned = contractData.status === 'completed' && contractData.devSignature;
    
    // Fetch linked SOW to display and enable download
    if (contractData.clientEmail) {
        firebase.firestore().collection('sow_documents')
            .where('clientEmail', '==', contractData.clientEmail)
            .where('linkedContract', '==', contractData.id)
            .limit(1)
            .get()
            .then(function(sowSnapshot) {
                var sowData = null;
                if (!sowSnapshot.empty) {
                    sowData = sowSnapshot.docs[0].data();
                    sowData.id = sowSnapshot.docs[0].id;
                }
                self.renderExistingCompletionView(contractData, sowData, isFullySigned);
            })
            .catch(function(error) {
                console.error('Error fetching SOW:', error);
                self.renderExistingCompletionView(contractData, null, isFullySigned);
            });
    } else if (contractData.clientPhone) {
        // Phone-based lookup - use clientPhone field (matches security rules)
        firebase.firestore().collection('sow_documents')
            .where('clientPhone', '==', contractData.clientPhone)
            .where('linkedContract', '==', contractData.id)
            .limit(1)
            .get()
            .then(function(sowSnapshot) {
                var sowData = null;
                if (!sowSnapshot.empty) {
                    sowData = sowSnapshot.docs[0].data();
                    sowData.id = sowSnapshot.docs[0].id;
                }
                self.renderExistingCompletionView(contractData, sowData, isFullySigned);
            })
            .catch(function(error) {
                console.error('Error fetching SOW by phone:', error);
                self.renderExistingCompletionView(contractData, null, isFullySigned);
            });
    } else {
        self.renderExistingCompletionView(contractData, null, isFullySigned);
    }
};

ContractFormHandler.prototype.renderExistingCompletionView = function(contractData, sowData, isFullySigned) {
    var self = this;
    
    // Create or get completed container
    var completedContainer = document.getElementById('dualSigningCompleted');
    if (!completedContainer) {
        completedContainer = document.createElement('div');
        completedContainer.id = 'dualSigningCompleted';
        completedContainer.className = 'dual-signing-completed';
        
        var modalContent = $('.modal-content');
        var modalHeader = $('.modal-header');
        if (modalHeader && modalHeader.nextSibling) {
            modalContent.insertBefore(completedContainer, modalHeader.nextSibling);
        } else if (modalContent) {
            modalContent.appendChild(completedContainer);
        }
    }
    
    var statusBadge = isFullySigned
        ? '<span class="doc-status completed">✅ Fully Signed</span>'
        : '<span class="doc-status pending">⏳ Awaiting Developer Signature</span>';
    
    var headerText = isFullySigned
        ? 'Documents Fully Executed!'
        : 'Documents Successfully Submitted!';
    
    var headerNote = isFullySigned
        ? 'Both you and the developer have signed these documents. Download them below.'
        : 'The developer will review and countersign shortly.';
    
    var html = '<div class="completion-header">' +
        '<div class="completion-icon">✅</div>' +
        '<h2>' + headerText + '</h2>' +
        '<p class="completion-note">' + headerNote + '</p>' +
        '</div>' +
        
        '<div class="completed-documents">' +
        
        // Contract Card with signature preview
        '<div class="completed-doc-card">' +
        '<div class="doc-card-header">' +
        '<h3>📄 Contract Agreement</h3>' +
        statusBadge +
        '</div>' +
        '<div class="doc-card-body">' +
        '<div class="doc-field-row"><span class="field-label">Client:</span><span class="field-value">' + (contractData.clientName || 'N/A') + '</span></div>' +
        '<div class="doc-field-row"><span class="field-label">Client Signed:</span><span class="field-value">' + (contractData.clientDate || 'N/A') + '</span></div>' +
        (isFullySigned ? '<div class="doc-field-row"><span class="field-label">Developer Signed:</span><span class="field-value">' + (contractData.devDate || 'N/A') + '</span></div>' : '') +
        '<div class="doc-field-row"><span class="field-label">' + (contractData.clientEmail ? 'Email:' : 'Phone:') + '</span><span class="field-value">' + (contractData.clientEmail || (contractData.clientPhone ? formatPhoneNumber(contractData.clientPhone) : 'N/A')) + '</span></div>' +
        '</div>' +
        '<div class="doc-signature-preview">' +
        '<p class="signature-label">Your Signature:</p>' +
'<img src="' + contractData.clientSignature + '" alt="Your signature" class="signature-image" style="width: 100%; max-width: 100%; height: auto; background: rgba(255, 255, 255, 0.05); border-radius: 6px; padding: 0.5rem; border: 1px solid rgba(255, 255, 255, 0.1);" />' +
        '</div>';
    
    // Add download button ONLY if fully signed
    if (isFullySigned) {
        html += '<button class="btn btn-primary download-doc-btn" id="downloadContractBtn" style="width: 100%; margin-top: 1rem;">' +
            '<span>📄 Download Contract PDF</span>' +
            '</button>';
    }
    
    html += '</div>'; // Close contract card
    
    // SOW Card (if exists) with signature preview
    if (sowData) {
        var sowFullySigned = sowData.devSignature && sowData.clientSignature;
        var sowStatusBadge = sowFullySigned
            ? '<span class="doc-status completed">✅ Fully Signed</span>'
            : '<span class="doc-status pending">⏳ Awaiting Developer Signature</span>';
        
        html += '<div class="completed-doc-card">' +
            '<div class="doc-card-header">' +
            '<h3>📋 Statement of Work</h3>' +
            sowStatusBadge +
            '</div>' +
            '<div class="doc-card-body">' +
            '<div class="doc-field-row"><span class="field-label">Client Name:</span><span class="field-value">' + (sowData.clientName || 'N/A') + '</span></div>' +
            '<div class="doc-field-row"><span class="field-label">Package:</span><span class="field-value">' + (sowData.packageType || 'N/A') + '</span></div>' +
            '<div class="doc-field-row"><span class="field-label">Total Cost:</span><span class="field-value">$' + (sowData.payment ? sowData.payment.total.toFixed(2) : '0.00') + '</span></div>' +
            '<div class="doc-field-row"><span class="field-label">Timeline:</span><span class="field-value">' + (sowData.estimatedWeeks || 'TBD') + ' weeks</span></div>' +
            '<div class="doc-field-row"><span class="field-label">Client Signed:</span><span class="field-value">' + (sowData.clientSignedDate || 'N/A') + '</span></div>' +
            (sowFullySigned ? '<div class="doc-field-row"><span class="field-label">Developer Signed:</span><span class="field-value">' + (sowData.devSignedDate || 'N/A') + '</span></div>' : '') +
            '</div>' +
            '<div class="doc-signature-preview">' +
            '<p class="signature-label">Your Signature:</p>' +
            '<img src="' + sowData.clientSignature + '" alt="Your SOW signature" class="signature-image" style="width: 100%; max-width: 100%; height: auto; background: rgba(255, 255, 255, 0.05); border-radius: 6px; padding: 0.5rem; border: 1px solid rgba(255, 255, 255, 0.1);" />' +
            '</div>';
        
        // Add download button ONLY if fully signed
        if (sowFullySigned) {
            // Store SOW data globally for PDF generation and change requests
            var sowDataId = 'sowData_' + sowData.id.replace(/[^a-zA-Z0-9]/g, '_');
            window[sowDataId] = sowData;

            html += '<div style="display: flex; gap: 0.75rem; margin-top: 1rem;">' +
                '<button type="button" class="sow-action-btn sow-download-btn" onclick="window.contractFormHandler.generateSOWPDF(window.' + sowDataId + ')">' +
                '📋 Download SOW' +
                '</button>';

            // Show "View Request" button if there's an existing change request, otherwise show "Request Change"
            if (sowData.hasChangeRequest && sowData.changeRequestId) {
                var statusColors = {
                    'pending': { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', text: '💬 View Request' },
                    'approved': { bg: 'linear-gradient(135deg, #10b981, #059669)', text: '✅ View Approved' },
                    'rejected': { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', text: '❌ View Response' },
                    'change_order': { bg: 'linear-gradient(135deg, #6366f1, #4f46e5)', text: '📋 View Order' }
                };
                var btnStyle = statusColors[sowData.changeRequestStatus] || statusColors.pending;
                html += '<button type="button" id="changeRequestBtn-' + sowData.id + '" class="sow-action-btn" style="background: ' + btnStyle.bg + '; color: white; border: none;" onclick="window.contractFormHandler.viewChangeRequest(\'' + sowData.changeRequestId + '\')">' +
                    btnStyle.text +
                    '</button>';
            } else {
                html += '<button type="button" id="changeRequestBtn-' + sowData.id + '" class="sow-action-btn sow-change-btn" onclick="window.contractFormHandler.showChangeRequestModal(window.' + sowDataId + ')">' +
                    '📝 Request Change' +
                    '</button>';
            }

            html += '</div>';
        }

        html += '</div>'; // Close SOW card
    }
    
    html += '</div>'; // Close completed-documents
    
    // Action buttons
html += '<div class="completion-actions">';

// If both documents are fully signed, add a "Download Both" button
if (isFullySigned && sowData && sowData.devSignature && sowData.clientSignature) {
    html += '<button class="btn btn-primary" id="downloadBothBtn">' +
        '<span>📦 Download Both PDFs</span>' +
        '</button>';
}

html += '</div>';
    
    completedContainer.innerHTML = html;
    completedContainer.style.display = 'block';
    
    // Add event listeners for download buttons
    var downloadContractBtn = document.getElementById('downloadContractBtn');
    if (downloadContractBtn) {
        downloadContractBtn.addEventListener('click', function(e) {
            e.preventDefault();
            self.generatePDF();
        });
    }
    
    var downloadBothBtn = document.getElementById('downloadBothBtn');
    if (downloadBothBtn) {
        downloadBothBtn.addEventListener('click', function(e) {
            e.preventDefault();
            self.generateCombinedPDF(sowData);
        });
    }
};
ContractFormHandler.prototype.showDualSigningCompleted = function(contractData, sowData) {
    var self = this;
    
    console.log('Showing dual signing completed view');
    
    // Store contract data for PDF generation
    this.currentContract = { id: contractData.id || 'pending', data: contractData };
    
    // Hide the tabs
    var tabsContainer = $('#clientSigningTabs');
    if (tabsContainer) {
        tabsContainer.style.display = 'none';
        tabsContainer.remove(); // Remove to prevent re-showing
    }
    
    // Hide contract form
    var contractForm = $('#contractForm');
    if (contractForm) contractForm.style.display = 'none';
    
    // Create completed view
    var modalContent = $('.modal-content');
    if (!modalContent) return;
    
    // Create completed container
    var completedContainer = document.createElement('div');
    completedContainer.id = 'dualSigningCompleted';
    completedContainer.className = 'dual-signing-completed';
    
     completedContainer.innerHTML = 
        '<div class="completion-header">' +
        '<div class="completion-icon">✅</div>' +
        '<h2>Documents Successfully Submitted!</h2>' +
        '<p>Both your Contract and Statement of Work have been signed and submitted.</p>' +
        '<p class="completion-note">The developer will review and countersign shortly. You can download the PDFs once both parties have signed.</p>' +
        '</div>' +
        
        '<div class="completed-documents">' +
        
        // Contract Summary
        '<div class="completed-doc-card">' +
        '<div class="doc-card-header">' +
        '<h3>📄 Contract Agreement</h3>' +
        '<span class="doc-status pending">⏳ Awaiting Developer Signature</span>' +
        '</div>' +
        '<div class="doc-card-body">' +
        '<div class="doc-field-row">' +
        '<span class="field-label">Client Name:</span>' +
        '<span class="field-value">' + (contractData.clientName || 'N/A') + '</span>' +
        '</div>' +
        '<div class="doc-field-row">' +
        '<span class="field-label">Signer Name:</span>' +
        '<span class="field-value">' + (contractData.clientSignerName || 'N/A') + '</span>' +
        '</div>' +
        '<div class="doc-field-row">' +
        '<span class="field-label">Date Signed:</span>' +
        '<span class="field-value">' + (contractData.clientDate || 'N/A') + '</span>' +
        '</div>' +
        '<div class="doc-field-row">' +
        '<span class="field-label">' + (contractData.clientEmail ? 'Email:' : 'Phone:') + '</span>' +
        '<span class="field-value">' + (contractData.clientEmail || (contractData.clientPhone ? formatPhoneNumber(contractData.clientPhone) : 'N/A')) + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="doc-signature-preview">' +
        '<p class="signature-label">Your Signature:</p>' +
        '<img src="' + contractData.clientSignature + '" alt="Your signature" class="signature-image" />' +
        '</div>' +
        '</div>' +
        
        // SOW Summary
        '<div class="completed-doc-card">' +
        '<div class="doc-card-header">' +
        '<h3>📋 Statement of Work</h3>' +
        '<span class="doc-status pending">⏳ Awaiting Developer Signature</span>' +
        '</div>' +
        '<div class="doc-card-body">' +
        '<div class="doc-field-row">' +
        '<span class="field-label">Client Name:</span>' +
        '<span class="field-value">' + (sowData.clientName || 'N/A') + '</span>' +
        '</div>' +
        '<div class="doc-field-row">' +
        '<span class="field-label">Package:</span>' +
        '<span class="field-value">' + (sowData.packageType || 'N/A') + '</span>' +
        '</div>' +
        '<div class="doc-field-row">' +
        '<span class="field-label">Total Cost:</span>' +
        '<span class="field-value">$' + (sowData.payment ? sowData.payment.total.toFixed(2) : '0.00') + '</span>' +
        '</div>' +
        '<div class="doc-field-row">' +
        '<span class="field-label">Timeline:</span>' +
        '<span class="field-value">' + (sowData.estimatedWeeks || 'TBD') + ' weeks</span>' +
        '</div>' +
        '<div class="doc-field-row">' +
        '<span class="field-label">Client Signed:</span>' +
        '<span class="field-value">' + (sowData.clientSignedDate || 'N/A') + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="doc-signature-preview">' +
        '<p class="signature-label">Your Signature:</p>' +
        '<img src="' + sowData.clientSignature + '" alt="Your SOW signature" class="signature-image" />' +
        '</div>' +
        '</div>' +

        '</div>' +

        '<div class="completion-actions">' +
'<p class="info-text">📧 A confirmation email has been sent to <strong>' + contractData.clientEmail + '</strong></p>' +
'</div>';

    // Insert completed view
    var modalHeader = $('.modal-header');
    if (modalHeader && modalHeader.nextSibling) {
        modalContent.insertBefore(completedContainer, modalHeader.nextSibling);
    } else {
        modalContent.appendChild(completedContainer);
    }
    
    // Show success alert
    alert('✓ Success!\n\nBoth your Contract and Statement of Work have been submitted.\n\nThe developer will review and sign shortly.');
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
                emailDisplay.textContent = user.email || user.phoneNumber || 'your account';
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

    // ============================================================
    // CALIFORNIA LAW COMPLIANT CONTRACT PDF GENERATION
    // ============================================================
    ContractFormHandler.prototype.generatePDF = function() {
        var self = this;
        var contractData = this.currentContract ? this.currentContract.data : null;
        var contractId = this.currentContract ? this.currentContract.id : null;

        if (!contractData) {
            alert('No contract data available to generate PDF');
            return;
        }

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
        var clientEmail = contractData.clientEmail || '';
        var clientPhone = contractData.clientPhone || '';
        var clientContact = clientEmail || (clientPhone ? formatPhoneNumber(clientPhone) : 'N/A');
        var clientContactLabel = clientEmail ? 'Email' : 'Phone';
        var devName = contractData.devName || 'Carlos Martin';
        var devEmail = contractData.devEmail || 'carlos@scarlo.dev';
        var clientSignature = contractData.clientSignature || '';
        var devSignature = contractData.devSignature || '';

        var htmlContent = '<!DOCTYPE html>' +
        '<html><head>' +
        '<title>Website Development Agreement - ' + clientName + '</title>' +
        '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.6; color: #000; background: #fff; padding: 0.75in 1in; }' +
        'h1 { font-size: 18pt; text-align: center; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }' +
        'h2 { font-size: 11pt; margin-top: 20px; margin-bottom: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #000; padding-bottom: 4px; }' +
        'h3 { font-size: 10.5pt; margin-top: 14px; margin-bottom: 6px; font-weight: bold; }' +
        'p { margin-bottom: 10px; text-align: justify; }' +
        'ul, ol { margin-left: 30px; margin-bottom: 10px; }' +
        'li { margin-bottom: 5px; }' +
        '.header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #000; }' +
        '.subtitle { font-size: 11pt; margin-top: 6px; font-style: italic; }' +
        '.parties { padding: 15px 20px; border: 1px solid #000; margin: 20px 0; }' +
        '.section { margin-bottom: 18px; page-break-inside: avoid; }' +
        '.caps-section { text-transform: uppercase; font-weight: bold; }' +
        '.highlight-box { padding: 15px 20px; margin: 15px 0; border: 1px solid #000; border-left: 4px solid #000; }' +
        '.signature-page { page-break-before: always; margin-top: 50px; }' +
        '.signature-block { display: inline-block; width: 45%; vertical-align: top; margin: 20px 2%; }' +
        '.signature-line { border-bottom: 1px solid #000; height: 70px; margin: 10px 0; display: flex; align-items: flex-end; justify-content: center; }' +
        '.signature-line img { max-height: 60px; max-width: 100%; filter: invert(1) grayscale(1); }' +
        '.signature-label { font-size: 9pt; margin-top: 5px; font-style: italic; }' +
        '.signature-name { font-weight: bold; margin-top: 10px; font-size: 10pt; }' +
        '.signature-date { margin-top: 5px; font-size: 10pt; }' +
        '.signature-email { font-size: 9pt; font-style: italic; }' +
        '.footer { margin-top: 50px; text-align: center; font-size: 9pt; border-top: 1px solid #000; padding-top: 20px; }' +
        '.contract-id { font-size: 8pt; margin-top: 10px; font-style: italic; }' +
        '.important { font-weight: bold; text-transform: uppercase; }' +
        '.indented { margin-left: 25px; }' +
        '@media print { body { padding: 0.5in 0.75in; } .signature-page { page-break-before: always; } }' +
        '@page { margin: 0.75in 1in; size: letter; }' +
        '</style>' +
        '</head><body>' +

        // HEADER
        '<div class="header">' +
        '<h1>Website Development Agreement</h1>' +
        '<div class="subtitle">Scarlo — Professional Web Development Services</div>' +
        '</div>' +

        // PARTIES
        '<div class="section">' +
        '<h2>1. Parties</h2>' +
        '<p>This Agreement is entered into as of <strong>' + clientDate + '</strong> between:</p>' +
        '<div class="parties">' +
        '<p><strong>Developer:</strong> Scarlo (Carlos Martin), Fresno County, California</p>' +
        '<p><strong>Client:</strong> ' + clientName + (clientEmail ? ' (' + clientEmail + ')' : '') + '</p>' +
        '</div>' +
        '</div>' +

        // SCOPE & SOW
        '<div class="section">' +
        '<h2>2. Scope of Work</h2>' +
        '<p>Developer agrees to design, develop, and deliver a custom website as detailed in the attached Statement of Work (SOW). The SOW specifies all features, deliverables, timeline, and pricing. Only items in the approved SOW are included; additional requests require a written Change Order with revised pricing.</p>' +
        '</div>' +

        // PAYMENT
        '<div class="section">' +
        '<h2>3. Payment Terms</h2>' +
        '<p><strong>Payment Schedule:</strong></p>' +
        '<ul>' +
        '<li><strong>50% Deposit</strong> — Due before work begins</li>' +
        '<li><strong>25% Milestone</strong> — Due upon design approval</li>' +
        '<li><strong>25% Final</strong> — Due before deployment</li>' +
        '</ul>' +
        '<p><strong>Cancellation Policy:</strong> If Client cancels, Developer retains: 15% (before design), 35% (during design), or full deposit (after development starts). These amounts reflect Developer\'s actual estimated damages per California Civil Code §1671.</p>' +
        '<p><strong>Late Payments:</strong> Payments over 7 days late incur 1.5% monthly interest. Developer may pause work if payment is 14+ days overdue.</p>' +
        '</div>' +

        // IP
        '<div class="section">' +
        '<h2>4. Intellectual Property</h2>' +
        '<p><strong>Upon full payment, Client receives:</strong> The final website design, custom graphics, and production build.</p>' +
        '<p><strong>Developer retains:</strong> Source code, backend architecture, reusable components, and development tools. Client receives a license to use these as part of the delivered website.</p>' +
        '<p><strong>Important:</strong> No IP rights transfer until full payment is received.</p>' +
        '</div>' +

        // REVISIONS & CHANGES
        '<div class="section">' +
        '<h2>5. Revisions & Changes</h2>' +
        '<p>Client receives <strong>2 revision rounds per milestone</strong>. Additional revisions or scope changes require a Change Order. Client must provide materials and feedback within 5 business days of request; delays extend the timeline accordingly.</p>' +
        '</div>' +

        // WARRANTY & LIABILITY
        '<div class="section">' +
        '<h2>6. Warranty & Liability</h2>' +
        '<p><strong>Warranty:</strong> Developer warrants the website will function as specified for 30 days after delivery. This excludes issues from Client modifications, third-party service changes, or hosting problems.</p>' +
        '<div class="highlight-box">' +
        '<p class="caps-section"><strong>WARRANTY DISCLAIMER:</strong> EXCEPT FOR THE EXPRESS 30-DAY WARRANTY ABOVE, ALL DELIVERABLES ARE PROVIDED "AS IS" WITHOUT ANY IMPLIED WARRANTIES, INCLUDING WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.</p>' +
        '<p class="caps-section" style="margin-top: 10px;"><strong>LIMITATION OF LIABILITY:</strong> DEVELOPER\'S TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY CLIENT. DEVELOPER IS NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR LOST PROFIT DAMAGES, EVEN IF ADVISED OF THEIR POSSIBILITY.</p>' +
        '</div>' +
        '</div>' +

        // INDEMNIFICATION
        '<div class="section">' +
        '<h2>7. Indemnification</h2>' +
        '<p><strong>Client indemnifies Developer</strong> from any claims, damages, or expenses (including attorneys\' fees) arising from: (a) content or materials provided by Client; (b) Client\'s use of deliverables in violation of law; or (c) infringement claims caused by Client-provided materials.</p>' +
        '<p><strong>Developer indemnifies Client</strong> from IP infringement claims for Developer\'s original work (excluding Client content and third-party materials), limited to fees paid under this Agreement.</p>' +
        '</div>' +

        // TERMINATION
        '<div class="section">' +
        '<h2>8. Termination</h2>' +
        '<p><strong>By Client:</strong> 14 days written notice; cancellation policy applies.</p>' +
        '<p><strong>By Developer:</strong> May terminate if Client fails to provide materials for 15+ days, is unresponsive for 30+ days, or engages in abusive behavior.</p>' +
        '<p><strong>For Cause:</strong> Either party may terminate for material breach not cured within 15 days of notice.</p>' +
        '</div>' +

        // DISPUTE RESOLUTION
        '<div class="section">' +
        '<h2>9. Dispute Resolution</h2>' +
        '<p><strong>Process:</strong> Parties shall first negotiate in good faith for 30 days. If unresolved, disputes shall be submitted to mediation in Fresno County, California. If mediation fails, either party may pursue litigation in Fresno County courts.</p>' +
        '<p><strong>Attorneys\' Fees:</strong> The prevailing party in any dispute shall recover reasonable attorneys\' fees and costs from the other party.</p>' +
        '</div>' +

        // GENERAL TERMS
        '<div class="section">' +
        '<h2>10. General Terms</h2>' +
        '<p><strong>Governing Law:</strong> This Agreement is governed by California law.</p>' +
        '<p><strong>Force Majeure:</strong> Neither party is liable for delays caused by circumstances beyond reasonable control (natural disasters, pandemic, internet outages, acts of government).</p>' +
        '<p><strong>Assignment:</strong> Client may not assign this Agreement without Developer\'s written consent. Developer may assign to a successor upon notice.</p>' +
        '<p><strong>Severability:</strong> If any provision is unenforceable, it shall be modified to the minimum extent necessary; remaining provisions continue in effect.</p>' +
        '<p><strong>Confidentiality:</strong> Both parties agree to keep confidential information private for 3 years after termination.</p>' +
        '<p><strong>Independent Contractor:</strong> Developer is not an employee of Client.</p>' +
        '<p><strong>Entire Agreement:</strong> This Agreement and the attached SOW constitute the complete agreement. Amendments require written consent from both parties. Electronic signatures are valid.</p>' +
        '</div>' +

        // SIGNATURE PAGE
        '<div class="signature-page">' +
        '<h2 style="text-align: center; border: none; margin-bottom: 20px;">Agreement & Signatures</h2>' +
        '<p style="text-align: center; margin-bottom: 30px;">By signing below, both parties agree to the terms of this Agreement and the attached Statement of Work.</p>' +

        '<div style="display: flex; justify-content: space-between; margin-top: 30px;">' +

        '<div class="signature-block">' +
        '<h3 style="font-size: 10pt;">DEVELOPER: Scarlo</h3>' +
        '<div class="signature-line">' +
        (devSignature ? '<img src="' + devSignature + '" alt="Developer Signature" />' : '<span style="font-style: italic;">Awaiting Signature</span>') +
        '</div>' +
        '<div class="signature-label">Authorized Signature</div>' +
        '<div class="signature-name">' + devName + '</div>' +
        '<div class="signature-date">Date: ' + devDate + '</div>' +
        '<div class="signature-email">Email: ' + devEmail + '</div>' +
        '</div>' +

        '<div class="signature-block">' +
        '<h3 style="font-size: 10pt;">CLIENT: ' + clientName + '</h3>' +
        '<div class="signature-line">' +
        (clientSignature ? '<img src="' + clientSignature + '" alt="Client Signature" />' : '<span style="font-style: italic;">Awaiting Signature</span>') +
        '</div>' +
        '<div class="signature-label">Authorized Signature</div>' +
        '<div class="signature-name">' + clientSignerName + '</div>' +
        '<div class="signature-date">Date: ' + clientDate + '</div>' +
        '<div class="signature-email">' + clientContactLabel + ': ' + clientContact + '</div>' +
        '</div>' +

        '</div>' +
        '</div>' +

        // FOOTER
        '<div class="footer">' +
        '<p><strong>© ' + new Date().getFullYear() + ' Scarlo — Carlos Martin</strong></p>' +
        '<p>Professional Web Development Services</p>' +
        '<p class="contract-id">Contract ID: ' + (contractId || 'DRAFT') + '</p>' +
        '<p class="contract-id">Generated: ' + new Date().toLocaleString() + '</p>' +
        '</div>' +

        '<script>' +
        'window.onload = function() { setTimeout(function() { window.print(); }, 500); };' +
        '</script>' +
        '</body></html>';

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    ContractFormHandler.prototype.generateCombinedPDF = function(sowData) {
    var self = this;
    var contractData = this.currentContract ? this.currentContract.data : null;
    
    if (!contractData) {
        alert('No contract data available');
        return;
    }
    
    if (!sowData) {
        alert('No SOW data available');
        return;
    }
    
    var printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        alert('Please allow popups to download the PDF');
        return;
    }
    
    // Contract data
    var clientDate = contractData.clientDate || 'N/A';
    var devDate = contractData.devDate || 'N/A';
    var clientName = contractData.clientName || 'N/A';
    var clientSignerName = contractData.clientSignerName || 'N/A';
    var clientEmail = contractData.clientEmail || '';
    var clientPhone = contractData.clientPhone || '';
    var clientContact = clientEmail || (clientPhone ? formatPhoneNumber(clientPhone) : 'N/A');
    var clientContactLabel = clientEmail ? 'Email' : 'Phone';
    var devName = contractData.devName || 'Carlos Martin';
    var devEmail = contractData.devEmail || 'N/A';
    var clientSignature = contractData.clientSignature || '';
    var devSignature = contractData.devSignature || '';
    
    // SOW data
    var packageNames = {
        'starter': 'Tier 1 — Starter',
        'professional': 'Tier 2 — Professional',
        'premium': 'Tier 3 — Premium',
        'elite': 'Tier 4 — Elite',
        'custom': 'Custom Quote'
    };
    
    var packageDetails = {
        'starter': {
            includes: ['1-page custom React/Next.js website', 'Clean, modern UI/UX', 'Mobile responsive', 'Light animations and transitions', 'Custom contact form', 'Simple analytics']
        },
        'professional': {
            includes: ['Fully custom UI/UX layout', 'Dynamic single-page application flow', 'Smooth animations', 'Firebase authentication', 'Performance optimization', 'SEO setup + analytics', 'Custom forms & logic', '4 rounds of revisions', '1 month of support included']
        },
        'premium': {
            includes: ['Everything in Professional', 'Firebase Authentication & Database', 'User Profiles (Auth. Limited Multi-User Login)', 'Custom booking systems and workflow logic', 'Custom dashboard components', 'Advanced UI animations', 'API integrations (CRMs, mailing lists, etc.)', 'Priority Support', '2 months of maintenance included']
        },
        'elite': {
            includes: ['Multi-page Next.js application', 'Full Firebase backend (Auth, Firestore, Storage)', 'User Profiles (Auth. Multi-User Login)', 'User roles, permissions, dashboards', 'Backend automation & API integrations', 'Full custom UI/UX', 'Scalable architecture', '3 months of premium maintenance included']
        }
    };
    
    var packageInfo = packageDetails[sowData.packageType] || { includes: [] };
    var totalPrice = sowData.payment ? sowData.payment.total : 0;
    var deposit = totalPrice * 0.50;
    var milestone1 = totalPrice * 0.25;
    var finalPayment = totalPrice * 0.25;
    
    var maintenanceDetails = {
        'none': { name: 'No Maintenance Plan', cost: '$0/month' },
        'basic': { name: 'Basic Maintenance', cost: '$100-$150/month', desc: 'Minor updates/tweaks/editing of the code' },
        'professional': { name: 'Professional Maintenance', cost: '$200-$350/month', desc: 'More labor intensive/semi-continuous code edits' },
        'premium': { name: 'Premium Maintenance', cost: '$500-$800/month', desc: 'Priority support, new components monthly, SEO optimization' }
    };
    
    var maintenanceInfo = maintenanceDetails[sowData.maintenancePlan || 'none'] || maintenanceDetails['none'];
    
    var htmlContent = '<!DOCTYPE html>' +
        '<html><head>' +
        '<title>Complete Agreement Package - ' + clientName + '</title>' +
        '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.6; color: #000; background: #fff; padding: 0.75in 1in; }' +
        'h1 { font-size: 18pt; text-align: center; margin-bottom: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }' +
        'h2 { font-size: 11pt; margin-top: 20px; margin-bottom: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #000; padding-bottom: 4px; }' +
        'h3 { font-size: 10.5pt; margin-top: 14px; margin-bottom: 6px; font-weight: bold; }' +
        'p { margin-bottom: 10px; text-align: justify; }' +
        'ul, ol { margin-left: 30px; margin-bottom: 10px; }' +
        'li { margin-bottom: 5px; }' +
        '.header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #000; }' +
        '.subtitle { font-size: 11pt; margin-top: 6px; font-style: italic; }' +
        '.parties { padding: 15px 20px; border: 1px solid #000; margin: 20px 0; }' +
        '.section { margin-bottom: 18px; page-break-inside: avoid; }' +
        '.signature-page { page-break-before: always; margin-top: 50px; }' +
        '.signature-block { display: inline-block; width: 45%; vertical-align: top; margin: 20px 2%; }' +
        '.signature-line { border-bottom: 1px solid #000; height: 70px; margin: 10px 0; display: flex; align-items: flex-end; justify-content: center; }' +
        '.signature-line img { max-height: 60px; max-width: 100%; filter: invert(1) grayscale(1); }' +
        '.signature-label { font-size: 9pt; margin-top: 5px; font-style: italic; }' +
        '.signature-name { font-weight: bold; margin-top: 10px; font-size: 10pt; }' +
        '.signature-date { margin-top: 5px; font-size: 10pt; }' +
        '.signature-email { font-size: 9pt; font-style: italic; }' +
        '.footer { margin-top: 50px; text-align: center; font-size: 9pt; border-top: 1px solid #000; padding-top: 20px; }' +
        '.contract-id { font-size: 8pt; margin-top: 10px; font-style: italic; }' +
        '.page-break { page-break-before: always; }' +
        '.info-box { padding: 15px 20px; border: 1px solid #000; border-left: 4px solid #000; margin: 20px 0; }' +
        '.info-box h3 { margin-top: 0; }' +
        '.payment-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt; }' +
        '.payment-table th, .payment-table td { border: 1px solid #000; padding: 10px 12px; text-align: left; }' +
        '.payment-table th { font-weight: bold; }' +
        '.total-row { font-weight: bold; font-size: 11pt; border-top: 2px solid #000; }' +
        '.highlight { font-weight: bold; }' +
        '@media print { body { padding: 0.5in 0.75in; } .signature-page, .page-break { page-break-before: always; } }' +
        '@page { margin: 0.75in 1in; size: letter; }' +
        '</style>' +
        '</head><body>' +

        // ==================== CONTRACT SECTION ====================
        '<div class="header">' +
        '<h1>Website Development Agreement</h1>' +
        '<div class="subtitle">Scarlo — Professional Web Development Services</div>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>PARTIES TO THE AGREEMENT</h2>' +
        '<p>This Website Development Agreement ("Agreement") is made effective as of <strong>' + clientDate + '</strong> (the "Effective Date") and is entered into by and between:</p>' +
        '<div class="parties">' +
        '<p><strong>Scarlo</strong>, a sole proprietorship owned and operated by Carlos Martin (the "Developer"),</p>' +
        '<p>and</p>' +
        '<p><strong>' + clientName + '</strong> (the "Client")</p>' +
        '<p style="font-size: 10pt; font-style: italic; margin-top: 10px;">The Developer and Client may be referred to individually as a "Party" and collectively as the "Parties."</p>' +
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
        
        // Contract Signatures
        '<div class="signature-page">' +
        '<h2 style="text-align: center; border: none;">CONTRACT SIGNATURES</h2>' +
        '<p style="text-align: center; margin-bottom: 30px;">By signing below, both parties acknowledge that they have read, understood, and agree to all terms and conditions outlined in this Agreement.</p>' +
        
        '<div style="display: flex; justify-content: space-between; margin-top: 40px;">' +
        
        '<div class="signature-block">' +
        '<h3>Developer — Scarlo</h3>' +
        '<div class="signature-line">' +
        (devSignature ? '<img src="' + devSignature + '" alt="Developer Signature" />' : '<span style="font-style: italic;">Pending</span>') +
        '</div>' +
        '<div class="signature-label">Signature</div>' +
        '<div class="signature-name">' + devName + '</div>' +
        '<div class="signature-date">Date: ' + devDate + '</div>' +
        '<div class="signature-email">' + devEmail + '</div>' +
        '</div>' +
        
        '<div class="signature-block">' +
        '<h3>Client — ' + clientName + '</h3>' +
        '<div class="signature-line">' +
        (clientSignature ? '<img src="' + clientSignature + '" alt="Client Signature" />' : '<span style="font-style: italic;">Pending</span>') +
        '</div>' +
        '<div class="signature-label">Signature</div>' +
        '<div class="signature-name">' + clientSignerName + '</div>' +
        '<div class="signature-date">Date: ' + clientDate + '</div>' +
        '<div class="signature-email">' + clientContactLabel + ': ' + clientContact + '</div>' +
        '</div>' +

        '</div>' +
        '</div>' +

        // ==================== SOW SECTION (NEW PAGE) ====================
        '<div class="page-break"></div>' +
        
        '<div class="header">' +
        '<h1>STATEMENT OF WORK</h1>' +
        '<div class="subtitle">Scarlo — Professional Web Development</div>' +
        '<div style="font-size: 10pt; font-style: italic; margin-top: 10px;">Generated: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '</div>' +
        '</div>' +
        
        '<div class="info-box">' +
        '<h3>Client Information</h3>' +
        '<p><strong>Client Name:</strong> ' + (sowData.clientName || clientName) + '</p>' +
        '<p><strong>Contact:</strong> ' + (sowData.clientEmail || sowData.clientPhone || clientEmail || 'N/A') + '</p>' +
        '<p><strong>Package:</strong> ' + (packageNames[sowData.packageType] || sowData.packageType) + ' <span class="highlight">$' + totalPrice.toFixed(2) + '</span></p>' +
        '<p><strong>Estimated Timeline:</strong> ' + (sowData.estimatedWeeks || 'TBD') + ' weeks' + (sowData.startDate ? ' (Starting ' + new Date(sowData.startDate).toLocaleDateString() + ')' : '') + '</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>Package Includes</h2>' +
        '<ul>';
    
    if (packageInfo.includes && packageInfo.includes.length > 0) {
        packageInfo.includes.forEach(function(item) {
            htmlContent += '<li>' + item + '</li>';
        });
    }
    
    htmlContent += '</ul></div>';
    
    // Additional Features
    if (sowData.features && sowData.features.length > 0) {
        htmlContent += '<div class="section">' +
            '<h2>Additional Features & Deliverables</h2>' +
            '<ul>';
        sowData.features.forEach(function(feature) {
            htmlContent += '<li>' + feature + '</li>';
        });
        htmlContent += '</ul></div>';
    }
    
    // Special Requirements
    if (sowData.notes) {
        htmlContent += '<div class="section">' +
            '<h2>Special Requirements</h2>' +
            '<p>' + sowData.notes + '</p>' +
            '</div>';
    }
    
    // Payment Structure
    htmlContent += '<div class="section">' +
        '<h2>Payment Structure</h2>' +
        '<table class="payment-table">' +
        '<thead><tr><th>Payment Milestone</th><th>Description</th><th>Amount</th></tr></thead>' +
        '<tbody>' +
        '<tr><td><strong>Initial Deposit</strong></td><td>Due before work begins (50%)</td><td><strong>$' + deposit.toFixed(2) + '</strong></td></tr>' +
        '<tr><td><strong>Milestone 1</strong></td><td>UI/UX Design Approval (25%)</td><td><strong>$' + milestone1.toFixed(2) + '</strong></td></tr>' +
        '<tr><td><strong>Final Payment</strong></td><td>Prior to deployment (25%)</td><td><strong>$' + finalPayment.toFixed(2) + '</strong></td></tr>' +
        '<tr class="total-row"><td colspan="2">Total Project Cost</td><td>$' + totalPrice.toFixed(2) + '</td></tr>' +
        '</tbody></table>' +
        '</div>';
    
    // Maintenance
    if (sowData.maintenancePlan && sowData.maintenancePlan !== 'none') {
        htmlContent += '<div class="section">' +
            '<h2>Ongoing Maintenance</h2>' +
            '<div class="info-box">' +
            '<h3>' + maintenanceInfo.name + ' — ' + maintenanceInfo.cost + '</h3>' +
            '<p>' + (maintenanceInfo.desc || '') + '</p>' +
            '</div>' +
            '</div>';
    }
    
    // Terms
    htmlContent += '<div class="section">' +
        '<h2>Terms & Conditions</h2>' +
        '<p>This Statement of Work is subject to the terms outlined in the Website Development Agreement between Scarlo and <strong>' + clientName + '</strong>. All work will be performed using modern technologies including React, Next.js, Firebase, and associated development tools in accordance with industry best practices.</p>' +
        '<p>The project timeline is an estimate and may be adjusted based on client feedback, content delivery, and scope changes. Any requests beyond the defined scope require a signed Change Order.</p>' +
        '</div>';
    
    // SOW Signatures
    htmlContent += '<div class="signature-page">' +
        '<h2 style="text-align: center; border: none;">SOW SIGNATURES</h2>' +
        '<p style="text-align: center; margin-bottom: 30px;">By signing below, both parties acknowledge agreement to the scope, timeline, and payment terms outlined in this Statement of Work.</p>' +
        
        '<div style="display: flex; justify-content: space-between; margin-top: 40px;">' +
        
        '<div class="signature-block">' +
        '<h3>Developer — Scarlo</h3>' +
        '<div class="signature-line">' +
        (sowData.devSignature ? '<img src="' + sowData.devSignature + '" alt="Developer Signature" />' : '<span style="font-style: italic;">Pending</span>') +
        '</div>' +
        '<div class="signature-label">Signature</div>' +
        '<div class="signature-name">' + (sowData.devSignerName || 'Carlos Martin') + '</div>' +
        '<div class="signature-date">Date: ' + (sowData.devSignedDate || 'N/A') + '</div>' +
        '</div>' +
        
        '<div class="signature-block">' +
        '<h3>Client — ' + clientName + '</h3>' +
        '<div class="signature-line">' +
        (sowData.clientSignature ? '<img src="' + sowData.clientSignature + '" alt="Client Signature" />' : '<span style="font-style: italic;">Pending</span>') +
        '</div>' +
        '<div class="signature-label">Signature</div>' +
        '<div class="signature-name">' + (sowData.clientSignerName || clientName) + '</div>' +
        '<div class="signature-date">Date: ' + (sowData.clientSignedDate || 'N/A') + '</div>' +
        '</div>' +
        
        '</div>' +
        '</div>' +
        
        // Footer
        '<div class="footer">' +
        '<p><strong>© ' + new Date().getFullYear() + ' Scarlo</strong> — Crafted with precision</p>' +
        '<p style="margin-top: 8px;">Carlos Martin | Professional Web Development</p>' +
        '<p class="contract-id">Contract ID: ' + (self.currentContract ? self.currentContract.id : 'N/A') + ' | SOW ID: ' + sowData.id + '</p>' +
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

  // === ULTRA-RESPONSIVE CUSTOM CURSOR (FIXED) ===
var CustomCursor = function() {
    if (!DeviceDetector.isLaptopOrLarger()) {
        console.log('Custom cursor disabled - screen too small');
        return;
    }

    console.log('Custom cursor enabled - OPTIMIZED & FIXED');

    // Create cursor element with GPU-accelerated styles
    this.cursor = document.createElement('div');
    this.cursor.className = 'custom-cursor';
    this.cursor.style.cssText = 'position:fixed;' +
        'left:0;top:0;' +
        'width:10px;height:10px;' +
        'background:rgba(255,255,255,0.9);' +
        'border-radius:50%;' +
        'pointer-events:none;' +
        'z-index:99999;' +
        'opacity:0;' +
        'mix-blend-mode:difference;' +
        'transition:width 0.2s cubic-bezier(0.4,0,0.2,1),height 0.2s cubic-bezier(0.4,0,0.2,1),opacity 0.15s ease-out;' +
        'will-change:transform;' +
        'backface-visibility:hidden;' +
        'transform:translate3d(0,0,0);';
    
    document.body.appendChild(this.cursor);

    // Position tracking
    this.position = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.currentSize = 10; // Track current cursor size
    this.isVisible = false;
    this.isHovering = false;
    this.isAnimating = false;
    
    // Performance optimization
    this.hoverCheckFrame = 0;
    this.interactiveSelectors = 'a, button, input, textarea, select, canvas, .clear-btn, .modal-close, .auth-close, .nav-link, .btn, .hamburger, .item, .item__image, .enlarge';

    this.init();
    this.handleResize();
};

CustomCursor.prototype.init = function() {
    var self = this;
    
    // Inject cursor disable/enable styles with fallback
    var style = document.createElement('style');
    style.id = 'custom-cursor-style';
    style.textContent =
        '@media (min-width: 1024px) {' +
        '  body:not(.modal-open):not(.custom-cursor-hidden) * { cursor: none !important; }' +
        '  body.modal-open, body.modal-open * { cursor: auto !important; }' +
        '  body.modal-open .signature-pad { cursor: crosshair !important; }' +
        '  body.custom-cursor-hidden, body.custom-cursor-hidden * { cursor: auto !important; }' +
        '}';
    document.head.appendChild(style);

    var wasModalOpen = false;

    // Use pointermove for better performance than mousemove
    document.addEventListener('pointermove', function(e) {
        var isModalOpen = document.body.classList.contains('modal-open');
        
        // Check if modal just closed
        if (wasModalOpen && !isModalOpen) {
            self.isVisible = true;
            self.cursor.style.opacity = '1';
            document.body.classList.remove('custom-cursor-hidden');
        }

        wasModalOpen = isModalOpen;

        // Hide cursor when modal is open and show regular cursor
        if (isModalOpen) {
            self.cursor.style.opacity = '0';
            self.isAnimating = false;
            document.body.classList.add('custom-cursor-hidden');
            return;
        }
        
        // ⚡ INSTANT UPDATE - Set target position immediately
        self.target.x = e.clientX;
        self.target.y = e.clientY;
        
        // On first move, position cursor directly (no lerp lag)
        if (!self.isVisible) {
            self.position.x = e.clientX;
            self.position.y = e.clientY;
            self.updateCursorPosition();
            self.isVisible = true;
            self.cursor.style.opacity = '1';
        }
        
        // Start animation loop if not running
        if (!self.isAnimating) {
            self.isAnimating = true;
            self.animate();
        }
        
        // 🎯 OPTIMIZED HOVER CHECK - Every 4th frame (~67ms at 60fps)
        self.hoverCheckFrame++;
        if (self.hoverCheckFrame % 4 === 0) {
            var element = document.elementFromPoint(e.clientX, e.clientY);
            self.checkHoverState(element);
        }
    }, { passive: true });

    document.addEventListener('pointerleave', function() {
        self.isVisible = false;
        self.isAnimating = false;
        self.cursor.style.opacity = '0';
        // Show regular cursor when custom cursor is hidden
        document.body.classList.add('custom-cursor-hidden');
    });

    document.addEventListener('pointerenter', function() {
        // Hide regular cursor when custom cursor is visible
        document.body.classList.remove('custom-cursor-hidden');
    });
};

CustomCursor.prototype.handleResize = function() {
    var self = this;
    window.addEventListener('resize', throttle(function() {
        if (!DeviceDetector.isLaptopOrLarger()) {
            if (self.cursor) {
                self.cursor.style.display = 'none';
                self.isAnimating = false;
            }
        } else {
            if (self.cursor) {
                self.cursor.style.display = 'block';
            }
        }
    }, 250));
};

CustomCursor.prototype.checkHoverState = function(element) {
    if (!element || document.body.classList.contains('modal-open')) return;
    
    // 🚀 OPTIMIZED: Use native closest() for fast parent traversal
    var isInteractive = !!element.closest(this.interactiveSelectors);
    
    // Only update if state actually changed
    if (isInteractive !== this.isHovering) {
        this.isHovering = isInteractive;
        
        if (isInteractive) {
            this.cursor.style.width = '40px';
            this.cursor.style.height = '40px';
            this.currentSize = 40; // Update current size
        } else {
            this.cursor.style.width = '10px';
            this.cursor.style.height = '10px';
            this.currentSize = 10; // Update current size
        }
        
        // Immediately update position with new offset
        this.updateCursorPosition();
    }
};

// 🎨 GPU-ACCELERATED POSITION UPDATE - NOW CENTERS PROPERLY
CustomCursor.prototype.updateCursorPosition = function() {
    // Calculate offset based on current size to keep cursor centered
    var offset = this.currentSize / 2;
    
    // Use translate3d for hardware acceleration
    this.cursor.style.transform = 'translate3d(' + 
        (this.position.x - offset) + 'px, ' + 
        (this.position.y - offset) + 'px, 0)';
};

CustomCursor.prototype.animate = function() {
    if (!this.isAnimating) return;
    
    var self = this;
    
    // ⚡ ULTRA-FAST LERP - 0.4 factor for instant response
    var lerpFactor = 0.4;
    var snapThreshold = 0.3;  // Stop animating if within 0.3px for faster snapping
    
    // Calculate distance to target
    var dx = this.target.x - this.position.x;
    var dy = this.target.y - this.position.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    
    // If very close, snap to target and stop animation loop
    if (distance < snapThreshold) {
        this.position.x = this.target.x;
        this.position.y = this.target.y;
        this.updateCursorPosition();
        this.isAnimating = false;  // 🔋 SAVE CPU
        return;
    }
    
    // Smooth interpolation with fast factor
    this.position.x += dx * lerpFactor;
    this.position.y += dy * lerpFactor;
    
    // Update position using GPU transform
    this.updateCursorPosition();

    // Continue animation loop
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
// === SECTION SEPARATOR GLOW ON SCROLL - FIXED ===
var SectionSeparatorGlow = function() {
    console.log('Initializing Section Separator Glow...');
    
    var sections = $$('section');
    if (!sections || sections.length === 0) return;
    
    var isMobile = window.innerWidth <= 1024;
    var minScrollToActivate = isMobile ? 20 : 50;
    
    var checkSectionVisibility = function() {
        var viewportHeight = window.innerHeight;
        
        sections.forEach(function(section) {
            // Skip if already visible or is footer
            if (section.classList.contains('separator-visible')) return;
            if (section.classList.contains('footer')) return;
            
            var rect = section.getBoundingClientRect();
            
            // The separator is at the BOTTOM of the section
            // Only trigger when the bottom of the section enters the viewport
            // rect.bottom tells us where the section ends relative to viewport top
            
            // Trigger when section bottom is in the lower 70% of viewport
            var bottomVisible = rect.bottom > 0 && rect.bottom < viewportHeight * 0.85;
            
            if (bottomVisible) {
                section.classList.add('separator-visible');
                console.log('Section separator triggered:', section.id || section.className);
            }
        });
    };
    
    // Throttled scroll handler
    var ticking = false;
    window.addEventListener('scroll', function() {
        // Must scroll minimum amount before any activation
        if (window.pageYOffset < minScrollToActivate) return;
        
        if (!ticking) {
            requestAnimationFrame(function() {
                checkSectionVisibility();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
};
    // === INITIALIZATION ===
    var init = function() {
    console.log('Scarlo - Crafted with precision');
    console.log('Device: ' + (DeviceDetector.isMobile() ? 'Mobile' : 'Desktop'));
    console.log('Screen width:', window.innerWidth);
    new HelpRequestHandler();

    new Navigation();
    new RotatingText();
    new ScrollAnimations();
    new PortfolioHandler();
    new FormHandler();
    new FirebaseAuthHandler();
    window.contractFormHandler = new ContractFormHandler();
    new PageLoader();
    new CustomCursor();
    new ViewportFix();
    new AccessibilityEnhancer();
    new SectionSeparatorGlow();  // ✅ ADD THIS LINE
};

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
// Auto-resize textarea
const messageTextarea = document.getElementById('message');
if (messageTextarea) {
    messageTextarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 400) + 'px';
    });
    
    // Also trigger on page load in case there's pre-filled content
    messageTextarea.style.height = 'auto';
    messageTextarea.style.height = Math.min(messageTextarea.scrollHeight, 400) + 'px';
}
