import json
from urllib.parse import quote

def main():
    with open('src/lib/services/catalog.json', 'r', encoding='utf-8') as f:
        services = json.load(f)

    for i, s in enumerate(services):
        name = s['name']
        tier = s.get('tier', '')
        category = s.get('category', '')
        
        query_parts = ['realistic salon stock photo of']
        if 'Kid' in name or 'Little Champ' in name:
            query_parts.append('cute young boy kid getting haircut')
        elif tier == 'Men':
            if 'Facial' in name or 'Clean Up' in name:
                query_parts.append('man getting relaxing facial skin care treatment')
            elif 'Shave' in name or 'Beard' in name:
                query_parts.append('man getting professional beard shave by barber')
            elif 'Haircut' in name:
                query_parts.append('handsome man getting modern haircut at barbershop')
            elif 'Color' in name or 'Highlights' in name:
                query_parts.append('man getting hair color treatment')
            elif 'Massage' in name:
                query_parts.append('man getting relaxing head massage')
            elif 'Spa' in name:
                query_parts.append('man getting hair spa treatment')
            else:
                query_parts.append(f'man getting {name.lower()}')
        elif tier == 'Women':
            if 'Facial' in name or 'Clean Up' in name:
                query_parts.append('beautiful woman getting relaxing facial mask skin care')
            elif 'Waxing' in name:
                query_parts.append('woman getting professional waxing')
            elif 'Haircut' in name:
                query_parts.append('beautiful woman getting stylish haircut')
            elif 'Color' in name or 'Highlights' in name:
                query_parts.append('woman getting beautiful hair coloring highlights')
            elif 'Spa' in name:
                query_parts.append('woman getting relaxing hair spa cream treatment')
            elif 'Massage' in name:
                query_parts.append('woman getting relaxing head massage')
            elif 'Make Up' in name or 'Bridal' in name:
                query_parts.append('woman getting professional makeup cosmetics')
            elif 'Pedicure' in name or 'Manicure' in name:
                query_parts.append('woman getting professional pedicure manicure nails')
            elif 'Threading' in name:
                query_parts.append('woman getting professional eyebrow threading')
            elif 'Straightening' in name or 'Smoothening' in name:
                query_parts.append('woman getting smooth straight hair treatment')
            else:
                query_parts.append(f'woman getting {name.lower()}')
        else:
            query_parts.append(f'{name}')
            
        prompt = " ".join(query_parts)
        # Using a fixed seed based on the service id so it doesn't change on every page load
        seed = 1000 + i
        encoded_prompt = quote(prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=600&height=400&nologo=true&seed={seed}&model=flux"
        
        s['image_url'] = url

    with open('src/lib/services/catalog.json', 'w', encoding='utf-8') as f:
        json.dump(services, f, indent=2)
        
    print("Done applying pollinations.ai URLs.")

if __name__ == "__main__":
    main()
