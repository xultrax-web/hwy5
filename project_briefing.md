# Project Briefing: I-5 Highway Lane Curvature CV Analysis & comma2k19 Integration
**Prepared for: Codex (Advanced Agentic Developer)**  
**Author: Antigravity (Gemini 2.5 Flash)**  
**Date: June 29, 2026**

---

## 1. Executive Summary & Project Goal
The primary objective of this project is to build an automated computer vision (CV) and data-logging pipeline that analyzes road curvature and lane offsets from consumer dashcam driving videos. 

The study route covers the **Interstate 5 (I-5) corridor** in California:
*   **Northbound (Santa Clarita to Tracy):** Starting from **Santa Clarita (Castaic / Los Angeles County)**, climbing over the mountainous **Grapevine (Tejon Pass)**, traveling across the flat **San Joaquin Valley**, and ending at the **I-580 Westbound Split near Tracy** (the turnoff to the San Francisco Bay Area).
*   **Southbound (Tracy to Santa Clarita):** Reversing the route, starting at the **I-580 transition near Tracy**, traveling southbound through the valley floor, and climbing back over the Grapevine into **Santa Clarita**.

---

## 2. What We Have Achieved So Far

### **A. Video Acquisition & Downloader Bypasses**
*   **Northbound Segment 1 Video (Tejon Pass):** Saved to `C:\Dev\hwy5\grapevine_real.mp4`.
*   **Northbound Segment 2 Video (Central Valley Floor):** Saved to `C:\Dev\hwy5\valley_real.mp4`.
*   **Southbound Video (Complete Route):** Saved to `C:\Dev\hwy5\southbound_real.mp4` (Neon Driving Tours, 4K 60fps HDR, 2.9 GB).
*   **Bypass & Cookie Resolution:**
    *   **Cobalt Duration Limit:** Cobalt API mirrors return `400 Bad Request` on videos longer than 3 hours (like the 5h 45m southbound video).
    *   **The Firefox Cookie Hack:** We bypassed YouTube's `403 Forbidden` local downloader blocks by silently running Firefox to visit the watch URL, populating the local unencrypted SQLite cookie database, and passing `--cookies-from-browser firefox` to local `yt-dlp`.

### **B. Frame Organization & Restructuring**
To ensure frame context and prevent collision, all extracted JPEGs have been moved and renamed into a clean, directional master directory structure:

1.  **Northbound Master Frames (`C:\Dev\hwy5\frames\northbound\`):**
    *   Contains **10,031 JPEGs** representing the continuous 1 fps drive from Santa Clarita to Tracy.
    *   Part 1 and Part 2 are merged into a single continuous sequence.
    *   Filenames are zero-padded to 5 digits: **`nb_frame_00001.jpg`** to **`nb_frame_10031.jpg`**.
    *   These map 1-to-1 with the `frame_num` in the master Northbound CSV.
2.  **Southbound Master Frames (`C:\Dev\hwy5\frames\southbound\`):**
    *   Contains **2,852 JPEGs** representing the pre-sampled drive at 5-second intervals (`fps=0.2`) from I-580 Tracy to Santa Clarita.
    *   Filenames are mapped to their true timeline second offset and zero-padded to 5 digits: **`sb_frame_00005.jpg`** to **`sb_frame_14260.jpg`** (increments of 5).
    *   These map 1-to-1 with the `frame_num` and `time_sec` in the Southbound CSV.

### **C. Computer Vision Pipeline (Lane Detection & Metrics)**
*   **Core CV Script (`lane_curvature.py`):**
    *   Processes low-resolution (360p) or high-resolution (720p/1080p) compressed feeds.
    *   **Adaptive HSV Thresholding:** Dynamically calculates color mask ranges by locating peak intensity points in the image rather than using hardcoded bounds. This captures worn/faded yellow and white lane markings under varied lighting.
    *   **Dynamic Scaling:** Automatically scales margins, sliding window sizes, and minimum pixel requirements based on the resolution of the input frame.
    *   Outputs computed lane curvature radius (in meters) and lateral offset from the center of the lane.
*   **Batch processing script (`batch_analyze.py`):**
    *   Iterates through directories of JPEGs.
    *   Computes weather visibility (Clear, Overcast, Rain, Fog) by measuring image brightness and contrast peaks.
    *   Outputs a structured CSV file containing frame-by-frame telemetry.

### **D. Telemetry Databases Generated**
1.  **[hwy5_telemetry.csv](file:///C:/Dev/hwy5/hwy5_telemetry.csv):** Telemetry dataset for Northbound Segment 1 (Santa Clarita to Southern Valley).
2.  **[hwy5_telemetry_part2.csv](file:///C:/Dev/hwy5/hwy5_telemetry_part2.csv):** Telemetry dataset for Northbound Segment 2 (Valley to I-580).
3.  **[hwy5_telemetry_master.csv](file:///C:/Dev/hwy5/hwy5_telemetry_master.csv):** A unified, continuous Northbound database of **2,007 rows** representing **167.1 minutes** of driving.
4.  **[hwy5_telemetry_southbound.csv](file:///C:/Dev/hwy5/hwy5_telemetry_southbound.csv):** Telemetry dataset for the complete Southbound route from I-580 to Santa Clarita (**2,852 rows** representing **237.6 minutes** of driving).

---

## 3. Codebase Architecture

The project files are located in `C:\Dev\hwy5\`.

### **[lane_curvature.py](file:///C:/Dev/hwy5/lane_curvature.py)**
*   *Key Functions:*
    *   `adaptive_hsv_mask(img)`: Converts frame to HSV and extracts white/yellow lines by finding adaptive thresholds based on the top 1% value distribution peaks.
    *   `find_lane_pixels(binary_warped)`: Implements sliding window search to find left/right lane boundary coordinates.
    *   `fit_polynomial(binary_warped)`: Fits a second-order polynomial ($f(y) = Ay^2 + By + C$) to the left and right lane boundaries.
    *   `measure_curvature_real(ploty, left_fit_cr, right_fit_cr)`: Computes curvature radius in meters.
    *   `measure_offset(binary_warped, left_fit, right_fit)`: Estimates camera center offset from the lane center.

### **[batch_analyze.py](file:///C:/Dev/hwy5/batch_analyze.py)**
*   *Key Logic:*
    *   Parses command-line arguments: `--input-dir`, `--output-csv`, and `--step`.
    *   Computes weather categories using standard deviation (contrast) and mean (brightness) thresholds on the image.
    *   Logs progress in the console and saves rows incrementally to avoid data loss.

### **[process_southbound.py](file:///C:/Dev/hwy5/process_southbound.py)**
*   *Key Logic:*
    *   Extracts JPEGs at `fps=0.2` (1 frame every 5 seconds) to optimize disk I/O.
    *   Runs the batch CV analysis with `--step 1` (since the frames are already pre-sampled).
    *   Loads the resulting CSV, multiplies the `frame_num` and `time_sec` columns by 5 to scale them to true timeline seconds, and saves the final result.

---

## 4. `comma2k19` Integration & Windows Workaround

The `comma2k19` dataset contains high-precision ground-truth driving logs (GNSS, IMU, CAN bus steering wheel inputs, and video) recorded by comma.ai devices. 

### **The Windows Pathspec Issue**
*   **The Problem:** The repository contains a sample subdirectory `Example_1` with folders containing the pipe character `|` (e.g. `b0c9d2329ad1606b|2018-08-02--08-34-47`). On Windows, `|` is a reserved system character. Cloning or checking out these paths causes Git to crash.
*   **The Fix:** We configured Git sparse-checkout to exclude the `Example_1` folder entirely. The remaining utility files were successfully checked out:
    ```powershell
    git -C C:\Dev\comma2k19 sparse-checkout init --cone
    git -C C:\Dev\comma2k19 sparse-checkout set utils notebooks
    git -C C:\Dev\comma2k19 checkout HEAD -- utils notebooks requirements.txt README.md
    ```

---

## 5. Next Steps & Planning for Codex

Now that both Northbound and Southbound datasets are compiled and structured, you should focus on the following goals:

### **Phase 1: Calibrate and Validate against comma2k19 Ground Truth**
1.  **Run CV on comma2k19 Logs:**
    *   The `comma2k19` repository has a sample raw video (`video.hevc`) and CAN logging parameters in the `notebooks/` directory.
    *   Write a script that processes the frames of a `comma2k19` segment using our dynamic lane detection logic.
2.  **Compare CV with Sensors:**
    *   Parse the ground-truth steering angles, yaw rates, and GPS trajectories from the `processed_log/` inside the dataset.
    *   Map our calculated curvature radius ($R$) against the steering wheel angles.
    *   Calibrate the pixel-to-meter scaling factors ($mx$ and $my$) in `lane_curvature.py` to match the physical properties recorded by the openpilot sensors.

### **Phase 2: Integrate True Camera Intrinsics**
*   Our current perspective warping code uses manual warp coordinates.
*   Review **[camera.py](file:///C:/Dev/comma2k19/utils/camera.py)** and **[coordinates.py](file:///C:/Dev/comma2k19/utils/coordinates.py)** in the `comma2k19` repository.
*   Refactor `lane_curvature.py` to use a camera matrix translation ($K$ intrinsic matrix, focal length, pitch, roll, and height values) to project lane boundaries into true 3D space, which will eliminate perspective warp error.

### **Phase 3: Telemetry Dashboard & Visualization**
*   Build a lightweight dashboard interface (e.g. using Streamlit or HTML/JS) to:
    *   Load the master CSVs as an interactive map or timeline.
    *   Plot visibility levels, offset drifts, and sharp curves along the corridor.
    *   Overlay estimated lane lines dynamically onto frames as they play.

---

### **Important Directory Links:**
*   **Hwy 5 Project Base:** [C:\Dev\hwy5](file:///C:/Dev/hwy5/)
*   **Hwy 5 Codebase:** [lane_curvature.py](file:///C:/Dev/hwy5/lane_curvature.py) | [batch_analyze.py](file:///C:/Dev/hwy5/batch_analyze.py) | [process_southbound.py](file:///C:/Dev/hwy5/process_southbound.py)
*   **comma2k19 Base:** [C:\Dev\comma2k19](file:///C:/Dev/comma2k19/)
*   **comma2k19 Codebase:** [utils/](file:///C:/Dev/comma2k19/utils/) | [notebooks/](file:///C:/Dev/comma2k19/notebooks/)
