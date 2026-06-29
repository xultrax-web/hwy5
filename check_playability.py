import urllib.request
import re
import ssl
import json

def check_playability():
    url = "https://www.youtube.com/watch?v=kY_3t_7Rz5Y"
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    )
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
            # Find ytInitialPlayerResponse JSON
            match = re.search(r'ytInitialPlayerResponse\s*=\s*(\{.*?\});', html)
            if not match:
                # Try search in window['ytInitialPlayerResponse']
                match = re.search(r'ytInitialPlayerResponse\s*=\s*(\{.*?\})\s*</script>', html)
            
            if match:
                try:
                    js_data = json.loads(match.group(1))
                    status_block = js_data.get("playabilityStatus", {})
                    print("Playability Status:")
                    print(json.dumps(status_block, indent=2))
                except Exception as e:
                    print("Failed parsing JSON block, regex match text:")
                    print(match.group(1)[:500])
                    print("Error:", e)
            else:
                # Search simple patterns
                print("ytInitialPlayerResponse block not found.")
                m = re.search(r'"playabilityStatus":\s*(\{.*?\})', html)
                if m:
                    print("Playability status found via direct regex:", m.group(1))
                else:
                    print("Could not find playabilityStatus in page.")
                    
    except Exception as e:
        print("Error fetching page:", e)

if __name__ == "__main__":
    check_playability()
