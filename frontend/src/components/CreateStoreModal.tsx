
import { useState } from 'react';
import { createStore } from '../api';
// import { X } from 'lucide-react';

interface CreateStoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateStoreModal({ isOpen, onClose, onSuccess }: CreateStoreModalProps) {
    const [name, setName] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await createStore({ name, subdomain });
            onSuccess();
            onClose();
            setName('');
            setSubdomain('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create store');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    {/* <X className="w-6 h-6" /> */}
                    X
                </button>
                <h2 className="text-xl font-bold mb-4">Create New Store</h2>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Store Name</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Subdomain</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                                type="text"
                                required
                                pattern="[a-z0-9-]+"
                                className="block w-full min-w-0 flex-1 rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                value={subdomain}
                                onChange={(e) => setSubdomain(e.target.value)}
                                placeholder="my-store"
                            />
                            <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                                .localhost
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Lowercase letters, numbers, and dashes only.</p>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Store'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
