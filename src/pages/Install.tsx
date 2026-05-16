import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, Smartphone, Check, Share, Plus, MoreVertical, Loader2 } from "lucide-react";
import { FadeIn, AnimatedCard } from "@/components/animations";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalling(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Simulate progress during installation
  useEffect(() => {
    if (isInstalling && installProgress < 90) {
      const timer = setTimeout(() => {
        setInstallProgress(prev => Math.min(prev + 10, 90));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isInstalling, installProgress]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    setInstallProgress(10);

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setInstallProgress(100);
      setTimeout(() => {
        setIsInstalled(true);
        setIsInstalling(false);
      }, 500);
    } else {
      setIsInstalling(false);
      setInstallProgress(0);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <FadeIn>
          <Card className="max-w-md w-full text-center glass border-white/10 rounded-2xl">
            <CardHeader className="space-y-4">
              <div className="flex justify-center">
                <Logo size="md" />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto w-16 h-16 bg-primary/15 rounded-2xl flex items-center justify-center shadow-glow-blue"
              >
                <Check className="h-8 w-8 text-primary" />
              </motion.div>
              <CardTitle className="text-2xl">App Installed!</CardTitle>
              <CardDescription>
                UrbanEye AI is now installed on your device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/")}
                className="w-full btn-neon rounded-xl h-11 font-semibold border-0 hover:btn-neon"
                data-testid="button-open-app"
              >
                Open App
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <FadeIn className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <Logo size="xl" animate />
          </motion.div>
          <h1 className="text-4xl font-bold mb-4">Install <span className="text-gradient">UrbanEye AI</span></h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Get the full app experience with quick access from your home screen
          </p>
        </FadeIn>

        <div className="max-w-lg mx-auto space-y-6">
          {/* Android / Chrome Install */}
          {(deferredPrompt || isAndroid) && (
            <AnimatedCard delay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    Quick Install
                  </CardTitle>
                  <CardDescription>
                    Install directly to your home screen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isInstalling ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm font-medium">Installing UrbanEye AI...</span>
                      </div>
                      <Progress value={installProgress} className="w-full" />
                      <p className="text-xs text-muted-foreground text-center">
                        {installProgress < 50 ? "Preparing installation..." : 
                         installProgress < 90 ? "Installing app files..." : 
                         "Finalizing..."}
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleInstall}
                      disabled={!deferredPrompt}
                      className="w-full"
                      size="lg"
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Install App
                    </Button>
                  )}
                </CardContent>
              </Card>
            </AnimatedCard>
          )}

          {/* iOS Instructions */}
          {isIOS && (
            <AnimatedCard delay={0.3}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share className="h-5 w-5 text-primary" />
                    Install on iPhone/iPad
                  </CardTitle>
                  <CardDescription>
                    Follow these steps to add to your home screen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Tap the Share button</p>
                      <p className="text-sm text-muted-foreground">
                        Look for <Share className="inline h-4 w-4" /> at the bottom of Safari
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Scroll and tap "Add to Home Screen"</p>
                      <p className="text-sm text-muted-foreground">
                        Look for <Plus className="inline h-4 w-4" /> Add to Home Screen
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Tap "Add" to confirm</p>
                      <p className="text-sm text-muted-foreground">
                        The app icon will appear on your home screen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          )}

          {/* Desktop / Other browsers */}
          {!isIOS && !deferredPrompt && (
            <AnimatedCard delay={0.3}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MoreVertical className="h-5 w-5 text-primary" />
                    Install from Browser
                  </CardTitle>
                  <CardDescription>
                    Install using your browser's menu
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Open browser menu</p>
                      <p className="text-sm text-muted-foreground">
                        Click the three dots <MoreVertical className="inline h-4 w-4" /> in Chrome
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Select "Install UrbanEye AI"</p>
                      <p className="text-sm text-muted-foreground">
                        Or "Add to Home Screen" option
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          )}

          {/* Features */}
          <AnimatedCard delay={0.4}>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Why Install?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {[
                    "Quick access from home screen",
                    "Works offline",
                    "Faster loading",
                    "Full-screen experience",
                    "Push notifications (coming soon)",
                  ].map((feature, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </AnimatedCard>

          <FadeIn delay={0.6}>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-full"
            >
              Continue in Browser
            </Button>
          </FadeIn>
        </div>
      </div>
    </div>
  );
};

export default Install;
