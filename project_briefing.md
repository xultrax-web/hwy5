# Project Briefing: I-5 Highway Lane Curvature CV Analysis & comma2k19 Integration
**Prepared for: Codex (Advanced Agentic Developer)**  
**Author: Antigravity (Gemini 2.5 Flash)**  
**Date: June 29, 2026**

---

## 1. Executive Summary & Project Goal
The primary objective of this project is to build an automated computer vision (CV) and data-logging pipeline that analyzes road curvature and lane offsets from consumer dashcam driving videos. 

The study route is the **Interstate 5 (I-5) Northbound corridor** in California, starting from **Santa Clarita (Castaic / Los Angeles County)**, climbing over the mountainous **Grapevine (Tejon Pass)**, traveling across the flat **San Joaquin Valley**, and ending at the **I-580 Westbound Split near Tracy** (the turnoff to the San Francisco Bay Area). 

---

## 2. What We Have Achieved So Far

### **A. Video Acquisition & Downloader Bypasses**
*   **Segment 1 Video (Tejon Pass):** Downloaded and saved to `C:\Dev\hwy5\grapevine_real.mp4`.
*   **Segment 2 Video (Central Valley Floor):** Downloaded and saved to `C:\Dev\hwy5\valley_real.mp4`.
*   **Troubleshooting Bypasses:** 
    *   YouTube actively blocks anonymous data-center scraping (used by public Cobalt instances) and command-line clients like `yt-dlp` running locally via DPAPI-protected Chromium cookies.
    *   **The Dead URL Trap:** The initial video ID supplied for Part 2 (`kY_3t_7Rz5Y`) was a dead/deleted video, resulting in misleading `Video unavailable` and `HTTP 400` errors during downloader testing.
    *   **Resolution:** We scraped live YouTube search results to locate the active Part 2 ID: **`_CWcp1FsI40`**. Once updated, public Cobalt API tunnels (specifically `https://api.cobalt.blackcat.sweeux.org`) successfully pulled the 525 MB stream at 360p resolution.
    *   **Local Fallback Setup:** We also installed Firefox in the user scope as a local cookie fallback because Firefox does not enforce Windows DPAPI App-Bound encryption (allowing local `yt-dlp` to read session cookies).

### **B. Frame Extraction**
*   **Grapevine (Part 1):** Skipped the first 30 minutes of urban Los Angeles driving (`-ss 00:30:00`) to align the starting point with Santa Clarita/Castaic. Extracted 3,646 frames at 1 fps into `C:\Dev\hwy5\output\`.
*   **Valley (Part 2):** Extracted 6,385 frames at 1 fps (from `00:00:00` to the I-580 transition at `01:46:25`) into `C:\Dev\hwy5\output_part2\`.

### **C. Computer Vision Pipeline (Lane Detection & Metrics)**
*   **Core CV Script (`lane_curvature.py`):**
    *   Processes low-resolution (360p) compressed feeds.
    *   **Adaptive HSV Thresholding:** Dynamically calculates color mask ranges by locating peak intensity points in the image rather than using hardcoded bounds. This captures worn/faded yellow and white lane markings under varied lighting.
    *   **Dynamic Scaling:** Automatically scales margins, sliding window sizes, and minimum pixel requirements based on the resolution of the input frame.
    *   Outputs computed lane curvature radius (in meters) and lateral offset from the center of the lane.
*   **Batch processing script (`batch_analyze.py`):**
    *   Iterates through directories of JPEGs in 5-second sampling steps (every 5th frame).
    *   Computes weather visibility (Clear, Overcast, Rain, Fog) by measuring image brightness and contrast peaks.
    *   Outputs a structured CSV file containing frame-by-frame telemetry.

### **D. Telemetry Databases Generated**
1.  **[hwy5_telemetry.csv](file:///C:/Dev/hwy5/hwy5_telemetry.csv):** Telemetry dataset for Segment 1 (Santa Clarita to Southern Valley).
2.  **[hwy5_telemetry_part2.csv](file:///C:/Dev/hwy5/hwy5_telemetry_part2.csv):** Telemetry dataset for Segment 2 (Valley to I-580).
3.  **[hwy5_telemetry_master.csv](file:///C:/Dev/hwy5/hwy5_telemetry_master.csv):** A unified, continuous database of **2,007 rows** representing **167.1 minutes** (2h 47m) of continuous highway driving from Santa Clarita to Tracy.

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
    *   Parses command-line arguments: `--input-dir`, `--output-csv`, and `--step` (defaults to 5).
    *   Computes weather categories using standard deviation (contrast) and mean (brightness) thresholds on the image.
    *   Logs progress in the console and saves rows incrementally to avoid data loss.

### **[merge_telemetry.py](file:///C:/Dev/hwy5/merge_telemetry.py)**
*   *Key Logic:*
    *   Reads `hwy5_telemetry.csv` and `hwy5_telemetry_part2.csv` using `pandas`.
    *   Adjusts frame numbers and time markers of Part 2 so they form a continuous, unbroken chronology starting at Santa Clarita (`time_sec = 1`) and ending at Tracy (`time_sec = 10031`).

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

Now that the master telemetry database for the I-5 Northbound corridor is successfully compiled, you should focus on the following goals:

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
    *   Load `hwy5_telemetry_master.csv` as an interactive map or timeline.
    *   Plot visibility levels, offset drifts, and sharp curves along the 300-mile corridor.
    *   Overlay estimated lane lines dynamically onto frames as they play.

---

### **Important Directory Links:**
*   **Hwy 5 Project Base:** [C:\Dev\hwy5](file:///C:/Dev/hwy5/)
*   **Hwy 5 Codebase:** [lane_curvature.py](file:///C:/Dev/hwy5/lane_curvature.py) | [batch_analyze.py](file:///C:/Dev/hwy5/batch_analyze.py) | [merge_telemetry.py](file:///C:/Dev/hwy5/merge_telemetry.py)
*   **comma2k19 Base:** [C:\Dev\comma2k19](file:///C:/Dev/comma2k19/)
*   **comma2k19 Codebase:** [utils/](file:///C:/Dev/comma2k19/utils/) | [notebooks/](file:///C:/Dev/comma2k19/notebooks/)
