import React from 'react';
import ReactDOM from 'react-dom/client';
import DomeGallery from './DomeGallery.jsx';

// Function to generate placeholder images with custom colors (temporary fallback)
const getPlaceholder = (text, gradient = '1a1a1a/ffffff') => {
  const encoded = encodeURIComponent(text);
  return `https://placehold.co/800x600/${gradient}/png?text=${encoded}&font=roboto`;
};

// Portfolio projects - YOUR 7 WEBSITES with real logo images
const portfolioProjects = [
  {
    preview: '/images/logo.png',  // Your actual logo
    url: 'https://vistafly.services/',
    alt: 'VistaFly Services - Precision Web Design',
    type: 'iframe'
  },
  {
    preview: '/images/logo1.png',  // Your actual logo
    url: 'https://vistafly.github.io/CSAnew/',
    alt: 'CSA Entertainment - Sports & Music Programs',
    type: 'iframe'
  },
  {
    preview: '/images/logo2.png',  // Your actual logo
    url: 'https://themorenosband.com/',
    alt: 'The Morenos Band - Official Music Website',
    type: 'iframe'
  },
  {
    preview: '/images/logo4.png',  // Your actual logo
    url: 'https://cultivanetwork.com/',
    alt: 'CultivaNetwork - Agricultural Platform',
    type: 'iframe'
  },
  {
    preview: '/images/logo5.png',  // Your actual logo
    url: 'https://vistafly.github.io/thebox/',
    alt: 'The Box - Creative Digital Project',
    type: 'iframe'
  },
  {
    preview: '/images/logo6.png',  // Your actual logo
    url: 'https://vistafly.github.io/landscapingcultura/',
    alt: 'Landscaping Cultura - Professional Landscaping',
    type: 'iframe'
  },
  {
    preview: '/images/logo7.png',  // Your actual logo
    url: 'https://vistafly.github.io/sproutscloth/',
    alt: 'Sprouts Clothing - Sustainable Fashion',
    type: 'iframe'
  },

];

// LARGER, MORE IMMERSIVE settings with overflow effect
const root = ReactDOM.createRoot(document.getElementById('portfolio-dome-root'));
root.render(
  <React.StrictMode>
    <DomeGallery
      images={portfolioProjects}
      fit={1}                    // LARGER - was 0.6, now 0.85 (40% bigger)
      minRadius={1300}               // LARGER - was 650, now 900
      maxRadius={1500}              // LARGER - was 1000, now 1400
      maxVerticalRotationDeg={2}   // Slightly more tilt
      dragSensitivity={18}
      enlargeTransitionMs={300}
      segments={30}
      dragDampening={2}
      openedImageWidth="70vw"       // Larger overlay - was 85vw
      openedImageHeight="70vh"      // Larger overlay - was 85vh
      imageBorderRadius="40px"
      openedImageBorderRadius="20px"
      overlayBlurColor="#0a0a0a"
      grayscale={false}
    />
  </React.StrictMode>
);