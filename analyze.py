import os
import argparse
from PIL import Image, ImageFilter, ImageDraw, ImageFont

def analyze_frame(image_path, output_dir):
    """
    Performs standard computer vision analysis on a single highway frame.
    1. Edge Detection (FIND_EDGES)
    2. Brightness & Contrast analysis
    3. Simulated YOLO Object Detection (draws bounding boxes for trucks/cars)
    4. Simulated Lane Segmentation (draws green overlay on lane lines)
    """
    if not os.path.exists(image_path):
        print(f"Error: Input file {image_path} does not exist.")
        return

    # Load original image
    img = Image.open(image_path).convert("RGB")
    width, height = img.size
    print(f"Processing image: {image_path} ({width}x{height})")

    # Make output directory
    os.makedirs(output_dir, exist_ok=True)
    basename = os.path.splitext(os.path.basename(image_path))[0]

    # --- Step 1: Raw Copy ---
    raw_path = os.path.join(output_dir, f"{basename}_1_raw.jpg")
    img.save(raw_path)

    # --- Step 2: Sobel Edge Filtering ---
    # Convert to grayscale first for standard edge analysis
    gray_img = img.convert("L")
    edges = gray_img.filter(ImageFilter.FIND_EDGES)
    # Enhance contrast of edges to make them pop
    edges = edges.point(lambda p: p * 3 if p * 3 < 255 else 255)
    edge_path = os.path.join(output_dir, f"{basename}_2_edges.jpg")
    edges.save(edge_path)

    # --- Step 3: Brightness / Contrast Analysis ---
    # Calculate average pixel intensity using flat bytes array (future-proof & no dependencies)
    pixels = list(gray_img.tobytes())
    avg_brightness = sum(pixels) / len(pixels)
    brightness_status = "Daylight" if avg_brightness > 80 else "Night / Low Light"
    if avg_brightness < 40:
        brightness_status = "Very Dark Night"
    
    # Calculate contrast (standard deviation of pixel intensities)
    mean = avg_brightness
    variance = sum((x - mean) ** 2 for x in pixels) / len(pixels)
    std_dev = variance ** 0.5
    
    # Low standard deviation in brightness indicates fog/low contrast
    fog_index = "Clear"
    if std_dev < 30 and avg_brightness > 100:
        fog_index = "Dense Fog Warning"
    elif std_dev < 45 and avg_brightness > 90:
        fog_index = "Moderate Fog/Overcast"

    print(f"Metrics - Average Brightness: {avg_brightness:.2f} ({brightness_status})")
    print(f"Metrics - Contrast (Std Dev): {std_dev:.2f} ({fog_index})")

    # --- Step 4: Simulated YOLO Object Detection & Lane Segmentation ---
    annotated_img = img.copy()
    draw = ImageDraw.Draw(annotated_img, "RGBA")

    # Simulate Lane Lines (typical highway lanes converging toward horizon)
    # Assume horizon is at 55% of image height
    horizon_y = int(height * 0.55)
    bottom_y = height
    
    # Left Lane Line
    draw.line([(int(width * 0.45), horizon_y), (int(width * 0.15), bottom_y)], fill=(0, 255, 0, 180), width=6)
    # Right Lane Line
    draw.line([(int(width * 0.55), horizon_y), (int(width * 0.85), bottom_y)], fill=(0, 255, 0, 180), width=6)
    # Drivable area overlay (polygon between lanes)
    draw.polygon([
        (int(width * 0.45), horizon_y),
        (int(width * 0.55), horizon_y),
        (int(width * 0.85), bottom_y),
        (int(width * 0.15), bottom_y)
    ], fill=(0, 255, 0, 40))

    # Simulate Vehicle Detections (bounding boxes)
    # Box 1: A truck in the right-hand lane (larger box, closer)
    truck_box = [int(width * 0.58), int(height * 0.58), int(width * 0.78), int(height * 0.85)]
    draw.rectangle(truck_box, outline=(255, 0, 0, 255), width=3)
    draw.rectangle([truck_box[0], truck_box[1] - 20, truck_box[0] + 120, truck_box[1]], fill=(255, 0, 0, 255))
    draw.text((truck_box[0] + 5, truck_box[1] - 18), "TRUCK: 94.6%", fill=(255, 255, 255))

    # Box 2: A car in the left lane (smaller box, further away)
    car_box = [int(width * 0.38), int(height * 0.56), int(width * 0.46), int(height * 0.68)]
    draw.rectangle(car_box, outline=(0, 120, 255, 255), width=3)
    draw.rectangle([car_box[0], car_box[1] - 20, car_box[0] + 90, car_box[1]], fill=(0, 120, 255, 255))
    draw.text((car_box[0] + 5, car_box[1] - 18), "CAR: 89.2%", fill=(255, 255, 255))

    # Write telemetry summary on image
    draw.rectangle([10, 10, 320, 110], fill=(0, 0, 0, 180))
    draw.text((20, 20), f"ROUTE: I-5 California Corridor", fill=(255, 255, 255))
    draw.text((20, 40), f"LIGHTING: {brightness_status} ({avg_brightness:.1f})", fill=(255, 255, 255))
    draw.text((20, 60), f"VISIBILITY: {fog_index}", fill=(255, 255, 255))
    draw.text((20, 80), f"VEHICLES DETECTED: 2", fill=(255, 255, 255))

    annotated_path = os.path.join(output_dir, f"{basename}_3_analyzed.jpg")
    annotated_img.save(annotated_path)

    print(f"Saved raw image to: {raw_path}")
    print(f"Saved edge-filtered image to: {edge_path}")
    print(f"Saved annotated image to: {annotated_path}")
    print("Frame analysis completed successfully.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Highway 5 AI Video/Frame Analysis Pipeline")
    parser.add_argument("--input", required=True, help="Path to input image file (e.g. frame.jpg)")
    parser.add_argument("--output-dir", default="./output", help="Directory to save analyzed images")
    args = parser.parse_args()
    
    analyze_frame(args.input, args.output_dir)
