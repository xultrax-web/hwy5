import pandas as pd

def merge_telemetry():
    part1_path = "C:/Dev/hwy5/hwy5_telemetry.csv"
    part2_path = "C:/Dev/hwy5/hwy5_telemetry_part2.csv"
    master_path = "C:/Dev/hwy5/hwy5_telemetry_master.csv"
    
    try:
        # Load both parts
        df1 = pd.read_csv(part1_path)
        df2 = pd.read_csv(part2_path)
        
        # Add identifiers to distinguish which video file the data came from
        df1["source_video"] = "part1_grapevine"
        df2["source_video"] = "part2_valley"
        
        # Adjust time_sec and frame_num of Part 2 so they are continuous!
        # Part 1 ended at frame 3646. So Part 2 starts at 3647.
        part1_max_time = df1["time_sec"].max()
        
        df2_continuous = df2.copy()
        df2_continuous["frame_num"] = df2["frame_num"] + df1["frame_num"].max()
        df2_continuous["time_sec"] = df2["time_sec"] + part1_max_time
        
        # Concatenate
        df_master = pd.concat([df1, df2_continuous], ignore_index=True)
        
        # Save to disk
        df_master.to_csv(master_path, index=False)
        print(f"Successfully compiled master telemetry!")
        print(f"  - Total entries: {len(df_master)}")
        print(f"  - Total driving duration: {df_master['time_sec'].max() / 60:.1f} minutes")
        print(f"  - Saved to: {master_path}")
        
    except Exception as e:
        print(f"Error compiling master telemetry: {e}")

if __name__ == "__main__":
    merge_telemetry()
