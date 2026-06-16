import { cn } from "@/lib/utils";

interface RosterStripProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  count?: number;
}

export function RosterStrip({ className, size = "md", count = 5 }: RosterStripProps) {
  // Using reliable placeholder images for the roster strip
  const avatars = [
    "https://i.pravatar.cc/150?u=a042581f4e29026024d",
    "https://i.pravatar.cc/150?u=a042581f4e29026704d",
    "https://i.pravatar.cc/150?u=a04258114e29026702d",
    "https://i.pravatar.cc/150?u=a048581f4e29026701d",
    "https://i.pravatar.cc/150?u=a092581d4ef9026700d",
    "https://i.pravatar.cc/150?u=a042581f4e29026024e",
    "https://i.pravatar.cc/150?u=a042581f4e29026704e",
    "https://i.pravatar.cc/150?u=a04258114e29026702e",
  ];

  // Presence dot colors (moss for present, gold for away/wfh, clay for absent)
  const dotColors = [
    "bg-primary", // moss
    "bg-primary",
    "bg-accent", // gold
    "bg-primary",
    "bg-destructive", // clay
  ];

  const sizeClasses = {
    sm: "h-8 w-8 border-2",
    md: "h-12 w-12 border-2",
    lg: "h-16 w-16 border-4",
  };

  const overlapClasses = {
    sm: "-ml-3",
    md: "-ml-4",
    lg: "-ml-6",
  };

  const dotSizeClasses = {
    sm: "h-2.5 w-2.5 border-[1.5px]",
    md: "h-3.5 w-3.5 border-2",
    lg: "h-4 w-4 border-2",
  };

  const displayAvatars = avatars.slice(0, count);

  return (
    <div className={cn("flex items-center", className)}>
      {displayAvatars.map((src, i) => (
        <div 
          key={i} 
          className={cn(
            "relative rounded-full border-background bg-muted shrink-0",
            sizeClasses[size],
            i > 0 && overlapClasses[size],
            "shadow-sm transition-transform hover:-translate-y-1 hover:z-10 cursor-pointer"
          )}
          style={{ zIndex: displayAvatars.length - i }}
        >
          <img 
            src={src} 
            alt={`Team member ${i + 1}`} 
            className="h-full w-full rounded-full object-cover"
          />
          <span 
            className={cn(
              "absolute bottom-0 right-0 block rounded-full border-background",
              dotColors[i % dotColors.length],
              dotSizeClasses[size]
            )} 
          />
        </div>
      ))}
      <div 
        className={cn(
          "relative flex items-center justify-center rounded-full border-background bg-sidebar text-sidebar-foreground font-mono font-medium text-xs",
          sizeClasses[size],
          overlapClasses[size]
        )}
        style={{ zIndex: 0 }}
      >
        +12
      </div>
    </div>
  );
}
