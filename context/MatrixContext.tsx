import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ColumnConfig, MatrixRow } from '../types';

interface MatrixContextType {
  columns: ColumnConfig[];
  setColumns: React.Dispatch<React.SetStateAction<ColumnConfig[]>>;
  rows: MatrixRow[];
  setRows: React.Dispatch<React.SetStateAction<MatrixRow[]>>;
  addRow: (row: MatrixRow) => void;
  updateRow: (id: string, data: Partial<MatrixRow>) => void;
  deleteRow: (id: string) => void;
  saveMatrix: () => void;
}

const MatrixContext = createContext<MatrixContextType | undefined>(undefined);

export const MatrixProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default columns for the matrix generator
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'c1', name: 'Country of Origin', type: 'input', nature: 'country_zone', options: [] },
    { id: 'c2', name: 'Destination', type: 'input', nature: 'country_zone', options: [] },
    { id: 'c3', name: 'Product Type', type: 'input', nature: 'text', options: ['Digital Service', 'Goods', 'Consulting'] },
    { id: 'c4', name: 'VAT Treatment', type: 'output', nature: 'text', options: [] },
    { id: 'c5', name: 'Comment', type: 'output', nature: 'text', options: [] }
  ]);
  
  const [rows, setRows] = useState<MatrixRow[]>([]);

  const addRow = (row: MatrixRow) => {
    setRows(prev => [...prev, row]);
  };

  const updateRow = (id: string, data: Partial<MatrixRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  const deleteRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const saveMatrix = () => {
    // Placeholder for API call or local storage persistence
    console.log('Saving Matrix Configuration:', { columns, rows });
    localStorage.setItem('cyplom_matrix_state', JSON.stringify({ columns, rows }));
  };

  // Load state from local storage on mount (optional persistence)
  useEffect(() => {
    const saved = localStorage.getItem('cyplom_matrix_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.columns) setColumns(parsed.columns);
        if (parsed.rows) setRows(parsed.rows);
      } catch (e) {
        console.error("Failed to load matrix state", e);
      }
    }
  }, []);

  return (
    <MatrixContext.Provider value={{ 
      columns, 
      setColumns, 
      rows, 
      setRows, 
      addRow, 
      updateRow, 
      deleteRow,
      saveMatrix 
    }}>
      {children}
    </MatrixContext.Provider>
  );
};

export const useMatrix = () => {
  const context = useContext(MatrixContext);
  if (context === undefined) {
    throw new Error('useMatrix must be used within a MatrixProvider');
  }
  return context;
};