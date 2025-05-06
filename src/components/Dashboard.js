import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../App.css'

const Dashboard = () => {
  return (
    <div className="bakery-dashboard">
      <div className="bakery-overlay container-fluid mt-4">
        <div className="row">
          <div className="col-12 text-center">
            <h1 className="display-4 text-primary">इंद्रायणी  स्वीट्स अँड बेकर्स</h1>
            <p className="lead text-secondary">Welcome to the best bakery and sweets shop in town!</p>
          </div>
        </div>
        <hr />
        <div className="row mt-4 d-flex justify-content-center">
          {/* Card 2: Products in Stock */}
          <div className="col-md-3">
            <div className="card text-white bg-success mb-3">
              <div className="card-header">Products in Stock</div>
              <div className="card-body">
                <h5 className="card-title">Manage and update product.</h5>
                <p className="card-text">Inventory</p>
                <Link to="/products" className="btn btn-light">Manage Stock</Link>
              </div>
            </div>
          </div>

          {/* Card 3: Customers */}
          <div className="col-md-3">
            <div className="card text-black bg-warning mb-3">
              <div className="card-header">Customers</div>
              <div className="card-body">
                <h5 className="card-title">Customers</h5>
                <p className="card-text">View and manage your customer data.</p>
                <Link to="/customers" className="btn btn-light">Manage Customers</Link>
              </div>
            </div>
          </div>

          {/* Card 4: Reports */}
          <div className="col-md-3">
            <div className="card text-white bg-danger mb-3">
              <div className="card-header">Reports</div>
              <div className="card-body">
                <h5 className="card-title">Monthly Reports</h5>
                <p className="card-text">View sales and other reports.</p>
                <Link to="/reports" className="btn btn-light">View Reports</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
