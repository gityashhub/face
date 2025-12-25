import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Target, Award, Activity, 
  UserCheck, Phone, Download, Bell, Plus, AlertCircle,
  Eye, Calendar, CheckCircle, XCircle, Edit3, Trash2
} from 'lucide-react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { leadAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const SalesPage = () => {
  // State
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showWonModal, setShowWonModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [newLead, setNewLead] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    source: 'Referral',
    priority: 'Medium',
    estimatedValue: '',
    expectedCloseDate: '',
    nextFollowUpDate: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
    notes: ''
  });
  const [meetingData, setMeetingData] = useState({
    type: 'Call',
    scheduledDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    duration: 30,
    agenda: ''
  });
  const [wonData, setWonData] = useState({
    finalValue: '',
    recurringRevenue: '',
    onboardingStatus: 'Not Started',
    satisfactionScore: '',
    renewalDate: '',
    discount: '',
    contractDuration: '',
    paymentTerms: '',
    deliveryDate: ''
  });

  // Fetch employee's leads
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const email = localStorage.getItem('userEmail');
      const response = await leadAPI.getLeads({ assignedTo: email });
      if (response.data.success) {
        setLeads(response.data.data.leads || []);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
      setError('Failed to load your sales data');
      toast.error('Could not load sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Stats (mocked for demo — replace with real API if available)
  const stats = {
    actualSales: leads
      .filter(l => l.status === 'Won')
      .reduce((sum, l) => sum + (l.wonDetails?.finalValue || 0), 0)
  };;

  // Helpers
  const getStatusColor = (status) => {
    switch (status) {
      case 'Won': return 'text-green-400 bg-green-400/20';
      case 'Lost': return 'text-red-400 bg-red-400/20';
      case 'Negotiation': return 'text-purple-400 bg-purple-400/20';
      case 'Proposal': return 'text-orange-400 bg-orange-400/20';
      case 'Qualified': return 'text-blue-400 bg-blue-400/20';
      case 'Contacted': return 'text-yellow-400 bg-yellow-400/20';
      default: return 'text-secondary-400 bg-secondary-400/20';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-400 bg-red-400/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'Low': return 'text-green-400 bg-green-400/20';
      default: return 'text-secondary-400 bg-secondary-400/20';
    }
  };

  // Handlers
  const handleAddLead = async (e) => {
    e.preventDefault();
    try {
      const leadData = {
        ...newLead,
        estimatedValue: newLead.estimatedValue ? parseFloat(newLead.estimatedValue) : undefined,
        expectedCloseDate: newLead.expectedCloseDate || undefined,
        nextFollowUpDate: newLead.nextFollowUpDate || undefined
      };
      const response = await leadAPI.createLead(leadData);
      if (response.data.success) {
        toast.success('Lead added successfully!');
        fetchLeads();
        setNewLead({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          company: '',
          position: '',
          source: 'Referral',
          priority: 'Medium',
          estimatedValue: '',
          expectedCloseDate: '',
          nextFollowUpDate: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
          notes: ''
        });
        setShowAddModal(false);
      }
    } catch (err) {
      toast.error('Failed to add lead');
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    try {
      await leadAPI.addMeeting(selectedLead._id, meetingData);
      toast.success('Meeting scheduled!');
      fetchLeads();
      setShowMeetingModal(false);
    } catch (err) {
      toast.error('Failed to schedule meeting');
    }
  };

  const handleMarkAsWon = async (e) => {
    e.preventDefault();
    try {
      await leadAPI.updateWonLead(selectedLead._id, wonData);
      toast.success('Deal marked as won!');
      fetchLeads();
      setShowWonModal(false);
    } catch (err) {
      toast.error('Failed to update deal');
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await leadAPI.deleteLead(id);
      toast.success('Lead deleted');
      fetchLeads();
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  // Format helpers
  const formatCurrency = (value) => `₹${(value || 0).toLocaleString()}`;
  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '—';

  return (
    <EmployeeLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Dashboard Stats */}
        <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-neon-pink" />
            My Sales Performance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
             title="Sales Achieved"
              value={formatCurrency(stats.actualSales)}
              color="green"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <ActionButton icon={Plus} label="Add New Lead" onClick={() => setShowAddModal(true)} />
          <ActionButton icon={Calendar} label="Schedule Meeting" onClick={() => {
            if (leads.length === 0) {
              toast.error('No leads available');
              return;
            }
            setSelectedLead(leads[0]);
            setShowMeetingModal(true);
          }} />
          <ActionButton icon={Download} label="Export Report" onClick={() => toast.success('Report exported')} />
        </div>

        {/* Leads Table */}
        <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4 md:p-6">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white">My Leads & Opportunities</h2>
            <span className="text-secondary-400 text-xs sm:text-sm">{leads.length} leads</span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-secondary-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neon-pink mx-auto"></div>
              <p className="mt-2">Loading your leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-10 h-10 text-secondary-600 mx-auto mb-2" />
              <p className="text-secondary-400">No leads assigned to you yet</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-secondary-700">
                      <th className="text-left py-3 text-secondary-400">Lead</th>
                      <th className="text-left py-3 text-secondary-400">Value</th>
                      <th className="text-left py-3 text-secondary-400">Status</th>
                      <th className="text-left py-3 text-secondary-400">Priority</th>
                      <th className="text-left py-3 text-secondary-400">Next Follow-up</th>
                      <th className="text-left py-3 text-secondary-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead._id} className="border-b border-secondary-700/50 hover:bg-secondary-800/30">
                        <td className="py-3">
                          <p className="text-white font-medium">{lead.firstName} {lead.lastName}</p>
                          <p className="text-xs text-secondary-400">{lead.company || '—'}</p>
                        </td>
                        <td className="py-3 text-neon-pink font-medium">
                          {formatCurrency(lead.estimatedValue)}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(lead.priority)}`}>
                            {lead.priority}
                          </span>
                        </td>
                        <td className="py-3 text-secondary-400">
                          {formatDate(lead.nextFollowUpDate)}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowViewModal(true);
                              }}
                              className="p-1 text-secondary-400 hover:text-blue-400"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowMeetingModal(true);
                              }}
                              className="p-1 text-secondary-400 hover:text-purple-400"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            {lead.status !== 'Won' && (
                              <button
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setWonData({
                                    finalValue: lead.estimatedValue || '',
                                    recurringRevenue: '',
                                    onboardingStatus: 'Not Started',
                                    satisfactionScore: '',
                                    renewalDate: '',
                                    discount: '',
                                    contractDuration: '',
                                    paymentTerms: '',
                                    deliveryDate: ''
                                  });
                                  setShowWonModal(true);
                                }}
                                className="p-1 text-secondary-400 hover:text-green-400"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteLead(lead._id)}
                              className="p-1 text-secondary-400 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="block sm:hidden space-y-4">
                {leads.map(lead => (
                  <div key={lead._id} className="glass-morphism rounded-lg p-4 border border-secondary-700">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-white font-medium text-base">{lead.firstName} {lead.lastName}</p>
                        <p className="text-sm text-secondary-400">{lead.company || '—'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-secondary-400 hover:text-blue-400"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowMeetingModal(true);
                          }}
                          className="p-2 text-secondary-400 hover:text-purple-400"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        {lead.status !== 'Won' && (
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setWonData({
                                finalValue: lead.estimatedValue || '',
                                recurringRevenue: '',
                                onboardingStatus: 'Not Started',
                                satisfactionScore: '',
                                renewalDate: '',
                                discount: '',
                                contractDuration: '',
                                paymentTerms: '',
                                deliveryDate: ''
                              });
                              setShowWonModal(true);
                            }}
                            className="p-2 text-secondary-400 hover:text-green-400"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLead(lead._id)}
                          className="p-2 text-secondary-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-secondary-400">Value</p>
                        <p className="text-neon-pink font-medium">{formatCurrency(lead.estimatedValue)}</p>
                      </div>
                      <div>
                        <p className="text-secondary-400">Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-secondary-400">Priority</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(lead.priority)}`}>
                          {lead.priority}
                        </span>
                      </div>
                      <div>
                        <p className="text-secondary-400">Next Follow-up</p>
                        <p className="text-white">{formatDate(lead.nextFollowUpDate)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {/* Add Lead Modal */}
      {showAddModal && (
        <Modal title="Add New Lead" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddLead} className="space-y-4">
            <Input label="First Name *" value={newLead.firstName} onChange={(v) => setNewLead({...newLead, firstName: v})} />
            <Input label="Last Name *" value={newLead.lastName} onChange={(v) => setNewLead({...newLead, lastName: v})} />
            <Input label="Email *" type="email" value={newLead.email} onChange={(v) => setNewLead({...newLead, email: v})} />
            <Input label="Phone *" value={newLead.phone} onChange={(v) => setNewLead({...newLead, phone: v})} />
            <Input label="Company" value={newLead.company} onChange={(v) => setNewLead({...newLead, company: v})} />
            <Input label="Estimated Value (₹)" type="number" value={newLead.estimatedValue} onChange={(v) => setNewLead({...newLead, estimatedValue: v})} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Expected Close Date" type="date" value={newLead.expectedCloseDate} onChange={(v) => setNewLead({...newLead, expectedCloseDate: v})} />
              <Input label="Next Follow-up" type="date" value={newLead.nextFollowUpDate} onChange={(v) => setNewLead({...newLead, nextFollowUpDate: v})} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-secondary-700 text-white rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-gradient-to-r from-neon-pink to-neon-purple text-white rounded-lg">Add Lead</button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Lead Modal */}
      {showViewModal && selectedLead && (
        <Modal title={`${selectedLead.firstName} ${selectedLead.lastName}`} onClose={() => setShowViewModal(false)}>
          <div className="space-y-3 text-sm">
            <InfoRow label="Email" value={selectedLead.email} />
            <InfoRow label="Phone" value={selectedLead.phone} />
            <InfoRow label="Company" value={selectedLead.company || '—'} />
            <InfoRow label="Status" value={
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedLead.status)}`}>
                {selectedLead.status}
              </span>
            } />
            <InfoRow label="Priority" value={
              <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(selectedLead.priority)}`}>
                {selectedLead.priority}
              </span>
            } />
            <InfoRow label="Estimated Value" value={formatCurrency(selectedLead.estimatedValue)} />
            <InfoRow label="Next Follow-up" value={formatDate(selectedLead.nextFollowUpDate)} />
            {selectedLead.notes && <InfoRow label="Notes" value={selectedLead.notes} />}
          </div>
        </Modal>
      )}

      {/* Meeting Modal */}
      {showMeetingModal && selectedLead && (
        <Modal title="Schedule Meeting" onClose={() => setShowMeetingModal(false)}>
          <form onSubmit={handleScheduleMeeting} className="space-y-4">
            <Select label="Meeting Type" value={meetingData.type} onChange={(v) => setMeetingData({...meetingData, type: v})} options={[
              { value: 'Call', label: 'Call' },
              { value: 'Video Meeting', label: 'Video Meeting' },
              { value: 'In-Person', label: 'In-Person' },
              { value: 'Demo', label: 'Demo' }
            ]} />
            <Input label="Scheduled Date & Time" type="datetime-local" value={meetingData.scheduledDate} onChange={(v) => setMeetingData({...meetingData, scheduledDate: v})} />
            <Input label="Duration (minutes)" type="number" value={meetingData.duration} onChange={(v) => setMeetingData({...meetingData, duration: v})} />
            <Textarea label="Agenda" value={meetingData.agenda} onChange={(v) => setMeetingData({...meetingData, agenda: v})} />
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setShowMeetingModal(false)} className="px-4 py-2 bg-secondary-700 text-white rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg">Schedule</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Won Modal */}
      {showWonModal && selectedLead && (
        <Modal title="Mark Deal as Won" onClose={() => setShowWonModal(false)}>
          <form onSubmit={handleMarkAsWon} className="space-y-4">
            <Input label="Final Deal Value (₹)" type="number" value={wonData.finalValue} onChange={(v) => setWonData({...wonData, finalValue: v})} />
            <Input label="Monthly Recurring Revenue (₹)" type="number" value={wonData.recurringRevenue} onChange={(v) => setWonData({...wonData, recurringRevenue: v})} />
            <Input label="Renewal Date" type="date" value={wonData.renewalDate} onChange={(v) => setWonData({...wonData, renewalDate: v})} />
            <Input label="Contract Duration (months)" type="number" value={wonData.contractDuration} onChange={(v) => setWonData({...wonData, contractDuration: v})} />
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setShowWonModal(false)} className="px-4 py-2 bg-secondary-700 text-white rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg">Mark as Won</button>
            </div>
          </form>
        </Modal>
      )}
    </EmployeeLayout>
  );
};

// Helper Components
const StatCard = ({ title, value, progress, color = 'neon-pink', subtitle }) => (
  <div className="glass-morphism p-3 rounded-lg">
    <p className="text-xs text-secondary-400">{title}</p>
    <p className="text-lg font-bold text-white mt-1">{value}</p>
    {subtitle && <p className="text-xs text-secondary-400 mt-1">{subtitle}</p>}
    {progress !== undefined && (
      <div className="mt-2 w-full bg-secondary-700 rounded-full h-1.5">
        <div 
          className={`h-full rounded-full ${color === 'green' ? 'bg-green-500' : color === 'neon-pink' ? 'bg-gradient-to-r from-neon-pink to-neon-purple' : 'bg-blue-500'}`} 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    )}
  </div>
);

const ActionButton = ({ icon: Icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="p-4 rounded-lg border-2 border-dashed border-secondary-600 hover:border-neon-pink/50 hover:bg-neon-pink/5 group text-left"
  >
    <Icon className="w-6 h-6 text-secondary-400 group-hover:text-neon-pink mb-2" />
    <p className="text-sm text-secondary-400 group-hover:text-white">{label}</p>
  </button>
);

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
    <div className="glass-morphism neon-border rounded-2xl p-3 sm:p-4 w-full max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold text-white">{title}</h3>
        <button onClick={onClose} className="text-secondary-400 hover:text-white">
          <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Input = ({ label, value, onChange, type = 'text', ...props }) => (
  <div>
    <label className="block text-xs text-secondary-400 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:outline-none"
      {...props}
    />
  </div>
);

const Textarea = ({ label, value, onChange, rows = 3 }) => (
  <div>
    <label className="block text-xs text-secondary-400 mb-1">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:outline-none"
    />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs text-secondary-400 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-secondary-800 border border-secondary-600 rounded-lg text-white text-sm focus:border-neon-pink focus:outline-none"
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between border-b border-secondary-700 pb-2">
    <span className="text-secondary-400 text-sm">{label}</span>
    <span className="text-white text-sm">{value}</span>
  </div>
);

export default SalesPage;
