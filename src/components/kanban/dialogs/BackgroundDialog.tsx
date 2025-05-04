"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Image as ImageIcon, Check } from "lucide-react";

// Common background colors
const BACKGROUND_COLORS = [
  { name: "Blue", value: "#0079bf" },
  { name: "Green", value: "#519839" },
  { name: "Orange", value: "#d29034" },
  { name: "Red", value: "#b04632" },
  { name: "Purple", value: "#89609e" },
  { name: "Pink", value: "#cd5a91" },
  { name: "Light Green", value: "#4bbf6b" },
  { name: "Light Blue", value: "#00aecc" },
  { name: "Grey", value: "#838c91" },
];

// Interface for photo data from Pexels API
interface Photo {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
  };
  alt: string;
  photographer: string;
}

interface BackgroundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBackground: { type: string; value: string };
  onBackgroundChange: (background: { type: string; value: string }) => void;
}

export default function BackgroundDialog({
  open,
  onOpenChange,
  currentBackground,
  onBackgroundChange,
}: BackgroundDialogProps) {
  const [activeTab, setActiveTab] = useState("colors");
  const [customColor, setCustomColor] = useState("#0079bf");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("landscape nature");

  // Fetch photos from Pexels API
  const fetchPhotos = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/pexels?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch photos");
      }
      const data = await response.json();
      setPhotos(data.photos || []);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch photos on initial load
  useEffect(() => {
    if (open && activeTab === "photos") {
      fetchPhotos(searchQuery);
    }
  }, [open, activeTab]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPhotos(searchQuery);
  };

  // Apply background color
  const applyColor = (color: string) => {
    onBackgroundChange({ type: "color", value: color });
  };

  // Apply background image
  const applyImage = (imageUrl: string) => {
    onBackgroundChange({ type: "image", value: imageUrl });
  };

  // Apply custom image URL
  const applyCustomImage = () => {
    if (customImageUrl.trim()) {
      applyImage(customImageUrl);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Background</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="colors" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {BACKGROUND_COLORS.map((color) => (
                <div
                  key={color.value}
                  className="relative h-20 rounded-md cursor-pointer overflow-hidden group"
                  style={{ backgroundColor: color.value }}
                  onClick={() => applyColor(color.value)}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    {currentBackground.type === "color" && currentBackground.value === color.value && (
                      <div className="absolute top-2 right-2 bg-white rounded-full p-0.5">
                        <Check className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                    <span className="text-white font-medium text-sm">{color.name}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-color">Custom Color</Label>
              <div className="flex gap-2">
                <Input
                  id="custom-color"
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="flex-1"
                  placeholder="#0079bf"
                />
                <Button onClick={() => applyColor(customColor)}>Apply</Button>
              </div>
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search photos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </form>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-video rounded-md overflow-hidden cursor-pointer group"
                    onClick={() => applyImage(photo.src.large2x)}
                  >
                    <img
                      src={photo.src.medium}
                      alt={photo.alt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      {currentBackground.type === "image" && currentBackground.value === photo.src.large2x && (
                        <div className="absolute top-2 right-2 bg-white rounded-full p-0.5">
                          <Check className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {photos.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                No photos found. Try a different search term.
              </div>
            )}
          </TabsContent>

          {/* Custom Tab */}
          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-image-url">Custom Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="custom-image-url"
                  type="text"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="flex-1"
                  placeholder="https://example.com/image.jpg"
                />
                <Button onClick={applyCustomImage} disabled={!customImageUrl.trim()}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Apply
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the URL of an image to use as your board background.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
