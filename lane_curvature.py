import os
import argparse
import numpy as np
from PIL import Image, ImageDraw

def get_perspective_coefficients(src, dst):
    """
    Calculates the 8 coefficients for a projective perspective transform
    mapping src points to dst points.
    src and dst are lists of 4 tuples: [(x0, y0), (x1, y1), (x2, y2), (x3, y3)]
    """
    matrix = []
    for r in range(4):
        # Source point (x, y), Destination point (u, v)
        x, y = src[r]
        u, v = dst[r]
        matrix.append([x, y, 1, 0, 0, 0, -u*x, -u*y])
        matrix.append([0, 0, 0, x, y, 1, -v*x, -v*y])
    
    A = np.array(matrix, dtype=float)
    B = np.array([dst[0][0], dst[0][1], dst[1][0], dst[1][1],
                  dst[2][0], dst[2][1], dst[3][0], dst[3][1]], dtype=float)
    
    # Solve linear system A * h = B
    h = np.linalg.solve(A, B)
    return h

def advanced_lane_detection(image_path, output_dir):
    """
    Performs advanced lane detection, perspective warping, sliding window tracking,
    and calculates lane curvature.
    """
    if not os.path.exists(image_path):
        print(f"Error: Input file {image_path} does not exist.")
        return

    # Load original image
    img = Image.open(image_path).convert("RGB")
    width, height = img.size
    print(f"Ingested image: {image_path} ({width}x{height})")

    # Make output directory
    os.makedirs(output_dir, exist_ok=True)
    basename = os.path.splitext(os.path.basename(image_path))[0]

    # --- Step 1: Thresholding (Extracting Yellow/White Lanes) ---
    # Convert to HSV and extract Saturation (S) channel to isolate lane lines in shadows/bright light
    hsv = img.convert("HSV")
    s_channel = np.array(hsv.split()[1]) # Saturation is the second band (index 1)
    
    # Also extract Value (V) channel for white line detection under direct sun
    v_channel = np.array(hsv.split()[2])
    
    # Adaptive thresholding based on image peaks
    s_max = np.max(s_channel)
    v_max = np.max(v_channel)
    
    s_thresh = max(30, int(s_max * 0.35))
    v_thresh_yellow = max(60, int(v_max * 0.4))
    v_thresh_white = max(130, int(v_max * 0.70))
    
    # Combine thresholds: S-channel high or V-channel high
    binary = np.zeros_like(s_channel)
    binary[((s_channel > s_thresh) & (v_channel > v_thresh_yellow)) | (v_channel > v_thresh_white)] = 255
    
    # Save binary thresholded image for visualization
    binary_img = Image.fromarray(binary)
    binary_path = os.path.join(output_dir, f"{basename}_lane_binary.jpg")
    binary_img.save(binary_path)

    # --- Step 2: Perspective Transform (Bird's Eye View) ---
    # Define source trapezoid (focused on the lane in front of the car)
    # Target points for 1280x720 video (like project_video.mp4)
    src_pts = [
        (int(width * 0.44), int(height * 0.62)),  # Top-Left
        (int(width * 0.56), int(height * 0.62)),  # Top-Right
        (int(width * 0.88), int(height * 0.93)),  # Bottom-Right
        (int(width * 0.16), int(height * 0.93))   # Bottom-Left
    ]
    
    # Define destination rectangle
    offset = int(width * 0.25)
    dst_pts = [
        (offset, 0),               # Top-Left
        (width - offset, 0),        # Top-Right
        (width - offset, height),   # Bottom-Right
        (offset, height)            # Bottom-Left
    ]

    # Get coefficients for warping (Forward: src -> dst)
    coeffs_forward = get_perspective_coefficients(src_pts, dst_pts)
    # Get coefficients for unwarping (Inverse: dst -> src)
    coeffs_inverse = get_perspective_coefficients(dst_pts, src_pts)

    # Warp the binary image to Bird's Eye View
    warped_binary_img = binary_img.transform(
        (width, height), 
        Image.Transform.PERSPECTIVE, 
        coeffs_forward, 
        Image.Resampling.BILINEAR
    )
    warped_binary = np.array(warped_binary_img)
    
    # Save warped binary for checking
    warped_path = os.path.join(output_dir, f"{basename}_lane_warped.jpg")
    warped_binary_img.save(warped_path)

    # --- Step 3: Sliding Window Search & Polynomial Fitting ---
    # Take a histogram of the bottom half of the image
    histogram = np.sum(warped_binary[height//2:, :], axis=0)
    
    # Find the peak of the left and right halves of the histogram
    midpoint = int(width / 2)
    leftx_base = np.argmax(histogram[:midpoint])
    rightx_base = np.argmax(histogram[midpoint:]) + midpoint

    # Choose the number of sliding windows
    nwindows = 9
    window_height = int(height / nwindows)
    
    # Identify the x and y positions of all nonzero pixels in the image
    nonzero = warped_binary.nonzero()
    nonzeroy = np.array(nonzero[0])
    nonzerox = np.array(nonzero[1])
    
    # Current positions to be updated for each window
    leftx_current = leftx_base
    rightx_current = rightx_base
    
    # Set the width of the windows +/- margin
    margin = int(width * 0.06)
    # Set minimum number of pixels found to recenter window
    minpix = max(8, int(width * height * 0.00004))
    
    # Create empty lists to receive left and right lane pixel indices
    left_lane_inds = []
    right_lane_inds = []

    # Step through the windows one by one
    for window in range(nwindows):
        # Identify window boundaries in x and y (and right and left)
        win_y_low = height - (window + 1) * window_height
        win_y_high = height - window * window_height
        
        win_xleft_low = leftx_current - margin
        win_xleft_high = leftx_current + margin
        win_xright_low = rightx_current - margin
        win_xright_high = rightx_current + margin
        
        # Identify the nonzero pixels in x and y within the window
        good_left_inds = ((nonzeroy >= win_y_low) & (nonzeroy < win_y_high) & 
                          (nonzerox >= win_xleft_low) & (nonzerox < win_xleft_high)).nonzero()[0]
        good_right_inds = ((nonzeroy >= win_y_low) & (nonzeroy < win_y_high) & 
                           (nonzerox >= win_xright_low) & (nonzerox < win_xright_high)).nonzero()[0]
        
        # Append these indices to the lists
        left_lane_inds.append(good_left_inds)
        right_lane_inds.append(good_right_inds)
        
        # If you found > minpix pixels, recenter next window on their mean position
        if len(good_left_inds) > minpix:
            leftx_current = int(np.mean(nonzerox[good_left_inds]))
        if len(good_right_inds) > minpix:        
            rightx_current = int(np.mean(nonzerox[good_right_inds]))

    # Concatenate the arrays of indices
    try:
        left_lane_inds = np.concatenate(left_lane_inds)
        right_lane_inds = np.concatenate(right_lane_inds)
    except ValueError:
        # Avoid crash on empty indices
        pass

    # Extract left and right line pixel positions
    leftx = nonzerox[left_lane_inds]
    lefty = nonzeroy[left_lane_inds] 
    rightx = nonzerox[right_lane_inds]
    righty = nonzeroy[right_lane_inds]

    # Fit a second order polynomial to each (x = ay^2 + by + c)
    # Default fallback curves if detection is too sparse
    left_fit = [0.0, 0.0, offset]
    right_fit = [0.0, 0.0, width - offset]
    
    min_fit_pixels = max(20, int(width * height * 0.0001))
    if len(lefty) > min_fit_pixels:
        left_fit = np.polyfit(lefty, leftx, 2)
    if len(righty) > min_fit_pixels:
        right_fit = np.polyfit(righty, rightx, 2)

    # --- Step 4: Calculate Curvature ---
    # Define conversions in x and y from pixels space to meters
    ym_per_pix = 30 / height  # meters per pixel in y dimension (assume 30 meters lane length visible)
    xm_per_pix = 3.7 / (width - 2*offset)  # meters per pixel in x dimension (US standard lane width is 3.7m)

    # Generate y values for plotting
    ploty = np.linspace(0, height - 1, height)
    
    # Calculate fit curves in pixels
    left_fitx = left_fit[0]*ploty**2 + left_fit[1]*ploty + left_fit[2]
    right_fitx = right_fit[0]*ploty**2 + right_fit[1]*ploty + right_fit[2]

    # Fit new polynomials to x,y in real world space (meters)
    y_eval = np.max(ploty) # Evaluate curvature at the bottom of the image (closest to car)
    
    # Curve fitting in meters
    left_fit_cr = np.polyfit(ploty * ym_per_pix, left_fitx * xm_per_pix, 2)
    right_fit_cr = np.polyfit(ploty * ym_per_pix, right_fitx * xm_per_pix, 2)
    
    # Calculate the new radii of curvature
    left_curverad = ((1 + (2*left_fit_cr[0]*y_eval*ym_per_pix + left_fit_cr[1])**2)**1.5) / np.absolute(2*left_fit_cr[0])
    right_curverad = ((1 + (2*right_fit_cr[0]*y_eval*ym_per_pix + right_fit_cr[1])**2)**1.5) / np.absolute(2*right_fit_cr[0])
    
    avg_curvature = (left_curverad + right_curverad) / 2.0

    # Calculate vehicle offset from lane center
    car_position = width / 2
    lane_center = (left_fitx[-1] + right_fitx[-1]) / 2
    center_offset_pixels = car_position - lane_center
    center_offset_meters = center_offset_pixels * xm_per_pix

    # --- Step 5: Draw Lane Overlay & Warp Back ---
    # Create an image to draw the lane overlay on
    warp_zero = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw_warp = ImageDraw.Draw(warp_zero)

    # Recast the x and y points into usable PIL format
    pts_left = [(int(left_fitx[i]), int(ploty[i])) for i in range(len(ploty))]
    pts_right = [(int(right_fitx[i]), int(ploty[i])) for i in range(len(ploty))]
    pts_right.reverse()
    polygon_points = pts_left + pts_right

    # Draw the green lane polygon on the warped space
    draw_warp.polygon(polygon_points, fill=(0, 255, 64, 80), outline=(0, 255, 64, 255))

    # Warp the overlay back to original perspective using the inverse coefficients
    unwarped_overlay = warp_zero.transform(
        (width, height), 
        Image.Transform.PERSPECTIVE, 
        coeffs_inverse, 
        Image.Resampling.BILINEAR
    )

    # Composite the unwarped overlay onto the original image
    result_img = Image.alpha_composite(img.convert("RGBA"), unwarped_overlay)
    draw_result = ImageDraw.Draw(result_img)

    # --- Step 6: Overlay Telemetry HUD text ---
    hud_bg = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw_hud = ImageDraw.Draw(hud_bg)
    draw_hud.rectangle([15, 15, 480, 115], fill=(0, 0, 0, 180), outline=(0, 229, 255, 255), width=2)
    
    draw_hud.text((30, 25), "LANE SEGMENTATION PIPELINE (ACTIVE)", fill=(0, 229, 255, 255))
    draw_hud.text((30, 45), f"Radius of Curvature: {avg_curvature:.1f} m", fill=(255, 255, 255))
    
    side_text = "Left of center" if center_offset_meters > 0 else "Right of center"
    draw_hud.text((30, 65), f"Vehicle Lane Offset: {abs(center_offset_meters):.3f} m ({side_text})", fill=(255, 255, 255))
    draw_hud.text((30, 85), f"Ingested Resolution: {width}x{height} | Target FPS: 25", fill=(170, 180, 200, 255))

    final_img = Image.alpha_composite(result_img, hud_bg).convert("RGB")
    final_path = os.path.join(output_dir, f"{basename}_lane_detected.jpg")
    final_img.save(final_path)

    print(f"Advanced Lane Detection finished:")
    print(f"  - Curvature: {avg_curvature:.1f} meters")
    print(f"  - Offset from Center: {center_offset_meters:.3f} meters")
    print(f"  - Saved binary mask to: {binary_path}")
    print(f"  - Saved warped perspective to: {warped_path}")
    print(f"  - Saved final output image to: {final_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Advanced Lane Detection and Curvature Pipeline")
    parser.add_argument("--input", required=True, help="Path to input frame image")
    parser.add_argument("--output-dir", default="./output", help="Directory to save output files")
    args = parser.parse_args()
    
    advanced_lane_detection(args.input, args.output_dir)
