import json
import urllib.request
import urllib.error
import time
import ssl
import os

def download_valley():
    # The actual active Video ID for Part 2!
    video_id = "_CWcp1FsI40"
    yt_url = f"https://www.youtube.com/watch?v={video_id}"
    output_path = "C:/Dev/hwy5/valley_real.mp4"
    
    payload = {
        "url": yt_url,
        "videoQuality": "360"
    }
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    # Try active Cobalt instances
    endpoints = [
        "https://api.cobalt.blackcat.sweeux.org",
        "https://cobaltapi.kittycat.boo",
        "https://cobalt.omega.wolfy.love",
        "https://melon.clxxped.lol"
    ]
    
    download_url = None
    successful_endpoint = None
    
    for endpoint in endpoints:
        print(f"Querying Cobalt API at {endpoint} for the active Part 2 video...")
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
            with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
                res = json.loads(response.read().decode('utf-8'))
                status = res.get("status")
                if status in ["redirect", "stream", "picker", "tunnel"]:
                    download_url = res.get("url")
                    successful_endpoint = endpoint
                    print(f"-> SUCCESS! Direct download URL obtained from {endpoint} (status: {status}).")
                    break
                else:
                    print(f"-> Status: {status}")
        except Exception as e:
            print(f"-> Failed: {e}")
            continue
            
    if not download_url:
        print("\nError: All Cobalt instances failed for the active video ID.")
        return
        
    print(f"\nDownloading video from stream: {download_url[:100]}...")
    print(f"Saving to: {output_path}")
    
    start_time = time.time()
    try:
        req_dl = urllib.request.Request(
            download_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        )
        with urllib.request.urlopen(req_dl, context=ctx) as dl_response:
            with open(output_path, 'wb') as out_file:
                chunk_size = 64 * 1024
                bytes_dl = 0
                while True:
                    chunk = dl_response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    bytes_dl += len(chunk)
                    
        duration = time.time() - start_time
        file_size_mb = bytes_dl / (1024 * 1024)
        print(f"Download complete! Saved {file_size_mb:.2f} MB in {duration:.1f} seconds using {successful_endpoint}.")
    except Exception as e:
        print(f"Error downloading stream: {e}")

if __name__ == "__main__":
    download_valley()
