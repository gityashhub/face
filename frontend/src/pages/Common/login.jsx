import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Building2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const isEmployeeId = (value) => {
    // Check if the input doesn't contain @ (not an email)
    // and matches typical employee ID patterns (alphanumeric, possibly with hyphens/underscores)
    return !value.includes('@') && /^[A-Z0-9_-]+$/i.test(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const loginData = {
        email: formData.email.trim(), // This field will be used for both email and employee ID
        password: formData.password
      };

      console.log('Login attempt:', {
        identifier: loginData.email,
        isEmployeeId: isEmployeeId(loginData.email),
        identifierType: isEmployeeId(loginData.email) ? 'Employee ID' : 'Email'
      });

      // Use VITE_API_URL if available, otherwise fallback
      const API_URL = import.meta.env.VITE_API_URL || 'https://face-votd.onrender.com/api';
      const response = await axios.post(`${API_URL}/auth/login`, loginData);

      if (response.data.success) {
        // Extract department name - handle various response formats
        let departmentName = null;
        const deptData = response.data.user.department;
        if (deptData) {
          if (typeof deptData === 'string') {
            departmentName = deptData;
          } else if (deptData.name) {
            departmentName = deptData.name;
          }
        }
        
        console.log('Department extraction debug:', { raw: deptData, extracted: departmentName });
        
        const userData = {
          token: response.data.token,
          userRole: response.data.user.role,
          userEmail: response.data.user.email,
          userName: response.data.user.name,
          userId: response.data.user.id,
          userDepartment: departmentName,
          departmentId: deptData?.id || deptData?._id || null
        };
        
        if (response.data.user.employeeId) {
          userData.employeeId = response.data.user.employeeId;
        }

        // Store each value, but only if it's not null/undefined
        Object.keys(userData).forEach(key => {
          if (userData[key] !== null && userData[key] !== undefined) {
            sessionStorage.setItem(key, userData[key]);
            localStorage.setItem(key, userData[key]);
          }
        });

        console.log("User Department stored:", localStorage.getItem('userDepartment'));
        console.log("Token stored:", sessionStorage.getItem("token"));
console.log("Token in sessionStorage:", sessionStorage.getItem("token"));
console.log("Token in localStorage:", localStorage.getItem("token"));

        // Set axios default header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

        // Show success message with user info
        const loginType = isEmployeeId(formData.email) ? 'Employee ID' : 'Email';
        toast.success(`Welcome back, ${response.data.user.name}! (${loginType} login)`);

        // Role-based and department-based navigation
        if (response.data.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (response.data.user.role === 'employee') {
          const department = response.data.user.department?.name?.toLowerCase();
          
          // Check if employee is from Sales department
          if (department === 'sales' || department === 'sales department') {
            navigate('/employee/leads'); // Navigate to Lead Management
          } else {
            navigate('/employee/dashboard'); // Default employee dashboard
          }
        } else {
          toast.error('Unknown user role');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response?.status === 401) {
        if (error.response.data.message.includes('locked')) {
          toast.error('Account temporarily locked due to too many failed attempts');
        } else if (error.response.data.message.includes('deactivated')) {
          toast.error('Account is deactivated. Please contact administrator.');
        } else {
          // Show specific error message for employee ID vs email
          const loginType = isEmployeeId(formData.email) ? 'Employee ID' : 'Email';
          toast.error(error.response.data.message || `Invalid ${loginType.toLowerCase()} or password`);
        }
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'Please check your input');
      } else if (error.response?.status >= 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(error.response?.data?.message || 'Login failed. Please try again.');
      }
    }
    
    setLoading(false);
  };

  // Clear any existing auth data on component mount
  React.useEffect(() => {
    // Only clear if we're not already logged in
    const token = sessionStorage.getItem('token');
    if (!token) {
      sessionStorage.clear();
    }
  }, []);

  // Determine icon and placeholder based on input
  const getInputIcon = () => {
    if (!formData.email) return <Mail className="w-5 h-5 text-secondary-400" />;
    return isEmployeeId(formData.email) ? 
      <User className="w-5 h-5 text-secondary-400" /> : 
      <Mail className="w-5 h-5 text-secondary-400" />;
  };

  const getInputPlaceholder = () => {
    if (!formData.email) return 'Enter your email or employee ID';
    return isEmployeeId(formData.email) ? 
      'Enter your employee ID' : 
      'Enter your email address';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-neon-pink opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-neon-purple opacity-10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative">
        {/* Company Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-neon-pink to-neon-purple rounded-2xl mb-4 animate-glow">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold neon-text mb-2">CompanyName</h1>
          <p className="text-secondary-400">Employee Management System</p>
        </div>

        {/* Login Form */}
        <div className="glass-morphism neon-border p-8 rounded-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-secondary-400">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email/Employee ID Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-300">
                Email or Employee ID
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  {getInputIcon()}
                </div>
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 transition-all duration-300"
                  placeholder={getInputPlaceholder()}
                  required
                  disabled={loading}
                />
              </div>
              {formData.email && (
                <p className="text-xs text-secondary-400">
                  {isEmployeeId(formData.email) ? 
                    'Logging in with Employee ID' : 
                    'Logging in with Email Address'
                  }
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-300">
                Password
                {formData.email && isEmployeeId(formData.email) && (
                  <span className="text-xs text-neon-pink ml-1">(Use your Employee ID)</span>
                )}
                {formData.email && !isEmployeeId(formData.email) && formData.email.includes('@') && (
                  <span className="text-xs text-neon-purple ml-1">(Employees: Use Employee ID as password)</span>
                )}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-secondary-800/50 border border-secondary-600 rounded-lg text-white placeholder-secondary-500 focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/20 transition-all duration-300"
                  placeholder={
                    isEmployeeId(formData.email) 
                      ? "Enter your Employee ID" 
                      : formData.email.includes('@') && !formData.email.includes('admin') 
                        ? "Enter your Employee ID as password" 
                        : "Enter your password"
                  }
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-white transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-neon-pink hover:text-neon-purple transition-colors duration-300"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-secondary-800/30 rounded-lg border border-secondary-600">
            <p className="text-sm text-secondary-300 mb-3 font-medium">Demo Credentials:</p>
            <div className="space-y-2 text-xs text-secondary-400">
              <div className="p-2 bg-secondary-700/50 rounded">
                <p className="text-neon-pink font-semibold mb-1">Admin Login:</p>
                <p>Email: admin@gmail.com</p>
                <p>Password: admin</p>
              </div>
              <div className="p-2 bg-secondary-700/50 rounded">
                <p className="text-neon-purple font-semibold mb-1">Employee Login:</p>
                <p>Email: employee@company.com</p>
                <p>Password: EMP001 (Employee ID)</p>
              </div>
            </div>
          </div>

          {/* Login Help */}
          <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-600/30">
            <p className="text-xs text-blue-300 text-center">
              💡 <strong>Employees:</strong> Login with your email address and use your Employee ID as password
            </p>
          </div>

          {/* Additional Help */}
          <div className="mt-3 p-3 bg-green-900/20 rounded-lg border border-green-600/30">
            <p className="text-xs text-green-300 text-center">
              🔐 <strong>Example:</strong> Email: john@company.com, Password: EMP001
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;