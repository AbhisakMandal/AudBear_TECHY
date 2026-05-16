import os
import re

TEMPLATE_DIR = r'd:\PERSONAL\PROJECTS\03. Microservices\AudBear Techy\audbear_techy\templates\resume\template_html'

def analyze_shapes():
    shapes = {}
    
    for i in range(1, 64):
        filename = f'template_{i:02d}.html'
        filepath = os.path.join(TEMPLATE_DIR, filename)
        
        if not os.path.exists(filepath):
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Find the photo container style
            # Usually .profile-photo or .photo-container
            style_match = re.search(r'\.(?:profile-photo|photo|profile-image|image-container|avatar)[^\{]*\{(.*?)\}', content, re.IGNORECASE | re.DOTALL)
            
            if style_match:
                style_block = style_match.group(1).lower()
                
                # Check for clip-path (complex shapes)
                clip_match = re.search(r'clip-path:\s*([^;\}]+)', style_block)
                # Check for border-radius (rounded shapes)
                radius_match = re.search(r'border-radius:\s*([^;\}]+)', style_block)
                
                shape_key = "Standard Square"
                
                if clip_match:
                    clip_val = clip_match.group(1).strip()
                    if 'polygon' in clip_val:
                        # Identify polygon types
                        if '50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%' in clip_val:
                            shape_key = "Pentagon"
                        elif '50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%' in clip_val:
                            shape_key = "Hexagon"
                        elif '0% 15%, 50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%' in clip_val:
                            shape_key = "Elongated Hexagon (Diamond-Top)"
                        else:
                            shape_key = f"Custom Polygon ({clip_val[:30]}...)"
                    elif 'circle' in clip_val:
                        shape_key = "Circle (Clip)"
                    elif 'ellipse' in clip_val:
                        shape_key = "Ellipse"
                elif radius_match:
                    radius_val = radius_match.group(1).strip()
                    if '50%' in radius_val:
                        shape_key = "Perfect Circle"
                    elif '100%' in radius_val:
                        shape_key = "Perfect Circle"
                    elif '/' in radius_val:
                        shape_key = "Organic Blob"
                    elif any(x in radius_val for x in ['px', 'rem', 'em', '%']):
                        # Extract the numeric value
                        num = re.findall(r'\d+', radius_val)
                        if num and int(num[0]) > 0:
                            shape_key = f"Soft Rounded Square ({radius_val})"
                        else:
                            shape_key = "Square"
                else:
                    shape_key = "Square"
                
                if shape_key not in shapes:
                    shapes[shape_key] = []
                shapes[shape_key].append(i)
            else:
                # Fallback for templates without specific photo styles
                if "Square (None)" not in shapes: shapes["Square (None)"] = []
                shapes["Square (None)"].append(i)

    print("\n" + "="*50)
    print("PROFESSIONAL IMAGE BORDER SHAPE ANALYSIS")
    print("="*50)
    total_unique = len(shapes)
    print(f"Total Number of Different Shapes: {total_unique}")
    print("-"*50)
    
    for shape, templates in shapes.items():
        print(f"Shape Name: {shape}")
        print(f"Used in Templates: {', '.join(map(str, templates))}")
        print(f"Count: {len(templates)}")
        print("-"*30)

if __name__ == "__main__":
    analyze_shapes()
