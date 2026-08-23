import { businessConfig, siteConfig } from './config';

/**
 * Generate Google LocalBusiness / BeautySalon JSON-LD Structured Data
 */
export function getSalonSchemaJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "name": businessConfig.name,
    "image": [
      siteConfig.ogImage,
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80"
    ],
    "@id": siteConfig.url,
    "url": siteConfig.url,
    "telephone": businessConfig.phone,
    "email": businessConfig.email,
    "priceRange": "$$$",
    "currenciesAccepted": "INR",
    "paymentAccepted": "Cash, Credit Card, UPI",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": businessConfig.address.street,
      "addressLocality": businessConfig.address.city,
      "addressRegion": businessConfig.address.state,
      "postalCode": businessConfig.address.postalCode,
      "addressCountry": businessConfig.address.country,
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": Number(businessConfig.geo.latitude),
      "longitude": Number(businessConfig.geo.longitude),
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ],
        "opens": "10:00",
        "closes": "21:00"
      }
    ],
    "sameAs": [
      "https://instagram.com/classicpearlssalon",
      "https://facebook.com/classicpearlssalon"
    ]
  };
}
