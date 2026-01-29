import React, { useState } from 'react';
import { LadderGrid } from './components/LadderGrid';
import { POSDataGrid } from './components/POSDataGrid';
import { Download, Save, RefreshCw, Menu, X } from 'lucide-react';

export default function App() {
  const [filters, setFilters] = useState({
    retailer: 'Target',
    category: 'Furniture',
    item: 'All Items',
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'ladder' | 'pos'>('ladder');

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Hamburger Navigation Panel */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div 
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Nav Header */}
          <div className="bg-[#0e698c] px-4 py-4 flex items-center justify-between">
            <h2 className="text-white font-semibold text-lg">Filters & Settings</h2>
            <button 
              onClick={() => setMenuOpen(false)}
              className="text-white hover:bg-white/10 p-1 rounded"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Nav Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Retailer</label>
                <select 
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                  value={filters.retailer}
                  onChange={(e) => setFilters({ ...filters, retailer: e.target.value })}
                >
                  <option>Target</option>
                  <option>Walmart</option>
                  <option>Amazon</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select 
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <option>Furniture</option>
                  <option>Bedding</option>
                  <option>Decor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Item</label>
                <select 
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                  value={filters.item}
                  onChange={(e) => setFilters({ ...filters, item: e.target.value })}
                >
                  <option>All Items</option>
                  <option>Item 001</option>
                  <option>Item 002</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fiscal Year</label>
                <div className="text-sm text-gray-600">FY 2026</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-[#0e698c] px-4 py-3 flex items-center justify-between shadow-md" style={{ height: '64px' }}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMenuOpen(true)}
            className="text-white hover:bg-white/10 p-2 rounded"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="border-b-2 border-white pb-1">
            <h1 className="text-white font-semibold text-lg tracking-wide">DOREL JUVENILE</h1>
            <p className="text-white/90 text-xs -mt-0.5">Care for Precious Life</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="px-3 py-1.5 text-sm text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded flex items-center gap-1.5">
            <Save className="w-4 h-4" />
            Save
          </button>
          <button className="px-3 py-1.5 text-sm text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </header>

      {/* Filter Selection Bar */}
      <div className="bg-[#0c6380] px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-white/70 font-medium">Retailer:</span>
            <span className="text-white font-semibold">{filters.retailer}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/70 font-medium">Category:</span>
            <span className="text-white font-semibold">{filters.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/70 font-medium">Item:</span>
            <span className="text-white font-semibold">{filters.item}</span>
          </div>
          <div className="ml-6">
            <button 
              onClick={() => setCurrentScreen(currentScreen === 'ladder' ? 'pos' : 'ladder')}
              className="px-3 py-1.5 text-xs text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded font-semibold"
            >
              {currentScreen === 'ladder' ? 'POS Data' : 'Ladder Plans'}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-header with page info */}
      <div className="bg-[#0b5a78] px-4 py-2 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2 text-white">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
          </svg>
          <span className="text-sm font-medium">
            {currentScreen === 'ladder' ? 'Ladder Planning' : 'POS Data'}
          </span>
        </div>
        <div className="text-xs text-white/80">
          Forecast & Planning
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        {currentScreen === 'ladder' ? <LadderGrid /> : <POSDataGrid />}
      </div>
    </div>
  );
}