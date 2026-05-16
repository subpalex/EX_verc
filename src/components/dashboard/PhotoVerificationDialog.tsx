import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Eye } from "lucide-react";

interface PhotoVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photo: {
    id: string;
    photo_url: string;
    cleanliness_status: string | null;
    market_name: string;
    created_at: string;
    profiles: {
      full_name: string;
    };
  } | null;
  onMarkAsCleaned: (photoId: string) => void;
  onMarkAsReviewed: (photoId: string) => void;
}

export function PhotoVerificationDialog({
  open,
  onOpenChange,
  photo,
  onMarkAsCleaned,
  onMarkAsReviewed,
}: PhotoVerificationDialogProps) {
  if (!photo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Photo Submission</DialogTitle>
          <DialogDescription>
            Review the photo submitted by {photo.profiles.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
            <img
              src={photo.photo_url}
              alt="Market area"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Person:</span> {photo.profiles.full_name}
            </div>
            <div>
              <span className="font-medium">Market:</span> {photo.market_name}
            </div>
            <div>
              <span className="font-medium">Status:</span>{" "}
              <span className="capitalize">{photo.cleanliness_status}</span>
            </div>
            <div>
              <span className="font-medium">Uploaded:</span>{" "}
              {new Date(photo.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">📊 Point System:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• <strong>Mark as Cleaned</strong>: Person gets +1 point (verified clean)</li>
              <li>• <strong>Mark as Reviewed</strong>: Person gets 0 points (acknowledged only)</li>
              <li>• Rankings are based on total points earned</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                onMarkAsReviewed(photo.id);
                onOpenChange(false);
              }}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Mark as Reviewed (0 points)
            </Button>
            <Button
              onClick={() => {
                onMarkAsCleaned(photo.id);
                onOpenChange(false);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Cleaned (+1 point)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
