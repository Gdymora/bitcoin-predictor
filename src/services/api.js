// src/services/api.js

export const fetchBitcoinData = async (days = 365) => {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    // Перетворюємо дані у зручний формат
    // API повертає масив [timestamp, price]
    // Ми перетворюємо його в об'єкти {timestamp, price}
    return data.prices.map((price) => ({
      timestamp: price[0], // Unix timestamp
      price: price[1], // Ціна в USD
    }));
  } catch (error) {
    console.error("Error fetching Bitcoin data:", error);
    throw error;
  }
};