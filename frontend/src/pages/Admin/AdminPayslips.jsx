import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import { payslipAPI, employeeAPI } from '../../utils/api';
import {
  FileText,
  Download,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Users,
  Eye,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminPayslips = () => {
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [generating, setGenerating] = useState(false);
  
  const currentDate = new Date();
  const [filterMonth, setFilterMonth] = useState(currentDate.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(currentDate.getFullYear());
  
  const [formData, setFormData] = useState({
    employeeId: '',
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    earnings: {
      basicSalary: 0,
      hra: 0,
      medical: 0,
      transport: 0,
      bonus: 0,
      overtime: 0,
      otherAllowances: 0
    },
    deductions: {
      pf: 0,
      esi: 0,
      tax: 0,
      professionalTax: 0,
      loanDeduction: 0,
      otherDeductions: 0
    },
    remarks: ''
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  useEffect(() => {
    fetchPayslips();
    fetchEmployees();
  }, [filterMonth, filterYear]);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const response = await payslipAPI.getPayslips({ month: filterMonth, year: filterYear });
      console.log('Payslips response:', response.data); // Debug log
      setPayslips(response.data?.data?.payslips || []); // ✅ Fixed: Correct nested path
    } catch (error) {
      console.error('Error fetching payslips:', error);
      toast.error('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getEmployees({ status: 'Active', limit: 100 });
      setEmployees(response.data?.data?.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const handleEmployeeSelect = async (employeeId) => {
    const employee = employees.find(e => e._id === employeeId);
    if (employee) {
      setFormData(prev => ({
        ...prev,
        employeeId,
        earnings: {
          basicSalary: employee.salaryInfo?.basicSalary || 0,
          hra: employee.salaryInfo?.allowances?.hra || 0,
          medical: employee.salaryInfo?.allowances?.medical || 0,
          transport: employee.salaryInfo?.allowances?.transport || 0,
          bonus: 0,
          overtime: 0,
          otherAllowances: employee.salaryInfo?.allowances?.other || 0
        },
        deductions: {
          pf: employee.salaryInfo?.deductions?.pf || 0,
          esi: employee.salaryInfo?.deductions?.esi || 0,
          tax: employee.salaryInfo?.deductions?.tax || 0,
          professionalTax: 0,
          loanDeduction: 0,
          otherDeductions: employee.salaryInfo?.deductions?.other || 0
        }
      }));
    }
  };

  const handleGeneratePayslip = async (e, forceRegenerate = false) => {
    e.preventDefault();
    if (!formData.employeeId) {
      toast.error('Please select an employee');
      return;
    }

    try {
      setGenerating(true);
      const dataToSend = { ...formData };
      if (forceRegenerate) {
        dataToSend.regenerate = true;
      }

      const response = await payslipAPI.generatePayslip(dataToSend);
      toast.success(forceRegenerate ? 'Payslip regenerated successfully!' : 'Payslip generated successfully!');
      setShowGenerateModal(false);
      resetForm();
      fetchPayslips();
    } catch (error) {
      console.error('Error generating payslip:', error);

      // Check if error is due to existing payslip
      if (error.response?.data?.canRegenerate) {
        const existingPayslip = error.response.data.existingPayslip;
        const monthName = months[formData.month - 1];

        // Show confirmation dialog
        const confirmed = window.confirm(
          `A payslip already exists for this employee for ${monthName} ${formData.year}.\n\n` +
          `Generated: ${new Date(existingPayslip.generatedAt).toLocaleDateString()}\n` +
          `Net Salary: ₹${existingPayslip.netSalary?.toLocaleString()}\n\n` +
          `Do you want to regenerate it? This will delete the existing payslip and create a new one.`
        );

        if (confirmed) {
          // Retry with regenerate flag
          handleGeneratePayslip(e, true);
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to generate payslip');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkGenerate = async (regenerate = false) => {
    try {
      setGenerating(true);
      const response = await payslipAPI.bulkGenerate({
        month: formData.month,
        year: formData.year,
        regenerate
      });

      const results = response.data.data;
      const message = response.data.message;

      // Show detailed results
      if (results.success?.length > 0 || results.regenerated?.length > 0) {
        toast.success(message);
      } else if (results.skipped?.length > 0) {
        const monthName = months[formData.month - 1];
        const confirmed = window.confirm(
          `All payslips for ${monthName} ${formData.year} already exist.\n\n` +
          `${results.skipped.length} employees already have payslips.\n\n` +
          `Do you want to regenerate all payslips? This will delete existing payslips and create new ones.`
        );

        if (confirmed) {
          handleBulkGenerate(true);
          return;
        }
      }

      setShowBulkModal(false);
      fetchPayslips();
    } catch (error) {
      console.error('Error bulk generating payslips:', error);
      toast.error(error.response?.data?.message || 'Failed to generate payslips');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (payslipId) => {
    try {
      const response = await payslipAPI.downloadPayslip(payslipId);

      // The response.data is already a Blob when responseType: 'blob' is set
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Get payslip details for better filename
      const payslip = payslips.find(p => p._id === payslipId);
      const filename = payslip
        ? `Payslip_${payslip.employeeId}_${payslip.period.month}_${payslip.period.year}.pdf`
        : `payslip_${payslipId}.pdf`;

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        link.remove();
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success('Payslip downloaded successfully!');
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.error(error.response?.data?.message || 'Failed to download payslip');
    }
  };

  const handleDelete = async (payslipId) => {
    if (!window.confirm('Are you sure you want to delete this payslip?')) return;
    
    try {
      await payslipAPI.deletePayslip(payslipId);
      toast.success('Payslip deleted');
      fetchPayslips();
    } catch (error) {
      console.error('Error deleting payslip:', error);
      toast.error('Failed to delete payslip');
    }
  };

  const handleViewPayslip = (payslip) => {
    setSelectedPayslip(payslip);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      earnings: {
        basicSalary: 0,
        hra: 0,
        medical: 0,
        transport: 0,
        bonus: 0,
        overtime: 0,
        otherAllowances: 0
      },
      deductions: {
        pf: 0,
        esi: 0,
        tax: 0,
        professionalTax: 0,
        loanDeduction: 0,
        otherDeductions: 0
      },
      remarks: ''
    });
  };

  const calculateTotals = () => {
    const grossEarnings = Object.values(formData.earnings).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    const totalDeductions = Object.values(formData.deductions).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    const netSalary = grossEarnings - totalDeductions;
    return { grossEarnings, totalDeductions, netSalary };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-400/20 text-green-400';
      case 'generated': return 'bg-blue-400/20 text-blue-400';
      case 'draft': return 'bg-yellow-400/20 text-yellow-400';
      case 'cancelled': return 'bg-red-400/20 text-red-400';
      default: return 'bg-secondary-600 text-secondary-400';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Payslip Management</h1>
            <p className="text-secondary-400 mt-1">Generate and manage employee payslips</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2.5 bg-secondary-700 hover:bg-secondary-600 text-white rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>Bulk Generate</span>
            </button>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg flex items-center space-x-2 hover-glow transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              <span>Generate Payslip</span>
            </button>
          </div>
        </div>

        <div className="glass-morphism neon-border rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-secondary-400" />
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                className="px-4 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white focus:border-neon-pink"
              >
                {months.map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                className="px-4 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white focus:border-neon-pink"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchPayslips}
              className="px-4 py-2 bg-secondary-700 hover:bg-secondary-600 text-white rounded-lg flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <div className="ml-auto text-secondary-400">
              Total: {payslips.length} payslips
            </div>
          </div>
        </div>

        <div className="glass-morphism neon-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-pink"></div>
            </div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-secondary-500 mx-auto mb-4" />
              <p className="text-secondary-400">No payslips found for {months[filterMonth - 1]} {filterYear}</p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="mt-4 px-4 py-2 bg-neon-pink/20 text-neon-pink rounded-lg hover:bg-neon-pink/30 transition-colors"
              >
                Generate First Payslip
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-400 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-400 uppercase">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-400 uppercase">Gross</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-400 uppercase">Deductions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-400 uppercase">Net Salary</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-secondary-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-secondary-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-700">
                  {payslips.map((payslip) => (
                    <tr key={payslip._id} className="hover:bg-secondary-800/30 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-white">{payslip.employeeName}</p>
                          <p className="text-sm text-secondary-400">{payslip.employeeId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-secondary-300">
                        {months[payslip.period.month - 1]} {payslip.period.year}
                      </td>
                      <td className="px-4 py-4 text-right text-green-400 font-medium">
                        INR {payslip.grossEarnings?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-4 text-right text-red-400 font-medium">
                        INR {payslip.totalDeductions?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-4 text-right text-white font-bold">
                        INR {payslip.netSalary?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(payslip.status)}`}>
                          {payslip.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleViewPayslip(payslip)}
                            className="p-2 text-secondary-400 hover:text-white hover:bg-secondary-700 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(payslip._id)}
                            className="p-2 text-secondary-400 hover:text-neon-pink hover:bg-secondary-700 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(payslip._id)}
                            className="p-2 text-secondary-400 hover:text-red-400 hover:bg-secondary-700 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowGenerateModal(false)} />
            <div className="relative glass-morphism neon-border rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Generate Payslip</h2>
                <button onClick={() => setShowGenerateModal(false)} className="text-secondary-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleGeneratePayslip} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Employee *</label>
                    <select
                      value={formData.employeeId}
                      onChange={(e) => handleEmployeeSelect(e.target.value)}
                      className="w-full px-4 py-3 bg-secondary-800 border border-secondary-600 rounded-lg text-white focus:border-neon-pink"
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.personalInfo?.firstName} {emp.personalInfo?.lastName} ({emp.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Month *</label>
                    <select
                      value={formData.month}
                      onChange={(e) => setFormData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-secondary-800 border border-secondary-600 rounded-lg text-white focus:border-neon-pink"
                    >
                      {months.map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Year *</label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-secondary-800 border border-secondary-600 rounded-lg text-white focus:border-neon-pink"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-green-400 border-b border-secondary-600 pb-2">Earnings</h3>
                    {Object.entries(formData.earnings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <label className="text-sm text-secondary-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            earnings: { ...prev.earnings, [key]: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-32 px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-right focus:border-neon-pink"
                          min="0"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-red-400 border-b border-secondary-600 pb-2">Deductions</h3>
                    {Object.entries(formData.deductions).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <label className="text-sm text-secondary-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            deductions: { ...prev.deductions, [key]: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-32 px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-right focus:border-neon-pink"
                          min="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-secondary-800/50 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-secondary-400">Gross Earnings</p>
                      <p className="text-xl font-bold text-green-400">INR {calculateTotals().grossEarnings.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary-400">Total Deductions</p>
                      <p className="text-xl font-bold text-red-400">INR {calculateTotals().totalDeductions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary-400">Net Salary</p>
                      <p className="text-xl font-bold text-white">INR {calculateTotals().netSalary.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Remarks</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                    className="w-full px-4 py-3 bg-secondary-800 border border-secondary-600 rounded-lg text-white focus:border-neon-pink"
                    rows={2}
                    placeholder="Optional remarks..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-secondary-600">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-6 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow disabled:opacity-50"
                  >
                    {generating ? 'Generating...' : 'Generate Payslip'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowBulkModal(false)} />
            <div className="relative glass-morphism neon-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Bulk Generate Payslips</h2>
                <button onClick={() => setShowBulkModal(false)} className="text-secondary-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-secondary-300">
                  This will generate payslips for all active employees for the selected period.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Month</label>
                    <select
                      value={formData.month}
                      onChange={(e) => setFormData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-secondary-800 border border-secondary-600 rounded-lg text-white focus:border-neon-pink"
                    >
                      {months.map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-300 mb-2">Year</label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-secondary-800 border border-secondary-600 rounded-lg text-white focus:border-neon-pink"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-400 font-medium">Note</p>
                      <p className="text-xs text-secondary-300">
                        Employees with existing payslips for this period will be skipped.
                        Salary data will be taken from employee records.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-6 py-3 border border-secondary-600 text-secondary-300 rounded-lg hover:bg-secondary-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkGenerate}
                    disabled={generating}
                    className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow disabled:opacity-50"
                  >
                    {generating ? 'Generating...' : 'Generate All'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showViewModal && selectedPayslip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowViewModal(false)} />
            <div className="relative glass-morphism neon-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Payslip Details</h2>
                <button onClick={() => setShowViewModal(false)} className="text-secondary-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-secondary-400">Employee</p>
                    <p className="text-white font-medium">{selectedPayslip.employeeName}</p>
                    <p className="text-sm text-secondary-400">{selectedPayslip.employeeId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary-400">Period</p>
                    <p className="text-white font-medium">{months[selectedPayslip.period.month - 1]} {selectedPayslip.period.year}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-green-400/10 rounded-lg p-4">
                    <h3 className="text-green-400 font-bold mb-3">Earnings</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-secondary-300">Basic Salary</span><span className="text-white">INR {selectedPayslip.earnings?.basicSalary?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-secondary-300">HRA</span><span className="text-white">INR {selectedPayslip.earnings?.hra?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-secondary-300">Medical</span><span className="text-white">INR {selectedPayslip.earnings?.medical?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-secondary-300">Transport</span><span className="text-white">INR {selectedPayslip.earnings?.transport?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-secondary-300">Bonus</span><span className="text-white">INR {selectedPayslip.earnings?.bonus?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-secondary-300">Overtime</span><span className="text-white">INR {selectedPayslip.earnings?.overtime?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-secondary-300">Other</span><span className="text-white">INR {selectedPayslip.earnings?.otherAllowances?.toLocaleString()}</span></div>
                      <div className="border-t border-green-400/30 pt-2 mt-2">
                        <div className="flex justify-between font-bold"><span className="text-green-400">Total Earnings</span><span className="text-green-400">INR {selectedPayslip.grossEarnings?.toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-400/10 rounded-lg p-4">
                    <h3 className="text-red-400 font-bold mb-3">Deductions</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-secondary-300">Provident Fund</span><span className="text-white">INR {selectedPayslip.deductions?.pf?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-secondary-300">ESI</span><span className="text-white">INR {selectedPayslip.deductions?.esi?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-secondary-300">Income Tax</span><span className="text-white">INR {selectedPayslip.deductions?.tax?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-secondary-300">Professional Tax</span><span className="text-white">INR {selectedPayslip.deductions?.professionalTax?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-secondary-300">Loan</span><span className="text-white">INR {selectedPayslip.deductions?.loanDeduction?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-secondary-300">Other</span><span className="text-white">INR {selectedPayslip.deductions?.otherDeductions?.toLocaleString()}</span></div>
                      <div className="border-t border-red-400/30 pt-2 mt-2">
                        <div className="flex justify-between font-bold"><span className="text-red-400">Total Deductions</span><span className="text-red-400">INR {selectedPayslip.totalDeductions?.toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-neon-pink/10 border border-neon-pink/30 rounded-lg p-4 text-center">
                  <p className="text-secondary-300 text-sm">Net Salary</p>
                  <p className="text-3xl font-bold text-white">INR {selectedPayslip.netSalary?.toLocaleString()}</p>
                </div>

                {selectedPayslip.attendance && (
                  <div className="bg-secondary-800/50 rounded-lg p-4">
                    <h3 className="text-white font-bold mb-3">Attendance Summary</h3>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-white">{selectedPayslip.attendance.workingDays}</p>
                        <p className="text-xs text-secondary-400">Working Days</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-400">{selectedPayslip.attendance.presentDays}</p>
                        <p className="text-xs text-secondary-400">Present</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">{selectedPayslip.attendance.leaveDays}</p>
                        <p className="text-xs text-secondary-400">Leave</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-400">{selectedPayslip.attendance.absentDays}</p>
                        <p className="text-xs text-secondary-400">Absent</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-secondary-600">
                  <button
                    onClick={() => handleDownload(selectedPayslip._id)}
                    className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow flex items-center space-x-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPayslips;
