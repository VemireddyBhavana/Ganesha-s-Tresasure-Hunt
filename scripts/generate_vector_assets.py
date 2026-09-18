import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_diya(out_path):
    size = 256
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Outer glow
    for r in range(70, 20, -5):
        alpha = int((70 - r) * 1.8)
        draw.ellipse([128 - r, 75 - r//2, 128 + r, 75 + r//2], fill=(255, 170, 0, alpha))
        
    # Diya brass base (ellipse & curved bottom)
    draw.ellipse([60, 110, 196, 170], fill=(184, 115, 20, 255), outline=(130, 75, 10), width=3)
    draw.ellipse([65, 113, 191, 155], fill=(220, 155, 35, 255))
    draw.ellipse([75, 118, 181, 145], fill=(160, 95, 15, 255))
    # Oil pool
    draw.ellipse([85, 122, 171, 140], fill=(120, 60, 10, 255))
    
    # Flame tip / wick
    draw.line([(128, 128), (128, 100)], fill=(40, 20, 10, 255), width=3)
    
    # Outer flame
    draw.polygon([(128, 40), (145, 85), (140, 105), (128, 112), (116, 105), (111, 85)], fill=(255, 90, 0, 240))
    # Mid flame
    draw.polygon([(128, 52), (140, 88), (136, 103), (128, 108), (120, 103), (116, 88)], fill=(255, 190, 0, 255))
    # Inner flame (white-hot core)
    draw.polygon([(128, 65), (134, 90), (132, 100), (128, 104), (124, 100), (122, 90)], fill=(255, 255, 220, 255))
    
    # Highlight on brass
    draw.arc([68, 120, 188, 162], start=20, end=160, fill=(255, 220, 100, 220), width=3)
    
    img.save(out_path, 'PNG')
    print(f"Created {out_path}")

def create_rock(out_path):
    size = 256
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Shadow
    draw.ellipse([45, 150, 215, 210], fill=(20, 40, 20, 90))
    
    # Boulder shape
    boulder_points = [
        (65, 150), (55, 120), (75, 80), (120, 65), (170, 70), (205, 95), (210, 140), (195, 175), (135, 185), (75, 175)
    ]
    draw.polygon(boulder_points, fill=(110, 115, 120, 255), outline=(65, 70, 75, 255))
    
    # Facets / Shading
    facet1 = [(120, 65), (170, 70), (150, 120), (110, 115)]
    draw.polygon(facet1, fill=(140, 145, 150, 255))
    
    facet2 = [(75, 80), (120, 65), (110, 115), (70, 120)]
    draw.polygon(facet2, fill=(125, 130, 135, 255))
    
    facet3 = [(110, 115), (150, 120), (195, 175), (135, 185)]
    draw.polygon(facet3, fill=(85, 90, 95, 255))
    
    # Green moss patches
    draw.ellipse([65, 130, 95, 155], fill=(70, 120, 45, 220))
    draw.ellipse([140, 140, 175, 165], fill=(80, 135, 50, 200))
    
    img.save(out_path, 'PNG')
    print(f"Created {out_path}")

def create_tree(out_path):
    size = 384
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Shadow
    draw.ellipse([60, 260, 324, 350], fill=(20, 45, 20, 90))
    
    # Trunk
    draw.polygon([(165, 220), (160, 300), (145, 320), (235, 320), (220, 300), (215, 220)], fill=(95, 55, 25, 255))
    # Bark texture lines
    draw.line([(180, 230), (175, 305)], fill=(65, 35, 15, 255), width=3)
    draw.line([(200, 235), (205, 305)], fill=(65, 35, 15, 255), width=3)
    
    # Canopy foliage clusters (multi-layered greens)
    clusters = [
        # (x, y, r, color)
        (130, 180, 75, (45, 115, 40, 255)),
        (254, 180, 75, (45, 115, 40, 255)),
        (192, 130, 85, (55, 135, 45, 255)),
        (145, 145, 65, (65, 155, 55, 255)),
        (240, 145, 65, (65, 155, 55, 255)),
        (192, 110, 70, (80, 180, 65, 255)),
        (170, 160, 60, (60, 145, 50, 255)),
        (215, 160, 60, (70, 165, 60, 255)),
    ]
    for cx, cy, r, col in clusters:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
        
    # Highlights & leaves
    for cx, cy, r, col in clusters[:4]:
        draw.arc([cx - r + 8, cy - r + 8, cx + r - 8, cy + r - 8], start=200, end=340, fill=(130, 220, 90, 180), width=4)
        
    # Festive marigold garland (toran) hanging across the tree
    for i in range(12):
        t = i / 11.0
        gx = 110 + t * 164
        gy = 175 + math.sin(t * math.pi) * 35
        draw.ellipse([gx - 5, gy - 5, gx + 5, gy + 5], fill=(255, 140, 0, 255))
        draw.ellipse([gx - 2, gy - 2, gx + 2, gy + 2], fill=(255, 215, 0, 255))
        
    img.save(out_path, 'PNG')
    print(f"Created {out_path}")

def create_temple(out_path):
    size = 384
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Base shadow
    draw.ellipse([40, 290, 344, 360], fill=(25, 40, 20, 90))
    
    # Stone Plinth / steps
    draw.rectangle([50, 280, 334, 320], fill=(200, 160, 110, 255), outline=(130, 90, 50), width=3)
    draw.rectangle([70, 255, 314, 280], fill=(220, 180, 130, 255), outline=(130, 90, 50), width=3)
    draw.rectangle([90, 230, 294, 255], fill=(235, 195, 145, 255), outline=(130, 90, 50), width=3)
    
    # Pillars
    draw.rectangle([110, 150, 135, 230], fill=(210, 165, 115, 255), outline=(120, 80, 40), width=2)
    draw.rectangle([249, 150, 274, 230], fill=(210, 165, 115, 255), outline=(120, 80, 40), width=2)
    
    # Inner Sanctum / Garbhagriha
    draw.rectangle([135, 160, 249, 230], fill=(80, 35, 15, 255))
    # Glowing Diya inside sanctum
    draw.ellipse([180, 200, 204, 215], fill=(255, 170, 0, 255))
    draw.polygon([(192, 185), (198, 200), (186, 200)], fill=(255, 240, 180, 255))
    
    # Shikhar / Spire
    draw.polygon([(192, 35), (280, 150), (104, 150)], fill=(215, 120, 40, 255), outline=(140, 60, 15), width=3)
    # Spire tiers
    draw.line([(120, 125), (264, 125)], fill=(245, 160, 60, 255), width=4)
    draw.line([(140, 95), (244, 95)], fill=(245, 160, 60, 255), width=4)
    draw.line([(160, 65), (224, 65)], fill=(245, 160, 60, 255), width=4)
    
    # Golden Kalash on top
    draw.ellipse([182, 20, 202, 38], fill=(255, 205, 30, 255), outline=(180, 130, 10), width=2)
    draw.polygon([(192, 5), (196, 22), (188, 22)], fill=(255, 225, 60, 255))
    
    # Saffron Flag (Bhagwa Dhwaj)
    draw.polygon([(194, 5), (235, 16), (194, 28)], fill=(255, 100, 0, 255))
    
    # Marigold Garlands across arch
    for gx in range(112, 272, 14):
        draw.ellipse([gx - 4, 150 - 4, gx + 4, 150 + 4], fill=(255, 140, 0, 255))
        draw.ellipse([gx - 2, 150 - 2, gx + 2, 150 + 2], fill=(255, 220, 0, 255))
        
    img.save(out_path, 'PNG')
    print(f"Created {out_path}")

def create_plastic_waste(out_path):
    size = 192
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Shadow
    draw.ellipse([30, 120, 160, 160], fill=(20, 30, 20, 70))
    # Crinkled plastic bottle
    draw.polygon([(50, 110), (130, 90), (145, 105), (135, 130), (55, 145)], fill=(120, 180, 240, 200), outline=(60, 120, 180), width=2)
    # Bottle cap (red)
    draw.rectangle([138, 92, 148, 108], fill=(220, 40, 40, 255))
    # Discarded chips packet
    draw.polygon([(70, 70), (115, 65), (125, 105), (80, 115)], fill=(240, 180, 40, 255), outline=(180, 120, 20), width=2)
    # Recyling prohibition / warning line
    draw.line([(85, 78), (110, 102)], fill=(220, 30, 30, 255), width=3)
    img.save(out_path, 'PNG')
    print(f"Created {out_path}")

create_diya(r'src\assets\images\collectibles\diya.png')
create_rock(r'src\assets\images\obstacles\rock.png')
create_tree(r'src\assets\images\tiles\tree.png')
create_temple(r'src\assets\images\tiles\temple.png')
create_plastic_waste(r'src\assets\images\obstacles\plastic_waste.png')
