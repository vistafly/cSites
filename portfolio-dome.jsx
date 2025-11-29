import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import DomeGallery from './DomeGallery.jsx';

// Get the base URL from Vite config
const BASE_URL = import.meta.env.BASE_URL;

// Portfolio projects
const portfolioProjects = [
  {
    preview: `${BASE_URL}images/logo.png`,
    url: 'https://vistafly.services/',
    alt: 'VistaFly Services - Precision Web Design',
    type: 'iframe'
  },
  {
    preview: `${BASE_URL}images/logo1.png`,
    url: 'https://vistafly.github.io/CSAnew/',
    alt: 'CSA Entertainment - Sports & Music Programs',
    type: 'iframe'
  },
  {
    preview: `${BASE_URL}images/logo2.png`,
    url: 'https://themorenosband.com/',
    alt: 'The Morenos Band - Official Music Website',
    type: 'iframe'
  },
  {
    preview: `${BASE_URL}images/logo3.png`,
    url: 'https://cultivanetwork.com/',
    alt: 'CultivaNetwork - Agricultural Platform',
    type: 'iframe'
  },
  {
    preview: `${BASE_URL}images/logo5.png`,
    url: 'https://vistafly.github.io/thebox/',
    alt: 'The Box - Creative Digital Project',
    type: 'iframe'
  },
  {
    preview: `${BASE_URL}images/logo6.png`,
    url: 'https://vistafly.github.io/landscapingcultura/',
    alt: 'Landscaping Cultura - Professional Landscaping',
    type: 'iframe'
  },
  {
    preview: `${BASE_URL}images/logo7.png`,
    url: 'https://vistafly.github.io/sproutscloth/',
    alt: 'Sprouts Clothing - Sustainable Fashion',
    type: 'iframe'
  },
];

// Responsive wrapper - ONLY changes radius to scale dome size
function ResponsiveDomeGallery() {
  const [radius, setRadius] = useState({ min: 1300, max: 1500 });

  useEffect(() => {
    const updateRadius = () => {
      const width = window.innerWidth;
      
      if (width <= 430) {
        // Small phones - much smaller dome
        setRadius({ min: 500, max: 650 });
      } else if (width <= 768) {
        // Tablets - medium dome  
        setRadius({ min: 750, max: 900 });
      } else if (width <= 1024) {
        // Large tablets - slightly smaller
        setRadius({ min: 1000, max: 1200 });
      } else {
        // Desktop - your perfect settings
        setRadius({ min: 1300, max: 1500 });
      }
    };

    updateRadius();
    window.addEventListener('resize', updateRadius);
    return () => window.removeEventListener('resize', updateRadius);
  }, []);

  // Keep all your perfect desktop settings, only change radius
  return (
    <DomeGallery
      images={portfolioProjects}
      fit={1}
      minRadius={radius.min}
      maxRadius={radius.max}
      maxVerticalRotationDeg={2}
      dragSensitivity={18}
      segments={30}
      openedImageWidth="70vw"
      openedImageHeight="70vh"
      imageBorderRadius="40px"
      openedImageBorderRadius="20px"
      overlayBlurColor="#0a0a0a"
      grayscale={false}
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById('portfolio-dome-root'));
root.render(
  <React.StrictMode>
    <ResponsiveDomeGallery />
  </React.StrictMode>
);