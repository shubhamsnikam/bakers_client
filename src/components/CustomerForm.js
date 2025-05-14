import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CustomerForm = () => {
  const [form, setForm] = useState({ name: '', address: '', contact: '' });
  const [customers, setCustomers] = useState([]);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`/api/customers`);
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast.error('Failed to Load Customers Data');
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/customers`, form);
      setForm({ name: '', address: '', contact: '' });
      fetchCustomers();
      toast.success('Customer Added Successfully!');
    } catch (err) {
      console.error('Error saving customer:', err);
      toast.error('Failed to Save Customer Data');
    }
  };

  useEffect(() => {
    fetchCustomers();

    // Set interval to auto-refresh customer list every 10 seconds
    const interval = setInterval(fetchCustomers, 10000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mt-4">
      <ToastContainer position="top-center" autoClose={2000} />
      <h2>Add Customer</h2>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-3">
          <label className="form-label">Customer Name</label>
          <input
            type="text"
            className="form-control"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Address</label>
          <textarea
            className="form-control"
            name="address"
            value={form.address}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Contact Number</label>
          <input
            type="text"
            className="form-control"
            name="contact"
            value={form.contact}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">Add Customer</button>
      </form>

      <h3>Customer List</h3>
      <table className="table table-striped">
        <thead className="table-dark">
          <tr>
            <th>Name</th>
            <th>Address</th>
            <th>Contact</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c._id}>
              <td>{c.name}</td>
              <td>{c.address}</td>
              <td>{c.contact}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerForm;
