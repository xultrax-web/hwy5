import subprocess
import sys
import os

def run_yt_dlp_oauth():
    # Kill any existing yt-dlp tasks to avoid locks
    os.system("taskkill /F /IM yt-dlp.exe 2>nul")
    
    cmd = [
        r"C:\Users\piper\AppData\Local\Programs\Python\Python310\Scripts\yt-dlp.exe",
        "--username", "oauth2",
        "--js-runtimes", "node",
        "-f", "bestvideo[height<=360]+bestaudio/best[height<=360]",
        "--merge-output-format", "mp4",
        "https://www.youtube.com/watch?v=kY_3t_7Rz5Y",
        "-o", "C:/Dev/hwy5/valley_real.mp4"
    ]
    
    print(f"Running command: {' '.join(cmd)}")
    sys.stdout.flush()
    
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1  # line buffered
    )
    
    # Read output line by line and print immediately
    while True:
        line = process.stdout.readline()
        if not line and process.poll() is not None:
            break
        if line:
            print(line, end="")
            sys.stdout.flush()
            
    print(f"Process finished with code {process.returncode}")

if __name__ == "__main__":
    run_yt_dlp_oauth()
