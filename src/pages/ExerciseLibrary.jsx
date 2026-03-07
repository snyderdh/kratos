import { useState } from 'react';
import { exercises, muscleGroups, equipmentOptions, difficultyLevels } from '../data/exercises';

const orange = '#FF6B2B';

const difficultyBadge = {
  beginner: { bg: '#dcfce7', text: '#16a34a' },
  intermediate: { bg: '#fef9c3', text: '#ca8a04' },
  advanced: { bg: '#fee2e2', text: '#dc2626' },
};

const muscleColors = {
  chest: '#c0392b',
  back: '#1a7a4a',
  legs: '#1565c0',
  shoulders: '#7b1fa2',
  arms: '#e67e22',
  core: '#00838f',
};

export default function ExerciseLibrary() {
  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('all');
  const [filterEquip, setFilterEquip] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');

  const filtered = exercises.filter((ex) => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = filterMuscle === 'all' || ex.muscleGroup === filterMuscle;
    const matchEquip = filterEquip === 'all' || ex.equipment === filterEquip;
    const matchDiff = filterDiff === 'all' || ex.difficulty === filterDiff;
    return matchSearch && matchMuscle && matchEquip && matchDiff;
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', marginBottom: '0.25rem' }}>
          Exercise Library
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
          {exercises.length} exercises — search and filter by muscle, equipment, or difficulty.
        </p>
      </div>

      {/* Search & Filters */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      }}>
        <input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#111827',
            fontSize: '0.95rem',
            outline: 'none',
            marginBottom: '1rem',
          }}
        />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filterMuscle}
            onChange={(e) => setFilterMuscle(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Muscles</option>
            {muscleGroups.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={filterEquip}
            onChange={(e) => setFilterEquip(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Equipment</option>
            {equipmentOptions.map((e) => (
              <option key={e} value={e}>
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={filterDiff}
            onChange={(e) => setFilterDiff(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Levels</option>
            {difficultyLevels.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>

          <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: '0.8rem' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Exercise Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#6b7280' }}>No exercises found.</p>
          <p style={{ fontSize: '0.875rem' }}>Try adjusting your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {filtered.map((ex) => {
            const diff = difficultyBadge[ex.difficulty];
            const mColor = muscleColors[ex.muscleGroup] || '#9ca3af';
            return (
              <div
                key={ex.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderTop: `3px solid ${mColor}`,
                  borderRadius: '10px',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  cursor: 'default',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
                }}
              >
                <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', lineHeight: 1.3 }}>
                  {ex.name}
                </h3>

                <p style={{ color: '#6b7280', fontSize: '0.8rem', lineHeight: 1.4 }}>{ex.description}</p>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                    backgroundColor: `${mColor}18`, color: mColor, border: `1px solid ${mColor}44`,
                  }}>
                    {ex.muscleGroup}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                    backgroundColor: '#f3f4f6', color: '#6b7280',
                  }}>
                    {ex.equipment}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                    backgroundColor: diff.bg, color: diff.text,
                  }}>
                    {ex.difficulty}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
