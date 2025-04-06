import json
import re

def extract_set_piece_data():
    with open('fpl_set_piece_takers.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Dictionary to store the structured data
    set_piece_data = {}
    
    # Identify all club sections
    clubs = ["Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton", "Chelsea", 
             "Crystal Palace", "Everton", "Fulham", "Ipswich", "Leicester", "Liverpool", 
             "Man City", "Man Utd", "Newcastle", "Nott'm Forest", "Southampton", "Spurs", 
             "West Ham", "Wolves"]
    
    for i, club in enumerate(clubs):
        # Get the section for this club
        club_pattern = f"{club}\\s*\\nPenalties"
        start_idx = re.search(club_pattern, content)
        
        if start_idx:
            start_pos = start_idx.start()
            
            # Find the end of this club's section (start of next club or end of set piece section)
            end_pos = len(content)
            if i < len(clubs) - 1:
                next_club_pattern = f"{clubs[i+1]}\\s*\\nPenalties"
                next_start = re.search(next_club_pattern, content)
                if next_start:
                    end_pos = next_start.start()
            
            # Get this club's section
            club_section = content[start_pos:end_pos]
            
            # Initialize club data
            set_piece_data[club] = {
                'penalties': [],
                'direct_free_kicks': [],
                'corners_indirect_free_kicks': [],
                'notes': []
            }
            
            # Extract penalties
            penalties_match = re.search(r"Penalties\s*\n((?:.*\n)+?)Direct free-kicks", club_section)
            if penalties_match:
                penalties_text = penalties_match.group(1).strip()
                set_piece_data[club]['penalties'] = [p.strip() for p in penalties_text.split('\n') if p.strip()]
            
            # Extract direct free-kicks
            free_kicks_match = re.search(r"Direct free-kicks\s*\n((?:.*\n)+?)Corners & indirect free-kicks", club_section)
            if free_kicks_match:
                free_kicks_text = free_kicks_match.group(1).strip()
                set_piece_data[club]['direct_free_kicks'] = [fk.strip() for fk in free_kicks_text.split('\n') if fk.strip()]
            
            # Extract corners & indirect free-kicks
            corners_match = re.search(r"Corners & indirect free-kicks\s*\n((?:.*\n)+?)(?:\n\n|\Z)", club_section)
            if corners_match:
                corners_text = corners_match.group(1).strip()
                
                # Separate the corner takers from the notes
                corners_lines = corners_text.split('\n')
                corner_takers = []
                notes = []
                
                # Assume short player names are the takers, longer lines are notes
                in_notes = False
                for line in corners_lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Check if this is a player name (typically short) or a note (typically longer)
                    words = line.split()
                    if len(words) <= 2 and not in_notes:
                        corner_takers.append(line)
                    else:
                        in_notes = True
                        notes.append(line)
                
                set_piece_data[club]['corners_indirect_free_kicks'] = corner_takers
                set_piece_data[club]['notes'] = notes
    
    # Save the structured data to a JSON file
    with open('set_piece_takers_structured.json', 'w', encoding='utf-8') as f:
        json.dump(set_piece_data, f, indent=4, ensure_ascii=False)
    
    print("Structured set piece data extracted and saved to set_piece_takers_structured.json")

if __name__ == "__main__":
    extract_set_piece_data() 