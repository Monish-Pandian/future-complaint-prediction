import React, { useState } from 'react';

/**
 * Modal to provision a new Municipal Officer account & profile
 */
export function CreateOfficerModal({ isOpen, onClose, onSubmit, departments = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    employeeCode: '',
    department: 'Streets & Sanitation',
    phone: '',
    skills: '',
    longitude: -87.6298,
    latitude: 41.8781,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.employeeCode.trim()) {
      setFormError('Name, email, and employee code are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const skillsArray = formData.skills
        ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      await onSubmit({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password || 'OfficerPass@123',
        employeeCode: formData.employeeCode.trim().toUpperCase(),
        department: formData.department,
        phone: formData.phone.trim() || '+1-312-555-0100',
        skills: skillsArray,
        location: {
          type: 'Point',
          coordinates: [Number(formData.longitude) || -87.6298, Number(formData.latitude) || 41.8781],
        },
      });
      onClose();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create officer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="officer-modal-backdrop" onClick={onClose}>
      <div className="officer-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="officer-modal-header">
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Provision New Officer Account
          </div>
          <button type="button" className="verif-drawer-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="officer-modal-body">
            {formError && (
              <div style={{ padding: '10px 14px', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', color: '#ff6b6b', borderRadius: '4px', fontSize: '12px' }}>
                {formError}
              </div>
            )}

            <div className="officer-form-group">
              <label className="officer-form-label">Full Name</label>
              <input
                type="text"
                name="name"
                className="officer-form-input"
                placeholder="Officer Marcus Vance"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="officer-form-group">
                <label className="officer-form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="officer-form-input"
                  placeholder="marcus.vance@civic.gov"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="officer-form-group">
                <label className="officer-form-label">Initial Password</label>
                <input
                  type="password"
                  name="password"
                  className="officer-form-input"
                  placeholder="OfficerPass@123"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="officer-form-group">
                <label className="officer-form-label">Employee Code</label>
                <input
                  type="text"
                  name="employeeCode"
                  className="officer-form-input"
                  placeholder="EMP-301"
                  value={formData.employeeCode}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="officer-form-group">
                <label className="officer-form-label">Department</label>
                <select
                  name="department"
                  className="officer-form-input"
                  value={formData.department}
                  onChange={handleChange}
                >
                  {departments.filter((d) => !d.startsWith('All')).map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="officer-form-group">
              <label className="officer-form-label">Phone Number</label>
              <input
                type="text"
                name="phone"
                className="officer-form-input"
                placeholder="+1-312-555-0101"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="officer-form-group">
              <label className="officer-form-label">Skills (Comma Separated)</label>
              <input
                type="text"
                name="skills"
                className="officer-form-input"
                placeholder="Pothole Repair, Asphalt Assessment, Debris Clearance"
                value={formData.skills}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="officer-modal-footer">
            <button type="button" className="verification-btn verification-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="verification-btn verification-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Provisioning...' : 'Provision Officer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal to edit an existing Officer's details & availability status
 */
export function EditOfficerModal({ isOpen, officer, onClose, onSubmit, departments = [] }) {
  const [formData, setFormData] = useState({
    name: officer?.name || '',
    department: officer?.department || 'Streets & Sanitation',
    phone: officer?.phone || '',
    availability: officer?.availability || 'AVAILABLE',
    active: officer?.active !== false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  if (!isOpen || !officer) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to update officer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="officer-modal-backdrop" onClick={onClose}>
      <div className="officer-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="officer-modal-header">
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Edit Officer Profile: {officer.officerId}
          </div>
          <button type="button" className="verif-drawer-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="officer-modal-body">
            {formError && (
              <div style={{ padding: '10px 14px', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', color: '#ff6b6b', borderRadius: '4px', fontSize: '12px' }}>
                {formError}
              </div>
            )}

            <div className="officer-form-group">
              <label className="officer-form-label">Officer Name</label>
              <input
                type="text"
                name="name"
                className="officer-form-input"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="officer-form-group">
                <label className="officer-form-label">Department</label>
                <select
                  name="department"
                  className="officer-form-input"
                  value={formData.department}
                  onChange={handleChange}
                >
                  {departments.filter((d) => !d.startsWith('All')).map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="officer-form-group">
                <label className="officer-form-label">Availability Status</label>
                <select
                  name="availability"
                  className="officer-form-input"
                  value={formData.availability}
                  onChange={handleChange}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="BUSY">BUSY</option>
                  <option value="ON_LEAVE">ON LEAVE</option>
                  <option value="OFF_DUTY">OFF DUTY</option>
                </select>
              </div>
            </div>

            <div className="officer-form-group">
              <label className="officer-form-label">Phone</label>
              <input
                type="text"
                name="phone"
                className="officer-form-input"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '6px' }}>
              <input
                type="checkbox"
                id="officer-active-toggle"
                name="active"
                checked={formData.active}
                onChange={handleChange}
              />
              <label htmlFor="officer-active-toggle" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Active in municipal dispatch registry
              </label>
            </div>
          </div>

          <div className="officer-modal-footer">
            <button type="button" className="verification-btn verification-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="verification-btn verification-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default {
  CreateOfficerModal,
  EditOfficerModal,
};
