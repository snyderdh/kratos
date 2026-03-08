import { useState } from 'react';
import { exercises, muscleGroups, equipmentOptions, difficultyLevels } from '../data/exercises';
import { C, FONTS, card, inputBase } from '../theme';
import ExerciseInfoModal from '../components/ExerciseInfoModal';

const difficultyBadge = {
  beginner:     { bg: '#EDF2EE', text: '#4A7C59' },
  intermediate: { bg: '#F2EFE8', text: '#7A6040' },
  advanced:     { bg: '#F2ECEC', text: '#8B4040' },
};

const muscleColors = {
  chest:     '#C4705A',
  back:      '#5A8F6F',
  legs:      '#5A7AA5',
  shoulders: '#8F6FA5',
  arms:      '#C49A5A',
  core:      '#5A9FAF',
};

export default function ExerciseLibrary() {
  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('all');
  const [filterEquip, setFilterEquip] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');
  const [selectedEx, setSelectedEx] = useState(null);

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
        <h1 style={{ fontSize: '2rem', fontWeight: 500, color: C.text, marginBottom: '0.25rem', fontFamily: FONTS.heading }}>
          Exercise Library
        </h1>
        <p style={{ color: C.textSecondary, fontSize: '0.95rem', fontWeight: 300 }}>
          {exercises.length} exercises — search and filter by muscle, equipment, or difficulty.
        </p>
      </div>

      {/* Search & Filters */}
      <div style={{ ...card, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputBase, marginBottom: '1rem' }}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
          onBlur={(e) => (e.target.style.borderColor = C.border)}
        />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filterMuscle}
            onChange={(e) => setFilterMuscle(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: '6px',
              color: C.text,
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: FONTS.body,
              fontWeight: 300,
              outline: 'none',
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
              backgroundColor: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: '6px',
              color: C.text,
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: FONTS.body,
              fontWeight: 300,
              outline: 'none',
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
              backgroundColor: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: '6px',
              color: C.text,
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: FONTS.body,
              fontWeight: 300,
              outline: 'none',
            }}
          >
            <option value="all">All Levels</option>
            {difficultyLevels.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>

          <span style={{ marginLeft: 'auto', color: C.textSecondary, fontSize: '0.8rem', fontWeight: 300 }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Exercise Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.textSecondary }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: C.text, fontFamily: FONTS.heading, fontWeight: 500 }}>No exercises found.</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 300 }}>Try adjusting your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {filtered.map((ex) => {
            const diff = difficultyBadge[ex.difficulty] || difficultyBadge.beginner;
            const mColor = muscleColors[ex.muscleGroup] || C.textSecondary;
            return (
              <div
                key={ex.id}
                onClick={() => setSelectedEx(ex.name)}
                style={{
                  ...card,
                  borderLeft: `3px solid ${mColor}`,
                  borderRadius: '10px',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <h3 style={{ fontWeight: 400, color: C.text, fontSize: '0.95rem', lineHeight: 1.3, fontFamily: FONTS.heading }}>
                  {ex.name}
                </h3>

                <p style={{ color: C.textSecondary, fontSize: '0.8rem', lineHeight: 1.4, fontWeight: 300 }}>{ex.description}</p>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 400,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    backgroundColor: `${mColor}18`, color: mColor, border: `1px solid ${mColor}44`,
                  }}>
                    {ex.muscleGroup}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 400,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    backgroundColor: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}`,
                  }}>
                    {ex.equipment}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 400,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    backgroundColor: diff.bg, color: diff.text, border: `1px solid ${diff.bg}`,
                  }}>
                    {ex.difficulty}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedEx && (
        <ExerciseInfoModal
          exerciseName={selectedEx}
          onClose={() => setSelectedEx(null)}
        />
      )}
    </div>
  );
}
