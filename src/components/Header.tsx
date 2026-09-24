"use client";

import Link from "next/link";
import SearchBar from "./SearchBar";

export default function Header() {
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="flex flex-col lg:flex-row items-center gap-4 p-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <Link
            href="/events"
            className="flex items-center gap-2.5 font-bold shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
            aria-label="HackB4 Home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 group-hover:shadow-blue-500/35 transition-all">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
              >
                <path
                  d="M10 14a3 3 0 0 1 3-3h22a3 3 0 0 1 3 3v4a3 3 0 0 0 0 6v4a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3v-4a3 3 0 0 0 0-6v-4z"
                  fill="#FFFFFF"
                  fillOpacity="0.2"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 19l4.5 4.5L18 28"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M25 28h5"
                  stroke="#93C5FD"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight text-gray-950 group-hover:text-blue-600 transition-colors">
              Hack<span className="text-blue-600">B4</span>
            </span>
          </Link>

          {/* Mobile Right Action */}
          <div className="lg:hidden flex items-center gap-2">
            <Link href="/admin">
              <button className="bg-gray-100 text-gray-800 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-gray-200 transition border border-gray-300">
                Admin
              </button>
            </Link>
          </div>
        </div>

        {/* Search Bar - Full width on mobile */}
        <div className="w-full lg:max-w-2xl">
          <SearchBar />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-3 ml-auto">
          <Link href="/events">
            <button className="bg-gray-100 text-gray-800 px-3.5 py-2 text-sm font-medium rounded-lg hover:bg-gray-200 transition border border-gray-300">
              Browse Events
            </button>
          </Link>

          <Link href="/dashboard">
            <button className="bg-gray-100 text-gray-800 px-3.5 py-2 text-sm font-medium rounded-lg hover:bg-gray-200 transition border border-gray-300">
              My Tickets
            </button>
          </Link>

          <Link href="/admin">
            <button className="bg-gray-100 text-gray-800 px-3.5 py-2 text-sm font-medium rounded-lg hover:bg-gray-200 transition border border-gray-300">
              Admin Portal
            </button>
          </Link>

          <Link href="/admin/checkin">
            <button className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-2 text-sm font-medium rounded-lg hover:bg-emerald-100 transition">
              Gate Scanner
            </button>
          </Link>
        </div>

        {/* Mobile Submenu Bar */}
        <div className="lg:hidden w-full flex items-center gap-2 pt-1 border-t border-gray-100">
          <Link href="/events" className="flex-1">
            <button className="w-full bg-gray-100 text-gray-800 py-2 text-xs font-medium rounded-lg border border-gray-300">
              Browse
            </button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <button className="w-full bg-gray-100 text-gray-800 py-2 text-xs font-medium rounded-lg border border-gray-300">
              My Tickets
            </button>
          </Link>
          <Link href="/admin" className="flex-1">
            <button className="w-full bg-gray-100 text-gray-800 py-2 text-xs font-medium rounded-lg border border-gray-300">
              Admin
            </button>
          </Link>
          <Link href="/admin/checkin" className="flex-1">
            <button className="w-full bg-emerald-50 text-emerald-800 border border-emerald-200 py-2 text-xs font-medium rounded-lg">
              Scanner
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
