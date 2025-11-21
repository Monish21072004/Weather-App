# 🌤️ **Weather App**

Live Demo: **[https://monish21072004.github.io/Weather-App/](https://monish21072004.github.io/Weather-App/)**

Weather App is a **modern, glassmorphism-based weather application** that shows real-time weather, forecasts, air quality, radar maps, voice search, and beautiful dynamic animations. It is fully responsive and designed for a smooth user experience.

The app uses **Open-Meteo APIs**, **Chart.js**, **TailwindCSS**, and a custom **Canvas animation engine** that adapts to the weather automatically.
Source UI and logic is based on the deployed code in your project .

---

## 🚀 **Features**

### 🌦️ **Accurate Real-Time Weather**

* Temperature & feels-like
* Weather code interpretation
* Humidity, pressure, visibility
* Rain/snow detection
* Auto day/night mode

### 🎨 **Dynamic UI & Weather Animations**

* Background changes dynamically for:

  * Sunny
  * Cloudy
  * Rain
  * Snow
  * Thunderstorms
  * Fog
  * Day/Night
* Canvas-based particle animations:

  * Rain streaks
  * Snow flakes
  * Starry night sky
  * Drifting clouds

### 🔍 **Smart Search + Voice Input**

* Auto-suggestions for cities
* Clickable dropdown options
* Microphone search (SpeechRecognition API)

### ⭐ **Favorites System**

* Save & load favorite locations
* Stored in browser `localStorage`
* Quick-access city chips

### 📊 **24-Hour Temperature Graph**

* Smooth animated line chart
* Auto color adaptation for dark/light themes
* Responsive design

### 📅 **7-Day Forecast**

* Icons + description
* Max/Min temperature
* Day-wise summary

### 🗺️ **Live Weather Radar**

* Embedded Windy radar
* Shows rain overlay
* Auto-centered to searched city

### 🌫️ **Air Quality**

* Live AQI from Open-Meteo
* Color-coded category badge

### 🔅 **UV Index Visualizer**

* Gradient bar showing UV intensity

### 🌅 **Sunrise & Sunset**

---

## 🛠️ **Tech Stack**

| Technology                 | Purpose                           |
| -------------------------- | --------------------------------- |
| **HTML, CSS, JS**          | Primary UI & logic                |
| **Tailwind CSS**           | Glassmorphism + responsive layout |
| **Chart.js**               | Trend graph                       |
| **Open-Meteo Weather API** | Current/hourly/daily forecasts    |
| **Open-Meteo AQI API**     | Air quality                       |
| **Windy.com Embed**        | Live radar                        |
| **SpeechRecognition API**  | Voice input                       |
| **Canvas API**             | Weather particle animations       |

---

## 📂 **Project Structure**

```
Weather-App/
│── index.html        # Main application
│── README.md         # Documentation
│── assets/           # Optional: images/icons
```

---

## ⚙️ **How It Works**

### 1️⃣ Geocoding → Weather Fetch

City name → latitude/longitude → weather, AQI, forecast, UV, and more.

### 2️⃣ Weather Rendering

* Converts WMO codes
* Computes dew point
* Updates UI + icons
* Triggers the matching animation

### 3️⃣ Dynamic Mode Adjustments

* Day vs night themes
* Weather-based gradient
* Starts rain/snow/star animations

### 4️⃣ Temperature Trend Graph

* Next 24 hours plotted via Chart.js
* Auto-updates when units switch (°C/°F)

### 5️⃣ Favorites

Saved in localStorage, displayed as clickable chips.

---

## 💻 **Setup & Run Locally**

1. Clone the repo:

```bash
git clone https://github.com/monish21072004/Weather-App.git
```

2. Open the project folder:

```bash
cd Weather-App
```

3. Run locally:
   Just open `index.html` in any browser — no server needed.

---

## 🚀 **Deploy on GitHub Pages**

1. Go to **Settings → Pages**
2. Select **main branch** and **root**
3. Save
4. Your Weather App becomes live instantly

---

## 🤝 Contributing

Pull requests and features are welcome!
Feel free to open issues for bugs, UI/UX improvements, or new ideas.

---

## 📜 License

This project is open-source under the **MIT License**.


