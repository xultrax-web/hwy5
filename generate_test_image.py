import os
from PIL import Image, ImageDraw

def generate_mock_highway():
    """
    Generates a synthetic highway image (sample_frame.jpg) to test the analysis pipeline.
    """
    width, height = 800, 450
    img = Image.new("RGB", (width, height), (135, 206, 235)) # Sky blue
    draw = ImageDraw.Draw(img)

    # Draw distant mountains/hills
    draw.polygon([(0, 250), (250, 180), (450, 230), (600, 190), (800, 250)], fill=(34, 139, 34)) # Forest green hills
    draw.rectangle([0, 250, width, height], fill=(128, 128, 128)) # Grey road/ground base

    # Draw lane lines converging to horizon at (400, 230)
    horizon_y = 230
    
    # Left road shoulder
    draw.line([(380, horizon_y), (0, 450)], fill=(255, 255, 255), width=4)
    # Right road shoulder
    draw.line([(420, horizon_y), (800, 450)], fill=(255, 255, 255), width=4)
    
    # Center dashed lane divider
    for i in range(10):
        # Calculate segments converging towards center
        start_ratio = (i / 10) ** 2
        end_ratio = ((i + 0.5) / 10) ** 2
        
        y1 = int(horizon_y + (450 - horizon_y) * start_ratio)
        y2 = int(horizon_y + (450 - horizon_y) * end_ratio)
        
        x1 = 400
        x2 = 400
        
        draw.line([(x1, y1), (x2, y2)], fill=(255, 255, 255), width=3)

    # Draw a simulated red truck in the right-hand lane (close)
    # Bounding box coordinates: [x_min, y_min, x_max, y_max]
    draw.rectangle([480, 260, 640, 380], fill=(200, 30, 30)) # Red truck cabin
    draw.rectangle([510, 350, 540, 380], fill=(20, 20, 20)) # Tire 1
    draw.rectangle([580, 350, 610, 380], fill=(20, 20, 20)) # Tire 2

    # Draw a simulated blue car in the left lane (medium distance)
    draw.rectangle([280, 250, 340, 300], fill=(30, 100, 200)) # Blue car body
    draw.rectangle([290, 295, 300, 302], fill=(20, 20, 20)) # Tire 1
    draw.rectangle([320, 295, 330, 302], fill=(20, 20, 20)) # Tire 2

    # Save mock image
    output_path = "C:/Dev/hwy5/sample_frame.jpg"
    img.save(output_path)
    print(f"Generated synthetic test image: {output_path}")

if __name__ == "__main__":
    generate_mock_highway()
