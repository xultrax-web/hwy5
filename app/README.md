# CALCUP26 I-5 Live Drive Simulator

Static browser simulator for a live public Glympse journey tagged `!calcup26`, following the practical Irvine, CA to Alameda, CA route via I-5 and the I-580 connector.

## Features

- Live Glympse tag polling and decoded trail tracking
- Manual GPS and simulated drive fallback
- First-person windshield view
- Drone follow view
- Overhead map view
- I-5/I-580 route intelligence and milestone notes
- Map-only traffic visualization with optional Google Maps TrafficLayer API key

## Local Run

```powershell
python -m http.server 4188
```

Open:

```text
http://127.0.0.1:4188/
```

## Notes

Traffic must remain off the first-person view. Traffic is shown only in the map/drone/overhead route context and sidebar metrics.
