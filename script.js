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
                var emailField = $('#helpEmail');
                if (emailField && self.helpModal.classList.contains('show')) {
                    emailField.value = user.email;
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
        
        var emailField = $('#helpEmail');
        if (emailField && this.currentUser) {
            emailField.value = this.currentUser.email;
            emailField.setAttribute('readonly', 'readonly');
            emailField.style.opacity = '0.7';
        } else if (emailField) {
            emailField.removeAttribute('readonly');
            emailField.style.opacity = '1';
            emailField.placeholder = 'your@email.com';
        }
    }
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
    
    var helpEmail = $('#helpEmail').value.trim();
    var helpIssue = $('#helpIssue').value;
    var helpDetails = $('#helpDetails').value.trim();
    
    if (!helpEmail || !helpIssue || !helpDetails) {
        alert('Please fill in all required fields');
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = originalText;
        return;
    }
    
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(helpEmail)) {
        alert('Please enter a valid email address');
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = originalText;
        return;
    }
    
    var helpRequestData = {
        userEmail: helpEmail,
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
                self.currentUserEmail = user.email.trim().toLowerCase();
                self.isDeveloper = self.currentUserEmail === self.DEVELOPER_EMAIL;
                
               
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
                '<h4>' + (request.userEmail || 'Unknown User') + '</h4>' +
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
            snapshot.forEach(function(doc) {
                var data = doc.data();
                data.id = doc.id;
                sows.push(data);
            });
            
            self.renderSOWTab(sows);
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
        '<h3>📋 Statement of Work Documents</h3>' +
        '<button class="btn-create-sow" onclick="window.contractFormHandler.showSOWCreator()">' +
        '<span class="btn-icon">+</span> Create New SOW' +
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
                '</div>' +
                '</div>' +
                
                '<div class="sow-item-details">' +
                '<div class="sow-detail-row">' +
                '<span class="detail-label">📧 Email:</span>' +
                '<span class="detail-value">' + (sow.clientEmail || 'N/A') + '</span>' +
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
                
                '<div class="sow-item-actions">' +
// Sign button (if not fully signed)
((!sow.clientSignature || !sow.devSignature) ? 
    '<button class="btn-sign-sow" onclick="window.contractFormHandler.showSOWSigningModal(\'' + sow.id + '\')" title="Sign SOW">' +
    '<span>✍️ Sign</span>' +
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
        '<div class="sow-form-section">' +
        '<h5><span class="section-icon">👤</span> Client Information</h5>' +
        '<div class="sow-input-group">' +
        '<input type="text" id="sowClientName" placeholder="Client Name *" class="sow-input" required />' +
        '<input type="email" id="sowClientEmail" placeholder="Client Email *" class="sow-input" required />' +
        '</div>' +
        '</div>' +
        
        // Package Selection
        '<div class="sow-form-section">' +
        '<h5><span class="section-icon">📦</span> Package Tier</h5>' +
        '<select id="sowPackage" class="sow-select">' +
        '<option value="">Select a package tier...</option>' +
        '<option value="starter">Tier 1 — Starter ($1,800 - $2,500)</option>' +
        '<option value="professional">Tier 2 — Professional ($3,500 - $6,000)</option>' +
        '<option value="premium">Tier 3 — Premium ($6,000 - $10,000)</option>' +
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
        '<input type="date" id="sowStartDate" class="sow-input" />' +
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
        '<label class="sow-checkbox"><input type="checkbox" value="firebase_auth" /> Firebase Authentication</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="firebase_db" /> Firebase Database (Firestore)</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="user_profiles" /> User Profiles & Dashboards</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="user_roles" /> User Roles & Permissions</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="file_storage" /> Firebase Storage (File Uploads)</label>' +
        '</div>' +
        
        // Advanced Features
        '<div class="feature-group">' +
        '<p class="feature-group-title">Advanced Features</p>' +
        '<label class="sow-checkbox"><input type="checkbox" value="ecommerce" /> E-Commerce Functionality</label>' +
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
        '<label class="sow-checkbox"><input type="checkbox" value="email_integration" /> Email Integration (SendGrid, etc.)</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="notifications" /> Push Notifications</label>' +
        '</div>' +
        
        // Deployment & Security
        '<div class="feature-group">' +
        '<p class="feature-group-title">Deployment & Security</p>' +
        '<label class="sow-checkbox"><input type="checkbox" value="hosting" /> Hosting Setup & Deployment</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="ssl" /> SSL Certificate & Security</label>' +
        '<label class="sow-checkbox"><input type="checkbox" value="domain" /> Custom Domain Configuration</label>' +
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
        '<select id="sowMaintenance" class="sow-select">' +
        '<option value="none">No Maintenance Plan</option>' +
        '<option value="basic">Basic — $100-$150/month (Minor updates/tweaks)</option>' +
        '<option value="professional">Professional — $200-$350/month (Semi-continuous code edits)</option>' +
        '<option value="premium">Premium — $500-$800/month (Priority support, monthly components, SEO)</option>' +
        '</select>' +
        '</div>' +
        
        // Pricing Summary
        '<div class="sow-form-section pricing-summary">' +
        '<h5><span class="section-icon">💰</span> Pricing Summary</h5>' +
        '<div class="pricing-breakdown">' +
        '<div class="pricing-row">' +
        '<span>Project Total:</span>' +
        '<span id="sowTotalPrice" class="price-value">$0.00</span>' +
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
        '<div class="pricing-row maintenance-row" id="maintenanceRow" style="display: none;">' +
        '<span>Monthly Maintenance:</span>' +
        '<span id="sowMaintenanceCalc" class="price-value">$0/month</span>' +
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
    
    // Package pricing map
    var packagePricing = {
        'starter': { min: 1800, max: 2500, default: 2150 },
        'professional': { min: 3500, max: 6000, default: 4750 },
        'premium': { min: 6000, max: 10000, default: 8000 },
        'elite': { min: 10000, max: 20000, default: 15000 }
    };
    
    var maintenancePricing = {
        'none': 0,
        'basic': 125,
        'professional': 275,
        'premium': 650
    };
    
    // Update pricing when package changes
    var packageSelect = $('#sowPackage');
    var customPricingSection = $('#customPricingSection');
    var customPriceInput = $('#sowCustomPrice');
    
    if (packageSelect) {
        packageSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customPricingSection.style.display = 'block';
            } else {
                customPricingSection.style.display = 'none';
                self.updateSOWPricing(packagePricing, maintenancePricing);
            }
        });
    }
    
    // Update pricing when custom price changes
    if (customPriceInput) {
        customPriceInput.addEventListener('input', function() {
            self.updateSOWPricing(packagePricing, maintenancePricing);
        });
    }
    
    // Update maintenance pricing
    var maintenanceSelect = $('#sowMaintenance');
    if (maintenanceSelect) {
        maintenanceSelect.addEventListener('change', function() {
            self.updateSOWPricing(packagePricing, maintenancePricing);
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

// New function to update pricing calculations
ContractFormHandler.prototype.updateSOWPricing = function(packagePricing, maintenancePricing) {
    var packageSelect = $('#sowPackage');
    var customPriceInput = $('#sowCustomPrice');
    var maintenanceSelect = $('#sowMaintenance');
    
    var totalPrice = 0;
    
    if (packageSelect.value === 'custom') {
        totalPrice = parseFloat(customPriceInput.value) || 0;
    } else if (packageSelect.value && packagePricing[packageSelect.value]) {
        totalPrice = packagePricing[packageSelect.value].default;
    }
    
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
    
    if (maintenanceSelect.value !== 'none') {
        if (maintenanceRow) maintenanceRow.style.display = 'flex';
        if (maintenanceEl) maintenanceEl.textContent = '$' + maintenanceCost + '/month';
    } else {
        if (maintenanceRow) maintenanceRow.style.display = 'none';
    }
};

ContractFormHandler.prototype.saveSOW = function() {
    var clientName = $('#sowClientName').value.trim();
    var clientEmail = $('#sowClientEmail').value.trim();
    var packageType = $('#sowPackage').value;
    var weeks = $('#sowWeeks').value;
    var startDate = $('#sowStartDate').value;
    var notes = $('#sowNotes').value.trim();
    var maintenancePlan = $('#sowMaintenance').value;
    
    if (!clientName || !clientEmail || !packageType || !weeks) {
        alert('Please fill in all required fields:\n- Client Name\n- Client Email\n- Package Tier\n- Estimated Weeks');
        return;
    }
    
    // Get selected features
    var features = [];
    $$('.sow-checkboxes input[type="checkbox"]:checked').forEach(function(checkbox) {
        var label = checkbox.parentElement.textContent.trim();
        features.push(label);
    });
    
    // Calculate pricing
    var packagePricing = {
        'starter': { min: 1800, max: 2500, default: 2150 },
        'professional': { min: 3500, max: 6000, default: 4750 },
        'premium': { min: 6000, max: 10000, default: 8000 },
        'elite': { min: 10000, max: 20000, default: 15000 }
    };
    
    var totalPrice = 0;
    if (packageType === 'custom') {
        totalPrice = parseFloat($('#sowCustomPrice').value) || 0;
    } else if (packagePricing[packageType]) {
        totalPrice = packagePricing[packageType].default;
    }
    
    var sowData = {
        clientName: clientName,
        clientEmail: clientEmail,
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
            final: totalPrice * 0.25
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
    var isDeveloper = currentUser.email.toLowerCase() === this.DEVELOPER_EMAIL;
    var isClient = currentUser.email.toLowerCase() === sowData.clientEmail.toLowerCase();
    
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
        
        '<div class="contract-form" style="padding: 2rem 3rem;">' +
        
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
        '<h3>Developer Signature — VistaFly</h3>';
    
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

ContractFormHandler.prototype.generateSOWPDF = function(sowData) {
    // If sowData is provided, use it; otherwise read from form
    var clientName, clientEmail, packageType, weeks, startDate, notes, maintenancePlan;
    
    if (sowData) {
        // Using saved data
        clientName = sowData.clientName || '';
        clientEmail = sowData.clientEmail || '';
        packageType = sowData.packageType || '';
        weeks = sowData.estimatedWeeks || '';
        startDate = sowData.startDate || '';
        notes = sowData.notes || '';
        maintenancePlan = sowData.maintenancePlan || 'none';
    } else {
        // Reading from form
        var clientNameField = $('#sowClientName');
        var clientEmailField = $('#sowClientEmail');
        var packageField = $('#sowPackage');
        var weeksField = $('#sowWeeks');
        var startDateField = $('#sowStartDate');
        var notesField = $('#sowNotes');
        var maintenanceField = $('#sowMaintenance');
        
        if (!clientNameField || !packageField) {
            alert('Please fill in at least Client Name and Package Tier to generate PDF');
            return;
        }
        
        clientName = clientNameField.value.trim();
        clientEmail = clientEmailField ? clientEmailField.value.trim() : '';
        packageType = packageField.value;
        weeks = weeksField ? weeksField.value : '';
        startDate = startDateField ? startDateField.value : '';
        notes = notesField ? notesField.value.trim() : '';
        maintenancePlan = maintenanceField ? maintenanceField.value : 'none';
    }
    
    if (!clientName || !packageType) {
        alert('Client Name and Package Tier are required to generate PDF');
        return;
    }
    
    // Get package details
    var packageDetails = {
        'starter': {
            name: 'Tier 1 — Starter',
            range: '$1,800 - $2,500',
            includes: [
                '1-page custom React/Next.js website',
                'Clean, modern UI/UX',
                'Mobile responsive',
                'Light animations and transitions',
                'Custom contact form',
                'Simple analytics'
            ]
        },
        'professional': {
            name: 'Tier 2 — Professional',
            range: '$3,500 - $6,000',
            includes: [
                'Fully custom UI/UX layout',
                'Dynamic single-page application flow',
                'Smooth animations',
                'Firebase authentication',
                'Performance optimization',
                'SEO setup + analytics',
                'Custom forms & logic',
                '4 rounds of revisions',
                '1 month of support included'
            ]
        },
        'premium': {
            name: 'Tier 3 — Premium',
            range: '$6,000 - $10,000',
            includes: [
                'Everything in Professional',
                'Firebase Authentication & Database',
                'User Profiles (Auth. Limited Multi-User Login)',
                'Custom booking systems and workflow logic',
                'Custom dashboard components',
                'Advanced UI animations',
                'API integrations (CRMs, mailing lists, etc.)',
                'Priority Support',
                '2 months of maintenance included'
            ]
        },
        'elite': {
            name: 'Tier 4 — Elite Web Application',
            range: '$10,000 - $20,000+',
            includes: [
                'Multi-page Next.js application',
                'Full Firebase backend (Auth, Firestore, Storage)',
                'User Profiles (Auth. Multi-User Login)',
                'User roles, permissions, dashboards',
                'Backend automation & API integrations',
                'Full custom UI/UX',
                'Scalable architecture',
                '3 months of premium maintenance included'
            ]
        }
    };
    
    var maintenanceDetails = {
        'none': { name: 'No Maintenance Plan', cost: '$0/month' },
        'basic': { name: 'Basic Maintenance', cost: '$100-$150/month', desc: 'Minor updates/tweaks/editing of the code' },
        'professional': { name: 'Professional Maintenance', cost: '$200-$350/month', desc: 'More labor intensive/semi-continuous code edits' },
        'premium': { name: 'Premium Maintenance', cost: '$500-$800/month', desc: 'Priority support, new components monthly, SEO optimization' }
    };
    
    // Calculate pricing
    var packagePricing = {
        'starter': { min: 1800, max: 2500, default: 2150 },
        'professional': { min: 3500, max: 6000, default: 4750 },
        'premium': { min: 6000, max: 10000, default: 8000 },
        'elite': { min: 10000, max: 20000, default: 15000 }
    };
    
    var totalPrice = 0;
    if (packageType === 'custom') {
        if (sowData && sowData.payment) {
            totalPrice = sowData.payment.total || 0;
        } else {
            var customPriceField = $('#sowCustomPrice');
            totalPrice = customPriceField ? parseFloat(customPriceField.value) || 0 : 0;
        }
    } else if (packagePricing[packageType]) {
        totalPrice = packagePricing[packageType].default;
    }
    
    var deposit = totalPrice * 0.50;
    var milestone1 = totalPrice * 0.25;
    var finalPayment = totalPrice * 0.25;
    
    // Get selected features
    var selectedFeatures = [];
    if (sowData && sowData.features) {
        selectedFeatures = sowData.features;
    } else {
        $$('.sow-checkboxes input[type="checkbox"]:checked').forEach(function(checkbox) {
            var label = checkbox.parentElement.textContent.trim();
            selectedFeatures.push(label);
        });
    }
    
    var packageInfo = packageDetails[packageType] || { name: 'Custom Package', range: 'Custom Quote', includes: [] };
    var maintenanceInfo = maintenanceDetails[maintenancePlan] || maintenanceDetails['none'];
    
    // Open new window for PDF
    var printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        alert('Please allow popups to download the PDF');
        return;
    }
    
    var packageIncludesList = packageInfo.includes.length > 0 
        ? '<ul>' + packageInfo.includes.map(function(item) { return '<li>' + item + '</li>'; }).join('') + '</ul>'
        : '<p><em>See selected features below</em></p>';
    
    var selectedFeaturesList = selectedFeatures.length > 0 
        ? '<ul>' + selectedFeatures.map(function(f) { return '<li>' + f + '</li>'; }).join('') + '</ul>'
        : '<p><em>No additional features selected</em></p>';
    
    var htmlContent = '<!DOCTYPE html>' +
        '<html><head>' +
        '<title>Statement of Work - ' + clientName + '</title>' +
        '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.6; color: #000; background: #fff; padding: 0.75in; }' +
        'h1 { font-size: 22pt; text-align: center; margin-bottom: 10px; font-weight: bold; color: #1f2937; }' +
        'h2 { font-size: 16pt; margin-top: 25px; margin-bottom: 12px; font-weight: bold; color: #374151; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }' +
        'h3 { font-size: 14pt; margin-top: 15px; margin-bottom: 8px; font-weight: bold; color: #4b5563; }' +
        'p { margin-bottom: 10px; text-align: justify; }' +
        'ul { margin-left: 25px; margin-bottom: 15px; }' +
        'li { margin-bottom: 6px; }' +
        '.header { text-align: center; margin-bottom: 35px; border-bottom: 3px solid #6366f1; padding-bottom: 20px; }' +
        '.subtitle { font-size: 14pt; color: #6b7280; margin-top: 8px; font-weight: 600; }' +
        '.meta-info { font-size: 11pt; color: #9ca3af; margin-top: 10px; }' +
        '.info-box { background: #f9fafb; padding: 18px; border-left: 4px solid #6366f1; margin: 20px 0; border-radius: 4px; }' +
        '.info-box h3 { margin-top: 0; color: #6366f1; }' +
        '.payment-table { width: 100%; border-collapse: collapse; margin: 15px 0; }' +
        '.payment-table th, .payment-table td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }' +
        '.payment-table th { background: #f3f4f6; font-weight: bold; color: #374151; }' +
        '.total-row { background: #6366f1; color: white; font-weight: bold; font-size: 14pt; }' +
        '.section { margin-bottom: 25px; }' +
        '.footer { margin-top: 50px; text-align: center; font-size: 10pt; color: #6b7280; border-top: 2px solid #e5e7eb; padding-top: 20px; }' +
        '.highlight { background: #fef3c7; padding: 2px 6px; border-radius: 3px; }' +
        '@page { margin: 0.75in; }' +
        '</style>' +
        '</head><body>' +
        
        '<div class="header">' +
        '<h1>STATEMENT OF WORK</h1>' +
        '<div class="subtitle">VistaFly — Professional Web Development</div>' +
        '<div class="meta-info">Generated: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '</div>' +
        '</div>' +
        
        '<div class="info-box">' +
        '<h3>Client Information</h3>' +
        '<p><strong>Client Name:</strong> ' + clientName + '</p>' +
        '<p><strong>Email:</strong> ' + clientEmail + '</p>' +
        '<p><strong>Package:</strong> ' + packageInfo.name + ' <span class="highlight">' + packageInfo.range + '</span></p>' +
        '<p><strong>Estimated Timeline:</strong> ' + (weeks || 'TBD') + ' weeks' + (startDate ? ' (Starting ' + new Date(startDate).toLocaleDateString() + ')' : '') + '</p>' +
        '</div>' +
        
        '<div class="section">' +
        '<h2>Package Includes</h2>' +
        packageIncludesList +
        '</div>' +
        
        (selectedFeatures.length > 0 ? '<div class="section"><h2>Additional Features & Deliverables</h2>' + selectedFeaturesList + '</div>' : '') +
        
        (notes ? '<div class="section"><h2>Special Requirements</h2><p>' + notes + '</p></div>' : '') +
        
        '<div class="section">' +
        '<h2>Payment Structure</h2>' +
        '<table class="payment-table">' +
        '<thead><tr><th>Payment Milestone</th><th>Description</th><th>Amount</th></tr></thead>' +
        '<tbody>' +
        '<tr><td><strong>Initial Deposit</strong></td><td>Due before work begins (50%)</td><td><strong>$' + deposit.toFixed(2) + '</strong></td></tr>' +
        '<tr><td><strong>Milestone 1</strong></td><td>UI/UX Design Approval (25%)</td><td><strong>$' + milestone1.toFixed(2) + '</strong></td></tr>' +
        '<tr><td><strong>Final Payment</strong></td><td>Prior to deployment (25%)</td><td><strong>$' + finalPayment.toFixed(2) + '</strong></td></tr>' +
        '<tr class="total-row"><td colspan="2">Total Project Cost</td><td>$' + totalPrice.toFixed(2) + '</td></tr>' +
        '</tbody></table>' +
        '</div>' +
        
        (maintenancePlan !== 'none' ? '<div class="section">' +
        '<h2>Ongoing Maintenance</h2>' +
        '<div class="info-box">' +
        '<h3>' + maintenanceInfo.name + ' — ' + maintenanceInfo.cost + '</h3>' +
        '<p>' + (maintenanceInfo.desc || '') + '</p>' +
        '</div>' +
        '</div>' : '') +
        
        '<div class="section">' +
        '<h2>Terms & Conditions</h2>' +
        '<p>This Statement of Work is subject to the terms outlined in the Website Development Agreement between VistaFly and <strong>' + clientName + '</strong>. All work will be performed using modern technologies including React, Next.js, Firebase, and associated development tools in accordance with industry best practices.</p>' +
        '<p>The project timeline is an estimate and may be adjusted based on client feedback, content delivery, and scope changes. Any requests beyond the defined scope require a signed Change Order.</p>' +
        '</div>' +
        
        '<div class="footer">' +
        '<p><strong>© ' + new Date().getFullYear() + ' VistaFly</strong> — Crafted with precision</p>' +
        '<p style="margin-top: 8px;">Carlos Martin | Professional Web Development</p>' +
        '<p style="margin-top: 12px; font-size: 9pt; font-style: italic;">This SOW is valid for 30 days from the date of generation and must be signed with the Development Agreement.</p>' +
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
        if (fields.clientEmail) fields.clientEmail.value = sow.clientEmail || '';
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
        
        // Update pricing display
        setTimeout(function() {
            self.updateSOWPricing({
                'starter': { min: 1800, max: 2500, default: 2150 },
                'professional': { min: 3500, max: 6000, default: 4750 },
                'premium': { min: 6000, max: 10000, default: 8000 },
                'elite': { min: 10000, max: 20000, default: 15000 }
            }, {
                'none': 0,
                'basic': 125,
                'professional': 275,
                'premium': 650
            });
        }, 100);
        
        // Check selected features
        if (sow.features && sow.features.length > 0) {
            console.log('Checking', sow.features.length, 'features');
            $$('.sow-checkboxes input[type="checkbox"]').forEach(function(checkbox) {
                checkbox.checked = false; // Uncheck all first
                var label = checkbox.parentElement.textContent.trim();
                if (sow.features.some(function(f) { return f.indexOf(label) !== -1 || label.indexOf(f) !== -1; })) {
                    checkbox.checked = true;
                }
            });
        }
        
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
    var packageType = $('#sowPackage').value;
    var weeks = $('#sowWeeks').value;
    var startDate = $('#sowStartDate').value;
    var notes = $('#sowNotes').value.trim();
    var maintenancePlan = $('#sowMaintenance').value;
    
    if (!clientName || !clientEmail || !packageType || !weeks) {
        alert('Please fill in all required fields:\n- Client Name\n- Client Email\n- Package Tier\n- Estimated Weeks');
        return;
    }
    
    // Get selected features
    var features = [];
    $$('.sow-checkboxes input[type="checkbox"]:checked').forEach(function(checkbox) {
        var label = checkbox.parentElement.textContent.trim();
        features.push(label);
    });
    
    // Calculate pricing
    var packagePricing = {
        'starter': { min: 1800, max: 2500, default: 2150 },
        'professional': { min: 3500, max: 6000, default: 4750 },
        'premium': { min: 6000, max: 10000, default: 8000 },
        'elite': { min: 10000, max: 20000, default: 15000 }
    };
    
    var totalPrice = 0;
    if (packageType === 'custom') {
        totalPrice = parseFloat($('#sowCustomPrice').value) || 0;
    } else if (packagePricing[packageType]) {
        totalPrice = packagePricing[packageType].default;
    }
    
    var sowData = {
        clientName: clientName,
        clientEmail: clientEmail,
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
            final: totalPrice * 0.25
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
    console.log('Setting up client view - dual signing mode');
    
    var self = this;
    
    // ============= CHECK FOR EXISTING SUBMISSIONS FIRST =============
    var userEmail = firebase.auth().currentUser.email;
    
    // Check if user already has a pending or completed contract
    firebase.firestore().collection('contracts')
        .where('clientEmail', '==', userEmail)
        .where('status', 'in', ['pending_developer', 'completed'])
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get()
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
    var userEmail = firebase.auth().currentUser.email;
    
    firebase.firestore().collection('sow_documents')
        .where('clientEmail', '==', userEmail)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()
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
    
    // Create subtle notification banner
    var notificationHTML = 
        '<div class="sow-missing-notification">' +
        '<div class="notification-icon">📋</div>' +
        '<div class="notification-content">' +
        '<h4>Statement of Work Required</h4>' +
        '<p>You need an approved SOW before signing the contract.</p>' +
        '<p class="notification-action">Please <strong>Request Help</strong> below to request your SOW from the developer.</p>' +
        '</div>' +
        '</div>';
    
    // Insert notification at the top of the contract form
    var contractForm = $('#contractForm');
    if (contractForm) {
        var existingNotification = $('.sow-missing-notification');
        if (existingNotification) existingNotification.remove();
        
        contractForm.insertAdjacentHTML('afterbegin', notificationHTML);
    }
    
    // Highlight the "Request Help" button
    var requestHelpBtn = $('#requestHelpBtn');
    if (requestHelpBtn) {
        requestHelpBtn.style.animation = 'pulse 2s infinite';
        requestHelpBtn.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.6)';
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
    
    var html = '<div class="sow-full-document">' +
        
        // HEADER
        '<div class="sow-document-header">' +
        '<h1>📋 STATEMENT OF WORK</h1>' +
        '<p class="sow-subtitle">VistaFly — Professional Web Development</p>' +
        '<p class="sow-date">Generated: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '</p>' +
        '</div>' +
        
        // CLIENT INFO BOX
        '<div class="sow-info-box">' +
        '<h3>Client Information</h3>' +
        '<div class="sow-info-grid">' +
        '<div class="sow-info-item"><strong>Client Name:</strong> ' + sowData.clientName + '</div>' +
        '<div class="sow-info-item"><strong>Email:</strong> ' + sowData.clientEmail + '</div>' +
        '<div class="sow-info-item"><strong>Package:</strong> ' + (packageNames[sowData.packageType] || sowData.packageType) + '</div>' +
        '<div class="sow-info-item"><strong>Timeline:</strong> ' + (sowData.estimatedWeeks || 'TBD') + ' weeks</div>' +
        '</div>' +
        '</div>' +
        
        // PACKAGE INCLUDES
        '<div class="sow-section">' +
        '<h2>Package Includes</h2>' +
        '<ul class="sow-list">';
    
    if (packageInfo.includes && packageInfo.includes.length > 0) {
        packageInfo.includes.forEach(function(item) {
            html += '<li>' + item + '</li>';
        });
    }
    
    html += '</ul></div>';
    
    // SELECTED FEATURES
    if (sowData.features && sowData.features.length > 0) {
        html += '<div class="sow-section">' +
            '<h2>Additional Features & Deliverables</h2>' +
            '<ul class="sow-list">';
        
        sowData.features.forEach(function(feature) {
            html += '<li>' + feature + '</li>';
        });
        
        html += '</ul></div>';
    }
    
    // SPECIAL REQUIREMENTS
    if (sowData.notes) {
        html += '<div class="sow-section">' +
            '<h2>Special Requirements</h2>' +
            '<p class="sow-text">' + sowData.notes + '</p>' +
            '</div>';
    }
    
    // PAYMENT STRUCTURE
    html += '<div class="sow-section">' +
        '<h2>Payment Structure</h2>' +
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
        '<tr class="sow-total-row">' +
        '<td colspan="2"><strong>Total Project Cost</strong></td>' +
        '<td><strong>$' + totalPrice.toFixed(2) + '</strong></td>' +
        '</tr>' +
        '</tbody>' +
        '</table>' +
        '</div>';
    
    // TERMS
    html += '<div class="sow-section">' +
        '<h2>Terms & Conditions</h2>' +
        '<p class="sow-text">This Statement of Work is subject to the terms outlined in the Website Development Agreement between VistaFly and <strong>' + sowData.clientName + '</strong>. All work will be performed using modern technologies including React, Next.js, Firebase, and associated development tools in accordance with industry best practices.</p>' +
        '<p class="sow-text">The project timeline is an estimate and may be adjusted based on client feedback, content delivery, and scope changes. Any requests beyond the defined scope require a signed Change Order.</p>' +
        '</div>' +
        
        // SIGNATURE BLOCK
        '<div class="sow-signature-section">' +
        '<h2>Client Signature Required</h2>' +
        '<p class="sow-text">Please review the above Statement of Work carefully. By signing below, you acknowledge that you have read and agree to the scope, timeline, and payment terms outlined in this document.</p>' +
        
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
        
        '</div>' +
        '</div>';
    
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
                sowCanvas.style.height = '150px';
                
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
    
    var clientEmail = firebase.auth().currentUser.email;
    
    // Contract data
    var contractData = {
        clientName: $('#clientName').value.trim(),
        clientSignerName: $('#clientSignerName').value.trim(),
        clientDate: $('#clientDate').value,
        clientSignature: this.clientSignaturePad.toDataURL(),
        clientEmail: clientEmail,
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
        
        // Contract Card
        '<div class="completed-doc-card">' +
        '<div class="doc-card-header">' +
        '<h3>📄 Contract Agreement</h3>' +
        statusBadge +
        '</div>' +
        '<div class="doc-card-body">' +
        '<div class="doc-field-row"><span class="field-label">Client:</span><span class="field-value">' + (contractData.clientName || 'N/A') + '</span></div>' +
        '<div class="doc-field-row"><span class="field-label">Client Signed:</span><span class="field-value">' + (contractData.clientDate || 'N/A') + '</span></div>' +
        (isFullySigned ? '<div class="doc-field-row"><span class="field-label">Developer Signed:</span><span class="field-value">' + (contractData.devDate || 'N/A') + '</span></div>' : '') +
        '<div class="doc-field-row"><span class="field-label">Email:</span><span class="field-value">' + (contractData.clientEmail || 'N/A') + '</span></div>' +
        '</div>';
    
    // Add download button ONLY if fully signed
    if (isFullySigned) {
        html += '<button class="btn btn-primary download-doc-btn" id="downloadContractBtn" style="width: 100%; margin-top: 1rem; ">' +
            '<span>📄 Download Contract PDF</span>' +
            '</button>';
    }
    
    html += '</div>'; // Close contract card
    
    // SOW Card (if exists)
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
            '<div class="doc-field-row"><span class="field-label">Package:</span><span class="field-value">' + (sowData.packageType || 'N/A') + '</span></div>' +
            '<div class="doc-field-row"><span class="field-label">Total Cost:</span><span class="field-value">$' + (sowData.payment ? sowData.payment.total.toFixed(2) : '0.00') + '</span></div>' +
            '<div class="doc-field-row"><span class="field-label">Timeline:</span><span class="field-value">' + (sowData.estimatedWeeks || 'TBD') + ' weeks</span></div>' +
            '<div class="doc-field-row"><span class="field-label">Client Signed:</span><span class="field-value">' + (sowData.clientSignedDate || 'N/A') + '</span></div>' +
            (sowFullySigned ? '<div class="doc-field-row"><span class="field-label">Developer Signed:</span><span class="field-value">' + (sowData.devSignedDate || 'N/A') + '</span></div>' : '') +
            '</div>';
        
        // Add download button ONLY if fully signed
        if (sowFullySigned) {
            // Store SOW data globally for PDF generation
            var sowDataId = 'sowData_' + sowData.id.replace(/[^a-zA-Z0-9]/g, '_');
            window[sowDataId] = sowData;
            
            html += '<button class="btn btn-primary download-doc-btn" onclick="window.contractFormHandler.generateSOWPDF(window.' + sowDataId + ')" style="width: 100%; margin-top: 1rem;">' +
                '<span>📋 Download SOW PDF</span>' +
                '</button>';
        }
        
        html += '</div>'; // Close SOW card
    }
    
    html += '</div>'; // Close completed-documents
    
    // Action buttons
    html += '<div class="completion-actions">';
    
    // If both documents are fully signed, add a "Download Both" button
    if (isFullySigned && sowData && sowData.devSignature && sowData.clientSignature) {
        html += '<button class="btn btn-primary" id="downloadBothBtn" style="margin-right: 10px;">' +
            '<span>📦 Download Both PDFs</span>' +
            '</button>';
    }
    
    html += '<button class="btn btn-secondary" onclick="document.querySelector(\'.contract-modal\').classList.remove(\'show\'); document.body.classList.remove(\'modal-open\');">Close</button>' +
        '</div>';
    
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
        '<span class="field-label">Email:</span>' +
        '<span class="field-value">' + (contractData.clientEmail || 'N/A') + '</span>' +
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
        '<span class="field-value">' + sowData.clientName + '</span>' +
        '</div>' +
        '<div class="doc-field-row">' +
        '<span class="field-label">Package:</span>' +
        '<span class="field-value">' + sowData.packageType + '</span>' +
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
        '<canvas id="completedSOWSignature" class="signature-image" width="300" height="100"></canvas>' +
        '</div>' +
        '</div>' +
        
        '</div>' +
        
        '<div class="completion-actions">' +
        '<p class="info-text">📧 A confirmation email has been sent to <strong>' + contractData.clientEmail + '</strong></p>' +
        '<button class="btn btn-secondary" onclick="document.querySelector(\'.contract-modal\').classList.remove(\'show\'); document.body.classList.remove(\'modal-open\');">' +
        'Close' +
        '</button>' +
        '</div>';
    
    // Insert completed view
    var modalHeader = $('.modal-header');
    if (modalHeader && modalHeader.nextSibling) {
        modalContent.insertBefore(completedContainer, modalHeader.nextSibling);
    } else {
        modalContent.appendChild(completedContainer);
    }
    
   // Draw SOW signature on canvas
    setTimeout(function() {
        var sowSigCanvas = document.getElementById('completedSOWSignature');
        if (sowSigCanvas && sowData.clientSignature) {
            var ctx = sowSigCanvas.getContext('2d');
            var img = new Image();
            img.onload = function() {
                ctx.drawImage(img, 0, 0, 300, 100);
            };
            img.src = sowData.clientSignature;
        }
    }, 100);
    
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
        '.signature-line img { max-height: 70px; max-width: 100%; filter: invert(1) grayscale(1); }' +
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
    var clientEmail = contractData.clientEmail || 'N/A';
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
        '.signature-line img { max-height: 70px; max-width: 100%; filter: invert(1) grayscale(1); }' +
        '.signature-label { font-size: 10pt; color: #666; margin-top: 5px; }' +
        '.signature-name { font-weight: bold; margin-top: 10px; }' +
        '.signature-date { margin-top: 5px; }' +
        '.signature-email { font-size: 10pt; color: #666; }' +
        '.footer { margin-top: 50px; text-align: center; font-size: 10pt; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }' +
        '.contract-id { font-size: 9pt; color: #999; margin-top: 10px; }' +
        '.page-break { page-break-before: always; }' +
        '.info-box { background: #f9fafb; padding: 18px; border-left: 4px solid #6366f1; margin: 20px 0; border-radius: 4px; }' +
        '.info-box h3 { margin-top: 0; color: #6366f1; }' +
        '.payment-table { width: 100%; border-collapse: collapse; margin: 15px 0; }' +
        '.payment-table th, .payment-table td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }' +
        '.payment-table th { background: #f3f4f6; font-weight: bold; color: #374151; }' +
        '.total-row { background: #6366f1; color: white; font-weight: bold; font-size: 14pt; }' +
        '.highlight { background: #fef3c7; padding: 2px 6px; border-radius: 3px; }' +
        '@media print { body { padding: 0.5in; } .signature-page, .page-break { page-break-before: always; } }' +
        '@page { margin: 0.75in; }' +
        '</style>' +
        '</head><body>' +
        
        // ==================== CONTRACT SECTION ====================
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
        
        // Contract Signatures
        '<div class="signature-page">' +
        '<h2 style="text-align: center; border: none;">CONTRACT SIGNATURES</h2>' +
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
        '</div>' +
        
        // ==================== SOW SECTION (NEW PAGE) ====================
        '<div class="page-break"></div>' +
        
        '<div class="header">' +
        '<h1>STATEMENT OF WORK</h1>' +
        '<div class="subtitle">VistaFly — Professional Web Development</div>' +
        '<div style="font-size: 10pt; color: #666; margin-top: 10px;">Generated: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '</div>' +
        '</div>' +
        
        '<div class="info-box">' +
        '<h3>Client Information</h3>' +
        '<p><strong>Client Name:</strong> ' + (sowData.clientName || clientName) + '</p>' +
        '<p><strong>Email:</strong> ' + (sowData.clientEmail || clientEmail) + '</p>' +
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
        '<p>This Statement of Work is subject to the terms outlined in the Website Development Agreement between VistaFly and <strong>' + clientName + '</strong>. All work will be performed using modern technologies including React, Next.js, Firebase, and associated development tools in accordance with industry best practices.</p>' +
        '<p>The project timeline is an estimate and may be adjusted based on client feedback, content delivery, and scope changes. Any requests beyond the defined scope require a signed Change Order.</p>' +
        '</div>';
    
    // SOW Signatures
    htmlContent += '<div class="signature-page">' +
        '<h2 style="text-align: center; border: none;">SOW SIGNATURES</h2>' +
        '<p style="text-align: center; margin-bottom: 30px;">By signing below, both parties acknowledge agreement to the scope, timeline, and payment terms outlined in this Statement of Work.</p>' +
        
        '<div style="display: flex; justify-content: space-between; margin-top: 40px;">' +
        
        '<div class="signature-block">' +
        '<h3>Developer — VistaFly</h3>' +
        '<div class="signature-line">' +
        (sowData.devSignature ? '<img src="' + sowData.devSignature + '" alt="Developer Signature" />' : '<span style="color: #999;">Pending</span>') +
        '</div>' +
        '<div class="signature-label">Signature</div>' +
        '<div class="signature-name">' + (sowData.devSignerName || 'Carlos Martin') + '</div>' +
        '<div class="signature-date">Date: ' + (sowData.devSignedDate || 'N/A') + '</div>' +
        '</div>' +
        
        '<div class="signature-block">' +
        '<h3>Client — ' + clientName + '</h3>' +
        '<div class="signature-line">' +
        (sowData.clientSignature ? '<img src="' + sowData.clientSignature + '" alt="Client Signature" />' : '<span style="color: #999;">Pending</span>') +
        '</div>' +
        '<div class="signature-label">Signature</div>' +
        '<div class="signature-name">' + (sowData.clientSignerName || clientName) + '</div>' +
        '<div class="signature-date">Date: ' + (sowData.clientSignedDate || 'N/A') + '</div>' +
        '</div>' +
        
        '</div>' +
        '</div>' +
        
        // Footer
        '<div class="footer">' +
        '<p><strong>© ' + new Date().getFullYear() + ' VistaFly</strong> — Crafted with precision</p>' +
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
    
    // Inject cursor disable/enable styles
    var style = document.createElement('style');
    style.id = 'custom-cursor-style';
    style.textContent = 
        '@media (min-width: 1024px) {' +
        '  body:not(.modal-open) * { cursor: none !important; }' +
        '  body.modal-open, body.modal-open * { cursor: auto !important; }' +
        '  body.modal-open .signature-pad { cursor: crosshair !important; }' +
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
        }
        
        wasModalOpen = isModalOpen;
        
        // Hide cursor when modal is open
        if (isModalOpen) {
            self.cursor.style.opacity = '0';
            self.isAnimating = false;
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
        
        // 🎯 THROTTLED HOVER CHECK - Every 3rd frame (~50ms at 60fps)
        self.hoverCheckFrame++;
        if (self.hoverCheckFrame % 3 === 0) {
            var element = document.elementFromPoint(e.clientX, e.clientY);
            self.checkHoverState(element);
        }
    }, { passive: true });

    document.addEventListener('pointerleave', function() {
        self.isVisible = false;
        self.isAnimating = false;
        self.cursor.style.opacity = '0';
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
    
    // ⚡ FAST LERP - 0.3 factor for 2x faster response
    var lerpFactor = 0.3;
    var snapThreshold = 0.5;  // Stop animating if within 0.5px
    
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

    // === INITIALIZATION ===
    var init = function() {
        console.log('VistaFly - Crafted with precision');
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