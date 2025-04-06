// Broadcaster utilities for displaying broadcaster logos and links
import React from 'react';

// Map of broadcaster abbreviations to their display names and logos
export interface BroadcasterInfo {
  name: string;
  logo: string;
  backgroundColor: string;
  textColor: string;
  url?: string;
}

// Map of broadcaster abbreviations to their info
export const broadcasterMap: Record<string, BroadcasterInfo> = {
  // UK Broadcasters
  'TNT': {
    name: 'TNT Sports',
    logo: '/images/broadcasters/tnt.png',
    backgroundColor: '#1a1a1a', // Dark background
    textColor: '#ffffff', // White text
    url: 'https://www.tntsports.co.uk/'
  },
  'TNTSPORT': {
    name: 'TNT Sports',
    logo: '/images/broadcasters/tnt.png',
    backgroundColor: '#1a1a1a', // Dark background
    textColor: '#ffffff', // White text
    url: 'https://www.tntsports.co.uk/'
  },
  'SKY': {
    name: 'Sky Sports',
    logo: '/images/broadcasters/sky.png',
    backgroundColor: '#1a1a1a', // Dark background
    textColor: '#ffffff', // White text
    url: 'https://www.skysports.com/premier-league'
  },
  'SKYSPORTS': {
    name: 'Sky Sports',
    logo: '/images/broadcasters/sky.png',
    backgroundColor: '#1a1a1a', // Dark background
    textColor: '#ffffff', // White text
    url: 'https://www.skysports.com/premier-league'
  },
  'AMZN': {
    name: 'Amazon Prime Video',
    logo: '/images/broadcasters/prime.png',
    backgroundColor: '#1a1a1a', // Dark background
    textColor: '#ffffff', // White text
    url: 'https://www.amazon.co.uk/primevideo'
  },
  'PRIME': {
    name: 'Amazon Prime Video',
    logo: '/images/broadcasters/prime.png',
    backgroundColor: '#1a1a1a', // Dark background
    textColor: '#ffffff', // White text
    url: 'https://www.amazon.co.uk/primevideo'
  },
  'BBC': {
    name: 'BBC',
    logo: '/images/broadcasters/bbc.png',
    backgroundColor: '#1a1a1a', // Dark background
    textColor: '#ffffff', // White text
    url: 'https://www.bbc.co.uk/sport/football/premier-league'
  },
  'BBC5LIVE': {
    name: 'BBC Radio 5 Live',
    logo: '/images/broadcasters/bbc.png',
    backgroundColor: '#1a1a1a', // Dark background
    textColor: '#ffffff', // White text
    url: 'https://www.bbc.co.uk/sounds/play/live:bbc_radio_five_live'
  },
  'TLKSP': {
    name: 'talkSPORT',
    logo: '/images/broadcasters/tlksp.png', // Using talkSPORT logo
    backgroundColor: '#1a1a1a', // Dark background
    textColor: '#ffffff', // White text
    url: 'https://app.talksport.com/Premier-league'
  },
  // Add more broadcasters as needed
};

// Get broadcaster info by abbreviation
export function getBroadcasterInfo(abbreviation: string): BroadcasterInfo {
  console.log(`Looking up broadcaster info for: ${abbreviation}`);
  
  // Default broadcaster info if not found
  const defaultInfo: BroadcasterInfo = {
    name: abbreviation,
    logo: '',
    backgroundColor: '#1a1a1a', // Dark background
    textColor: '#ffffff', // White text
  };
  
  // Try to match the abbreviation in a case-insensitive way
  const normalizedAbbreviation = abbreviation.toUpperCase();
  
  // Check if we have a direct match
  if (broadcasterMap[normalizedAbbreviation]) {
    const info = broadcasterMap[normalizedAbbreviation];
    console.log(`Found direct match for ${abbreviation}:`, info);
    return info;
  }
  
  // Check if we have a partial match
  for (const [key, value] of Object.entries(broadcasterMap)) {
    if (normalizedAbbreviation.includes(key) || key.includes(normalizedAbbreviation)) {
      console.log(`Found partial match for ${abbreviation} with ${key}:`, value);
      return value;
    }
  }
  
  console.log(`No broadcaster info found for ${abbreviation}, using default`);
  return defaultInfo;
}
