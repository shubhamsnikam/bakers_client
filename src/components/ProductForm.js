import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ProductForm = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', quantity: '', price: '', expiryDate: '', manufacturingDate: '' });
  const [editForm, setEditForm] = useState({ name: '', quantity: '', price: '', expiryDate: '', manufacturingDate: '', barcode: '' });
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [barcodeInfo, setBarcodeInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const barcodeRefs = useRef({});

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}api/products`);
      setProducts(res.data);
      setTimeout(() => {
        res.data.forEach((p) => generateBarcode(p._id));
      }, 100);
    } catch (err) {
      console.error('Error while fetching products:', err);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, quantity, price } = form;
    if (!name.trim() || quantity <= 0 || price <= 0) {
      toast.warning('Please enter valid product details.');
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/products`, form);
      setForm({ name: '', quantity: '', price: '', expiryDate: '', manufacturingDate: '' });
      fetchProducts();
      toast.success('Product Added successfully!');
    } catch (err) {
      console.error('Error while adding product:', err);
      toast.error('Failed to add product');
    }
  };

  const handleEdit = (product) => {
    setEditId(product._id);
    setEditForm({
      name: product.name,
      quantity: product.quantity,
      price: product.price,
      expiryDate: product.expiryDate,
      manufacturingDate: product.manufacturingDate,
      barcode: product._id,
    });
    setShowModal(true);
  };

  const handleSaveEdit = async () => {
    const { name, quantity, price } = editForm;
    if (!name.trim() || quantity <= 0 || price <= 0) {
      toast.warning('Please enter valid updated details.');
      return;
    }

    try {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/products/${editId}`, editForm);
      fetchProducts();
      setShowModal(false);
      setEditId(null);
      toast.success('Product Updated Successfully!');
    } catch (err) {
      console.error('Error editing product:', err);
      toast.error('Failed to Update Product');
    }
  };

  const handleDelete = async (id) => {
    try {
      const confirmation = window.confirm("Are you sure you want to delete this product?");
      if (confirmation) {
        await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/products/${id}`);
        fetchProducts();
        toast.info('Product Deleted Successfully');
      }
    } catch (err) {
      console.error('Error Deleting product:', err);
      toast.error('Failed to delete product');
    }
  };

  const generateBarcode = (id) => {
    const canvas = barcodeRefs.current[id];
    if (canvas) {
      JsBarcode(canvas, id.toString(), {
        format: "CODE128",
        displayValue: false,
        width: 1,
        height: 20,
        margin: 0,
      });
    }
  };

  const generatePDFWithBarcodes = (product) => {
    if (product.quantity > 100) {
      toast.warning('Quantity too high for barcode PDF. Limit is 100.');
      return;
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'A4' });
    const canvas = barcodeRefs.current[product._id];
    if (!canvas) return;

    const imgData = canvas.toDataURL('image/png');
    let yOffset = 10;

    for (let i = 0; i < product.quantity; i++) {
      pdf.addImage(imgData, 'PNG', 10, yOffset, 40, 20);
      pdf.text(product.name, 55, yOffset + 10);
      yOffset += 25;

      if (yOffset > 280) {
        pdf.addPage();
        yOffset = 10;
      }
    }

    pdf.save(`${product.name || 'barcode'}.pdf`);
  };

  const handleBarcodeScan = async (barcode) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/products/barcode/${barcode}`);
      setBarcodeInfo(response.data);
    } catch (err) {
      console.error('Error fetching product by barcode:', err);
      toast.error('Barcode not found');
    }
  };

  const handleExportAllBarcodes = () => {
    products.forEach((p) => generateBarcode(p._id));
    setTimeout(() => {
      products.forEach((p) => generatePDFWithBarcodes(p));
    }, 200);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="container mt-4">
      <ToastContainer position="top-center" autoClose={2000} />

      <h2 className="text-center mb-4 text-primary">Add Product</h2>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="row g-3">
          <div className="col-md-4">
            <input type="text" className="form-control" name="name" value={form.name} onChange={handleChange} placeholder="Product Name" required />
          </div>
          <div className="col-md-3">
            <input type="number" className="form-control" name="quantity" value={form.quantity} onChange={handleChange} placeholder="Quantity" required />
          </div>
          <div className="col-md-3">
            <input type="number" className="form-control" name="price" value={form.price} onChange={handleChange} placeholder="Price (₹)" required />
          </div>
          <div className="col-md-2">
            <button className="btn btn-primary w-100" type="submit">Add</button>
          </div>
        </div>
      </form>

      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Scan or Enter Barcode"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleBarcodeScan(e.target.value);
          }}
        />
      </div>

      {barcodeInfo && (
        <div className="alert alert-info mt-3">
          <h5>Product Info</h5>
          <p><strong>Manufacturing Date:</strong> {new Date(barcodeInfo.manufacturingDate).toLocaleDateString()}</p>
          <p><strong>Expiry Date:</strong> {new Date(barcodeInfo.expiryDate).toLocaleDateString()}</p>
        </div>
      )}

      <h3 className="text-center mt-5 mb-3">📦 Product List</h3>

      <div className="mb-3 text-end">
        <Button variant="success" onClick={handleExportAllBarcodes}>
          Export All Barcodes to PDF
        </Button>
      </div>

      {loading ? (
        <div className="text-center my-5"><Spinner animation="border" /></div>
      ) : (
        <table className="table table-bordered table-hover">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Quantity</th>
              <th>Price (₹)</th>
              <th style={{ width: '140px' }}>Barcode</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.quantity}</td>
                <td>{p.price}</td>
                <td>
                  <canvas
                    ref={(el) => (barcodeRefs.current[p._id] = el)}
                    style={{ maxWidth: '100%', transform: 'scale(0.85)', transformOrigin: 'left center' }}
                  />
                  <button className="btn btn-outline-success btn-sm mt-1" onClick={() => generatePDFWithBarcodes(p)}>
                    📄 PDF
                  </button>
                </td>
                <td>
                  <div className="d-flex gap-1">
                    <button className="btn btn-warning btn-sm" onClick={() => handleEdit(p)}>Edit</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(p._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>Edit Product</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input type="text" className="form-control" name="name" value={editForm.name} onChange={handleEditChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Quantity</label>
            <input type="number" className="form-control" name="quantity" value={editForm.quantity} onChange={handleEditChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Price</label>
            <input type="number" className="form-control" name="price" value={editForm.price} onChange={handleEditChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Expiry Date</label>
            <input type="date" className="form-control" name="expiryDate" value={editForm.expiryDate} onChange={handleEditChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Manufacturing Date</label>
            <input type="date" className="form-control" name="manufacturingDate" value={editForm.manufacturingDate} onChange={handleEditChange} />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
          <Button variant="primary" onClick={handleSaveEdit}>Save Changes</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProductForm;
