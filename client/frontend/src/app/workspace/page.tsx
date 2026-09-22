'use client';

/**
 * Notebook Workspace — cell-based notebook editor with markdown/python/sql support.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Play, Trash2, FileText, Code, Database, Type, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import AmbientBackground from '@/components/layout/AmbientBackground';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/auth/AuthGuard';
import { authFetch } from '@/lib/auth';

interface Cell {
  id: string; type: string; source: string; output: string; status: string; duration_ms?: number;
}

interface Notebook {
  id: string; name: string; cells: Cell[]; created_by?: string; updated_at?: string;
}

interface NotebookSummary {
  id: string; name: string; cell_count: number; updated_at: string;
}

export default function WorkspacePage() {
  const [notebooks, setNotebooks] = useState<NotebookSummary[]>([]);
  const [activeNb, setActiveNb] = useState<Notebook | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => { loadNotebooks(); }, []);

  const loadNotebooks = async () => {
    try {
      const res = await authFetch('/api/workspace/notebooks');
      setNotebooks(await res.json());
    } catch {}
  };

  const createNotebook = async () => {
    const name = newName.trim() || 'Untitled Notebook';
    const res = await authFetch('/api/workspace/notebooks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const nb = await res.json();
    setNewName('');
    loadNotebooks();
    setActiveNb(nb);
  };

  const openNotebook = async (id: string) => {
    const res = await authFetch(`/api/workspace/notebooks/${id}`);
    setActiveNb(await res.json());
  };

  const addCell = async (type: string, afterId?: string) => {
    if (!activeNb) return;
    await authFetch(`/api/workspace/notebooks/${activeNb.id}/cells`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cell_type: type, after_cell_id: afterId }),
    });
    openNotebook(activeNb.id);
  };

  const updateCell = (cellId: string, source: string) => {
    if (!activeNb) return;
    const cells = activeNb.cells.map(c => c.id === cellId ? { ...c, source } : c);
    setActiveNb({ ...activeNb, cells });
  };

  const saveNotebook = async () => {
    if (!activeNb) return;
    await authFetch(`/api/workspace/notebooks/${activeNb.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cells: activeNb.cells }),
    });
  };

  const runCell = async (cellId: string) => {
    if (!activeNb) return;
    await saveNotebook();
    const res = await authFetch(`/api/workspace/notebooks/${activeNb.id}/cells/${cellId}/run`, { method: 'POST' });
    const updated = await res.json();
    const cells = activeNb.cells.map(c => c.id === cellId ? { ...c, ...updated } : c);
    setActiveNb({ ...activeNb, cells });
  };

  const deleteNotebook = async (id: string) => {
    await authFetch(`/api/workspace/notebooks/${id}`, { method: 'DELETE' });
    if (activeNb?.id === id) setActiveNb(null);
    loadNotebooks();
  };

  const cellIcon = (type: string) => {
    switch (type) {
      case 'python': return <Code size={14} />;
      case 'sql': return <Database size={14} />;
      case 'markdown': return <Type size={14} />;
      default: return <FileText size={14} />;
    }
  };

  return (
    <AuthGuard>
      <AmbientBackground />
      <div className="app-layout">
        <Sidebar />
        <main className="chat-main">
          <div className="dashboard-page">
            <Link href="/chat" className="back-link"><ArrowLeft size={16} /> Back to Chat</Link>
            <h1 className="dashboard-title">Workspace</h1>
            <p className="dashboard-subtitle">Interactive notebooks with Python, SQL, and Markdown cells</p>

            {!activeNb ? (
              /* Notebook List */
              <>
                <div className="nb-create-row">
                  <input placeholder="New notebook name..." value={newName} onChange={e => setNewName(e.target.value)} className="sql-save-input" style={{ flex: 1 }} />
                  <button className="sql-run-btn" onClick={createNotebook}><Plus size={14} /> Create</button>
                </div>
                <div className="nb-list">
                  {notebooks.map(nb => (
                    <div key={nb.id} className="nb-list-item" onClick={() => openNotebook(nb.id)}>
                      <FileText size={18} />
                      <div className="nb-list-info">
                        <div className="nb-list-name">{nb.name}</div>
                        <div className="nb-list-meta">{nb.cell_count} cells · {nb.updated_at ? new Date(nb.updated_at).toLocaleDateString() : ''}</div>
                      </div>
                      <button className="icon-btn icon-btn-sm" onClick={(e) => { e.stopPropagation(); deleteNotebook(nb.id); }} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {notebooks.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', padding: 16 }}>No notebooks yet. Create one to get started!</p>}
                </div>
              </>
            ) : (
              /* Notebook Editor */
              <>
                <div className="nb-editor-header">
                  <button className="governance-add-btn" onClick={() => { saveNotebook(); setActiveNb(null); loadNotebooks(); }}>
                    <ArrowLeft size={14} /> Back to List
                  </button>
                  <h2 className="nb-editor-title">{activeNb.name}</h2>
                  <div className="nb-add-cell-row">
                    <button className="governance-add-btn" onClick={() => addCell('python')}><Code size={14} /> Python</button>
                    <button className="governance-add-btn" onClick={() => addCell('sql')}><Database size={14} /> SQL</button>
                    <button className="governance-add-btn" onClick={() => addCell('markdown')}><Type size={14} /> Markdown</button>
                  </div>
                </div>

                <div className="nb-cells">
                  {activeNb.cells.map((cell, idx) => (
                    <div key={cell.id} className={`nb-cell nb-cell-${cell.type} ${cell.status === 'error' ? 'nb-cell-error' : ''}`}>
                      <div className="nb-cell-header">
                        <span className="nb-cell-badge">{cellIcon(cell.type)} {cell.type} [{idx + 1}]</span>
                        <div className="nb-cell-actions">
                          {cell.type !== 'markdown' && (
                            <button className="icon-btn icon-btn-sm" onClick={() => runCell(cell.id)} title="Run Cell"><Play size={14} /></button>
                          )}
                          {cell.duration_ms != null && <span className="nb-cell-duration">{cell.duration_ms}ms</span>}
                        </div>
                      </div>
                      <textarea
                        className="nb-cell-input"
                        value={cell.source}
                        onChange={e => updateCell(cell.id, e.target.value)}
                        placeholder={`Write ${cell.type} here...`}
                        rows={Math.max(3, cell.source.split('\n').length)}
                        spellCheck={false}
                      />
                      {cell.output && (
                        <div className={`nb-cell-output ${cell.status === 'error' ? 'nb-output-error' : ''}`}>
                          <pre>{cell.output}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
