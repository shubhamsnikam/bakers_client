
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
  const componentRefs = useRef({});  // 🟢 Store individual refs

  // 🆕 Fetch product list
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
    const custId = entry.customer?._id;
    if (!custId) return acc;

    if (!acc[custId]) {
      acc[custId] = {
        ...entry,
        total: parseFloat(entry.total),
        products: [...(entry.products || [])],
        createdAt: entry.createdAt,
      };
    } else {
      acc[custId].total += parseFloat(entry.total);
      acc[custId].products = Array.from(
        new Set([...acc[custId].products.map(p => p.name), ...entry.products.map(p => p.name)])
      ).map(name => ({ name }));
      
      // Update createdAt to latest
      if (new Date(entry.createdAt) > new Date(acc[custId].createdAt)) {
        acc[custId].createdAt = entry.createdAt;
      }
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
  if (!newCustomerId || !newTotal || newProductIds.length === 0) {
    return toast.warning('Customer, Products, and Total amount are required');
  }

  try {
    const productNames = newProductIds.map(id => products.find(p => p._id === id)?.name).filter(Boolean);

    // ✅ Check if an unpaid ledger entry already exists for the customer
    const existingLedger = ledgerData.find(
      ledger => ledger.customer?._id === newCustomerId && ledger.status !== 'paid'
    );

    if (existingLedger) {
      // If an existing ledger is found, add the new total and products to it
      const updatedTotal = existingLedger.total + parseFloat(newTotal); // Add to the existing total
      const updatedProducts = [...new Set([...existingLedger.products.map(p => p.name), ...productNames])]; // Combine existing products with new ones

      // Update the existing ledger entry with the new total and products
      await axios.put(`/api/ledger/${existingLedger._id}`, {
        total: updatedTotal,
        products: updatedProducts,
      });

      toast.success('Ledger Updated Successfully');
    } else {
      // If no existing ledger is found, create a new one
      await axios.post(`/api/ledger`, {
        customer: newCustomerId,
        products: productNames,
        total: parseFloat(newTotal),
      });

      toast.success('New Ledger Entry Added');
    }

    // Clear the form fields after adding or updating
    setNewCustomerId('');
    setNewProductIds([]);
    setNewTotal('');
    fetchLedger(); // Refresh ledger data
  } catch (err) {
    console.error(err);
    toast.error('Failed to Add or Update Ledger Entry');
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
  const entry = filteredData.find(e => e._id === ledgerId);
  if (!entry) return toast.error("Ledger not found");

  // 📄 Create a separate hidden DOM structure
  const pdfContent = document.createElement('div');
  pdfContent.innerHTML = `
    <div style="padding: 20px; font-family: Arial; border: 2px solid #000; width: 100%;">
      <h2 style="text-align: center; color: #2c3e50;">Customer Ledger</h2>
      <hr />
      <p><strong>Customer Name:</strong> ${entry.customer?.name || 'N/A'}</p>
      <p><strong>Contact:</strong> ${entry.customer?.contact || 'N/A'}</p>
      <p><strong>Address:</strong> ${entry.customer?.address || 'N/A'}</p>
      <p><strong>Date:</strong> ${new Date(entry.createdAt).toLocaleString()}</p>
      <p><strong>Products:</strong> ${entry.products?.map(p => p.name).join(', ') || 'None'}</p>
      <p><strong>Total Pending:</strong> ₹${entry.total?.toFixed(2) || '0.00'}</p>
      <div style="margin-top: 30px; text-align: right;">
        <p>Authorized Signature __________________</p>
      </div>
    </div>
  `;

  const opt = {
    margin: 0.3,
    filename: `ledger_${ledgerId}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().from(pdfContent).set(opt).save();
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
             <p><strong>Products Purchased:</strong> {entry.products?.map(p => p.name).join(', ') || 'None'}</p>

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

