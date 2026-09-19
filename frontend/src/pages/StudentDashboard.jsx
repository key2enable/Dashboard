// StudentDashboard.jsx
// Description: Student dashboard page showing summary and mood chart

import { useAuth, useUser } from '@clerk/clerk-react';
import { useEffect, useState, useMemo } from 'react';
import EvelynCard from '../components/EvelynCard';
import StudentSidebar from '../components/StudentSidebar';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";

const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#a855f7', '#ef4444'];
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function StudentDashboard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [summary, setSummary] = useState(null);
  const [moodSummary, setMoodSummary] = useState({});
  const [moodType, setMoodType] = useState('month');
  // const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedMonth, setSelectedMonth] = useState(`June ${new Date().getFullYear()}`);


  function getCurrentMonth() {
    const now = new Date();
    return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
  }

  useEffect(() => {
    const fetchSummary = async () => {
      if (!isLoaded || !user) return;
      try {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/students/summary/${user.id}?month=${selectedMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        console.error('Failed to load summary', err);
      }
    };
    fetchSummary();
  }, [user, isLoaded, selectedMonth, getToken]);

  useEffect(() => {
    if (!summary?.group_id) return;
    const fetchMood = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/stats/mood-summary?type=${moodType}&month=${selectedMonth}&group_id=${summary.group_id}`
        );
        setMoodSummary(res.data);
      } catch (err) {
        console.error('Failed to load mood summary', err);
      }
    };
    fetchMood();
  }, [moodType, selectedMonth, summary?.group_id]);

  const moodTranslation = {
    happy: 'Happy',
    excited: 'Excited',
    calm: 'Calm',
    tired: 'Tired',
    sad: 'Sad',
  };

  const moodPieData = useMemo(() =>
    Object.entries(moodSummary).map(([label, count]) => ({
      name: moodTranslation[label] || label,
      value: count
    })), [moodSummary]);

  return (
    <div className="flex">
      <StudentSidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Hello {summary?.name || 'Student'}!</h1>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {[
                
                'June', 'July', 'August', 'September'
              ].map((month) => (
                <SelectItem
                  key={month}
                  value={`${month} ${new Date().getFullYear()}`}
                >
                  {month} {new Date().getFullYear()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-row gap-8 flex-wrap">
          {summary && (
            <div className="flex-1 max-w-md">
              <EvelynCard
                name={summary.name}
                id={summary.id}
                mood={summary.mood}
                attendance={summary.attendancePercent}
                assessment={summary.assessmentPercent}
                avatar={user?.imageUrl}
              />
            </div>
          )}

          <div className="flex-1 max-w-md bg-white p-6 rounded shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Mood Summary of The Class</h2>
              <Select value={moodType} onValueChange={setMoodType}>
                <SelectTrigger className="w-32 text-sm border-gray-300">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {moodPieData.length === 0 ? (
              <p className="text-gray-400 text-sm">No mood data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={moodPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={80}
                    label
                  >
                    {moodPieData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;





// import { useUser } from '@clerk/clerk-react';
// import { useEffect, useState, useMemo } from 'react';
// import EvelynCard from '../components/EvelynCard';
// import StudentSidebar from '../components/StudentSidebar';
// import axios from 'axios';
// import {
//   PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
// } from 'recharts';
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#a855f7', '#ef4444'];
// const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// function StudentDashboard() {
//   const { user, isLoaded } = useUser();
//   const [summary, setSummary] = useState(null);
//   const [moodSummary, setMoodSummary] = useState({});
//   const [moodType, setMoodType] = useState('month');

//   const getCurrentMonth = () => {
//     const now = new Date();
//     return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
//   };

//   useEffect(() => {
//     const fetchSummary = async () => {
//       if (!isLoaded || !user) return;
//       try {
//         const res = await fetch(`${BASE_URL}/students/summary/${user.id}?month=${getCurrentMonth()}`);
//         const data = await res.json();
//         setSummary(data);
//       } catch (err) {
//         console.error('Failed to load summary', err);
//       }
//     };
//     fetchSummary();
//   }, [user, isLoaded]);

//   useEffect(() => {
//     const fetchMood = async () => {
//       try {
//         const res = await axios.get(`${BASE_URL}/stats/mood-summary?type=${moodType}&month=${getCurrentMonth()}`);
//         setMoodSummary(res.data);
//       } catch (err) {
//         console.error('Failed to load mood summary', err);
//       }
//     };
//     fetchMood();
//   }, [moodType]);

//   const moodTranslation = {
//     Excellent: 'Excellent',
//     Good: 'Happy',
//     Average: 'Tired',
//     Poor: 'Sad',
//   };

//   const moodPieData = useMemo(() =>
//     Object.entries(moodSummary).map(([label, count]) => ({
//       name: moodTranslation[label] || label,
//       value: count
//     })), [moodSummary]);

//   return (
//     <div className="flex">
//       <StudentSidebar />
//       <div className="flex-1 p-8">
//         <h1 className="text-2xl font-bold mb-6">Hello {summary?.name || 'Student'}!</h1>

//         <div className="flex flex-row gap-8 flex-wrap">
//           {/* Evelyn Card */}
//           {summary && (
//             <div className="flex-1 max-w-md">
//               <EvelynCard
//                 name={summary.name}
//                 id={summary.id}
//                 mood={summary.mood}
//                 attendance={summary.attendancePercent}
//                 assessment={summary.assessmentPercent}
//                 avatar={user?.imageUrl}
//               />
//             </div>
//           )}

//           {/* Mood Chart */}
//           <div className="flex-1 max-w-md bg-white p-6 rounded shadow-md">
//             <div className="flex items-center justify-between mb-4">
//               <h2 className="text-lg font-semibold">Mood Summary of The Class</h2>
//               <Select value={moodType} onValueChange={setMoodType}>
//                 <SelectTrigger className="w-32 text-sm border-gray-300 focus:ring-1 focus:ring-blue-500">
//                   <SelectValue placeholder="Select" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="today">Today</SelectItem>
//                   <SelectItem value="week">This Week</SelectItem>
//                   <SelectItem value="month">This Month</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             {moodPieData.length === 0 ? (
//               <p className="text-gray-400 text-sm">No mood data available</p>
//             ) : (
//               <ResponsiveContainer width="100%" height={260}>
//                 <PieChart>
//                   <Pie
//                     data={moodPieData}
//                     dataKey="value"
//                     nameKey="name"
//                     innerRadius={60}
//                     outerRadius={80}
//                     label
//                     isAnimationActive
//                     animationDuration={800}
//                     animationEasing="ease-out"
//                   >
//                     {moodPieData.map((entry, i) => (
//                       <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
//                     ))}
//                   </Pie>
//                   <Tooltip />
//                   <Legend />
//                 </PieChart>
//               </ResponsiveContainer>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default StudentDashboard;
