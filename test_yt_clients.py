import subprocess
import sys

def test_clients():
    video_id = "kY_3t_7Rz5Y"
    yt_url = f"https://www.youtube.com/watch?v={video_id}"
    
    clients = [
        "android",
        "ios",
        "tv",
        "tvclient",
        "web_embedded",
        "mweb",
        "mediaconnect"
    ]
    
    success = False
    
    for client in clients:
        print(f"Testing client: {client} ...")
        cmd = [
            r"C:\Users\piper\AppData\Local\Programs\Python\Python310\Scripts\yt-dlp.exe",
            "--js-runtimes", "node",
            "--extractor-args", f"youtube:client={client}",
            "-f", "bestvideo[height<=360]+bestaudio/best[height<=360]",
            "--merge-output-format", "mp4",
            yt_url,
            "-o", f"C:/Dev/hwy5/valley_test_{client}.mp4",
            "--max-downloads", "1"
        ]
        
        try:
            # Run with a short timeout to see if it starts downloading or fails immediately
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=15)
            if "Video unavailable" not in res.stderr and "ERROR:" not in res.stderr and res.returncode == 0:
                print(f"-> SUCCESS! Client '{client}' bypassed the block!")
                success = True
                break
            else:
                err = res.stderr.strip().split("\n")[-1] if res.stderr else "Unknown error"
                print(f"-> Failed: {err}")
        except subprocess.TimeoutExpired:
            # If it timed out, it might be downloading!
            print(f"-> POTENTIAL SUCCESS! Client '{client}' timed out (which means it started downloading!)")
            success = True
            break
        except Exception as e:
            print(f"-> Error: {e}")
            
    if not success:
        print("\nAll yt-dlp client signatures failed to bypass the YouTube block.")

if __name__ == "__main__":
    test_clients()
