// MoodKiosk.jsx
// Description: Public, unauthenticated door-screen page. A teacher
// picks the group once; students then tap their own name and mood.
// No login, no QR card — runs on a shared iPad in the classroom.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const MOODS = [
  { key: 'happy', label: 'Happy', emoji: '😊', color: '#FFD166' },
  { key: 'excited', label: 'Excited', emoji: '🤩', color: '#FF8B5E' },
  { key: 'calm', label: 'Calm', emoji: '😌', color: '#6FCF97' },
  { key: 'tired', label: 'Tired', emoji: '😴', color: '#9B8CF2' },
  { key: 'sad', label: 'Sad', emoji: '😢', color: '#5AA9E6' },
];

function MoodKiosk() {
  // stage: 'group' | 'names' | 'mood' | 'confirm' | 'error'
  const [stage, setStage] = useState('group');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios
      .get(`${BASE_URL}/groups`)
      .then((res) => setGroups(res.data))
      .catch(() => setGroups([]));
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;
    axios
      .get(`${BASE_URL}/mood-entries/roster-public`, {
        params: { group_id: selectedGroup.id },
      })
      .then((res) => setStudents(res.data))
      .catch(() => setStudents([]));
  }, [selectedGroup]);

  const submitMood = async (moodKey) => {
    if (!selectedStudent || submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${BASE_URL}/mood-entries/kiosk`, {
        student_id: selectedStudent.id,
        mood: moodKey,
      });
      setFirstName(res.data.firstName || '');
      setStage('confirm');
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error || 'Something went wrong. Please try again.'
      );
      setStage('error');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (stage !== 'confirm' && stage !== 'error') return;
    const t = setTimeout(() => {
      setSelectedStudent(null);
      setFirstName('');
      setErrorMsg('');
      setStage('names');
    }, 3000);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F7F3EA] p-6 text-center select-none relative">
      {stage === 'group' && (
        <>
          <h1 className="text-3xl font-bold mb-8 text-[#3D3A35]">
            Which group is this? 🏫
          </h1>
          <div className="grid grid-cols-2 gap-6 max-w-xl">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setSelectedGroup(g);
                  setStage('names');
                }}
                className="rounded-3xl shadow-md p-8 bg-[#FFFDF8] text-xl font-semibold text-[#3D3A35] active:scale-95 transition-transform"
              >
                {g.name}
              </button>
            ))}
          </div>
          <Link
            to="/teacher/dashboard"
            className="mt-8 text-sm text-gray-400 underline block"
          >
            ← Back to Dashboard
          </Link>
        </>
      )}

      {stage === 'names' && (
        <>
          <h1 className="text-3xl font-bold mb-2 text-[#3D3A35]">
            Find your name 👋
          </h1>
          <p className="text-gray-500 mb-6">{selectedGroup?.name}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-w-3xl">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedStudent(s);
                  setStage('mood');
                }}
                className="rounded-2xl shadow-md p-5 bg-[#FFFDF8] text-lg font-medium text-[#3D3A35] active:scale-95 transition-transform min-h-[80px]"
              >
                {s.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setSelectedGroup(null);
              setStage('group');
            }}
            className="mt-8 text-sm text-gray-400 underline block mx-auto"
          >
            Change group
          </button>
          <Link
            to="/teacher/dashboard"
            className="mt-3 text-sm text-gray-400 underline block"
          >
            ← Back to Dashboard
          </Link>
        </>
      )}

      {stage === 'mood' && (
        <>
          <h1 className="text-3xl font-bold mb-8 text-[#3D3A35]">
            Hi {selectedStudent?.name.split(' ')[0]}! How do you feel today?
          </h1>
          <div className="grid grid-cols-3 gap-6 max-w-2xl">
            {MOODS.map((m) => (
              <button
                key={m.key}
                disabled={submitting}
                onClick={() => submitMood(m.key)}
                className="flex flex-col items-center justify-center rounded-3xl shadow-md p-6 text-white transition-transform active:scale-95 disabled:opacity-60"
                style={{ backgroundColor: m.color, minWidth: 140, minHeight: 140 }}
              >
                <span className="text-6xl mb-2">{m.emoji}</span>
                <span className="text-xl font-semibold">{m.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {stage === 'confirm' && (
        <div className="animate-pulse">
          <span className="text-7xl block mb-4">✅</span>
          <h1 className="text-3xl font-bold text-[#3D3A35]">
            Thanks{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="text-gray-500 mt-2">Have a great day 🌟</p>
        </div>
      )}

      {stage === 'error' && (
        <div>
          <span className="text-7xl block mb-4">😕</span>
          <h1 className="text-2xl font-semibold text-[#3D3A35]">{errorMsg}</h1>
        </div>
      )}
    </div>
  );
}

export default MoodKiosk;
