import json
import urllib.request
import urllib.error
import time

def test_cobalt_formats():
    video_id = "kY_3t_7Rz5Y"
    
    # Try different URL variations of the same video
    url_variants = [
        f"https://www.youtube.com/watch?v={video_id}",
        f"https://youtu.be/{video_id}",
        f"https://www.youtube.com/embed/{video_id}",
        f"https://m.youtube.com/watch?v={video_id}",
        f"https://www.youtube.com/v/{video_id}"
    ]
    
    # Active public cobalt instances that resolved earlier
    instances = [
        "https://api.cobalt.tools",
        "https://api.cobalt.blackcat.sweeux.org",
        "https://cobalt.omega.wolfy.love",
        "https://cobaltapi.kittycat.boo",
        "https://nuko-c.meowing.de",
        "https://melon.clxxped.lol"
    ]
    
    success = False
    
    for url in url_variants:
        print(f"\n--- Testing URL Format: {url} ---")
        for instance in instances:
            print(f"Querying {instance}...")
            payload = {
                "url": url,
                "videoQuality": "360"
            }
            try:
                req = urllib.request.Request(
                    instance,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0'
                    },
                    method='POST'
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    res = json.loads(response.read().decode('utf-8'))
                    status = res.get("status")
                    if status in ["redirect", "stream", "picker", "tunnel"]:
                        print(f"-> SUCCESS! Got direct download link from {instance}: {res.get('url')[:100]}")
                        success = True
                        break
                    else:
                        print(f"-> Status: {status}")
            except Exception as e:
                # Try fallback API path
                try:
                    req = urllib.request.Request(
                        f"{instance.rstrip('/')}/api/json",
                        data=json.dumps(payload).encode('utf-8'),
                        headers={
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0'
                        },
                        method='POST'
                    )
                    with urllib.request.urlopen(req, timeout=8) as response:
                        res = json.loads(response.read().decode('utf-8'))
                        if res.get("url"):
                            print(f"-> SUCCESS via /api/json fallback from {instance}: {res.get('url')[:100]}")
                            success = True
                            break
                except Exception as e2:
                    print(f"-> Failed: {e}")
                    
        if success:
            break

if __name__ == "__main__":
    test_cobalt_formats()
