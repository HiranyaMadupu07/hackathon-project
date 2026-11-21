import { ToastContainer } from './components/common/ToastContainer';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { WorkflowProvider } from './context/WorkflowContext';
import { AppRouter } from './routes/AppRouter';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <WorkflowProvider>
            <AppRouter />
            <ToastContainer />
          </WorkflowProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
