'use client';

import { useState } from 'react';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useTrip } from '@/components/providers/TripProvider';
import { safeHostname } from '@/lib/helpers';
import { getSafeExternalHref } from '@/lib/security';

const sectionHeaderStyle = {
  fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
  fontSize: 11,
  fontWeight: 600 as const,
  color: 'var(--color-muted)',
  letterSpacing: 1,
  textTransform: 'uppercase' as const,
};

export default function SourcesPage() {
  const {
    currentCityId, currentCity, canManageGlobal, timezone,
    groupedSources,
    newSourceType, setNewSourceType, newSourceUrl, setNewSourceUrl,
    isSavingSource, syncingSourceId,
    handleCreateSource, handleToggleSourceStatus, handleDeleteSource, handleSyncSource,
    refreshEventsAndSpots,
  } = useTrip();

  const [aiInputText, setAiInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ eventCount: number; spotCount: number } | null>(null);
  const [generateError, setGenerateError] = useState('');

  const handleGenerate = async () => {
    if (!aiInputText.trim() || isGenerating) return;

    if (!currentCityId) {
      setGenerateError('Select a city first.');
      return;
    }

    if (aiInputText.length > 50_000) {
      setGenerateError('Text exceeds 50,000 character limit.');
      return;
    }

    setIsGenerating(true);
    setGenerateResult(null);
    setGenerateError('');

    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiInputText,
          cityId: currentCityId,
          cityName: currentCity?.name || currentCityId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed.');
      }

      setGenerateResult({ eventCount: data.eventCount, spotCount: data.spotCount });
      if (data.warning) {
        setGenerateError(data.warning);
      }
      setAiInputText('');

      await refreshEventsAndSpots();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderSourceCard = (source: any) => {
    const isActive = source.status === 'active';
    const isSyncingThis = syncingSourceId === source.id;
    const displayTitle = source.label || safeHostname(source.url);
    const isReadonly = Boolean(source.readonly) || !canManageGlobal;
    const isEvent = source.sourceType === 'event';

    return (
      <Card
        className={`p-3 transition-all duration-150 hover:border-border-hover hover:shadow-[0_1px_4px_rgba(12,18,34,0.05)] ${source.status === 'paused' ? 'opacity-60' : ''}`}
        style={{ borderLeft: `3px solid ${isEvent ? 'rgba(255,136,0,0.4)' : 'rgba(0,255,136,0.3)'}` }}
        key={source.id || `${source.sourceType}-${source.url}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="m-0 text-[0.86rem] font-bold text-foreground leading-snug">{displayTitle}</h4>
            <a className="block mt-0.5 text-muted text-[0.72rem] no-underline truncate hover:text-accent hover:underline" href={getSafeExternalHref(source.url)} target="_blank" rel="noreferrer" title={source.url}>{source.url}</a>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[0.65rem]">
            {isEvent ? 'EVENT' : 'SPOT'}
          </Badge>
          <Badge variant={isActive ? 'default' : 'warning'} className="shrink-0 gap-1 capitalize">
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-accent shadow-[0_0_4px_rgba(0,255,136,0.5)]' : 'bg-warning'}`} />
            {source.status}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 text-muted text-[0.7rem]">
          <span>{source.lastSyncedAt ? `Synced ${new Date(source.lastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: timezone })}` : 'Never synced'}</span>
          {source.lastError ? <span className="text-danger">· {source.lastError}</span> : null}
          {source.readonly ? <span className="italic">· Read-only</span> : null}
        </div>
        <div className="flex gap-1.5 mt-2">
          <Button type="button" size="sm" variant="default" className="text-[0.7rem] min-h-[26px] px-2 py-0.5" disabled={isSyncingThis || isReadonly} onClick={() => { void handleSyncSource(source); }}>
            {isSyncingThis ? <><RefreshCw size={10} className="animate-spin" />Syncing...</> : 'Sync'}
          </Button>
          <Button type="button" size="sm" variant="secondary" className="text-[0.7rem] min-h-[26px] px-2 py-0.5" disabled={isReadonly} onClick={() => { void handleToggleSourceStatus(source); }}>
            {isActive ? 'Pause' : 'Resume'}
          </Button>
          <Button type="button" size="sm" variant="danger" className="text-[0.7rem] min-h-[26px] px-2 py-0.5" disabled={isReadonly} onClick={() => { void handleDeleteSource(source); }}>
            Remove
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <section className="flex-1 min-h-0 overflow-y-auto bg-bg px-6 py-8 md:px-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        {/* Left Column — AI Itinerary Generator */}
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={13} style={{ color: 'var(--color-accent)' }} />
              <span style={sectionHeaderStyle}>AI ITINERARY GENERATOR</span>
            </div>
            <Card className="p-4 flex flex-col gap-3">
              <textarea
                className="w-full min-h-[160px] p-3 text-[0.82rem] text-foreground resize-y rounded-none"
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
                  fontSize: 12,
                }}
                placeholder="Paste travel blogs, social media posts, wishlists, notes..."
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                disabled={isGenerating}
                aria-label="Travel content for AI generation"
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating || !aiInputText.trim()}
                  className="gap-1.5"
                >
                  {isGenerating ? (
                    <><RefreshCw size={12} className="animate-spin" />Generating...</>
                  ) : (
                    <><Sparkles size={12} />Generate Itinerary</>
                  )}
                </Button>
                <div role="status" aria-live="polite">
                  {generateResult && (
                    <span className="text-[0.75rem] text-accent" style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>
                      Generated {generateResult.eventCount} events and {generateResult.spotCount} spots
                    </span>
                  )}
                  {generateError && (
                    <span className="text-[0.75rem] text-danger flex items-center gap-1">
                      <AlertCircle size={12} />
                      {generateError}
                    </span>
                  )}
                </div>
              </div>
              <p className="m-0 text-[0.7rem] text-muted" style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>
                Paste any travel content and AI will generate events and spots for your itinerary.
              </p>
            </Card>
          </div>
        </div>

        {/* Right Column — URL Sources */}
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-3">
            <span style={sectionHeaderStyle}>URL SOURCES</span>
            {groupedSources.event.map((source: any) => renderSourceCard(source))}
            {groupedSources.spot.map((source: any) => renderSourceCard(source))}
            {groupedSources.event.length === 0 && groupedSources.spot.length === 0 && (
              <p className="border border-dashed border-border rounded-none p-5 text-center text-muted text-[0.82rem] bg-bg-subtle">No sources yet.</p>
            )}
            <form className="flex items-center gap-2 max-sm:flex-col" onSubmit={handleCreateSource} aria-label="Add URL source">
              <Select value={newSourceType} onValueChange={setNewSourceType}>
                <SelectTrigger className="min-h-[36px] w-[120px] shrink-0" aria-label="Source type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="spot">Spot</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="https://example.com/source" value={newSourceUrl} onChange={(e) => setNewSourceUrl(e.target.value)} aria-label="Source URL" />
              <Button type="submit" size="sm" className="min-h-[36px] shrink-0" disabled={!canManageGlobal || isSavingSource}>
                {isSavingSource ? 'Adding...' : 'Add'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
