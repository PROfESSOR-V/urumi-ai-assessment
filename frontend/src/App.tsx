
import { useState } from 'react';
import { StoreList } from './components/StoreList';
import { CreateStoreModal } from './components/CreateStoreModal';
// import { Plus, Layout } from 'lucide-react';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* <Layout className="w-8 h-8 text-blue-600" /> */}
            <span className="text-blue-600 font-bold text-xl">[ICON]</span>
            <h1 className="text-2xl font-bold text-gray-900">Urumi Store Provisioner</h1>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            {/* <Plus className="w-5 h-5" /> */}
            <span>+</span>
            New Store
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StoreList key={refreshTrigger} />
      </main>

      <CreateStoreModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />
    </div>
  );
}

export default App;
