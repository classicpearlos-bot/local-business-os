/**
 * Centralized Application & Business Configuration
 * Classic Pearl Unisex Salon, Arekere, Bengaluru
 */

export const siteConfig = {
  name: "Classic Pearl Unisex Salon",
  tagline: "Premium Unisex Hair & Beauty Salon in Bengaluru",
  slogan: "THE ART OF BECOMING.",
  description: "Bengaluru's premier customer-focused salon in Arekere offering expert hair transformations, Korean glass skin facials, Hydra rituals, Botox, Nano Plastia, bridal makeovers, and grooming with 100% transparent pricing.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://classicpearls.vercel.app",
  ogImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&h=630&q=80",
};

export const businessConfig = {
  name: "Classic Pearl Unisex Salon",
  legalName: "Classic Pearl Unisex Salon",
  phone: "+91 74836 54138",
  phoneRaw: "7483654138",
  whatsappNumber: "917483654138",
  email: "classicpearlsalon@gmail.com",
  
  address: {
    street: "1st floor, Tony Thomas, MNK Arcade, 36, 80ft, BDA Main Rd, beside Camry hospital, Arekere",
    landmark: "Beside Camry Hospital, 80ft BDA Main Road",
    area: "Arekere, Bannerghatta Road",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560076",
    country: "IN",
    countryName: "India",
  },
  
  geo: {
    latitude: "12.8876",
    longitude: "77.5972",
  },
  
  openingHours: [
    { days: "Everyday (Monday – Sunday)", hours: "10:00 AM – 09:00 PM", opens: "10:00", closes: "21:00" },
  ],
  
  mapsUrl: "https://maps.google.com/?q=MNK+Arcade+Arekere+Bengaluru+Karnataka+560076",
  googleReviewRating: "4.9",
  googleReviewCount: "380+",
};

export const membershipConfig = {
  name: "Pearl Membership",
  tagline: "Smart Beauty Care for Smart People",
  priceAnnual: 199,
  validityDays: 365,
  averageSavingsPerVisit: "₹300 - ₹1,200",
  benefits: [
    "Exclusive Member Pricing on all services (Save up to 30%)",
    "Priority Appointment Slot Booking",
    "Complimentary Scalp & Skin Analysis on every visit",
    "Special Birthday & Anniversary Makeover Offers",
    "No Minimum Spend Required — Valid for 365 Days",
  ],
};

export const verificationConfig = {
  metaDomainVerification: process.env.NEXT_PUBLIC_META_DOMAIN_VERIFICATION || "",
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
};

export const analyticsConfig = {
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
  googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID || "",
};

export const socialConfig = {
  instagram: "https://instagram.com/classicpearlssalon",
  facebook: "https://facebook.com/classicpearlssalon",
  youtube: "https://youtube.com/@classicpearlssalon",
};

export const bookingConfig = {
  referencePrefix: "CP-",
  cancellationNoticeHours: 24,
  timeSlots: [
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "01:30 PM",
    "03:00 PM",
    "04:30 PM",
    "06:00 PM",
    "07:30 PM",
    "08:30 PM",
  ],
};
