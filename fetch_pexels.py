import json
import time
import urllib.request
import re
from urllib.parse import quote

def get_pexels_image(query, seen_ids):
    try:
        url = f"https://www.pexels.com/search/{quote(query)}/"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
        
        # Pexels image URLs: https://images.pexels.com/photos/3993434/pexels-photo-3993434.jpeg
        # regex for photo IDs
        ids = re.findall(r'images\.pexels\.com/photos/(\d+)/', html)
        
        for pid in ids:
            if pid not in seen_ids:
                seen_ids.add(pid)
                # Form URL
                img_url = f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w=600"
                return img_url
        
        # If all seen, reuse one
        for pid in ids:
            seen_ids.add(pid)
            return f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w=600"
            
    except Exception as e:
        print(f"Error fetching Pexels for {query}: {e}")
    return None

def main():
    with open('src/lib/services/catalog.json', 'r', encoding='utf-8') as f:
        services = json.load(f)

    seen_ids = set()
    
    for i, s in enumerate(services):
        name = s['name']
        tier = s.get('tier', '')
        category = s.get('category', '')
        
        query_parts = []
        if 'Kid' in name or 'Little Champ' in name:
            query_parts.append('kid boy haircut salon')
        elif tier == 'Men':
            if 'Facial' in name:
                query_parts.append('man facial spa')
            elif 'Shave' in name or 'Beard' in name:
                query_parts.append('man beard shave barber')
            elif 'Haircut' in name:
                query_parts.append('man haircut barbershop')
            elif 'Color' in name:
                query_parts.append('man hair coloring salon')
            elif 'Massage' in name:
                query_parts.append('man head massage spa')
            else:
                query_parts.append(f'man {name.lower()} salon')
        elif tier == 'Women':
            if 'Facial' in name:
                query_parts.append('woman facial skin care')
            elif 'Waxing' in name:
                query_parts.append('woman waxing salon')
            elif 'Haircut' in name:
                query_parts.append('woman getting haircut salon')
            elif 'Color' in name or 'Highlights' in name:
                query_parts.append('woman hair coloring salon')
            elif 'Spa' in name:
                query_parts.append('woman hair spa treatment')
            elif 'Massage' in name:
                query_parts.append('woman head massage spa')
            elif 'Make Up' in name:
                query_parts.append('woman makeup cosmetics salon')
            elif 'Pedicure' in name or 'Manicure' in name:
                query_parts.append('pedicure manicure salon')
            else:
                query_parts.append(f'woman {name.lower()} salon')
        else:
            query_parts.append(f'{name} salon')
            
        query = " ".join(query_parts)
        print(f"[{i+1}/{len(services)}] Fetching for '{s['name']}' -> query: {query}")
        
        url = get_pexels_image(query, seen_ids)
        
        if url:
            s['image_url'] = url
            print(f"  -> Found: {url}")
        else:
            print("  -> Could not find image!")
            
        time.sleep(1)

    with open('src/lib/services/catalog.json', 'w', encoding='utf-8') as f:
        json.dump(services, f, indent=2)
        
    print("Done generating unique Pexels images.")

if __name__ == "__main__":
    main()
