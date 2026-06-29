import os
import json
import urllib.request
import urllib.error
import time
import ssl

def test_all_cobalt():
    video_id = "kY_3t_7Rz5Y"
    yt_url = f"https://www.youtube.com/watch?v={video_id}"
    output_path = "C:/Dev/hwy5/valley_real.mp4"
    
    # Fresh list of hosts directly scraped from cobalt.directory
    hosts = [
        "cobalt.meowing.de",
        "cobalt.canine.tools",
        "cobalt.blackcat.sweeux.org",
        "cobalt.clxxped.lol",
        "cobalt.kittycat.boo",
        "cobalt.squair.xyz",
        "qwkuns.me",
        "cobalt.xenon.zone",
        "cobalt.cjs.nz"
    ]
    
    # Generate API endpoints based on host patterns
    instances = []
    for host in hosts:
        instances.append(f"https://{host}")
        instances.append(f"https://{host}/api/json")
        # Try api. subdomain
        if host.startswith("cobalt."):
            api_sub = "api." + host
            instances.append(f"https://{api_sub}")
            instances.append(f"https://{api_sub}/api/json")
        else:
            instances.append(f"https://api.{host}")
            
    # Deduplicate
    instances = sorted(list(set(instances)))
    
    payload = {
        "url": yt_url,
        "videoQuality": "360"
    }
    
    download_url = None
    successful_instance = None
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    for instance in instances:
        print(f"Testing Cobalt API: {instance} ...")
        try:
            req = urllib.request.Request(
                instance,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                method='POST'
            )
            with urllib.request.urlopen(req, context=ctx, timeout=8) as response:
                res = json.loads(response.read().decode('utf-8'))
                status = res.get("status")
                if status in ["redirect", "stream", "picker", "tunnel"]:
                    download_url = res.get("url")
                    successful_instance = instance
                    print(f"-> SUCCESS! Got URL from {instance} (status: {status})")
                    break
                else:
                    print(f"-> Status returned: {status}")
        except Exception as e:
            print(f"-> Failed: {e}")
            continue
            
    if not download_url:
        print("\nAll scraped Cobalt directory instances failed to bypass the YouTube signature block.")
        return
        
    print(f"\nStarting download from: {download_url}")
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
        print(f"Download complete! Saved {file_size_mb:.2f} MB in {duration:.1f} seconds using {successful_instance}.")
    except Exception as e:
        print(f"Error downloading from stream: {e}")

if __name__ == "__main__":
    test_all_cobalt()
