import os
import glob
import csv
import argparse
import numpy as np
from PIL import Image

def get_perspective_coefficients(src, dst):
    matrix = []
    for r in range(4):
        x, y = src[r]
        u, v = dst[r]
        matrix.append([x, y, 1, 0, 0, 0, -u*x, -u*y])
        matrix.append([0, 0, 0, x, y, 1, -v*x, -v*y])
    A = np.array(matrix, dtype=float)
    B = np.array([dst[0][0], dst[0][1], dst[1][0], dst[1][1],
                  dst[2][0], dst[2][1], dst[3][0], dst[3][1]], dtype=float)
    h = np.linalg.solve(A, B)
    return h

def batch_process_highway(input_dir, output_csv, step):
    # Find all extracted frame JPEGs
    frame_pattern = os.path.join(input_dir, "frame_[0-9][0-9][0-9][0-9].jpg")
    frame_paths = sorted(glob.glob(frame_pattern))
    
    if not frame_paths:
        print(f"Error: No frame JPEGs found in {input_dir} matching pattern 'frame_xxxx.jpg'")
        return
        
    print(f"Found {len(frame_paths)} frames. Processing every {step} frame(s)...")
    
    # Open CSV writer
    with open(output_csv, mode='w', newline='') as f:
        writer = csv.writer(f)
        # Header row
        writer.writerow(["frame_num", "time_sec", "brightness", "contrast", "visibility", "curvature_m", "offset_m"])
        
        count = 0
        for idx in range(0, len(frame_paths), step):
            frame_path = frame_paths[idx]
            frame_name = os.path.basename(frame_path)
            frame_num = int(frame_name.split("_")[1].split(".")[0])
            time_sec = frame_num # since we extracted at 1 fps, frame number equals seconds elapsed
            
            try:
                img = Image.open(frame_path).convert("RGB")
                width, height = img.size
                
                # --- Step 1: Brightness & Contrast (Visibility Classifier) ---
                gray_img = img.convert("L")
                pixels = np.array(gray_img)
                avg_brightness = float(np.mean(pixels))
                contrast = float(np.std(pixels))
                
                if avg_brightness < 40:
                    visibility = "Night"
                elif contrast < 15:
                    visibility = "Heavy Fog"
                elif contrast < 28:
                    visibility = "Moderate Fog/Overcast"
                else:
                    visibility = "Clear"
                    
                # --- Step 2: Advanced Lane Curvature & Offset ---
                hsv = img.convert("HSV")
                s_channel = np.array(hsv.split()[1])
                v_channel = np.array(hsv.split()[2])
                
                s_max = np.max(s_channel)
                v_max = np.max(v_channel)
                
                s_thresh = max(30, int(s_max * 0.35))
                v_thresh_yellow = max(60, int(v_max * 0.4))
                v_thresh_white = max(130, int(v_max * 0.70))
                
                binary = np.zeros_like(s_channel)
                binary[((s_channel > s_thresh) & (v_channel > v_thresh_yellow)) | (v_channel > v_thresh_white)] = 255
                
                # Perspective Wrap Setup
                src_pts = [
                    (int(width * 0.44), int(height * 0.62)),
                    (int(width * 0.56), int(height * 0.62)),
                    (int(width * 0.88), int(height * 0.93)),
                    (int(width * 0.16), int(height * 0.93))
                ]
                offset_val = int(width * 0.25)
                dst_pts = [
                    (offset_val, 0),
                    (width - offset_val, 0),
                    (width - offset_val, height),
                    (offset_val, height)
                ]
                
                coeffs_forward = get_perspective_coefficients(src_pts, dst_pts)
                binary_img = Image.fromarray(binary)
                warped_binary_img = binary_img.transform(
                    (width, height), 
                    Image.Transform.PERSPECTIVE, 
                    coeffs_forward, 
                    Image.Resampling.BILINEAR
                )
                warped_binary = np.array(warped_binary_img)
                
                # Sliding Window Search
                histogram = np.sum(warped_binary[height//2:, :], axis=0)
                midpoint = int(width / 2)
                leftx_base = np.argmax(histogram[:midpoint])
                rightx_base = np.argmax(histogram[midpoint:]) + midpoint
                
                nwindows = 9
                window_height = int(height / nwindows)
                nonzero = warped_binary.nonzero()
                nonzeroy = np.array(nonzero[0])
                nonzerox = np.array(nonzero[1])
                
                leftx_current = leftx_base
                rightx_current = rightx_base
                margin = int(width * 0.06)
                minpix = max(8, int(width * height * 0.00004))
                
                left_lane_inds = []
                right_lane_inds = []
                
                for window in range(nwindows):
                    win_y_low = height - (window + 1) * window_height
                    win_y_high = height - window * window_height
                    
                    win_xleft_low = leftx_current - margin
                    win_xleft_high = leftx_current + margin
                    win_xright_low = rightx_current - margin
                    win_xright_high = rightx_current + margin
                    
                    good_left_inds = ((nonzeroy >= win_y_low) & (nonzeroy < win_y_high) & 
                                      (nonzerox >= win_xleft_low) & (nonzerox < win_xleft_high)).nonzero()[0]
                    good_right_inds = ((nonzeroy >= win_y_low) & (nonzeroy < win_y_high) & 
                                       (nonzerox >= win_xright_low) & (nonzerox < win_xright_high)).nonzero()[0]
                    
                    left_lane_inds.append(good_left_inds)
                    right_lane_inds.append(good_right_inds)
                    
                    if len(good_left_inds) > minpix:
                        leftx_current = int(np.mean(nonzerox[good_left_inds]))
                    if len(good_right_inds) > minpix:        
                        rightx_current = int(np.mean(nonzerox[good_right_inds]))
                        
                left_lane_inds = np.concatenate(left_lane_inds)
                right_lane_inds = np.concatenate(right_lane_inds)
                
                leftx = nonzerox[left_lane_inds]
                lefty = nonzeroy[left_lane_inds] 
                rightx = nonzerox[right_lane_inds]
                righty = nonzeroy[right_lane_inds]
                
                left_fit = [0.0, 0.0, offset_val]
                right_fit = [0.0, 0.0, width - offset_val]
                
                min_fit_pixels = max(20, int(width * height * 0.0001))
                if len(lefty) > min_fit_pixels:
                    left_fit = np.polyfit(lefty, leftx, 2)
                if len(righty) > min_fit_pixels:
                    right_fit = np.polyfit(righty, rightx, 2)
                    
                ym_per_pix = 30 / height
                xm_per_pix = 3.7 / (width - 2*offset_val)
                ploty = np.linspace(0, height - 1, height)
                
                left_fitx = left_fit[0]*ploty**2 + left_fit[1]*ploty + left_fit[2]
                right_fitx = right_fit[0]*ploty**2 + right_fit[1]*ploty + right_fit[2]
                
                # Curvature
                left_fit_cr = np.polyfit(ploty * ym_per_pix, left_fitx * xm_per_pix, 2)
                right_fit_cr = np.polyfit(ploty * ym_per_pix, right_fitx * xm_per_pix, 2)
                
                y_eval = np.max(ploty)
                left_curverad = ((1 + (2*left_fit_cr[0]*y_eval*ym_per_pix + left_fit_cr[1])**2)**1.5) / np.absolute(2*left_fit_cr[0])
                right_curverad = ((1 + (2*right_fit_cr[0]*y_eval*ym_per_pix + right_fit_cr[1])**2)**1.5) / np.absolute(2*right_fit_cr[0])
                avg_curvature = (left_curverad + right_curverad) / 2.0
                
                # Center Offset
                car_position = width / 2
                lane_center = (left_fitx[-1] + right_fitx[-1]) / 2
                center_offset = (car_position - lane_center) * xm_per_pix
                
                # Check for straight line curvature values
                if avg_curvature > 5000:
                    avg_curvature = 9999.0
                
                # Write row
                writer.writerow([frame_num, time_sec, f"{avg_brightness:.2f}", f"{contrast:.2f}", visibility, f"{avg_curvature:.2f}", f"{center_offset:.3f}"])
                count += 1
                
                if count % 100 == 0:
                    print(f"  Processed {count} frames...")
                    
            except Exception as e:
                print(f"Error processing frame {frame_name}: {e}")
                continue
                
    print(f"Batch processing complete! Telemetry written to: {output_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Batch process driving frames to CSV telemetry")
    parser.add_argument("--input-dir", default="C:/Dev/hwy5/output", help="Directory of frames")
    parser.add_argument("--output-csv", default="C:/Dev/hwy5/hwy5_telemetry.csv", help="Output telemetry CSV path")
    parser.add_argument("--step", type=int, default=5, help="Step size for frames to process")
    args = parser.parse_args()
    
    batch_process_highway(args.input_dir, args.output_csv, args.step)
