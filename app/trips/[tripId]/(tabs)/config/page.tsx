'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTrip } from '@/components/providers/TripProvider';
import { DateRangePicker } from '@/components/ui/date-range-picker';

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
    tripStart, tripEnd, handleSaveTripDates,
    setStatusMessage
  } = useTrip();

  const [roomCodeInput, setRoomCodeInput] = useState(currentPairRoomId);
  const [pairSaveState, setPairSaveState] = useState('idle');
  const [localTripStart, setLocalTripStart] = useState(tripStart);
  const [localTripEnd, setLocalTripEnd] = useState(tripEnd);
  const [dateSaveState, setDateSaveState] = useState('idle');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const pairTimerRef = useRef<any>(null);
  const dateTimerRef = useRef<any>(null);

  // Per-leg dates
  const currentTrip = trips.find((t) => (t._id || t.id) === currentTripId);
  const tripLegs = currentTrip?.legs || [];
  const isMultiLeg = tripLegs.length > 1;
  const [localLegs, setLocalLegs] = useState(tripLegs.map((l) => ({ ...l })));
  const [legSaveState, setLegSaveState] = useState('idle');
  const legTimerRef = useRef<any>(null);

  const legsKey = JSON.stringify(tripLegs.map((l) => ({ cityId: l.cityId, startDate: l.startDate, endDate: l.endDate, stays: l.stays })));
  useEffect(() => {
    if (currentTrip?.legs) {
      setLocalLegs(currentTrip.legs.map((l) => ({ ...l, stays: l.stays ? l.stays.map((s) => ({ ...s })) : undefined })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legsKey]);

  useEffect(() => { setLocalTripStart(tripStart); }, [tripStart]);
  useEffect(() => { setLocalTripEnd(tripEnd); }, [tripEnd]);
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

  const addStay = (legIndex: number) => {
    setLocalLegs((prev) => prev.map((leg, i) => {
      if (i !== legIndex) return leg;
      const stays = leg.stays || [];
      return { ...leg, stays: [...stays, { name: '', address: '', startDate: leg.startDate, endDate: leg.endDate }] };
    }));
  };

  const updateStay = (legIndex: number, stayIndex: number, field: string, value: string) => {
    setLocalLegs((prev) => prev.map((leg, i) => {
      if (i !== legIndex) return leg;
      const stays = (leg.stays || []).map((s, si) => si === stayIndex ? { ...s, [field]: value } : s);
      return { ...leg, stays };
    }));
  };

  const removeStay = (legIndex: number, stayIndex: number) => {
    setLocalLegs((prev) => prev.map((leg, i) => {
      if (i !== legIndex) return leg;
      const stays = (leg.stays || []).filter((_, si) => si !== stayIndex);
      return { ...leg, stays };
    }));
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
                  <div className="flex flex-col gap-5">
                    {[...localLegs.map((leg, i) => ({ leg, i }))]
                      .sort((a, b) => (a.leg.startDate || '').localeCompare(b.leg.startDate || ''))
                      .map(({ leg, i }, displayIndex, sorted) => {
                      const city = cities.find((c) => c.slug === leg.cityId);
                      const cityName = city?.name || leg.cityId;
                      const stays = leg.stays || [];
                      return (
                        <div key={`${leg.cityId}-${i}`} className="flex flex-col gap-3 pb-4" style={{ borderBottom: displayIndex < sorted.length - 1 ? '1px solid #1A1A1A' : 'none' }}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase text-accent shrink-0" style={{ letterSpacing: 0.5, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>
                              LEG {displayIndex + 1} · {cityName}
                            </span>
                            <DateRangePicker
                              startDate={leg.startDate}
                              endDate={leg.endDate}
                              onChange={(s, e) => {
                                updateLegDate(i, 'startDate', s);
                                updateLegDate(i, 'endDate', e);
                              }}
                              compact
                              triggerFontSize={15}
                              triggerColor="#F5F5F5"
                              hideIcon
                            />
                          </div>
                          {/* Stays */}
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-semibold uppercase text-[#525252]" style={{ letterSpacing: 1, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>STAYS</span>
                            <button
                              type="button"
                              onClick={() => addStay(i)}
                              className="flex items-center gap-1 bg-transparent border-none cursor-pointer"
                              style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontSize: 9, fontWeight: 600, color: '#00E87B', letterSpacing: 0.5 }}
                            >
                              + ADD STAY
                            </button>
                          </div>
                          {stays.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              {stays.map((stay, si) => (
                                <div key={si} className="flex items-center gap-3 px-3.5 py-2.5" style={{ background: '#111111', border: '1px solid #1f1f1f' }}>
                                  <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                                    <Input
                                      type="text"
                                      className="text-[13px] text-[#F5F5F5] border-none bg-transparent p-0 min-h-0"
                                      value={stay.name}
                                      onChange={(e) => updateStay(i, si, 'name', e.target.value)}
                                      placeholder="Stay name"
                                    />
                                    <Input
                                      type="text"
                                      className="text-[10px] text-[#525252] border-none bg-transparent p-0 min-h-0"
                                      value={stay.address}
                                      onChange={(e) => updateStay(i, si, 'address', e.target.value)}
                                      placeholder="Address"
                                    />
                                  </div>
                                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                                    <DateRangePicker
                                      startDate={stay.startDate}
                                      endDate={stay.endDate}
                                      onChange={(s, e) => {
                                        updateStay(i, si, 'startDate', s);
                                        updateStay(i, si, 'endDate', e);
                                      }}
                                      compact
                                      triggerFontSize={10}
                                      triggerColor="#F5F5F5"
                                      hideIcon
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeStay(i, si)}
                                    className="bg-transparent border-none cursor-pointer p-0 text-[#3a3a3a] hover:text-[#F5F5F5] transition-colors shrink-0"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Single-leg date editing */
                  <div className="flex flex-col gap-3">
                    <DateRangePicker
                      startDate={localTripStart}
                      endDate={localTripEnd}
                      onChange={(s, e) => {
                        setLocalTripStart(s);
                        setLocalTripEnd(e);
                      }}
                      compact
                    />
                    {/* Stays for single leg */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-semibold uppercase text-[#525252]" style={{ letterSpacing: 1, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>STAYS</span>
                      <button
                        type="button"
                        onClick={() => addStay(0)}
                        className="flex items-center gap-1 bg-transparent border-none cursor-pointer"
                        style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontSize: 9, fontWeight: 600, color: '#00E87B', letterSpacing: 0.5 }}
                      >
                        + ADD STAY
                      </button>
                    </div>
                    {(localLegs[0]?.stays || []).length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {(localLegs[0]?.stays || []).map((stay, si) => (
                          <div key={si} className="flex items-center gap-3 px-3.5 py-2.5" style={{ background: '#111111', border: '1px solid #1f1f1f' }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                              <Input
                                type="text"
                                className="text-[13px] text-[#F5F5F5] border-none bg-transparent p-0 min-h-0"
                                value={stay.name}
                                onChange={(e) => updateStay(0, si, 'name', e.target.value)}
                                placeholder="Stay name"
                              />
                              <Input
                                type="text"
                                className="text-[10px] text-[#525252] border-none bg-transparent p-0 min-h-0"
                                value={stay.address}
                                onChange={(e) => updateStay(0, si, 'address', e.target.value)}
                                placeholder="Address"
                              />
                            </div>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <DateRangePicker
                                startDate={stay.startDate}
                                endDate={stay.endDate}
                                onChange={(s, e) => {
                                  updateStay(0, si, 'startDate', s);
                                  updateStay(0, si, 'endDate', e);
                                }}
                                compact
                                triggerFontSize={10}
                                triggerColor="#F5F5F5"
                                hideIcon
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStay(0, si)}
                              className="bg-transparent border-none cursor-pointer p-0 text-[#3a3a3a] hover:text-[#F5F5F5] transition-colors shrink-0"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <Button type="submit" size="sm" className="w-full" disabled={!canManageGlobal || dateSaveState === 'saving' || legSaveState === 'saving'} onClick={onSaveDates}>
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

        </div>
      </div>
    </section>
  );
}
