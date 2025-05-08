import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Ledger = () => {
  const [ledgerData, setLedgerData] = useState([]); // All ledger data (both pending and new)
  const [filteredData, setFilteredData] = useState([]); // Filtered data based on customer
  const [customers, setCustomers] = useState([]); // Customer data
  const [products, setProducts] = useState([]); // Products data
  const [customerId, setCustomerId] = useState(''); // Filter by customer ID
  const [customerName, setCustomerName] = useState(''); // Filter by customer name
  const [newCustomerId, setNewCustomerId] = useState(''); // Customer ID for new ledger
  const [newProductIds, setNewProductIds] = useState([]); // Product IDs for new ledger
  const [newTotal, setNewTotal] = useState(''); // Total amount for new ledger
  const [loading, setLoading] = useState(false); // Loading state

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/products`);
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
      toast.error('Failed to Load Products');
    }
  };

  // Group ledger entries by customer
  const groupByCustomer = (data) => {
    const grouped = data.reduce((acc, entry) => {
      if (!acc[entry.customer._id]) {
        acc[entry.customer._id] = entry;
      }
      return acc;
    }, {});
    return Object.values(grouped);
  };

  // Fetch all ledger data (including pending and newly added)
  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/ledger`);
      const allLedgers = res.data
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort ledger by date (latest first)
      setLedgerData(allLedgers);
      setFilteredData(groupByCustomer(allLedgers)); // Group by customer
      toast.success('Ledger Data Loaded Successfully');
    } catch (err) {
      console.error('Error fetching ledger:', err);
      toast.error('Failed to Load Ledger Data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch customers for selection in the form
  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/customers`);
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast.error('Failed to Load Customers');
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchLedger();

    // Auto-refresh ledger data every 10 seconds
    const interval = setInterval(fetchLedger, 10000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [fetchLedger]);

  // Handle customer-based filtering
  const filterByCustomer = () => {
    const filtered = ledgerData.filter(entry => {
      const matchesCustomerId = customerId ? entry.customer?._id === customerId : true;
      const matchesCustomerName = customerName ? entry.customer?.name?.toLowerCase().includes(customerName.toLowerCase()) : true;
      return matchesCustomerId && matchesCustomerName;
    });

    setFilteredData(groupByCustomer(filtered));
    if (filtered.length > 0) {
      toast.info(`Filtered ${filtered.length} record(s)`);
    } else {
      toast.warning('No Matching Records Found');
    }
  };

  // Clear filters and show all records
  const handleClearFilters = () => {
    setCustomerId('');
    setCustomerName('');
    setFilteredData(groupByCustomer(ledgerData)); // Reset the filtered data
    toast.info('Filters Cleared');
  };

  // Add a new ledger entry
  const handleAddLedger = async () => {
    if (!newCustomerId || !newTotal || newProductIds.length === 0) {
      return toast.warning('Customer, Products, and Total amount are required');
    }

    try {
      const productNames = newProductIds.map(id => products.find(p => p._id === id)?.name).filter(Boolean);
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/ledger`, {
        customer: newCustomerId,
        products: productNames,
        total: parseFloat(newTotal),
      });
      toast.success('New Ledger Entry Added');
      setNewCustomerId('');
      setNewProductIds([]);
      setNewTotal('');
      fetchLedger(); // Refresh ledger data
    } catch (err) {
      console.error(err);
      toast.error('Failed to Add Ledger Entry');
    }
  };

  // Mark a ledger entry as paid
  const markAsPaid = async (id) => {
    try {
      const res = await axios.patch(`${process.env.REACT_APP_BACKEND_URL}/api/ledger/${id}/pay`);
      if (res.data.message === 'Ledger marked as paid') {
        toast.success('Ledger Marked as Paid');
        fetchLedger(); // Refresh ledger data
      } else {
        toast.error('Failed to Mark as Paid');
      }
    } catch (err) {
      toast.error('Failed to Mark as Paid');
    }
  };

  return (
    <div className="container mt-4">
      <h2>Customer Ledger</h2>

      {/* Filter Section */}
      <div className="row mb-3">
        <div className="col-md-3">
          <label>Customer Name</label>
          <input
            type="text"
            className="form-control"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Enter Customer Name"
          />
        </div>

        <div className="col-md-3">
          <label>Select Customer</label>
          <select
            className="form-control"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">All Customers</option>
            {customers.map(c => (
              <option key={c._id} value={c._id}>{c.name} ({c.contact})</option>
            ))}
          </select>
        </div>

        <div className="col-md-3 align-self-end">
          <button className="btn btn-primary mt-2" onClick={filterByCustomer}>Filter</button>
          <button className="btn btn-secondary mt-2 ms-2" onClick={handleClearFilters}>Clear Filters</button>
        </div>
      </div>

      {/* Ledger Display */}
      {loading ? (
        <p>Loading...</p>
      ) : filteredData.length === 0 ? (
        <p>No pending Data Available. </p>
      ) : (
        filteredData.map((entry, index) => (
          <div key={index} className="card mb-3 shadow">
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <span><strong>{entry.customer?.name || 'Unknown'}</strong> | {entry.customer?.contact || 'N/A'}</span>
              <button className="btn btn-sm btn-success" onClick={() => markAsPaid(entry._id)}>Mark as Paid</button>
            </div>
            <div className="card-body">
              <p><strong>Address:</strong> {entry.customer?.address || 'N/A'}</p>
              <p><strong>Date:</strong> {new Date(entry.createdAt).toLocaleString()}</p>
              <p><strong>Products Purchased:</strong> {entry.products?.join(', ') || 'None'}</p>
              <p><strong>Total Pending Amount:</strong> ₹{entry.total?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        ))
      )}

      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
};

export default Ledger;
