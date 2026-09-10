import { ConnectWallet } from "./components/ConnectWallet";

function App() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-ice-100 px-6 py-4 dark:border-ice-900">
        <h1 className="text-lg font-semibold">Iceburg</h1>
        <ConnectWallet />
      </header>

      <main className="flex flex-col items-center gap-6 px-6 py-16">
        <p className="text-sm text-gray-500">No offering deployed yet.</p>
      </main>
    </div>
  );
}

export default App;
