import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import https from 'https';

const FPL_SET_PIECE_API_URL = 'https://fantasy.premierleague.com/api/team/set-piece-notes/';
const OUTPUT_FILE = path.resolve(process.cwd(), 'set-piece-data.json');

// Define types for the set piece data
interface TeamSetPieceNote {
  info_message: string;
  external_link: boolean;
  source_link: string;
}

interface TeamSetPieceData {
  id: number;
  notes: TeamSetPieceNote[];
}

interface SetPieceData {
  last_updated: string;
  teams: TeamSetPieceData[];
}

// Helper function to fetch data from the FPL API
const fetchSetPieceData = (): Promise<SetPieceData> => {
  return new Promise((resolve, reject) => {
    https.get(FPL_SET_PIECE_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
      }
    }, (res) => {
      let data = '';

      // A chunk of data has been received
      res.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API request failed with status code: ${res.statusCode}`));
          return;
        }

        try {
          // Parse the JSON data
          const jsonData = JSON.parse(data) as SetPieceData;
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

/**
 * API route to manually update set piece data by fetching from the FPL API
 * This can be called periodically or by an admin to force updates
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Manual update of set piece data requested');
    
    // Fetch the latest data from the FPL API
    const data = await fetchSetPieceData();
    
    // Update the timestamp
    data.last_updated = new Date().toISOString();
    
    // Save the data to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data));
    console.log(`Set piece data saved to ${OUTPUT_FILE}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Set piece data successfully updated',
      timestamp: data.last_updated
    });
  } catch (error: any) {
    console.error('Error updating set piece data:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update set piece data',
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 