import { useLocation } from "react-router-dom";

const CustomFooter = () => {
  const location = useLocation();
  
  // Only show on home page
  if (location.pathname !== "/") {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 glass border border-primary/30 px-4 py-2 rounded-xl shadow-glow-soft text-xs font-medium text-foreground/90">
      BY: Vision Xplorers(Group:75)
    </div>
  );
};

export default CustomFooter;
