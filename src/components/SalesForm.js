import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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
  const componentRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res1 = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/products`);
        const res2 = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/customers`);
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
    if (!customerId || saleItems.length === 0) {
      toast.warning('Please select a customer and at least one product.');
      return;
    }

    try {
      const saleRes = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/sales`, {
        customer: customerId,
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
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/ledger`, {
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
      const ledgerRes = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/ledger`, {
        sale: savedSaleId,
        customer: customerId,
        total: totalAmount,
        products: saleItems.map(item => item.product),
      });

      await axios.patch(`${process.env.REACT_APP_BACKEND_URL}/api/ledger/${ledgerRes.data._id}/pay`);
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

  const selectedCustomer = customers.find(c => c._id === customerId);

  return (
    <div className="container mt-4">
      <h2> Sales Billing </h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Select Customer</label>
          <select
            className="form-select"
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            required
          >
            <option value="">-- Select Customer --</option>
            {customers.map(c => (
              <option key={c._id} value={c._id}>{c.name} - {c.contact}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">Select Product</label>
          <div className="d-flex flex-wrap gap-2">
            {products.map(p => (
              <button
                key={p._id}
                type="button"
                className="btn btn-outline-primary"
                onClick={() => addItem(p._id)}
              >
                {p.name} (₹{p.price})
              </button>
            ))}
          </div>
        </div>

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

        {/* Optional: Visible Invoice Preview for user */}
        {/* <h5 className="mt-4">Invoice Preview:</h5>
        <div className="mb-3 border p-3 bg-light">
          <InvoicePreview
            customer={selectedCustomer || {}}
            saleItems={saleItems}
            products={products}
            invoiceNo={invoiceNo}
            totalAmount={totalAmount}
          />
        </div> */}

        {/* Hidden component for printing */}
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
