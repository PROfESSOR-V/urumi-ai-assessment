import { useEffect, useState } from 'react';
import type { Store } from '../types';
import { getStores, deleteStore } from '../api';
// import { ExternalLink, Trash2, RefreshCw } from 'lucide-react';

export function StoreList() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStores = async () => {
        try {
            setLoading(true);
            const data = await getStores();
            setStores(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStores();
        const interval = setInterval(() => {
            getStores().then(setStores).catch(console.error);
        }, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this store?')) return;
        try {
            await deleteStore(id);
            await fetchStores();
        } catch (error) {
            alert('Failed to delete store');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Your Stores</h2>
                <button onClick={fetchStores} className="p-2 hover:bg-gray-100 rounded-full">
                    {/* <RefreshCw className="w-5 h-5" /> */}
                    Refresh
                </button>
            </div>

            {loading && stores.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Loading...</div>
            ) : stores.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500">No stores yet. Create one!</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {stores.map(store => (
                        <div key={store.id} className="border p-4 rounded-lg shadow-sm flex justify-between items-center bg-white">
                            <div>
                                <h3 className="font-semibold text-lg">{store.name}</h3>
                                <p className="text-sm text-gray-500">{store.subdomain}.store.local</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium 
                                        ${store.status === 'Ready' ? 'bg-green-100 text-green-800' :
                                            store.status === 'Failed' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'}`}>
                                        {store.status}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(store.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {store.status === 'Ready' && (
                                    <>
                                        <div className="flex flex-col text-xs text-gray-500 mr-2">
                                            <span>User: user</span>
                                            <span>Pass: {store.adminPassword}</span>
                                        </div>
                                        <a
                                            href={`http://${store.subdomain}.localhost:8081`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                                        >
                                            Visit
                                        </a>
                                        <a
                                            href={`http://${store.subdomain}.localhost:8081/wp-admin`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-sm"
                                        >
                                            Admin
                                        </a>
                                    </>
                                )}
                                <button
                                    onClick={() => handleDelete(store.id)}
                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
