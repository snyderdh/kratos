import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

const orange = '#FF6B2B';

const FITNESS_GOALS = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'power', label: 'Power' },
  { value: 'mobility', label: 'Mobility' },
];

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [gym, setGym] = useState('');
  const [fitnessGoals, setFitnessGoals] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Pre-fill from profile when it loads
  useEffect(() => {
    if (!profile) return;
    const nameParts = (profile.name || '').split(' ');
    setFirstName(nameParts[0] || '');
    setLastName(nameParts.slice(1).join(' ') || '');
    setUsername(profile.username || '');
    setBio(profile.bio || '');
    setGym(profile.gym || '');
    setFitnessGoals(Array.isArray(profile.fitness_goals) ? profile.fitness_goals : []);
    setAvatarUrl(profile.avatar_url || '');
  }, [profile]);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setUploadingAvatar(true);
    setError('');

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      setError('Avatar upload failed: ' + uploadErr.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(urlData.publicUrl);
    setUploadingAvatar(false);
  }

  function toggleGoal(goal) {
    setFitnessGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    const { error: saveErr } = await supabase.from('profiles').update({
      name: fullName || null,
      username: username || null,
      bio: bio || null,
      gym: gym || null,
      fitness_goals: fitnessGoals,
      avatar_url: avatarUrl || null,
    }).eq('id', user.id);

    setSaving(false);

    if (saveErr) {
      setError('Failed to save: ' + saveErr.message);
      return;
    }

    await refreshProfile();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  const displayName = profile?.name || user?.email?.split('@')[0] || '';
  const initials = displayName
    ? displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111827', marginBottom: '0.25rem' }}>
        Profile
      </h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Manage your personal information and fitness goals.
      </p>

      {saveSuccess && (
        <div style={{
          backgroundColor: '#f0fdf4', border: '1.5px solid #86efac',
          borderRadius: '8px', padding: '0.75rem 1rem',
          color: '#16a34a', fontSize: '0.875rem', fontWeight: 600,
          marginBottom: '1.5rem',
        }}>
          Profile saved successfully!
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5',
          borderRadius: '8px', padding: '0.75rem 1rem',
          color: '#dc2626', fontSize: '0.875rem', fontWeight: 600,
          marginBottom: '1.5rem',
        }}>
          {error}
        </div>
      )}

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
        <div
          onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
          style={{ position: 'relative', cursor: uploadingAvatar ? 'default' : 'pointer', flexShrink: 0 }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e5e7eb' }}
            />
          ) : (
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${orange}, #ff9258)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 800, color: '#fff',
              border: '3px solid #e5e7eb',
            }}>
              {initials}
            </div>
          )}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: uploadingAvatar ? 1 : 0,
            transition: 'opacity 0.15s',
          }}
            onMouseEnter={(e) => { if (!uploadingAvatar) e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { if (!uploadingAvatar) e.currentTarget.style.opacity = '0'; }}
          >
            <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>
              {uploadingAvatar ? 'Uploading…' : 'Change'}
            </span>
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>
            {displayName || 'Your Name'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
            {user?.email}
          </div>
          <button
            onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            style={{
              fontSize: '0.78rem', fontWeight: 600, color: orange,
              background: 'none', border: `1.5px solid ${orange}`,
              borderRadius: '6px', padding: '0.3rem 0.75rem',
              cursor: uploadingAvatar ? 'default' : 'pointer',
              opacity: uploadingAvatar ? 0.5 : 1,
            }}
          >
            {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />
      </div>

      {/* Form card */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Name row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = orange)}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>
          <div>
            <label style={labelStyle}>Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = orange)}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label style={labelStyle}>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = orange)}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label style={labelStyle}>Email</label>
          <input
            value={user?.email || ''}
            readOnly
            style={{ ...inputStyle, backgroundColor: '#f9fafb', color: '#9ca3af', cursor: 'not-allowed' }}
          />
        </div>

        {/* Bio */}
        <div>
          <label style={labelStyle}>
            Bio
            <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: '0.5rem' }}>
              {bio.length}/160
            </span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            placeholder="Tell the community a bit about yourself…"
            rows={3}
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: '80px',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
            onFocus={(e) => (e.target.style.borderColor = orange)}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
          />
        </div>

        {/* Gym */}
        <div>
          <label style={labelStyle}>Gym</label>
          <input
            value={gym}
            onChange={(e) => setGym(e.target.value)}
            placeholder="e.g. Lifetime Fitness, Gold's Gym…"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = orange)}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
          />
        </div>

        {/* Fitness Goals */}
        <div>
          <label style={labelStyle}>Fitness Goals</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.375rem' }}>
            {FITNESS_GOALS.map(({ value, label }) => {
              const active = fitnessGoals.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleGoal(value)}
                  style={{
                    padding: '0.35rem 0.875rem',
                    borderRadius: '20px',
                    border: `1.5px solid ${active ? orange : '#e5e7eb'}`,
                    backgroundColor: active ? '#fff7ed' : '#fff',
                    color: active ? orange : '#6b7280',
                    fontSize: '0.8rem',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.13s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.65rem 1.5rem',
            backgroundColor: saving ? '#fdba74' : orange,
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: saving ? 'default' : 'pointer',
            alignSelf: 'flex-start',
            transition: 'background-color 0.15s',
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#374151',
  marginBottom: '0.375rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  border: '1.5px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#111827',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
  backgroundColor: '#fff',
};
