"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Alert } from "@/components/feedback/Alert";
import { LoadingState, ErrorState } from "@/components/ui/States";

interface TierRow { level: number; rewardKobo: number; thresholdCount: number | null }

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const HIGHLIGHT_LEVELS = [1, 2, 3, 5, 10, 20, 50, 100];

export default function TierManagementPage() {
  const [tiers, setTiers] = useState<TierRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No dedicated /api/admin/tiers endpoint exists yet — tiers are fully
    // computed from the locked formula (lib/tier.ts), so this page
    // generates the display table client-side rather than round-tripping
    // to the database for numbers that never change.
    const rows: TierRow[] = [];
    for (const level of HIGHLIGHT_LEVELS) {
      const rewardKobo = level === 1 ? 1000 : level === 2 ? 2000 : (20 + 5 * (level - 2)) * 100;
      rows.push({ level, rewardKobo, thresholdCount: null });
    }
    setTiers(rows);
  }, []);

  if (error) return <ErrorState description={error} />;
  if (!tiers) return <LoadingState label="Loading tiers..." />;

  return (
    <div className="max-w-2xl flex flex-col gap-space-md">
      <h1 className="font-headline-md text-headline-md text-on-surface">Tier Management</h1>

      <Card className="p-space-md">
        <p className="font-title-sm text-title-sm text-on-surface mb-space-sm">Reward Formula (locked)</p>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          Tier 1 = ₦10 · Tier 2 = ₦20 · Tier 3+ = ₦20 + ₦5 × (Tier − 2)
        </p>
      </Card>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell header>Tier</TableCell>
            <TableCell header>Reward</TableCell>
            <TableCell header>Progression Threshold</TableCell>
          </TableRow>
        </TableHead>
        <tbody>
          {tiers.map((t) => (
            <TableRow key={t.level} striped>
              <TableCell>Tier {t.level}</TableCell>
              <TableCell>{naira(t.rewardKobo)}</TableCell>
              <TableCell className="text-on-surface-variant">Not yet defined</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>

      <Alert tone="info">
        Tier progression thresholds (how many verified tasks are required to reach each tier) are
        intentionally not shown — the spec defines only one relationship (Tier 100 requirement = 2 ×
        Tier 50 requirement) and explicitly forbids inventing the rest. This table will populate once
        those numbers are finalized.
      </Alert>
    </div>
  );
}
