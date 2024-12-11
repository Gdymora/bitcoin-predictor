// src/components/PriceChart.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PriceChart = ({ data, prediction }) => {
  const chartData = data.map((item) => ({
    date: new Date(item.timestamp).toLocaleDateString(),
    price: item.price
  }));

  if (prediction) {
    chartData.push({
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString(),
      prediction
    });
  }

  return (
    <div className="w-full h-96 bg-white rounded-lg shadow-lg p-4">
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            label={{ 
              value: 'Price (USD)', 
              angle: -90, 
              position: 'insideLeft' 
            }}
          />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#F7931A" 
            name="Historical Price"
            dot={false}
            strokeWidth={2}
          />
          {prediction && (
            <Line 
              type="monotone" 
              dataKey="prediction" 
              stroke="#2E7D32" 
              name="Prediction"
              strokeWidth={3}
              dot={{ r: 6 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;