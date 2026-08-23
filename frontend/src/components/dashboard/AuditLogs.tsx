import { useState, useEffect, useCallback, useMemo } from "react";
import { Activity, RefreshCw, Search, ChevronLeft, ChevronRight, Filter, ArrowUpDown } from "lucide-react";
import { apiAdminGetAuditLogs } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format, isToday, isThisWeek, isThisMonth } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
  actor_name: string | null;
  actor_role: string | null;
}

type DateFilter = "all" | "today" | "week" | "month";
type SortField = "date" | "action" | "actor";
type SortDir = "desc" | "asc";

const PAGE_SIZE = 25;

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async (isRefresh = false, currentPage = 1) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // In a real app we might pass filters to backend, but let's fetch a chunk and filter client side
      // or just fetch with pagination. The api supports page/limit.
      const data = await apiAdminGetAuditLogs(currentPage, PAGE_SIZE);
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLogs(false, page); }, [fetchLogs, page]);

  const filtered = useMemo(() => {
    let result = [...logs];

    if (dateFilter !== "all") {
      result = result.filter((l) => {
        const d = new Date(l.created_at);
        if (dateFilter === "today" && !isToday(d)) return false;
        if (dateFilter === "week" && !isThisWeek(d)) return false;
        if (dateFilter === "month" && !isThisMonth(d)) return false;
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        (l.action?.toLowerCase().includes(q) || false) ||
        (l.actor_name?.toLowerCase().includes(q) || false) ||
        (l.entity_type?.toLowerCase().includes(q) || false)
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortField === "action") cmp = (a.action || "").localeCompare(b.action || "");
      else if (sortField === "actor") cmp = (a.actor_name || "").localeCompare(b.actor_name || "");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [logs, search, dateFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="container mx-auto px-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-primary" />
          <h2 className="text-lg font-bold">Audit Logs</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {total} records
          </span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search action, actor, entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <Filter size={16} className="mr-1" />
            Filters
          </Button>
          <button
            onClick={() => fetchLogs(true, page)}
            disabled={refreshing}
            className="h-9 px-3 rounded-xl bg-card border border-border text-foreground/70 hover:bg-muted transition-all flex items-center gap-1.5 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex flex-wrap items-center gap-3 bg-muted/50 border border-border rounded-xl p-3">
              {/* Date filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Period:</span>
                <div className="flex gap-1">
                  {([
                    { key: "all", label: "All Time" },
                    { key: "today", label: "Today" },
                    { key: "week", label: "This Week" },
                    { key: "month", label: "This Month" },
                  ] as { key: DateFilter; label: string }[]).map(({ key, label }) => (
                    <Button
                      key={key}
                      variant={dateFilter === key ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => { setDateFilter(key); setPage(1); }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Sort:</span>
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                    <SelectItem value="actor">Actor</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  <ArrowUpDown size={14} className={sortDir === "asc" ? "rotate-180" : ""} />
                  <span className="text-xs ml-1">{sortDir === "asc" ? "Asc" : "Desc"}</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[160px]">Date & Time</TableHead>
              <TableHead className="w-[180px]">Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead className="hidden md:table-cell">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16 mt-1" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-full max-w-[200px]" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  {search || dateFilter !== "all"
                    ? "No audit logs found matching your filters."
                    : "No audit logs recorded yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => (
                <TableRow key={log.id} className="group transition-colors hover:bg-muted/30">
                  <TableCell>
                    <div className="text-sm font-medium">{format(new Date(log.created_at), "MMM d, yyyy")}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      {format(new Date(log.created_at), "h:mm:ss a")}
                      <span className="text-[10px] opacity-70">• {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {log.actor_name || <span className="italic text-muted-foreground">Unknown Actor</span>}
                      </span>
                      {log.actor_role && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                          {log.actor_role}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border-primary/20 text-primary">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground/80">{log.entity_type}</span>
                    {log.entity_id && (
                      <span className="text-xs text-muted-foreground block mt-0.5 font-mono">ID: {log.entity_id}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded truncate max-w-[250px] cursor-help">
                            {log.details ? JSON.stringify(log.details) : "-"}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs break-all whitespace-pre-wrap">
                          <p className="font-mono text-[10px]">{log.details ? JSON.stringify(log.details, null, 2) : "No details"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{(page - 1) * PAGE_SIZE + 1}</span> to{" "}
              <span className="font-medium text-foreground">
                {Math.min(page * PAGE_SIZE, total)}
              </span>{" "}
              of <span className="font-medium text-foreground">{total}</span> results
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={14} />
              </Button>
              <div className="px-2 text-sm font-medium">
                {page} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
