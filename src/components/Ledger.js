import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import html2pdf from 'html2pdf.js';

const Ledger = () => {
  const [ledgerData, setLedgerData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newProductIds, setNewProductIds] = useState([]);
  const [newTotal, setNewTotal] = useState('');
  const [loading, setLoading] = useState(false);
  const componentRefs = useRef({}); // 🟢 Store individual refs


  const fetchProducts = async () => {
    try {
      const res = await axios.get(`/api/products`);
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
      toast.error('Failed to Load Products');
    }
  };


  const groupByCustomer = (data) => {
    const grouped = data.reduce((acc, entry) => {
      if (entry.customer && entry.customer._id && !acc[entry.customer._id]) {
        acc[entry.customer._id] = entry;
      }
      return acc;
    }, {});
    return Object.values(grouped);
  };

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/ledger`);
      const allLedgers = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLedgerData(allLedgers);
      setFilteredData(groupByCustomer(allLedgers));
      toast.success('Ledger Data Loaded Successfully');
    } catch (err) {
      console.error('Error fetching ledger:', err);
      toast.error('Failed to Load Ledger Data');
    } finally {
      setLoading(false);
    }
  }, []);


  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`/api/customers`);
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

    return () => clearInterval();
  }, [fetchLedger]);

  const filterByCustomer = () => {
    const filtered = ledgerData.filter(entry => {
      const matchesCustomerId = customerId ? entry.customer?._id === customerId : true;
      const matchesCustomerName = customerName ? entry.customer?.name?.toLowerCase().includes(customerName.toLowerCase()) : true;
      return matchesCustomerId && matchesCustomerName;
    });
    setFilteredData(groupByCustomer(filtered));
    filtered.length > 0
      ? toast.info(`Filtered ${filtered.length} record(s)`)
      : toast.warning('No Matching Records Found');
  };

  const handleClearFilters = () => {
    setCustomerId('');
    setCustomerName('');
    setFilteredData(groupByCustomer(ledgerData));
    toast.info('Filters Cleared');
  };

  const handleAddLedger = async () => {
    // Validate required fields
    if (!newCustomerId || !newTotal || newProductIds.length === 0) {
      return toast.warning('Customer, Products, and Total amount are required');
    }

    try {
      // Parse input total to float
      let newTotalAmount = parseFloat(newTotal);

      // ✅ Find existing ledger entry for this customer (if any)
      const existingLedger = ledgerData.find(entry => entry.customer._id === newCustomerId);

      // ✅ If a previous ledger exists, add current total to it
      if (existingLedger) {
        newTotalAmount += parseFloat(existingLedger.total);
      }

      // ✅ Get product names based on selected product IDs
      const productNames = newProductIds
        .map(id => products.find(p => p._id === id)?.name)
        .filter(Boolean); // remove any undefined

      // ✅ Submit the updated ledger entry
      await axios.post(`/api/ledger`, {
        customer: newCustomerId,
        products: productNames,
        total: newTotalAmount
      });

      toast.success('Ledger updated successfully');

      // ✅ Reset form fields
      setNewCustomerId('');
      setNewProductIds([]);
      setNewTotal('');
      fetchLedger(); // Refresh the ledger list
    } catch (err) {
      console.error(err);
      toast.error('Failed to add/update ledger');
    }
  };




  const markAsPaid = async (id) => {
    try {
      const res = await axios.patch(`/api/ledger/${id}/pay`);
      if (res.data.message === 'Ledger marked as paid') {
        toast.success('Ledger Marked as Paid');
        fetchLedger();
      } else {
        toast.error('Failed to Mark as Paid');
      }
    } catch (err) {
      toast.error('Failed to Mark as Paid');
    }
  };

  const handleGeneratePDF = (ledgerId) => {
    const element = componentRefs.current[ledgerId];
    const opt = {
      margin: 0.3,
      filename: `ledger_${ledgerId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    if (element) {
      html2pdf().from(element).set(opt).save();
    } else {
      toast.error("PDF content not found");
    }
  };

  // 💰 Handle partial payment
  const handlePartialPay = async (id) => {
    const amount = prompt('Enter partial amount to pay:');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return toast.warning('Please enter a valid amount');
    }
    try {
      const res = await axios.patch(`/api/ledger/${id}/partial-pay`, {
        amount: parseFloat(amount),
      });
      res.data.success ? toast.success('Partial payment updated') : toast.error(res.data.message);
      fetchLedger();
    } catch (err) {
      console.error('Partial payment error:', err);
      toast.error('Error processing partial payment');
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
        <p>No pending Data Available.</p>
      ) : (
        filteredData.map((entry, index) => (
          <div
            key={index}
            className="card mb-3 shadow"
            ref={(el) => (componentRefs.current[entry._id] = el)} // ✅ Assign ref here
          >
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <span><strong>{entry.customer?.name || 'Unknown'}</strong> | {entry.customer?.contact || 'N/A'}</span>
              <div>
                <button className="btn btn-sm btn-success me-2" onClick={() => markAsPaid(entry._id)}>Mark as Paid</button>
                <button className="btn btn-sm btn-info me-2" onClick={() => handlePartialPay(entry._id)}>Partial Pay</button>
                <button className="btn btn-sm btn-warning" onClick={() => handleGeneratePDF(entry._id)}>Download PDF</button>

              </div>
            </div>
            <div className="card-body">
              <p><strong>Address:</strong> {entry.customer?.address || 'N/A'}</p>
              <p><strong>Date:</strong> {new Date(entry.createdAt).toLocaleString()}</p>
              <p><strong>Products Purchased:</strong> {entry.products?.map(p => {
                const product = products.find(product => product._id === p); // Find product by ID
                return product ? product.name : 'Unknown Product'; // If product exists, return the name, else 'Unknown Product'
              }).join(', ')}</p>

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
