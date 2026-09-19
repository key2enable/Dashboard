// File: frontend/src/pages/Attendance.jsx
// Description: Attendance management page for teachers
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import AttendanceTable from "../components/AttendanceTable";
import { Button } from "@/components/ui/button";
import LoadingScreen from "../components/LoadingScreen";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Attendance() {
  const [entries, setEntries] = useState([]);
  const [students, setStudents] = useState([]);
  const [month, setMonth] = useState(localStorage.getItem('attendanceMonth') || "April 2025");
  const [groupId, setGroupId] = useState(localStorage.getItem('attendanceGroupId') || "");
  const [groupOptions, setGroupOptions] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useUser();


  // useEffect(() => {
  //   if (!user?.id) return;
  //   axios
  //     .get(`${BASE_URL}/groups/for-teacher`, {
  //       params: { clerk_user_id: user.id },
  //     })
  //     .then((res) => {
  //       setGroupOptions(res.data);
  //       if (res.data.length > 0) {
  //           const storedGroupId = localStorage.getItem('attendanceGroupId');
  //           const validGroup = res.data.find(g => g.id === storedGroupId);
  //           setGroupId(validGroup ? validGroup.id : res.data[0].id);
  //         }      
  //       })
  //     .catch((err) => console.error("Error fetching teacher's groups", err));
  // }, [user]);

  useEffect(() => {
  if (!user?.id) return;

  setGroupsLoading(true);
  axios
    .get(`${BASE_URL}/groups/for-teacher`, {
      params: { clerk_user_id: user.id },
    })
    .then((res) => {
      setGroupOptions(res.data);
      const stored = localStorage.getItem('attendanceGroupId');
      const validGroup = res.data.find((g) => g.id === stored);
      setGroupId(validGroup ? validGroup.id : res.data[0]?.id || '');
    })
    .catch((err) => {
      console.error("Error fetching teacher's groups", err);
    })
    .finally(() => {
      setGroupsLoading(false);
    });
}, [user]);

  useEffect(() => {
    if (!groupId) return;
    const params = { month, group_id: groupId };

    Promise.all([
      axios.get(`${BASE_URL}/students`, { params }),
      axios.get(`${BASE_URL}/attendance`, { params }),
    ])
      .then(([studentsRes, attendanceRes]) => {
        setStudents(studentsRes.data);
        setEntries(attendanceRes.data);
      })
      .catch((err) => console.error("Error fetching data", err));
  }, [month, groupId]);

  const updateAttendance = async (entryId, newStatus) => {
    setIsUpdating(true);
    try {
      await axios.put(`${BASE_URL}/attendance/${entryId}`, {
        status: newStatus,
      });
      setEntries((prev) =>
        prev.map((ent) =>
          ent.id === entryId ? { ...ent, status: newStatus } : ent
        )
      );
    } catch (err) {
      console.error("Update failed", err);
      alert("Failed to update status");
      const res = await axios.get(`${BASE_URL}/attendance`, {
        params: { month, group_id: groupId },
      });
      setEntries(res.data);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Attendance</h1>

          <div className="flex gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="flex items-center gap-2 bg-white hover:bg-gray-100 focus:outline-none"
                  variant="outline"
                >
                  Month: {month}
                  <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {["April 2025", "May 2025", "June 2025", "July 2025", "August 2025", "September 2025","October 2025", "November 2025", "December 2025"].map((m) => (
                  <DropdownMenuItem
                    key={m}
                    onClick={() => {
                      setMonth(m);
                      localStorage.setItem('attendanceMonth', m);
                    }}
                  >
                    {m}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="flex items-center gap-2 bg-white hover:bg-gray-100 focus:outline-none"
                  variant="outline"
                >
                  {groupOptions.find((g) => g.id === groupId)?.name || "Select Group"}
                  <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {groupOptions.map((g) => (
                  <DropdownMenuItem
                    key={g.id}
                    onClick={() => {
                      setGroupId(g.id);
                      localStorage.setItem('attendanceGroupId', g.id);
                    }}
                  >
                    {g.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {groupsLoading ? (
  <div className="flex justify-center items-center h-screen"><LoadingScreen /></div>
) : groupOptions.length === 0 ? (
  <p className="text-red-500 mb-4">
    No groups assigned to you. Please contact admin.
  </p>
) : null}


        <AttendanceTable
          entries={entries}
          setEntries={setEntries}
          month={month}
          students={students}
          updateAttendance={updateAttendance}
          isUpdating={isUpdating}
        />
      </div>
    </div>
  );
}

export default Attendance;
