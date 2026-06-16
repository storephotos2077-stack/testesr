import { useState } from "react";
import { useGetOrgChart } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Network, Search } from "lucide-react";

interface OrgNode {
  id: number;
  fullName: string;
  designationName?: string;
  departmentName?: string;
  avatarUrl?: string;
  children?: OrgNode[];
}

function Avatar({ node, size = "md" }: { node: OrgNode; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-12 w-12 text-sm", lg: "h-16 w-16 text-xl" };
  return (
    <div className={`${sizes[size]} rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0 overflow-hidden border-2 border-card shadow-sm`}>
      {node.avatarUrl ? (
        <img src={node.avatarUrl} alt={node.fullName} className="h-full w-full object-cover" />
      ) : (
        node.fullName.charAt(0)
      )}
    </div>
  );
}

function NodeCard({ node, highlight }: { node: OrgNode; highlight: string }) {
  const isMatch = highlight && node.fullName.toLowerCase().includes(highlight.toLowerCase());
  return (
    <div className={`flex flex-col items-center group`}>
      <div className={`
        w-48 bg-card border rounded-xl p-4 flex flex-col items-center text-center shadow-sm
        hover:shadow-md hover:border-primary/30 transition-all duration-200
        ${isMatch && highlight ? "ring-2 ring-primary border-primary" : ""}
      `}>
        <Avatar node={node} size="md" />
        <div className="mt-3 font-semibold text-sm leading-tight" style={{ color: "hsl(152 21% 14%)" }}>
          {node.fullName}
        </div>
        {node.designationName && (
          <div className="text-xs text-muted-foreground mt-1 leading-tight">{node.designationName}</div>
        )}
        {node.departmentName && (
          <Badge variant="outline" className="mt-2 text-[10px] px-2 py-0 h-4 font-normal">
            {node.departmentName}
          </Badge>
        )}
      </div>

      {node.children && node.children.length > 0 && (
        <div className="flex flex-col items-center">
          {/* Vertical connector down from parent */}
          <div className="w-px h-8 bg-border" />
          {/* Horizontal bar spanning children */}
          <div className="relative flex gap-8">
            {/* Horizontal line */}
            {node.children.length > 1 && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border"
                style={{ width: `calc(100% - 96px)` }}
              />
            )}
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Short vertical connector up to horizontal bar */}
                <div className="w-px h-8 bg-border" />
                <NodeCard node={child} highlight={highlight} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { data: orgChart, isLoading } = useGetOrgChart();
  const [search, setSearch] = useState("");

  const rootNodes = orgChart ?? [];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-sidebar tracking-tight">Organization Chart</h1>
            <p className="text-muted-foreground mt-1">Company hierarchy and reporting lines.</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-card border rounded-xl overflow-x-auto min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center p-16 space-y-4">
              <Skeleton className="h-32 w-48 rounded-xl" />
              <div className="w-px h-8 bg-border" />
              <div className="flex gap-8">
                <Skeleton className="h-24 w-48 rounded-xl" />
                <Skeleton className="h-24 w-48 rounded-xl" />
                <Skeleton className="h-24 w-48 rounded-xl" />
              </div>
            </div>
          ) : rootNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center text-muted-foreground gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Network className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-medium">No hierarchy defined yet</p>
                <p className="text-sm mt-1 max-w-xs">
                  Assign managers to employees in their profiles to build the org chart.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-12 flex gap-16 justify-start items-start min-w-max">
              {rootNodes.map((node) => (
                <NodeCard key={(node as OrgNode).id} node={node as OrgNode} highlight={search} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
