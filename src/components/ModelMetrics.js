// src/components/ModelMetrics.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ModelMetrics = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Model Performance Metrics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Mean Absolute Percentage Error</p>
          <p className="text-2xl font-bold text-blue-600">{metrics.mape.toFixed(2)}%</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600">Root Mean Square Error</p>
          <p className="text-2xl font-bold text-green-600">${metrics.rmse.toFixed(2)}</p>
        </div>
      </div>

      <h4 className="text-lg font-semibold text-gray-800 mb-4">Recent Predictions Accuracy</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={metrics.predictions}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip 
              formatter={(value) => ['$' + value.toFixed(2)]}
              labelFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="predicted" 
              stroke="#2563eb" 
              name="Predicted"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#16a34a" 
              name="Actual"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-2">Last 5 Predictions</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">Predicted</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">Actual</th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">Error</th>
              </tr>
            </thead>
            <tbody>
              {metrics.predictions.slice(-5).map((pred, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {new Date(pred.timestamp).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-600">
                    ${pred.predicted.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-600">
                    ${pred.actual.toFixed(2)}
                  </td>
                  <td className={`px-4 py-2 text-right text-sm ${
                    Math.abs(pred.error) < 5 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {pred.error.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ModelMetrics;