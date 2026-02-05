import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Home, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const routes = ['/', '/transactions', '/reminders', '/settings'];

interface NavigationButtonsProps {
  className?: string;
}

export function NavigationButtons({ className = '' }: NavigationButtonsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  
  const currentIndex = routes.indexOf(location.pathname);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < routes.length - 1 && currentIndex >= 0;

  const goBack = () => {
    if (canGoBack) {
      navigate(routes[currentIndex - 1]);
    } else {
      navigate(-1);
    }
  };

  const goForward = () => {
    if (canGoForward) {
      navigate(routes[currentIndex + 1]);
    }
  };

  const goHome = () => {
    navigate('/');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/landing');
  };

  return (
    <div className={`flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border rounded-full px-2 py-1 shadow-sm ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={goBack}
        className="h-7 w-7 rounded-full hover:bg-primary/10"
        title="Indietro"
      >
        <ChevronLeft className="h-4 w-4 text-primary" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={goHome}
        className="h-7 w-7 rounded-full hover:bg-primary/10"
        title="Home"
      >
        <Home className="h-3.5 w-3.5 text-primary" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={goForward}
        disabled={!canGoForward}
        className="h-7 w-7 rounded-full hover:bg-primary/10 disabled:opacity-50"
        title="Avanti"
      >
        <ChevronRight className="h-4 w-4 text-primary" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="h-7 w-7 rounded-full hover:bg-primary/10"
        title="Logout"
      >
        <LogOut className="h-3.5 w-3.5 text-primary" />
      </Button>
    </div>
  );
}
