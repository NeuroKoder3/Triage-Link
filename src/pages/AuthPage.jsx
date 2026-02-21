import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import { appClient } from '@/api/appClient';
import triageLinkIcon from '@/assets/triagelink-icon.png';

const ROLES = ['Admin', 'Coordinator', 'Supervisor', 'QA', 'IT'];

const PASSWORD_RULES = [
  { id: 'length', label: 'At least 10 characters', test: (p) => p.length >= 10 },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'numSymbol', label: 'One number or symbol', test: (p) => /[0-9!@#$%^&*()_+\-={};':"\\|,.<>?`~]/.test(p) },
];

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // login | signup | forgot
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [roleOpen, setRoleOpen] = useState(false);

  const [form, setForm] = useState({
    organizationName: '',
    email: '',
    fullName: '',
    role: '',
    password: '',
    confirmPassword: '',
  });

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccessMsg('');
  };

  const passwordValid = PASSWORD_RULES.every((rule) => rule.test(form.password));
  const passwordsMatch = form.password === form.confirmPassword;

  const canSubmitSignup =
    form.organizationName.trim() &&
    form.email.trim() &&
    form.role &&
    passwordValid &&
    passwordsMatch;

  const canSubmitLogin = form.email.trim() && form.password.trim();

  const canSubmitReset =
    form.email.trim() &&
    form.organizationName.trim() &&
    passwordValid &&
    passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (!canSubmitSignup) return;
        const user = await appClient.auth.register({
          organizationName: form.organizationName.trim(),
          email: form.email.trim(),
          fullName: form.fullName.trim() || form.email.split('@')[0],
          role: form.role.toLowerCase(),
          password: form.password,
        });
        onAuthSuccess(user);
      } else if (mode === 'forgot') {
        if (!canSubmitReset) return;
        await appClient.auth.resetPassword({
          email: form.email.trim(),
          organizationName: form.organizationName.trim(),
          newPassword: form.password,
        });
        setSuccessMsg('Password reset successfully. You can now log in with your new password.');
        setTimeout(() => {
          setMode('login');
          setSuccessMsg('');
          setForm(prev => ({ ...prev, password: '', confirmPassword: '', organizationName: '' }));
        }, 2500);
      } else {
        if (!canSubmitLogin) return;
        const user = await appClient.auth.login({
          email: form.email.trim(),
          password: form.password,
        });
        onAuthSuccess(user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode) => {
    const target = newMode || (mode === 'login' ? 'signup' : 'login');
    setMode(target);
    setError('');
    setSuccessMsg('');
    setForm({
      organizationName: '',
      email: '',
      fullName: '',
      role: '',
      password: '',
      confirmPassword: '',
    });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#000000' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={triageLinkIcon}
            alt="TriageLink"
            className="w-36 h-36 rounded-2xl shadow-2xl mb-5"
            style={{ boxShadow: '0 0 40px rgba(96, 165, 250, 0.3)' }}
          />
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: '#60A5FA' }}
          >
            TriageLink
          </h1>
          <p className="text-sm mt-1" style={{ color: '#60A5FA', opacity: 0.7 }}>
            Smart Triage Support
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-6 border"
          style={{
            backgroundColor: '#0a0f1a',
            borderColor: '#1e3a5f',
          }}
        >
          <h2
            className="text-xl font-semibold mb-1 text-center"
            style={{ color: '#60A5FA' }}
          >
            {mode === 'signup' ? 'Create Your Account' : mode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p
            className="text-xs text-center mb-6"
            style={{ color: '#60A5FA', opacity: 0.6 }}
          >
            {mode === 'signup'
              ? 'Set up your organization to get started'
              : mode === 'forgot'
              ? 'Verify your identity to set a new password'
              : 'Log in to your account'}
          </p>

          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2"
              style={{ backgroundColor: '#1c1017', border: '1px solid #7f1d1d', color: '#fca5a5' }}
            >
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {successMsg && (
            <div
              className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2"
              style={{ backgroundColor: '#052e16', border: '1px solid #166534', color: '#4ade80' }}
            >
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Forgot password: organization name verification */}
            {mode === 'forgot' && (
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: '#60A5FA' }}
                >
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={form.organizationName}
                  onChange={(e) => updateField('organizationName', e.target.value)}
                  placeholder="Enter your organization name to verify identity"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: '#111827',
                    border: '1px solid #1e3a5f',
                    color: '#e2e8f0',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#60A5FA')}
                  onBlur={(e) => (e.target.style.borderColor = '#1e3a5f')}
                />
              </div>
            )}

            {mode === 'signup' && (
              <>
                {/* Organization Name */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: '#60A5FA' }}
                  >
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={form.organizationName}
                    onChange={(e) => updateField('organizationName', e.target.value)}
                    placeholder="Mercy General Hospital"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                    style={{
                      backgroundColor: '#111827',
                      border: '1px solid #1e3a5f',
                      color: '#e2e8f0',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#60A5FA')}
                    onBlur={(e) => (e.target.style.borderColor = '#1e3a5f')}
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: '#60A5FA' }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                    style={{
                      backgroundColor: '#111827',
                      border: '1px solid #1e3a5f',
                      color: '#e2e8f0',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#60A5FA')}
                    onBlur={(e) => (e.target.style.borderColor = '#1e3a5f')}
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#60A5FA' }}
              >
                Organization Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="you@hospital.org"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #1e3a5f',
                  color: '#e2e8f0',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#60A5FA')}
                onBlur={(e) => (e.target.style.borderColor = '#1e3a5f')}
              />
            </div>

            {/* Role Picker (signup only) */}
            {mode === 'signup' && (
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: '#60A5FA' }}
                >
                  Role *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRoleOpen(!roleOpen)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none text-left flex items-center justify-between transition-colors"
                    style={{
                      backgroundColor: '#111827',
                      border: `1px solid ${roleOpen ? '#60A5FA' : '#1e3a5f'}`,
                      color: form.role ? '#e2e8f0' : '#6b7280',
                    }}
                  >
                    {form.role || 'Select your role'}
                    <ChevronDown
                      className="w-4 h-4"
                      style={{
                        color: '#60A5FA',
                        transform: roleOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </button>
                  {roleOpen && (
                    <div
                      className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden shadow-xl"
                      style={{
                        backgroundColor: '#111827',
                        border: '1px solid #1e3a5f',
                      }}
                    >
                      {ROLES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            updateField('role', r);
                            setRoleOpen(false);
                          }}
                          className="w-full px-3 py-2.5 text-sm text-left transition-colors"
                          style={{
                            color: form.role === r ? '#60A5FA' : '#e2e8f0',
                            backgroundColor:
                              form.role === r ? '#1e293b' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (form.role !== r) e.target.style.backgroundColor = '#1e293b';
                          }}
                          onMouseLeave={(e) => {
                            if (form.role !== r) e.target.style.backgroundColor = 'transparent';
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#60A5FA' }}
              >
                {mode === 'forgot' ? 'New Password *' : 'Password *'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: '#111827',
                    border: '1px solid #1e3a5f',
                    color: '#e2e8f0',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#60A5FA')}
                  onBlur={(e) => (e.target.style.borderColor = '#1e3a5f')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#60A5FA' }}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Password strength indicators (signup and forgot) */}
              {(mode === 'signup' || mode === 'forgot') && form.password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const passes = rule.test(form.password);
                    return (
                      <div
                        key={rule.id}
                        className="flex items-center gap-1.5 text-xs"
                        style={{ color: passes ? '#4ade80' : '#6b7280' }}
                      >
                        {passes ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm Password (signup and forgot) */}
            {(mode === 'signup' || mode === 'forgot') && (
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: '#60A5FA' }}
                >
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: '#111827',
                    border: `1px solid ${
                      form.confirmPassword.length > 0 && !passwordsMatch
                        ? '#7f1d1d'
                        : '#1e3a5f'
                    }`,
                    color: '#e2e8f0',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#60A5FA')}
                  onBlur={(e) =>
                    (e.target.style.borderColor =
                      form.confirmPassword.length > 0 && !passwordsMatch
                        ? '#7f1d1d'
                        : '#1e3a5f')
                  }
                />
                {form.confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs mt-1" style={{ color: '#fca5a5' }}>
                    Passwords do not match
                  </p>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={
                isLoading ||
                (mode === 'signup' ? !canSubmitSignup : mode === 'forgot' ? !canSubmitReset : !canSubmitLogin)
              }
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-200"
              style={{
                backgroundColor:
                  isLoading ||
                  (mode === 'signup' ? !canSubmitSignup : mode === 'forgot' ? !canSubmitReset : !canSubmitLogin)
                    ? '#1e3a5f'
                    : '#60A5FA',
                color:
                  isLoading ||
                  (mode === 'signup' ? !canSubmitSignup : mode === 'forgot' ? !canSubmitReset : !canSubmitLogin)
                    ? '#6b7280'
                    : '#000000',
                cursor:
                  isLoading ||
                  (mode === 'signup' ? !canSubmitSignup : mode === 'forgot' ? !canSubmitReset : !canSubmitLogin)
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {isLoading
                ? 'Please wait...'
                : mode === 'signup'
                ? 'Create Account'
                : mode === 'forgot'
                ? 'Reset Password'
                : 'Log In'}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-5 text-center space-y-2">
            {mode === 'login' && (
              <p className="text-xs">
                <button
                  onClick={() => switchMode('forgot')}
                  className="font-semibold underline"
                  style={{ color: '#60A5FA' }}
                >
                  Forgot Password?
                </button>
              </p>
            )}
            <p className="text-xs" style={{ color: '#6b7280' }}>
              {mode === 'signup'
                ? 'Already have an account?'
                : mode === 'forgot'
                ? 'Remember your password?'
                : "Don't have an account?"}
              <button
                onClick={() => switchMode(mode === 'signup' ? 'login' : mode === 'forgot' ? 'login' : 'signup')}
                className="ml-1 font-semibold underline"
                style={{ color: '#60A5FA' }}
              >
                {mode === 'signup' ? 'Log In' : mode === 'forgot' ? 'Back to Log In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: '#6b7280' }}
        >
          Offline-first. Your data never leaves this machine.
        </p>
      </div>
    </div>
  );
}
