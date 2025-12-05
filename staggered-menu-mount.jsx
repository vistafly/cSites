import React from 'react';
import ReactDOM from 'react-dom/client';
import StaggeredMenu from './StaggeredMenu.jsx';

// Menu items matching your existing navigation
const menuItems = [
  { label: 'Home', ariaLabel: 'Go to home section', link: '#home' },
  { label: 'Services', ariaLabel: 'View our services', link: '#philosophy' },
  { label: 'Portfolio', ariaLabel: 'See our work', link: '#portfolio' },
  { label: 'Agreement', ariaLabel: 'View development agreement', link: '#contract' },
  { label: 'Connect', ariaLabel: 'Get in touch', link: '#contact' }
];

// Social links
const socialItems = [
  { label: 'Twitter', link: 'https://twitter.com' },
  { label: 'LinkedIn', link: 'https://linkedin.com' },
  { label: 'Instagram', link: 'https://instagram.com' }
];

// Handle smooth scroll navigation
const handleItemClick = (item, e) => {
  e.preventDefault();
  
  const targetId = item.link;
  if (!targetId || targetId === '#') return;
  
  const target = document.querySelector(targetId);
  if (target) {
    const navbar = document.querySelector('.navbar');
    const navHeight = navbar ? navbar.offsetHeight : 0;
    const targetPosition = target.offsetTop - navHeight;
    
    window.scrollTo({ 
      top: targetPosition, 
      behavior: 'smooth' 
    });
  }
};

// Handle menu open/close callbacks
const handleMenuOpen = () => {
  console.log('Staggered menu opened');
  // Add class to body for any global styling needs
  document.body.classList.add('staggered-menu-open');
};

const handleMenuClose = () => {
  console.log('Staggered menu closed');
  document.body.classList.remove('staggered-menu-open');
};

// Mount the component
const mountPoint = document.getElementById('staggered-menu-root');

if (mountPoint) {
  const root = ReactDOM.createRoot(mountPoint);
  root.render(
    <React.StrictMode>
      <StaggeredMenu
        position="right"
        items={menuItems}
        socialItems={socialItems}
        displaySocials={true}
        displayItemNumbering={true}
        menuButtonColor="#fff"
        openMenuButtonColor="#fff"
        changeMenuColorOnOpen={true}
        colors={['#0a0a12', '#12121a', '#1a1a24']}
        accentColor="rgba(255, 255, 255, 0.9)"
        onMenuOpen={handleMenuOpen}
        onMenuClose={handleMenuClose}
        onItemClick={handleItemClick}
      />
    </React.StrictMode>
  );
} else {
  console.error('StaggeredMenu mount point not found: #staggered-menu-root');
}