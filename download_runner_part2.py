import os
import json
import urllib.request
import urllib.error
import time

def download_video_via_api():
    # Target URL: Part 2 of the SF drive (covering northern I-5)
    yt_url = "https://www.youtube.com/watch?v=kY_3t_7Rz5Y"
    output_path = "C:/Dev/hwy5/valley_real.mp4"
    
    # Active backend API URLs
    api_endpoints = [
        "https://api.cobalt.blackcat.sweeux.org",
        "https://cobalt.omega.wolfy.love",
        "https://cobaltapi.kittycat.boo",
        "https://nuko-c.meowing.de",
        "https://melon.clxxped.lol"
    ]
    
    payload = {
        "url": yt_url,
        "videoQuality": "360"
    }
    
    download_url = None
    for endpoint in api_endpoints:
        print(f"Querying Cobalt API: {endpoint}...")
        try:
            req = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                },
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                res = json.loads(response.read().decode('utf-8'))
                status = res.get("status")
                if status in ["redirect", "stream", "picker", "tunnel"]:
                    download_url = res.get("url")
                    print(f"Success! Direct download URL obtained from {endpoint} (status: {status}).")
                    break
        except Exception as e:
            print(f"Error querying {endpoint}: {e}")
            continue
            
    if not download_url:
        print("Error: Could not retrieve download URL.")
        return

    # Start downloading the file
    print(f"Downloading video from: {download_url}")
    print(f"Saving to: {output_path}")
    
    start_time = time.time()
    try:
        urllib.request.urlretrieve(download_url, output_path)
        duration = time.time() - start_time
        file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"Download complete! Saved {file_size_mb:.2f} MB in {duration:.1f} seconds.")
    except Exception as e:
        print(f"Error downloading file: {e}")

if __name__ == "__main__":
    download_video_via_api()
