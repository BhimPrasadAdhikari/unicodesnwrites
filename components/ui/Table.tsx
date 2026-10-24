import * as React from "react"

import { cn } from "@/lib/utils"

// Data table for the dashboard. Wrap in TableContainer for the bordered card and horizontal scroll.
function TableContainer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-x-auto rounded-xl border border-border/70 bg-card", className)} {...props} />
}

function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full text-left text-sm", className)} {...props} />
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-border/70 bg-muted/40", className)} {...props} />
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border/60", className)} {...props} />
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-muted/25", className)} {...props} />
}

function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-5 py-3 text-left text-eyebrow text-muted-foreground", className)} {...props} />
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-5 py-4 align-middle", className)} {...props} />
}

export { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
