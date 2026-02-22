import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../../api/axios';

const FIELD_TYPES = ['text', 'email', 'number', 'select', 'radio', 'checkbox', 'textarea'];

const CreateEvent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit'); // non-null when editing a draft

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [form, setForm] = useState({
    name: '', description: '', type: 'normal', eligibility: 'ALL',
    registrationDeadline: '', startDate: '', endDate: '',
    registrationLimit: '', registrationFee: '', tags: '',
    purchaseLimit: 1
  });
  const [formSchema, setFormSchema] = useState([]);
  const [newField, setNewField] = useState({ fieldType: 'text', label: '', required: false, options: '' });
  const [merchandiseVariants, setMerchandiseVariants] = useState([]);
  const [newVariant, setNewVariant] = useState({ product: '', size: '', color: '', price: 0, stock: 0 });

  // Prefill from existing draft
  useEffect(() => {
    if (!editId) return;
    API.get(`/events/${editId}`)
      .then(res => {
        const e = res.data;
        setForm({
          name: e.name || '',
          description: e.description || '',
          type: e.type || 'normal',
          eligibility: e.eligibility || 'ALL',
          registrationDeadline: e.registrationDeadline ? new Date(e.registrationDeadline).toISOString().slice(0, 16) : '',
          startDate: e.startDate ? new Date(e.startDate).toISOString().slice(0, 16) : '',
          endDate: e.endDate ? new Date(e.endDate).toISOString().slice(0, 16) : '',
          registrationLimit: e.registrationLimit ?? '',
          registrationFee: e.registrationFee ?? '',
          tags: (e.tags || []).join(', '),
          purchaseLimit: e.purchaseLimit || 1,
        });
        setFormSchema(e.formSchema || []);
        setMerchandiseVariants(e.merchandiseVariants || []);
      })
      .catch(() => setError('Failed to load event for editing'))
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'type') {
      setFormSchema([]);
      setMerchandiseVariants([]);
    }
  };

  const addField = () => {
    if (!newField.label) return;
    setFormSchema(prev => [...prev, {
      ...newField,
      options: newField.options.split(',').map(s => s.trim()).filter(Boolean)
    }]);
    setNewField({ fieldType: 'text', label: '', required: false, options: '' });
  };

  const removeField = idx => setFormSchema(prev => prev.filter((_, i) => i !== idx));

  const addVariant = () => {
    setMerchandiseVariants(prev => [...prev, { ...newVariant }]);
    setNewVariant({ product: '', size: '', color: '', price: 0, stock: 0 });
  };

  const removeVariant = idx => setMerchandiseVariants(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (publish = false) => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        registrationLimit: form.type === 'merchandise' ? 0 : (parseInt(form.registrationLimit) || 0),
        registrationFee:   form.type === 'merchandise' ? 0 : (parseFloat(form.registrationFee) || 0),
        formSchema: form.type === 'normal' ? formSchema : [],
        merchandiseVariants: form.type === 'merchandise' ? merchandiseVariants : [],
        purchaseLimit: parseInt(form.purchaseLimit) || 1
      };

      let eventId;
      if (editId) {
        // Updating an existing draft
        await API.put(`/events/${editId}`, payload);
        eventId = editId;
      } else {
        const res = await API.post('/events', payload);
        eventId = res.data.event._id;
      }

      if (publish) {
        await API.put(`/events/${eventId}/publish`);
      }
      navigate(`/organizer/events/${eventId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 800 }}>
        <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate(-1)}>← Back</button>
        <div className="page-header">
          <h1 className="page-title">{editId ? '✏️ Edit Draft Event' : 'Create New Event'}</h1>
        </div>

        {loadingEdit && <div className="loading-page"><div className="spinner" /></div>}

        {/* Steps indicator */}
        {!loadingEdit && (
        <div className="flex gap-2 mb-6">
          {[1,2,3].map(s => (
            <div key={s} style={{
              padding: '6px 16px', cursor: 'pointer',
              background: step === s ? 'var(--accent-red)' : 'var(--bg-elevated)',
              border: '1px solid ' + (step === s ? 'var(--accent-red)' : 'var(--border-color)'),
              color: step === s ? '#fff' : 'var(--text-muted)',
              fontSize: 13, fontWeight: 600
            }} onClick={() => setStep(s)}>
              {s}. {s===1 ? 'Basic Info' : s===2 ? 'Form / Variants' : 'Review'}
            </div>
          ))}
        </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {step === 1 && (
          <div className="card">
            <div className="form-group">
              <label className="form-label">Event Name *</label>
              <input type="text" name="name" className="form-input" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea name="description" className="form-textarea" value={form.description} onChange={handleChange} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Event Type *</label>
                <select name="type" className="form-select" value={form.type} onChange={handleChange}>
                  <option value="normal">Normal Event</option>
                  <option value="merchandise">Merchandise Event</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Eligibility</label>
                <select name="eligibility" className="form-select" value={form.eligibility} onChange={handleChange}>
                  <option value="ALL">All</option>
                  <option value="IIIT">IIIT Only</option>
                  <option value="EXTERNAL">External Only</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="datetime-local" name="startDate" className="form-input" value={form.startDate} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="datetime-local" name="endDate" className="form-input" value={form.endDate} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Registration Deadline</label>
              <input type="datetime-local" name="registrationDeadline" className="form-input" value={form.registrationDeadline} onChange={handleChange} />
            </div>
            {form.type !== 'merchandise' && (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Registration Limit (0 = unlimited)</label>
                  <input type="number" name="registrationLimit" className="form-input" value={form.registrationLimit} onChange={handleChange} min={0} />
                </div>
                <div className="form-group">
                  <label className="form-label">Registration Fee (₹)</label>
                  <input type="number" name="registrationFee" className="form-input" value={form.registrationFee} onChange={handleChange} min={0} />
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input type="text" name="tags" className="form-input" placeholder="tech, workshop, cultural" value={form.tags} onChange={handleChange} />
            </div>
            {form.type === 'merchandise' && (
              <div className="form-group">
                <label className="form-label">Purchase Limit per Participant</label>
                <input type="number" name="purchaseLimit" className="form-input" value={form.purchaseLimit} onChange={handleChange} min={1} />
              </div>
            )}
            <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!form.name}>Next →</button>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            {form.type === 'normal' && (
              <>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Dynamic Registration Form Builder</h3>
                {formSchema.length > 0 && (
                  <div className="mb-4">
                    {formSchema.map((f, i) => (
                      <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{f.label}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>{f.fieldType}</span>
                          {f.required && <span style={{ color: 'var(--accent-red)', fontSize: 11, marginLeft: 4 }}>*required</span>}
                        </div>
                        <button className="btn btn-danger btn-sm" onClick={() => removeField(i)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', padding: 16, marginBottom: 16 }}>
                  <h4 style={{ marginBottom: 12, fontSize: 13, fontWeight: 700 }}>Add Field</h4>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Field Type</label>
                      <select className="form-select" value={newField.fieldType} onChange={e => setNewField(p => ({ ...p, fieldType: e.target.value }))}>
                        {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Label</label>
                      <input type="text" className="form-input" value={newField.label} onChange={e => setNewField(p => ({ ...p, label: e.target.value }))} />
                    </div>
                  </div>
                  {['select','radio','checkbox'].includes(newField.fieldType) && (
                    <div className="form-group">
                      <label className="form-label">Options (comma-separated)</label>
                      <input type="text" className="form-input" value={newField.options} onChange={e => setNewField(p => ({ ...p, options: e.target.value }))} placeholder="Option 1, Option 2" />
                    </div>
                  )}
                  <div className="flex gap-3 items-center">
                    <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={newField.required} onChange={e => setNewField(p => ({ ...p, required: e.target.checked }))} />
                      Required
                    </label>
                    <button className="btn btn-secondary btn-sm" onClick={addField} disabled={!newField.label}>+ Add Field</button>
                  </div>
                </div>
              </>
            )}

            {form.type === 'merchandise' && (
              <>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Merchandise Variants</h3>
                {merchandiseVariants.map((v, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>
                      <strong>{v.product || 'Item'}</strong>
                      {(v.size || v.color) && <span style={{ color: 'var(--text-muted)' }}> — {[v.size, v.color].filter(Boolean).join(' / ')}</span>}
                      <span style={{ color: 'var(--accent-red)', marginLeft: 8 }}>₹{v.price || 0}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>Stock: {v.stock}</span>
                    </span>
                    <button className="btn btn-danger btn-sm" onClick={() => removeVariant(i)}>Remove</button>
                  </div>
                ))}
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', padding: 16, marginBottom: 16 }}>
                  <h4 style={{ marginBottom: 12, fontSize: 13, fontWeight: 700 }}>Add Variant</h4>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Product *</label>
                      <input type="text" className="form-input" value={newVariant.product} onChange={e => setNewVariant(p => ({ ...p, product: e.target.value }))} placeholder="T-Shirt, Keychain, Mug..." />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Price (₹) *</label>
                      <input type="number" className="form-input" value={newVariant.price} onChange={e => setNewVariant(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} min={0} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Size</label>
                      <input type="text" className="form-input" value={newVariant.size} onChange={e => setNewVariant(p => ({ ...p, size: e.target.value }))} placeholder="S, M, L, XL" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Color</label>
                      <input type="text" className="form-input" value={newVariant.color} onChange={e => setNewVariant(p => ({ ...p, color: e.target.value }))} placeholder="Black, Red..." />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock Quantity</label>
                    <input type="number" className="form-input" value={newVariant.stock} onChange={e => setNewVariant(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))} min={0} />
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={addVariant} disabled={!newVariant.product}>+ Add Variant</button>
                </div>
              </>
            )}
            <div className="flex gap-3">
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Review Event</h3>
            <div className="grid-2 mb-4">
              <InfoRow label="Name" value={form.name} />
              <InfoRow label="Type" value={form.type} />
              <InfoRow label="Eligibility" value={form.eligibility} />
              {form.type !== 'merchandise' && <InfoRow label="Fee" value={`₹${form.registrationFee || 0}`} />}
              {form.type !== 'merchandise' && <InfoRow label="Registration Limit" value={form.registrationLimit || 'Unlimited'} />}
              <InfoRow label="Start Date" value={form.startDate || 'TBD'} />
            </div>
            {form.type === 'normal' && <div className="mb-4"><span className="text-muted text-sm">Form fields: {formSchema.length}</span></div>}
            {form.type === 'merchandise' && <div className="mb-4"><span className="text-muted text-sm">Variants: {merchandiseVariants.length}</span></div>}
            <div className="flex gap-3">
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-ghost btn-lg" onClick={() => handleSubmit(false)} disabled={loading}>
                {editId ? 'Save Draft' : 'Save as Draft'}
              </button>
              <button className="btn btn-primary btn-lg" onClick={() => handleSubmit(true)} disabled={loading}>
                {loading ? 'Saving...' : '🚀 Publish Event'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
  </div>
);

export default CreateEvent;
