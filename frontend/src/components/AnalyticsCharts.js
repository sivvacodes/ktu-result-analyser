import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#eab308', '#8b5cf6'];

export const GradeDistributionChart = ({ data }) => {
  const chartData = Object.entries(data).map(([grade, count]) => ({
    grade,
    count
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="grade" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const PassFailPieChart = ({ passCount, failCount }) => {
  const data = [
    { name: 'Pass', value: passCount },
    { name: 'Fail', value: failCount }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}; 