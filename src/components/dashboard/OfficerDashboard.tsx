import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, CheckCircle, AlertCircle, Users, Camera, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn, AnimatedCard, AnimatedCounter } from "@/components/animations";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import Logo from "@/components/Logo";

interface OfficerDashboardProps {
  session: Session;
}

interface PhotoData {
  id: string;
  photo_url: string;
  market_name: string;
  description: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  vendor_id: string;
  cleanliness_status: string | null;
  is_verified: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  area: string | null;
  profiles: {
    full_name: string;
    market_name: string;
  };
}

const OfficerDashboard = ({ session }: OfficerDashboardProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PhotoData[]>([]);
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"pending" | "reviewed">("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [processingPhotoId, setProcessingPhotoId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 20;

  const [stats, setStats] = useState({
    pending: 0,
    myReviewed: 0,
    totalVendors: 0,
  });

  const MARKET_AREAS: Record<string, string> = {
    vegetables: t.vegetablesSection,
    fruits: t.fruitsSection,
    flower: t.flowerMarket,
    fish: t.fishMarket,
    meat: t.meatMarket,
    pathway: t.pathway,
    dustbin: t.dustbinZone,
    other: t.other,
  };

  useEffect(() => {
    fetchPendingPhotos();
    fetchMyReviewedPhotos(1, true);
    fetchStats();
  }, [session.user.id]);

  useEffect(() => {
    setCurrentPage(1);
    if (statusFilter === "pending") {
      fetchPendingPhotos();
    } else {
      fetchMyReviewedPhotos(1, true);
    }
  }, [areaFilter, statusFilter]);

  const fetchPendingPhotos = async () => {
    const { data } = await supabase
      .from("market_photos")
      .select(`*, profiles:vendor_id (full_name, market_name)`)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data) setPendingPhotos(data as any);
  };

  const fetchMyReviewedPhotos = async (page: number = 1, reset: boolean = false) => {
    if (loadingMore && !reset) return;
    setLoadingMore(true);

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data } = await supabase
      .from("market_photos")
      .select(`*, profiles:vendor_id (full_name, market_name)`)
      .eq("reviewed_by", session.user.id)
      .order("reviewed_at", { ascending: false })
      .range(from, to);

    if (data) {
      if (reset) {
        setPhotos(data as any);
      } else {
        setPhotos(prev => [...prev, ...(data as any)]);
      }
      setHasMore(data.length === ITEMS_PER_PAGE);
    }
    setLoadingMore(false);
  };

  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchMyReviewedPhotos(nextPage, false);
  };

  const fetchStats = async () => {
    const { data: pendingData } = await supabase
      .from("market_photos")
      .select("id")
      .eq("status", "pending");

    const { data: myPhotos } = await supabase
      .from("market_photos")
      .select("status")
      .eq("reviewed_by", session.user.id);

    const { data: allVendors } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "vendor");

    setStats({
      pending: pendingData?.length || 0,
      myReviewed: myPhotos?.length || 0,
      totalVendors: allVendors?.length || 0,
    });
  };

  // ── Single action: Mark as Reviewed ────────────────────────────────────────

  const handleMarkAsReviewed = async (photoId: string) => {
    if (processingPhotoId) return;
    setProcessingPhotoId(photoId);
    try {
      const { data, error } = await supabase
        .from("market_photos")
        .update({
          status: "reviewed",
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", photoId)
        .eq("status", "pending")
        .select();

      if (error) {
        toast.error(t.failedToMarkPhoto);
        console.error("Update error:", error);
      } else if (!data || data.length === 0) {
        toast.info("This photo was already reviewed by another officer");
        fetchPendingPhotos();
      } else {
        toast.success(t.photoMarkedReviewed || "Marked as Reviewed");
        await Promise.all([fetchPendingPhotos(), fetchMyReviewedPhotos(1, true), fetchStats()]);
      }
    } finally {
      setProcessingPhotoId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("Sign out error (clearing local session anyway):", error);
    }
    localStorage.removeItem("sb-gbqoewouvejuapmgrlhd-auth-token");
    navigate("/login");
    window.location.reload();
  };

  // ── Filtered lists ─────────────────────────────────────────────────────────

  const filteredPending = pendingPhotos.filter(
    p => areaFilter === "all" || p.area === areaFilter
  );

  const filteredReviewed = photos.filter(
    p => areaFilter === "all" || p.area === areaFilter
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between glass-card px-5 py-4">
          <div className="flex items-center gap-4">
            <Logo size="md" />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold leading-tight">{t.municipalityDashboard}</h1>
              <p className="text-sm text-muted-foreground">
                {t.monitorManage} • <span className="font-medium">{session.user.email}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="rounded-xl"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t.logout}
              </Button>
            </motion.div>
          </div>
        </div>
      </FadeIn>

      {/* Stats — 3 cards: Pending / My Reviewed / Total People */}
      <div className="grid gap-6 md:grid-cols-3">
        {[
          {
            icon: AlertCircle,
            label: t.pending,
            value: stats.pending,
            desc: t.awaitingReview,
            color: "text-yellow-600",
          },
          {
            icon: CheckCircle,
            label: t.reviewed,
            value: stats.myReviewed,
            desc: "Reviewed by me",
            color: "text-green-600",
          },
          {
            icon: Users,
            label: t.totalVendors,
            value: stats.totalVendors,
            desc: t.registered,
            color: "text-muted-foreground",
          },
        ].map((stat, index) => (
          <AnimatedCard key={stat.label} delay={index * 0.1}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <AnimatedCounter value={stat.value} />
                </div>
                <p className="text-xs text-muted-foreground">{stat.desc}</p>
              </CardContent>
            </Card>
          </AnimatedCard>
        ))}
      </div>

      {/* Photo Review */}
      <FadeIn delay={0.3}>
        <AnimatedCard delay={0.1} hover={false}>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    {t.marketPhotos}
                  </CardTitle>
                  <CardDescription>{t.reviewManagePhotos}</CardDescription>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={statusFilter}
                    onValueChange={(v: "pending" | "reviewed") => setStatusFilter(v)}
                  >
                    <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        📥 {t.pending} ({pendingPhotos.length})
                      </SelectItem>
                      <SelectItem value="reviewed">
                        ✅ {t.myReviews || "My Reviews"} ({photos.length})
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-area-filter">
                      <SelectValue placeholder={t.filterByArea} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allAreas}</SelectItem>
                      {Object.entries(MARKET_AREAS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid gap-6">
                <AnimatePresence mode="wait">

                  {/* Pending photos */}
                  {statusFilter === "pending" && (
                    <>
                      {filteredPending.map((photo, index) => (
                        <motion.div
                          key={photo.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          data-testid={`card-photo-${photo.id}`}
                        >
                          <Card>
                            <div className="grid md:grid-cols-[300px_1fr] gap-4">
                              <motion.img
                                src={photo.photo_url}
                                alt={photo.description}
                                className="w-full h-64 object-cover rounded-l-lg"
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                              />
                              <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-lg">
                                      {photo.profiles?.market_name || t.unknownMarket}
                                    </h3>
                                    <Badge
                                      variant="outline"
                                      className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300"
                                    >
                                      {t.pending}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span className="font-medium text-foreground">
                                      {photo.area ? MARKET_AREAS[photo.area] || photo.area : t.noAreaSpecified}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {t.vendor}: {photo.profiles?.full_name || t.unknownVendor}
                                  </p>
                                  <p className="text-sm">{photo.description}</p>
                                  <div className="text-xs text-muted-foreground">
                                    {t.uploaded}: {new Date(photo.created_at).toLocaleString()}
                                  </div>
                                </div>

                                {/* Single action */}
                                <div className="flex gap-2">
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                      size="sm"
                                      onClick={() => handleMarkAsReviewed(photo.id)}
                                      disabled={processingPhotoId === photo.id}
                                      data-testid={`button-mark-reviewed-${photo.id}`}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      {processingPhotoId === photo.id
                                        ? t.loading || "..."
                                        : "Mark as Reviewed"}
                                    </Button>
                                  </motion.div>
                                </div>
                              </CardContent>
                            </div>
                          </Card>
                        </motion.div>
                      ))}

                      {filteredPending.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                          <p>{t.noPendingPhotos || "No pending submissions to review"}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Reviewed photos */}
                  {statusFilter === "reviewed" && (
                    <>
                      {filteredReviewed.map((photo, index) => (
                        <motion.div
                          key={photo.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          data-testid={`card-reviewed-${photo.id}`}
                        >
                          <Card>
                            <div className="grid md:grid-cols-[300px_1fr] gap-4">
                              <motion.img
                                src={photo.photo_url}
                                alt={photo.description}
                                className="w-full h-64 object-cover rounded-l-lg"
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                              />
                              <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-lg">
                                      {photo.profiles?.market_name || t.unknownMarket}
                                    </h3>
                                    <Badge
                                      variant="outline"
                                      className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300"
                                    >
                                      ✓ {t.reviewed}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span className="font-medium text-foreground">
                                      {photo.area ? MARKET_AREAS[photo.area] || photo.area : t.noAreaSpecified}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {t.vendor}: {photo.profiles?.full_name || t.unknownVendor}
                                  </p>
                                  <p className="text-sm">{photo.description}</p>
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{t.uploaded}: {new Date(photo.created_at).toLocaleString()}</span>
                                    {photo.reviewed_at && (
                                      <span>Reviewed: {new Date(photo.reviewed_at).toLocaleString()}</span>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </div>
                          </Card>
                        </motion.div>
                      ))}

                      {filteredReviewed.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>{t.noReviewsYet || "You haven't reviewed any submissions yet"}</p>
                          <p className="text-sm mt-2">Switch to "Pending" to start reviewing submissions</p>
                        </div>
                      )}

                      {statusFilter === "reviewed" && hasMore && photos.length >= ITEMS_PER_PAGE && (
                        <div className="text-center pt-4">
                          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                            {loadingMore ? t.loading : t.loadMore}
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      </FadeIn>
    </div>
  );
};

export default OfficerDashboard;
