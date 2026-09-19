// MoodKiosk.jsx
// Description: Public, unauthenticated door-screen page. A student
// scans their QR card, then taps how they feel. No login — this runs
// on a shared device mounted at the classroom door.
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const MOODS = [
  { key: 'happy', label: 'Happy', emoji: '😊', color: '#FFD166' },
  { key: 'excited', label: 'Excited', emoji: '🤩', color: '#FF8B5E' },
  { key: 'calm', label: 'Calm', emoji: '😌', color: '#6FCF97' },
  { key: 'tired', label: 'Tired', emoji: '😴', color: '#9B8CF2' },
  { key: 'sad', label: 'Sad', emoji: '😢', color: '#5AA9E6' },
];

const QR_READER_ID = 'mood-kiosk-qr-reader';

function MoodKiosk() {
  // stage: 'scan' | 'mood' | 'confirm' | 'error'
  const [stage, setStage] = useState('scan');
  const [qrToken, setQrToken] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const scannerRef = useRef(null);

  // Start/stop the camera scanner only while on the 'scan' stage.
  useEffect(() => {
    if (stage !== 'scan') return;

    const scanner = new Html5Qrcode(QR_READER_ID);
    scannerRef.current = scanner;
    let cancelled = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          if (cancelled) return;
          cancelled = true;
          setQrToken(decodedText.trim());
          setStage('mood');
        },
        () => {
          // per-frame scan failures are expected constantly — ignore
        }
      )
      .catch(() => {
        setErrorMsg('Could not access the camera. Please ask a teacher for help.');
        setStage('error');
      });

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
    };
  }, [stage]);

  const submitMood = async (moodKey) => {
    if (!qrToken || submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${BASE_URL}/mood-entries/kiosk`, {
        qr_token: qrToken,
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

  // Auto-reset back to the scan screen after confirming or erroring.
  useEffect(() => {
    if (stage !== 'confirm' && stage !== 'error') return;
    const t = setTimeout(() => {
      setQrToken(null);
      setFirstName('');
      setErrorMsg('');
      setStage('scan');
    }, 3500);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F3F9FD] p-6 text-center select-none">
      {stage === 'scan' && (
        <>
          <h1 className="text-3xl font-bold mb-2 text-[#1F2937]">
            Scan your card 🪪
          </h1>
          <p className="text-gray-500 mb-6">Hold your QR card up to the camera</p>
          <div
            id={QR_READER_ID}
            className="rounded-2xl overflow-hidden shadow-lg"
            style={{ width: 320, height: 320 }}
          />
        </>
      )}

      {stage === 'mood' && (
        <>
          <h1 className="text-3xl font-bold mb-8 text-[#1F2937]">
            How are you feeling today?
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
          <h1 className="text-3xl font-bold text-[#1F2937]">
            Thanks{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="text-gray-500 mt-2">Have a great day 🌟</p>
        </div>
      )}

      {stage === 'error' && (
        <div>
          <span className="text-7xl block mb-4">😕</span>
          <h1 className="text-2xl font-semibold text-[#1F2937]">{errorMsg}</h1>
        </div>
      )}
    </div>
  );
}

export default MoodKiosk;
