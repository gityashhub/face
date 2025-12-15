import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  FileText, Plus, Search, Filter, Download, Edit3, Trash2, Eye,
  CheckCircle, XCircle, ChevronDown, AlertCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { purchaseAPI } from '../../utils/api';

const PurchaseOrders = () => {
  // State
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    supplier: '',
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  
  // Form state for modals
  const [formData, setFormData] = useState({
    poNumber: '',
    supplier: '',
    status: 'Draft',
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    paymentTerms: 'Net 30',
    notes: '',
    lineItems: [{ item: '', description: '', quantity: 1, unitPrice: 0 }]
  });

  const [suppliers, setSuppliers] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [poRes, supplierRes] = await Promise.all([
        purchaseAPI.getPurchaseOrders(filters),
        purchaseAPI.getSuppliers()
      ]);
      
      if (poRes.data.success) {
        setPurchaseOrders(poRes.data.data.purchaseOrders || []);
      }
      if (supplierRes.data.success) {
        setSuppliers(supplierRes.data.data.suppliers || []);
      }
    } catch (err) {
      console.error('Failed to load purchase data:', err);
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  // Helpers
  const getStatusColor = (status) => {
    switch (status) {
      case 'Closed': return 'text-gray-400 bg-gray-400/20';
      case 'Received': return 'text-green-400 bg-green-400/20';
      case 'Ordered': return 'text-purple-400 bg-purple-400/20';
      case 'Approved': return 'text-blue-400 bg-blue-400/20';
      case 'PendingApproval': return 'text-yellow-400 bg-yellow-400/20';
      case 'Draft': return 'text-secondary-400 bg-secondary-400/20';
      default: return 'text-secondary-400 bg-secondary-400/20';
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...formData.lineItems];
    newLineItems[index][field] = value;
    newLineItems[index].total = (newLineItems[index].quantity || 0) * (newLineItems[index].unitPrice || 0);
    setFormData(prev => ({ ...prev, lineItems: newLineItems }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { item: '', description: '', quantity: 1, unitPrice: 0, total: 0 }]
    }));
  };

  const removeLineItem = (index) => {
    if (formData.lineItems.length <= 1) return;
    const newLineItems = formData.lineItems.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, lineItems: newLineItems }));
  };

  const calculateTotal = () => {
    return formData.lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  // CRUD Handlers
  const handleCreatePO = async (e) => {
    e.preventDefault();
    try {
      const poData = {
        ...formData,
        totalAmount: calculateTotal(),
        grandTotal: calculateTotal() // add tax logic later if needed
      };
      const response = await purchaseAPI.createPurchaseOrder(poData);
      if (response.data.success) {
        toast.success('Purchase order created successfully!');
        fetchData();
        resetForm();
        setShowCreateModal(false);
      }
    } catch (err) {
      toast.error('Failed to create purchase order');
    }
  };

  const handleUpdatePO = async (e) => {
    e.preventDefault();
    try {
      const poData = {
        ...formData,
        totalAmount: calculateTotal(),
        grandTotal: calculateTotal()
      };
      await purchaseAPI.updatePurchaseOrder(selectedPO._id, poData);
      toast.success('Purchase order updated!');
      fetchData();
      setShowEditModal(false);
    } catch (err) {
      toast.error('Failed to update purchase order');
    }
  };

  const handleDeletePO = async (id) => {
    if (!window.confirm('Delete this purchase order permanently?')) return;
    try {
      await purchaseAPI.deletePurchaseOrder(id);
      toast.success('Purchase order deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete purchase order');
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const response = await purchaseAPI.createSupplier(supplierForm);
      if (response.data.success) {
        toast.success('Supplier created successfully!');
        fetchData();
        setShowSupplierModal(false);
        setSupplierForm({ name: '', email: '', phone: '', address: '' });
      }
    } catch (err) {
      toast.error('Failed to create supplier');
    }
  };

  const resetForm = () => {
    setFormData({
      poNumber: '',
      supplier: '',
      status: 'Draft',
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      paymentTerms: 'Net 30',
      notes: '',
      lineItems: [{ item: '', description: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const openEditModal = (po) => {
    setSelectedPO(po);
    setFormData({
      poNumber: po.poNumber || '',
      supplier: po.supplier?._id || '',
      status: po.status || 'Draft',
      deliveryDate: po.deliveryDate ? new Date(po.deliveryDate).toISOString().slice(0, 10) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      paymentTerms: po.paymentTerms || 'Net 30',
      notes: po.notes || '',
      lineItems: po.lineItems?.map(item => ({
        item: item.item || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        total: (item.quantity || 0) * (item.unitPrice || 0)
      })) || [{ item: '', description: '', quantity: 1, unitPrice: 0 }]
    });
    setShowEditModal(true);
  };

  const openViewModal = (po) => {
    setSelectedPO(po);
    setShowViewModal(true);
  };

  const exportData = () => {
    const csvContent = [
      ['PO Number', 'Supplier', 'Status', 'Total Amount', 'Delivery Date', 'Created At'],
      ...purchaseOrders.map(po => [
        po.poNumber || '—',
        po.supplier?.name || '—',
        po.status,
        `₹${(po.grandTotal || 0).toLocaleString()}`,
        po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : '—',
        new Date(po.createdAt).toLocaleDateString()
      ])
    ];
    const csv = csvContent.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase_orders_${filters.startDate}_to_${filters.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Purchase orders exported!');
  };

  // Format helpers
  const formatCurrency = (value) => `₹${(value || 0).toLocaleString()}`;
  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '—';

  return (
    <AdminLayout>
      <div className="px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 space-y-6">
        {/* Header */}
        <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">
                Purchase <span className="neon-text">Orders</span>
              </h1>
              <p className="text-secondary-400 text-xs sm:text-sm">Manage your procurement pipeline</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-secondary-700 hover:bg-secondary-600 text-white rounded-lg flex items-center gap-1.5 text-xs sm:text-sm transition-colors"
              >
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Filters</span>
              </button>
              <button
                onClick={exportData}
                disabled={purchaseOrders.length === 0}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple rounded-lg flex items-center gap-1.5 text-xs sm:text-sm transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={fetchData}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-neon-pink/20 hover:bg-neon-pink/30 text-neon-pink rounded-lg flex items-center gap-1.5 text-xs sm:text-sm transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => {
                  setSupplierForm({ name: '', email: '', phone: '', address: '' });
                  setShowSupplierModal(true);
                }}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Add Supplier</span>
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-neon-pink to-neon-purple text-white rounded-lg flex items-center gap-1.5 text-xs sm:text-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>New PO</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6">
            <h3 className="text-base sm:text-lg font-bold text-white mb-3">Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm text-secondary-400 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-xs sm:text-sm focus:border-neon-pink"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-secondary-400 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-xs sm:text-sm focus:border-neon-pink"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-secondary-400 mb-1.5">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-xs sm:text-sm focus:border-neon-pink"
                >
                  <option value="all">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="PendingApproval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Received">Received</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-secondary-400 mb-1.5">Supplier</label>
                <select
                  value={filters.supplier}
                  onChange={(e) => handleFilterChange('supplier', e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-xs sm:text-sm focus:border-neon-pink"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map(supplier => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-secondary-400 mb-1.5">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-secondary-400" />
                  <input
                    type="text"
                    placeholder="PO number, item..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white placeholder-secondary-400 text-xs sm:text-sm focus:border-neon-pink"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Orders Table */}
        <div className="glass-morphism neon-border rounded-2xl overflow-hidden">
          <div className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-lg font-bold text-white">All Purchase Orders</h2>
              <p className="text-secondary-400 text-xs sm:text-sm">
                Showing {purchaseOrders.length} orders
              </p>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto -mx-3 px-3">
              <table className="w-full min-w-[700px]">
                <thead className="border-b border-secondary-700">
                  <tr>
                    <th className="text-left p-2 sm:p-3 text-secondary-300 font-medium text-xs sm:text-sm">PO #</th>
                    <th className="text-left p-2 sm:p-3 text-secondary-300 font-medium text-xs sm:text-sm">Supplier</th>
                    <th className="text-left p-2 sm:p-3 text-secondary-300 font-medium text-xs sm:text-sm">Status</th>
                    <th className="text-left p-2 sm:p-3 text-secondary-300 font-medium text-xs sm:text-sm">Total</th>
                    <th className="text-left p-2 sm:p-3 text-secondary-300 font-medium text-xs sm:text-sm">Delivery Date</th>
                    <th className="text-left p-2 sm:p-3 text-secondary-300 font-medium text-xs sm:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="py-6 text-center text-secondary-400">Loading...</td></tr>
                  ) : purchaseOrders.length === 0 ? (
                    <tr><td colSpan="6" className="py-8 text-center text-secondary-400">No purchase orders found</td></tr>
                  ) : (
                    purchaseOrders.map(po => (
                      <tr key={po._id} className="border-b border-secondary-800 hover:bg-secondary-800/30">
                        <td className="p-2 sm:p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-secondary-400" />
                            <span className="text-white font-medium text-xs sm:text-sm">{po.poNumber || '—'}</span>
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 text-white text-xs sm:text-sm">
                          {po.supplier?.name || '—'}
                        </td>
                        <td className="p-2 sm:p-3">
                          <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${getStatusColor(po.status)}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="p-2 sm:p-3 text-neon-pink font-medium text-xs sm:text-sm">
                          {formatCurrency(po.grandTotal)}
                        </td>
                        <td className="p-2 sm:p-3 text-secondary-400 text-xs sm:text-sm">
                          {formatDate(po.deliveryDate)}
                        </td>
                        <td className="p-2 sm:p-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openViewModal(po)}
                              className="p-1 text-secondary-400 hover:text-blue-400"
                            >
                              <Eye className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(po)}
                              className="p-1 text-secondary-400 hover:text-purple-400"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePO(po._id)}
                              className="p-1 text-secondary-400 hover:text-red-400"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block sm:hidden space-y-4">
              {loading ? (
                <div className="text-center py-8 text-secondary-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neon-pink mx-auto"></div>
                  <p className="mt-2">Loading purchase orders...</p>
                </div>
              ) : purchaseOrders.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-secondary-600 mx-auto mb-2" />
                  <p className="text-secondary-400">No purchase orders found</p>
                </div>
              ) : (
                purchaseOrders.map(po => (
                  <div key={po._id} className="glass-morphism rounded-lg p-4 border border-secondary-700">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-white font-medium text-base">PO: {po.poNumber || '—'}</p>
                        <p className="text-sm text-secondary-400">{po.supplier?.name || '—'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openViewModal(po)}
                          className="p-2 text-secondary-400 hover:text-blue-400"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(po)}
                          className="p-2 text-secondary-400 hover:text-purple-400"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePO(po._id)}
                          className="p-2 text-secondary-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-secondary-400">Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(po.status)}`}>
                          {po.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-secondary-400">Total</p>
                        <p className="text-neon-pink font-medium">{formatCurrency(po.grandTotal)}</p>
                      </div>
                      <div>
                        <p className="text-secondary-400">Delivery</p>
                        <p className="text-white">{formatDate(po.deliveryDate)}</p>
                      </div>
                      <div>
                        <p className="text-secondary-400">Created</p>
                        <p className="text-white">{formatDate(po.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modals */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Enhanced backdrop with blur */}
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
          }} />

          {/* Modal content */}
          <div className="relative glass-morphism neon-border rounded-2xl p-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              {showCreateModal ? 'Create Purchase Order' : 'Edit Purchase Order'}
            </h3>
            
            <form onSubmit={showCreateModal ? handleCreatePO : handleUpdatePO} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-secondary-400 mb-1">Supplier *</label>
                  <select
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-secondary-400 mb-1">Delivery Date *</label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={formData.deliveryDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary-400 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink"
                  >
                    <option value="Draft">Draft</option>
                    <option value="PendingApproval">Pending Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Ordered">Ordered</option>
                    <option value="Received">Received</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-secondary-400 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-secondary-400 mb-2">Line Items</label>
                <div className="space-y-3">
                  {formData.lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Item"
                          value={item.item}
                          onChange={(e) => handleLineItemChange(index, 'item', e.target.value)}
                          className="w-full px-2 py-1.5 bg-secondary-800 border border-secondary-600 rounded text-white text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 bg-secondary-800 border border-secondary-600 rounded text-white text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-secondary-800 border border-secondary-600 rounded text-white text-sm"
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Rate"
                          value={item.unitPrice}
                          onChange={(e) => handleLineItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-secondary-800 border border-secondary-600 rounded text-white text-sm"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-1">
                        <span className="text-white text-sm">₹{(item.total || 0).toFixed(2)}</span>
                      </div>
                      <div className="col-span-1">
                        {formData.lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-neon-pink text-sm flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-secondary-400 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="text-white font-medium">
                  Total: {formatCurrency(calculateTotal())}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                    }}
                    className="px-3 py-2 bg-secondary-700 text-white rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-gradient-to-r from-neon-pink to-neon-purple text-white rounded-lg text-sm"
                  >
                    {showCreateModal ? 'Create PO' : 'Update PO'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-morphism neon-border rounded-2xl p-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">PO Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-secondary-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <InfoRow label="PO Number" value={selectedPO.poNumber || '—'} />
              <InfoRow label="Supplier" value={selectedPO.supplier?.name || '—'} />
              <InfoRow label="Status" value={
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedPO.status)}`}>
                  {selectedPO.status}
                </span>
              } />
              <InfoRow label="Total Amount" value={formatCurrency(selectedPO.grandTotal)} />
              <InfoRow label="Delivery Date" value={formatDate(selectedPO.deliveryDate)} />
              <InfoRow label="Payment Terms" value={selectedPO.paymentTerms || '—'} />
              <InfoRow label="Created At" value={formatDate(selectedPO.createdAt)} />
              {selectedPO.notes && <InfoRow label="Notes" value={selectedPO.notes} />}
              
              <div className="mt-4">
                <p className="text-secondary-400 text-xs mb-2">Line Items</p>
                <div className="space-y-2">
                  {selectedPO.lineItems?.map((item, i) => (
                    <div key={i} className="text-white text-sm border-b border-secondary-700 pb-2">
                      <div className="font-medium">{item.item}</div>
                      <div className="text-xs text-secondary-400">{item.description}</div>
                      <div className="text-xs">
                        {item.quantity} × ₹{(item.unitPrice || 0).toLocaleString()} = ₹{(item.total || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-morphism neon-border rounded-2xl p-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Add Supplier</h3>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="text-secondary-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label className="block text-xs text-secondary-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-secondary-400 mb-1">Email</label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink"
                />
              </div>
              <div>
                <label className="block text-xs text-secondary-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink"
                />
              </div>
              <div>
                <label className="block text-xs text-secondary-400 mb-1">Address</label>
                <textarea
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="flex-1 px-3 py-2 bg-secondary-700 text-white rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm"
                >
                  Create Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

// Helper Component
const InfoRow = ({ label, value }) => (
  <div className="flex justify-between border-b border-secondary-700 pb-2">
    <span className="text-secondary-400 text-sm">{label}</span>
    <span className="text-white text-sm">{value}</span>
  </div>
);

export default PurchaseOrders;