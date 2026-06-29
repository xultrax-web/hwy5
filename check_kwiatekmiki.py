import json
import urllib.request
import urllib.error
import ssl

def check_kwiatekmiki():
    # Video ID: kY_3t_7Rz5Y (Part 2 of the drive)
    yt_url = "https://www.youtube.com/watch?v=kY_3t_7Rz5Y"
    
    payload = {
        "url": yt_url,
        "videoQuality": "360"
    }
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    # Try the default API endpoint from the gobalt library
    endpoint = "https://cobalt-api.kwiatekmiki.com"
    print(f"Querying new Cobalt API (kwiatekmiki.com) for video kY_3t_7Rz5Y...")
    
    try:
        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            method='POST'
        )
        with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
            res = json.loads(response.read().decode('utf-8'))
            status = res.get("status")
            if status in ["redirect", "stream", "picker", "tunnel"]:
                print(f"-> SUCCESS! Direct download URL obtained: {res.get('url')[:120]}")
            else:
                print(f"-> Status returned: {status}")
    except Exception as e:
        print(f"-> Failed: {e}")

if __name__ == "__main__":
    check_kwiatekmiki()
