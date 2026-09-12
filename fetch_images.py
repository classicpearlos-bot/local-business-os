import json
import time
import warnings
warnings.filterwarnings('ignore')

from duckduckgo_search import DDGS

def get_image_for_query(query, seen_urls):
    try:
        results = DDGS().images(
            keywords=query,
            region="wt-wt",
            safesearch="off",
            size="Medium",
            max_results=5,
        )
        for r in results:
            url = r.get("image")
            if url and url not in seen_urls and url.startswith("https"):
                # Filter out low-quality or weird domains if possible
                if any(x in url for x in ['pinterest', 'shutterstock', 'stock', 'freepik', 'pxhere']):
                    continue
                seen_urls.add(url)
                return url
        
        # fallback if all were seen or skipped
        for r in results:
            url = r.get("image")
            if url and url not in seen_urls and url.startswith("https"):
                seen_urls.add(url)
                return url
                
    except Exception as e:
        print(f"Error fetching for {query}: {e}")
    return None

def main():
    with open('src/lib/services/catalog.json', 'r', encoding='utf-8') as f:
        services = json.load(f)

    seen_urls = set()
    
    # Pre-populate seen_urls if any already exist, but user wants ALL replaced with strictly no duplicates
    
    for i, s in enumerate(services):
        name = s['name']
        tier = s.get('tier', '')
        category = s.get('category', '')
        
        # Build a smart query based on the service
        query_parts = []
        if 'Kid' in name or 'Little Champ' in name:
            query_parts.append('kid boy haircut salon')
        elif tier == 'Men':
            if 'Facial' in name:
                query_parts.append('men facial spa')
            elif 'Shave' in name or 'Beard' in name:
                query_parts.append('men beard shave barber')
            elif 'Haircut' in name:
                query_parts.append('men haircut barbershop')
            elif 'Color' in name:
                query_parts.append('men hair coloring salon')
            elif 'Massage' in name:
                query_parts.append('head massage men spa')
            else:
                query_parts.append(f'men {name.lower()} salon')
        elif tier == 'Women':
            if 'Facial' in name:
                query_parts.append('woman facial skin care')
            elif 'Waxing' in name:
                query_parts.append('woman waxing salon')
            elif 'Haircut' in name:
                query_parts.append('woman getting haircut salon')
            elif 'Color' in name or 'Highlights' in name:
                query_parts.append('woman hair color highlights salon')
            elif 'Spa' in name:
                query_parts.append('woman hair spa treatment')
            elif 'Massage' in name:
                query_parts.append('head massage woman spa')
            elif 'Make Up' in name:
                query_parts.append('woman makeup salon')
            elif 'Pedicure' in name or 'Manicure' in name:
                query_parts.append('pedicure manicure salon')
            else:
                query_parts.append(f'woman {name.lower()} salon')
        else:
            query_parts.append(f'{name} salon')
            
        query = " ".join(query_parts) + " high quality photo"
        print(f"[{i+1}/{len(services)}] Fetching for '{s['name']}' -> query: {query}")
        
        url = get_image_for_query(query, seen_urls)
        
        if url:
            s['image_url'] = url
            print(f"  -> Found: {url}")
        else:
            print("  -> Could not find image!")
            
        time.sleep(0.5)  # slight delay to avoid rate limit

    with open('src/lib/services/catalog.json', 'w', encoding='utf-8') as f:
        json.dump(services, f, indent=2)
        
    print("Done generating unique images.")

if __name__ == "__main__":
    main()
