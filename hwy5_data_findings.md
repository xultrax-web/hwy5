# California Highway 5 (I-5) Road & Driving Data: Castaic to Santa Nella
*A Comprehensive Technical Guide to Traffic, Weather, Pavement, and Telemetry Data Resources*

---

## 1. Corridor Overview (Castaic to Santa Nella)

The Interstate 5 (I-5) corridor between **Castaic** (Los Angeles County) and **Santa Nella** (Merced County) spans approximately **205 miles** through central and southern California. This stretch represents one of the most critical freight and passenger corridors in the United States, transitioning from a mountainous, weather-sensitive pass into the agricultural heartland of the San Joaquin Valley.

```
[Castaic] ---> (Tejon Pass/Grapevine) ---> [Wheeler Ridge/SR-99] ---> (Central Valley Flat) ---> [Santa Nella]
 LA Co.          Mountainous (4k+ ft)            Kern Co.            Kings & Fresno Co.          Merced Co.
 PM 54.0               PM 88.6                    PM 10.0                                         PM 10.0
```

### County & Postmile Segments
Postmiles in California reset at county lines. The corridor is divided as follows:
*   **Los Angeles County (LA):** Postmile **LA 54.0** (Castaic) to **LA 88.6** (Kern County Line). *Distance: 34.6 miles.*
    *   *Characteristics:* High-elevation climb (up to 4,144 feet at Tejon Pass summit), steep downgrades (up to 6% on the Grapevine), heavy truck braking, and vulnerability to winter snow closures and high winds.
*   **Kern County (KER):** Postmile **KER 0.0** (LA County Line) to **KER 85.9** (Kings County Line). *Distance: 85.9 miles.*
    *   *Characteristics:* The foot of the Grapevine (Wheeler Ridge, junction with SR-99), passing west of Bakersfield and through Buttonwillow and Lost Hills. Primarily flat, high-speed agricultural highway.
*   **Kings County (KIN):** Postmile **KIN 0.0** (Kern County Line) to **KIN 18.7** (Fresno County Line). *Distance: 18.7 miles.*
    *   *Characteristics:* Flat valley terrain passing through Kettleman City (junction with SR-41).
*   **Fresno County (FRE):** Postmile **FRE 0.0** (Kings County Line) to **FRE 55.9** (Merced County Line). *Distance: 55.9 miles.*
    *   *Characteristics:* Long, straight stretches passing Coalinga (junction with SR-198) and Harris Ranch, transitioning through the west side of the Fresno agricultural area.
*   **Merced County (MER):** Postmile **MER 0.0** (Fresno County Line) to **MER 10.0** (Santa Nella / Junction with SR-152). *Distance: 10.0 miles.*
    *   *Characteristics:* Approaching O'Neill Forebay, San Luis Reservoir, and the major junction at Santa Nella linking I-5 to the Bay Area via Pacheco Pass (SR-152).

---

## 2. Traffic Flow & Speed Data (Caltrans PeMS)

The **Caltrans Performance Measurement System (PeMS)** is the definitive source for real-time and historical traffic data. PeMS aggregates data from physical loop detectors embedded in the highway lanes.

### System Metrics
For every detection station (VDS) along I-5, PeMS publishes the following data at **5-minute, hourly, and daily** granularities:
*   **Flow (Volume):** The exact number of vehicles passing over the detector.
*   **Speed:** Calculated average vehicle speed (in mph) across all lanes.
*   **Occupancy:** The percentage of time that vehicles are physically occupying the detector loop (used to determine congestion density).
*   **VMT (Vehicle Miles Traveled) & VHT (Vehicle Hours Traveled):** Key metrics for regional modeling.
*   **Delay:** Hours of delay calculated relative to free-flow speeds (usually baseline 35, 45, 55, or 60 mph).

### District Coverage for this Corridor
Data is separated into three regional Caltrans Districts:
1.  **District 7 (Los Angeles):** Manages I-5 from Castaic (LA 54.0) to the Kern County Line (LA 88.6).
2.  **District 6 (Fresno/Bakersfield):** Manages I-5 through Kern, Kings, and Fresno Counties.
3.  **District 10 (Stockton):** Manages I-5 through Merced County (including Santa Nella).

### Programmatic Access
*   **Web Portal:** Authorized users can view interactive charts, bottlenecks, and speed maps at [pems.dot.ca.gov](https://pems.dot.ca.gov/).
*   **Data Clearinghouse:** Raw text files (.txt or .gz) containing 5-minute loop detector data are available for bulk download daily/monthly. These are structured as tab- or comma-separated values:
    *   *Format:* `Timestamp, Station ID, District, Route, Direction, Lane Type, Station Length, Samples, % Observed, Volume, Occupancy, Speed, ...`
*   **API Web Services:** PeMS provides a queryable REST API returning JSON or XML data for specific stations or highway segments.

---

## 3. Commercial Vehicle & Weight Data (Weigh-in-Motion)

Caltrans operates **Weigh-in-Motion (WIM)** stations along the mainline of I-5. Unlike enforcement weigh stations, these sensors continuously capture telemetry for every heavy vehicle traveling at full highway speeds.

### Key Mainline WIM Stations on this Segment
*   **Castaic WIM (District 7):** Located at Postmile **LA R56.1** (with independent Northbound and Southbound sensors in the pavement).
*   **Stockdale WIM (District 6):** Located at Postmile **KER 48.7** (west of Bakersfield, capturing central valley flow).
*   **Santa Nella WIM (District 10):** Located at Postmile **MER 20.2** (just north of the Santa Nella interchange).

### Captured Telemetry
For every truck passing over a WIM sensor, the system records:
*   **Timestamp:** Precision down to the millisecond.
*   **Speed:** Running speed of the vehicle.
*   **Gross Vehicle Weight (GVW):** Total weight in pounds.
*   **Axle Weights:** The weight applied by each individual axle.
*   **Axle Spacing:** The distance (in feet/inches) between each successive axle.
*   **Overall Length:** Total vehicle length.
*   **Classification:** Sorted into the **FHWA 13-Class System** (e.g., Class 5 for 2-axle trucks, Class 9 for standard 5-axle tractor-trailers, Class 13 for multi-trailer combinations).

### Data Formats & Access
*   **Caltrans WIM Reports:** Monthly reports can be downloaded in PDF or Excel format from the [Caltrans WIM Data Portal](https://dot.ca.gov/programs/traffic-operations/fms/wim).
*   **National Database (TMAS):** WIM data from these stations is formatted to comply with the Federal Highway Administration (FHWA) **Travel Monitoring Analysis System (TMAS)** standard. TMAS files are structured in fixed-width ASCII cards:
    *   *Station Description Cards:* Meta-data about the physical sensor.
    *   *Weight Cards:* Detailed vehicle records including lane, direction, vehicle class, gross weight, and axle loads.

---

## 4. Road Weather & Environmental Data (RWIS)

Environmental factors like high winds, ice, snow on the Grapevine, and dense "Tule fog" in the Central Valley present major safety hazards. Caltrans deploys **Road Weather Information Systems (RWIS)** to monitor these elements.

### Critical RWIS Stations
*   **Lebec / Tejon Pass Summit:** Monitors mountain pass conditions (snow, freezing temperatures, black ice, and wind gusts up to 50+ mph).
*   **Kettleman City / Coalinga:** Monitors the flat valley plains (heavy crosswinds and severe dust/fog visibility hazards).
*   **Santa Nella / San Luis Reservoir:** Monitors wind currents off the Diablo Range and reservoir area.

### RWIS Telemetry Parameters
Each station records and transmits the following every 5 to 15 minutes:
*   **Atmospheric Data:** Air temperature, relative humidity, dew point, wind speed, wind direction, wind gusts, and precipitation type/rate.
*   **Pavement Sensors:** Pavement surface temperature, sub-surface temperature (to detect freezing ground), water film depth, and chemical factor (estimates the concentration of salt/de-icer on the road).
*   **Visibility Sensors:** Uses optical backscatter sensors to measure atmospheric visibility in feet or meters (critical for valley fog events).

### Data Access Ports
*   **Caltrans WeatherShare:** Visualized meteorological mapping is available on [weathershare.org](https://weathershare.org/).
*   **CWWP Weather Feed:** Real-time XML/JSON formats are served via the Caltrans Commercial Wholesale Web Portal (CWWP) under the `RWIS` data stream.

---

## 5. Traffic Volume Census & Truck Percentages (AADT)

The **Caltrans Traffic Census Program** conducts continuous and coverage count programs to publish Annual Average Daily Traffic (AADT) statistics.

### AADT Profile (Castaic to Santa Nella)
Traffic volumes peak in Los Angeles County, drop significantly through the rural Central Valley, and rise again as the corridor approaches the Bay Area connections.

| Location Reference | County-Postmile | Approx. Total AADT | Approx. Truck AADT % |
| :--- | :--- | :--- | :--- |
| **Castaic (Lake Hughes Rd)** | LA 54.9 | ~98,000 | 18% |
| **Grapevine (Fort Tejon)** | LA 80.0 | ~75,000 | 25% |
| **Wheeler Ridge (SR-99 Junction)** | KER 10.4 | ~45,000 | 32% |
| **Lost Hills (SR-46 Junction)** | KER 57.8 | ~38,000 | 35% |
| **Kettleman City (SR-41 Junction)** | KIN 18.0 | ~35,000 | 38% |
| **Coalinga (SR-198 Junction)** | FRE 19.3 | ~36,000 | 36% |
| **Santa Nella (SR-152 Junction)** | MER 10.2 | ~52,000 | 28% |

*Data shows that in the middle of the Central Valley (Kings & Fresno Counties), over one-third of all vehicles on I-5 are commercial freight trucks.*

### Access & Formats
*   **Tabular Data:** Annual PDF and Excel spreadsheets are published on the [Caltrans Traffic Operations Census Portal](https://dot.ca.gov/programs/traffic-operations/census).
*   **GIS Layers:** Shapefiles, GeoJSON, and KML layers mapping AADT and Truck AADT to physical highway links can be downloaded via the [California Open Data Portal](https://data.ca.gov/).

---

## 6. Pavement Condition Data (APMS)

Caltrans collects physical road surface data using the **Automated Pavement Management System (APMS)**. High-tech Automated Road Analyzer (ARAN) vehicles drive the lanes annually to scan the pavement structure.

### Key Condition Metrics
*   **IRI (International Roughness Index):** Measured in inches per mile. An IRI under 95 indicates a smooth ride, while an IRI over 170 indicates rough, deteriorated pavement.
*   **Rutting Depth:** The depth of depressions (in inches) worn into the asphalt by heavy truck tires in the wheelpaths.
*   **Cracking:** Categorized by type (alligator cracking, longitudinal cracking) and severity.
*   **Faulting:** Vertical displacement between concrete slabs (critical on the concrete sections of I-5 in the Central Valley).

### Access Method
*   Pavement data is mapped by postmile and is queryable through the **Caltrans Pavement Interactive Map** or downloadable as GIS geodatabases from the Caltrans Division of Maintenance.

---

## 7. Real-Time Telemetry & Visual Streams (CWWP)

For active applications, developers can scrape or ingest real-time XML and JSON feeds directly from the **Caltrans Commercial Wholesale Web Portal (CWWP)**.

### Available Live Feeds
1.  **CCTV (Closed-Circuit Television):** Links to static image captures (`.jpg`) from roadside cameras, updated every 1 to 5 minutes.
    *   *Density:* High camera density over the Grapevine (Castaic to Grapevine) and at major highway junctions (SR-99, SR-46, SR-41, SR-198, SR-152).
2.  **CMS (Changeable Message Signs):** Displays the current real-time text shown on overhead digital warning boards (e.g., "TRUCKS USE LOW GEARS NEXT 5 MILES" or "FOG AHEAD REDUCE SPEED").
3.  **LCS (Lane Closure System):** Real-time database of planned and active lane closures, construction, maintenance work, and emergency incidents.

### Endpoint Structure
*   **CWWP Address:** `https://cwwp.dot.ca.gov/`
*   **Data Types:** Tabular data is typically requested via specific endpoints returning structured XML documents (e.g., `/data/xs/cctv-lcs.xml`).
*   **GIS REST Services:** Caltrans hosts these layers as ArcGIS Feature Services (GeoServices REST API) via the CA.gov GIS hub. Querying these endpoints returns standard GeoJSON objects containing GPS coordinates, current camera status, and image links.
