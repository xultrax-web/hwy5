import urllib.request
import re
import ssl

def scrape_youtube_search():
    query = "Frequent+Driver+Los+Angeles+to+San+Francisco+Complete+Drive+Part+2"
    url = f"https://www.youtube.com/results?search_query={query}"
    
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    )
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
            # Find all videoId matches in the page
            video_ids = re.findall(r'"videoId"\s*:\s*"([^"]+)"', html)
            # Also try escaped quotes pattern
            video_ids_escaped = re.findall(r'\\\"videoId\\\"\s*:\s*\\\"([^\\\"]+)\\\"', html)
            
            all_ids = list(set(video_ids + video_ids_escaped))
            print("Found YouTube Video IDs:")
            for vid in all_ids:
                # Get the title associated with the video ID if possible
                title_match = re.search(f'"{vid}".*?"title".*?"text"\s*:\s*"([^"]+)"', html)
                if not title_match:
                    title_match = re.search(f'"{vid}".*?\\"title\\".*?\\"text\\"\s*:\s*\\\"([^\\\"]+)\\\"', html)
                title = title_match.group(1) if title_match else "Unknown Title"
                print(f"  - {vid} : {title}")
                
    except Exception as e:
        print("Error scraping search results:", e)

if __name__ == "__main__":
    scrape_youtube_search()
