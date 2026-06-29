import os
import argparse
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def hough_lines_detection(image_path, output_dir):
    """
    Performs classic Hough Transform Lane Detection (Udacity Self-Driving Car Project 1 style).
    1. Grayscale & Gaussian Blur
    2. Canny Edge Detection (simulated via Sobel filters)
    3. Region of Interest (ROI) Masking
    4. Hough Line Transform (identifying line segments)
    5. Extrapolating and drawing left and right lanes
    """
    if not os.path.exists(image_path):
        print(f"Error: Input file {image_path} does not exist.")
        return

    # Load original image
    img = Image.open(image_path).convert("RGB")
    width, height = img.size
    print(f"Processing image for Hough Lanes: {width}x{height}")

    # Make output directory
    os.makedirs(output_dir, exist_ok=True)
    basename = os.path.splitext(os.path.basename(image_path))[0]

    # --- Step 1: Grayscale & Gaussian Blur ---
    gray = img.convert("L")
    blurred = gray.filter(ImageFilter.GaussianBlur(radius=2))

    # --- Step 2: Edge Detection ---
    # Apply Pillow's FIND_EDGES (Sobel-like Canny edge filter)
    edges = blurred.filter(ImageFilter.FIND_EDGES)
    # Threshold the edges to get a binary mask
    edges_np = np.array(edges)
    binary_edges = np.zeros_like(edges_np)
    binary_edges[edges_np > 30] = 255

    # --- Step 3: Region of Interest (ROI) Masking ---
    # Mask out everything except the triangular lane area in front of the car
    roi_mask = np.zeros_like(binary_edges)
    
    # Define triangle vertices
    poly_pts = np.array([
        [int(width * 0.10), height],        # Bottom-Left
        [int(width * 0.45), int(height * 0.60)], # Top-Left
        [int(width * 0.55), int(height * 0.60)], # Top-Right
        [int(width * 0.90), height]         # Bottom-Right
    ], dtype=np.int32)
    
    # Fill mask
    mask_img = Image.new("L", (width, height), 0)
    draw_mask = ImageDraw.Draw(mask_img)
    draw_mask.polygon([tuple(p) for p in poly_pts], fill=255)
    roi_mask = np.array(mask_img)
    
    # Apply mask
    masked_edges = np.bitwise_and(binary_edges, roi_mask)
    
    # Save masked edges for inspection
    edges_out = Image.fromarray(masked_edges)
    edges_path = os.path.join(output_dir, f"{basename}_hough_edges.jpg")
    edges_out.save(edges_path)

    # --- Step 4: Hough Line Transform ---
    # Find active edge pixels
    ys, xs = masked_edges.nonzero()
    
    # Accumulator for Hough space (rho, theta)
    # rho: distance from origin, theta: angle in radians
    # We resolve to 180 theta bins (1 degree resolution)
    thetas = np.deg2rad(np.arange(0, 180))
    num_thetas = len(thetas)
    
    # Max possible rho is diagonal length of image
    diag_len = int(math.ceil(math.sqrt(width**2 + height**2)))
    accumulator = np.zeros((2 * diag_len, num_thetas), dtype=np.int32)
    
    # Vote in accumulator
    # To speed up, we downsample the edge pixels we vote on
    step = max(1, len(xs) // 1000)
    for i in range(0, len(xs), step):
        x = xs[i]
        y = ys[i]
        for theta_idx in range(num_thetas):
            theta = thetas[theta_idx]
            # rho = x*cos(theta) + y*sin(theta)
            rho = int(x * math.cos(theta) + y * math.sin(theta))
            accumulator[rho + diag_len, theta_idx] += 1

    # Find local maxima (lines) in accumulator
    # We set a threshold of votes
    threshold = 30
    indices = np.argwhere(accumulator > threshold)
    
    # Group lines into left and right lanes based on slope
    left_lines = [] # (slope, intercept)
    right_lines = []
    
    for rho_idx, theta_idx in indices:
        rho = rho_idx - diag_len
        theta = thetas[theta_idx]
        
        # Convert polar (rho, theta) back to cartesian (y = mx + b)
        # Check for division by zero (vertical lines)
        if math.sin(theta) != 0:
            cos_val = math.cos(theta) / math.sin(theta)
            slope = -cos_val
            intercept = rho / math.sin(theta)
            
            # Filter slopes that are typical for lanes (0.5 to 2.0 or -0.5 to -2.0)
            if 0.4 < abs(slope) < 2.0:
                if slope < 0:
                    left_lines.append((slope, intercept))
                else:
                    right_lines.append((slope, intercept))

    # --- Step 5: Extrapolate Left & Right Lanes ---
    def extrapolate_line(lines, y_start, y_end):
        if not lines:
            return None
        # Average the slope and intercept
        avg_slope = sum(s for s, _ in lines) / len(lines)
        avg_intercept = sum(i for _, i in lines) / len(lines)
        
        # x = (y - b) / m
        x_start = int((y_start - avg_intercept) / avg_slope)
        x_end = int((y_end - avg_intercept) / avg_slope)
        return (x_start, y_start, x_end, y_end)

    y_start = height
    y_end = int(height * 0.62)
    
    left_lane = extrapolate_line(left_lines, y_start, y_end)
    right_lane = extrapolate_line(right_lines, y_start, y_end)

    # --- Step 6: Draw and Save Output ---
    hough_overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(hough_overlay)
    
    # Draw Left Lane (Solid Red)
    if left_lane:
        draw.line([left_lane[0], left_lane[1], left_lane[2], left_lane[3]], fill=(255, 0, 0, 255), width=8)
    
    # Draw Right Lane (Solid Blue)
    if right_lane:
        draw.line([right_lane[0], right_lane[1], right_lane[2], right_lane[3]], fill=(0, 0, 255, 255), width=8)

    # Composite overlay on original image
    final_img = Image.alpha_composite(img.convert("RGBA"), hough_overlay).convert("RGB")
    final_path = os.path.join(output_dir, f"{basename}_hough_detected.jpg")
    final_img.save(final_path)

    print(f"Hough Lane Detection finished:")
    print(f"  - Detected left line: {left_lane}")
    print(f"  - Detected right line: {right_lane}")
    print(f"  - Saved edge mask to: {edges_path}")
    print(f"  - Saved final output image to: {final_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hough Transform Lane Detection")
    parser.add_argument("--input", required=True, help="Path to input frame image")
    parser.add_argument("--output-dir", default="./output", help="Directory to save output files")
    args = parser.parse_args()
    
    hough_lines_detection(args.input, args.output_dir)
