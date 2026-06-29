import json
import urllib.request
import urllib.error
import ssl

def check_invidious_cobalt():
    # Use the Invidious link instead of the YouTube link
    invidious_url = "https://yewtu.be/watch?v=kY_3t_7Rz5Y"
    
    payload = {
        "url": invidious_url,
        "videoQuality": "360"
    }
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    # Active public cobalt instances
    instances = [
        "https://api.cobalt.blackcat.sweeux.org",
        "https://api.qwkuns.me"
    ]
    
    for endpoint in instances:
        print(f"Querying Cobalt API at {endpoint} with Invidious URL...")
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
                    print(f"-> SUCCESS! Direct download URL obtained from {endpoint}: {res.get('url')[:120]}")
                    break
                else:
                    print(f"-> Status returned: {status} ({res.get('error', {}).get('code', 'unknown error')})")
        except Exception as e:
            print(f"-> Failed: {e}")

if __name__ == "__main__":
    check_invidious_cobalt()
