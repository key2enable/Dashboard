import { NavLink } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useState } from 'react';
import {
  ChevronRight, ScanLine, ChevronLeft, BarChart2,
  CalendarDays, BookOpen, ClipboardList, LineChart,
  Users, Layers, Mic2
} from 'lucide-react';

import logoFull from '../assets/k2e-logo2.png';
import logoCompact from '../assets/k2e-logo3.png';
import { ADMIN_EMAILS } from '../adminList';

const Sidebar = () => {
  const { user, isLoaded } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [isListening, setIsListening] = useState(false);

  if (!isLoaded) return null;

  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = ADMIN_EMAILS.includes(email);

  const navItems = [
    { to: "/teacher/dashboard", icon: <BarChart2 size={18} />, label: "Dashboard" },
    { to: "/teacher/attendance", icon: <CalendarDays size={18} />, label: "Attendance" },
    { to: "/teacher/lesson-plans", icon: <BookOpen size={18} />, label: "Lesson Plans" },
    { to: "/teacher/assessments", icon: <ClipboardList size={18} />, label: "Assessments" },
    { to: "/teacher/reports", icon: <LineChart size={18} />, label: "Reports" },
    { to: "/teacher/students", icon: <Users size={18} />, label: "Student Groups" },
    ...(isAdmin ? [{ to: "/teacher/teachers", icon: <Users size={18} />, label: "Teachers" }] : []),
    { to: "/teacher/auto-grade", icon: <ScanLine size={18} />, label: "Auto Grader" },
    { to: "/teacher/quizzes", icon: <Layers size={18} />, label: "Quizzes" },
  ];

  const handleVoiceCommand = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice commands not supported in your browser.');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    setIsListening(true);

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      if (!event.isFinal) return;
      
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      
      const navMap = {
        'dashboard': '/teacher/dashboard',
        'attendance': '/teacher/attendance',
        'reports': '/teacher/reports',
        'groups': '/teacher/students',
        'student groups': '/teacher/students',
        'assessments': '/teacher/assessments',
        'quizzes': '/teacher/quizzes',
        'lesson plans': '/teacher/lesson-plans',
        'auto grader': '/teacher/auto-grade',
      };

      for (const [key, path] of Object.entries(navMap)) {
        if (transcript.includes(key) || transcript.includes(`go to ${key}`) || transcript.includes(`open ${key}`)) {
          window.location.href = path;
          return;
        }
      }
    };

    recognition.start();
  };

  return (
    <div className={`min-h-screen ${collapsed ? 'w-20' : 'w-64'} bg-sidebar text-white flex flex-col py-6 shadow-lg z-50 pl-2 pr-1 transition-all duration-300 overflow-y-auto`}>
      {/* Logo */}
      <div className="flex justify-between items-center px-4">
        <img
          src={collapsed ? logoCompact : logoFull}
          alt="Key2Enable"
          className={`object-contain transition-all duration-300 ${
            collapsed ? 'w-10 mx-auto mb-4' : 'w-[120px] mx-auto mb-8'
          }`}
        />
        <button onClick={() => setCollapsed(!collapsed)} className="text-white mb-2">
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Clerk User Info */}
      <div className={`flex flex-col items-center ${collapsed ? 'mb-4' : 'mb-6'} transition-all`}>
        <UserButton afterSignOutUrl="/dashboard" />
        {!collapsed && user && (
          <>
            <p className="mt-2 font-semibold text-sm text-center">{user.fullName}</p>
            <p className="text-xs text-center">{email}</p>
          </>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex flex-col gap-4 w-full px-2 flex-1">
        {navItems.map(({ to, icon, label }) => {
          if (label === "Quizzes") {
            return (
              <div key="expressia-and-quizzes" className="flex flex-col">
                {/* Expressia link */}
                  <a
                  href="https://web.expressia.life/login/default"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${
                    collapsed ? 'justify-center' : 'justify-start gap-3 px-4'
                  } flex items-center py-2 rounded text-sm font-medium hover:bg-white/10 transition-colors duration-200`}
                >
                  <img
                    src="https://expressia.life/favicon.ico"
                    alt="Expressia"
                    className="w-5 h-5 rounded bg-white p-0.5"
                  />
                  {!collapsed && 'Expressia'}
                </a>

                {/* Spacer between Expressia and Quizzes */}
                <div className="mt-4" />

                {/* Quizzes NavLink */}
                <NavLink
                  to="/teacher/quizzes"
                  className={({ isActive }) =>
                    `flex items-center gap-3 py-2 px-4 rounded text-sm font-medium transition-colors duration-200 ${
                      isActive ? 'bg-primary' : 'hover:bg-white/10'
                    }`
                  }
                >
                  <Layers size={18} />
                  {!collapsed && 'Quizzes'}
                </NavLink>

                {/* Bottom spacer to prevent overflow cutoff */}
                <div className="h-6" />
              </div>
            );
          }

          // All other nav links
          return (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2 px-4 rounded text-sm font-medium transition-colors duration-200 ${
                  isActive ? 'bg-primary' : 'hover:bg-white/10'
                }`
              }
            >
              {icon}
              {!collapsed && label}
            </NavLink>
          );
        })}
      </nav>

      {/* Voice Command Button */}
      <button
        onClick={handleVoiceCommand}
        disabled={isListening}
        className={`mx-2 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
          isListening
            ? 'bg-white/20 text-white animate-pulse'
            : 'bg-white/10 text-white/75 hover:bg-white/15 hover:text-white'
        }`}
      >
        <Mic2 size={16} />
        {!collapsed && (isListening ? 'Listening...' : 'Voice')}
      </button>
    </div>
  );
};

export default Sidebar;
