'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Check, Copy, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useTrip } from '@/components/providers/TripProvider';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { safeHostname } from '@/lib/helpers';

function normalizePlannerRoomId(value) {
  const nextValue = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (nextValue.length < 2 || nextValue.length > 64) {
    return '';
  }
  return nextValue;
}

export default function ConfigPage() {
  const {
    authLoading, profile, canManageGlobal, isSigningOut, handleSignOut,
    currentTripId, trips, cities, handleDeleteTrip, handleUpdateTripLegs,
    currentPairRoomId, pairRooms, pairMemberCount,
    isPairActionPending, handleUsePersonalPlanner, handleCreatePairRoom, handleJoinPairRoom, handleSelectPairRoom,
    groupedSources,
    newSourceType, setNewSourceType, newSourceUrl, setNewSourceUrl,
    isSavingSource, syncingSourceId,
    handleCreateSource, handleToggleSourceStatus, handleDeleteSource, handleSyncSource,
    tripStart, tripEnd, handleSaveTripDates,
    baseLocationText, handleSaveBaseLocation,
    setStatusMessage, timezone
  } = useTrip();

  const [roomCodeInput, setRoomCodeInput] = useState(currentPairRoomId);
  const [pairSaveState, setPairSaveState] = useState('idle');
  const [localTripStart, setLocalTripStart] = useState(tripStart);
  const [localTripEnd, setLocalTripEnd] = useState(tripEnd);
  const [dateSaveState, setDateSaveState] = useState('idle');
  const [localBaseLocation, setLocalBaseLocation] = useState(baseLocationText);
  const [_locationSaveState, setLocationSaveState] = useState('idle');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const pairTimerRef = useRef<any>(null);
  const dateTimerRef = useRef<any>(null);
  const locationTimerRef = useRef<any>(null);

  // Per-leg dates
  const currentTrip = trips.find((t) => (t._id || t.id) === currentTripId);
  const tripLegs = currentTrip?.legs || [];
  const isMultiLeg = tripLegs.length > 1;
  const [localLegs, setLocalLegs] = useState(tripLegs.map((l) => ({ ...l })));
  const [legSaveState, setLegSaveState] = useState('idle');
  const legTimerRef = useRef<any>(null);

  const legsKey = tripLegs.map((l) => `${l.cityId}:${l.startDate}:${l.endDate}`).join(',');
  useEffect(() => {
    if (currentTrip?.legs) {
      setLocalLegs(currentTrip.legs.map((l) => ({ ...l })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legsKey]);;

  useEffect(() => { setLocalTripStart(tripStart); }, [tripStart]);
  useEffect(() => { setLocalTripEnd(tripEnd); }, [tripEnd]);
  useEffect(() => { setLocalBaseLocation(baseLocationText); }, [baseLocationText]);
  useEffect(() => {
    if (!currentPairRoomId) {
      setRoomCodeInput('');
    }
  }, [currentPairRoomId]);

  const onCopyRoomCode = async () => {
    if (!currentPairRoomId || !navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(currentPairRoomId);
      setStatusMessage(`Copied room code "${currentPairRoomId}".`);
    } catch {
      setStatusMessage('Could not copy room code. Copy it manually.', true);
    }
  };

  const onJoinRoom = async (event) => {
    event.preventDefault();
    const normalizedRoomCode = normalizePlannerRoomId(roomCodeInput);
    if (!normalizedRoomCode) {
      setStatusMessage('Room code is required (2-64 chars: a-z, 0-9, _ or -).', true);
      return;
    }
    setPairSaveState('saving');
    const joined = await handleJoinPairRoom(normalizedRoomCode);
    if (joined) {
      setRoomCodeInput(normalizedRoomCode);
      setPairSaveState('saved');
      clearTimeout(pairTimerRef.current);
      pairTimerRef.current = setTimeout(() => setPairSaveState('idle'), 2000);
      return;
    }
    setPairSaveState('idle');
  };

  const onCreateRoom = async () => {
    setPairSaveState('saving');
    const roomCode = await handleCreatePairRoom();
    if (roomCode) {
      setRoomCodeInput(roomCode);
      setPairSaveState('saved');
      clearTimeout(pairTimerRef.current);
      pairTimerRef.current = setTimeout(() => setPairSaveState('idle'), 2000);
      return;
    }
    setPairSaveState('idle');
  };

  const onUsePersonal = () => {
    handleUsePersonalPlanner();
    setRoomCodeInput('');
    setPairSaveState('saved');
    clearTimeout(pairTimerRef.current);
    pairTimerRef.current = setTimeout(() => setPairSaveState('idle'), 2000);
  };

  const onSelectSavedRoom = (roomCode) => {
    const normalizedRoomCode = normalizePlannerRoomId(roomCode);
    if (!normalizedRoomCode) return;
    handleSelectPairRoom(normalizedRoomCode);
    setRoomCodeInput(normalizedRoomCode);
    setPairSaveState('saved');
    clearTimeout(pairTimerRef.current);
    pairTimerRef.current = setTimeout(() => setPairSaveState('idle'), 2000);
  };

  const onSaveDates = async (event) => {
    event.preventDefault();
    if (isMultiLeg) {
      // Save per-leg dates
      setLegSaveState('saving');
      try {
        await handleUpdateTripLegs(localLegs);
        setLegSaveState('saved');
        clearTimeout(legTimerRef.current);
        legTimerRef.current = setTimeout(() => setLegSaveState('idle'), 2000);
      } catch {
        setLegSaveState('idle');
      }
    } else {
      // Single-leg: save via config (also update the leg)
      setDateSaveState('saving');
      try {
        await handleSaveTripDates(localTripStart, localTripEnd);
        if (localLegs.length === 1) {
          const updatedLegs = [{ ...localLegs[0], startDate: localTripStart, endDate: localTripEnd }];
          handleUpdateTripLegs(updatedLegs).catch(() => {});
        }
        setDateSaveState('saved');
        clearTimeout(dateTimerRef.current);
        dateTimerRef.current = setTimeout(() => setDateSaveState('idle'), 2000);
      } catch {
        setDateSaveState('idle');
      }
    }
  };

  const updateLegDate = (index: number, field: 'startDate' | 'endDate', value: string) => {
    setLocalLegs((prev) => prev.map((leg, i) => i === index ? { ...leg, [field]: value } : leg));
  };

  const onSaveLocation = async (event) => {
    event.preventDefault();
    setLocationSaveState('saving');
    try {
      await handleSaveBaseLocation(localBaseLocation);
      setLocationSaveState('saved');
      clearTimeout(locationTimerRef.current);
      locationTimerRef.current = setTimeout(() => setLocationSaveState('idle'), 2000);
    } catch {
      setLocationSaveState('idle');
    }
  };

  const renderSourceCard = (source) => {
    const isEvent = source.sourceType === 'event';
    const isActive = source.status === 'active';
    const isSyncingThis = syncingSourceId === source.id;
    const displayTitle = source.label || safeHostname(source.url);
    const isReadonly = Boolean(source.readonly) || !canManageGlobal;

    return (
      <Card
        className={`p-3 transition-all duration-150 hover:border-border-hover hover:shadow-[0_1px_4px_rgba(12,18,34,0.05)] ${source.status === 'paused' ? 'opacity-60' : ''}`}
        style={{ borderLeft: `3px solid ${isEvent ? 'rgba(255,136,0,0.4)' : 'rgba(0,255,136,0.3)'}` }}
        key={source.id || `${source.sourceType}-${source.url}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="m-0 text-[0.86rem] font-bold text-foreground leading-snug">{displayTitle}</h4>
            <a className="block mt-0.5 text-muted text-[0.72rem] no-underline truncate hover:text-accent hover:underline" href={source.url} target="_blank" rel="noreferrer" title={source.url}>{source.url}</a>
          </div>
          <Badge variant={isActive ? 'default' : 'warning'} className="shrink-0 gap-1 capitalize">
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-accent shadow-[0_0_4px_rgba(0,255,136,0.5)]' : 'bg-warning'}`} />
            {source.status}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 text-muted text-[0.7rem]">
          <span>{source.lastSyncedAt ? `Synced ${new Date(source.lastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: timezone })}` : 'Never synced'}</span>
          {source.lastError ? <span className="text-[#FF4444]">· {source.lastError}</span> : null}
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

  const sectionHeaderStyle = {
    fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
    fontSize: 11,
    fontWeight: 600 as const,
    color: '#737373',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  };

  return (
    <section className="flex-1 min-h-0 overflow-y-auto bg-bg" style={{ padding: '32px 48px' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Left Column */}
        <div className="flex flex-col gap-7">
          {/* Account */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span style={sectionHeaderStyle}>ACCOUNT</span>
              <Badge variant={canManageGlobal ? 'default' : 'secondary'} style={{ fontSize: 9 }}>
                {authLoading ? 'Loading...' : canManageGlobal ? '[OWNER]' : '[MEMBER]'}
              </Badge>
            </div>
            <Card className="p-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-foreground" style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>{profile?.email || 'No email returned'}</span>
                <button
                  type="button"
                  onClick={() => { void handleSignOut(); }}
                  disabled={isSigningOut || authLoading}
                  className="cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'transparent',
                    border: '1px solid #262626',
                    fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#525252',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    padding: '5px 12px',
                  }}
                >
                  {isSigningOut ? 'SIGNING OUT...' : 'SIGN OUT'}
                </button>
              </div>
            </Card>
          </div>

          {/* Trip Config */}
          <div className="flex flex-col gap-3">
            <span style={sectionHeaderStyle}>TRIP CONFIG</span>
            <Card className="p-3.5">
              <form className="flex flex-col gap-3" onSubmit={onSaveDates}>
                {isMultiLeg ? (
                  /* Per-leg date editing for multi-city trips */
                  <div className="flex flex-col gap-3">
                    {localLegs.map((leg, i) => {
                      const city = cities.find((c) => c.slug === leg.cityId);
                      const cityName = city?.name || leg.cityId;
                      return (
                        <div key={`${leg.cityId}-${i}`} className="flex flex-col gap-2 pb-3" style={{ borderBottom: i < localLegs.length - 1 ? '1px solid #1A1A1A' : 'none' }}>
                          <span className="text-[10px] font-semibold uppercase text-accent" style={{ letterSpacing: 0.5, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>
                            LEG {i + 1} · {cityName}
                          </span>
                          <DateRangePicker
                            startDate={leg.startDate}
                            endDate={leg.endDate}
                            onChange={(s, e) => {
                              updateLegDate(i, 'startDate', s);
                              updateLegDate(i, 'endDate', e);
                            }}
                            compact
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Single-leg date editing */
                  <DateRangePicker
                    startDate={localTripStart}
                    endDate={localTripEnd}
                    onChange={(s, e) => {
                      setLocalTripStart(s);
                      setLocalTripEnd(e);
                    }}
                    compact
                  />
                )}
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-semibold uppercase text-[#525252] shrink-0 w-16" style={{ letterSpacing: 0.5, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>BASE</label>
                  <Input type="text" value={localBaseLocation} onChange={(event) => setLocalBaseLocation(event.target.value)} placeholder="e.g. 1100 California St, SF" />
                </div>
                <Button type="submit" size="sm" className="w-full" disabled={!canManageGlobal || dateSaveState === 'saving' || legSaveState === 'saving'} onClick={(e) => { onSaveDates(e); onSaveLocation(e); }}>
                  {(dateSaveState === 'saving' || legSaveState === 'saving') ? 'Saving...' : (dateSaveState === 'saved' || legSaveState === 'saved') ? <><Check size={14} />Saved</> : 'SAVE CHANGES'}
                </Button>
              </form>
              {!canManageGlobal ? <p className="mt-2 mb-0 text-xs text-muted">Owner role required.</p> : null}
            </Card>
          </div>

          {/* Danger Zone */}
          <div className="flex flex-col gap-3">
            <span style={sectionHeaderStyle}>DANGER ZONE</span>
            <Card className="p-3.5" style={{ borderColor: 'rgba(239, 68, 68, 0.25)' }}>
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>Delete this trip</span>
                    <span className="text-[10px] text-[#525252]" style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>Permanently remove trip, planner entries, and pair rooms.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={!canManageGlobal}
                    className="cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
                      fontSize: 9,
                      fontWeight: 600,
                      color: '#EF4444',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      padding: '5px 12px',
                    }}
                  >
                    DELETE TRIP
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="m-0 text-xs text-[#EF4444] font-semibold" style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsDeleting(true);
                        try {
                          await handleDeleteTrip();
                        } catch (err) {
                          setStatusMessage(err instanceof Error ? err.message : 'Failed to delete trip.', true);
                          setIsDeleting(false);
                          setShowDeleteConfirm(false);
                        }
                      }}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{
                        background: '#EF4444',
                        border: 'none',
                        fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
                        fontSize: 9,
                        fontWeight: 600,
                        color: '#FFF',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        padding: '5px 14px',
                      }}
                    >
                      <Trash2 size={10} />
                      {isDeleting ? 'DELETING...' : 'YES, DELETE'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="cursor-pointer disabled:opacity-40"
                      style={{
                        background: 'transparent',
                        border: '1px solid #262626',
                        fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
                        fontSize: 9,
                        fontWeight: 600,
                        color: '#525252',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        padding: '5px 12px',
                      }}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-7">
          {/* Pair Planner */}
          <div className="flex flex-col gap-3">
            <span style={sectionHeaderStyle}>PAIR PLANNER</span>
            <Card className="p-3.5 flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={currentPairRoomId ? 'default' : 'secondary'}>
                  {currentPairRoomId ? `Pair room: ${currentPairRoomId}` : 'Personal planner'}
                </Badge>
                {currentPairRoomId ? (
                  <Badge variant="secondary">{pairMemberCount} member{pairMemberCount === 1 ? '' : 's'}</Badge>
                ) : null}
                {pairSaveState === 'saved' ? <Badge variant="default"><Check size={12} />Saved</Badge> : null}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button type="button" size="sm" variant="secondary" onClick={onUsePersonal} disabled={isPairActionPending || !currentPairRoomId}>Use Personal</Button>
                <Button type="button" size="sm" onClick={() => { void onCreateRoom(); }} disabled={isPairActionPending}>
                  {isPairActionPending ? 'Working...' : 'Create Pair Room'}
                </Button>
                {currentPairRoomId ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => { void onCopyRoomCode(); }}>
                    <Copy size={12} />
                    Copy Room Code
                  </Button>
                ) : null}
              </div>
              <form className="flex items-center gap-2" onSubmit={onJoinRoom}>
                <Input type="text" value={roomCodeInput} onChange={(event) => setRoomCodeInput(event.target.value)} placeholder="Enter room code" />
                <Button type="submit" size="sm" className="min-h-[36px] min-w-[100px] shrink-0" disabled={isPairActionPending || pairSaveState === 'saving'}>
                  {pairSaveState === 'saving' ? 'Joining...' : 'Join Room'}
                </Button>
              </form>
              {pairRooms.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="m-0 text-[0.78rem] font-bold uppercase tracking-wider text-muted">Your Pair Rooms</h3>
                  <div className="flex gap-2 flex-wrap">
                    {pairRooms.map((room) => {
                      const roomCode = normalizePlannerRoomId(room?.roomCode);
                      if (!roomCode) return null;
                      const isActiveRoom = roomCode === currentPairRoomId;
                      return (
                        <Button key={roomCode} type="button" size="sm" variant={isActiveRoom ? 'default' : 'secondary'} onClick={() => onSelectSavedRoom(roomCode)}>
                          {roomCode} ({Number(room?.memberCount) || 1})
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </Card>
          </div>

          {/* Event Sources */}
          <div className="flex flex-col gap-3">
            <span style={sectionHeaderStyle}>EVENT SOURCES</span>
            {groupedSources.event.map((source) => renderSourceCard(source))}
            {groupedSources.spot.map((source) => renderSourceCard(source))}
            {groupedSources.event.length === 0 && groupedSources.spot.length === 0 && (
              <p className="border border-dashed border-border rounded-none p-5 text-center text-muted text-[0.82rem] bg-bg-subtle">No sources yet.</p>
            )}
            <form className="flex items-center gap-2 max-sm:flex-col" onSubmit={handleCreateSource}>
              <Select value={newSourceType} onValueChange={setNewSourceType}>
                <SelectTrigger className="min-h-[36px] w-[120px] shrink-0">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="spot">Spot</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="https://example.com/source" value={newSourceUrl} onChange={(event) => setNewSourceUrl(event.target.value)} />
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
