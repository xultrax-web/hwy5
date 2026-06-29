import json
import urllib.request
import urllib.error
import ssl

def check_alternative():
    # Video ID: 0h9Vp-dD35s (Wheeler Ridge to Tracy drive, covering I-5 North through the valley)
    yt_url = "https://www.youtube.com/watch?v=0h9Vp-dD35s"
    
    payload = {
        "url": yt_url,
        "videoQuality": "360"
    }
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    # Try the Cobalt mirror that succeeded earlier
    endpoint = "https://api.cobalt.blackcat.sweeux.org"
    print(f"Querying Cobalt API for alternative video (0h9Vp-dD35s) at {endpoint}...")
    
    try:
        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            method='POST'
        )
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            res = json.loads(response.read().decode('utf-8'))
            status = res.get("status")
            if status in ["redirect", "stream", "picker", "tunnel"]:
                print(f"-> SUCCESS! Direct download URL obtained: {res.get('url')[:100]}")
            else:
                print(f"-> Status returned: {status}")
    except Exception as e:
        print(f"-> Failed: {e}")

if __name__ == "__main__":
    check_alternative()
