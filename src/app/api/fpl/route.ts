import { NextResponse } from 'next/server';
import axios from 'axios';

const FPL_API_URL = 'https://fantasy.premierleague.com/api';

export async function GET(request: Request) {
  try {
    // Get the path parameter from the URL
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }
    
    // Make the request to the FPL API
    const response = await axios.get(`${FPL_API_URL}/${endpoint}`);
    
    // Return the data
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error proxying request to FPL API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from FPL API' }, 
      { status: 500 }
    );
  }
} 