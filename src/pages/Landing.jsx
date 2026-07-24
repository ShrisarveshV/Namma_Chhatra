import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, Activity, Users, Bell } from 'lucide-react';
import logo from '../assets/logo-removebg-preview.png';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 flex flex-col">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Namma Chhatra Logo" className="h-10 w-auto object-contain" />
            <span className="font-bold text-lg tracking-tight">Namma Chhatra</span>
          </Link>
        </div>
        <div className="flex gap-4">
          <Link to="/login" className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition pt-2">
            Login
          </Link>
          <Link to="/signup" className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition">
            Sign Up
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-8">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-800 leading-tight">
            Smart Attendance & Dropout Early Warning System
          </h1>
          <p className="text-lg text-slate-800">
            Powered by advanced Machine Learning to identify at-risk students before they drop out. Built for Government Schools.
          </p>
        </div>
        <div className="flex gap-4">
          <Link to="/signup" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="flex items-center gap-2 bg-white text-slate-800 border border-slate-200 px-6 py-3 rounded-xl font-semibold hover:bg-white transition">
            Login
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mt-12">
          <div className="bg-white p-6 border border-slate-200 rounded-xl space-y-3 shadow-sm">
            <Activity className="w-8 h-8 text-blue-600" />
            <h3 className="font-bold text-lg">AI Risk Prediction</h3>
            <p className="text-sm text-slate-800">Real-time analysis of student metrics to flag dropout risks early.</p>
          </div>
          <div className="bg-white p-6 border border-slate-200 rounded-xl space-y-3 shadow-sm">
            <Users className="w-8 h-8 text-blue-600" />
            <h3 className="font-bold text-lg">Automated Attendance</h3>
            <p className="text-sm text-slate-800">Seamlessly integrate with RFID to mark attendance instantly.</p>
          </div>
          <div className="bg-white p-6 border border-slate-200 rounded-xl space-y-3 shadow-sm">
            <Bell className="w-8 h-8 text-blue-600" />
            <h3 className="font-bold text-lg">Multi-Tier Alerts</h3>
            <p className="text-sm text-slate-800">Notify teachers, headmasters, and counselors automatically.</p>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-slate-800">
        &copy; 2026 Namma Chhatra • Learning Never Exhausts The Mind
      </footer>
    </div>
  );
}
