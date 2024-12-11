# Створення проекту
npx create-react-app bitcoin-predictor
# Перейти в директорію проекту
cd bitcoin-predictor
# Встановлення залежностей
npm install @tensorflow/tfjs recharts
# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

bitcoin-predictor/
├── src/
│   ├── components/           # React компоненти
│   │   ├── BitcoinPricePredictor.js  # Головний компонент
│   │   ├── PriceChart.js    # Компонент для візуалізації
│   │   └── ModelMetrics.js  # Компонент для відображення метрик
│   ├── services/
│   │   ├── api.js           # Сервіс для роботи з API
│   │   └── modelService.js  # Сервіс для роботи з ML моделлю
│   └── App.js               # Головний компонент додатку

