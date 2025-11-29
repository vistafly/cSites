import React from 'react';
import ReactDOM from 'react-dom/client';
import DomeGallery from './DomeGallery.jsx';

// Function to generate placeholder images with custom colors (temporary fallback)
const getPlaceholder = (text, gradient = '1a1a1a/ffffff') => {
  const encoded = encodeURIComponent(text);
  return `https://placehold.co/800x600/${gradient}/png?text=${encoded}&font=roboto`;
};

// Get the base URL from Vite config
const BASE_URL = import.meta.env.BASE_URL;

// Portfolio projects - YOUR 7 WEBSITES with real logo images
const portfolioProjects = [
  {
    preview: `${BASE_URL}images/logo.png`,  // Fixed path
    url: 'https://vistafly.services/',
    alt: 'VistaFly Services - Precision Web Design',
    type: 'iframe'
  },
  {
    preview: `${BASE_URL}images/logo1.png`,  // Fixed path
    url: 'https://vistafly.github.io/CSAnew/',
    alt: 'CSA Entertainment - Sports & Music Programs',
    type: 'iframe'
  },
  {
    preview: `${BASE_URL}images/logo2.png`,  // Fixed path
    url: 'https://themorenosband.com/',
    alt: 'The Morenos Band - Official Music Website',
    type: 'iframe'
  },
  {
    preview: `${BASE_URL}images/logo4.png`,  // Fixed path
    url: 'https://cultivanetwork.com/',
    alt: 'CultivaNetwork - Agricultural Platform',
    type: 'iframe'
  },
  {
    preview: `${BASE_URL}images/logo5.png`,  // Fixed path
    url: 'https://vistafly.github.io/thebox/',
    alt: 'The Box - Creative Digital Project',
    type: 'iframe'
  },
  {
    preview: `${BASE_URL}images/logo6.png`,  // Fixed path
    url: 'https://vistafly.github.io/landscapingcultura/',
    alt: 'Landscaping Cultura - Professional Landscaping',
    type: 'iframe'
  },
  {
    preview: `${BASE_URL}images/logo7.png`,  // Fixed path
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
      fit={1}
      minRadius={1300}
      maxRadius={1500}
      maxVerticalRotationDeg={2}
      dragSensitivity={18}
      enlargeTransitionMs={300}
      segments={30}
      dragDampening={2}
      openedImageWidth="70vw"
      openedImageHeight="70vh"
      imageBorderRadius="40px"
      openedImageBorderRadius="20px"
      overlayBlurColor="#0a0a0a"
      grayscale={false}
    />
  </React.StrictMode>
);