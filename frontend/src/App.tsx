import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import LoginSignup from './components/LoginSignup';
import WelcomeHome from './components/WelcomeHome';
import CropPhaseSelection from './components/CropPhaseSelection';
import CropDetails from './components/CropDetails';
import OnboardingWizard, { OnboardData } from './components/OnboardingWizard';
import HomePage from './components/HomePage';

type AppScreen = 'landing' | 'login' | 'welcome' | 'phase-select' | 'crop-details' | 'onboarding' | 'home';

const SCREEN_PATHS: Record<AppScreen, string> = {
  landing:      '/',
  login:        '/login',
  welcome:      '/welcome',
  'phase-select': '/phase-select',
  'crop-details': '/crop-details',
  onboarding:   '/onboarding',
  home:         '/home',
};

const PATH_SCREENS: Record<string, AppScreen> = {
  '/':             'landing',
  '/login':        'login',
  '/welcome':      'welcome',
  '/phase-select': 'phase-select',
  '/crop-details': 'crop-details',
  '/onboarding':   'onboarding',
  '/home':         'home',
};

function getInitialScreen(): AppScreen {
  return PATH_SCREENS[window.location.pathname] ?? 'landing';
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(getInitialScreen);
  const [selectedPhase, setSelectedPhase] = useState<string>('growth');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [pendingPhase, setPendingPhase] = useState<string>('');
  const [pendingCrop, setPendingCrop] = useState<string>('');
  const [googleUserName, setGoogleUserName] = useState<string>('');

  const navigate = (screen: AppScreen) => {
    const path = SCREEN_PATHS[screen];
    if (window.location.pathname !== path) {
      window.history.pushState({ screen }, '', path);
    }
    setCurrentScreen(screen);
  };

  useEffect(() => {
    const onPop = () => {
      const screen = PATH_SCREENS[window.location.pathname] ?? 'landing';
      setCurrentScreen(screen);
    };
    window.addEventListener('popstate', onPop);
    window.history.replaceState({ screen: currentScreen }, '', SCREEN_PATHS[currentScreen]);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleOnboardComplete = (data: OnboardData) => {
    setSelectedPhase(data.phase);
    setSelectedLanguage(data.language);
    if (data.name) setGoogleUserName(data.name);
    navigate('home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {currentScreen === 'landing' && (
        <LandingPage
          onGetStarted={() => navigate('onboarding')}
          onLogin={() => navigate('login')}
        />
      )}

      {/* Phone OTP login */}
      {currentScreen === 'login' && (
        <LoginSignup onLoginSuccess={(googleName?: string) => {
          if (googleName) {
            setGoogleUserName(googleName);
            navigate('onboarding'); // goes to onboarding at step 2
          } else {
            navigate('welcome');
          }
        }} />
      )}

      {/* Post-login: new crop or existing */}
      {currentScreen === 'welcome' && (
        <WelcomeHome
          onNewCrop={() => navigate('phase-select')}
          onContinueExisting={() => navigate('home')}
        />
      )}

      {/* Crop phase picker */}
      {currentScreen === 'phase-select' && (
        <CropPhaseSelection
          onPhaseSelect={(phase) => {
            setPendingPhase(phase);
            navigate('crop-details');
          }}
        />
      )}

      {/* Crop details form */}
      {currentScreen === 'crop-details' && (
        <CropDetails
          selectedPhase={pendingPhase}
          onSubmit={(cropName, _plantingDate) => {
            setPendingCrop(cropName);
            setSelectedPhase(pendingPhase);
            navigate('home');
          }}
        />
      )}

      {/* Original onboarding (Get Started flow) */}
      {currentScreen === 'onboarding' && (
        <OnboardingWizard
          onComplete={handleOnboardComplete}
          onSkip={() => navigate('home')}
          onBack={() => navigate('landing')}
          initialStep={googleUserName ? 2 : 1}
          prefillName={googleUserName}
        />
      )}

      {currentScreen === 'home' && (
        <HomePage
          selectedPhase={selectedPhase}
          selectedLanguage={selectedLanguage}
          onPhaseChange={setSelectedPhase}
          onLanguageChange={setSelectedLanguage}
          onLogoClick={() => navigate('landing')}
          onAddCrop={() => navigate('phase-select')}
          onLogout={() => navigate('landing')}
          userName={googleUserName || 'Farmer'}
        />
      )}
    </div>
  );
}
