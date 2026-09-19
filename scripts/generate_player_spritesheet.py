"""
Generate player_spritesheet.png (256x320, 4 columns x 5 rows, 64x64 per frame)
Matching the Indian young devotee holding pooja thali.
Rows:
 0: Walk Down  (4 frames)
 1: Walk Left  (4 frames)
 2: Walk Right (4 frames)
 3: Walk Up    (4 frames - back view)
 4: Idle       (4 frames - front breathing/flame flicker)
"""

from PIL import Image, ImageDraw

FRAME_W = 64
FRAME_H = 64
COLS = 4
ROWS = 5
SHEET_W = COLS * FRAME_W # 256
SHEET_H = ROWS * FRAME_H # 320

orig = Image.open('src/assets/images/characters/player.png').convert('RGBA')
bbox = orig.getbbox()
char_crop = orig.crop(bbox)

TARGET_H = 58
aspect = char_crop.width / char_crop.height
TARGET_W = int(round(TARGET_H * aspect)) # ~28
char_base = char_crop.resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)

sheet = Image.new('RGBA', (SHEET_W, SHEET_H), (0, 0, 0, 0))

def paste_centered(target, frame_img, col, row, offset_x=0, offset_y=0):
    dest_x = col * FRAME_W + (FRAME_W - frame_img.width) // 2 + offset_x
    dest_y = row * FRAME_H + (FRAME_H - frame_img.height) // 2 + offset_y
    target.paste(frame_img, (dest_x, dest_y), frame_img)

# -------------------------------------------------------------
# 1. GENERATE WALK DOWN (Row 0, frames 0-3)
# -------------------------------------------------------------
for col in range(4):
    bob = [-1, 1, -1, 0][col]
    stride = [-3, 0, 3, 0][col]
    
    f_img = char_base.copy()
    draw = ImageDraw.Draw(f_img)
    
    leg_h = 10
    legs = f_img.crop((0, TARGET_H - leg_h, TARGET_W, TARGET_H))
    draw.rectangle([0, TARGET_H - leg_h, TARGET_W, TARGET_H], fill=(0,0,0,0))
    
    half_w = TARGET_W // 2
    left_leg = legs.crop((0, 0, half_w, leg_h))
    right_leg = legs.crop((half_w, 0, TARGET_W, leg_h))
    
    if stride < 0:
        f_img.paste(left_leg, (0, TARGET_H - leg_h + 1), left_leg)
        f_img.paste(right_leg, (half_w, TARGET_H - leg_h - 1), right_leg)
    elif stride > 0:
        f_img.paste(left_leg, (0, TARGET_H - leg_h - 1), left_leg)
        f_img.paste(right_leg, (half_w, TARGET_H - leg_h + 1), right_leg)
    else:
        f_img.paste(legs, (0, TARGET_H - leg_h), legs)
        
    paste_centered(sheet, f_img, col, 0, offset_y=bob + 1)

# -------------------------------------------------------------
# 2. GENERATE WALK LEFT (Row 1) & WALK RIGHT (Row 2) - 2.5D Isometric Turn
# -------------------------------------------------------------
for col in range(4):
    bob = [-1, 1, -1, 0][col]
    stride = [-3, 0, 3, 0][col]
    
    persp_w = int(TARGET_W * 0.88)
    side_base = char_base.resize((persp_w, TARGET_H), Image.Resampling.LANCZOS)
    
    tilt_angle = [3, 1, -2, 0][col]
    tilted = side_base.rotate(tilt_angle, resample=Image.Resampling.BICUBIC, expand=False)
    
    leg_h = 10
    legs = tilted.crop((0, TARGET_H - leg_h, persp_w, TARGET_H))
    draw = ImageDraw.Draw(tilted)
    draw.rectangle([0, TARGET_H - leg_h, persp_w, TARGET_H], fill=(0,0,0,0))
    
    half_w = persp_w // 2
    foot1 = legs.crop((0, 0, half_w, leg_h))
    foot2 = legs.crop((half_w, 0, persp_w, leg_h))
    
    if stride < 0:
        tilted.paste(foot1, (-1, TARGET_H - leg_h + 1), foot1)
        tilted.paste(foot2, (half_w + 2, TARGET_H - leg_h - 1), foot2)
    elif stride > 0:
        tilted.paste(foot1, (1, TARGET_H - leg_h - 1), foot1)
        tilted.paste(foot2, (half_w - 2, TARGET_H - leg_h + 1), foot2)
    else:
        tilted.paste(legs, (0, TARGET_H - leg_h), legs)
    
    left_walk = tilted.transpose(Image.FLIP_LEFT_RIGHT)
    paste_centered(sheet, left_walk, col, 1, offset_y=bob + 1)
    paste_centered(sheet, tilted, col, 2, offset_y=bob + 1)

# -------------------------------------------------------------
# 3. GENERATE WALK UP (Row 3, frames 0-3) - Back View
# -------------------------------------------------------------
for col in range(4):
    stride = [-2, 1, 2, 0][col]
    bob = [-1, 1, -1, 0][col]
    
    up_img = char_base.copy()
    draw = ImageDraw.Draw(up_img)
    cx = TARGET_W // 2
    
    # 1. Back of Hair
    draw.ellipse([cx - 10, 6, cx + 10, 23], fill=(42, 24, 20, 255))
    draw.chord([cx - 11, 8, cx + 11, 24], start=180, end=360, fill=(58, 34, 28, 255))
    draw.arc([cx - 8, 8, cx + 8, 18], start=200, end=340, fill=(78, 48, 40, 255), width=2)
    draw.polygon([(cx - 7, 21), (cx + 7, 21), (cx + 4, 25), (cx - 4, 25)], fill=(42, 24, 20, 255))
    draw.ellipse([cx - 12, 14, cx - 9, 20], fill=(235, 175, 140, 255))
    draw.ellipse([cx + 9, 14, cx + 12, 20], fill=(235, 175, 140, 255))
    
    # 2. Kurta back
    kurta_top = 24
    kurta_bot = TARGET_H - 12
    draw.rounded_rectangle([cx - 11, kurta_top, cx + 11, kurta_bot], radius=4, fill=(245, 184, 22, 255), outline=(195, 135, 12, 255))
    draw.line([(cx, kurta_top + 2), (cx, kurta_bot)], fill=(215, 148, 14, 255), width=2)
    draw.line([(cx - 9, kurta_bot - 2), (cx + 9, kurta_bot - 2)], fill=(255, 215, 50, 255), width=2)
    
    # 3. Maroon Shawl
    shawl_pts = [
        (cx - 10, kurta_top),
        (cx - 4, kurta_top),
        (cx + 9, kurta_bot + 1),
        (cx + 3, kurta_bot + 1)
    ]
    draw.polygon(shawl_pts, fill=(131, 32, 53, 255))
    draw.line([(cx - 4, kurta_top), (cx + 9, kurta_bot + 1)], fill=(255, 215, 0, 255), width=1)
    
    # 4. Dhoti & Alternating Feet walking away
    dhoti_y = TARGET_H - 14
    draw.rectangle([cx - 8, dhoti_y, cx + 8, TARGET_H], fill=(0,0,0,0))
    draw.polygon([(cx - 8, dhoti_y), (cx + 8, dhoti_y), (cx + 7, TARGET_H - 6), (cx - 7, TARGET_H - 6)], fill=(245, 245, 250, 255))
    draw.line([(cx, dhoti_y), (cx, TARGET_H - 6)], fill=(210, 210, 220, 255), width=1)
    
    foot1_y = TARGET_H - 5 + (2 if stride > 0 else 0)
    foot2_y = TARGET_H - 5 + (2 if stride < 0 else 0)
    draw.ellipse([cx - 7, foot1_y, cx - 2, foot1_y + 4], fill=(121, 77, 44, 255))
    draw.ellipse([cx + 2, foot2_y, cx + 7, foot2_y + 4], fill=(121, 77, 44, 255))
    
    paste_centered(sheet, up_img, col, 3, offset_y=bob + 1)

# -------------------------------------------------------------
# 4. GENERATE IDLE (Row 4, frames 0-3) - Front View
# -------------------------------------------------------------
for col in range(4):
    idle_img = char_base.copy()
    breath_offset = [0, -1, -1, 0][col]
    
    draw = ImageDraw.Draw(idle_img)
    flame_x = TARGET_W // 2
    flame_y = 35 + breath_offset
    flame_h = [3, 5, 6, 4][col]
    draw.ellipse([flame_x - 3, flame_y - flame_h - 1, flame_x + 3, flame_y + 1], fill=(255, 170 + col * 20, 0, 200))
    draw.ellipse([flame_x - 2, flame_y - flame_h, flame_x + 2, flame_y], fill=(255, 220, 50, 255))
    draw.ellipse([flame_x - 1, flame_y - flame_h + 1, flame_x + 1, flame_y - 1], fill=(255, 255, 220, 255))
    
    paste_centered(sheet, idle_img, col, 4, offset_y=breath_offset + 1)

out_path = 'src/assets/images/characters/player_spritesheet.png'
sheet.save(out_path, format='PNG')
print(f'Successfully updated {out_path} ({SHEET_W}x{SHEET_H})')
