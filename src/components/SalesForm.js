import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InvoicePreview from './InvoicePreview';
import html2pdf from 'html2pdf.js';

const SalesForm = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [savedSaleId, setSavedSaleId] = useState(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerContact, setNewCustomerContact] = useState('');
  const componentRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res1 = await axios.get(`/api/products`);
        const res2 = await axios.get(`/api/customers`);
        setProducts(res1.data);
        setCustomers(res2.data);
      } catch (err) {
        console.error('Error loading data:', err);
        toast.error('Failed to Load Products or Customers');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (saleItems.length > 0 || customerId) {
      setInvoiceNo('#' + Math.floor(100000 + Math.random() * 900000));
      const total = saleItems.reduce((acc, item) => {
        const product = products.find(p => p._id === item.product);
        return acc + (product ? product.price * item.quantity : 0);
      }, 0);
      setTotalAmount(total);
    }
  }, [saleItems, customerId, products]);

  const addItem = (productId) => {
    const existing = saleItems.find(item => item.product === productId);
    if (existing) {
      setSaleItems(saleItems.map(item =>
        item.product === productId ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setSaleItems([...saleItems, { product: productId, quantity: 1 }]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      (!customerId && (!newCustomerName.trim() || !newCustomerAddress.trim() || !newCustomerContact.trim())) ||
      saleItems.length === 0
    ) {
      toast.warning('Please select a customer and at least one product.');
      return;
    }

    try {
      let finalCustomerId = customerId;

      // If manually adding a customer
      if (!finalCustomerId && newCustomerName.trim() && newCustomerAddress.trim() && newCustomerContact.trim()) {
        const newCustomer = await axios.post('/api/customers', {
          name: newCustomerName.trim(),
          address: newCustomerAddress.trim(),
          contact: newCustomerContact.trim()
        });

        finalCustomerId = newCustomer.data._id;

        // ✅ Important fix: update state so ledger functions get the correct customerId
        setCustomerId(finalCustomerId);
      }

      // Save the sale
      const saleRes = await axios.post(`/api/sales`, {
        customer: finalCustomerId,
        items: saleItems
      });

      setSavedSaleId(saleRes.data._id);
      setShowModal(true);
      toast.success('Sale Saved. Choose an option below.');
    } catch (err) {
      console.error('Error saving sale:', err);
      toast.error('Error while saving sale.');
    }
  };


  const handleAddLedger = async () => {
    try {
      await axios.post(`/api/ledger`, {
        sale: savedSaleId,
        customer: customerId,
        total: totalAmount,
        products: saleItems.map(item => item.product),
      });
      resetForm();
      toast.success('Ledger Added');
    } catch (err) {
      console.error(err);
      toast.error('Error adding ledger');
    } finally {
      setShowModal(false);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      const ledgerRes = await axios.post(`/api/ledger`, {
        sale: savedSaleId,
        customer: customerId,
        total: totalAmount,
        products: saleItems.map(item => item.product),
      });

      await axios.patch(`/api/ledger/${ledgerRes.data._id}/pay`);
      resetForm();
      toast.success('Ledger Added & Marked as Paid');
    } catch (err) {
      console.error(err);
      toast.error('Error marking as paid');
    } finally {
      setShowModal(false);
    }
  };

  const resetForm = () => {
    setSaleItems([]);
    setCustomerId('');
    setSavedSaleId(null);
    setTotalAmount(0);
    setNewCustomerName('');
    setNewCustomerAddress('');
    setNewCustomerContact('');
  };


  const handleGeneratePDF = () => {
    const element = componentRef.current;
    const opt = {
      margin: 0.3,
      filename: `Invoice_${invoiceNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save();
  };

  const selectedCustomer = customerId
    ? customers.find(c => c._id === customerId)
    : {
      name: newCustomerName,
      contact: newCustomerContact,
      address: newCustomerAddress,
    };


  return (
    <div className="container mt-4">
      <h2>Sales Billing</h2>
      <form onSubmit={handleSubmit}>

        <div className="mb-3">
          <label className="form-label">Search or Select Customer</label>
          <Select
            options={customers.map(c => ({
              value: c._id,
              label: `${c.name} - ${c.contact}`
            }))}
            onChange={option => {
              setCustomerId(option ? option.value : '');
              setNewCustomerName('');  // Clear manual entry if selected
            }}
            placeholder="Search customer..."
            isClearable
          />
        </div>

        {/* Manual customer entry */}
        <div className="mb-3">
          <label className="form-label"> Enter New Customer Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter customer name"
            value={newCustomerName}
            onChange={e => {
              setNewCustomerName(e.target.value);
              setCustomerId('');  // Clear dropdown if typing new name
            }}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Customer Contact Number</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter contact number"
            value={newCustomerContact}
            onChange={e => setNewCustomerContact(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Customer Address</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter address"
            value={newCustomerAddress}
            onChange={e => setNewCustomerAddress(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Search & Select Product</label>
          <Select
            options={products.map(p => ({
              value: p._id,
              label: `${p.name} (₹${p.price})`
            }))}
            onChange={option => addItem(option.value)}
            placeholder="Type product name..."
            isClearable
          />
        </div>



        {saleItems.length > 0 && (
          <div className="mb-3">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {saleItems.map((item, index) => {
                  const product = products.find(p => p._id === item.product);
                  if (!product) return null;

                  return (
                    <tr key={product._id}>
                      <td>{product.name}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 1;
                            const updatedItems = [...saleItems];
                            updatedItems[index].quantity = newQty;
                            setSaleItems(updatedItems);
                          }}
                          className="form-control"
                          style={{ width: '80px' }}
                        />
                      </td>
                      <td>₹{product.price}</td>
                      <td>₹{(product.price * item.quantity).toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            const updatedItems = saleItems.filter((_, i) => i !== index);
                            setSaleItems(updatedItems);
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}



        {/* Optional: Visible Invoice Preview for user */}
        <h5 className="mt-4">Invoice Preview:</h5>
        <div className="mb-3 border p-3 bg-light">
          <InvoicePreview
            customer={selectedCustomer || {}}
            saleItems={saleItems}
            products={products}
            invoiceNo={invoiceNo}
            totalAmount={totalAmount}
          />
        </div>

        <div style={{ display: 'none' }}>
          <InvoicePreview
            ref={componentRef}
            customer={selectedCustomer || {}}
            saleItems={saleItems}
            products={products}
            invoiceNo={invoiceNo}
            totalAmount={totalAmount}
          />
        </div>

        <button type="submit" className="btn btn-success me-3">Save Sale</button>
        <button type="button" onClick={handleGeneratePDF} className="btn btn-secondary">Download Invoice PDF</button>

      </form>

      {/* Bootstrap Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Select Ledger Option</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>How would you like to proceed with the ledger?</p>
                </div>
                <div className="modal-footer">
                  <button onClick={handleAddLedger} className="btn btn-primary">Add Ledger</button>
                  <button onClick={handleMarkAsPaid} className="btn btn-success">Mark as Paid</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <ToastContainer position="top-center" autoClose={2000} />
        
    </div>
  );
};

export default SalesForm;
