import React from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const Navbar = () => (
  <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-4">

    <Link className="navbar-brand" to="/">  इंद्रायणी बेकर्स </Link>

    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
      <span className="navbar-toggler-icon"></span>
    </button>
    <div className="collapse navbar-collapse" id="navbarNav">
      <ul className="navbar-nav ms-auto">
        <li className="nav-item">
          <Link className="nav-link" to="/products">Stock</Link>
        </li>
        <li className="nav-item">
          <Link className="nav-link" to="/sales">Sales</Link>
        </li>
        <li className="nav-item">
          <Link className="nav-link" to="/customers">Customers</Link>
        </li>
        <li className="nav-item">
          <Link className="nav-link" to="/reports">Reports</Link>
        </li>
        <li className="nav-item">
          <Link className="nav-link" to="/ledger">Ledger</Link>
        </li>
      </ul>
    </div>
  </nav>
);

export default Navbar;
