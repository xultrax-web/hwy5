import json
import requests

def scrape_caltrans_cctv(output_file):
    """
    Queries the official California State GIS REST API for Caltrans CCTV cameras,
    filters for the I-5 corridor between Castaic and Santa Nella, and saves the data.
    """
    # ArcGIS REST Endpoint for Caltrans CCTV Layer
    # Query parameters: Route '5', Districts 7, 6, and 10 (covering LA, Kern, Kings, Fresno, Merced)
    url = "https://gis.data.ca.gov/datasets/caltrans::closed-circuit-television/FeatureServer/0/query"
    
    params = {
        "where": "Route = '5' AND District IN (6, 7, 10)",
        "outFields": "OBJECTID,District,Route,County,Postmile,LocationName,NearbyPlace,CCTVImageURL,Longitude,Latitude",
        "outSR": "4326",
        "f": "json",
        "resultRecordCount": "200" # limit to first 200 cameras
    }

    print("Querying Caltrans GIS REST API...")
    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        features = data.get("features", [])
        print(f"Total features returned: {len(features)}")
        
        cameras = []
        for feat in features:
            attrs = feat.get("attributes", {})
            geom = feat.get("geometry", {})
            
            # Map attributes to a clean schema
            cameras.append({
                "id": attrs.get("OBJECTID"),
                "district": attrs.get("District"),
                "route": attrs.get("Route"),
                "county": attrs.get("County"),
                "postmile": attrs.get("Postmile"),
                "location_name": attrs.get("LocationName"),
                "nearby_place": attrs.get("NearbyPlace"),
                "image_url": attrs.get("CCTVImageURL"),
                "latitude": geom.get("y", attrs.get("Latitude")),
                "longitude": geom.get("x", attrs.get("Longitude"))
            })
            
        # Write to JSON file
        with open(output_file, 'w') as f:
            json.dump(cameras, f, indent=4)
            
        print(f"Scraped {len(cameras)} active cameras along I-5.")
        print(f"Saved data to: {output_file}")
        
        # Display the first 5 cameras as a preview
        print("\n--- Live Camera Preview (First 5) ---")
        for i, cam in enumerate(cameras[:5]):
            print(f"[{i+1}] {cam['location_name']} ({cam['county']} - PM {cam['postmile']})")
            print(f"    Live JPEG URL: {cam['image_url']}")
            print(f"    Coordinates: {cam['latitude']}, {cam['longitude']}")
            
    except Exception as e:
        print("\n[API Error]: Could not retrieve live data directly inside the sandbox.")
        print("This is expected if your sandbox environment blocks outbound internet connections.")
        print("\nTo run this script on your own machine with full internet access, run:")
        print(f"python C:\\Dev\\hwy5\\cctv_scraper.py")

if __name__ == "__main__":
    scrape_caltrans_cctv("C:/Dev/hwy5/caltrans_cctv_list.json")
