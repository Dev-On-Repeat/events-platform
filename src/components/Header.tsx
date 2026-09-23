"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/images/lg.png";
import SearchBar from "./SearchBar";

export default function Header() {
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="flex flex-col lg:flex-row items-center gap-4 p-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <Link href="/events" className="font-bold shrink-0">
            <Image
              src={logo}
              alt="HackB4"
              width={100}
              height={100}
              className="w-24 lg:w-28 h-auto"
              priority
            />
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
