import os
from collections import deque
from PIL import Image, ImageDraw, ImageFilter

def remove_outer_white_background(img_path, out_path, tolerance=30):
    img = Image.open(img_path).convert('RGBA')
    width, height = img.size
    pixels = img.load()
    
    visited = set()
    queue = deque()
    
    # Add border pixels that are near white
    for x in range(width):
        for y in (0, height - 1):
            r, g, b, a = pixels[x, y]
            if r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance:
                if (x, y) not in visited:
                    queue.append((x, y))
                    visited.add((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if (x, y) not in visited:
                r, g, b, a = pixels[x, y]
                if r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance:
                    queue.append((x, y))
                    visited.add((x, y))
                    
    while queue:
        cx, cy = queue.popleft()
        pixels[cx, cy] = (0, 0, 0, 0)
        
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                r, g, b, a = pixels[nx, ny]
                if r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance:
                    visited.add((nx, ny))
                    queue.append((nx, ny))

    # Auto crop to bounding box with padding
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, 'PNG')
    print(f'Processed {out_path} - Size: {img.size}')

brain = r'C:\Users\bhava\.gemini\antigravity-ide\brain\19319677-9e30-4e5f-bf39-aa3381300c24'

# Process existing generated images
assets = [
    ('player_volunteer_1789713982524.jpg', r'src\assets\images\characters\player.png'),
    ('modak_collectible_1789714007692.jpg', r'src\assets\images\collectibles\modak.png'),
    ('flower_collectible_1789714034605.jpg', r'src\assets\images\collectibles\flower.png'),
    ('durva_collectible_1789714056292.jpg', r'src\assets\images\collectibles\durva.png'),
    ('coconut_collectible_1789714080962.jpg', r'src\assets\images\collectibles\coconut.png')
]

for src_name, dst_path in assets:
    src_file = os.path.join(brain, src_name)
    if os.path.exists(src_file):
        remove_outer_white_background(src_file, dst_path, 35)
    else:
        print(f"Missing: {src_file}")

print("Batch processing complete.")
