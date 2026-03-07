import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { C, FONTS, card, btnPrimary, btnSecondary, inputBase, labelBase, tagBase } from '../theme';

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
      <h1 style={{ fontSize: '1.75rem', fontWeight: 500, color: C.text, marginBottom: '0.25rem', fontFamily: FONTS.heading }}>
        Profile
      </h1>
      <p style={{ color: C.textSecondary, fontSize: '0.875rem', marginBottom: '2rem', fontWeight: 300 }}>
        Manage your personal information and fitness goals.
      </p>

      {saveSuccess && (
        <div style={{
          backgroundColor: C.accentMuted, border: `1px solid ${C.accent}50`,
          borderRadius: '8px', padding: '0.75rem 1rem',
          color: C.accent, fontSize: '0.875rem', fontWeight: 400,
          marginBottom: '1.5rem',
        }}>
          Profile saved successfully!
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: C.accentMuted, border: `1px solid ${C.accent}50`,
          borderRadius: '8px', padding: '0.75rem 1rem',
          color: C.accent, fontSize: '0.875rem', fontWeight: 400,
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
              style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.border}` }}
            />
          ) : (
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              backgroundColor: C.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 400, color: '#fff',
              border: `2px solid ${C.border}`,
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
            <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 400 }}>
              {uploadingAvatar ? 'Uploading…' : 'Change'}
            </span>
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 400, color: C.text, marginBottom: '0.25rem' }}>
            {displayName || 'Your Name'}
          </div>
          <div style={{ fontSize: '0.8rem', color: C.textSecondary, marginBottom: '0.5rem', fontWeight: 300 }}>
            {user?.email}
          </div>
          <button
            onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            style={{
              ...btnSecondary,
              padding: '0.3rem 0.75rem',
              fontSize: '0.78rem',
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
      <div style={{ ...card, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Name row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelBase}>First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              style={inputBase}
              onFocus={(e) => (e.target.style.borderColor = C.accent)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
          </div>
          <div>
            <label style={labelBase}>Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              style={inputBase}
              onFocus={(e) => (e.target.style.borderColor = C.accent)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label style={labelBase}>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            style={inputBase}
            onFocus={(e) => (e.target.style.borderColor = C.accent)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label style={labelBase}>Email</label>
          <input
            value={user?.email || ''}
            readOnly
            style={{ ...inputBase, color: C.textSecondary, cursor: 'not-allowed' }}
          />
        </div>

        {/* Bio */}
        <div>
          <label style={labelBase}>
            Bio
            <span style={{ color: C.textSecondary, fontWeight: 300, marginLeft: '0.5rem' }}>
              {bio.length}/160
            </span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            placeholder="Tell the community a bit about yourself…"
            rows={3}
            style={{
              ...inputBase,
              resize: 'vertical',
              minHeight: '80px',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
            onFocus={(e) => (e.target.style.borderColor = C.accent)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
        </div>

        {/* Gym */}
        <div>
          <label style={labelBase}>Gym</label>
          <input
            value={gym}
            onChange={(e) => setGym(e.target.value)}
            placeholder="e.g. Lifetime Fitness, Gold's Gym…"
            style={inputBase}
            onFocus={(e) => (e.target.style.borderColor = C.accent)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
        </div>

        {/* Fitness Goals */}
        <div>
          <label style={labelBase}>Fitness Goals</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.375rem' }}>
            {FITNESS_GOALS.map(({ value, label }) => {
              const active = fitnessGoals.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleGoal(value)}
                  style={{
                    ...tagBase,
                    padding: '0.35rem 0.875rem',
                    borderRadius: '20px',
                    border: `1px solid ${active ? C.accent : C.border}`,
                    backgroundColor: active ? C.accentMuted : 'transparent',
                    color: active ? C.accent : C.textSecondary,
                    fontWeight: active ? 400 : 300,
                    cursor: 'pointer',
                    transition: 'all 0.13s',
                    fontSize: '0.8rem',
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
            ...btnPrimary,
            padding: '0.65rem 1.5rem',
            backgroundColor: saving ? '#d4896a' : C.accent,
            cursor: saving ? 'default' : 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
