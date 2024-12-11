// src/services/modelService.js
import * as tf from "@tensorflow/tfjs";

class BitcoinPriceModel {
  constructor() {
    this.model = null;
    this.normalizeParams = {
      min: 0,
      max: 0,
    };
  }

  // 1. Метод для нормалізації даних
  normalizeData(data) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    this.normalizeParams = { max, min };
    // Нормалізуємо дані до діапазону [0, 1]
    return data.map((val) => (val - min) / (max - min));
  }

  // 2. Метод для денормалізації даних
  denormalizeData(normalizedValue) {
    const { max, min } = this.normalizeParams;
    return normalizedValue * (max - min) + min;
  }

  // 3. Підготовка даних для тренування
  prepareTrainingData(data, windowSize = 7) {
    const X = []; // Вхідні дані (7 днів)
    const y = []; // Цільові дані (наступний день)

    // Створюємо вікна даних
    for (let i = 0; i < data.length - windowSize; i++) {
      X.push(data.slice(i, i + windowSize));
      y.push(data[i + windowSize]);
    }

    // Перетворюємо в тензори
    return [
      tf.tensor2d(X).reshape([X.length, windowSize, 1]), // Вхідний тензор для LSTM
      tf.tensor2d(y, [y.length, 1]), // Цільовий тензор
    ];
  }

  createModel(windowSize = 7) {
    // Якщо модель вже існує, очищаємо її
    if (this.model) {
      this.model.dispose();
    }

    // Створюємо послідовну модель
    const model = tf.sequential();

    // Оптимізовані налаштування для GPU
    const lstmConfig = {
      units: 50, // Кількість нейронів
      returnSequences: true, // Повертати послідовність
      inputShape: [windowSize, 1], // Форма вхідних даних
      // Додаємо оптимізації для GPU
      implementation: 2, // Використовуємо більш швидку імплементацію LSTM
      kernelInitializer: "glorotNormal",
      recurrentInitializer: "glorotNormal",
    };
    model.add(tf.layers.lstm(lstmConfig));

    // Dropout для запобігання перенавчання
    model.add(tf.layers.dropout(0.2));
    // Другий LSTM шар
    model.add(
      tf.layers.lstm({
        units: 30,
        returnSequences: false,
        implementation: 2,
      })
    );

    // Вихідний шар
    model.add(
      tf.layers.dense({
        units: 1,
        activation: "linear",
      })
    );

    // Оптимізований компілятор для GPU
    const optimizer = tf.train.adam(0.001, 0.9, 0.999, 1e-7);

    // Компілюємо модель
    model.compile({
      optimizer: optimizer, // Оптимізатор
      loss: "meanSquaredError", // Функція втрат
      metrics: ["mse"],
    });

    this.model = model;
    return this.model;
  }

  async trainModel(X, y, epochs = 50, batchSize = 32, onEpochEnd) {
    if (!this.model) {
      throw new Error("Model not created. Call createModel first.");
    }

    return await this.model.fit(X, y, {
      epochs,
      batchSize,
      validationSplit: 0.1,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (onEpochEnd) {
            onEpochEnd(epoch, logs);
          }
        },
      },
    });
  }

  async predict(inputData) {
    if (!this.model) {
      throw new Error("Model not trained yet");
    }

    const prediction = this.model.predict(inputData);
    const value = (await prediction.data())[0];
    prediction.dispose();
    return this.denormalizeData(value);
  }

  async saveModel() {
    if (!this.model) {
      throw new Error("No model to save");
    }
    await this.model.save("localstorage://bitcoin-price-model");
  }

  async loadModel() {
    try {
      if (this.model) {
        this.model.dispose();
      }
      this.model = await tf.loadLayersModel(
        "localstorage://bitcoin-price-model"
      );
      return true;
    } catch (error) {
      console.error("Error loading model:", error);
      return false;
    }
  }

  async evaluateHistoricalAccuracy(data, windowSize = 7) {
    if (!this.model) {
      throw new Error("Model not trained yet");
    }

    const prices = data.map((d) => d.price);
    const normalizedData = this.normalizeData(prices);
    const predictions = [];

    for (let i = windowSize; i < normalizedData.length; i++) {
      const input = normalizedData.slice(i - windowSize, i);
      const inputTensor = tf.tensor2d([input]).reshape([1, windowSize, 1]);

      try {
        const predictionNormalized = this.model.predict(inputTensor);
        const predictionValue = (await predictionNormalized.data())[0];
        const prediction = this.denormalizeData(predictionValue);

        predictions.push({
          timestamp: data[i].timestamp,
          predicted: prediction,
          actual: data[i].price,
          error: ((prediction - data[i].price) / data[i].price) * 100,
        });

        predictionNormalized.dispose();
        inputTensor.dispose();
      } catch (err) {
        console.error("Error making prediction:", err);
      }
    }

    const mape = this.calculateMAPE(predictions);
    const rmse = this.calculateRMSE(predictions);

    return {
      mape,
      rmse,
      predictions: predictions.slice(-30),
    };
  }

  calculateMAPE(predictions) {
    const errors = predictions.map((p) =>
      Math.abs((p.predicted - p.actual) / p.actual)
    );
    return (errors.reduce((sum, err) => sum + err, 0) / errors.length) * 100;
  }

  calculateRMSE(predictions) {
    const errors = predictions.map((p) => Math.pow(p.predicted - p.actual, 2));
    return Math.sqrt(errors.reduce((sum, err) => sum + err, 0) / errors.length);
  }

  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

export { BitcoinPriceModel };
