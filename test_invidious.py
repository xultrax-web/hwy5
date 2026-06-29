import json
import urllib.request
import urllib.error
import ssl
import time
import os

def test_invidious():
    video_id = "kY_3t_7Rz5Y"
    output_path = "C:/Dev/hwy5/valley_real.mp4"
    
    # Active public Invidious instances
    instances = [
        "https://yewtu.be",
        "https://invidious.projectsegfau.lt",
        "https://invidio.xamh.de",
        "https://invidious.weblibre.org",
        "https://invidious.lunar.icu",
        "https://invidious.esma.io",
        "https://inv.tux.im",
        "https://vid.puffyan.us",
        "https://invidious.flokinet.to",
        "https://invidious.privacydev.net",
        "https://inv.skynets.org",
        "https://invidious.no-logs.com"
    ]
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    stream_url = None
    successful_instance = None
    
    for instance in instances:
        api_url = f"{instance.rstrip('/')}/api/v1/videos/{video_id}"
        print(f"Testing Invidious API: {api_url} ...")
        
        try:
            req = urllib.request.Request(
                api_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            )
            with urllib.request.urlopen(req, context=ctx, timeout=8) as response:
                res = json.loads(response.read().decode('utf-8'))
                
                # Check for formatStreams or adaptiveFormats
                format_streams = res.get("formatStreams", [])
                if not format_streams:
                    # try adaptiveFormats
                    format_streams = res.get("adaptiveFormats", [])
                    
                if format_streams:
                    # Find a format that has video and size matching 360p or 720p
                    # Or just pick the first format stream
                    for f in format_streams:
                        # Find a standard mp4 format if possible
                        if f.get("container") == "mp4" or "mp4" in f.get("type", ""):
                            stream_url = f.get("url")
                            if stream_url:
                                successful_instance = instance
                                print(f"-> SUCCESS! Got direct stream URL from {instance} ({f.get('qualityLabel', 'unknown')})")
                                break
                    if stream_url:
                        break
        except Exception as e:
            print(f"-> Failed: {e}")
            continue
            
    if not stream_url:
        print("\nAll Invidious instances failed to retrieve the video stream.")
        return
        
    print(f"\nDownloading video from direct stream: {stream_url[:100]}...")
    print(f"Saving to: {output_path}")
    
    start_time = time.time()
    try:
        req_dl = urllib.request.Request(
            stream_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        )
        with urllib.request.urlopen(req_dl, context=ctx, timeout=20) as dl_response:
            with open(output_path, 'wb') as out_file:
                # Read in chunks of 64KB
                chunk_size = 64 * 1024
                bytes_downloaded = 0
                while True:
                    chunk = dl_response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    bytes_downloaded += len(chunk)
                    
        duration = time.time() - start_time
        file_size_mb = bytes_downloaded / (1024 * 1024)
        print(f"Download complete! Saved {file_size_mb:.2f} MB in {duration:.1f} seconds using {successful_instance}.")
    except Exception as e:
        print(f"Error downloading stream: {e}")

if __name__ == "__main__":
    test_invidious()
