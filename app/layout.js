import './globals.css';
import Navbar from '../components/Navbar.js';
import AuthGuard from '../components/AuthGuard.js';

export const metadata = {
  title: 'Goodness Lodge — Energy Monitoring & Prediction System',
  description: 'A web-based energy consumption monitoring and prediction system for Goodness Lodge, Ikot Ekpene.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      <body className="min-h-full flex flex-col font-sans">
        <AuthGuard>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
            Goodness Lodge, Ikot Ekpene · Energy Monitoring and Prediction System · All figures are estimates derived from registered appliances and caretaker entries
          </footer>
        </AuthGuard>
      </body>
    </html>
  );
}
