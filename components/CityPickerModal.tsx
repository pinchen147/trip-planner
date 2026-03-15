'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Loader2, Globe } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { toSlug, getCrimeAdapterIdForSlug } from '@/lib/city-registry';

export interface SelectedCity {
  slug: string;
  name: string;
  country: string;
  timezone: string;
  locale: string;
  mapCenter: { lat: number; lng: number };
  mapBounds: { north: number; south: number; east: number; west: number };
  crimeAdapterId: string;
}

interface CityPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (city: SelectedCity) => void;
}

interface Prediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

const COUNTRY_TO_LOCALE: Record<string, string> = {
  US: 'en-US', GB: 'en-GB', CA: 'en-CA', AU: 'en-AU', NZ: 'en-NZ',
  JP: 'ja-JP', FR: 'fr-FR', DE: 'de-DE', ES: 'es-ES', IT: 'it-IT',
  PT: 'pt-PT', BR: 'pt-BR', NL: 'nl-NL', KR: 'ko-KR', CN: 'zh-CN',
  TW: 'zh-TW', TH: 'th-TH', VN: 'vi-VN', IN: 'hi-IN', MX: 'es-MX',
};

const POPULAR_DESTINATIONS = [
  { name: 'Tokyo', secondary: 'Japan' },
  { name: 'Paris', secondary: 'France' },
  { name: 'New York', secondary: 'United States' },
  { name: 'London', secondary: 'United Kingdom' },
  { name: 'Bangkok', secondary: 'Thailand' },
  { name: 'Barcelona', secondary: 'Spain' },
  { name: 'Rome', secondary: 'Italy' },
  { name: 'Seoul', secondary: 'South Korea' },
];

function getLocaleFromCountryCode(code: string): string {
  return COUNTRY_TO_LOCALE[code] || 'en-US';
}

export function CityPickerModal({ open, onClose, onSelect }: CityPickerModalProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset UI state when modal closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setPredictions([]);
      setError('');
      setResolving(false);
      setLoading(false);
    }
  }, [open]);

  // Debounced search via server-side Places API
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!open || query.trim().length < 2) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      // Cancel previous in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/cities/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!controller.signal.aborted) {
          if (data.error) {
            setError(data.error);
            setPredictions([]);
          } else {
            setPredictions(data.predictions || []);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setPredictions([]);
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const handlePopularClick = useCallback((name: string) => {
    setQuery(name);
  }, []);

  // Resolve selected city via server-side Place Details + Timezone
  const handleSelect = useCallback(async (prediction: Prediction) => {
    if (resolving || !onSelect) return;
    setResolving(true);
    setError('');

    try {
      const res = await fetch(`/api/cities/details?placeId=${encodeURIComponent(prediction.placeId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve city.');

      const cityName = prediction.mainText || data.displayName || '';
      const slug = toSlug(`${cityName}-${data.countryCode}`);

      const city: SelectedCity = {
        slug,
        name: cityName,
        country: data.countryName,
        timezone: data.timezone,
        locale: getLocaleFromCountryCode(data.countryCode),
        mapCenter: { lat: data.lat, lng: data.lng },
        mapBounds: data.mapBounds,
        crimeAdapterId: getCrimeAdapterIdForSlug(slug),
      };

      onSelect(city);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve city.');
    } finally {
      setResolving(false);
    }
  }, [resolving, onSelect, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="ADD DESTINATION">
      <div className="flex flex-col gap-4 pb-4">
        {/* Search */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ background: '#0A0A0A', height: 48, borderRadius: 2 }}
        >
          <Search size={16} className="shrink-0" style={{ color: '#666' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any city..."
            autoFocus
            className="flex-1 bg-transparent border-none outline-none"
            style={{
              color: '#FFF',
              fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
              fontSize: 14,
            }}
          />
          {(resolving || loading) && <Loader2 size={16} className="animate-spin shrink-0" style={{ color: '#00E87B' }} />}
        </div>

        {/* Error */}
        {error && (
          <p
            className="text-center py-4 text-[11px]"
            style={{ color: '#EF4444', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}
          >
            {error}
          </p>
        )}

        {/* Results */}
        {predictions.length > 0 && (
          <>
            <span
              className="text-[11px] font-semibold uppercase"
              style={{ color: '#666', letterSpacing: 1.5, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}
            >
              RESULTS
            </span>
            <div className="flex flex-col gap-1">
              {predictions.map((p) => (
                <button
                  key={p.placeId}
                  type="button"
                  disabled={resolving}
                  onClick={() => handleSelect(p)}
                  className="flex items-center gap-3 cursor-pointer transition-colors hover:bg-[#1A1A1A] bg-transparent border-none text-left px-3 py-3 disabled:opacity-50 disabled:cursor-wait"
                  style={{ borderRadius: 2 }}
                >
                  <MapPin size={16} className="shrink-0" style={{ color: '#525252' }} />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="text-sm font-semibold text-white truncate"
                      style={{ fontFamily: "var(--font-space-grotesk, 'Space Grotesk', sans-serif)" }}
                    >
                      {p.mainText}
                    </span>
                    <span
                      className="text-[10px] truncate"
                      style={{ color: '#666', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}
                    >
                      {p.secondaryText}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Empty state — no results */}
        {!loading && query.trim().length >= 2 && predictions.length === 0 && !resolving && !error && (
          <p
            className="text-center py-8 text-[11px]"
            style={{ color: '#525252', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}
          >
            No cities found. Try a different search.
          </p>
        )}

        {/* Popular destinations — empty query */}
        {query.trim().length < 2 && !loading && !error && predictions.length === 0 && (
          <>
            <span
              className="text-[11px] font-semibold uppercase"
              style={{ color: '#666', letterSpacing: 1.5, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}
            >
              POPULAR DESTINATIONS
            </span>
            <div className="flex flex-col gap-1">
              {POPULAR_DESTINATIONS.map((dest) => (
                <button
                  key={dest.name}
                  type="button"
                  onClick={() => handlePopularClick(dest.name)}
                  className="flex items-center gap-3 cursor-pointer transition-colors hover:bg-[#1A1A1A] bg-transparent border-none text-left px-3 py-3"
                  style={{ borderRadius: 2 }}
                >
                  <Globe size={16} className="shrink-0" style={{ color: '#525252' }} />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="text-sm font-semibold text-white truncate"
                      style={{ fontFamily: "var(--font-space-grotesk, 'Space Grotesk', sans-serif)" }}
                    >
                      {dest.name}
                    </span>
                    <span
                      className="text-[10px] truncate"
                      style={{ color: '#666', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}
                    >
                      {dest.secondary}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
