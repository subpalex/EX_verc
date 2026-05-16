import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Camera, Shield, Trophy, ArrowRight, Download } from "lucide-react";
import { motion } from "framer-motion";
import { FadeIn, AnimatedCard } from "@/components/animations";
import LanguageSelector from "@/components/LanguageSelector";
import Logo from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const navigate = useNavigate();
  const [isInstalled, setIsInstalled] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // Check if running as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Language Selector - Fixed Position */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[92vh] flex items-center justify-center px-4 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--neon-blue)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--neon-blue)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Animated neon orbs */}
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl"
          style={{ background: "hsl(var(--neon-blue) / 0.18)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl"
          style={{ background: "hsl(var(--neon-purple) / 0.18)" }}
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="container max-w-6xl relative z-10 text-center space-y-8">
          <FadeIn delay={0.1}>
            <motion.div
              className="inline-flex items-center gap-2 px-5 py-2 glass rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="badge-tagline"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground/90">
                {t.cleanMarketInitiative}
              </span>
            </motion.div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Logo size="xl" animate />
            </motion.div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t.tagline}
            </p>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="btn-neon text-lg px-8 h-14 rounded-2xl font-semibold border-0 hover:btn-neon"
                  data-testid="button-get-started"
                >
                  {t.getStarted}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
              {!isInstalled && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/install")}
                    className="text-lg px-8 h-14 rounded-2xl glass border-white/10 hover:bg-white/5 hover:border-primary/40"
                    data-testid="button-install"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    {t.installApp}
                  </Button>
                </motion.div>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features Section */}
      <section className="container max-w-6xl mx-auto px-4 py-20 space-y-12">
        <FadeIn>
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">{t.howItWorks}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.howItWorksDesc}
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Camera, title: t.vendorsUpload, desc: t.vendorsUploadDesc, glow: "blue" },
            { icon: Shield, title: t.officersReview, desc: t.officersReviewDesc, glow: "purple" },
            { icon: Trophy, title: t.vendorsGetRanked, desc: t.vendorsGetRankedDesc, glow: "blue" },
          ].map((feat, i) => (
            <AnimatedCard key={feat.title} delay={0.1 + i * 0.1}>
              <motion.div
                className="text-center space-y-4 p-7 glass-card h-full hover:border-primary/30 transition-all duration-300 group"
                whileHover={{ y: -4 }}
                data-testid={`card-feature-${i}`}
              >
                <motion.div
                  className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
                    feat.glow === "blue"
                      ? "bg-primary/15 group-hover:shadow-glow-blue"
                      : "bg-secondary/15 group-hover:shadow-glow-purple"
                  } transition-all duration-300`}
                  whileHover={{ rotate: feat.glow === "blue" ? 8 : -8, scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <feat.icon
                    className={`h-8 w-8 ${
                      feat.glow === "blue" ? "text-primary" : "text-secondary"
                    }`}
                  />
                </motion.div>
                <h3 className="text-xl font-semibold">{feat.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feat.desc}</p>
              </motion.div>
            </AnimatedCard>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container max-w-4xl mx-auto px-4 py-20">
        <FadeIn>
          <motion.div
            className="relative rounded-3xl p-12 text-center space-y-6 overflow-hidden glass-strong"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {/* Glow accents */}
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                <span className="text-gradient">{t.readyToJoin}</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t.readyToJoinDesc}
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="btn-neon text-lg px-8 h-14 rounded-2xl font-semibold border-0 hover:btn-neon"
                  data-testid="button-signup-cta"
                >
                  {t.signUpNow}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-20 backdrop-blur-sm">
        <div className="container max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-muted-foreground">
          <Logo size="sm" />
          <p className="text-sm" data-testid="text-footer">{t.footer}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
