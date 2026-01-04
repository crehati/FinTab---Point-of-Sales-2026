
import React, { useState } from 'react';
import ModalShell from './ModalShell';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: string[];
    onAddCategory: (category: string) => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, categories, onAddCategory }) => {
    const [newCategory, setNewCategory] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategory.trim()) {
            onAddCategory(newCategory.trim());
            setNewCategory('');
        }
    };

    const footer = (
        <button onClick={onClose} className="btn-base btn-primary w-full py-4 text-sm uppercase tracking-widest font-black">
            Finalize Configuration
        </button>
    );

    return (
        <ModalShell 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Protocol Categories" 
            description="Inventory classification logic"
            maxWidth="max-w-md"
            footer={footer}
        >
            <div className="space-y-8">
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 px-1">Registered Classes</h3>
                    <div className="max-h-48 overflow-y-auto bg-slate-50 dark:bg-gray-900 p-4 rounded-[1.5rem] border border-slate-100 dark:border-gray-800 custom-scrollbar">
                        {categories.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <span key={cat} className="px-4 py-2 bg-white dark:bg-gray-800 text-[11px] font-bold uppercase tracking-tight text-slate-700 dark:text-slate-300 rounded-xl border border-slate-50 shadow-sm">{cat}</span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center py-6 italic">No categories enrolled</p>
                        )}
                    </div>
                </div>

                <form onSubmit={handleAdd} className="pt-6 border-t dark:border-gray-800">
                    <label htmlFor="new-category" className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2 block">Enroll New Identity</label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            id="new-category"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            className="flex-grow bg-slate-50 dark:bg-gray-900 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            placeholder="e.g. Premium Reserve"
                        />
                        <button type="submit" className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </ModalShell>
    );
};

export default CategoryModal;
