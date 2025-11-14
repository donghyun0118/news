import { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DailyVisitorData {
  date: string;
  visitors: number;
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: true,
      text: '주간 순 방문자',
      font: {
        size: 16,
        weight: '600',
      },
      padding: {
        bottom: 16,
      }
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0, // Show only whole numbers
      },
    },
  },
  elements: {
    line: {
      tension: 0.3, // Makes the line curvy
    },
  },
};

export default function WeeklyVisitorsChart() {
  const [data, setData] = useState<DailyVisitorData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get<DailyVisitorData[]>('/api/admin/stats/visitors/weekly');
        setData(response.data);
      } catch (err) {
        console.error("Error fetching weekly visitor data:", err);
        setError('데이터를 불러오는 데 실패했습니다.');
      }
    };
    fetchData();
  }, []);

  if (error) {
    return <div className="chart-placeholder">
      <span>{error}</span>
    </div>;
  }

  if (!data) {
    return <div className="chart-placeholder">
      <span>로딩 중...</span>
    </div>;
  }

  const chartData = {
    labels: data.map(d => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`; // Format as "MM/DD"
    }),
    datasets: [
      {
        label: '순 방문자 수',
        data: data.map(d => d.visitors),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
      },
    ],
  };

  return (
    <div style={{ height: '250px' }}>
      <Line options={chartOptions} data={chartData} />
    </div>
  );
}
