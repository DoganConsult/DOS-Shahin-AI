// ============================================
// Shahin-Ai — Marketplace Publisher Service
// Publisher registration, retrieval, verification,
// and pack listing by publisher.
// ============================================

import { safeQuery } from '../ports/database.port';
import { Publisher, MarketplaceListing } from "./marketplace.types";
import { mapPublisherRow, mapListingRow } from "./marketplace.helpers";

/** Register a new publisher in the marketplace. */
export async function registerPublisher(
  name: string,
  email: string,
  website: string
): Promise<Publisher> {
  const result = await safeQuery(
    `INSERT INTO public.marketplace_publishers (name, email, website, verified, joined_at)
     VALUES ($1, $2, $3, false, NOW())
     RETURNING *`,
    [name, email, website]
  );
  return mapPublisherRow(result.rows[0]);
}

/** Retrieve a publisher profile by ID. */
export async function getPublisher(publisherId: string): Promise<Publisher | null> {
  const result = await safeQuery(
    `SELECT p.*,
            COALESCE(s.total_packs, 0) AS total_packs,
            COALESCE(s.avg_rating, 0) AS avg_rating
     FROM public.marketplace_publishers p
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS total_packs,
              COALESCE(AVG(avg_rating), 0) AS avg_rating
       FROM public.marketplace_listings
       WHERE publisher_id = p.id AND status = 'published'
     ) s ON true
     WHERE p.id = $1`,
    [publisherId]
  );
  if (result.rows.length === 0) return null;
  return mapPublisherRow(result.rows[0]);
}

/** Mark a publisher as verified (admin action). */
export async function verifyPublisher(publisherId: string): Promise<void> {
  await safeQuery(
    `UPDATE public.marketplace_publishers SET verified = true WHERE id = $1`,
    [publisherId]
  );
}

/** List all published packs belonging to a publisher. */
export async function getPublisherPacks(publisherId: string): Promise<MarketplaceListing[]> {
  const result = await safeQuery(
    `SELECT * FROM public.marketplace_listings
     WHERE publisher_id = $1
     ORDER BY created_at DESC`,
    [publisherId]
  );
  return result.rows.map(mapListingRow);
}
