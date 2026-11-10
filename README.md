
# ESP32 GPS Tracker with React and Leaflet

This project implements a GPS tracker using an ESP32-S3 microcontroller and a NEO-6M GPS module. 
It was developed as part of my thesis for University of Applied Sciences. 
The ESP32 acts as a Wi-Fi-enabled server that shares GPS data in JSON format. 
A React-based frontend using the Leaflet library visualizes the GPS location on a map, 
accessible from devices on the same network.

### `The project is divided into two repositories:`
[ESP32 code](https://github.com/johannajes/GPS_ESP32).
[Map application code](https://github.com/johannajes/Map_App).

---

## Features
- **ESP32-S3**:
  - Reads GPS data via UART from the NEO-6M module.
  - Parses NMEA sentences to extract latitude and longitude.
  - Hosts an HTTP server to share GPS data in JSON format.

- **React Frontend**:
  - Displays the GPS location on an interactive map using Leaflet.
  - Automatically updates location in real-time.

---

## Requirements

### Hardware
- ESP32-S3 microcontroller.
- NEO-6M GPS module.
- USB cable for programming and power.

### Software
- ESP-IDF (ESP32 development framework).
- Visual Studio Code with the ESP-IDF extension.
- Node.js and npm (for React frontend).

---

## Setup and Usage

### ESP32 Firmware
1. Clone this repository.
2. Connect the NEO-6M GPS module to the ESP32-S3 or ESP32:
   - **GPS TX** to **ESP32S3 RXD2 (GPIO 18)** OR **ESP32 RX2 (GPIO 16)**
   - **GPS RX** to **ESP32S3 TXD2 (GPIO 17)** OR **ESP32 TX2 (GPIO 17)**
   - **VCC** and **GND** to power and ground pins on the ESP32-S3 or ESP32.
3. Open the project in Visual Studio Code.
4. Configure your Wi-Fi credentials and static IP in the `wifi_config.h`:
   ```c
   #define WIFI_SSID "your_wifi_name"
   #define WIFI_PASS "your_wifi_password"
   ```
5. Build and flash the firmware:
   ```bash
   idf.py build
   idf.py flash
   idf.py monitor
   ```
6. Once running, the ESP32 will host a web server accessible at `http://192.168.1.100/gps` (or the static IP you configured).

### React Frontend
1. Navigate to the `react-map` directory:
   ```bash
   cd react-map
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the ESP32 server URL in `App.js`:
   ```javascript
   const response = await axios.get("http://192.168.1.100/gps");
   ```
4. Start the React development server:
   ```bash
   npm start
   ```
5. Open the frontend in a browser on a device in the same network: `http://localhost:3000`.

---


## Project Structure

### ESP32 Firmware
- **`main/main.c`**: Contains the main application logic.
- **`main/uart_read.c`**: Handles UART communication with the GPS module.
- **`main/http_server.c`**: Manages Wi-Fi connection and HTTP server.

### React Frontend
- **`react-map/src/App.js`**: Main component that fetches GPS data and renders the map.
- **`react-map/src/components`**: Reusable components for the frontend.

---

## Dependencies

### ESP32
- ESP-IDF libraries:
  - `esp_wifi`
  - `esp_http_server`
  - `driver/uart`

### React
- `react`
- `react-leaflet`
- `axios`
- `leaflet`

### React dependencies install commands:
```bash
npm install react@latest react-dom@latest \
npm install leaflet react-leaflet \
npm install web-vitals
```

---

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## Acknowledgments
- **ESP-IDF Framework** by Espressif Systems.
- **React** for building the frontend.
- **Leaflet** library for interactive maps.
- **OpenStreetMap** for map tiles.

---

Feel free to contribute to this project! Submit issues on GitHub.

