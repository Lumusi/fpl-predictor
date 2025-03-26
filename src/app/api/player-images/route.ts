import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

/**
 * API route to check if player images exist
 * GET /api/player-images?id=123456
 * GET /api/player-images/list - Lists all available player images
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const listImages = searchParams.get('list') === 'true';
  
  // Base path for player images
  const playersDir = path.join(process.cwd(), 'players');
  
  // If no players directory exists, return an error
  if (!fs.existsSync(playersDir)) {
    return NextResponse.json(
      { error: 'Players directory not found', path: playersDir },
      { status: 404 }
    );
  }
  
  // List all available player images
  if (listImages) {
    try {
      const files = fs.readdirSync(playersDir);
      const playerImages = files
        .filter(file => file.endsWith('.png'))
        .map(file => file.replace('.png', ''));
      
      return NextResponse.json({
        success: true,
        count: playerImages.length,
        playerImages
      });
    } catch (error) {
      console.error('Error listing player images:', error);
      return NextResponse.json(
        { error: 'Error listing player images' },
        { status: 500 }
      );
    }
  }
  
  // Check if a specific player image exists
  if (id) {
    const imagePath = path.join(playersDir, `${id}.png`);
    const exists = fs.existsSync(imagePath);
    
    return NextResponse.json({
      success: true,
      id,
      exists,
      path: exists ? `/players/${id}.png` : null
    });
  }
  
  // If no ID or list parameter provided, return an error
  return NextResponse.json(
    { error: 'Please provide either an id parameter or list=true' },
    { status: 400 }
  );
} 