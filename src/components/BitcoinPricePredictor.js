// src/components/BitcoinPricePredictor.js
import React, { useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import { fetchBitcoinData } from "../services/api";
import { BitcoinPriceModel } from "../services/modelService";
import { checkWebGLSupport } from "../utils/systemCheck";
import PriceChart from "./PriceChart";
import ModelMetrics from "./ModelMetrics";

const BitcoinPricePredictor = () => {
  const [historicalData, setHistoricalData] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState(null);
  const [model] = useState(() => new BitcoinPriceModel());
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [currentLoss, setCurrentLoss] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [backend, setBackend] = useState("Initializing...");
  const [systemInfo, setSystemInfo] = useState(null);

  // Ініціалізація TensorFlow
  useEffect(() => {
    const initTF = async () => {
      try {
        await tf.ready();

        // Перевіряємо WebGL
        const webGLInfo = checkWebGLSupport();
        console.log("WebGL Info:", webGLInfo);

        if (webGLInfo.supported) {
          // Пробуємо використати WebGL
          await tf.setBackend("webgl");

          // Отримуємо інформацію про поточний бекенд
          const currentBackend = tf.getBackend();
          const memory = tf.memory();

          setSystemInfo({
            ...webGLInfo,
            tfBackend: currentBackend,
            memoryInfo: {
              numTensors: memory.numTensors,
              numBytes: memory.numBytes,
            },
          });

          setBackend(`Using GPU with WebGL: ${webGLInfo.renderer}`);
          console.log("TensorFlow.js initialized with WebGL backend");
        } else {
          // Використовуємо CPU
          await tf.setBackend("cpu");
          const memory = tf.memory();

          setSystemInfo({
            supported: false,
            tfBackend: "CPU",
            reason: webGLInfo.error || "WebGL not supported",
            memoryInfo: {
              numTensors: memory.numTensors,
              numBytes: memory.numBytes,
            },
          });

          setBackend("Using CPU backend (WebGL not available)");
          console.log("TensorFlow.js initialized with CPU backend");
        }

        // Тестування продуктивності
        const perfTest = await testPerformance();
        setSystemInfo((prev) => ({
          ...prev,
          performanceTest: perfTest,
        }));
      } catch (err) {
        console.error("TF initialization error:", err);
        setError("Failed to initialize TensorFlow");
        setSystemInfo({
          error: err.message,
          tfBackend: "Failed",
        });
      }
    };

    initTF();
  }, []);
  // Функція для тестування продуктивності
  const testPerformance = async () => {
    try {
      const startTime = performance.now();

      // Створюємо тестовий тензор
      const testTensor = tf.tensor2d(
        Array(1000)
          .fill(0)
          .map(() => Array(1000).fill(1))
      );

      // Виконуємо просту операцію
      const result = tf.matMul(testTensor, testTensor);
      await result.data(); // Чекаємо завершення обчислень

      const endTime = performance.now();

      // Очищаємо пам'ять
      testTensor.dispose();
      result.dispose();

      return {
        executionTime: endTime - startTime,
        success: true,
      };
    } catch (error) {
      return {
        executionTime: 0,
        success: false,
        error: error.message,
      };
    }
  };
  // Завантаження даних
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchBitcoinData(365);
        setHistoricalData(data);
      } catch (err) {
        setError("Failed to load Bitcoin data");
      }
    };

    loadData();
  }, []);

  const handleTrainModel = async () => {
    if (!historicalData.length) return;

    try {
      setIsTraining(true);
      setError(null);
      setCurrentEpoch(0);
      setCurrentLoss(null);

      const startTime = performance.now();

      // Підготовка даних
      const prices = historicalData.map((d) => d.price);
      console.log("Data prepared, starting model training...");

      // Створюємо модель
      model.createModel();
      console.log("Model created, normalizing data...");

      // Нормалізуємо дані
      const normalizedData = model.normalizeData(prices);
      const [X, y] = model.prepareTrainingData(normalizedData);
      console.log("Data normalized, starting training...");

      // Тренуємо модель
      await model.trainModel(X, y, 50, 32, (epoch, logs) => {
        setCurrentEpoch(epoch + 1);
        setCurrentLoss(logs.loss);

        // Виводимо прогрес
        const progress = ((epoch + 1) / 50) * 100;
        console.log(`Training progress: ${progress.toFixed(1)}%`);
        console.log(`Epoch ${epoch + 1}/50`);
        console.log(`Loss: ${logs.loss.toFixed(6)}`);

        if (logs.val_loss) {
          console.log(`Validation Loss: ${logs.val_loss.toFixed(6)}`);
        }
      });

      const trainingTime = (performance.now() - startTime) / 1000;
      console.log(`Training completed in ${trainingTime.toFixed(2)} seconds`);

      // Робимо прогноз
      console.log("Making prediction...");
      const lastWeek = normalizedData.slice(-7);
      const predictionInput = tf.tensor2d([lastWeek]).reshape([1, 7, 1]);
      const predictedPrice = await model.predict(predictionInput);
      setPrediction(predictedPrice);
      console.log(`Predicted price: ${predictedPrice.toFixed(2)}`);

      // Очищуємо тензор прогнозу
      predictionInput.dispose();

      // Оцінка точності моделі
      console.log("Evaluating model accuracy...");
      const modelMetrics = await model.evaluateHistoricalAccuracy(
        historicalData
      );
      setMetrics(modelMetrics);
      console.log("Model metrics:", modelMetrics);
    } catch (err) {
      console.error("Training error:", err);
      setError(`Training failed: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* System Info Display */}
      {systemInfo && (
        <div className="bg-gray-100 rounded-lg p-4 space-y-2">
          <h3 className="font-bold text-lg">System Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">TensorFlow Backend</p>
              <p className="font-medium">{systemInfo.tfBackend}</p>
            </div>
            {systemInfo.supported && (
              <>
                <div>
                  <p className="text-sm text-gray-600">GPU/Renderer</p>
                  <p className="font-medium">{systemInfo.renderer}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">WebGL Version</p>
                  <p className="font-medium">{systemInfo.version}</p>
                </div>
              </>
            )}
            {systemInfo.performanceTest && (
              <div>
                <p className="text-sm text-gray-600">Performance Test</p>
                <p className="font-medium">
                  {systemInfo.performanceTest.success
                    ? `${systemInfo.performanceTest.executionTime.toFixed(2)}ms`
                    : "Failed"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        {backend}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-4">
          <button
            onClick={handleTrainModel}
            disabled={isTraining || historicalData.length === 0}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              isTraining
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isTraining ? "Training Model..." : "Start Training"}
          </button>

          {isTraining && (
            <div className="text-center space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{
                    width: `${(currentEpoch / 50) * 100}%`,
                  }}
                ></div>
              </div>
              <p className="text-gray-600">
                Training Progress: {currentEpoch}/50 epochs (
                {((currentEpoch / 50) * 100).toFixed(1)}%)
              </p>
              {currentLoss !== null && (
                <p className="text-gray-600">
                  Current Loss: {currentLoss.toFixed(6)}
                </p>
              )}
              <p className="text-sm text-gray-500">
                The lower the loss, the better the model is performing
              </p>
            </div>
          )}
        </div>
      </div>

      <PriceChart data={historicalData} prediction={prediction} />

      {prediction && (
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <h3 className="text-xl font-bold text-gray-800">
            Price Prediction for Tomorrow
          </h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            ${prediction.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Last known price: $
            {historicalData[historicalData.length - 1].price.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">
            Expected change:{" "}
            {(
              ((prediction - historicalData[historicalData.length - 1].price) /
                historicalData[historicalData.length - 1].price) *
              100
            ).toFixed(2)}
            %
          </p>
        </div>
      )}

      {metrics && <ModelMetrics metrics={metrics} />}
    </div>
  );
};

export default BitcoinPricePredictor;
