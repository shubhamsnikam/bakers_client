import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCalendarDay, FaCalendarAlt } from 'react-icons/fa';

const Reports = () => {
  const [dailyReport, setDailyReport] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const daily = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/reports/daily`);
      const monthly = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/reports/monthly`);
      setDailyReport(daily.data);
      setMonthlyReport(monthly.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="container my-5">
      <h2 className="text-center text-dark mb-5 ">📊 Bakery Sales Dashboard</h2>

      {loading ? (
        <div className="text-center text-white">
          <div className="spinner-border text-light" role="status"></div>
        </div>
      ) : (
        <div className="row g-4">
          {/* Daily Report */}
          <div className="col-md-6">
            <div className="card bg-gradient bg-dark text-light shadow-sm border-0">
              <div className="card-header d-flex align-items-center bg-success text-white">
                <FaCalendarDay className="me-2" />
                <h5 className="mb-0">Daily Sales Report</h5>
              </div>
              <div className="card-body">
                {dailyReport.length > 0 ? (
                  <ul className="list-group list-group-flush">
                    {dailyReport.map((sale, idx) => (
                      <li key={idx} className="list-group-item bg-dark d-flex justify-content-between text-light">
                        <span>{sale.date}</span>
                        <strong>₹ {sale.total}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">No sales for today.</p>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Report */}
          <div className="col-md-6">
            <div className="card bg-gradient bg-dark text-light shadow-sm border-0">
              <div className="card-header d-flex align-items-center bg-primary text-white">
                <FaCalendarAlt className="me-2" />
                <h5 className="mb-0">Monthly Sales Report</h5>
              </div>
              <div className="card-body">
                {monthlyReport.length > 0 ? (
                  <ul className="list-group list-group-flush">
                    {monthlyReport.map((sale, idx) => (
                      <li key={idx} className="list-group-item bg-dark d-flex justify-content-between text-light">
                        <span>{sale.month}</span>
                        <strong>₹ {sale.total}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">No sales this month.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger mt-4">{error}</div>}
    </div>
  );
};

export default Reports;